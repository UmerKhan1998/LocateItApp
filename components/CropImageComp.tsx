import React, { useState } from "react";

type CellValue = 0 | 1;
type Tool = "wall" | "start" | "end" | "erase";

interface Position {
  row: number;
  col: number;
}

const GRID_SIZE = 10;

const MazeConfigurator: React.FC = () => {
  const [matrix, setMatrix] = useState<CellValue[][]>(
    Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 0)
    )
  );

  const [tool, setTool] = useState<Tool>("wall");
  const [start, setStart] = useState<Position | null>(null);
  const [end, setEnd] = useState<Position | null>(null);

  const [characterImg, setCharacterImg] = useState<string | null>(null);
  const [endImg, setEndImg] = useState<string | null>(null);

  // image upload handler
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "character" | "end"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === "character") setCharacterImg(reader.result as string);
      else setEndImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCellClick = (row: number, col: number) => {
    setMatrix((prev) => {
      const copy = prev.map((r) => [...r]);

      if (tool === "wall") {
        copy[row][col] = copy[row][col] === 1 ? 0 : 1;
      } else if (tool === "erase") {
        copy[row][col] = 0;
        if (start?.row === row && start.col === col) setStart(null);
        if (end?.row === row && end.col === col) setEnd(null);
      } else if (tool === "start") {
        copy[row][col] = 0;
        setStart({ row, col });
      } else if (tool === "end") {
        copy[row][col] = 0;
        setEnd({ row, col });
      }
      return copy;
    });
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2>Maze Admin</h2>

        <h4>Tools</h4>
        {["wall", "erase", "start", "end"].map((t) => (
          <button
            key={t}
            style={{
              ...styles.button,
              background: tool === t ? "#2563eb" : "#f1f5f9",
              color: tool === t ? "white" : "black",
            }}
            onClick={() => setTool(t as Tool)}
          >
            {t.toUpperCase()}
          </button>
        ))}

        <h4>Upload Images</h4>

        <label>
          Character Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "character")}
          />
        </label>

        {characterImg && (
          <img src={characterImg} style={styles.preview} />
        )}

        <label>
          End Point Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "end")}
          />
        </label>

        {endImg && <img src={endImg} style={styles.preview} />}

        <h4>Export</h4>
        <pre style={styles.code}>
{JSON.stringify(
  {
    matrix,
    start,
    end,
    characterImg,
    endImg,
  },
  null,
  2
)}
        </pre>
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            const isStart = start?.row === r && start.col === c;
            const isEnd = end?.row === r && end.col === c;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  ...styles.cell,
                  background: cell === 1 ? "#020617" : "#e5e7eb",
                }}
              >
                {isStart && characterImg && (
                  <img src={characterImg} style={styles.cellImg} />
                )}
                {isEnd && endImg && (
                  <img src={endImg} style={styles.cellImg} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MazeConfigurator;

/* Styles */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: 20,
    padding: 20,
    fontFamily: "sans-serif",
  },
  sidebar: {
    width: 300,
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 36px)",
    gridTemplateRows: "repeat(10, 36px)",
    gap: 2,
  },
  cell: {
    width: 36,
    height: 36,
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cellImg: {
    width: "75%",
    height: "75%",
    pointerEvents: "none",
    objectFit: "contain",
  },
  button: {
    width: "100%",
    marginBottom: 6,
    padding: 6,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
  },
  preview: {
    width: 60,
    height: 60,
    objectFit: "contain",
    marginTop: 6,
    display: "block",
  },
  code: {
    fontSize: 10,
    background: "#020617",
    color: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    maxHeight: 200,
    overflow: "auto",
  },
};
