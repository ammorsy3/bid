// Integration tests talk to the real database and object storage, so they need
// the same environment the server runs with.
import "dotenv/config";

// CI has no database: a placeholder lets server modules that read DATABASE_URL at
// load time import. The pool connects lazily and the unit tests never query it.
process.env.DATABASE_URL ??= "postgres://ci:ci@localhost:5432/ci";

// Every HTTP test server must be closed by its file (tests/helpers/test-server.ts).
// Registered first, so with vitest's stacked after-hooks it runs after the file's
// own afterAll hooks.
import { afterAll } from "vitest";
import { openTestServerCount } from "./helpers/test-server";
afterAll(() => {
  const n = openTestServerCount();
  if (n > 0) throw new Error(`${n} test server(s) still listening after this file — close them with stopTestServer in afterAll`);
});
