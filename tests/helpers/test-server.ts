// HTTP test servers bound to 127.0.0.1 (SEC-CG8-HARNESS-R1).
//
// supertest's request(app) calls app.listen(0), which binds the WILDCARD address,
// and then connects to 127.0.0.1:<port>. On macOS that wildcard bind succeeds
// even when another process already holds 127.0.0.1:<port>, and the loopback
// connection is then answered by that other process (seen: a desktop app's
// listener answering 404 with an empty body), so a test could fail spuriously or
// pass a bare 404 assertion without ever reaching the app under test.
//
// startTestServer binds 127.0.0.1 itself on an ephemeral port, so the kernel never
// hands out a port that is already taken there. A bind error rejects (setup
// fails); there is no fallback to the wildcard address. Every response carries
// X-Test-Server: <id>, and requestsHandled counts what the app actually served,
// so a test can prove where a response came from. Use request(server) and
// stopTestServer(server) in afterAll; tests/setup.ts fails a file that leaves one
// listening.

import http from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

export type TestServer = http.Server & { testServerId: string; requestsHandled: number };

export const TEST_SERVER_HEADER = "x-test-server";

const open = new Set<TestServer>();

/** Test servers of this test file that are still listening. */
export function openTestServerCount(): number {
  return open.size;
}

/** Bind `app` on 127.0.0.1. `port` is for the transport regression test only. */
export async function startTestServer(app: http.RequestListener, options: { port?: number } = {}): Promise<TestServer> {
  const testServerId = randomUUID();
  const server = http.createServer((req, res) => {
    server.requestsHandled++;
    res.setHeader(TEST_SERVER_HEADER, testServerId);
    app(req, res);
  }) as TestServer;
  server.testServerId = testServerId;
  server.requestsHandled = 0;

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once("error", onError);
    server.listen({ port: options.port ?? 0, host: "127.0.0.1", exclusive: true }, () => {
      server.off("error", onError);
      resolve();
    });
  });

  const addr = server.address() as AddressInfo | null;
  if (!addr || addr.address !== "127.0.0.1") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error(`test server bound to ${JSON.stringify(addr)}, expected 127.0.0.1`);
  }
  open.add(server);
  return server;
}

/** Close a test server and every connection it still holds. Safe to call twice or with undefined. */
export async function stopTestServer(server: TestServer | undefined): Promise<void> {
  if (!server) return;
  open.delete(server);
  if (!server.listening) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}
