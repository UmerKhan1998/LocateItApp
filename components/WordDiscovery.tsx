"use client";
import React, { useEffect, useMemo, useState } from "react";

/** =========================================
 * Word Discovery (Word Search) – Single File
 * - Random grid generator (8×8 / 10×10 / 12×12)
 * - Add words; place across 8 directions (FWD/REV)
 * - Record exact coordinate paths like (A10,B6)->...
 * - Verify table for devs + JSON export payload
 * - Tailwind UI (clean, minimal)
 * ========================================= */

/** ---------- Types ---------- */
type Cell = {
  ch: string; // single uppercase letter
  fixed: boolean; // belongs to some placed word
};

type WordSpec = {
  id: string;
  word: string; // UPPERCASE, letters only
};

type PathStep = { r: number; c: number };

type PlacedWord = {
  id: string;
  word: string;
  path: PathStep[]; // 0-indexed rc
  direction: DirectionKey;
};

/** ---------- Utils ---------- */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const randInt = (n: number) => Math.floor(Math.random() * n);
const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const isAlpha = (s: string) => /^[A-Z]+$/.test(s);

// Visible label like (A10,B6)
const toLabel = (r: number, c: number) => `A${c + 1},B${r + 1}`;

// Pretty printable path string
const pathToString = (path: PathStep[]) =>
  path.map((p) => `(${toLabel(p.r, p.c)})`).join("→");

/** 8 directions */
const DIRS = {
  E: { dr: 0, dc: 1 },
  W: { dr: 0, dc: -1 },
  S: { dr: 1, dc: 0 },
  N: { dr: -1, dc: 0 },
  SE: { dr: 1, dc: 1 },
  NW: { dr: -1, dc: -1 },
  SW: { dr: 1, dc: -1 },
  NE: { dr: -1, dc: 1 },
} as const;

type DirectionKey = keyof typeof DIRS;
const DIR_KEYS: DirectionKey[] = ["E", "W", "S", "N", "SE", "NW", "SW", "NE"];

/** ---------- Placement Core ---------- */
function makeEmptyGrid(size: number): Cell[][] {
  return range(size).map(() =>
    range(size).map(() => ({ ch: "", fixed: false }))
  );
}

function canPlace(
  grid: Cell[][],
  r: number,
  c: number,
  word: string,
  dir: DirectionKey
) {
  const { dr, dc } = DIRS[dir];
  const H = grid.length,
    W = grid[0].length;
  const endR = r + dr * (word.length - 1);
  const endC = c + dc * (word.length - 1);
  if (endR < 0 || endR >= H || endC < 0 || endC >= W) return false;

  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i,
      cc = c + dc * i;
    const cell = grid[rr][cc];
    if (cell.fixed && cell.ch !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: Cell[][],
  r: number,
  c: number,
  word: string,
  dir: DirectionKey
): PathStep[] {
  const { dr, dc } = DIRS[dir];
  const path: PathStep[] = [];
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i,
      cc = c + dc * i;
    const cell = grid[rr][cc];
    cell.ch = word[i];
    cell.fixed = true;
    path.push({ r: rr, c: cc });
  }
  return path;
}

function fillEmpties(grid: Cell[][]) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (!grid[r][c].ch) grid[r][c].ch = alpha[randInt(26)];
    }
  }
}

function generateWordSearch(
  size: number,
  words: WordSpec[]
): {
  grid: Cell[][];
  placed: PlacedWord[];
} {
  const H = size,
    W = size;
  const grid = makeEmptyGrid(size);

  const sorted = [...words]
    .map((w) => ({ ...w, word: w.word.toUpperCase().replace(/[^A-Z]/g, "") }))
    .filter((w) => w.word.length > 0)
    .sort((a, b) => b.word.length - a.word.length);

  const placed: PlacedWord[] = [];

  for (const w of sorted) {
    let success = false;
    const tries = size * size * 8;

    for (let t = 0; t < tries && !success; t++) {
      const dir = DIR_KEYS[randInt(DIR_KEYS.length)];
      const r0 = randInt(H);
      const c0 = randInt(W);
      if (!canPlace(grid, r0, c0, w.word, dir)) continue;
      const path = placeWord(grid, r0, c0, w.word, dir);
      placed.push({ id: w.id, word: w.word, path, direction: dir });
      success = true;
    }
  }

  fillEmpties(grid);
  return { grid, placed };
}

