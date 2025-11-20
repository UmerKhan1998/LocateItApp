import React, { useRef, useState } from "react";

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
};

const ImageCropperSvgExport: React.FC = () => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isActive: false,
  });
  const [dragging, setDragging] = useState(false);
  const [svgCode, setSvgCode] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Upload image
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageURL(URL.createObjectURL(file));
    setSelection({ x: 0, y: 0, width: 0, height: 0, isActive: false });
    setSvgCode("");
  };

  // Convert mouse coords → container coords
  const getRelativePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Start drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageURL) return;

    const pos = getRelativePos(e);
    dragStartRef.current = pos;
    setDragging(true);

    setSelection({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      isActive: false,
    });
  };

  // Dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStartRef.current) return;

    const start = dragStartRef.current;
    const pos = getRelativePos(e);

    const left = Math.min(start.x, pos.x);
    const top = Math.min(start.y, pos.y);
    const width = Math.abs(pos.x - start.x);
    const height = Math.abs(pos.y - start.y);

    setSelection({
      x: left,
      y: top,
      width,
      height,
      isActive: width > 5 && height > 5,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  // Optional: remove white background from the cropped PNG
  const removeWhiteBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Treat near-white pixels as background
      if (r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0; // alpha = 0 (transparent)
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Create SVG from cropped canvas and download
  const handleDownloadSvg = () => {
    if (!imgRef.current || !canvasRef.current || !selection.isActive) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    if (!displayWidth || !displayHeight) return;

    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;

    const sx = selection.x * scaleX;
    const sy = selection.y * scaleY;
    const sw = selection.width * scaleX;
    const sh = selection.height * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Make background transparent if it's white-ish
    removeWhiteBackground(ctx, sw, sh);

    const pngDataUrl = canvas.toDataURL("image/png"); // data:image/png;base64,...

    // Build SVG string that embeds the PNG as <image>
    const svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">`,
      `  <!-- Cropped image embedded as PNG -->`,
      `  <image href="${pngDataUrl}" width="${sw}" height="${sh}" />`,
      `</svg>`,
    ].join("\n");

    setSvgCode(svg);

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "cropped-image.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  const canDownload = !!imageURL && selection.isActive;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Crop Image → Export as SVG (with embedded PNG)</h2>

      <div style={styles.controls}>
        <input type="file" accept="image/*" onChange={handleUpload} />

        <button
          type="button"
          style={{
            ...styles.button,
            ...(canDownload ? {} : styles.buttonDisabled),
          }}
          disabled={!canDownload}
          onClick={handleDownloadSvg}
        >
          Download SVG
        </button>
      </div>

      <p style={styles.hint}>
        Upload an image, then click and drag on the image to choose the crop area.
      </p>

      <div
        ref={containerRef}
        style={styles.imageContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imageURL ? (
          <>
            <img
              ref={imgRef}
              src={imageURL}
              alt="uploaded"
              style={styles.image}
              draggable={false}
            />
            {selection.isActive && (
              <div
                style={{
                  ...styles.selectionBox,
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
              />
            )}
          </>
        ) : (
          <div style={styles.placeholder}>No image loaded yet.</div>
        )}
      </div>

      {/* Hidden canvas used to produce the PNG inside the SVG */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Developer SVG Code Preview */}
      <div style={styles.codeBlockWrapper}>
        <h3 style={styles.codeTitle}>Developer SVG code</h3>
        <textarea
          style={styles.textarea}
          readOnly
          value={svgCode || "// SVG code will appear here after you crop & download."}
        />
      </div>
    </div>
  );
};

export default ImageCropperSvgExport;

// -------- Styles --------
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 900,
    margin: "20px auto",
    padding: 16,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  title: {
    marginBottom: 12,
  },
  controls: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: "#555",
    marginBottom: 10,
  },
  imageContainer: {
    position: "relative",
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 8,
    minHeight: 300,
    background: "#f7f7f7",
    overflow: "hidden",
    cursor: "crosshair",
  },
  image: {
    maxWidth: "100%",
    height: "auto",
    display: "block",
    userSelect: "none",
  },
  placeholder: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingTop: 120,
  },
  selectionBox: {
    position: "absolute",
    border: "2px dashed #0ea5e9",
    backgroundColor: "rgba(14, 165, 233, 0.25)",
    pointerEvents: "none",
    boxSizing: "border-box",
  },
  button: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
  },
  buttonDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
  codeBlockWrapper: {
    marginTop: 20,
  },
  codeTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  textarea: {
    width: "100%",
    minHeight: 180,
    fontFamily: "monospace",
    fontSize: 12,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ddd",
    resize: "vertical",
    background: "#f9fafb",
  },
};
