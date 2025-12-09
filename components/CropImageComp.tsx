import React, {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  CSSProperties,
} from "react";

const DEFAULT_SIZE = 300;

const thStyle: CSSProperties = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "0.25rem 0.5rem",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "0.25rem 0.5rem",
};

const SvgColorableConverter: React.FC = () => {
  const [originalSvg, setOriginalSvg] = useState("");
  const [convertedSvg, setConvertedSvg] = useState("");
  const [viewBox, setViewBox] = useState(`0 0 ${DEFAULT_SIZE} ${DEFAULT_SIZE}`);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState("#ff0000");
  const [pathsInfo, setPathsInfo] = useState<
    { baseId: string; fillId?: string; outlineId?: string; isClosed: boolean }[]
  >([]);

  const previewRef = useRef<HTMLDivElement | null>(null);

  // Attach click handlers to *-fill paths for coloring
  useEffect(() => {
    if (!previewRef.current) return;
    const container = previewRef.current;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const onClick = (e: Event) => {
      const el = e.target as SVGPathElement;
      if (!el || el.tagName.toLowerCase() !== "path") return;

      const id = el.getAttribute("id") || "";
      // Only allow coloring fill paths (ids that end with "-fill")
      if (!id.endsWith("-fill")) return;

      el.setAttribute("fill", color);
    };

    const fillPaths = svg.querySelectorAll('path[id$="-fill"]');
    fillPaths.forEach((p) => p.addEventListener("click", onClick));

    return () => {
      fillPaths.forEach((p) => p.removeEventListener("click", onClick));
    };
  }, [convertedSvg, color]);

  // ============ FILE UPLOAD ============

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
        const result = convertSvgToColorable(text);
        setConvertedSvg(result.svg);
        setViewBox(result.viewBox);
        setPathsInfo(result.info);
      } catch (err) {
        console.error(err);
        setError("Failed to parse/convert SVG. Make sure it is valid SVG markup.");
      }
    };
    reader.readAsText(file);
  };

  // ============ DOWNLOAD CONVERTED SVG ============

  const handleDownload = () => {
    if (!convertedSvg) return;
    const blob = new Blob([convertedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colorable.svg";
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
      <h1>SVG → Colorable SVG Converter</h1>

      <p>
        Upload an SVG. Closed paths become{" "}
        <code>*-fill</code> (fillable region) + <code>*-outline</code> (border).
        Open paths stay as outline-only. Click a region in the preview to change
        its fill color; borders stay the same.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleFileChange}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Fill color for clicks:{" "}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
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

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Preview */}
        <div>
          <h2>Preview (click fill areas)</h2>
          <div
            ref={previewRef}
            style={{
              width: 350,
              height: 350,
              border: "1px solid #ccc",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: convertedSvg }}
          />
        </div>

        {/* Converted SVG text */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <h2>Converted SVG</h2>
          <textarea
            value={convertedSvg}
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
            disabled={!convertedSvg}
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.8rem",
              cursor: convertedSvg ? "pointer" : "not-allowed",
            }}
          >
            Download Colorable SVG
          </button>
        </div>
      </div>

      {/* Info table */}
      {pathsInfo.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Paths / Regions Info</h2>
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
                <th style={thStyle}>Base Id</th>
                <th style={thStyle}>Fill Id</th>
                <th style={thStyle}>Outline Id</th>
                <th style={thStyle}>Closed?</th>
              </tr>
            </thead>
            <tbody>
              {pathsInfo.map((p, i) => (
                <tr key={p.baseId}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <code>{p.baseId}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.fillId || "-"}</code>
                  </td>
                  <td style={tdStyle}>
                    <code>{p.outlineId || "-"}</code>
                  </td>
                  <td style={tdStyle}>{p.isClosed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SvgColorableConverter;

/* ===========================================================
   Utility: convert uploaded SVG string → colorable SVG string
   - Closed paths => baseId-fill + baseId-outline
   - Open paths   => outline-only
   =========================================================== */

function convertSvgToColorable(svgText: string): {
  svg: string;
  viewBox: string;
  info: { baseId: string; fillId?: string; outlineId?: string; isClosed: boolean }[];
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

  const width = svgRoot.getAttribute("width") || String(DEFAULT_SIZE);
  const height = svgRoot.getAttribute("height") || String(DEFAULT_SIZE);
  const vbAttr = svgRoot.getAttribute("viewBox");
  const viewBox = vbAttr || `0 0 ${width} ${height}`;
  if (!vbAttr) {
    svgRoot.setAttribute("viewBox", viewBox);
  }

  const pathEls = Array.from(svgRoot.querySelectorAll("path"));

  const newNodes: Element[] = [];
  const info: { baseId: string; fillId?: string; outlineId?: string; isClosed: boolean }[] =
    [];

  pathEls.forEach((pathEl, idx) => {
    const d = pathEl.getAttribute("d") || "";
    if (!d.trim()) return;

    const baseId = pathEl.getAttribute("id") || `path-${idx + 1}`;

    // try to read stroke/fill; if style="..." is used, you may want to parse style separately
    const stroke =
      pathEl.getAttribute("stroke") ||
      // fallback for stroke:none in style
      "black";
    const strokeWidth = pathEl.getAttribute("stroke-width") || "1.5";
    const fillAttr = pathEl.getAttribute("fill");

    // crude "is closed" detection
    const isClosed = /z\s*$/i.test(d.trim());

    if (isClosed) {
      const fillId = `${baseId}-fill`;
      const outlineId = `${baseId}-outline`;

      const fillColor =
        fillAttr && fillAttr !== "none" ? fillAttr : "#FFFFFF";

      // FILL PATH
      const fillPath = doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      fillPath.setAttribute("id", fillId);
      fillPath.setAttribute("d", d);
      fillPath.setAttribute("fill", fillColor);
      fillPath.setAttribute("stroke", "none");

      // OUTLINE PATH
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
      info.push({ baseId, fillId, outlineId, isClosed: true });
    } else {
      // Outline-only path (open)
      const outlinePath = doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      outlinePath.setAttribute("id", baseId);
      outlinePath.setAttribute("d", d);
      outlinePath.setAttribute("fill", "none");
      outlinePath.setAttribute("stroke", stroke);
      outlinePath.setAttribute("stroke-width", strokeWidth);
      outlinePath.setAttribute("stroke-linejoin", "round");

      newNodes.push(outlinePath);
      info.push({ baseId, isClosed: false });
    }

    // remove original
    pathEl.remove();
  });

  newNodes.forEach((n) => svgRoot.appendChild(n));

  const serializer = new XMLSerializer();
  const svg = serializer.serializeToString(svgRoot);

  return { svg, viewBox, info };
}
