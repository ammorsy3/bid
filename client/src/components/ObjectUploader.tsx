import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

export function ObjectUploader({
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "default",
  children,
}: ObjectUploaderProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [attemptNum, setAttemptNum] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTEMPTS = 3;

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(0)}MB.`;
    }
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const allowed = allowedFileTypes.some((type) => {
        if (type.startsWith(".")) return file.name.toLowerCase().endsWith(type.toLowerCase());
        if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -2));
        return file.type === type;
      });
      if (!allowed) {
        return `File type not supported. Accepted: ${allowedFileTypes.join(", ")}`;
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
    if (!selectedFile) return;
    setState("uploading");
    setProgress(0);
    setAttemptNum(1);

    let lastError: { message?: string; status?: number } | null = null;
    let uploadedURL: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      setAttemptNum(attempt);
      if (attempt > 1) {
        // Exponential backoff: 1s, 2s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 2)));
        setProgress(0);
      }
      try {
        const { url } = await onGetUploadParameters();
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr.addEventListener("load", () => {
            if (xhr.status < 300) {
              resolve();
            } else {
              const err: { message: string; status: number } = {
                message: `Upload failed: ${xhr.status}`,
                status: xhr.status,
              };
              reject(err);
            }
          });
          xhr.addEventListener("error", () => reject({ message: "Network error" }));
          xhr.addEventListener("timeout", () => reject({ message: "Upload timed out" }));
          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");
          xhr.send(selectedFile);
        });
        uploadedURL = url;
        break;
      } catch (err: any) {
        lastError = err;
        // 4xx is permanent (bad file, auth, etc.) — don't retry
        if (err?.status && err.status >= 400 && err.status < 500) break;
      }
    }

    if (uploadedURL) {
      setProgress(100);
      setState("success");
      onComplete?.({
        successful: [{ uploadURL: uploadedURL, name: selectedFile.name }],
        failed: [],
      });
      setTimeout(() => handleOpenChange(false), 1200);
    } else {
      setErrorMsg(
        lastError?.status && lastError.status >= 400 && lastError.status < 500
          ? "Server rejected the upload. Please check the file and try again."
          : `Upload failed after ${MAX_ATTEMPTS} attempts. Please check your connection and try again.`,
      );
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedFile(null);
    setProgress(0);
    setErrorMsg("");
    setAttemptNum(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (v: boolean) => {
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
      <Button
        onClick={() => setOpen(true)}
        className={buttonClassName}
        variant={buttonVariant}
        type="button"
        data-testid="button-upload"
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-base font-semibold text-foreground">
              Upload File
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            {/* ── Idle / Error: drop zone ── */}
            {(state === "idle" || state === "error") && (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-10 px-6 cursor-pointer transition-all select-none",
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
                    Drop your file here
                  </p>
                  <p className="text-xs text-neutral-400">
                    or{" "}
                    <span className="text-[#FE3C01] font-medium underline underline-offset-2">
                      browse files
                    </span>
                  </p>
                </div>

                {(typeHint || maxFileSize) && (
                  <p className="text-[11px] text-neutral-400 bg-muted rounded-full px-3 py-1">
                    {[typeHint, `Max ${fileSizeMB.toFixed(0)}MB`].filter(Boolean).join(" · ")}
                  </p>
                )}

                {state === "error" && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 w-full justify-center">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="text-neutral-300 hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleUpload}
                  className="w-full bg-[#FE3C01] hover:bg-[#E83501] h-10 rounded-xl font-medium"
                >
                  Upload File
                </Button>
              </div>
            )}

            {/* ── Uploading ── */}
            {state === "uploading" && (
              <div className="space-y-4 py-1">
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
                        ? `Retrying… (attempt ${attemptNum} of ${MAX_ATTEMPTS}) — ${progress}%`
                        : `Uploading… ${progress}%`}
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
                  <p className="text-sm font-semibold text-foreground">Upload complete</p>
                  <p className="text-xs text-neutral-400">{selectedFile?.name}</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
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
