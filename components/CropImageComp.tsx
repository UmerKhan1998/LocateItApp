import React, { useState, useEffect, useRef } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

type CellValue = 0 | 1;
type Tool = "wall" | "start" | "end" | "erase";
type Mode = "edit" | "play" | "finished";

interface Position {
  row: number;
  col: number;
}

const GRID_SIZE = 10;

/**
 * Remove background from an uploaded image using MediaPipe SelfieSegmentation
 * Returns a transparent PNG (data URL) with only the foreground kept.
 */
const removeBackgroundLocal = async (imageBase64: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageBase64;

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      selfieSegmentation.setOptions({
        modelSelection: 1,
      });

      selfieSegmentation.onResults((results: any) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw segmentation mask, then keep only the foreground from the original image
        ctx.save();
        ctx.drawImage(
          results.segmentationMask,
          0,
          0,
          canvas.width,
          canvas.height
        );
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const output = canvas.toDataURL("image/png");
        resolve(output);
      });

      try {
        await selfieSegmentation.send({ image: img });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
  });
};

const MazeConfigurator: React.FC = () => {
  const [matrix, setMatrix] = useState<CellValue[][]>(
    Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 0)
    )
  );

  const [tool, setTool] = useState<Tool>("wall");
  const [start, setStart] = useState<Position | null>(null);
  const [end, setEnd] = useState<Position | null>(null);

  const [characterImg, setCharacterImg] = useState<string | null>(null); // player / start sprite
  const [arrivalImg, setArrivalImg] = useState<string | null>(null); // goal sprite
  const [wallImg, setWallImg] = useState<string | null>(null); // wall tile
  const [walkImg, setWalkImg] = useState<string | null>(null); // walkable tile

  // background color for walkable cells (0)
  const [walkBgColor, setWalkBgColor] = useState<string>("#e5e7eb");

  const [mode, setMode] = useState<Mode>("edit");
  const [playerPos, setPlayerPos] = useState<Position | null>(null);
  const [steps, setSteps] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // --- image upload handler ---
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "character" | "arrival" | "wall" | "walk"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as string;

      if (type === "character") {
        // Automatically remove background for character sprite
        try {
          const cleaned = await removeBackgroundLocal(data);
          setCharacterImg(cleaned);
        } catch (err) {
          console.error("Background removal failed, using original image", err);
          setCharacterImg(data);
        }
        return;
      }

      if (type === "arrival") setArrivalImg(data);
      if (type === "wall") setWallImg(data);
      if (type === "walk") setWalkImg(data);
    };
    reader.readAsDataURL(file);
  };

  // --- editing cells ---
  const handleCellClick = (row: number, col: number) => {
    if (mode !== "edit") return;

    const isStartCell = start?.row === row && start.col === col;
    const isEndCell = end?.row === row && end.col === col;

    setMatrix((prev) => {
      const copy = prev.map((r) => [...r]);

      if (tool === "wall") {
        // don't allow wall on start or end cells
        if (isStartCell || isEndCell) return prev;
        copy[row][col] = copy[row][col] === 1 ? 0 : 1;
      } else if (tool === "erase") {
        copy[row][col] = 0;
        if (isStartCell) setStart(null);
        if (isEndCell) setEnd(null);
      } else if (tool === "start") {
        if (isEndCell) {
          alert("Start and End cannot be on the same cell.");
          return prev;
        }
        copy[row][col] = 0;
        setStart({ row, col });
      } else if (tool === "end") {
        // END must be bottom row
        if (row !== GRID_SIZE - 1) {
          alert("Ending point must be in the bottom row.");
          return prev;
        }
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

  // --- start / reset game ---
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

  // --- timer ---
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

  // --- keyboard movement ---
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

      if (
        newRow < 0 ||
        newRow >= GRID_SIZE ||
        newCol < 0 ||
        newCol >= GRID_SIZE
      ) {
        return;
      }

      if (matrix[newRow][newCol] === 1) return; // wall

      setPlayerPos({ row: newRow, col: newCol });
      setSteps((prev) => prev + 1);

      if (end && newRow === end.row && newCol === end.col) {
        setMode("finished");
        const timeSec = (elapsedMs / 1000).toFixed(1);
        alert(`🎉 Reached the goal!\nSteps: ${steps + 1}\nTime: ${timeSec}s`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, playerPos, matrix, end, steps, elapsedMs]);

  // --- helpers for curved walls ---
  const isWall = (r: number, c: number) =>
    r >= 0 &&
    r < GRID_SIZE &&
    c >= 0 &&
    c < GRID_SIZE &&
    matrix[r][c] === 1;

  const getWallBorderRadius = (r: number, c: number): string => {
    const radius = 14;
    const up = isWall(r - 1, c);
    const down = isWall(r + 1, c);
    const left = isWall(r, c - 1);
    const right = isWall(r, c + 1);

    const tl = up || left ? 0 : radius;
    const tr = up || right ? 0 : radius;
    const br = down || right ? 0 : radius;
    const bl = down || left ? 0 : radius;

    return `${tl}px ${tr}px ${br}px ${bl}px`;
  };

  // --- export format ---
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

        {/* Legend */}
        <div style={styles.legendRow}>
          <div style={{ ...styles.legendDot, backgroundColor: "#10b981" }} />
          <span style={styles.legendText}>Start Point</span>
          <div style={{ ...styles.legendDot, backgroundColor: "#f97373" }} />
          <span style={styles.legendText}>End Point (bottom row)</span>
        </div>

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

        <h4>Character & Arrival Images</h4>

        <label>
          Character (Start / Player)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "character")}
          />
        </label>
        {characterImg && <img src={characterImg} style={styles.preview} />}

        <label>
          Arrival (End / Goal)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "arrival")}
          />
        </label>
        {arrivalImg && <img src={arrivalImg} style={styles.preview} />}

        <h4>Maze Tiles</h4>
        <label>
          Wall Image (for 1)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "wall")}
          />
        </label>
        {wallImg && <img src={wallImg} style={styles.preview} />}

        <label>
          Walk Image (for 0)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "walk")}
          />
        </label>
        {walkImg && <img src={walkImg} style={styles.preview} />}

        <label>
          Walk Background Color
          <input
            type="color"
            value={walkBgColor}
            onChange={(e) => setWalkBgColor(e.target.value)}
            style={{ width: "100%", height: 32, padding: 0, border: "none" }}
          />
        </label>

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
            const isWallCell = cell === 1;

            const baseStyle: React.CSSProperties = {
              ...styles.cell,
              background: isWallCell ? "#020617" : walkBgColor,
              ...(isWallCell
                ? { borderRadius: getWallBorderRadius(r, c) }
                : {}),
              ...(isStart ? styles.startCellOutline : {}),
              ...(isEnd ? styles.endCellOutline : {}),
            };

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={baseStyle}
              >
                {/* base wall / walk images (zIndex 1) */}
                {isWallCell && wallImg && (
                  <img src={wallImg} style={styles.tileImg} />
                )}
                {!isWallCell && walkImg && (
                  <img src={walkImg} style={styles.tileImg} />
                )}

                {/* Edit mode markers */}
                {mode === "edit" && (
                  <>
                    {isStart &&
                      (characterImg ? (
                        <img src={characterImg} style={styles.characterOnTile} />
                      ) : (
                        <div
                          style={{
                            ...styles.markerDot,
                            backgroundColor: "#10b981",
                          }}
                        />
                      ))}
                    {isEnd &&
                      (arrivalImg ? (
                        <img src={arrivalImg} style={styles.arrivalOnTile} />
                      ) : (
                        <div
                          style={{
                            ...styles.markerDot,
                            backgroundColor: "#f97373",
                          }}
                        />
                      ))}
                  </>
                )}

                {/* Play / Finished (player & goal on top) */}
                {(mode === "play" || mode === "finished") && (
                  <>
                    {isPlayer && characterImg && (
                      <img src={characterImg} style={styles.characterOnTile} />
                    )}
                    {isEnd && arrivalImg && (
                      <img src={arrivalImg} style={styles.arrivalOnTile} />
                    )}
                    {isPlayer && !characterImg && (
                      <div
                        style={{
                          ...styles.markerDot,
                          backgroundColor: "#10b981",
                        }}
                      />
                    )}
                    {isEnd && !arrivalImg && (
                      <div
                        style={{
                          ...styles.markerDot,
                          backgroundColor: "#f97373",
                        }}
                      />
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
    width: 380,
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
  },
  legendText: {
    fontSize: 13,
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
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative", // so we can layer images on top
  },
  startCellOutline: {
    boxShadow: "0 0 0 2px #10b981 inset",
  },
  endCellOutline: {
    boxShadow: "0 0 0 2px #f97373 inset",
  },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    position: "absolute",
    zIndex: 5,
  },
  // base tile (wall or walk) underneath
  tileImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  },
  // character sprite on top of tile (background removed)
  characterOnTile: {
    width: "80%",
    height: "80%",
    objectFit: "contain",
    pointerEvents: "none",
    position: "absolute",
    top: "10%",
    left: "10%",
    zIndex: 10,
  },
  // arrival sprite on top
  arrivalOnTile: {
    width: "80%",
    height: "80%",
    objectFit: "contain",
    pointerEvents: "none",
    position: "absolute",
    top: "10%",
    left: "10%",
    zIndex: 9,
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
