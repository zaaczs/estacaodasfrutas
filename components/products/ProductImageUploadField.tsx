"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildProductPlaceholderDataUrl,
  getProductDisplayImageUrl,
} from "@/lib/productImage";

type Props = {
  imageUrl: string;
  productName: string;
  onChange: (value: string) => void;
};

const PREVIEW_SIZE = 320;
const OUTPUT_SIZE = 800;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
    img.src = dataUrl;
  });
}

function getScaleToCover(image: HTMLImageElement, size: number) {
  return Math.max(size / image.width, size / image.height);
}

function clampOffsets(
  image: HTMLImageElement,
  size: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const scale = getScaleToCover(image, size) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const maxX = Math.max(0, (drawWidth - size) / 2);
  const maxY = Math.max(0, (drawHeight - size) / 2);
  return {
    x: clamp(offsetX, -maxX, maxX),
    y: clamp(offsetY, -maxY, maxY),
  };
}

function drawImageOnSquareCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  size: number,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  const scale = getScaleToCover(image, size) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = (size - drawWidth) / 2 + offsetX;
  const drawY = (size - drawHeight) / 2 + offsetY;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

export function ProductImageUploadField({ imageUrl, productName, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [draggingPreview, setDraggingPreview] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/uploads/product-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha no upload");
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro no upload da imagem");
    } finally {
      setUploading(false);
    }
  }

  function commitOffset(x: number, y: number) {
    offsetRef.current = { x, y };
    setOffsetX(x);
    setOffsetY(y);
  }

  function resetCropState() {
    setCropOpen(false);
    setZoom(1);
    commitOffset(0, 0);
    draggingRef.current = false;
    setDraggingPreview(false);
    dragStartRef.current = null;
    setSourceImage(null);
    setSourceFileName("");
  }

  async function openCropper(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem válido.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const image = await dataUrlToImage(dataUrl);
      setSourceImage(image);
      setSourceFileName(file.name);
      setZoom(1);
      commitOffset(0, 0);
      setCropOpen(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao preparar imagem.");
    }
  }

  async function handleApplyCrop() {
    if (!sourceImage) return;
    setProcessingImage(true);
    try {
      const canvas = document.createElement("canvas");
      const scaleFactor = OUTPUT_SIZE / PREVIEW_SIZE;
      const clamped = clampOffsets(
        sourceImage,
        PREVIEW_SIZE,
        zoom,
        offsetRef.current.x,
        offsetRef.current.y
      );

      drawImageOnSquareCanvas(
        canvas,
        sourceImage,
        OUTPUT_SIZE,
        zoom,
        clamped.x * scaleFactor,
        clamped.y * scaleFactor
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.92);
      });
      if (!blob) throw new Error("Não foi possível processar a imagem.");

      const cleanName = sourceFileName.replace(/\.[^.]+$/, "") || "produto";
      const processedFile = new File([blob], `${cleanName}-800x800.webp`, {
        type: "image/webp",
      });

      await uploadFile(processedFile);
      resetCropState();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao ajustar a imagem.");
    } finally {
      setProcessingImage(false);
    }
  }

  function onPickFile() {
    inputRef.current?.click();
  }

  useEffect(() => {
    if (!sourceImage || !previewCanvasRef.current) return;
    const clamped = clampOffsets(sourceImage, PREVIEW_SIZE, zoom, offsetX, offsetY);
    if (clamped.x !== offsetX || clamped.y !== offsetY) {
      offsetRef.current = { x: clamped.x, y: clamped.y };
      if (clamped.x !== offsetX) setOffsetX(clamped.x);
      if (clamped.y !== offsetY) setOffsetY(clamped.y);
    }
    drawImageOnSquareCanvas(
      previewCanvasRef.current,
      sourceImage,
      PREVIEW_SIZE,
      zoom,
      clamped.x,
      clamped.y
    );
  }, [sourceImage, zoom, offsetX, offsetY]);

  return (
    <div className="col-span-full space-y-2">
      <Label>Imagem do produto</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openCropper(file);
          e.currentTarget.value = "";
        }}
      />

      <div
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging ? "border-[#2e7d32] bg-green-50" : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void openCropper(file);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-md bg-white border">
            <img
              src={getProductDisplayImageUrl(imageUrl || null, productName || "Produto")}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = buildProductPlaceholderDataUrl(
                  productName || "Produto",
                  200,
                  200
                );
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">
              Arraste uma imagem aqui ou escolha do computador
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, WEBP ou GIF (máx. 5MB)</p>
            <p className="text-xs text-gray-500">Recorte recomendado: quadrado 800x800</p>
            {imageUrl && (
              <p className="mt-1 truncate text-xs text-gray-500">{imageUrl}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Enviando..." : "Selecionar imagem"}
          </Button>
          {imageUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )}
        </div>
      </div>

      <Dialog open={cropOpen} onOpenChange={(open) => (!open ? resetCropState() : setCropOpen(open))}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Ajustar imagem do produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Arraste a imagem para posicionar e use o zoom para recortar. A imagem final
              será enviada em 800x800.
            </p>

            <div
              ref={previewFrameRef}
              className="mx-auto aspect-square w-full max-w-[320px] touch-none overflow-hidden rounded-md border bg-muted"
              onPointerDown={(e) => {
                if (!sourceImage) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                draggingRef.current = true;
                setDraggingPreview(true);
                dragStartRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current || !sourceImage || !dragStartRef.current) return;
                const displayed = previewFrameRef.current?.getBoundingClientRect().width || PREVIEW_SIZE;
                const scale = PREVIEW_SIZE / displayed;
                const dx = (e.clientX - dragStartRef.current.x) * scale;
                const dy = (e.clientY - dragStartRef.current.y) * scale;
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                const next = clampOffsets(
                  sourceImage,
                  PREVIEW_SIZE,
                  zoom,
                  offsetRef.current.x + dx,
                  offsetRef.current.y + dy
                );
                commitOffset(next.x, next.y);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
                setDraggingPreview(false);
                dragStartRef.current = null;
              }}
              onPointerCancel={() => {
                draggingRef.current = false;
                setDraggingPreview(false);
                dragStartRef.current = null;
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className={`h-full w-full ${draggingPreview ? "cursor-grabbing" : "cursor-grab"}`}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cropZoom">Zoom</Label>
              <input
                id="cropZoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetCropState}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setZoom(1);
                commitOffset(0, 0);
              }}
            >
              Resetar ajuste
            </Button>
            <Button type="button" onClick={handleApplyCrop} disabled={processingImage || uploading}>
              {processingImage || uploading ? "Processando..." : "Aplicar e enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
