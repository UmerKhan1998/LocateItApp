import React, { useRef, useState } from "react";

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
};

const ImageCropperRemoveBG: React.FC = () => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isActive: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Upload image
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageURL(URL.createObjectURL(file));
    setSelection({ x: 0, y: 0, width: 0, height: 0, isActive: false });
  };

  // Convert mouse coords → container coords
  const getPos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Start drag
  const handleDown = (e: React.MouseEvent) => {
    if (!imageURL) return;
    const pos = getPos(e);
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
  const handleMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStartRef.current) return;

    const start = dragStartRef.current;
    const current = getPos(e);

    const left = Math.min(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);

    setSelection({
      x: left,
      y: top,
      width,
      height,
      isActive: width > 5 && height > 5,
    });
  };

  const handleUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  // ⭐ Background removal (white → transparent)
  const removeWhiteBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Threshold for white/light backgrounds
      if (r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0; // alpha=0 (transparent)
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Download PNG
  const handleDownload = () => {
    if (!imgRef.current || !canvasRef.current || !selection.isActive) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const sx = selection.x * scaleX;
    const sy = selection.y * scaleY;
    const sw = selection.width * scaleX;
    const sh = selection.height * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // ⭐ Remove background
    removeWhiteBackground(ctx, sw, sh);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropped-transparent.png";
      a.click();
    });
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Crop + Remove Background + Save as PNG</h2>

      <input type="file" accept="image/*" onChange={handleUpload} />

      <button
        style={{
          ...styles.button,
          ...(selection.isActive ? {} : styles.disabled),
        }}
        disabled={!selection.isActive}
        onClick={handleDownload}
      >
        Download PNG (Background Removed)
      </button>

      <div
        ref={containerRef}
        style={styles.container}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
      >
        {imageURL ? (
          <>
            <img ref={imgRef} src={imageURL} style={styles.image} alt="" />

            {selection.isActive && (
              <div
                style={{
                  ...styles.selectBox,
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
              />
            )}
          </>
        ) : (
          <div style={styles.placeholder}>Upload an image to begin</div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ImageCropperRemoveBG;

// ------------------ STYLES ------------------
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "600px",
    margin: "20px auto",
    fontFamily: "sans-serif",
  },
  title: {
    marginBottom: "10px",
  },
  container: {
    marginTop: "10px",
    position: "relative",
    border: "1px solid #ccc",
    minHeight: "300px",
    background: "#f9f9f9",
  },
  image: {
    maxWidth: "100%",
    userSelect: "none",
  },
  selectBox: {
    position: "absolute",
    border: "2px dashed #00aaff",
    backgroundColor: "rgba(0, 170, 255, 0.2)",
    pointerEvents: "none",
  },
  button: {
    padding: "8px 16px",
    marginTop: "10px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  disabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
  placeholder: {
    padding: "120px 0",
    textAlign: "center",
    color: "#777",
  },
};
