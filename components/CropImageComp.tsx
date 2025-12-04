import React, { useState } from "react";

const UploadImageExactSvg: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const svgCode = imageUrl
    ? buildSvg(imageUrl)
    : null;

  const downloadSvg = () => {
    if (!svgCode) return;

    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-image.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Upload image → SAME SVG design</h2>

      <input type="file" accept="image/*" onChange={handleUpload} />

      {svgCode && (
        <>
          <div
            style={{
              width: 300,
              height: 300,
              marginTop: 20,
              border: "1px solid #ccc",
            }}
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />

          <button onClick={downloadSvg} style={{ marginTop: 12 }}>
            Download SVG
          </button>

          <textarea
            value={svgCode}
            readOnly
            style={{
              marginTop: 16,
              width: "100%",
              height: 260,
              fontFamily: "monospace",
            }}
          />
        </>
      )}
    </div>
  );
};

export default UploadImageExactSvg;

function buildSvg(imageHref: string) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <clipPath id="flower-clip">
      <circle cx="150" cy="150" r="70"/>
      <circle cx="150" cy="55" r="35"/>
      <circle cx="217.2" cy="82.8" r="35"/>
      <circle cx="245" cy="150" r="35"/>
      <circle cx="217.2" cy="217.2" r="35"/>
      <circle cx="150" cy="245" r="35"/>
      <circle cx="82.8" cy="217.2" r="35"/>
      <circle cx="55" cy="150" r="35"/>
      <circle cx="82.8" cy="82.8" r="35"/>

      <circle cx="150" cy="150" r="40"/>

      ${Array.from({ length: 8 })
        .map(
          (_, i) =>
            `<rect x="137" y="55" width="26" height="55" rx="13" transform="rotate(${
              i * 45
            } 150 150)"/>`
        )
        .join("")}
    </clipPath>
  </defs>

  <image
    href="${imageHref}"
    width="300"
    height="300"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#flower-clip)"
  />
</svg>`;
}
