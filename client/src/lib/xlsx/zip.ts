// A bounded, read-only ZIP reader for .xlsx (proposal §9 memory bounds). Only
// what an .xlsx needs: stored or deflated entries, no encryption, no ZIP64.
// Declared sizes are not trusted: inflated bytes are counted while inflating,
// and an entry stops as soon as it passes its limit or 100× its compressed size.
// Inflation uses the platform's DecompressionStream (no dependency).

import { IMPORT_LIMITS, ImportError, limitVars } from "@shared/boq-import";

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const unsupported = () => new ImportError("import.unsupportedFormat");

/** Central directory of the archive, or ImportError for anything that isn't a plain ZIP. */
export function readCentralDirectory(bytes: Uint8Array): Map<string, ZipEntry> {
  if (bytes.length < 22 || u32(bytes, 0) !== 0x04034b50) throw unsupported();
  // End of central directory: within the last 64 KiB + 22 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw unsupported();
  const count = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw unsupported(); // ZIP64
  if (count > IMPORT_LIMITS.zipEntries) throw unsupported();
  if (cdOffset + cdSize > bytes.length) throw unsupported();
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) throw unsupported();
    const flags = u16(bytes, p + 8);
    const method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localHeaderOffset = u32(bytes, p + 42);
    if (flags & 0x1) throw unsupported(); // encrypted
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)).replace(/\\/g, "/");
    entries.set(name, { name, method, compressedSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export interface ReadBudget {
  /** Inflated bytes used so far across the workbook (total cap). */
  used: number;
}

/** Inflate one entry, counting real bytes. `max` is this entry's own cap. */
export async function readEntry(bytes: Uint8Array, entry: ZipEntry, max: number, budget: ReadBudget, signal?: AbortSignal): Promise<Uint8Array> {
  const p = entry.localHeaderOffset;
  if (p + 30 > bytes.length || u32(bytes, p) !== 0x04034b50) throw unsupported();
  const start = p + 30 + u16(bytes, p + 26) + u16(bytes, p + 28);
  const end = start + entry.compressedSize;
  if (end > bytes.length) throw unsupported();
  const data = bytes.subarray(start, end);
  const ratioCap = Math.max(entry.compressedSize * IMPORT_LIMITS.inflateRatio, 64 * 1024);
  const cap = Math.min(max, ratioCap);
  const tooBig = () => new ImportError("import.fileTooLarge", { ...limitVars["import.fileTooLarge"] });

  if (entry.method === 0) {
    if (data.length > cap) throw tooBig();
    budget.used += data.length;
    if (budget.used > IMPORT_LIMITS.totalBytes) throw tooBig();
    return data;
  }
  if (entry.method !== 8) throw unsupported();

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      budget.used += value.length;
      if (size > cap || budget.used > IMPORT_LIMITS.totalBytes) throw tooBig();
      chunks.push(value);
    }
  } catch (err) {
    reader.cancel().catch(() => {});
    if (err instanceof ImportError || (err as Error)?.name === "AbortError") throw err;
    throw unsupported(); // corrupt deflate data
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