/** ---------- Component ---------- */
const WordDiscoveryGenerator: React.FC<{
  defaultSize?: 8 | 10 | 12;
  defaultWords?: { word: string }[];
}> = ({
  defaultSize = 12,
  defaultWords = [
    { word: "CLOUDS" },
    { word: "DARKNESS" },
    { word: "DAY" },
    { word: "RESURRECTED" },
  ],
}) => {
  const [size, setSize] = useState<number>(defaultSize);
  const [words, setWords] = useState<WordSpec[]>(
    defaultWords.map((w, i) => ({
      id: `w${i + 1}`,
      word: w.word.toUpperCase(),
    }))
  );
  const [showAll, setShowAll] = useState(true);
  const [seed, setSeed] = useState(0);

  useEffect(() => {}, [seed]);

  const { grid, placed } = useMemo(() => {
    const reseeded = words.map((w, i) => ({ ...w, id: `${w.id}-${seed}` }));
    return generateWordSearch(size, reseeded);
  }, [size, words, seed]);

  const placedWithLabels = useMemo(
    () =>
      placed.map((p) => ({
        ...p,
        labels: p.path.map((pt) => `(${toLabel(pt.r, pt.c)})`),
        pathString: pathToString(p.path),
      })),
    [placed]
  );

  const buildPayload = () => ({
    title: "Word Discovery",
    description: "Find the hidden words in the grid.",
    typeId: 7,
    gridSize: `${size}x${size}`,
    matrix: grid.map((row) =>
      row.map((cell) => ({ ch: cell.ch, fixed: cell.fixed }))
    ),
    words: placedWithLabels.map((p) => ({
      word: p.word,
      direction: p.direction,
      path: p.path.map((pt) => ({ row: pt.r + 1, col: pt.c + 1 })),
      coordinates: p.labels,
    })),
  });

  const copyJSON = async () => {
    const json = JSON.stringify(buildPayload(), null, 2);
    await navigator.clipboard.writeText(json);
    alert("JSON copied to clipboard");
  };

  const addWord = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleaned || !isAlpha(cleaned)) return;
    setWords((prev) => [...prev, { id: `w${Date.now()}`, word: cleaned }]);
  };

  const removeWord = (id: string) =>
    setWords((prev) => prev.filter((w) => w.id !== id));

  const [wInput, setWInput] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-700 p-6 text-white">
      <h2 className="text-3xl font-bold text-center mb-6">
        🔎 Word Discovery Generator
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2">
          <div
            className="grid"
            style={{ gridTemplateColumns: `2rem repeat(${size}, 2.5rem)` }}
          >
            <div />
            {range(size).map((c) => (
              <div key={c} className="text-center text-xs text-gray-200 mb-1">
                A{c + 1}
              </div>
            ))}
          </div>

          <div className="bg-indigo-800 p-3 rounded-xl shadow-lg">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `2rem repeat(${size}, 2.5rem)`,
                gap: "2px",
              }}
            >
              {range(size).map((r) => (
                <React.Fragment key={r}>
                  <div className="flex items-center justify-center text-xs text-gray-200">
                    B{r + 1}
                  </div>
                  {range(size).map((c) => {
                    const cell = grid[r][c];
                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`w-10 h-10 flex items-center justify-center bg-white text-black border border-black font-bold ${
                          cell.fixed ? "bg-yellow-50" : "bg-white"
                        }`}
                      >
                        <span>
                          {showAll ? cell.ch : cell.fixed ? cell.ch : ""}
                        </span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="bg-indigo-600 px-3 py-1 rounded"
              >
                {showAll ? "Hide Fillers" : "Show All Letters"}
              </button>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="bg-indigo-700 px-2 py-1 rounded"
              >
                <option value={8}>8 × 8</option>
                <option value={10}>10 × 10</option>
                <option value={12}>12 × 12</option>
              </select>
              <button
                onClick={() => setSeed((s) => s + 1)}
                className="bg-blue-600 px-3 py-1 rounded"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={copyJSON}
                className="bg-green-600 px-3 py-1 rounded"
              >
                ⤴️ Copy JSON Payload
              </button>
            </div>
          </div>
        </div>

        <div className="bg-indigo-800 p-5 rounded-xl shadow-lg">
          <h3 className="font-semibold mb-3">Add Words</h3>
          <input
            value={wInput}
            onChange={(e) => setWInput(e.target.value)}
            placeholder="Word (letters only)"
            className="w-full mb-2 px-2 py-1 bg-indigo-700 rounded"
          />
          <button
            onClick={() => {
              addWord(wInput);
              setWInput("");
            }}
            className="w-full bg-indigo-600 py-1 rounded"
          >
            ➕ Add Word
          </button>

          <h4 className="font-bold mt-6 mb-2">Current Words</h4>
          <div className="space-y-1 text-sm">
            {words.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between bg-indigo-700/60 px-2 py-1 rounded"
              >
                <div>
                  <span className="font-semibold">{w.word}</span>
                </div>
                <button
                  onClick={() => removeWord(w.id)}
                  className="text-red-200 hover:text-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <h4 className="font-bold mt-6 mb-2">Verification (Paths)</h4>
          <div className="space-y-2 text-sm max-h-64 overflow-auto pr-1">
            {placedWithLabels.map((p, i) => (
              <div key={i} className="bg-indigo-700/60 p-2 rounded">
                <div className="font-semibold">
                  {p.word}{" "}
                  <span className="text-xs opacity-80">[{p.direction}]</span>
                </div>
                <div className="text-xs break-words">{p.pathString}</div>
              </div>
            ))}
            {placedWithLabels.length === 0 && (
              <div className="text-xs opacity-80">
                No words placed yet (try regenerating).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordDiscoveryGenerator;
