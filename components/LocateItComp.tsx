"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Point = {
  id: string;
  row: number; // 0..11
  col: number; // 0..11
  label?: string;
};

const GRID = 12;

export default function LocateItUploader() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [points, setPoints] = useState<Point[]>([]);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string>("");

  // Keep container size responsive
  useEffect(() => {
    const update = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Compute displayed aspect ratio to reserve space even before image loads
  const aspect = useMemo(() => {
    if (!imgNatural) return 1; // square until image loads
    return imgNatural.w / imgNatural.h;
  }, [imgNatural]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImageSrc(url);
    setPoints([]);
  };

  const imgOnLoad = () => {
    if (!imgRef.current) return;
    setImgNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    // ensure container size recalculates
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    }
  };

  // Map click (clientX/Y) to grid cell (row/col)
  const toCellFromClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return null;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    // Account for object-contain letterboxing (image may not fill one dimension)
    let drawW = rect.width;
    let drawH = rect.height;

    if (imgNatural) {
      const containerAR = rect.width / rect.height;
      const imageAR = imgNatural.w / imgNatural.h;
      if (imageAR > containerAR) {
        // image fills width, letterbox top/bottom
        drawW = rect.width;
        drawH = rect.width / imageAR;
      } else {
        // image fills height, letterbox left/right
        drawH = rect.height;
        drawW = rect.height * imageAR;
      }
    }

    const offsetX = (rect.width - drawW) / 2;
    const offsetY = (rect.height - drawH) / 2;

    // If clicked outside the drawn image, ignore
    if (x < offsetX || x > offsetX + drawW || y < offsetY || y > offsetY + drawH) {
      return null;
    }

    const nx = (x - offsetX) / drawW; // 0..1
    const ny = (y - offsetY) / drawH; // 0..1

    const col = Math.min(GRID - 1, Math.max(0, Math.floor(nx * GRID)));
    const row = Math.min(GRID - 1, Math.max(0, Math.floor(ny * GRID)));
    return { row, col };
  };

  const togglePoint = (row: number, col: number, label?: string) => {
    setPoints((prev) => {
      const idx = prev.findIndex((p) => p.row === row && p.col === col);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, { id: `${row}-${col}`, row, col, label: label?.trim() ? label : undefined }];
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const cell = toCellFromClick(e);
    if (!cell) return;
    togglePoint(cell.row, cell.col, pendingLabel);
    setPendingLabel("");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cell = toCellFromClick(e);
    setHoverCell(cell);
  };

  const markerStylePct = (row: number, col: number) => {
    const left = ((col + 0.5) / GRID) * 100;
    const top = ((row + 0.5) / GRID) * 100;
    return { left: `${left}%`, top: `${top}%` };
    // translates handled via CSS
  };

  const exportPoints = () => {
    const blob = new Blob([JSON.stringify(points, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "locate-it-points.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => setPoints([]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center gap-6 p-4">
      <h1 className="text-3xl font-bold">Locate It — 12×12 Grid on Uploaded Image</h1>

      {/* Controls */}
      <div className="w-full max-w-[900px] flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">Upload image</label>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="block w-full border rounded p-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">Point label (optional)</label>
          <input
            value={pendingLabel}
            onChange={(e) => setPendingLabel(e.target.value)}
            placeholder="e.g., Target A"
            className="w-full border rounded p-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPoints}
            className="px-3 py-2 rounded bg-black text-white border"
            disabled={points.length === 0}
          >
            Export JSON
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-2 rounded border"
            disabled={points.length === 0}
          >
            Clear points
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={wrapRef}
        className="relative w-full max-w-[900px] border rounded-lg overflow-hidden shadow"
        style={{
          // Reserve vertical space using aspect ratio; falls back to square before image loads
          aspectRatio: `${aspect} / 1`,
          background: "#f8f8f8",
          cursor: imageSrc ? "crosshair" : "default",
        }}
        onClick={imageSrc ? handleCanvasClick : undefined}
        onMouseMove={imageSrc ? handleMouseMove : undefined}
        onMouseLeave={() => setHoverCell(null)}
      >
        {/* Image */}
        {imageSrc && (
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Uploaded"
            onLoad={imgOnLoad}
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        )}

        {/* 12×12 grid overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* grid lines */}
          {[...Array(GRID + 1)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 h-full border-l border-neutral-300"
              style={{ left: `${(i / GRID) * 100}%` }}
            />
          ))}
          {[...Array(GRID + 1)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 w-full border-t border-neutral-300"
              style={{ top: `${(i / GRID) * 100}%` }}
            />
          ))}
        </div>

        {/* Hover cell highlight */}
        <AnimatePresence>
          {hoverCell && (
            <motion.div
              key={`hover-${hoverCell.row}-${hoverCell.col}`}
              className="absolute bg-black/5"
              style={{
                left: `${(hoverCell.col / GRID) * 100}%`,
                top: `${(hoverCell.row / GRID) * 100}%`,
                width: `${(1 / GRID) * 100}%`,
                height: `${(1 / GRID) * 100}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        {/* Markers */}
        {points.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              ...markerStylePct(p.row, p.col),
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow" />
          </div>
        ))}

        {/* Marker labels */}
        {points.map((p) =>
          p.label ? (
            <div
              key={`label-${p.id}`}
              className="absolute text-xs bg-white/90 backdrop-blur px-2 py-0.5 rounded border shadow"
              style={{
                left: `${((p.col + 0.5) / GRID) * 100}%`,
                top: `${((p.row + 0.5) / GRID) * 100 - 4}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {p.label}
            </div>
          ) : null
        )}

        {/* Cell coordinates tooltip on hover */}
        <AnimatePresence>
          {hoverCell && (
            <motion.div
              key={`tip-${hoverCell.row}-${hoverCell.col}`}
              className="absolute text-xs bg-white px-2 py-1 rounded shadow border"
              style={{
                left: `${((hoverCell.col + 0.5) / GRID) * 100}%`,
                top: `${((hoverCell.row + 0.5) / GRID) * 100 - 4}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              Row {hoverCell.row + 1}, Col {hoverCell.col + 1}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Points list */}
      <div className="w-full max-w-[900px]">
        <h2 className="text-lg font-semibold mb-2">Selected Points ({points.length})</h2>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">Click on the grid to add points. Click again on the same cell to remove.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-2 border-b">#</th>
                  <th className="text-left p-2 border-b">Row</th>
                  <th className="text-left p-2 border-b">Col</th>
                  <th className="text-left p-2 border-b">Label</th>
                  <th className="text-left p-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .slice()
                  .sort((a, b) => a.row - b.row || a.col - b.col)
                  .map((p, i) => (
                    <tr key={`row-${p.id}`} className="odd:bg-white even:bg-neutral-50/40">
                      <td className="p-2 border-b">{i + 1}</td>
                      <td className="p-2 border-b">{p.row + 1}</td>
                      <td className="p-2 border-b">{p.col + 1}</td>
                      <td className="p-2 border-b">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={p.label ?? ""}
                          onChange={(e) =>
                            setPoints((prev) =>
                              prev.map((q) => (q.id === p.id ? { ...q, label: e.target.value } : q))
                            )
                          }
                          placeholder="(optional)"
                        />
                      </td>
                      <td className="p-2 border-b">
                        <button
                          className="px-2 py-1 text-red-600 border rounded"
                          onClick={() =>
                            setPoints((prev) => prev.filter((q) => !(q.row === p.row && q.col === p.col)))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-neutral-500 mt-2">
        Tip: Click a grid cell to add/remove a point. Use the “Point label” field before clicking to attach a label.
      </div>
    </div>
  );
}
