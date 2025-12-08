import React, { useState } from "react";

// imagetracerjs does not ship great TypeScript types, so we just tell TS it's "any"
import ImageTracer from "imagetracerjs";
// or, if you prefer global script: declare const ImageTracer: any;

const defaultSvgPlaceholder = "<svg><!-- SVG will appear here --></svg>";

const ImageToSvgConverter: React.FC = () => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string>(defaultSvgPlaceholder);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    // Only allow images
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG/JPG/SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewSrc(dataUrl);
      convertToSvg(dataUrl);
    };
    reader.onerror = () => {
      setError("Could not read file.");
    };

    reader.readAsDataURL(file);
  };

  const convertToSvg = (dataUrl: string) => {
    setIsConverting(true);
    setSvgOutput(defaultSvgPlaceholder);

    // imagetracerjs can take a URL or dataURL
    const options = {
      // tweak as needed – fewer colors & paths for coloring-book style
      numberofcolors: 8,
      strokewidth: 1,
      scale: 1,
      // etc...
    };

    ImageTracer.imageToSVG(
      dataUrl,
      (svgString: string) => {
        setSvgOutput(svgString);
        setIsConverting(false);
      },
      options
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgOutput);
      alert("SVG copied to clipboard!");
    } catch {
      alert("Could not copy to clipboard.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1>Image → SVG Region Converter</h1>
      <p style={{ color: "#555" }}>
        Upload a high-contrast line-art image (like a coloring page). This will
        generate SVG paths that you can paste into your React Native app.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: "1px solid #ddd",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 260 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Upload image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "block", marginTop: 8 }}
            />
          </label>

          {error && (
            <p style={{ color: "red", marginTop: 8, fontSize: 13 }}>{error}</p>
          )}

          {previewSrc && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, marginBottom: 8 }}>Original preview:</p>
              <img
                src={previewSrc}
                alt="preview"
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

        <div style={{ flex: 1, minWidth: 300 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <p style={{ fontSize: 13, margin: 0 }}>
              {isConverting
                ? "Converting to SVG…"
                : "SVG output (you’ll paste paths into the mobile app):"}
            </p>
            <button
              onClick={handleCopy}
              disabled={!svgOutput || isConverting}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Copy SVG
            </button>
          </div>

          <textarea
            value={svgOutput}
            readOnly
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 260,
              fontFamily: "monospace",
              fontSize: 12,
              borderRadius: 12,
              padding: 12,
              border: "1px solid #ddd",
              resize: "vertical",
              whiteSpace: "pre",
            }}
          />

          <p style={{ fontSize: 12, marginTop: 8, color: "#777" }}>
            Tip: After vectorization, you might want to clean up the SVG (e.g.,
            in Illustrator, Figma, or an SVG editor) and make sure each region
            you want to color is a separate <code>&lt;path&gt;</code> with its
            own <code>id</code>.
          </p>

          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              border: "1px solid #eee",
              padding: 12,
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: 13, marginBottom: 8 }}>SVG live preview:</p>
            <div
              style={{
                width: "100%",
                maxHeight: 300,
                overflow: "auto",
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #eee",
              }}
              // Live render of SVG string
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
