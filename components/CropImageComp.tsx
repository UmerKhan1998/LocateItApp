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
  // crop that was actually applied to the mobile preview
  const [appliedCrop, setAppliedCrop] = useState<Selection | null>(null);

  const [dragging, setDragging] = useState(false);
  const [savePayload, setSavePayload] = useState<any>(null);

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
    setAppliedCrop(null);
    setCroppedUrl(null);
    setSavePayload(null);
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
    let sel: Selection;
    if (!selection.active) {
      sel = {
        x: 0,
        y: 0,
        width: displayW,
        height: displayH,
        active: true,
      };
    } else {
      sel = selection;
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
    setAppliedCrop(sel);
    setSavePayload(null); // reset old payload
  };

  // ---- SAVE: create payload ----
  const handleSave = () => {
    if (!croppedUrl || !appliedCrop) return;

    const payload = {
      direction,
      originalImage: imageUrl,
      croppedImage: croppedUrl,
      cropArea: {
        x: appliedCrop.x,
        y: appliedCrop.y,
        width: appliedCrop.width,
        height: appliedCrop.height,
      },
    };

    setSavePayload(payload);
    console.log("SAVE PAYLOAD:", payload);
  };

  // ---- Direction placement inside mobile ----
  const mobileImagePlacement: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      maxWidth: "70%",
      maxHeight: "70%",
      position: "absolute",
    };
    switch (direction) {
      case "top":
        return { ...base, top: 16, left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return {
          ...base,
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "right":
        return {
          ...base,
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
        };
      case "left":
      default:
        return {
          ...base,
          left: 16,
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
          direction. 4. Click &quot;Show in Mobile&quot;. 5. Click &quot;Save&quot;.
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

        <button
          style={{
            ...styles.button,
            marginTop: 8,
            background: "#10B981",
            ...(croppedUrl ? {} : styles.buttonDisabled),
          }}
          disabled={!croppedUrl}
          onClick={handleSave}
        >
          Save
        </button>

        {/* hidden canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {savePayload && (
          <pre style={styles.jsonBox}>
            {JSON.stringify(savePayload, null, 2)}
          </pre>
        )}
      </div>

      {/* RIGHT: GAME-STYLE MOBILE MOCKUP */}
      <div style={styles.rightPanel}>
        <div style={styles.gameFrame}>
          {/* Header row: back + coins/time */}
          <div style={styles.gameHeaderRow}>
            <div style={styles.backButton}>&lt;</div>
            <div style={styles.headerBadges}>
              <div style={styles.badgeCoin}>5</div>
              <div style={styles.badgeTime}>0:15</div>
            </div>
          </div>

          {/* Title */}
          <div style={styles.gameTitle}>COMPLETE THE SHAPE</div>

          {/* Progress and level */}
          <div style={styles.progressRow}>
            <div style={styles.progressBarOuter}>
              <div style={styles.progressBarInner} />
            </div>
            <div style={styles.levelText}>1 OF 4</div>
          </div>

          {/* Toolbar icons */}
          <div style={styles.toolbarRow}>
            <div style={{ ...styles.toolButton, background: "#16a34a" }}>✏️</div>
            <div style={{ ...styles.toolButton, background: "#0ea5e9" }}>⇄</div>
            <div style={{ ...styles.toolButton, background: "#ef4444" }}>🗑</div>
            <div style={{ ...styles.toolButton, background: "#f59e0b" }}>↺</div>
            <div style={{ ...styles.toolButton, background: "#22c55e" }}>📷</div>
          </div>

          {/* Drawing card */}
          <div style={styles.boardOuter}>
            <div style={styles.boardInner}>
              {/* base area where shape / drawing goes */}
              <div style={styles.drawingArea}>
                {/* existing base shape text removed; just a clean white board */}
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

          {/* Bottom navigation arrows */}
          <div style={styles.bottomNavRow}>
            <div style={styles.navButton}>
              <span style={styles.navArrow}>&lt;</span>
            </div>
            <div style={styles.navButton}>
              <span style={styles.navArrow}>&gt;</span>
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
    color: "#FFFFFF",
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
  jsonBox: {
    background: "#111827",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 11,
    color: "#d1d5db",
    maxHeight: 200,
    overflowY: "auto",
    border: "1px solid #374151",
  },

  // ---- Game-style mobile UI ----
  gameFrame: {
    width: 320,
    height: 640,
    borderRadius: 24,
    background:
      "linear-gradient(to bottom, #8ecafc 0%, #8ecafc 40%, #52b788 80%, #3f612d 100%)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
    padding: 12,
    boxSizing: "border-box",
    position: "relative",
  },
  gameHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: "999px",
    background: "#7c3aed",
    border: "3px solid #fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: 700,
    cursor: "default",
  },
  headerBadges: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  badgeCoin: {
    padding: "2px 10px",
    borderRadius: 999,
    background: "#f97316",
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  badgeTime: {
    padding: "2px 10px",
    borderRadius: 999,
    background: "#ef4444",
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  gameTitle: {
    textAlign: "center",
    fontWeight: 800,
    color: "#4c1d95",
    letterSpacing: 1,
    fontSize: 14,
    textTransform: "uppercase",
    marginBottom: 8,
    textShadow: "0 1px 0 #FFFFFF",
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "0 4px",
  },
  progressBarOuter: {
    flex: 1,
    height: 16,
    borderRadius: 999,
    background: "#FFFFFF",
    overflow: "hidden",
    marginRight: 8,
    border: "2px solid #e5e7eb",
  },
  progressBarInner: {
    width: "0%",
    height: "100%",
    background: "#22c55e",
    borderRadius: 999,
  },
  levelText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  toolbarRow: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    color: "white",
  },
  boardOuter: {
    flex: 1,
    background: "#4c1d95",
    borderRadius: 24,
    padding: 8,
    boxSizing: "border-box",
    marginTop: 4,
    marginBottom: 16,
  },
  boardInner: {
    background: "#4c1d95",
    borderRadius: 16,
    padding: 4,
    boxSizing: "border-box",
    height: 420,
  },
  drawingArea: {
    background: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  bottomNavRow: {
    position: "absolute",
    bottom: 18,
    left: 0,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    padding: "0 36px",
    boxSizing: "border-box",
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    background: "#7c3aed",
    border: "4px solid #fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 5px 12px rgba(0,0,0,0.6)",
  },
  navArrow: {
    fontSize: 24,
    color: "white",
    fontWeight: 800,
  },
};
