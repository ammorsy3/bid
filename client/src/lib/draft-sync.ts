// Saving a shared pricing draft without losing edits (PB-2, PB-3).
//
// Every edit bumps a generation number. A save sends the payload as it is at
// that moment and, when the server accepts it, records that generation as
// acknowledged: edits made while the save was in flight stay "unsaved" and are
// sent by the next save. Saves never overlap — a new request waits for the one
// in flight — so a slow, older response can never mark newer edits as saved or
// reorder versions. A version conflict (another team member saved) stops all
// saving until the caller reloads the latest draft explicitly.

export class DraftConflictError extends Error {
  constructor() {
    super("DRAFT_CONFLICT");
    this.name = "DraftConflictError";
  }
}

export type SaveRequest<P> = (payload: P, baseVersion: number | null) => Promise<{ version: number }>;

export type SyncStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export interface SyncState {
  status: SyncStatus;
  /** Edits the server has not acknowledged yet. */
  dirty: boolean;
  /** The draft version this client last saw from the server. */
  version: number | null;
}

export class DraftSync<P> {
  private gen = 0;
  private ackGen = 0;
  private version: number | null;
  private status: SyncStatus = "idle";
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly save: SaveRequest<P>,
    private readonly current: () => P,
    initialVersion: number | null,
    private readonly onState: (s: SyncState) => void = () => {},
  ) {
    this.version = initialVersion;
  }

  get state(): SyncState {
    return { status: this.status, dirty: this.gen > this.ackGen, version: this.version };
  }

  private emit(status?: SyncStatus) {
    if (status) this.status = status;
    this.onState(this.state);
  }

  /** Record that the payload changed. */
  edit() {
    this.gen++;
    if (this.status === "saved") this.status = "idle";
    this.emit();
  }

  /** The server refused a submission because the shared draft moved on. */
  markConflict() {
    this.emit("conflict");
  }

  /** After the caller reloaded the latest draft from the server. */
  reset(version: number | null) {
    this.version = version;
    this.ackGen = this.gen;
    this.emit("idle");
  }

  /**
   * Save until everything edited so far is acknowledged. Resolves true when the
   * server holds every edit made before the call; false on conflict or failure.
   * Calls are serialized: overlapping manual and automatic saves queue up.
   */
  flush(): Promise<boolean> {
    const run = this.chain.then(() => this.drain());
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async drain(): Promise<boolean> {
    const target = this.gen;
    while (this.ackGen < target) {
      if (this.status === "conflict") return false;
      const sending = this.gen;
      this.emit("saving");
      try {
        const r = await this.save(this.current(), this.version);
        this.version = r.version;
        this.ackGen = Math.max(this.ackGen, sending);
      } catch (err) {
        this.emit(err instanceof DraftConflictError ? "conflict" : "error");
        return false;
      }
    }
    this.emit(this.status === "conflict" ? "conflict" : this.gen > this.ackGen ? "idle" : "saved");
    return this.status !== "conflict";
  }
}
