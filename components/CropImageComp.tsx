import React, { useEffect, useRef, useState, ChangeEvent } from "react";

export default function SimpleSvgFillColor() {
  const [svgText, setSvgText] = useState("");
  const [color, setColor] = useState("#ff0000");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach click handlers to SVG paths
  useEffect(() => {
    if (!containerRef.current) return;

    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const onClick = (e: Event) => {
      const el = e.target as SVGElement;
      if (el.tagName !== "path") return;

      // ONLY change fill, never stroke
      el.setAttribute("fill", color);
    };

    const paths = svg.querySelectorAll("path");
    paths.forEach((p) => p.addEventListener("click", onClick));

    return () => {
      paths.forEach((p) => p.removeEventListener("click", onClick));
    };
  }, [svgText, color]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("svg")) {
      setError("Upload a valid SVG file");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => setSvgText(reader.result as string);
    reader.readAsText(file);
  };

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>
      <h2>SVG Fill Color Tool</h2>

      <input type="file" accept=".svg" onChange={handleFileUpload} />

      <br /><br />

      <label>
        Color:
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ marginLeft: 10 }}
        />
      </label>

      {error && (
        <div style={{ color: "red", marginTop: 10 }}>{error}</div>
      )}

      <div
        ref={containerRef}
        style={{
          marginTop: 20,
          width: 350,
          height: 350,
          border: "1px solid #ccc",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: svgText }}
      />
    </div>
  );
}
