import React, { useRef, useState } from "react";

export default function SvgRegionFillTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [baseSvg, setBaseSvg] = useState<string>("");
  const [fillRect, setFillRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [fillColor, setFillColor] = useState("#FFD700");

  // ====== LOAD SVG FILE ======
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBaseSvg(reader.result as string);
    reader.readAsText(file);
  };

  // ====== HANDLE SVG CLICK (DEFINE REGION) ======
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 300);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 300);

    // Fixed-size region (safe + predictable)
    setFillRect({ x: x - 40, y: y - 30, w: 80, h: 60 });
  };

  // ====== FINAL SVG OUTPUT ======
  const finalSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">

  ${
    fillRect
      ? `<rect
          id="region-fill"
          x="${fillRect.x}"
          y="${fillRect.y}"
          width="${fillRect.w}"
          height="${fillRect.h}"
          fill="${fillColor}"
          stroke="none"
        />`
      : ""
  }

  <!-- ORIGINAL SVG (LINES ON TOP) -->
  ${baseSvg}

</svg>
`;

  const downloadSvg = () => {
    const blob = new Blob([finalSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "final-colored.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>SVG Region Fill Tool (FULL VERSION)</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      <p>
        ✅ Click on SVG to select fill area <br />
        ✅ Fill is applied UNDER outlines <br />
        ✅ Lines stay black
      </p>

      <label>
        Fill Color:
        <input
          type="color"
          value={fillColor}
          onChange={(e) => setFillColor(e.target.value)}
        />
      </label>

      <div
        style={{
          border: "1px solid #ccc",
          width: 300,
          height: 300,
          marginTop: 10,
        }}
      >
        {baseSvg && (
          <svg
            viewBox="0 0 300 300"
            width="300"
            height="300"
            onClick={handleSvgClick}
            dangerouslySetInnerHTML={{
              __html: `
                ${
                  fillRect
                    ? `<rect x="${fillRect.x}" y="${fillRect.y}"
                             width="${fillRect.w}" height="${fillRect.h}"
                             fill="${fillColor}" opacity="0.6" />`
                    : ""
                }
                ${baseSvg}
              `,
            }}
          />
        )}
      </div>

      <h3>Final SVG Output</h3>
      <textarea
        rows={10}
        style={{ width: "100%" }}
        value={finalSvg}
        readOnly
      />

      <button onClick={downloadSvg}>Download SVG</button>
    </div>
  );
}
