import React, { useState } from "react";

const TARGET_SIZE = 300;

const ImageToKaabaSvg: React.FC = () => {
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
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
        // Create canvas and resize to 300x300
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setError("Could not get canvas context.");
          return;
        }

        // Cover mode: scale image to fill 300x300 (like CSS background-size: cover)
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
        setResizedImageUrl(dataUrl);
        setSvgString(buildKaabaSvg(dataUrl));
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

  const buildKaabaSvg = (imageDataUrl: string): string => {
    // 300x300 SVG that uses your Kaaba paths, with the resized image as a background
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TARGET_SIZE}" height="${TARGET_SIZE}" viewBox="0 0 300 300" fill="none">
  <!-- Background image (resized to 300x300) -->
  <image href="${imageDataUrl}" x="0" y="0" width="300" height="300" />

  <!-- Base Kaaba Body -->
  <path id="kaaba-body" d="M50 100 L200 60 L250 100 L250 220 L50 260 L50 100" stroke="black" stroke-width="2" fill="#F0F0F0"/>

  <!-- Black Cloth (Kiswah) Front -->
  <path id="kiswah-front" d="M50 100 L200 60 L200 180 L50 220 L50 100" stroke="black" stroke-width="2" fill="#E0E0E0"/>

  <!-- Black Cloth (Kiswah) Side -->
  <path id="kiswah-side" d="M200 60 L250 100 L250 220 L200 180 L200 60" stroke="black" stroke-width="2" fill="#DADADA"/>

  <!-- Golden Band (Front) -->
  <path id="gold-band-front" d="M60 130 L190 95 L190 110 L60 145 L60 130" stroke="black" stroke-width="1.5" fill="#FFF5CC"/>

  <!-- Golden Band (Side) -->
  <path id="gold-band-side" d="M190 95 L240 130 L240 145 L190 110 L190 95" stroke="black" stroke-width="1.5" fill="#FFF0AA"/>

  <!-- Door -->
  <path id="door" d="M90 160 L140 148 L140 200 L90 212 L90 160" stroke="black" stroke-width="2" fill="#F8E6A0"/>
</svg>`;
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>Image → 300x300 + Kaaba SVG</h2>

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

      {resizedImageUrl && (
        <div style={{ marginTop: 24 }}>
          <h3>Resized 300x300 Preview (PNG)</h3>
          <img
            src={resizedImageUrl}
            alt="Resized preview"
            width={TARGET_SIZE}
            height={TARGET_SIZE}
            style={{ border: "1px solid #ccc" }}
          />
        </div>
      )}

      {svgString && (
        <div style={{ marginTop: 24 }}>
          <h3>Kaaba SVG Preview (300x300)</h3>
          <div
            style={{
              border: "1px solid #ccc",
              width: TARGET_SIZE,
              height: TARGET_SIZE,
            }}
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
        </div>
      )}
    </div>
  );
};

export default ImageToKaabaSvg;
