// SEC-CG8-HARNESS-R1: test requests must reach the app under test.
//
// A self-owned decoy stands in for a foreign process holding 127.0.0.1:<port>
// (a desktop app's loopback listener did this on a developer machine). It answers
// every request with 404 and an empty body, like the observed intruder. Nothing
// here connects to anything but servers this file starts; all are closed.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import request from "supertest";
import type { AddressInfo } from "node:net";
import { startTestServer, stopTestServer, openTestServerCount, TEST_SERVER_HEADER, type TestServer } from "./helpers/test-server";

let decoy: http.Server;
let decoyPort: number;
let decoyHits = 0;
let server: TestServer;
const others: http.Server[] = [];

const app = express();
app.get("/exists", (_req, res) => res.json({ ok: true }));
app.get("/missing", (_req, res) => res.status(404).json({ message: "Not here" }));

const listen = (s: http.Server, options: { port: number; host?: string }) =>
  new Promise<void>((resolve, reject) => { s.once("error", reject); s.listen(options, () => { s.off("error", reject); resolve(); }); });
const close = (s: http.Server) => new Promise<void>((resolve) => { if (!s.listening) return resolve(); s.closeAllConnections(); s.close(() => resolve()); });

beforeAll(async () => {
  decoy = http.createServer((_req, res) => { decoyHits++; res.statusCode = 404; res.end(); });
  await listen(decoy, { port: 0, host: "127.0.0.1" });
  decoyPort = (decoy.address() as AddressInfo).port;
  server = await startTestServer(app);
});

afterAll(async () => {
  await stopTestServer(server);
  for (const s of [decoy, ...others]) await close(s);
});

describe("test-server transport", () => {
  it("HAZARD (why this exists): a wildcard bind on the decoy's port is allowed, and a 127.0.0.1 request then reaches the decoy", async () => {
    // What supertest's request(app) does when the kernel happens to pick that port.
    const wildcardApp = http.createServer(app);
    others.push(wildcardApp);
    let bound = true;
    try { await listen(wildcardApp, { port: decoyPort }); } catch { bound = false; }
    if (!bound) {
      // Linux refuses the shadowing bind (no hazard to show there); macOS allows it, so it must run here.
      expect(process.platform).not.toBe("darwin");
      return;
    }
    const before = decoyHits;
    const r = await request(`http://127.0.0.1:${decoyPort}`).get("/exists");
    // A bare `expect(r.status).toBe(404)` would pass here without the app ever answering:
    expect([r.status, r.text, r.headers[TEST_SERVER_HEADER]]).toEqual([404, "", undefined]);
    expect(decoyHits).toBe(before + 1);
    await close(wildcardApp);
  });

  it("startTestServer binds 127.0.0.1 itself, never the wildcard", () => {
    const addr = server.address() as AddressInfo;
    expect([addr.address, addr.family, addr.port > 0]).toEqual(["127.0.0.1", "IPv4", true]);
  });

  it("a port already held on 127.0.0.1 makes setup fail — no fallback to another port or to the wildcard", async () => {
    await expect(startTestServer(app, { port: decoyPort })).rejects.toMatchObject({ code: "EADDRINUSE" });
    expect(openTestServerCount()).toBe(1); // only `server`; the failed one was never registered
  });

  it("request(server) reaches the intended app: response origin and handler counter prove it; the decoy is untouched", async () => {
    const before = { decoy: decoyHits, handled: server.requestsHandled };
    const ok = await request(server).get("/exists");
    expect([ok.status, ok.body, ok.headers[TEST_SERVER_HEADER]]).toEqual([200, { ok: true }, server.testServerId]);
    expect([decoyHits, server.requestsHandled]).toEqual([before.decoy, before.handled + 1]);
  });

  it("a 404 assertion is satisfied only by the app's own 404, never by another listener's", async () => {
    const before = { decoy: decoyHits, handled: server.requestsHandled };
    const r = await request(server).get("/missing");
    expect([r.status, r.body, r.headers[TEST_SERVER_HEADER]]).toEqual([404, { message: "Not here" }, server.testServerId]);
    expect([decoyHits, server.requestsHandled]).toEqual([before.decoy, before.handled + 1]);
  });

  it("stopTestServer closes the listener and is idempotent", async () => {
    const extra = await startTestServer(app);
    const port = (extra.address() as AddressInfo).port;
    expect(openTestServerCount()).toBe(2);
    await stopTestServer(extra);
    await stopTestServer(extra);
    expect([extra.listening, openTestServerCount()]).toEqual([false, 1]);
    // The port is free again on 127.0.0.1.
    const probe = http.createServer();
    others.push(probe);
    await listen(probe, { port, host: "127.0.0.1" });
    await close(probe);
  });
});
