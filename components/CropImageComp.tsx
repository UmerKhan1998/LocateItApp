import React, { useState, ChangeEvent } from "react";

type ColorablePart = {
  id: string;
  defaultColor: string;
  tagName: string;
};

const CANVAS_SIZE = 300;

const AdminSvgColorable: React.FC = () => {
  const [originalSvg, setOriginalSvg] = useState("");
  const [normalizedSvg, setNormalizedSvg] = useState("");
  const [colorableParts, setColorableParts] = useState<ColorablePart[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("svg")) {
      setError("Please upload an SVG file.");
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      setOriginalSvg(text);
      try {
        const { svg, parts } = processSvg(text);
        setNormalizedSvg(svg);
        setColorableParts(parts);
      } catch (err) {
        console.error(err);
        setError("Failed to parse SVG. Make sure it is valid SVG markup.");
      }
    };
    reader.readAsText(file);
  };

  const handleOriginalChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setOriginalSvg(value);
    if (!value.trim()) {
      setNormalizedSvg("");
      setColorableParts([]);
      setError(null);
      return;
    }

    try {
      const { svg, parts } = processSvg(value);
      setNormalizedSvg(svg);
      setColorableParts(parts);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to parse SVG. Make sure it is valid SVG markup.");
    }
  };

  const handleDownload = () => {
    if (!normalizedSvg) return;
    const blob = new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "normalized-300x300.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1200,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <h1>Admin SVG Tool – Outline + Fill Parts (300×300)</h1>

      <p>
        Rule: <strong>colorable parts use ids ending with <code>-fill</code></strong> (e.g.
        <code>minaret-1-fill</code>). Those will be filled, and the outline paths stay black.
      </p>

      <div style={{ margin: "1rem 0" }}>
        <input type="file" accept=".svg,image/svg+xml" onChange={handleFileChange} />
      </div>

      {error && (
        <div
          style={{
            color: "white",
            background: "#d32f2f",
            padding: "0.5rem 0.75rem",
            borderRadius: 4,
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          marginTop: "1.5rem",
        }}
      >
        {/* Original SVG input */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2>Original SVG (input)</h2>
          <textarea
            value={originalSvg}
            onChange={handleOriginalChange}
            placeholder="Paste or upload your SVG here..."
            style={{
              width: "100%",
              minHeight: 220,
              fontFamily: "monospace",
              fontSize: 12,
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Normalized SVG output */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2>Normalized SVG (width/height 300)</h2>
          <textarea
            value={normalizedSvg}
            readOnly
            style={{
              width: "100%",
              minHeight: 220,
              fontFamily: "monospace",
              fontSize: 12,
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleDownload}
            disabled={!normalizedSvg}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.8rem",
              cursor: normalizedSvg ? "pointer" : "not-allowed",
            }}
          >
            Download Normalized SVG
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2>Preview</h2>
        <div
          style={{
            border: "1px solid #ccc",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            background: "#fafafa",
          }}
        >
          {normalizedSvg ? (
            <div
              dangerouslySetInnerHTML={{ __html: normalizedSvg }}
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            />
          ) : (
            <span style={{ color: "#888", fontSize: 12 }}>No SVG yet</span>
          )}
        </div>
      </div>

      {/* Colorable parts list */}
      {colorableParts.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Colorable Parts (ids ending with -fill)</h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>id</th>
                <th style={thStyle}>default fill</th>
                <th style={thStyle}>tag</th>
              </tr>
            </thead>
            <tbody>
              {colorableParts.map((p, i) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <code>{p.id}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.defaultColor}</code>
                  </td>
                  <td style={tdStyle}>{p.tagName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: "0.5rem" }}>
            On mobile, change only the <code>fill</code> of these ids; outlines stay fixed.
          </p>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "0.25rem 0.5rem",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "0.25rem 0.5rem",
};

function processSvg(svgString: string): { svg: string; parts: ColorablePart[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid SVG XML");
  }

  const rootSvg = doc.querySelector("svg");
  if (!rootSvg) {
    throw new Error("No <svg> root element found");
  }

  // Normalize size
  rootSvg.setAttribute("width", String(CANVAS_SIZE));
  rootSvg.setAttribute("height", String(CANVAS_SIZE));
  if (!rootSvg.getAttribute("viewBox")) {
    rootSvg.setAttribute("viewBox", `0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`);
  }

  // Collect colorable parts: id ending with "-fill"
  const colorable: ColorablePart[] = [];
  const selector = "*[id$='-fill']"; // any element with id ending in -fill
  const nodes = rootSvg.querySelectorAll(selector);

  nodes.forEach((node) => {
    if (!(node instanceof Element)) return;
    const id = node.getAttribute("id");
    if (!id) return;
    const fill = node.getAttribute("fill") || "#FFFFFF"; // default inside color
    colorable.push({
      id,
      defaultColor: fill,
      tagName: node.tagName,
    });
  });

  const serializer = new XMLSerializer();
  const normalized = serializer.serializeToString(rootSvg);

  return { svg: normalized, parts: colorable };
}

export default AdminSvgColorable;
