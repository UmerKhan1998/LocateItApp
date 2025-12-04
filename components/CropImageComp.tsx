import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 300;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

/* Resize uploaded image to max 300x300 before vectorization */
const resizeImageToMax = (
  dataUrl: string,
  maxSize: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(
        maxSize / img.width,
        maxSize / img.height,
        1 // never upscale
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject("Canvas context error");
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject("Image load failed");
    img.src = dataUrl;
  });
};

/* Ensure viewBox exists & matches resized size */
const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;

  return svg.replace(
    "<svg",
    `<svg viewBox="0 0 ${size} ${size}"`
  );
};

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string>(defaultSvgPlaceholder);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload PNG or JPG image");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const originalDataUrl = reader.result as string;
        setPreviewSrc(originalDataUrl);

        const resizedDataUrl = await resizeImageToMax(
          originalDataUrl,
          MAX_SIZE
        );

        convertToSvg(resizedDataUrl);
      } catch (err) {
        setError("Failed to resize image");
      }
    };

    reader.onerror = () => {
      setError("File read failed");
    };

    reader.readAsDataURL(file);
  };

  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);
    setSvgOutput(defaultSvgPlaceholder);

    ImageTracer.imageToSVG(
      dataUrl,
      (svg: string) => {
        const normalizedSvg = normalizeSvgViewBox(svg, MAX_SIZE);
        setSvgOutput(normalizedSvg);
        setIsConverting(false);
      },
      {
        numberofcolors: 8,
        strokewidth: 1,
        scale: 1,
        simplification: 1,
      }
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied to clipboard!");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>Image → SVG Region Converter</h1>
      <p style={{ color: "#555" }}>
        Upload a line-art image. It will be resized to 300×300, vectorized,
        and converted into SVG paths for React Native tap-to-fill coloring.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: "1px solid #ddd",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Upload & preview */}
        <div style={{ minWidth: 260 }}>
          <label style={{ fontWeight: 600 }}>
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "block", marginTop: 8 }}
            />
          </label>

          {error && (
            <p style={{ color: "red", marginTop: 8 }}>{error}</p>
          )}

          {previewSrc && (
            <>
              <p style={{ fontSize: 13, marginTop: 12 }}>
                Original preview:
              </p>
              <img
                src={previewSrc}
                alt="Preview"
                style={{
                  maxWidth: 260,
                  maxHeight: 260,
                  borderRadius: 12,
                  border: "1px solid #eee",
                  objectFit: "contain",
                }}
              />
            </>
          )}
        </div>

        {/* SVG output */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <p style={{ fontSize: 13, margin: 0 }}>
              {isConverting ? "Converting…" : "SVG Output"}
            </p>
            <button
              onClick={handleCopy}
              disabled={isConverting}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
            >
              Copy SVG
            </button>
          </div>

          <textarea
            value={svgOutput}
            readOnly
            style={{
              width: "100%",
              minHeight: 300,
              fontFamily: "monospace",
              fontSize: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              resize: "vertical",
            }}
          />

          <p style={{ fontSize: 12, marginTop: 8, color: "#777" }}>
            You can paste this SVG directly into your React Native app
            (using react-native-svg) and let users tap regions to fill color.
          </p>

          {/* Live SVG preview */}
          <div
            style={{
              marginTop: 16,
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              SVG live preview
            </p>
            <div
              style={{ maxHeight: 300, overflow: "auto" }}
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
