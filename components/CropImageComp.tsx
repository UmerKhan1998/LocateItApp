import React, {
  useState,
  useRef,
  ChangeEvent,
  CSSProperties,
  FC,
} from "react";

const DEFAULT_SIZE = 300;

type RegionChunk = {
  baseId: string;
  d: string;
  stroke: string;
  strokeWidth: string;
  fill: string; // current fill color
};

type OutlineOnlyPath = {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: string;
};

const thStyle: CSSProperties = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "0.25rem 0.5rem",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "0.25rem 0.5rem",
};

const SvgColorRegionEditor: FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewBox, setViewBox] = useState<string>(
    `0 0 ${DEFAULT_SIZE} ${DEFAULT_SIZE}`
  );
  const [regions, setRegions] = useState<RegionChunk[]>([]);
  const [otherPaths, setOtherPaths] = useState<OutlineOnlyPath[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============= FILE UPLOAD =============
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
        const { viewBox, regions, otherPaths } = parseSvg(text);
        setViewBox(viewBox);
        setRegions(regions);
        setOtherPaths(otherPaths);
        setSelectedId(null);
      } catch (err) {
        console.error(err);
        setError("Failed to parse SVG. Make sure it is valid SVG markup.");
      }
    };
    reader.readAsText(file);
  };

  // ============= PARSE SVG INTO REGIONS + OTHER PATHS =============
  function parseSvg(svgText: string): {
    viewBox: string;
    regions: RegionChunk[];
    otherPaths: OutlineOnlyPath[];
  } {
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

    const paths = Array.from(svgRoot.querySelectorAll("path"));
    if (paths.length === 0) {
      throw new Error("No <path> elements found in SVG.");
    }

    const regions: RegionChunk[] = [];
    const others: OutlineOnlyPath[] = [];

    paths.forEach((p, index) => {
      const d = p.getAttribute("d") || "";
      if (!d) return;

      const id = p.getAttribute("id") || `path-${index + 1}`;
      const stroke = p.getAttribute("stroke") || "black";
      const strokeWidth = p.getAttribute("stroke-width") || "1.5";
      const fillAttr = p.getAttribute("fill");

      // crude "is closed" detection: path ends with Z or z
      const isClosed = /z\s*$/i.test(d.trim());

      if (isClosed) {
        // CLOSED PATH → fillable region
        const defaultFill =
          fillAttr && fillAttr !== "none" ? fillAttr : "#FFFFFF";

        regions.push({
          baseId: id,
          d,
          stroke,
          strokeWidth,
          fill: defaultFill,
        });
      } else {
        // OPEN PATH → outline only, never filled
        others.push({
          id,
          d,
          stroke,
          strokeWidth,
        });
      }
    });

    return { viewBox: finalViewBox, regions, otherPaths: others };
  }

  // ============= HANDLE COLOR CHANGE =============
  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!selectedId) return;
    setRegions((prev) =>
      prev.map((r) =>
        r.baseId === selectedId
          ? {
              ...r,
              fill: color,
            }
          : r
      )
    );
  };

  // ============= BUILD FINAL SVG (FOR EXPORT) =============
  const buildFinalSvg = (): string => {
    const regionLines = regions
      .map((r) => {
        const fillId = `${r.baseId}-fill`;
        const outlineId = `${r.baseId}-outline`;

        return [
          `  <!-- region: ${r.baseId} -->`,
          `  <path id="${fillId}" d="${r.d}" fill="${r.fill}" stroke="none" />`,
          `  <path id="${outlineId}" d="${r.d}" fill="none" stroke="${r.stroke}" stroke-width="${r.strokeWidth}" stroke-linejoin="round" />`,
        ].join("\n");
      })
      .join("\n");

    const otherLines = otherPaths
      .map(
        (p) =>
          `  <path id="${p.id}" d="${p.d}" fill="none" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="round" />`
      )
      .join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
      regionLines,
      otherLines,
      `</svg>`,
    ].join("\n");
  };

  const finalSvg = buildFinalSvg();

  // ============= DOWNLOAD HANDLER =============
  const handleDownload = () => {
    if (!regions.length && !otherPaths.length) return;

    const blob = new Blob([finalSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colored-regions.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ============= RENDER =============
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1200,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <h1>SVG Region Color Editor (fill under border)</h1>

      <p>
        <strong>Important:</strong> Only <b>closed paths</b> (paths whose{" "}
        <code>d</code> ends with <code>Z</code>) are treated as colorable
        regions. Open paths remain border lines only.
        <br />
        Upload a Kaaba line SVG where each panel you want to fill is a closed
        shape.
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
            Selected region: <code>{selectedId}</code>
          </span>
          <input type="color" onChange={handleColorChange} />
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Preview */}
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
            {regions.length || otherPaths.length ? (
              <svg
                viewBox={viewBox}
                width={300}
                height={300}
                style={{ cursor: "pointer" }}
              >
                {/* fill regions (fill + outline) */}
                {regions.map((r) => {
                  const selected = r.baseId === selectedId;
                  return (
                    <g
                      key={r.baseId}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(r.baseId);
                      }}
                    >
                      {/* fill under outline */}
                      <path d={r.d} fill={r.fill} stroke="none" />
                      {/* outline */}
                      <path
                        d={r.d}
                        fill="none"
                        stroke={r.stroke}
                        strokeWidth={r.strokeWidth}
                        strokeLinejoin="round"
                      />
                      {/* highlight if selected */}
                      {selected && (
                        <path
                          d={r.d}
                          fill="none"
                          stroke="#00B8D4"
                          strokeWidth={Number(r.strokeWidth) + 2}
                          strokeLinejoin="round"
                          opacity={0.5}
                        />
                      )}
                    </g>
                  );
                })}

                {/* other outline-only paths */}
                {otherPaths.map((p) => (
                  <path
                    key={p.id}
                    d={p.d}
                    fill="none"
                    stroke={p.stroke}
                    strokeWidth={p.strokeWidth}
                    strokeLinejoin="round"
                  />
                ))}
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
            disabled={!regions.length && !otherPaths.length}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.8rem",
              cursor:
                regions.length || otherPaths.length ? "pointer" : "not-allowed",
            }}
          >
            Download SVG
          </button>
        </div>
      </div>

      {/* Regions table */}
      {regions.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Colorable Regions (closed paths)</h2>
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
                <th style={thStyle}>Fill</th>
                <th style={thStyle}>Stroke</th>
                <th style={thStyle}>Stroke width</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r, i) => (
                <tr key={r.baseId}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <code>{r.baseId}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{r.fill}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{r.stroke}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{r.strokeWidth}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#666", marginTop: "0.5rem" }}>
            In your mobile app, you can change the fill of each region by id:
            this component exports <code>&lt;path&gt;</code>s with ids{" "}
            <code>region-id-fill</code> (for color) and{" "}
            <code>region-id-outline</code> (for the fixed border).
          </p>
        </div>
      )}
    </div>
  );
};

export default SvgColorRegionEditor;
