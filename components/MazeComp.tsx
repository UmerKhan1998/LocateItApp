import React, { useState } from "react";

type CellValue = 0 | 1;

type Tool = "wall" | "start" | "end" | "erase";

interface MazeConfiguratorProps {
  characterImgSrc?: string;
  goalImgSrc?: string;
  rows?: number;
  cols?: number;
}

interface Position {
  row: number;
  col: number;
}

const MazeConfigurator: React.FC<MazeConfiguratorProps> = ({
  characterImgSrc = "https://via.placeholder.com/32?text=P", // character image
  goalImgSrc = "https://via.placeholder.com/32?text=G", // goal image
  rows = 10,
  cols = 10,
}) => {
  // 0 = walkable, 1 = wall
  const [matrix, setMatrix] = useState<CellValue[][]>(
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0)
    )
  );

  const [tool, setTool] = useState<Tool>("wall");
  const [start, setStart] = useState<Position | null>(null);
  const [end, setEnd] = useState<Position | null>(null);

  const handleCellClick = (row: number, col: number) => {
    setMatrix((prev) => {
      const copy = prev.map((r) => [...r]);
      const current = copy[row][col];

      if (tool === "wall") {
        copy[row][col] = current === 1 ? 0 : 1;
        // if making a wall, clear start/end if they were here
        if (start && start.row === row && start.col === col) setStart(null);
        if (end && end.row === row && end.col === col) setEnd(null);
      } else if (tool === "erase") {
        copy[row][col] = 0;
        if (start && start.row === row && start.col === col) setStart(null);
        if (end && end.row === row && end.col === col) setEnd(null);
      } else if (tool === "start") {
        // start must be on walkable cell
        copy[row][col] = 0;
        setStart({ row, col });
      } else if (tool === "end") {
        // end must be on walkable cell
        copy[row][col] = 0;
        setEnd({ row, col });
      }

      return copy;
    });
  };

  const resetMaze = () => {
    setMatrix(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0)
      )
    );
    setStart(null);
    setEnd(null);
    setTool("wall");
  };

  const exportConfig = () => {
    const config = {
      matrix,
      start,
      end,
    };
    console.log("Maze config:", config);
    alert("Maze config logged to console");
  };

  const isStart = (row: number, col: number) =>
    start && start.row === row && start.col === col;
  const isEnd = (row: number, col: number) =>
    end && end.row === row && end.col === col;

  return (
    <div className="maze-configurator" style={styles.container}>
      {/* Controls */}
      <div style={styles.sidebar}>
        <h2 style={styles.heading}>Maze Configurator (10 x 10)</h2>

        <div style={styles.section}>
          <h3 style={styles.subheading}>Tools</h3>
          <div style={styles.toolsRow}>
            <button
              style={{
                ...styles.button,
                ...(tool === "wall" ? styles.buttonActive : {}),
              }}
              onClick={() => setTool("wall")}
            >
              Wall (1)
            </button>
            <button
              style={{
                ...styles.button,
                ...(tool === "erase" ? styles.buttonActive : {}),
              }}
              onClick={() => setTool("erase")}
            >
              Erase (0)
            </button>
          </div>
          <div style={styles.toolsRow}>
            <button
              style={{
                ...styles.button,
                ...(tool === "start" ? styles.buttonActive : {}),
              }}
              onClick={() => setTool("start")}
            >
              Set Start
            </button>
            <button
              style={{
                ...styles.button,
                ...(tool === "end" ? styles.buttonActive : {}),
              }}
              onClick={() => setTool("end")}
            >
              Set End
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.subheading}>Info</h3>
          <p style={styles.infoText}>
            <strong>Start:</strong>{" "}
            {start ? `(${start.row}, ${start.col})` : "Not set"}
          </p>
          <p style={styles.infoText}>
            <strong>End:</strong>{" "}
            {end ? `(${end.row}, ${end.col})` : "Not set"}
          </p>
        </div>

        <div style={styles.section}>
          <button style={styles.secondaryButton} onClick={resetMaze}>
            Reset Maze
          </button>
          <button style={styles.primaryButton} onClick={exportConfig}>
            Export Config (console.log)
          </button>
        </div>
      </div>

      {/* Grid + Preview */}
      <div style={styles.mainArea}>
        <div style={styles.gridWrapper}>
          <div
            style={{
              ...styles.grid,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
            }}
          >
            {matrix.map((rowArr, row) =>
              rowArr.map((cell, col) => {
                const wall = cell === 1;
                const startHere = isStart(row, col);
                const endHere = isEnd(row, col);

                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      ...styles.cell,
                      ...(wall ? styles.wallCell : styles.pathCell),
                      ...(startHere ? styles.startCell : {}),
                      ...(endHere ? styles.endCell : {}),
                    }}
                    onClick={() => handleCellClick(row, col)}
                  >
                    {startHere && (
                      <img
                        src={characterImgSrc}
                        alt="Start"
                        style={styles.cellImage}
                      />
                    )}
                    {endHere && (
                      <img
                        src={goalImgSrc}
                        alt="Goal"
                        style={styles.cellImage}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p style={styles.caption}>Click cells to edit the maze.</p>
        </div>

        <div style={styles.section}>
          <h3 style={styles.subheading}>Matrix Output (0 = path, 1 = wall)</h3>
          <pre style={styles.codeBlock}>
            {JSON.stringify(
              {
                matrix,
                start,
                end,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Simple inline styles to keep it self-contained
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    gap: "24px",
    padding: "16px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    width: "260px",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
    background: "#ffffff",
  },
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  heading: {
    fontSize: "18px",
    margin: "0 0 12px",
  },
  subheading: {
    fontSize: "14px",
    margin: "0 0 8px",
  },
  section: {
    marginTop: "16px",
  },
  toolsRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
  },
  button: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: "999px",
    border: "1px solid #cbd5f5",
    background: "#f8fafc",
    fontSize: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  buttonActive: {
    background: "#2563eb",
    color: "#ffffff",
    borderColor: "#1d4ed8",
  },
  primaryButton: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "8px",
  },
  secondaryButton: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    fontSize: "13px",
    cursor: "pointer",
  },
  infoText: {
    fontSize: "13px",
    margin: "4px 0",
  },
  gridWrapper: {
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "12px",
    background: "#ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
    display: "inline-block",
  },
  grid: {
    display: "grid",
    width: "360px",
    height: "360px",
    gap: "2px",
    background: "#cbd5f5",
    padding: "2px",
    borderRadius: "12px",
  },
  cell: {
    position: "relative",
    borderRadius: "6px",
    cursor: "pointer",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    userSelect: "none",
  },
  wallCell: {
    background: "#1e293b",
  },
  pathCell: {
    background: "#e5e7eb",
  },
  startCell: {
    outline: "2px solid #22c55e",
    boxShadow: "0 0 0 1px #16a34a inset",
  },
  endCell: {
    outline: "2px solid #f97316",
    boxShadow: "0 0 0 1px #ea580c inset",
  },
  cellImage: {
    width: "70%",
    height: "70%",
    objectFit: "contain",
    pointerEvents: "none",
  },
  caption: {
    fontSize: "12px",
    marginTop: "8px",
    color: "#6b7280",
  },
  codeBlock: {
    fontSize: "11px",
    background: "#0f172a",
    color: "#e5e7eb",
    padding: "12px",
    borderRadius: "12px",
    maxHeight: "220px",
    overflow: "auto",
  },
};

export default MazeConfigurator;
