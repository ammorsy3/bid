// PB-2/PB-3: the pricing page's draft saving (client/src/lib/draft-sync.ts).
import { describe, it, expect } from "vitest";
import { DraftSync, DraftConflictError } from "../client/src/lib/draft-sync";

// A fake server whose responses the test releases one by one, in any order.
function server() {
  const calls: { payload: string; base: number | null; resolve: (v: { version: number }) => void; reject: (e: unknown) => void }[] = [];
  let version = 0;
  const save = (payload: string, base: number | null) => new Promise<{ version: number }>((resolve, reject) => {
    calls.push({ payload, base, resolve: (v) => resolve(v), reject });
  });
  const ack = (i: number) => { version++; calls[i].resolve({ version }); };
  return { calls, save, ack };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("DraftSync", () => {
  it("an edit made while a save is in flight stays unsaved after the older save returns", async () => {
    const srv = server(); let payload = "a";
    const sync = new DraftSync(srv.save, () => payload, null);
    sync.edit();
    const first = sync.flush();
    await tick();
    payload = "ab"; sync.edit();          // typed during the save
    srv.ack(0);                           // the older save completes
    expect(await first).toBe(true);
    expect(sync.state.dirty).toBe(true);  // "ab" not acknowledged yet
    const second = sync.flush();
    await tick();
    expect(srv.calls[1]).toMatchObject({ payload: "ab", base: 1 });
    srv.ack(1);
    expect(await second).toBe(true);
    expect(sync.state).toMatchObject({ dirty: false, version: 2, status: "saved" });
  });

  it("overlapping manual and automatic saves never run at once and send the latest payload in order", async () => {
    const srv = server(); let payload = "x1";
    const sync = new DraftSync(srv.save, () => payload, null);
    sync.edit();
    const auto = sync.flush();
    await tick();                         // the autosave request is on the wire
    payload = "x2"; sync.edit();
    const manual = sync.flush();          // queued, not concurrent
    await tick();
    expect(srv.calls).toHaveLength(1);
    srv.ack(0);
    await auto; await tick();
    expect(srv.calls).toHaveLength(2);
    expect(srv.calls[1]).toMatchObject({ payload: "x2", base: 1 });
    srv.ack(1);
    expect(await manual).toBe(true);
    expect(sync.state).toMatchObject({ dirty: false, version: 2 });
  });

  it("a slow response cannot acknowledge edits that were not in it", async () => {
    const srv = server(); let payload = "p1";
    const sync = new DraftSync(srv.save, () => payload, null);
    sync.edit(); const f = sync.flush(); await tick();
    payload = "p2"; sync.edit(); payload = "p3"; sync.edit();
    await new Promise((r) => setTimeout(r, 30)); srv.ack(0); await f;
    expect(sync.state.dirty).toBe(true);
  });

  it("a conflict stops saving and makes flush report failure until the caller reloads", async () => {
    let payload = "c";
    const sync = new DraftSync(async () => { throw new DraftConflictError(); }, () => payload, 3);
    sync.edit();
    expect(await sync.flush()).toBe(false);
    expect(sync.state.status).toBe("conflict");
    sync.edit();
    expect(await sync.flush()).toBe(false);
    sync.reset(5);
    expect(sync.state).toMatchObject({ status: "idle", dirty: false, version: 5 });
  });

  it("a network failure reports false and keeps the edits unsaved; a later flush retries", async () => {
    let fail = true; let payload = "n";
    const sync = new DraftSync(async () => { if (fail) throw new Error("offline"); return { version: 1 }; }, () => payload, null);
    sync.edit();
    expect(await sync.flush()).toBe(false);
    expect(sync.state).toMatchObject({ status: "error", dirty: true });
    fail = false;
    expect(await sync.flush()).toBe(true);
    expect(sync.state.dirty).toBe(false);
  });

  it("nothing to save resolves true without calling the server", async () => {
    let n = 0;
    const sync = new DraftSync(async () => { n++; return { version: 1 }; }, () => "", 2);
    expect(await sync.flush()).toBe(true);
    expect(n).toBe(0);
  });
});
