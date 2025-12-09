import React, { useState } from "react";
import ImageTracer from "imagetracerjs";

const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

export default function ImageToSvgConverter() {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string>(defaultSvgPlaceholder);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Get width & height from <svg>
  // -----------------------------
  const getSvgSize = (svgString: string) => {
    const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
    if (!viewBoxMatch) return { w: 300, h: 300 };

    const parts = viewBoxMatch[1].split(" ");
    return { w: parseFloat(parts[2]), h: parseFloat(parts[3]) };
  };

  // ---------------------------------------------------
  // REMOVE BACKGROUND: Any opacity=0 shape touching edge
  // ---------------------------------------------------
  const removeBackgroundPaths = (svg: string) => {
    const { w, h } = getSvgSize(svg);
    const BORDER = 4;

    return svg.replace(
      /<path\b([^>]*?)opacity="0"([^>]*?)d="([^"]+)"[^>]*>/gi,
      (fullMatch, before, after, d) => {
        // Extract numeric coords from path d=""
        const nums = [...d.matchAll(/([0-9]*\.?[0-9]+)/g)].map((n) =>
          parseFloat(n[1])
        );

        if (nums.length < 4) return fullMatch;

        const pts = [];
        for (let i = 0; i < nums.length; i += 2) {
          pts.push({ x: nums[i], y: nums[i + 1] });
        }

        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const touchesBorder =
          minX <= BORDER ||
          minY <= BORDER ||
          maxX >= w - BORDER ||
          maxY >= h - BORDER;

        if (touchesBorder) {
          return ""; // REMOVE background fragment
        }

        return fullMatch; // Keep internal shapes
      }
    );
  };

  // -----------------------------
  // Handle image upload
  // -----------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload only PNG/JPG/WebP/SVG images.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPreviewSrc(url);
      convertToSvg(url);
    };
    reader.onerror = () => setError("Could not read image file.");

    reader.readAsDataURL(file);
  };

  // -----------------------------
  // Convert to SVG
  // -----------------------------
  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);

    const options = {
      numberofcolors: 20,
      strokewidth: 1,
      scale: 1,
      ltres: 1,
      qtres: 1,
      pathomit: 0,
    };

    ImageTracer.imageToSVG(
      dataUrl,
      (svg: string) => {
        const cleaned = removeBackgroundPaths(svg);
        setSvgOutput(cleaned);
        setIsConverting(false);
      },
      options
    );
  };

  // -----------------------------
  // Copy SVG to clipboard
  // -----------------------------
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied to clipboard!");
    } catch {
      alert("Could not copy.");
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Image → SVG Converter (Background Removed)</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {previewSrc && (
        <>
          <p style={{ marginTop: 20 }}>Preview:</p>
          <img
            src={previewSrc}
            style={{
              maxWidth: 260,
              maxHeight: 260,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </>
      )}

      <div style={{ marginTop: 30 }}>
        <button
          onClick={handleCopy}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          Copy SVG
        </button>

        <textarea
          readOnly
          value={svgOutput}
          style={{
            width: "100%",
            minHeight: 300,
            fontFamily: "monospace",
            fontSize: 12,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc",
            whiteSpace: "pre",
          }}
        />

        <div
          style={{
            marginTop: 20,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
            maxHeight: 400,
            overflow: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: svgOutput }}
        />
      </div>
    </div>
  );
}
