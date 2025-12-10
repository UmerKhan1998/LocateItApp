"use client";

import React, { useState } from "react";
// If TS complains about types, you can add a .d.ts or keep this @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 600;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

// Resize image to a maximum size (keeping aspect ratio)
const resizeImageToMax = (dataUrl: string, maxSize: number) => {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
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

// Remove white background (make nearly white pixels transparent)
const removeWhiteBackground = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const WHITE_TOLERANCE = 240;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If close to white → make transparent
    if (r > WHITE_TOLERANCE && g > WHITE_TOLERANCE && b > WHITE_TOLERANCE) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const canvasToDataUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL("image/png");

// Add viewBox if missing
const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${size} ${size}"`);
};

// ✅ Normalize a single <path> tag to stroke-only black outline + white fill
//    Even if original path had opacity=0 / fill-opacity=0 / fill="none".
const normalizePathTag = (p: string) => {
  let out = p;

  // Remove inline styling and fill/stroke/opacity attrs from original
  out = out.replace(/\sstyle="[^"]*"/gi, "");
  out = out.replace(/\sfill="[^"]*"/gi, "");
  out = out.replace(/\sfill-opacity="[^"]*"/gi, "");
  out = out.replace(/\sopacity="[^"]*"/gi, "");
  out = out.replace(/\sstroke="[^"]*"/gi, "");
  out = out.replace(/\sstroke-width="[^"]*"/gi, "");

  // Force stroke + fill so region is visible & clickable
  out = out.replace(
    "<path",
    `<path stroke="black" stroke-width="1.5" fill="white" fill-opacity="1" `
  );

  return out;
};

// Extract full <path ... /> tag strings from SVG
const extractPathList = (svg: string) => {
  return [...svg.matchAll(/<path[\s\S]*?\/?>/gi)].map((m) => m[0]);
};

// Rebuild SVG contents with a new list of path tags
const rebuildSvgWithPaths = (svg: string, newPathList: string[]) => {
  return svg.replace(/<svg[^>]*>[\s\S]*<\/svg>/i, (full) => {
    const open = full.match(/<svg[^>]*>/i)![0];
    const close = "</svg>";
    return open + "\n" + newPathList.join("\n") + "\n" + close;
  });
};

const ImageToSvgConverterPage: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState(defaultSvgPlaceholder);
  const [paths, setPaths] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle image upload
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

        const resizedCanvas = await resizeImageToMax(originalDataUrl, MAX_SIZE);
        const cleanedCanvas = removeWhiteBackground(resizedCanvas);
        const cleanedDataUrl = canvasToDataUrl(cleanedCanvas);

        convertToSvg(cleanedDataUrl);
      } catch (err: any) {
        console.error(err);
        setError(String(err));
      }
    };
    reader.readAsDataURL(file);
  };

  // Convert image (dataUrl) → SVG using ImageTracer
  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);

    ImageTracer.imageToSVG(
      dataUrl,
      (rawSvg: string) => {
        const fixedSvg = normalizeSvgViewBox(rawSvg, MAX_SIZE);

        // Extract original paths
        const extracted = extractPathList(fixedSvg);
        // Normalize each for stroke/white-fill coloring
        const normalizedPaths = extracted.map(normalizePathTag);

        // Rebuild the SVG using normalized paths only
        const cleanedSvg = rebuildSvgWithPaths(fixedSvg, normalizedPaths);

        setPaths(normalizedPaths);
        setSvgOutput(cleanedSvg);
        setHighlightIndex(null);
        setIsConverting(false);
      },
      {
        numberofcolors: 4,
        strokewidth: 1,
        scale: 1,
        ltres: 0.5,
        qtres: 0.5,
        pathomit: 0,
      }
    );
  };

  // Highlight a path by index (for preview)
  const getHighlightedSvg = () => {
    if (highlightIndex === null) return svgOutput;

    const modified = paths.map((p, i) => {
      if (i !== highlightIndex) return p;

      // Add red highlight stroke (still fillable)
      const highlight = p.replace(
        "<path",
        `<path stroke="red" stroke-width="4" `
      );

      return highlight;
    });

    return rebuildSvgWithPaths(svgOutput, modified);
  };

  // Delete a path by index
  const deletePath = (index: number) => {
    const newPaths = paths.filter((_, i) => i !== index);
    const newSvg = rebuildSvgWithPaths(svgOutput, newPaths);

    setPaths(newPaths);
    setSvgOutput(newSvg);
    setHighlightIndex(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(svgOutput);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1>Image → SVG Path Editor (Coloring-ready)</h1>

      <p style={{ marginBottom: 16 }}>
        Upload an image, auto-trace to SVG, normalize all paths to{" "}
        <b>stroke=black + fill=white</b> (even if they had opacity=0), then
        highlight or delete individual paths. Use the output SVG in web / React
        Native coloring apps.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#ffe5e5",
            borderRadius: 8,
            border: "1px solid #ff8080",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* LEFT: PATH LIST */}
        <div
          style={{
            width: 320,
            border: "1px solid #ccc",
            padding: 12,
            borderRadius: 12,
            overflow: "auto",
            maxHeight: 600,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Paths ({paths.length}){" "}
            {isConverting && (
              <span style={{ fontSize: 12, color: "#999" }}>
                (converting…)
              </span>
            )}
          </h3>

          {paths.length === 0 && (
            <div style={{ fontSize: 13, color: "#777" }}>
              No paths yet. Upload an image on the right.
            </div>
          )}

          {paths.map((p, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 12,
                borderRadius: 8,
                background: highlightIndex === i ? "#ffe5e5" : "#f5f5f5",
                cursor: "pointer",
                border:
                  highlightIndex === i
                    ? "1px solid #ff8080"
                    : "1px solid #ddd",
              }}
              onClick={() => setHighlightIndex(i)}
            >
              <div
                style={{
                  fontSize: 11,
                  marginBottom: 6,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {p.substring(0, 120)}...
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePath(i);
                }}
                style={{
                  padding: "4px 8px",
                  background: "#ffcccc",
                  borderRadius: 6,
                  border: "1px solid red",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT: CONTROLS + PREVIEW */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 12 }}>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          {previewSrc && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Original:</div>
              <img
                src={previewSrc}
                alt="preview"
                style={{
                  maxWidth: 200,
                  maxHeight: 200,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>SVG Code:</div>
            <textarea
              style={{
                width: "100%",
                height: 180,
                marginTop: 4,
                fontFamily: "monospace",
                fontSize: 12,
              }}
              value={svgOutput}
              readOnly
            />
            <button
              onClick={handleCopy}
              style={{
                padding: "8px 16px",
                marginTop: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
                cursor: "pointer",
                background: "#f5f5f5",
              }}
            >
              Copy SVG
            </button>
          </div>

          <div
            style={{
              marginTop: 20,
              maxHeight: 600,
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              overflow: "auto",
              background: "#fff",
            }}
            // svgOutput and highlighted version are already normalized (stroke+fill)
            dangerouslySetInnerHTML={{ __html: getHighlightedSvg() }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverterPage;
