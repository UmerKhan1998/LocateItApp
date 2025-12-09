import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 600;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

/* 1️⃣ Resize the input image to max resolution */
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
      if (!ctx) return reject("Canvas not supported");

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };

    img.onerror = () => reject("Image load error");
    img.src = dataUrl;
  });
};

/* 2️⃣ Remove white background (turn it transparent) */
const removeWhiteBackground = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const WHITE_TOLERANCE = 240;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (r > WHITE_TOLERANCE && g > WHITE_TOLERANCE && b > WHITE_TOLERANCE) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/* Convert cleaned canvas → DataURL (PNG) */
const canvasToDataUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL("image/png");

/* 3️⃣ Make sure SVG always has viewBox="0 0 W H" */
const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${size} ${size}"`);
};

/* 4️⃣ Extract SVG width & height dynamically */
const getSvgSize = (svg: string) => {
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match) {
    return { w: 600, h: 600 }; // fallback
  }
  return { w: parseInt(match[1], 10), h: parseInt(match[2], 10) };
};

/* 5️⃣ Remove ONLY the big background rectangle path */
const removeBackgroundPath = (svg: string) => {
  const { w, h } = getSvgSize(svg);

  const regex = new RegExp(
    `<path[^>]*opacity="0"[^>]*d="[^"]*(M\\s*0\\s*0)[^"]*(L\\s*${w}\\s*0)[^"]*(L\\s*${w}\\s*${h})[^"]*(L\\s*0\\s*${h})[^"]*"[^>]*>`,
    "gi"
  );

  return svg.replace(regex, "");
};

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string>(defaultSvgPlaceholder);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Handle image upload */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const originalDataUrl = reader.result as string;
        setPreviewSrc(originalDataUrl);

        // Step 1: resize
        const resizedCanvas = await resizeImageToMax(originalDataUrl, MAX_SIZE);

        // Step 2: remove white background
        const cleanedCanvas = removeWhiteBackground(resizedCanvas);

        // Step 3: get cleaned PNG
        const cleanedDataUrl = canvasToDataUrl(cleanedCanvas);

        // Step 4: convert to SVG
        convertToSvg(cleanedDataUrl);
      } catch (err) {
        setError("Image processing failed");
      }
    };

    reader.onerror = () => setError("Could not read file");
    reader.readAsDataURL(file);
  };

  /* Convert cleaned PNG → SVG using ImageTracer */
  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);
    setSvgOutput(defaultSvgPlaceholder);

    ImageTracer.imageToSVG(
      dataUrl,
      (rawSvg: string) => {
        // Fix viewBox
        let cleaned = normalizeSvgViewBox(rawSvg, MAX_SIZE);

        // Remove ONLY background big rectangle
        cleaned = removeBackgroundPath(cleaned);

        setSvgOutput(cleaned);
        setIsConverting(false);
      },
      {
        // Optimal settings for coloring-book style
        numberofcolors: 4,
        strokewidth: 1,
        scale: 1,
        ltres: 0.5,
        qtres: 0.5,
        pathomit: 0,
        roundcoords: 2,
        linefilter: true,
        blur: 0,
      }
    );
  };

  /* Copy to clipboard */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied!");
    } catch {
      alert("Copy failed");
    }
  };

  /* UI */
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
        Upload → background removed → vectorized → background path removed.  
        Output SVG is clean and ready for React Native color-fill.
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
        {/* Image upload */}
        <div style={{ minWidth: 260 }}>
          <label style={{ fontWeight: 600 }}>
            Upload Image
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

        {/* SVG preview + output */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <p>{isConverting ? "Vectorizing…" : "SVG Output"}</p>

            <button
              onClick={handleCopy}
              style={{
                borderRadius: 30,
                padding: "6px 12px",
                border: "1px solid #ccc",
                background: "#fff",
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
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 12,
              background: "#fafafa",
              maxHeight: 320,
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
