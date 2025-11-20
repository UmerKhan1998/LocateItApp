import React, { useRef, useState } from "react";

type Direction = "top" | "right" | "bottom" | "left";

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
};

const MobileShapePanel: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("left");
  const [selection, setSelection] = useState<Selection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    active: false,
  });

  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // ---- Upload ----
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setSelection({ x: 0, y: 0, width: 0, height: 0, active: false });
    setCroppedUrl(null);
  };

  // ---- Crop selection helpers ----
  const getRelativePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    const pos = getRelativePos(e);
    dragStartRef.current = pos;
    setDragging(true);
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0, active: false });
  };

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
      active: width > 5 && height > 5,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  // ---- Submit: crop & show inside phone ----
  const handleApplyToMobile = () => {
    if (!imgRef.current || !canvasRef.current || !imageUrl) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    if (!displayW || !displayH) return;

    // if no active selection, use whole image
    let sel = selection;
    if (!selection.active) {
      sel = { x: 0, y: 0, width: displayW, height: displayH, active: true };
    }

    const scaleX = img.naturalWidth / displayW;
    const scaleY = img.naturalHeight / displayH;

    const sx = sel.x * scaleX;
    const sy = sel.y * scaleY;
    const sw = sel.width * scaleX;
    const sh = sel.height * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataUrl = canvas.toDataURL("image/png");
    setCroppedUrl(dataUrl);
  };

  // ---- Direction CSS class ----
  const mobileImagePlacement: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      maxWidth: "70%",
      maxHeight: "70%",
      position: "absolute",
    };
    switch (direction) {
      case "top":
        return { ...base, top: 12, left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return {
          ...base,
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "right":
        return {
          ...base,
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
        };
      case "left":
      default:
        return {
          ...base,
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
        };
    }
  })();

  const canApply = !!imageUrl;

  return (
    <div style={styles.page}>
      {/* LEFT PANEL */}
      <div style={styles.leftPanel}>
        <h2 style={{ marginBottom: 8 }}>Panel</h2>

        <label style={styles.label}>
          Upload Image
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>

        <div style={{ marginTop: 12 }}>
          <div style={styles.label}>Direction</div>
          <div style={styles.directionRow}>
            {(["top", "right", "bottom", "left"] as Direction[]).map((d) => (
              <label key={d} style={styles.radioLabel}>
                <input
                  type="radio"
                  value={d}
                  checked={direction === d}
                  onChange={() => setDirection(d)}
                />
                {d.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <p style={styles.helpText}>
          1. Upload image. 2. Drag on the image to crop (optional). 3. Choose
          direction. 4. Click &quot;Show in Mobile&quot;.
        </p>

        <div
          ref={containerRef}
          style={styles.cropBox}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageUrl ? (
            <>
              <img
                ref={imgRef}
                src={imageUrl}
                alt="to crop"
                style={styles.cropImage}
                draggable={false}
              />
              {selection.active && (
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
            <div style={styles.cropPlaceholder}>
              Upload an image to start cropping
            </div>
          )}
        </div>

        <button
          style={{
            ...styles.button,
            ...(canApply ? {} : styles.buttonDisabled),
            marginTop: 12,
          }}
          disabled={!canApply}
          onClick={handleApplyToMobile}
        >
          Show in Mobile
        </button>

        {/* hidden canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* RIGHT: MOBILE MOCKUP */}
      <div style={styles.rightPanel}>
        <div style={styles.mobileShell}>
          <div style={styles.mobileHeader}>Mirror The Shape</div>
          <div style={styles.mobileInner}>
            <div style={styles.mobileTopBar}>
              <span>COMPLETE THE SHAPE</span>
            </div>
            <div style={styles.mobileScreen}>
              {/* You could draw your base shape here as SVG or image */}
              <div style={styles.baseShapePlaceholder}>Base Shape</div>

              {croppedUrl && (
                <img
                  src={croppedUrl}
                  alt="cropped"
                  style={mobileImagePlacement}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileShapePanel;

// --------- styles ----------
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    gap: 24,
    padding: 20,
    background: "#111827",
    minHeight: "100vh",
    boxSizing: "border-box",
    color: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  leftPanel: {
    flex: 1,
    background: "#1f2937",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    display: "block",
  },
  directionRow: {
    display: "flex",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  radioLabel: {
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 10,
    marginBottom: 8,
  },
  cropBox: {
    marginTop: 8,
    borderRadius: 12,
    border: "1px dashed #4b5563",
    background: "#030712",
    minHeight: 260,
    position: "relative",
    overflow: "hidden",
    cursor: "crosshair",
  },
  cropImage: {
    maxWidth: "100%",
    display: "block",
    userSelect: "none",
  },
  cropPlaceholder: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    paddingTop: 80,
  },
  selectionBox: {
    position: "absolute",
    border: "2px dashed #38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    pointerEvents: "none",
  },
  button: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: 13,
    cursor: "pointer",
  },
  buttonDisabled: {
    background: "#4b5563",
    cursor: "not-allowed",
  },

  // mobile mock
  mobileShell: {
    width: 280,
    height: 540,
    borderRadius: 32,
    background: "#111827",
    padding: 10,
    boxShadow: "0 12px 30px rgba(0,0,0,0.7)",
    border: "3px solid #4b5563",
    boxSizing: "border-box",
  },
  mobileHeader: {
    textAlign: "center",
    color: "#e5e7eb",
    fontSize: 12,
    marginBottom: 8,
  },
  mobileInner: {
    flex: 1,
    background: "linear-gradient(#93c5fd, #1d4ed8)",
    borderRadius: 24,
    padding: 12,
    boxSizing: "border-box",
  },
  mobileTopBar: {
    background: "#4c1d95",
    color: "white",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 8,
  },
  mobileScreen: {
    marginTop: 6,
    background: "#3b0764",
    borderRadius: 24,
    padding: 10,
    boxSizing: "border-box",
    height: 420,
    position: "relative",
  },
  baseShapePlaceholder: {
    background: "white",
    borderRadius: 16,
    width: "100%",
    height: "100%",
    fontSize: 11,
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
