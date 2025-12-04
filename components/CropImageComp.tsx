import React, { useState } from "react";

const FLOWER_SVG_STRING = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="300"
     height="300"
     viewBox="0 0 300 300"
     fill="none">

  <!-- Background -->
  <rect x="0" y="0" width="300" height="300" fill="white"/>

  <!-- Outer black flower -->
  <g fill="black">
    <!-- Center body -->
    <circle cx="150" cy="150" r="70"/>

    <!-- Outer lobes -->
    <circle cx="150" cy="50" r="36"/>
    <circle cx="225" cy="75" r="36"/>
    <circle cx="250" cy="150" r="36"/>
    <circle cx="225" cy="225" r="36"/>
    <circle cx="150" cy="250" r="36"/>
    <circle cx="75" cy="225" r="36"/>
    <circle cx="50" cy="150" r="36"/>
    <circle cx="75" cy="75" r="36"/>
  </g>

  <!-- Inner white cutout -->
  <g fill="white">
    <!-- Center hole -->
    <circle cx="150" cy="150" r="40"/>

    <!-- 8 rounded spokes -->
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(0 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(45 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(90 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(135 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(180 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(225 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(270 150 150)"/>
    <rect x="138" y="45" width="24" height="65" rx="12" transform="rotate(315 150 150)"/>

    <!-- White caps -->
    <circle cx="150" cy="50" r="18"/>
    <circle cx="225" cy="75" r="18"/>
    <circle cx="250" cy="150" r="18"/>
    <circle cx="225" cy="225" r="18"/>
    <circle cx="150" cy="250" r="18"/>
    <circle cx="75" cy="225" r="18"/>
    <circle cx="50" cy="150" r="18"/>
    <circle cx="75" cy="75" r="18"/>
  </g>

</svg>
`;

const UploadToFlowerSvg: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasConverted, setHasConverted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setHasConverted(true); // trigger “conversion” into SVG design
    };
    reader.readAsDataURL(file);
  };

  const downloadSvg = () => {
    const blob = new Blob([FLOWER_SVG_STRING], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "flower-logo.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 24,
      }}
    >
      <h1 style={{ marginBottom: 16 }}>Upload → Flower/Snowflake SVG</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: 16 }}
      />

      {!hasConverted && (
        <p style={{ marginTop: 8, color: "#555" }}>
          Upload your logo image (PNG/JPG). It will show the vector SVG version
          of this flower/snowflake design and the SVG code.
        </p>
      )}

      {imageUrl && (
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Uploaded image preview */}
          <div>
            <h2 style={{ marginBottom: 8 }}>Uploaded Image</h2>
            <div
              style={{
                width: 300,
                height: 300,
                border: "1px solid #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f9f9f9",
              }}
            >
              <img
                src={imageUrl}
                alt="Uploaded"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {/* Flower/Snowflake SVG preview */}
          <div>
            <h2 style={{ marginBottom: 8 }}>Converted SVG Design</h2>
            <div
              style={{
                width: 300,
                height: 300,
                border: "1px solid #ccc",
                background: "white",
              }}
              dangerouslySetInnerHTML={{ __html: FLOWER_SVG_STRING }}
            />
            <button
              type="button"
              onClick={downloadSvg}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontSize: 14,
              }}
            >
              Download SVG
            </button>
          </div>
        </div>
      )}

      {hasConverted && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 8 }}>SVG Code</h2>
          <textarea
            readOnly
            value={FLOWER_SVG_STRING}
            style={{
              width: "100%",
              height: 260,
              fontFamily: "monospace",
              fontSize: 12,
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default UploadToFlowerSvg;
