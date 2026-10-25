/// <reference lib="webworker" />
// The unbounded part of reading an .xlsx (PB-7), off the main thread: ZIP
// directory, inflating with counted bytes and ratio caps, and cutting large
// parts into small XML pieces. The main thread can stop all of it at once with
// worker.terminate() (Cancel, or the 30-second limit). XML is parsed on the main
// thread one small piece at a time (DOMParser does not exist in workers).

import { ImportError } from "@shared/boq-import";
import { readCentralDirectory, readEntry, type ReadBudget, type ZipEntry } from "./zip";
import { chunkXml, partTooLarge } from "./chunks";
import { IMPORT_LIMITS, utf8Length } from "@shared/boq-import";

type Req =
  | { id: number; op: "open"; buffer: ArrayBuffer }
  | { id: number; op: "text"; path: string; max: number }
  | { id: number; op: "chunks"; path: string; max: number; element: "row" | "si" };

let bytes: Uint8Array | null = null;
let entries: Map<string, ZipEntry> = new Map();
const budget: ReadBudget = { used: 0 };
const decoder = new TextDecoder("utf-8");

async function text(path: string, max: number): Promise<string | null> {
  const e = entries.get(path);
  if (!e || !bytes) return null;
  return decoder.decode(await readEntry(bytes, e, max, budget));
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const req = ev.data;
  try {
    if (req.op === "open") {
      bytes = new Uint8Array(req.buffer);
      entries = readCentralDirectory(bytes);
      budget.used = 0;
      (self as unknown as Worker).postMessage({ id: req.id, ok: true, value: Array.from(entries.keys()) });
    } else if (req.op === "text") {
      // Small parts are parsed whole on the page: refuse any over the structure limit here.
      const t = await text(req.path, req.max);
      if (t !== null && utf8Length(t) > IMPORT_LIMITS.structureBytes) throw partTooLarge();
      (self as unknown as Worker).postMessage({ id: req.id, ok: true, value: t });
    } else {
      const t = await text(req.path, req.max);
      (self as unknown as Worker).postMessage({ id: req.id, ok: true, value: t === null ? null : chunkXml(t, req.element) });
    }
  } catch (err) {
    const e = err instanceof ImportError ? { key: err.key, vars: err.vars } : { key: "import.unsupportedFormat", vars: {} };
    (self as unknown as Worker).postMessage({ id: req.id, ok: false, error: e });
  }
};
