import React, { useRef, useState } from "react";

const ImageCropper: React.FC = () => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageURL, setImageURL] = useState<string | null>(null);
  const [selection, setSelection] = useState({
    startX: 0,
    startY: 0,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    dragging: false,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageURL(URL.createObjectURL(file));
    setSelection({ ...selection, width: 0, height: 0 });
  };

  const startDrag = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setSelection({
      ...selection,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      dragging: true,
      width: 0,
      height: 0,
    });
  };

  const onDrag = (e: React.MouseEvent) => {
    if (!selection.dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const left = Math.min(selection.startX, currentX);
    const top = Math.min(selection.startY, currentY);
    const width = Math.abs(currentX - selection.startX);
    const height = Math.abs(currentY - selection.startY);

    setSelection({
      ...selection,
      left,
      top,
      width,
      height,
    });
  };

  const endDrag = () => {
    if (!selection.dragging) return;
    setSelection({ ...selection, dragging: false });
  };

  const downloadPNG = () => {
    if (!imgRef.current || !canvasRef.current) return;
    if (selection.width < 5 || selection.height < 5) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // scaling ratios
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const sx = selection.left * scaleX;
    const sy = selection.top * scaleY;
    const sw = selection.width * scaleX;
    const sh = selection.height * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropped.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={styles.wrapper}>
      <h2>Image Upload, Crop & Save as PNG</h2>

      {/* Upload Button */}
      <input type="file" accept="image/*" onChange={handleImageUpload} />

      <div
        style={styles.imageBox}
        ref={containerRef}
        onMouseDown={startDrag}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
      >
        {imageURL && (
          <>
            <img
              ref={imgRef}
              src={imageURL}
              alt="uploaded"
              style={{ maxWidth: "100%", userSelect: "none" }}
              draggable={false}
            />

            {/* Selection Box */}
            {selection.width > 0 && selection.height > 0 && (
              <div
                style={{
                  ...styles.selectBox,
                  left: selection.left,
                  top: selection.top,
                  width: selection.width,
                  height: selection.height,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Download Button */}
      <button
        style={styles.button}
        disabled={selection.width === 0}
        onClick={downloadPNG}
      >
        Download PNG
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ImageCropper;

// ---- Inline Styles ----
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "600px",
    margin: "0 auto",
  },
  imageBox: {
    position: "relative",
    border: "2px solid #ddd",
    padding: "6px",
    borderRadius: "8px",
    background: "#f7f7f7",
    minHeight: "300px",
  },
  selectBox: {
    position: "absolute",
    border: "2px dashed #1ea7fd",
    background: "rgba(30, 167, 253, 0.2)",
    pointerEvents: "none",
  },
  button: {
    padding: "10px 18px",
    background: "#2563eb",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
};
