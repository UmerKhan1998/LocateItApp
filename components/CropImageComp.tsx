import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 600;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

/* STEP 1 — Resize uploaded image to max size */
const resizeImageToMax = (
  dataUrl: string,
  maxSize: number
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas error");

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas);
    };

    img.onerror = () => reject("Image load failed");
    img.src = dataUrl;
  });
};

/* STEP 2 — Remove white background (convert white → transparent) */
const removeWhiteBackground = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Threshold for "white" detection
  const WHITE_TOLERANCE = 240;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];

    if (r > WHITE_TOLERANCE && g > WHITE_TOLERANCE && b > WHITE_TOLERANCE) {
      data[i + 3] = 0; // make transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

/* STEP 3 — Convert cleaned canvas to SVG */
const canvasToSvg = (canvas: HTMLCanvasElement) => {
  return canvas.toDataURL("image/png");
};

/* Add viewBox if missing */
const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${size} ${size}"`);
};

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string>(defaultSvgPlaceholder);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        // Step 1: Resize
        const resizedCanvas = await resizeImageToMax(
          originalDataUrl,
          MAX_SIZE
        );

        // Step 2: Remove background
        const cleanCanvas = removeWhiteBackground(resizedCanvas);

        // Step 3: Convert cleaned canvas to dataURL
        const cleanedDataUrl = canvasToSvg(cleanCanvas);

        convertToSvg(cleanedDataUrl);
      } catch (err) {
        setError("Processing failed");
      }
    };

    reader.onerror = () => setError("Could not read file");
    reader.readAsDataURL(file);
  };

  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);
    setSvgOutput(defaultSvgPlaceholder);

    ImageTracer.imageToSVG(
      dataUrl,
      (svg: string) => {
        setSvgOutput(normalizeSvgViewBox(svg, MAX_SIZE));
        setIsConverting(false);
      },
      {
        numberofcolors: 4,
        strokewidth: 1,
        scale: 1,

        // Smoothing and detail
        ltres: 0.5,
        qtres: 0.5,
        pathomit: 0,
        roundcoords: 2,
        linefilter: true,
        blur: 0,
      }
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied!");
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
        fontFamily: "system-ui",
      }}
    >
      <h1>Image → Clean SVG Converter (Background Removed)</h1>

      <p style={{ color: "#555" }}>
        Upload image → white background auto-removed → vectorized into SVG paths.
      </p>

      <div
        style={{
          display: "flex",
          gap: 20,
          borderRadius: 16,
          border: "1px solid #ddd",
          padding: 16,
          flexWrap: "wrap",
        }}
      >
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

          {error && <p style={{ color: "red" }}>{error}</p>}

          {previewSrc && (
            <div style={{ marginTop: 12 }}>
              <p>Original Preview:</p>
              <img
                src={previewSrc}
                style={{
                  maxWidth: 260,
                  maxHeight: 260,
                  borderRadius: 12,
                  border: "1px solid #eee",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <p>{isConverting ? "Converting…" : "SVG Output"}</p>
            <button
              style={{
                borderRadius: 30,
                padding: "6px 12px",
                border: "1px solid #ccc",
              }}
              onClick={handleCopy}
            >
              Copy SVG
            </button>
          </div>

          <textarea
            value={svgOutput}
            readOnly
            style={{
              width: "100%",
              height: 300,
              fontFamily: "monospace",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
            }}
          />

          <div
            style={{
              marginTop: 16,
              background: "#fafafa",
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 12,
              maxHeight: 300,
              overflow: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: svgOutput }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
