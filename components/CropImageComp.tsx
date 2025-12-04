import React, { useState, ChangeEvent } from "react";

type CleanPath = {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
};

const CANVAS_SIZE = 300;

const AdminSvgConverter: React.FC = () => {
  const [originalSvg, setOriginalSvg] = useState<string>("");
  const [convertedSvg, setConvertedSvg] = useState<string>("");
  const [paths, setPaths] = useState<CleanPath[]>([]);
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
        const result = convertSvgToPathFormat(text);
        setConvertedSvg(result.cleanedSvg);
        setPaths(result.paths);
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
    try {
      const result = convertSvgToPathFormat(value);
      setConvertedSvg(result.cleanedSvg);
      setPaths(result.paths);
      setError(null);
    } catch (err) {
      setError("Failed to parse SVG. Make sure it is valid SVG markup.");
    }
  };

  const handleDownload = () => {
    if (!convertedSvg) return;
    const blob = new Blob([convertedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-300x300.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>SVG → Path-Only Colorable SVG (300×300)</h1>

      <p>
        Upload an <strong>SVG file</strong> (with paths) and this tool will:
      </p>
      <ul>
        <li>Extract all &lt;path&gt; elements</li>
        <li>Ensure each has an <code>id</code></li>
        <li>Wrap them in a fixed <code>300 × 300</code> SVG template</li>
      </ul>

      <div style={{ margin: "1rem 0" }}>
        <input type="file" accept=".svg,image/svg+xml" onChange={handleFileChange} />
      </div>

      {error && (
        <div style={{ color: "white", background: "#d32f2f", padding: "0.5rem 0.75rem", borderRadius: 4, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
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

        {/* Converted SVG output */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2>Converted SVG (300×300, paths only)</h2>
          <textarea
            value={convertedSvg}
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
            disabled={!convertedSvg}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.8rem",
              cursor: convertedSvg ? "pointer" : "not-allowed",
            }}
          >
            Download Converted SVG
          </button>
        </div>

        {/* Preview */}
        <div style={{ flexBasis: "100%", marginTop: "1.5rem" }}>
          <h2>Preview (converted)</h2>
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
            {convertedSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: convertedSvg }}
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              />
            ) : (
              <span style={{ color: "#888", fontSize: 12 }}>No SVG yet</span>
            )}
          </div>
        </div>
      </div>

      {/* List of paths / IDs (for debugging / admin awareness) */}
      {paths.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Detected Paths</h2>
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
                <th style={thStyle}>fill</th>
                <th style={thStyle}>stroke</th>
                <th style={thStyle}>stroke-width</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((p, i) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <code>{p.id}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.fill}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.stroke}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.strokeWidth}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: "0.5rem" }}>
            Use these <code>id</code>s on mobile to change <code>fill</code> dynamically.
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

function convertSvgToPathFormat(originalSvgString: string): { cleanedSvg: string; paths: CleanPath[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalSvgString, "image/svg+xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid SVG XML");
  }

  const pathElements = Array.from(doc.querySelectorAll("path"));
  if (pathElements.length === 0) {
    throw new Error("No <path> elements found in SVG");
  }

  const paths: CleanPath[] = pathElements.map((path, index) => {
    const d = path.getAttribute("d") || "";
    const id = path.getAttribute("id") || `region-${index + 1}`;
    const fill = path.getAttribute("fill") ?? "none";
    const stroke = path.getAttribute("stroke") ?? "black";
    const strokeWidth = path.getAttribute("stroke-width") ?? "1";

    return { id, d, fill, stroke, strokeWidth };
  });

  const pathLines = paths.map(
    (p) =>
      `  <path id="${p.id}" d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill}" />`
  );

  const cleanedSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" fill="none">`,
    ...pathLines,
    `</svg>`,
  ].join("\n");

  return { cleanedSvg, paths };
}

export default AdminSvgConverter;
