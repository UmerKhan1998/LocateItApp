import React, { useState } from "react";

type Stroke = {
  color: string;
  path: string;
  strokeWidth: number;
};

// Example: your path data
const exampleStrokes: Stroke[] = [
  {
    color: "black",
    path: "M166.5,82 L168.445068359375,82.5 L171.94305419921875,85.94305419921875 L174.44677734375,88.44677734375 L176.94491577148438,90.94491577148438 L182.44293212890625,96.94293212890625 L186.88876342773438,102.38876342773438 L192.81520080566406,108.315185546875 L194.88729858398438,111.33096313476562 L200.83502197265625,116.3900146484375 L210.34141540527344,126.34140014648438 L221.77874755859375,136.83404541015625 L227.8331298828125,141.38876342773438 L231.94715881347656,145.94717407226562 L232.75,147.75 L233.71817016601562,148.21817016601562 L234,149.43936157226562 L233.5,155.39120483398438 L233,157.88482666015625 L230.55535888671875,169.27853393554688 L229,182.77914428710938 L225.5554656982422,196.27813720703125 L223.55712890625,204.771484375 L222,214.82382202148438 L221.5,218.97296142578125 L221,220.94369506835938 L221,222.21875 L221,222.71572875976562 L221,223.5 L221,224.716796875 L221,226.44595336914062 L221,231.3897705078125 L221,237.39093017578125 L221,241.89071655273438 L220.5,246.9462890625 L220.5,251.44189453125 L220.5,252.44491577148438 L220.5,254.7244873046875 L220.5,255 L220,255.5 L218.5550994873047,256 L213.669921875,258.943359375 L201.21922302246094,264.890380859375 L185.26632690429688,271.3934631347656 L179.16627502441406,273.944580078125 L172.60813903808594,277.4459228515625 L171.051025390625,278 L169.28073120117188,279.5 L168.7777557373047,280.22222900390625 L166.05421447753906,286.8916015625 L164.0549774169922,292.3350830078125 L160.0515899658203,300.84521484375 L156.06069946289062,307.87860107421875 L152.55804443359375,312.94195556640625 L150.75,315.5 L149.75,317 L149.5,317.5 L149,318.71697998046875 L149,320.4407958984375 L148,324.8868408203125 L148,333.31964111328125 L147.5,340.88671875 L147.5,347.83123779296875 L147.5,349.89306640625 L147.5,354.88201904296875 L148,357.94287109375 L148,359.21868896484375 L148,359.7198486328125 L148,360",
    strokeWidth: 5,
  },
];

const DownloadSvgFromPaths: React.FC = () => {
  const [svgCode, setSvgCode] = useState<string>("");

  // You can pass your own strokes instead of exampleStrokes
  const strokes: Stroke[] = exampleStrokes;

  // Adjust these to your drawing's bounds
  const svgWidth = 400;
  const svgHeight = 400;

  const buildSvgString = (paths: Stroke[]): string => {
    const pathsMarkup = paths
      .map(
        (s) =>
          `<path d="${s.path}" stroke="${s.color}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      )
      .join("\n  ");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  ${pathsMarkup}
</svg>`;

    return svg;
  };

  const handleDownload = () => {
    const svg = buildSvgString(strokes);
    setSvgCode(svg);

    const blob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.wrapper}>
      <h2>Download SVG in your path format</h2>

      <button style={styles.button} onClick={handleDownload}>
        Download SVG
      </button>

      <p style={styles.hint}>SVG code (developer-friendly):</p>
      <textarea
        style={styles.textarea}
        readOnly
        value={svgCode || "// Click 'Download SVG' to generate the code"}
      />

      <p style={styles.hint}>Original JSON format (your data structure):</p>
      <pre style={styles.pre}>
        {JSON.stringify(strokes, null, 2)}
      </pre>
    </div>
  );
};

export default DownloadSvgFromPaths;

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 800,
    margin: "20px auto",
    fontFamily: "sans-serif",
  },
  button: {
    padding: "8px 16px",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "white",
    cursor: "pointer",
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: "#555",
    margin: "8px 0 4px",
  },
  textarea: {
    width: "100%",
    minHeight: 160,
    fontFamily: "monospace",
    fontSize: 12,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ddd",
    resize: "vertical",
    background: "#f9fafb",
  },
  pre: {
    padding: 8,
    background: "#111827",
    color: "#e5e7eb",
    borderRadius: 6,
    fontSize: 11,
    overflowX: "auto",
  },
};
