import React, { useState, useEffect, useRef } from "react";

type CellValue = 0 | 1;
type Tool = "wall" | "start" | "end" | "erase";
type Mode = "edit" | "play" | "finished";

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

  const [characterImg, setCharacterImg] = useState<string | null>(null); // start/player image
  const [arrivalImg, setArrivalImg] = useState<string | null>(null);     // end/goal image

  const [mode, setMode] = useState<Mode>("edit");
  const [playerPos, setPlayerPos] = useState<Position | null>(null);
  const [steps, setSteps] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // image upload handler
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "character" | "arrival"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === "character") setCharacterImg(reader.result as string);
      else setArrivalImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCellClick = (row: number, col: number) => {
    if (mode !== "edit") return;

    const isStartCell = start?.row === row && start.col === col;
    const isEndCell = end?.row === row && end.col === col;

    setMatrix((prev) => {
      const copy = prev.map((r) => [...r]);

      if (tool === "wall") {
        // ❌ Do NOT allow wall on start or end cell
        if (isStartCell || isEndCell) {
          return prev; // no change
        }
        copy[row][col] = copy[row][col] === 1 ? 0 : 1;
      } else if (tool === "erase") {
        copy[row][col] = 0;
        if (isStartCell) setStart(null);
        if (isEndCell) setEnd(null);
      } else if (tool === "start") {
        // Don't allow start and end on same cell
        if (isEndCell) {
          alert("Start and End cannot be on the same cell.");
          return prev;
        }
        copy[row][col] = 0;
        setStart({ row, col });
      } else if (tool === "end") {
        // Don't allow end and start on same cell
        if (isStartCell) {
          alert("Start and End cannot be on the same cell.");
          return prev;
        }
        copy[row][col] = 0;
        setEnd({ row, col });
      }

      return copy;
    });
  };

  const handleStartGame = () => {
    if (!start || !end) {
      alert("Please set both START and END positions before playing.");
      return;
    }
    if (!characterImg || !arrivalImg) {
      alert("Please upload CHARACTER and ARRIVAL images before playing.");
      return;
    }

    setPlayerPos(start);
    setSteps(0);
    setElapsedMs(0);
    setMode("play");
  };

  const handleBackToEdit = () => {
    setMode("edit");
    setPlayerPos(null);
    setSteps(0);
    setElapsedMs(0);
  };

  // timer
  useEffect(() => {
    if (mode === "play") {
      startTimeRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current != null) {
          setElapsedMs(performance.now() - startTimeRef.current);
        }
      }, 100);
    } else {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode]);

  // keyboard movement
  useEffect(() => {
    if (mode !== "play") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerPos) return;

      let dRow = 0;
      let dCol = 0;

      switch (e.key) {
        case "ArrowUp":
          dRow = -1;
          break;
        case "ArrowDown":
          dRow = 1;
          break;
        case "ArrowLeft":
          dCol = -1;
          break;
        case "ArrowRight":
          dCol = 1;
          break;
        default:
          return;
      }

      e.preventDefault();

      const newRow = playerPos.row + dRow;
      const newCol = playerPos.col + dCol;

      // bounds
      if (
        newRow < 0 ||
        newRow >= GRID_SIZE ||
        newCol < 0 ||
        newCol >= GRID_SIZE
      ) {
        return;
      }

      // wall
      if (matrix[newRow][newCol] === 1) return;

      setPlayerPos({ row: newRow, col: newCol });
      setSteps((prev) => prev + 1);

      if (end && newRow === end.row && newCol === end.col) {
        setMode("finished");
        const timeSec = ((elapsedMs ?? 0) / 1000).toFixed(1);
        alert(`🎉 Reached the goal!\nSteps: ${steps + 1}\nTime: ${timeSec}s`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, playerPos, matrix, end, steps, elapsedMs]);

  // matrix text output
  const generateRowColumnOutput = (m: number[][]): string => {
    const lines: string[] = [];
    for (let row = 0; row < m.length; row++) {
      for (let col = 0; col < m[row].length; col++) {
        lines.push(`row${row + 1},column${col + 1} : ${m[row][col]}`);
      }
    }
    return lines.join("\n");
  };

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2>Maze Admin</h2>

        <p>
          Mode:{" "}
          <strong>
            {mode === "edit"
              ? "Edit"
              : mode === "play"
              ? "Playing"
              : "Finished"}
          </strong>
        </p>

        <h4>Tools (Edit Only)</h4>
        {["wall", "erase", "start", "end"].map((t) => (
          <button
            key={t}
            style={{
              ...styles.button,
              background: tool === t ? "#2563eb" : "#f1f5f9",
              color: tool === t ? "white" : "black",
              opacity: mode === "edit" ? 1 : 0.5,
              pointerEvents: mode === "edit" ? "auto" : "none",
            }}
            onClick={() => setTool(t as Tool)}
          >
            {t.toUpperCase()}
          </button>
        ))}

        <h4>Upload Images</h4>

        <label>
          Character (Start / Player) Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "character")}
          />
        </label>
        {characterImg && <img src={characterImg} style={styles.preview} />}

        <label>
          Arrival (End / Goal) Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "arrival")}
          />
        </label>
        {arrivalImg && <img src={arrivalImg} style={styles.preview} />}

        <h4>Game Controls</h4>
        <button
          style={{
            ...styles.button,
            background: "#16a34a",
            color: "white",
            marginBottom: 4,
          }}
          onClick={handleStartGame}
        >
          Save & Start Game
        </button>
        <button
          style={{
            ...styles.button,
            background: "#e5e7eb",
            color: "#111827",
          }}
          onClick={handleBackToEdit}
        >
          Back to Edit
        </button>

        <h4>Stats</h4>
        <p>Steps: {steps}</p>
        <p>Time: {seconds}s</p>

        <h4>Export (Matrix)</h4>
        <pre style={styles.code}>
{generateRowColumnOutput(matrix as number[][])}
        </pre>
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            const isStart = start?.row === r && start.col === c;
            const isEnd = end?.row === r && end.col === c;
            const isPlayer = playerPos?.row === r && playerPos.col === c;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  ...styles.cell,
                  background: cell === 1 ? "#020617" : "#e5e7eb",
                }}
              >
                {mode === "play" || mode === "finished" ? (
                  <>
                    {isPlayer && characterImg && (
                      <img src={characterImg} style={styles.cellImg} />
                    )}
                    {isEnd && arrivalImg && (
                      <img src={arrivalImg} style={styles.cellImg} />
                    )}
                  </>
                ) : (
                  <>
                    {isStart && characterImg && (
                      <img src={characterImg} style={styles.cellImg} />
                    )}
                    {isEnd && arrivalImg && (
                      <img src={arrivalImg} style={styles.cellImg} />
                    )}
                  </>
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
    width: 320,
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
    fontSize: 12,
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
    whiteSpace: "pre",
  },
};
v
