import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

const MAX_SIZE = 600;
const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

// Resize image
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

// Remove white background
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

const canvasToDataUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL("image/png");

const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${size} ${size}"`);
};

const getSvgSize = (svg: string) => {
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match) return { w: 600, h: 600 };
  return { w: parseInt(match[1], 10), h: parseInt(match[2], 10) };
};

const removeBackgroundPath = (svg: string) => {
  const { w, h } = getSvgSize(svg);

  const regex = new RegExp(
    `<path[^>]*opacity="0"[^>]*d="[^"]*(M\\s*0\\s*0)[^"]*(L\\s*${w}\\s*0)[^"]*(L\\s*${w}\\s*${h})[^"]*(L\\s*0\\s*${h})[^"]*"[^>]*>`,
    "gi"
  );

  return svg.replace(regex, "");
};

// Parse paths from SVG
const extractPaths = (svg: string) => {
  const matches = [...svg.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/gi)];

  return matches.map((m) => ({
    full: m[0],
    d: m[1],
  }));
};

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState(defaultSvgPlaceholder);

  const [paths, setPaths] = useState<{ full: string; d: string }[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload Processing
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

        const resizedCanvas = await resizeImageToMax(originalDataUrl, MAX_SIZE);
        const cleanedCanvas = removeWhiteBackground(resizedCanvas);
        const cleanedDataUrl = canvasToDataUrl(cleanedCanvas);

        convertToSvg(cleanedDataUrl);
      } catch {
        setError("Image processing failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);
    setSvgOutput(defaultSvgPlaceholder);

    ImageTracer.imageToSVG(
      dataUrl,
      (rawSvg: string) => {
        let cleaned = normalizeSvgViewBox(rawSvg, MAX_SIZE);
        cleaned = removeBackgroundPath(cleaned);

        setSvgOutput(cleaned);
        setPaths(extractPaths(cleaned));
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
        roundcoords: 2,
      }
    );
  };

  // Delete a path
  const deletePath = (index: number) => {
    const newPaths = paths.filter((_, i) => i !== index);

    const inner = newPaths.map((p) => p.full).join("\n");

    const svgClean =
      svgOutput.replace(/<svg[^>]*>/i, (m) => m) +
      inner +
      "</svg>";

    setPaths(newPaths);
    setSvgOutput(svgClean);
    setHighlightIndex(null);
  };

  // Highlight a path (wrap with red stroke)
  const getHighlightedSvg = () => {
    if (highlightIndex === null) return svgOutput;

    const highlightedPaths = paths.map((p, i) =>
      i === highlightIndex
        ? p.full.replace(
            "<path",
            `<path stroke="red" stroke-width="3" `
          )
        : p.full
    );

    return svgOutput.replace(
      /<path[\s\S]*<\/svg>/,
      highlightedPaths.join("\n") + "</svg>"
    );
  };

  const handleCopy = () => navigator.clipboard.writeText(svgOutput);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1>Image → SVG Converter + Path Editor</h1>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT SIDE: PATH LIST */}
        <div
          style={{
            width: 280,
            border: "1px solid #ccc",
            borderRadius: 12,
            padding: 12,
            height: 600,
            overflow: "auto",
          }}
        >
          <h3>Paths ({paths.length})</h3>

          {paths.map((p, i) => (
            <div
              key={i}
              style={{
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                background: highlightIndex === i ? "#ffeaea" : "#f5f5f5",
                cursor: "pointer",
              }}
              onClick={() => setHighlightIndex(i)}
            >
              <div style={{ fontSize: 12, wordBreak: "break-word" }}>
                {p.d.substring(0, 100)}...
              </div>

              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  deletePath(i);
                }}
                style={{
                  marginTop: 6,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid red",
                  background: "#fff4f4",
                  color: "red",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT SIDE: SVG PREVIEW */}
        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ marginBottom: 20 }}
          />

          <textarea
            style={{
              width: "100%",
              height: 180,
              marginBottom: 12,
              fontFamily: "monospace",
            }}
            value={svgOutput}
            readOnly
          />

          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #aaa",
              marginBottom: 20,
              cursor: "pointer",
            }}
          >
            Copy SVG
          </button>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              maxHeight: 600,
              overflow: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: getHighlightedSvg() }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
