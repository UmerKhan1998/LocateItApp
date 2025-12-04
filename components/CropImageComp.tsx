import React, { useState, ChangeEvent } from "react";

const CANVAS_SIZE = 300;

type ChunkInfo = {
  baseId: string;
  fillId: string;
  outlineId: string;
  defaultFill: string;
};

const SvgChunkConverter: React.FC = () => {
  const [originalSvg, setOriginalSvg] = useState("");
  const [convertedSvg, setConvertedSvg] = useState("");
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
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
        const { svg, chunks } = transformSvg(text);
        setConvertedSvg(svg);
        setChunks(chunks);
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
      setConvertedSvg("");
      setChunks([]);
      setError(null);
      return;
    }

    try {
      const { svg, chunks } = transformSvg(value);
      setConvertedSvg(svg);
      setChunks(chunks);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to parse SVG. Make sure it is valid SVG markup.");
    }
  };

  const handleDownload = () => {
    if (!convertedSvg) return;
    const blob = new Blob([convertedSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chunks-300x300.svg";
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
      <h1>SVG Chunk Converter (paths → fill + outline)</h1>

      <p>
        Any uploaded SVG:
        <br />
        <strong>
          Every &lt;path&gt; becomes TWO paths: <code>*-fill</code> (fill only) and{" "}
          <code>*-outline</code> (border only).
        </strong>
        <br />
        Change <code>fill</code> on <code>*-fill</code> and the outline will not
        change.
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
          <h2>Original SVG</h2>
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

        {/* Converted SVG */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2>Converted SVG (with *-fill + *-outline)</h2>
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

      {/* Chunks table */}
      {chunks.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Chunks (per original path)</h2>
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
                <th style={thStyle}>base id</th>
                <th style={thStyle}>fill id</th>
                <th style={thStyle}>outline id</th>
                <th style={thStyle}>default fill</th>
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
                    <code>{c.fillId}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{c.outlineId}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{c.defaultFill}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ fontSize: 12, color: "#666", marginTop: "0.5rem" }}>
            In your app, change the <code>fill</code> of <code>*-fill</code> ids only.
            Example: <code>chunk-1-fill</code> – outline <code>chunk-1-outline</code>{" "}
            stays black.
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

function transformSvg(svgString: string): { svg: string; chunks: ChunkInfo[] } {
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

  // Get all original paths
  const originalPaths = Array.from(rootSvg.querySelectorAll("path"));

  if (originalPaths.length === 0) {
    throw new Error("No <path> elements found in SVG");
  }

  // New content: we’ll replace all original paths with pairs (fill + outline)
  const newNodes: Element[] = [];
  const chunks: ChunkInfo[] = [];

  originalPaths.forEach((pathEl, index) => {
    const d = pathEl.getAttribute("d") || "";
    if (!d) return;

    const originalId = pathEl.getAttribute("id") || `chunk-${index + 1}`;
    const baseId = originalId;

    const originalFill = pathEl.getAttribute("fill") || "#FFFFFF";
    const stroke = pathEl.getAttribute("stroke") || "black";
    const strokeWidth = pathEl.getAttribute("stroke-width") || "1";

    const fillId = `${baseId}-fill`;
    const outlineId = `${baseId}-outline`;

    // CREATE FILL PATH
    const fillPath = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    fillPath.setAttribute("id", fillId);
    fillPath.setAttribute("d", d);
    fillPath.setAttribute("fill", originalFill);
    fillPath.setAttribute("stroke", "none");

    // CREATE OUTLINE PATH
    const outlinePath = doc.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    outlinePath.setAttribute("id", outlineId);
    outlinePath.setAttribute("d", d);
    outlinePath.setAttribute("fill", "none");
    outlinePath.setAttribute("stroke", stroke);
    outlinePath.setAttribute("stroke-width", strokeWidth);
    outlinePath.setAttribute("stroke-linejoin", "round");

    newNodes.push(fillPath, outlinePath);

    chunks.push({
      baseId,
      fillId,
      outlineId,
      defaultFill: originalFill,
    });

    // remove original path
    pathEl.remove();
  });

  // Append new nodes at the end of <svg>
  newNodes.forEach((node) => rootSvg.appendChild(node));

  const serializer = new XMLSerializer();
  const newSvgString = serializer.serializeToString(rootSvg);

  return { svg: newSvgString, chunks };
}

export default SvgChunkConverter;
