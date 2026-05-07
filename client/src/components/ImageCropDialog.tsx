import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, Sun, Contrast, Droplets } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface ImageCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspect: number; // e.g. 1 for square logo, 3 for wide header
  title?: string;
  onComplete: (blob: Blob) => void;
  saving?: boolean;
}

interface Filters {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  blur: number;       // 0-10, default 0
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function getFilterStyle(filters: Filters): string {
  const parts: string[] = [];
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  filters: Filters,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Apply filters
  ctx.filter = getFilterStyle(filters);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas is empty'));
      },
      'image/jpeg',
      0.92,
    );
  });
}

// ═══════════════════════════════════════════════════════════════════
// Slider Row
// ═══════════════════════════════════════════════════════════════════

function FilterSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: typeof Sun;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <Label className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-gray-900 cursor-pointer"
      />
      <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export default function ImageCropDialog({
  open,
  onClose,
  imageSrc,
  aspect,
  title = "Edit Image",
  onComplete,
  saving = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [filters, setFilters] = useState<Filters>({ brightness: 100, contrast: 100, blur: 0 });

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels, filters);
    onComplete(blob);
  }, [croppedAreaPixels, filters, imageSrc, onComplete]);

  const resetFilters = () => {
    setFilters({ brightness: 100, contrast: 100, blur: 0 });
  };

  const updateFilter = (key: keyof Filters, value: number) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const filterStyle = getFilterStyle(filters);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full h-[340px] bg-black">
          <div
            style={{ position: 'absolute', inset: 0, filter: filterStyle !== 'none' ? filterStyle : undefined }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={true}
              style={{
                containerStyle: { width: '100%', height: '100%' },
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3 border-t border-border">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground w-16 flex-shrink-0">Zoom</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 accent-gray-900 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{zoom.toFixed(1)}x</span>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Filters</span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-muted-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
          <FilterSlider icon={Sun} label="Brightness" value={filters.brightness} min={20} max={200} step={5} onChange={(v) => updateFilter('brightness', v)} />
          <FilterSlider icon={Contrast} label="Contrast" value={filters.contrast} min={20} max={200} step={5} onChange={(v) => updateFilter('contrast', v)} />
          <FilterSlider icon={Droplets} label="Blur" value={filters.blur} min={0} max={10} step={0.5} onChange={(v) => updateFilter('blur', v)} />
        </div>

        <DialogFooter className="px-5 pb-5 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={saving || !croppedAreaPixels}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...</> : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
