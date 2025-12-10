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

// Add viewBox if missing
const normalizeSvgViewBox = (svg: string, size: number) => {
  if (svg.includes("viewBox")) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${size} ${size}"`);
};

// Extract list of PATH TAGS (complete tag strings, not just d)
const extractPathList = (svg: string) => {
  return [...svg.matchAll(/<path[\s\S]*?\/?>/gi)].map((m) => m[0]);
};

// Replace ALL paths in the SVG <svg> … paths … </svg>
const rebuildSvgWithPaths = (svg: string, newPathList: string[]) => {
  return svg.replace(
    /<svg[^>]*>[\s\S]*<\/svg>/i,
    (full) => {
      const open = full.match(/<svg[^>]*>/i)![0];
      const close = "</svg>";
      return open + "\n" + newPathList.join("\n") + "\n" + close;
    }
  );
};

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const [svgOutput, setSvgOutput] = useState(defaultSvgPlaceholder);
  const [paths, setPaths] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload image
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
      const originalDataUrl = reader.result as string;
      setPreviewSrc(originalDataUrl);

      const resizedCanvas = await resizeImageToMax(originalDataUrl, MAX_SIZE);
      const cleanedCanvas = removeWhiteBackground(resizedCanvas);
      const cleanedDataUrl = canvasToDataUrl(cleanedCanvas);

      convertToSvg(cleanedDataUrl);
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

        const extractedPaths = extractPathList(fixedSvg);
        setPaths(extractedPaths);

        setSvgOutput(fixedSvg);
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

  // Highlight path
  const getHighlightedSvg = () => {
    if (highlightIndex === null) return svgOutput;

    const modified = paths.map((p, i) => {
      if (i !== highlightIndex) return p;

      // ADD highlight stroke but keep original path
      const highlight = p.replace(
        "<path",
        `<path stroke="red" stroke-width="4" `
      );

      return highlight;
    });

    return rebuildSvgWithPaths(svgOutput, modified);
  };

  // Delete path
  const deletePath = (index: number) => {
    const newPaths = paths.filter((_, i) => i !== index);

    const newSvg = rebuildSvgWithPaths(svgOutput, newPaths);

    setPaths(newPaths);
    setSvgOutput(newSvg);
    setHighlightIndex(null);
  };

  const handleCopy = () => navigator.clipboard.writeText(svgOutput);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1>SVG Path Editor (Highlight + Delete)</h1>

      <div style={{ display: "flex", gap: 20 }}>

        {/* LEFT: PATH LIST */}
        <div
          style={{
            width: 300,
            border: "1px solid #ccc",
            padding: 12,
            borderRadius: 12,
            overflow: "auto",
            maxHeight: 600,
          }}
        >
          <h3>Paths ({paths.length})</h3>

          {paths.map((p, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 12,
                borderRadius: 8,
                background: highlightIndex === i ? "#ffe5e5" : "#f5f5f5",
                cursor: "pointer",
              }}
              onClick={() => setHighlightIndex(i)}
            >
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                {p.substring(0, 100)}...
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
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* RIGHT: SVG PREVIEW */}
        <div style={{ flex: 1 }}>
          <input type="file" accept="image/*" onChange={handleFileChange} />

          <textarea
            style={{
              width: "100%",
              height: 180,
              marginTop: 16,
              fontFamily: "monospace",
            }}
            value={svgOutput}
            readOnly
          />

          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              marginTop: 16,
              borderRadius: 6,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Copy SVG
          </button>

          <div
            style={{
              marginTop: 20,
              maxHeight: 600,
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
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
