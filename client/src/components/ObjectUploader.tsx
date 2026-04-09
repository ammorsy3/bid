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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const { url } = await onGetUploadParameters();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () =>
          xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)),
        );
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");
        xhr.send(selectedFile);
      });

      setProgress(100);
      setState("success");

      onComplete?.({
        successful: [{ uploadURL: url, name: selectedFile.name }],
        failed: [],
      });

      setTimeout(() => handleOpenChange(false), 1200);
    } catch {
      setErrorMsg("Upload failed. Please check your connection and try again.");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedFile(null);
    setProgress(0);
    setErrorMsg("");
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
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100">
            <DialogTitle className="text-base font-semibold text-neutral-900">
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
                    ? "border-[#E25E45] bg-[#E25E45]/5 scale-[0.99]"
                    : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80",
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    isDragOver ? "bg-[#E25E45]/10" : "bg-neutral-100",
                  )}
                >
                  <CloudUpload
                    className={cn(
                      "w-7 h-7 transition-colors",
                      isDragOver ? "text-[#E25E45]" : "text-neutral-400",
                    )}
                  />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-neutral-800">
                    Drop your file here
                  </p>
                  <p className="text-xs text-neutral-400">
                    or{" "}
                    <span className="text-[#E25E45] font-medium underline underline-offset-2">
                      browse files
                    </span>
                  </p>
                </div>

                {(typeHint || maxFileSize) && (
                  <p className="text-[11px] text-neutral-400 bg-neutral-100 rounded-full px-3 py-1">
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
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
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
                    className="text-neutral-300 hover:text-neutral-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleUpload}
                  className="w-full bg-[#E25E45] hover:bg-[#d04a32] h-10 rounded-xl font-medium"
                >
                  Upload File
                </Button>
              </div>
            )}

            {/* ── Uploading ── */}
            {state === "uploading" && (
              <div className="space-y-4 py-1">
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">Uploading… {progress}%</p>
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
                  <p className="text-sm font-semibold text-neutral-900">Upload complete</p>
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
