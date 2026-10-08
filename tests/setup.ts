// Integration tests talk to the real database and object storage, so they need
// the same environment the server runs with.
import "dotenv/config";

// CI has no database: a placeholder lets server modules that read DATABASE_URL at
// load time import. The pool connects lazily and the unit tests never query it.
process.env.DATABASE_URL ??= "postgres://ci:ci@localhost:5432/ci";
