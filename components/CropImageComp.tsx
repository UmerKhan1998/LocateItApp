import React, { useRef, useState } from "react";

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
};

const ImageCropper: React.FC = () => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isActive: false,
  });
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // 1) Upload image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageURL(url);
    setSelection({ x: 0, y: 0, width: 0, height: 0, isActive: false });
  };

  // Helpers to convert mouse coords to container coords
  const getRelativePosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // 2) Start crop drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageURL) return;

    const { x, y } = getRelativePosition(e);
    dragStartRef.current = { x, y };
    setIsDragging(true);
    setSelection({
      x,
      y,
      width: 0,
      height: 0,
      isActive: false,
    });
  };

  // 3) Update crop rect while dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const { x: startX, y: startY } = dragStartRef.current;
    const { x: currentX, y: currentY } = getRelativePosition(e);

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    setSelection({
      x: left,
      y: top,
      width,
      height,
      isActive: width > 5 && height > 5, // ignore tiny clicks
    });
  };

  // 4) End drag
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // 5) Crop and download PNG
  const handleDownload = () => {
    if (!imgRef.current || !canvasRef.current) return;
    if (!selection.isActive) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Convert from displayed coords -> natural image coords
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

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropped-image.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const canDownload = !!imageURL && selection.isActive;

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Image Upload, Crop & Save as PNG</h2>

      <div style={styles.controls}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <button
          type="button"
          style={{
            ...styles.button,
            ...(canDownload ? {} : styles.buttonDisabled),
          }}
          disabled={!canDownload}
          onClick={handleDownload}
        >
          Download PNG
        </button>
      </div>

      <p style={styles.hint}>Upload an image, then click and drag to select an area.</p>

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

      {/* Hidden canvas used for the crop */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ImageCropper;

// -------- styles ----------
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 800,
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
};
