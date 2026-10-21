// A request's own files (attachments, voice note, video) must be issued for the
// requesting company (any member's upload) — company provenance at write time,
// the counterpart of the read rule in GET /objects/*. Before this, a requester
// could list any stored object as an attachment; the read side already refused
// to serve it, and now the write is refused too.
//
// Only managed paths (/objects/...) are checked; an external video link (e.g.
// YouTube) is not a managed file. On edit, files already on the request stay as
// they are (existing references); only newly added ones are checked. A legacy
// (pre-provenance) file must be uploaded again.

import { isUploadObjectPath } from "@shared/company-verification";
import type { ObjectProvenance } from "../objectAcl";
import { attachProblem } from "./object-provenance";

export class TenderFileError extends Error {
  constructor(public readonly field: string, public readonly code: "INVALID_FILE_REFERENCE" | "FILE_NOT_OWNED" | "REUPLOAD_REQUIRED") {
    super(code === "REUPLOAD_REQUIRED" ? "This file must be uploaded again." : "This file cannot be attached to this request.");
    this.name = "TenderFileError";
  }
}

interface TenderFiles {
  attachments?: { url?: unknown }[] | null;
  voiceNoteUrl?: unknown;
  videoUrl?: unknown;
}

function managedRefs(t: TenderFiles | null | undefined): { field: string; path: string }[] {
  if (!t) return [];
  const refs: { field: string; path: string }[] = [];
  for (const a of Array.isArray(t.attachments) ? t.attachments : []) {
    if (a && typeof a.url === "string" && a.url.startsWith("/objects/")) refs.push({ field: "attachments", path: a.url });
  }
  for (const field of ["voiceNoteUrl", "videoUrl"] as const) {
    const v = t[field];
    if (typeof v === "string" && v.startsWith("/objects/")) refs.push({ field, path: v });
  }
  return refs;
}

/** Throws TenderFileError for the first newly referenced file the company may not attach. */
export async function assertTenderFilesAllowed(
  next: TenderFiles,
  previous: TenderFiles | null,
  companyId: string,
  getObjectProvenance: (objectPath: string) => Promise<ObjectProvenance | null>,
): Promise<void> {
  const existing = new Set(managedRefs(previous).map((r) => r.path));
  for (const ref of managedRefs(next)) {
    if (existing.has(ref.path)) continue;
    if (!isUploadObjectPath(ref.path)) throw new TenderFileError(ref.field, "INVALID_FILE_REFERENCE");
    const problem = attachProblem(await getObjectProvenance(ref.path), companyId);
    if (problem) throw new TenderFileError(ref.field, problem);
  }
}
