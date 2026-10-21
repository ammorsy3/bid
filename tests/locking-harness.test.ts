// Failure paths of tests/helpers/locking-harness.ts (E-2), without a database.
// A "query" here is a promise that, like a paused or stuck Postgres operation,
// only finishes when its gate opens or when cancel() terminates it.

import { describe, it, expect, vi } from "vitest";
import { cleanup, gate, HarnessTimeout, paused, waitForSignal, within } from "./helpers/locking-harness";

/** A fake database operation: finishes when `held` opens, or rejects when terminate() is called. */
function fakeOperation(held: Promise<void> | null) {
  let terminate!: () => void;
  const terminated = new Promise<never>((_, reject) => { terminate = () => reject(new Error("terminating connection due to administrator command")); });
  terminated.catch(() => {});
  const op = Promise.race([held ? held.then(() => "committed") : new Promise<string>(() => {}), terminated]);
  return { op, terminate };
}

const quietly = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("paused(): bounded scenarios", () => {
  it("a wait that fails inside the body: gate released, the paused operation commits, the original error is thrown", async () => {
    const held = gate();
    const locked = gate();
    const { op } = fakeOperation(held.promise);
    const cancel = vi.fn(async () => {});
    const original = new Error("expected 2 backend(s) waiting on a lock");
    let tracked!: Promise<string>;
    await expect(paused({ gates: [held, locked], bodyMs: 1000, settleMs: 200, cancel }, async (track) => {
      tracked = track(op);
      locked.release();
      await waitForSignal(locked.promise, tracked, 500, "lock");
      throw original;
    })).rejects.toBe(original);
    expect(held.released).toBe(true);
    await expect(tracked).resolves.toBe("committed");
    expect(cancel).not.toHaveBeenCalled(); // it settled on its own — nothing had to be cancelled
  });

  it("Astra's case — the body awaits an operation that never settles: bounded, gates released, operation CANCELLED, not reported as settled", async () => {
    const held = gate();
    const { op, terminate } = fakeOperation(null); // never finishes by itself
    const cancel = vi.fn(async () => terminate());
    const errorLog = quietly();
    const started = Date.now();
    const err = await paused({ gates: [held], bodyMs: 100, settleMs: 100, cancel }, async (track) => {
      await track(op); // hangs
    }).catch((e) => e);
    expect(Date.now() - started).toBeLessThan(1500);
    expect(err).toBeInstanceOf(HarnessTimeout);
    expect(err.message).toBe("scenario body: no result within 100 ms"); // the scenario's own failure, preserved
    expect(held.released).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    // Reported separately, and as cancelled — never as "settled on its own".
    expect(errorLog).toHaveBeenCalledWith(
      "[locking-harness] scenario failed; also",
      "harness: operations had to be cancelled to settle",
      expect.objectContaining({ started: 1, settled: 1, cancelRequested: true, unsettled: 0 }),
    );
    errorLog.mockRestore();
  });

  it("an operation that survives cancellation is reported as unsettled", async () => {
    const { op } = fakeOperation(null);
    const cancel = vi.fn(async () => {}); // cancel "succeeds" but the operation keeps running
    const err = await paused({ gates: [], bodyMs: 500, settleMs: 50, cancel }, async (track) => { track(op); })
      .catch((e) => e);
    expect(err.message).toBe("harness: 1 of 1 operations did not settle even after cancellation");
  });

  it("a cancel that fails or hangs is reported separately and the original failure is still thrown", async () => {
    const { op } = fakeOperation(null);
    const original = new Error("assertion failed");
    const errorLog = quietly();
    await expect(paused({ gates: [], bodyMs: 500, settleMs: 50, cancel: () => new Promise(() => {}) }, async (track) => {
      track(op);
      throw original;
    })).rejects.toBe(original);
    expect(errorLog.mock.calls[0][1]).toMatch(/did not settle even after cancellation; cancel failed: cancelling outstanding operations: no result within 50 ms/);
    errorLog.mockRestore();
  });

  it("a passing body whose operations needed cancelling does not pass silently", async () => {
    const { op, terminate } = fakeOperation(null);
    await expect(paused({ gates: [], bodyMs: 500, settleMs: 50, cancel: async () => terminate() }, async (track) => { track(op); }))
      .rejects.toThrow("harness: operations had to be cancelled to settle");
  });

  it("a clean scenario reports every operation settled without cancelling", async () => {
    const held = gate();
    const { op } = fakeOperation(held.promise);
    const cancel = vi.fn(async () => {});
    const { report } = await paused({ gates: [held], bodyMs: 500, settleMs: 200, cancel }, async (track) => {
      track(op);
      held.release();
      await op;
    });
    expect(report).toEqual({ started: 1, settled: 1, cancelRequested: false, unsettled: 0 });
    expect(cancel).not.toHaveBeenCalled();
  });

  it("an assertion failure while paused releases the gate first", async () => {
    const held = gate();
    const { op } = fakeOperation(held.promise);
    await expect(paused({ gates: [held], bodyMs: 500, settleMs: 200, cancel: async () => {} }, async (track) => {
      track(op);
      expect(1).toBe(2);
    })).rejects.toThrow(/expected 1 to be 2/);
    expect(held.released).toBe(true);
    await expect(op).resolves.toBe("committed");
  });
});

