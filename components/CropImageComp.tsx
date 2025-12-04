import React from "react";

export interface KaabaLineChunksProps {
  width?: number;
  height?: number;

  // line chunks you can recolor
  midBandColor?: string;     // the yellow band region in your screenshot
  topBandColor?: string;     // optional extra example
}

const KaabaLineChunks: React.FC<KaabaLineChunksProps> = ({
  width = 300,
  height = 300,
  midBandColor = "#FFD54F",   // default: yellow
  topBandColor = "#000000",   // default: black
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 300"
      width={width}
      height={height}
    >
      {/* ==================== BASE OUTLINES (always black) ==================== */}

      {/* top outline */}
      <path
        d="M70 60 L230 60 L280 90 L120 90 Z"
        fill="none"
        stroke="black"
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* left face outline */}
      <path
        d="M70 60 L120 90 L120 240 L70 210 Z"
        fill="none"
        stroke="black"
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* right/front face outline */}
      <path
        d="M120 90 L280 90 L280 240 L120 240 Z"
        fill="none"
        stroke="black"
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* inner panel outlines etc… (kept simple here) */}
      <rect
        x={135}
        y={185}
        width={40}
        height={55}
        fill="none"
        stroke="black"
        strokeWidth={4}
      />

      {/* ================= LINE CHUNK: TOP BAND (stroke only) ================= */}

      {/* this band goes around the cube; recolor with topBandColor */}
      <g
        id="kaaba-top-band"
        fill="none"
        stroke={topBandColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* front band segment */}
        <path d="M120 115 H280" />
        {/* left band segment */}
        <path d="M70 105 L120 115" />
      </g>

      {/* ========== LINE CHUNK: MIDDLE BAND (yellow region in screenshot) ===== */}

      {/* one group that you recolor; everything inside uses midBandColor */}
      <g
        id="kaaba-mid-band"
        fill="none"
        stroke={midBandColor}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* front middle band outline (closed rectangle) */}
        <path d="M150 140 H260 V165 H150 Z" />

        {/* short segments on left/right that belong to same color chunk */}
        <path d="M120 145 H145" />
        <path d="M260 145 H275" />
      </g>

      {/* ==================== OTHER DETAIL LINES (black) ===================== */}

      {/* small dashes that stay black */}
      <g
        id="kaaba-dashes"
        fill="none"
        stroke="black"
        strokeWidth={4}
        strokeLinecap="round"
      >
        <path d="M135 170 H155" />
        <path d="M170 170 H190" />
        <path d="M205 170 H225" />
      </g>
    </svg>
  );
};

export default KaabaLineChunks;
