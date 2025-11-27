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

  // ---- Apply crop and show in mobile (FIXED) ----
  const handleApplyToMobile = () => {
    if (!imageUrl) return;

    // If for any reason we cannot access image/canvas, just show the full image in mobile
    if (!imgRef.current || !canvasRef.current) {
      setCroppedUrl(imageUrl);
      setAppliedCrop({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        active: false,
      });
      return;
    }

    try {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // fallback: just show original
        setCroppedUrl(imageUrl);
        return;
      }

      const rect = img.getBoundingClientRect();
      const displayW = rect.width || img.clientWidth || img.naturalWidth;
      const displayH = rect.height || img.clientHeight || img.naturalHeight;

      if (!displayW || !displayH) {
        setCroppedUrl(imageUrl);
        return;
      }

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

      // if crop is too small, just show original
      if (sw <= 0 || sh <= 0) {
        setCroppedUrl(imageUrl);
        setAppliedCrop(sel);
        return;
      }

      canvas.width = sw;
      canvas.height = sh;

      ctx.clearRect(0, 0, sw, sh);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const dataUrl = canvas.toDataURL("image/png");
      setCroppedUrl(dataUrl);
      setAppliedCrop(sel);
      setSavePayload(null);
    } catch (err) {
      console.error("Error applying crop:", err);
      // last fallback – still show something
      setCroppedUrl(imageUrl);
    }
  };

  // ---- SAVE payload ----
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

  // ---- Direction placement inside mobile drawing board ----
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

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {savePayload && (
          <pre style={styles.jsonBox}>
            {JSON.stringify(savePayload, null, 2)}
          </pre>
        )}
      </div>

      {/* RIGHT PANEL – mobile preview (same UI as before) */}
      <div style={styles.rightPanel}>
        <div style={styles.deviceShell}>
          <div style={styles.deviceScreenBg}>
            <div style={styles.gradientCard}>
              <div style={styles.headerRow}>
                <div style={styles.backChip}>{"<"}</div>
                <div style={styles.headerTitle}>COMPLETE THE SHAPE</div>
              </div>

              <div style={styles.progressRow}>
                <div style={styles.progressBarOuter}>
                  <div style={{ ...styles.progressBarInner, width: "0%" }}>
                    <span style={styles.progressText}>0%</span>
                  </div>
                </div>
                <div style={styles.progressCount}>1 of 4</div>
              </div>

              <div style={styles.toolRow}>
                <div style={{ ...styles.toolIcon, background: "#16a34a" }}>✏️</div>
                <div style={{ ...styles.toolIcon, background: "#0ea5e9" }}>✒️</div>
                <div style={{ ...styles.toolIcon, background: "#ef4444" }}>🧹</div>
                <div style={{ ...styles.toolIcon, background: "#f59e0b" }}>↺</div>
              </div>

              <div style={styles.boardOuter}>
                <div style={styles.boardInner}>
                  <div style={styles.drawingBoard}>
                    {/* base shape could go here as an <img> */}

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

              <div style={styles.bottomNavRow}>
                <div style={styles.navBtn}>
                  <span style={styles.navArrow}>{"<"}</span>
                </div>
                <div style={styles.navBtn}>
                  <span style={styles.navArrow}>{">"}</span>
                </div>
              </div>
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

  // mobile preview styles
  deviceShell: {
    width: 320,
    height: 640,
    borderRadius: 30,
    background: "#000",
    padding: 8,
    boxSizing: "border-box",
    boxShadow: "0 18px 40px rgba(0,0,0,0.8)",
  },
  deviceScreenBg: {
    flex: 1,
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    background:
      "linear-gradient(to bottom, #8ecafc 0%, #8ecafc 40%, #52b788 80%, #3f612d 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    boxSizing: "border-box",
  },
  gradientCard: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    background: "linear-gradient(#3b0764, #a855f7)",
    padding: 12,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  backChip: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "3px solid #facc15",
    background: "#7c3aed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#facc15",
    fontWeight: 800,
    fontSize: 14,
    textShadow: "0 1px 1px rgba(0,0,0,0.4)",
  },
  progressRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 6,
    boxSizing: "border-box",
  },
  progressBarOuter: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    background: "#f9fafb",
    border: "2px solid #e5e7eb",
    height: 18,
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 20,
    background: "linear-gradient(90deg,#22c55e,#a3e635)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 6,
    boxSizing: "border-box",
  },
  progressText: {
    fontSize: 10,
    color: "#052e16",
    fontWeight: 700,
  },
  progressCount: {
    fontSize: 11,
    color: "#f9fafb",
    fontWeight: 700,
  },
  toolRow: {
    marginTop: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 3px 7px rgba(0,0,0,0.5)",
    fontSize: 18,
    color: "#fff",
  },
  boardOuter: {
    marginTop: 12,
    flex: 1,
    display: "flex",
  },
  boardInner: {
    flex: 1,
    background: "#3b0764",
    borderRadius: 20,
    padding: 10,
    boxSizing: "border-box",
  },
  drawingBoard: {
    flex: 1,
    borderRadius: 18,
    background: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  bottomNavRow: {
    marginTop: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    boxSizing: "border-box",
  },
  navBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    background: "#7c3aed",
    border: "4px solid #facc15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 5px 12px rgba(0,0,0,0.7)",
  },
  navArrow: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 800,
  },
};
