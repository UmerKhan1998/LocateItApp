import React, { useState } from "react";

const TARGET_SIZE = 300;

const ImageToSvg300: React.FC = () => {
  const [svgString, setSvgString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.).");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to 300x300 using canvas
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setError("Could not get canvas context.");
          return;
        }

        // "Cover" behavior (like CSS background-size: cover)
        const scale = Math.max(
          TARGET_SIZE / img.width,
          TARGET_SIZE / img.height
        );
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (TARGET_SIZE - drawWidth) / 2;
        const offsetY = (TARGET_SIZE - drawHeight) / 2;

        ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        const dataUrl = canvas.toDataURL("image/png");
        const svg = buildSvg(dataUrl);
        setSvgString(svg);
      };

      img.onerror = () => {
        setError("Could not load image.");
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      setError("Could not read file.");
    };

    reader.readAsDataURL(file);
  };

  const buildSvg = (imageDataUrl: string): string => {
    // Same format as your sample: 300x300 SVG, viewBox 0 0 300 300, fill="none"
    // but instead of paths, we just embed the resized image.
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">
  <image href="${imageDataUrl}" x="0" y="0" width="300" height="300" />
</svg>`;
  };

  const downloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "image-300x300.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>Convert Image → 300×300 SVG</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: 16 }}
      />

      {error && (
        <p style={{ color: "red", marginTop: 8 }}>
          {error}
        </p>
      )}

      {svgString && (
        <div style={{ marginTop: 24 }}>
          <h3>SVG Preview</h3>
          <div
            style={{
              border: "1px solid #ccc",
              width: TARGET_SIZE,
              height: TARGET_SIZE,
            }}
            // This renders the generated SVG
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          <h3 style={{ marginTop: 16 }}>SVG Code</h3>
          <textarea
            value={svgString}
            readOnly
            style={{
              width: "100%",
              height: 220,
              fontFamily: "monospace",
              fontSize: 12,
            }}
          />

          <button
            type="button"
            onClick={downloadSvg}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            Download SVG
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageToSvg300;
