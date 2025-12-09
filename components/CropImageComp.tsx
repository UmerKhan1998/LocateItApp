import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

/*
  Use higher vectorization resolution to avoid pixelated paths.
  You can try 600, 700, or 800.
*/
const MAX_SIZE = 600;

const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

/* Resize uploaded image before vectorization */
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
        reject("Canvas context unavailable");
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject("Failed to load image");
    img.src = dataUrl;
  });
};

/* Ensure SVG always has a viewBox */
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a PNG or JPG image");
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
      } catch {
        setError("Image resize failed");
      }
    };

    reader.onerror = () => setError("File reading failed");
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
        // Best for coloring-book style images
        numberofcolors: 4,
        strokewidth: 1,
        scale: 1,

        // Smoothing & quality
        ltres: 0.5,     // line threshold (lower = more detail)
        qtres: 0.5,     // curve threshold
        pathomit: 0,    // keep small shapes
        roundcoords: 2, // round coords slightly (smooth but not heavy)
        blur: 0,
        linefilter: true,
      }
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied to clipboard");
    } catch {
      alert("Failed to copy");
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
      <h1>Image → SVG Region Converter (Smooth)</h1>

      <p style={{ color: "#555", marginBottom: 16 }}>
        Upload clean line-art. The image is resized to a high resolution before
        vectorization to avoid pixelation. Output is optimized for React Native
        tap-to-fill coloring.
      </p>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid #ddd",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Upload + preview */}
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
              {isConverting ? "Vectorizing…" : "SVG Output"}
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
              minHeight: 320,
              fontFamily: "monospace",
              fontSize: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              resize: "vertical",
            }}
          />

          <p style={{ fontSize: 12, marginTop: 8, color: "#777" }}>
            Make sure each colorable region is a separate{" "}
            <code>&lt;path&gt;</code> with a unique <code>id</code>.
          </p>

          {/* SVG preview */}
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
              SVG Live Preview
            </p>
            <div
              style={{ maxHeight: 320, overflow: "auto" }}
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
