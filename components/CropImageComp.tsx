"use client";

import React, { useState } from "react";
// If TypeScript complains about types, you can add a .d.ts or use @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 600;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

// Resize image to a max size
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

// Remove white background (make white transparent)
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

// Normalize a single <path> tag to be stroke-only (black outline, white fill)
// This is the key part for "coloring book" style SVG.
const normalizePathTag = (p: string) => {
  let out = p;

  // remove inline style/fill/stroke/stroke-width if any
  out = out.replace(/\sstyle="[^"]*"/gi, "");
  out = out.replace(/\sfill="[^"]*"/gi, "");
  out = out.replace(/\sstroke="[^"]*"/gi, "");
  out = out.replace(/\sstroke-width="[^"]*"/gi, "");

  // enforce stroke + fill
  out = out.replace(
    "<path",
    `<path stroke="black" stroke-width="1.5" fill="white" `
  );

  return out;
};

// Extract list of PATH TAGS (full tag strings, not just d)
const extractPathList = (svg: string) => {
  return [...svg.matchAll(/<path[\s\S]*?\/?>/gi)].map((m) => m[0]);
};

// Replace ALL paths in the SVG <svg> … paths … </svg>
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

  // Upload image
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

  // Start SVG conversion
  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);

    ImageTracer.imageToSVG(
      dataUrl,
      (rawSvg: string) => {
        const fixedSvg = normalizeSvgViewBox(rawSvg, MAX_SIZE);

        // Extract paths and normalize them for stroke-line coloring
        const extracted = extractPathList(fixedSvg);
        const normalizedPaths = extracted.map(normalizePathTag);

        // Rebuild SVG with cleaned paths only
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

  // Highlight a single path in red (visual feedback in preview)
  const getHighlightedSvg = () => {
    if (highlightIndex === null) return svgOutput;

    const modified = paths.map((p, i) => {
      if (i !== highlightIndex) return p;

      // add highlight stroke on top of existing attrs
      const highlight = p.replace(
        "<path",
        `<path stroke="red" stroke-width="4" `
      );

      return highlight;
    });

    return rebuildSvgWithPaths(svgOutput, modified);
  };

  // Delete path from SVG + list
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
      <h1>Image → SVG Path Editor (Next.js)</h1>

      <p style={{ marginBottom: 16 }}>
        Upload an image, auto-trace to SVG, convert to{" "}
        <strong>black stroke / white fill</strong> paths, highlight or delete
        individual paths, and copy clean SVG for React Native / web coloring.
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
              <span style={{ fontSize: 12, color: "#999" }}>(converting…)</span>
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
                {p.substring(0, 110)}...
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
            dangerouslySetInnerHTML={{ __html: getHighlightedSvg() }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverterPage;
