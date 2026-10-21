// Coordination for tests/company-verification-locking.integration.test.ts.
//
// Those tests pause a real Postgres transaction while it holds a row lock. A
// failing wait, a hanging query or a hanging cleanup step must never leave that
// lock behind or hang the run. The strategy, end to end:
//
//   1. The database itself bounds work: the test pool sets connect, statement,
//      lock and idle-in-transaction timeouts (see the integration test), so even
//      an abandoned query or paused transaction is ended by Postgres.
//   2. paused() bounds the whole scenario body; its gates are released in
//      `finally`, whether the body passed, failed, or overran its deadline.
//   3. Every operation the body started is then awaited, bounded. Operations
//      still running are CANCELLED via `cancel()` (the test terminates its own
//      backends — a Promise timeout alone cancels nothing in Postgres), then
//      awaited once more, bounded. The report says which of these happened; an
//      operation that merely timed out is never called "settled".
//   4. cleanup() bounds every step and the pool close, cancels outstanding
//      backends before closing, and always attempts the close.
//   5. A scenario's own failure is what gets thrown. Harness problems are thrown
//      only when the scenario itself passed; otherwise they are logged.
//
// Failure paths are unit-tested without a database in tests/locking-harness.test.ts.

export interface Gate {
  promise: Promise<void>;
  release: () => void;
  readonly released: boolean;
}

/** A one-shot latch. `release()` is idempotent. */
export function gate(): Gate {
  let released = false;
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return {
    promise,
    release: () => { if (!released) { released = true; resolve(); } },
    get released() { return released; },
  };
}

export class HarnessTimeout extends Error {
  constructor(message: string) { super(message); this.name = "HarnessTimeout"; }
}

/** Resolves with `p`, or rejects with HarnessTimeout after `ms`. Does not cancel `p`. */
export function within<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const t = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HarnessTimeout(`${what}: no result within ${ms} ms`)), ms); });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/**
 * Waits for `signal` (e.g. "the paused operation now holds the lock"), but
 * never forever: fails after `ms`, and fails at once if `operation` settles
 * first — it then can never reach the pause.
 */
export async function waitForSignal(signal: Promise<void>, operation: Promise<unknown>, ms: number, what: string): Promise<void> {
  const finishedEarly = operation.then(
    () => { throw new Error(`${what}: the operation finished before signalling`); },
    (e) => { throw new Error(`${what}: the operation failed before signalling: ${e instanceof Error ? e.message : String(e)}`, { cause: e }); },
  );
  finishedEarly.catch(() => {}); // observed by the race below; never unhandled
  await within(Promise.race([signal, finishedEarly]), ms, `${what}: waiting for the signal`);
}

/** What happened to the operations a scenario started. Never conflates "timed out" with "settled". */
export interface SettleReport {
  started: number;
  settled: number;
  /** True if cancel() had to be called because operations were still running. */
  cancelRequested: boolean;
  cancelError?: string;
  /** Still running after cancellation and the second bounded wait. */
  unsettled: number;
}

export interface PausedOptions {
  /** Gates released (always, in `finally`) when the body ends — pass, fail or overrun. */
  gates: Gate[];
  /** Upper bound for the scenario body itself. */
  bodyMs: number;
  /** Upper bound for each settling wait (before and after cancellation). */
  settleMs: number;
  /** Terminates this test's outstanding database work (e.g. pg_terminate_backend on its own backends). */
  cancel: () => Promise<void>;
}

export interface PausedResult { report: SettleReport }

/**
 * Runs a coordinated scenario; see the strategy at the top of this file.
 * `track(p)` registers every operation the body starts.
 */
export async function paused(
  opts: PausedOptions,
  body: (track: <T>(p: Promise<T>) => Promise<T>) => Promise<void>,
): Promise<PausedResult> {
  const started: Array<{ done: boolean; settled: Promise<void> }> = [];
  const track = <T>(p: Promise<T>): Promise<T> => {
    const entry = { done: false, settled: Promise.resolve() };
    // Observe rejections immediately so an early failure is never "unhandled";
    // the body still receives (and may assert on) the original promise.
    entry.settled = p.then(() => undefined, () => undefined).then(() => { entry.done = true; });
    started.push(entry);
    return p;
  };

  let failure: { error: unknown } | null = null;
  try {
    await within(body(track), opts.bodyMs, "scenario body");
  } catch (error) {
    failure = { error };
  } finally {
    for (const g of opts.gates) g.release();
  }

  const report: SettleReport = { started: started.length, settled: 0, cancelRequested: false, unsettled: 0 };
  const pending = () => started.filter((e) => !e.done);
  const waitPending = () => within(Promise.all(pending().map((e) => e.settled)), opts.settleMs, "settling started operations").catch(() => {});

  await waitPending();
  if (pending().length > 0) {
    report.cancelRequested = true;
    try {
      await within(opts.cancel(), opts.settleMs, "cancelling outstanding operations");
    } catch (e) {
      report.cancelError = e instanceof Error ? e.message : String(e);
    }
    await waitPending();
  }
  report.unsettled = pending().length;
  report.settled = report.started - report.unsettled;

  const harnessProblem = report.cancelRequested
    ? `harness: ${report.unsettled ? `${report.unsettled} of ${report.started} operations did not settle even after cancellation` : `operations had to be cancelled to settle`}${report.cancelError ? `; cancel failed: ${report.cancelError}` : ""}`
    : null;

  if (failure) {
    if (harnessProblem) console.error("[locking-harness] scenario failed; also", harnessProblem, report);
    throw failure.error;
  }
  if (harnessProblem) throw new Error(harnessProblem);
  return { report };
}

export interface CleanupOptions {
  /** Upper bound for each step, the cancel and the close. */
  stepMs: number;
  /** Terminates this test's outstanding backends before closing the pool. */
  cancel: () => Promise<void>;
  close: () => Promise<unknown>;
}

/**
 * Database cleanup that never hangs: each step is bounded and attempted even if
 * an earlier one failed or overran; outstanding backends are cancelled; the
 * pool close is always attempted (bounded). All problems are reported together,
 * the first as the cause. A bounded step that timed out may still be running in
 * Postgres until its statement_timeout ends it — the message says "timed out",
 * never "done".
 */
export async function cleanup(steps: Array<[string, () => Promise<unknown>]>, opts: CleanupOptions): Promise<void> {
  const errors: Array<[string, unknown]> = [];
  try {
    for (const [name, step] of steps) {
      try { await within(Promise.resolve().then(step), opts.stepMs, name); } catch (e) { errors.push([name, e]); }
    }
  } finally {
    try { await within(opts.cancel(), opts.stepMs, "cancel outstanding backends"); } catch (e) { errors.push(["cancel outstanding backends", e]); }
    try { await within(opts.close(), opts.stepMs, "close pool"); } catch (e) { errors.push(["close pool", e]); }
  }
  if (errors.length) {
    const summary = errors.map(([n, e]) => `${n}: ${e instanceof Error ? e.message : String(e)}`).join("; ");
    throw new Error(`cleanup failed — ${summary}`, { cause: errors[0][1] });
  }
}
