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

  useEffect(() => {
    if (!previewRef.current) return;
    const container = previewRef.current;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const onClick = (e: Event) => {
      const el = e.target as SVGPathElement;
      if (!el || el.tagName.toLowerCase() !== "path") return;
      const id = el.getAttribute("id") || "";

      if (id.endsWith("-fill")) {
        el.setAttribute("fill", color);
      }
    };

    const fillPaths = svg.querySelectorAll('path[id$="-fill"]');
    fillPaths.forEach((p) => p.addEventListener("click", onClick));

    return () => {
      fillPaths.forEach((p) => p.removeEventListener("click", onClick));
    };
  }, [convertedSvg, color]);

  // ------------------------------
  // FILE UPLOAD
  // ------------------------------
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
        setError("Failed to parse/convert SVG.");
      }
    };
    reader.readAsText(file);
  };

  // ------------------------------
  // DOWNLOAD
  // ------------------------------
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
      <h1>SVG → Colorable SVG Converter (Background Removed)</h1>

      <input type="file" accept=".svg,image/svg+xml" onChange={handleFileChange} />

      <div>
        <label>
          Fill color:
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem" }}>
        <div>
          <h2>Preview</h2>
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

        <div style={{ flex: 1 }}>
          <h2>Converted SVG</h2>
          <textarea
            value={convertedSvg}
            readOnly
            style={{ width: "100%", minHeight: 260 }}
          />
          <button onClick={handleDownload}>Download SVG</button>
        </div>
      </div>
    </div>
  );
};

export default SvgColorableConverter;

/* ===========================================================
   UTILITY: Convert uploaded SVG → colorable SVG
   + Removes background FIRST
   =========================================================== */

function convertSvgToColorable(svgText: string): {
  svg: string;
  viewBox: string;
  info: { baseId: string; fillId?: string; outlineId?: string; isClosed: boolean }[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgRoot = doc.querySelector("svg");
  if (!svgRoot) throw new Error("Invalid SVG");

  // -------------------------------------------------
  // REMOVE BACKGROUNDS
  // -------------------------------------------------
  const rects = Array.from(svgRoot.querySelectorAll("rect"));
  rects.forEach((r) => {
    const x = Number(r.getAttribute("x") || 0);
    const y = Number(r.getAttribute("y") || 0);
    const w = Number(r.getAttribute("width") || 0);
    const h = Number(r.getAttribute("height") || 0);

    // If this rect covers most of the canvas → background
    if (w > 50 && h > 50) {
      r.remove();
    }
  });

  // remove full-rect paths
  const paths = Array.from(svgRoot.querySelectorAll("path"));
  paths.forEach((p) => {
    const d = p.getAttribute("d") || "";
    if (/^M\s*0/i.test(d) && /Z$/i.test(d)) {
      p.remove();
    }
  });

  // remove elements with 100% fill-opacity:0
  const all = Array.from(svgRoot.querySelectorAll("*"));
  all.forEach((el) => {
    const op = el.getAttribute("fill-opacity");
    if (op === "0" || op === "0.0") {
      el.remove();
    }
  });

  // -------------------------------------------------
  // NOW PROCESS REMAINING PATHS
  // -------------------------------------------------
  const width = svgRoot.getAttribute("width") || DEFAULT_SIZE.toString();
  const height = svgRoot.getAttribute("height") || DEFAULT_SIZE.toString();

  const vbAttr = svgRoot.getAttribute("viewBox");
  const viewBox = vbAttr || `0 0 ${width} ${height}`;

  if (!vbAttr) {
    svgRoot.setAttribute("viewBox", viewBox);
  }

  const remainingPaths = Array.from(svgRoot.querySelectorAll("path"));
  const newNodes: Element[] = [];
  const info: {
    baseId: string;
    fillId?: string;
    outlineId?: string;
    isClosed: boolean;
  }[] = [];

  remainingPaths.forEach((p, idx) => {
    const d = p.getAttribute("d") || "";
    if (!d.trim()) return;

    const baseId = p.getAttribute("id") || `path-${idx + 1}`;
    const stroke = p.getAttribute("stroke") || "black";
    const sw = p.getAttribute("stroke-width") || "1.5";
    const fillAttr = p.getAttribute("fill");
    const isClosed = /z\s*$/i.test(d.trim());

    if (isClosed) {
      const fillId = `${baseId}-fill`;
      const outlineId = `${baseId}-outline`;

      const fillColor = fillAttr && fillAttr !== "none" ? fillAttr : "#FFFFFF";

      const fillPath = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      fillPath.setAttribute("id", fillId);
      fillPath.setAttribute("d", d);
      fillPath.setAttribute("fill", fillColor);
      fillPath.setAttribute("stroke", "none");

      const outline = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      outline.setAttribute("id", outlineId);
      outline.setAttribute("d", d);
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", stroke);
      outline.setAttribute("stroke-width", sw);

      newNodes.push(fillPath, outline);
      info.push({ baseId, fillId, outlineId, isClosed: true });
    } else {
      const outline = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      outline.setAttribute("id", baseId);
      outline.setAttribute("d", d);
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", stroke);
      outline.setAttribute("stroke-width", sw);
      newNodes.push(outline);
      info.push({ baseId, isClosed: false });
    }

    p.remove();
  });

  newNodes.forEach((node) => svgRoot.appendChild(node));
  const serializer = new XMLSerializer();
  return { svg: serializer.serializeToString(svgRoot), viewBox, info };
}
