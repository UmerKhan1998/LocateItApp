import React, { useState, useRef, ChangeEvent } from "react";

type Chunk = {
  baseId: string;
  d: string;
  outlineStroke: string;
  outlineStrokeWidth: string;
  fill: string; // current fill color (inside area)
};

const DEFAULT_SIZE = 300;

const SvgPathFillEditor: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewBox, setViewBox] = useState<string>(`0 0 ${DEFAULT_SIZE} ${DEFAULT_SIZE}`);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ====== FILE UPLOAD ======
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
      try {
        const { viewBox, chunks } = parseSvgToChunks(text);
        setViewBox(viewBox);
        setChunks(chunks);
        setSelectedId(null);
      } catch (err) {
        console.error(err);
        setError("Failed to parse SVG. Make sure it is valid SVG markup.");
      }
    };
    reader.readAsText(file);
  };

  // ====== PARSER: SVG TEXT -> CHUNKS ======
  function parseSvgToChunks(svgText: string): { viewBox: string; chunks: Chunk[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");

    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid SVG XML");
    }

    const svgRoot = doc.querySelector("svg");
    if (!svgRoot) {
      throw new Error("No <svg> root element found");
    }

    const vb = svgRoot.getAttribute("viewBox");
    const width = svgRoot.getAttribute("width") || String(DEFAULT_SIZE);
    const height = svgRoot.getAttribute("height") || String(DEFAULT_SIZE);

    const finalViewBox = vb || `0 0 ${width} ${height}`;

    const pathEls = Array.from(svgRoot.querySelectorAll("path"));
    if (pathEls.length === 0) {
      throw new Error("No <path> elements found in SVG. Please upload path-based SVG.");
    }

    const chunks: Chunk[] = pathEls.map((p, index) => {
      const d = p.getAttribute("d") || "";
      const id = p.getAttribute("id") || `chunk-${index + 1}`;
      const stroke = p.getAttribute("stroke") || "black";
      const strokeWidth = p.getAttribute("stroke-width") || "1.5";
      const fill = p.getAttribute("fill") || "none";

      return {
        baseId: id,
        d,
        outlineStroke: stroke,
        outlineStrokeWidth: strokeWidth,
        // default fill: if none, use transparent; you can change this
        fill: fill === "none" ? "#00000000" : fill,
      };
    });

    return { viewBox: finalViewBox, chunks };
  }

  // ====== HANDLE COLOR CHANGE FOR SELECTED CHUNK ======
  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!selectedId) return;

    setChunks((prev) =>
      prev.map((c) =>
        c.baseId === selectedId
          ? {
              ...c,
              fill: color,
            }
          : c
      )
    );
  };

  // ====== BUILD FINAL SVG STRING ======
  const buildFinalSvg = (): string => {
    const pathLines = chunks
      .map((c) => {
        const fillId = `${c.baseId}-fill`;
        const outlineId = `${c.baseId}-outline`;

        return [
          `  <!-- ${c.baseId} -->`,
          `  <path id="${fillId}" d="${c.d}" fill="${c.fill}" stroke="none" />`,
          `  <path id="${outlineId}" d="${c.d}" fill="none" stroke="${c.outlineStroke}" stroke-width="${c.outlineStrokeWidth}" stroke-linejoin="round" />`,
        ].join("\n");
      })
      .join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
      pathLines,
      `</svg>`,
    ].join("\n");
  };

  const finalSvg = buildFinalSvg();

  const handleDownload = () => {
    const blob = new Blob([finalSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colored-chunks.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ====== RENDER ======
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1200,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <h1>SVG Path Fill Editor</h1>

      <p>
        1. Upload a path-based SVG (like your Kaaba line drawing).<br />
        2. Click any chunk (path) in the preview.<br />
        3. Change its <strong>fill</strong> color – outline stays black.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleFileChange}
        />
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

      {/* Controls for selected chunk */}
      {selectedId && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 0.75rem",
            background: "#f5f5f5",
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>
            Selected chunk: <code>{selectedId}</code>
          </span>
          <input type="color" onChange={handleColorChange} />
        </div>
      )}

      {/* Preview */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <h2>Preview</h2>
          <div
            style={{
              border: "1px solid #ccc",
              width: 300,
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
            }}
          >
            {chunks.length ? (
              <svg
                viewBox={viewBox}
                width={300}
                height={300}
                style={{ cursor: "pointer" }}
              >
                {chunks.map((c) => {
                  const isSelected = c.baseId === selectedId;
                  return (
                    <g
                      key={c.baseId}
                      onClick={() => setSelectedId(c.baseId)}
                    >
                      {/* Fill under the outline */}
                      <path d={c.d} fill={c.fill} stroke="none" />
                      {/* Border / outline */}
                      <path
                        d={c.d}
                        fill="none"
                        stroke={c.outlineStroke}
                        strokeWidth={c.outlineStrokeWidth}
                        strokeLinejoin="round"
                      />
                      {/* Optional highlight if selected */}
                      {isSelected && (
                        <path
                          d={c.d}
                          fill="none"
                          stroke="#00BCD4"
                          strokeWidth={Number(c.outlineStrokeWidth) + 2}
                          strokeLinejoin="round"
                          opacity={0.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <span style={{ fontSize: 12, color: "#888" }}>
                Upload an SVG to start
              </span>
            )}
          </div>
        </div>

        {/* Final SVG output */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2>Final SVG (copy or save)</h2>
          <textarea
            value={finalSvg}
            readOnly
            style={{
              width: "100%",
              minHeight: 260,
              fontFamily: "monospace",
              fontSize: 12,
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleDownload}
            disabled={!chunks.length}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.8rem",
              cursor: chunks.length ? "pointer" : "not-allowed",
            }}
          >
            Download SVG
          </button>
        </div>
      </div>

      {/* Chunks table for reference */}
      {chunks.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Path Chunks</h2>
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
                <th style={thStyle}>Base id</th>
                <th style={thStyle}>Current fill</th>
                <th style={thStyle}>Stroke</th>
                <th style={thStyle}>Stroke width</th>
              </tr>
            </thead>
            <tbody>
              {chunks.map((c, i) => (
                <tr key={c.baseId}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <code>{c.baseId}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{c.fill}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{c.outlineStroke}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{c.outlineStrokeWidth}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: "0.5rem" }}>
            In your mobile app you can also change fills by ids:
            {"  "}
            <code>chunk-id-fill</code> (outline id will be{" "}
            <code>chunk-id-outline</code> in the exported SVG).
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

export default SvgPathFillEditor;