describe("waitForSignal()", () => {
  it("is bounded when the signal never comes", async () => {
    await expect(waitForSignal(gate().promise, new Promise(() => {}), 50, "submit acquiring the lock"))
      .rejects.toThrow("submit acquiring the lock: waiting for the signal: no result within 50 ms");
  });
  it("fails at once, with the cause, when the operation fails before reaching the pause", async () => {
    const cause = new Error("company not found");
    const err = await waitForSignal(gate().promise, Promise.reject(cause), 5000, "submit").catch((e) => e);
    expect(err.message).toBe("submit: the operation failed before signalling: company not found");
    expect(err.cause).toBe(cause);
  });
  it("fails when the operation finishes without pausing, and resolves when the signal arrives", async () => {
    await expect(waitForSignal(gate().promise, Promise.resolve("done"), 5000, "save")).rejects.toThrow("save: the operation finished before signalling");
    const g = gate();
    setTimeout(g.release, 5);
    await expect(waitForSignal(g.promise, new Promise(() => {}), 1000, "x")).resolves.toBeUndefined();
  });
});

describe("cleanup(): bounded", () => {
  it("Astra's case — a hanging step: bounded, later steps still run, backends cancelled, pool close attempted", async () => {
    const calls: string[] = [];
    const started = Date.now();
    const err = await cleanup([
      ["admin_notifications", () => { calls.push("notifications"); return new Promise(() => {}); }], // hangs
      ["companies", async () => { calls.push("companies"); }],
    ], {
      stepMs: 50,
      cancel: async () => { calls.push("cancel"); },
      close: async () => { calls.push("close"); },
    }).catch((e) => e);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(calls).toEqual(["notifications", "companies", "cancel", "close"]);
    expect(err.message).toBe("cleanup failed — admin_notifications: admin_notifications: no result within 50 ms");
    expect(err.cause).toBeInstanceOf(HarnessTimeout); // "timed out", never reported as done
  });

  it("failing steps, a failing cancel and a hanging close are all reported; the first is the cause", async () => {
    const first = new Error("permission denied for table admin_notifications");
    const err = await cleanup([
      ["admin_notifications", async () => { throw first; }],
      ["users", async () => { throw new Error("fk violation"); }],
    ], {
      stepMs: 50,
      cancel: async () => { throw new Error("connection refused"); },
      close: () => new Promise(() => {}),
    }).catch((e) => e);
    expect(err.message).toBe(
      "cleanup failed — admin_notifications: permission denied for table admin_notifications; users: fk violation; " +
      "cancel outstanding backends: connection refused; close pool: close pool: no result within 50 ms",
    );
    expect(err.cause).toBe(first);
  });

  it("succeeds quietly when everything works", async () => {
    await expect(cleanup([["rows", async () => {}]], { stepMs: 100, cancel: async () => {}, close: async () => {} })).resolves.toBeUndefined();
  });
});

describe("within()", () => {
  it("clears its timer when the promise wins, so nothing keeps the process alive", async () => {
    const spy = vi.spyOn(globalThis, "clearTimeout");
    await expect(within(Promise.resolve(1), 10_000, "x")).resolves.toBe(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
