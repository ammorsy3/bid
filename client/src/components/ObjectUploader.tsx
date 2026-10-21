import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type UploadResult = {
  successful: Array<{ uploadURL: string; name: string }>;
  failed: Array<unknown>;
};

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  onComplete?: (result: UploadResult) => void;
  buttonClassName?: string;
  children: ReactNode;
  buttonVariant?: "default" | "outline" | "ghost";
  /**
   * The upload itself (not the dialog): "uploading" when bytes start moving,
   * then "done" or "failed". Lets a parent block actions that must wait for the
   * file — closing the dialog does not cancel an upload already under way.
   */
  onUploadStateChange?: (state: "uploading" | "done" | "failed", fileName?: string) => void;
  /** Blocks opening the uploader (e.g. while the parent is still saving the previous file). */
  disabled?: boolean;
}

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

export function ObjectUploader({
  maxFileSize = 52428800,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "default",
  children,
  onUploadStateChange,
  disabled = false,
}: ObjectUploaderProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [attemptNum, setAttemptNum] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // One upload at a time per uploader. An upload keeps running after its dialog
  // is closed, so its lifecycle lives in refs, not in the dialog's view state:
  //   - inFlight blocks starting (or even opening for) a second upload;
  //   - viewOp is the upload the open dialog is showing (0 = none), so a finished
  //     older upload can never repaint, or auto-close, a dialog it no longer owns.
  const inFlightRef = useRef(false);
  const [inFlight, setInFlight] = useState(false);
  const opSeq = useRef(0);
  const viewOp = useRef(0);
  const openRef = useRef(false);
  const blocked = disabled || inFlight;

  // Keep keyboard focus inside the dialog as its content changes: the control
  // that had focus unmounts when the step changes.
  useEffect(() => {
    if (!open) return;
    if (state === "selected") uploadButtonRef.current?.focus();
    else if (state === "error") dropZoneRef.current?.focus();
  }, [state, open]);

  const MAX_ATTEMPTS = 3;

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return t('common.fileTooLarge', { size: (maxFileSize / 1024 / 1024).toFixed(0) });
    }
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const allowed = allowedFileTypes.some((type) => {
        if (type.startsWith(".")) return file.name.toLowerCase().endsWith(type.toLowerCase());
        if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -2));
        return file.type === type;
      });
      if (!allowed) {
        return t('common.fileTypeUnsupported', { types: allowedFileTypes.join(", ") });
      }
    }
    return null;
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setErrorMsg(err);
        setState("error");
        return;
      }
      setSelectedFile(file);
      setState("selected");
      setErrorMsg("");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxFileSize, allowedFileTypes],
  );

  const handleUpload = async () => {
    if (!selectedFile || inFlightRef.current) return;
    const file = selectedFile;
    const op = ++opSeq.current;
    const shown = () => openRef.current && viewOp.current === op;
    inFlightRef.current = true;
    setInFlight(true);
    viewOp.current = op;
    setState("uploading");
    onUploadStateChange?.("uploading", file.name);
    setProgress(0);
    setAttemptNum(1);

    let lastError: { message?: string; status?: number } | null = null;
    let uploadedURL: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (shown()) setAttemptNum(attempt);
      if (attempt > 1) {
        // Exponential backoff: 1s, 2s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 2)));
        if (shown()) setProgress(0);
      }
      try {
        const { url } = await onGetUploadParameters();
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && shown()) setProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr.addEventListener("load", () => {
            if (xhr.status < 300) {
              resolve();
            } else {
              const err: { message: string; status: number } = {
                message: `${t('common.uploadFile')}: ${xhr.status}`,
                status: xhr.status,
              };
              reject(err);
            }
          });
          xhr.addEventListener("error", () => reject({ message: "Network error" }));
          xhr.addEventListener("timeout", () => reject({ message: t('common.uploadTimedOut') }));
          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.send(file);
        });
        uploadedURL = url;
        break;
      } catch (err: any) {
        lastError = err;
        // 4xx is permanent (bad file, auth, etc.) — don't retry
        if (err?.status && err.status >= 400 && err.status < 500) break;
      }
    }

    inFlightRef.current = false;
    setInFlight(false);
    if (uploadedURL) {
      if (shown()) {
        setProgress(100);
        setState("success");
        // Close only the dialog that is still showing THIS upload.
        setTimeout(() => { if (shown()) handleOpenChange(false); }, 1200);
      }
      onUploadStateChange?.("done", file.name);
      onComplete?.({
        successful: [{ uploadURL: uploadedURL, name: file.name }],
        failed: [],
      });
    } else {
      if (shown()) {
        setErrorMsg(
          lastError?.status && lastError.status >= 400 && lastError.status < 500
            ? t('common.serverRejectedUpload')
            : t('common.uploadFailedAttempts', { count: MAX_ATTEMPTS }),
        );
        setState("error");
      }
      onUploadStateChange?.("failed", file.name);
    }
  };

  const reset = () => {
    viewOp.current = 0; // the dialog no longer shows any upload; one still running carries on
    setState("idle");
    setSelectedFile(null);
    setProgress(0);
    setErrorMsg("");
    setAttemptNum(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (v: boolean) => {
    if (v && blocked) return;
    openRef.current = v;
    setOpen(v);
    if (!v) reset();
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const fileSizeMB = maxFileSize / 1024 / 1024;
  const typeHint = allowedFileTypes
    ? allowedFileTypes.map((t) => t.replace(".", "").toUpperCase()).join(", ")
    : null;

  return (
    <>
      {/* aria-disabled (not `disabled`) keeps the trigger focusable, so focus can
          return to it when the dialog closes mid-upload; the click is refused. */}
      <Button
        ref={triggerRef}
        onClick={() => handleOpenChange(true)}
        aria-disabled={blocked || undefined}
        data-busy={inFlight || undefined}
        className={cn(buttonClassName, blocked && "opacity-60 cursor-not-allowed")}
        variant={buttonVariant}
        type="button"
        data-testid="button-upload"
      >
        {children}
        {inFlight && <span className="sr-only">{t('common.uploadInProgress')}</span>}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md p-0 overflow-hidden gap-0"
          // The dialog is opened from state, not a DialogTrigger, so return focus
          // to the button that opened it explicitly rather than relying on
          // whatever had focus when it mounted.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base font-semibold text-foreground">
              {t('common.uploadFile')}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {/* ── Idle / Error: drop zone ── */}
            {(state === "idle" || state === "error") && (
              <>
              {/* A real button, so the file picker opens from the keyboard (Enter / Space) as well as by click, tap or drop. */}
              <button
                ref={dropZoneRef}
                type="button"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                aria-describedby={state === "error" ? "object-uploader-error" : undefined}
                data-testid="button-choose-file"
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-10 px-6 cursor-pointer transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01] focus-visible:ring-offset-2",
                  isDragOver
                    ? "border-[#FE3C01] bg-[#FE3C01]/5 scale-[0.99]"
                    : "border-border hover:border-border hover:bg-muted/80",
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    isDragOver ? "bg-[#FE3C01]/10" : "bg-muted",
                  )}
                >
                  <CloudUpload
                    className={cn(
                      "w-7 h-7 transition-colors",
                      isDragOver ? "text-[#FE3C01]" : "text-neutral-400",
                    )}
                  />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('common.dropFileHere')}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {t('common.or')}{" "}
                    <span className="text-[#FE3C01] font-medium underline underline-offset-2">
                      {t('common.browseFiles')}
                    </span>
                  </p>
                </div>

                {(typeHint || maxFileSize) && (
                  <p className="text-[11px] text-neutral-400 bg-muted rounded-full px-3 py-1">
                    {[typeHint, t('common.maxFileSize', { size: fileSizeMB.toFixed(0) })].filter(Boolean).join(" · ")}
                  </p>
                )}

              </button>
              {state === "error" && (
                <div id="object-uploader-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg px-3 py-2 w-full justify-center">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              </>
            )}

            {/* ── File selected ── */}
            {state === "selected" && selectedFile && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-4">
                  <div className="w-10 h-10 bg-card rounded-xl border border-border flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {selectedFile.size < 1024 * 1024
                        ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                        : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                      // The file row unmounts; hand focus back to the picker.
                      requestAnimationFrame(() => dropZoneRef.current?.focus());
                    }}
                    aria-label={t('common.removeSelectedFile')}
                    className="h-11 w-11 -m-2 md:h-8 md:w-8 md:m-0 shrink-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  ref={uploadButtonRef}
                  onClick={handleUpload}
                  className="w-full bg-[#FE3C01] hover:bg-[#E83501] h-11 md:h-10 rounded-xl font-medium"
                  data-testid="button-start-upload"
                >
                  {t('common.uploadFile')}
                </Button>
              </div>
            )}

            {/* ── Uploading ── */}
            {state === "uploading" && (
              <div className="space-y-4 py-1" role="status" aria-live="polite">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-4">
                  <div className="w-10 h-10 bg-card rounded-xl border border-border flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {attemptNum > 1
                        ? t('common.retryingUpload', { attempt: attemptNum, total: MAX_ATTEMPTS, progress })
                        : t('common.uploadingProgress', { progress })}
                    </p>
                  </div>
                </div>
                <Progress value={progress} className="h-1.5 rounded-full" />
              </div>
            )}

            {/* ── Success ── */}
            {state === "success" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-foreground">{t('common.uploadComplete')}</p>
                  <p className="text-xs text-neutral-400">{selectedFile?.name}</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            data-testid="input-file"
            className="hidden"
            accept={allowedFileTypes?.join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
