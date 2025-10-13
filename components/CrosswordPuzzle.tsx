"use client";
import React, { useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type CrosswordCell = {
  isLetter: boolean;
  ch: string;
  startNo: number | null;
  acrossId?: number | null;
  downId?: number | null;
  prefill?: boolean;
};

type WordData = {
  word: string;
  referenceHeading: string;
  referenceDesc: string;
};

interface CrosswordMatrixProps {
  defaultWords?: WordData[];
  defaultSize?: number;
}

/** ---------- Helpers ---------- */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const newCell = (): CrosswordCell => ({
  isLetter: false,
  ch: "",
  startNo: null,
  acrossId: null,
  downId: null,
  prefill: false,
});

const directions = {
  ACROSS: { dr: 0, dc: 1 },
  DOWN: { dr: 1, dc: 0 },
} as const;

/** Placement rules */
function canPlace(
  grid: CrosswordCell[][],
  r: number,
  c: number,
  word: string,
  dir: "ACROSS" | "DOWN"
): boolean {
  const { dr, dc } = directions[dir];
  const H = grid.length;
  const W = grid[0].length;

  const endR = r + dr * (word.length - 1);
  const endC = c + dc * (word.length - 1);
  if (endR < 0 || endR >= H || endC < 0 || endC >= W) return false;

  const prevR = r - dr;
  const prevC = c - dc;
  if (prevR >= 0 && prevR < H && prevC >= 0 && prevC < W) {
    if (grid[prevR][prevC].isLetter) return false;
  }
  const nextR = endR + dr;
  const nextC = endC + dc;
  if (nextR >= 0 && nextR < H && nextC >= 0 && nextC < W) {
    if (grid[nextR][nextC].isLetter) return false;
  }

  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const cell = grid[rr][cc];
    if (cell.isLetter && cell.ch !== word[i]) return false;

    if (!cell.isLetter) {
      if (dir === "ACROSS") {
        const up = rr - 1;
        const dn = rr + 1;
        if (up >= 0 && grid[up][cc].isLetter) return false;
        if (dn < H && grid[dn][cc].isLetter) return false;
      } else {
        const lf = cc - 1;
        const rt = cc + 1;
        if (lf >= 0 && grid[rr][lf].isLetter) return false;
        if (rt < W && grid[rr][rt].isLetter) return false;
      }
    }
  }
  return true;
}

function placeWord(
  grid: CrosswordCell[][],
  r: number,
  c: number,
  word: string,
  dir: "ACROSS" | "DOWN"
) {
  const { dr, dc } = directions[dir];
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const cell = grid[rr][cc];
    cell.isLetter = true;
    cell.ch = word[i];
  }
}

/** Numbering and Clues */
function buildNumbersAndClues(
  grid: CrosswordCell[][],
  placedSeq: { word: string; heading: string; desc: string }[]
) {
  const H = grid.length;
  const W = grid[0].length;
  let number = 1;

  type Clue = {
    number: number;
    word: string;
    heading: string;
    desc: string;
    row: number;
    col: number;
    len: number;
  };

  const across: Clue[] = [];
  const down: Clue[] = [];

  const pull = (r: number, c: number, dir: "ACROSS" | "DOWN") => {
    const { dr, dc } = directions[dir];
    let rr = r;
    let cc = c;
    let s = "";
    while (rr >= 0 && rr < H && cc >= 0 && cc < W && grid[rr][cc].isLetter) {
      s += grid[rr][cc].ch;
      rr += dr;
      cc += dc;
    }
    return s;
  };

  const metaLeft = placedSeq.slice();
  const takeMeta = (w: string) => {
    const idx = metaLeft.findIndex((m) => m.word === w);
    if (idx >= 0) return metaLeft.splice(idx, 1)[0];
    return { word: w, heading: "Clue", desc: "—" };
  };

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (!grid[r][c].isLetter) continue;

      const startAcross =
        (c === 0 || !grid[r][c - 1].isLetter) && (c + 1 < W && grid[r][c + 1].isLetter);
      const startDown =
        (r === 0 || !grid[r - 1][c].isLetter) && (r + 1 < H && grid[r + 1][c].isLetter);

      if (startAcross || startDown) {
        grid[r][c].startNo = number;
        if (startAcross) {
          const w = pull(r, c, "ACROSS");
          const meta = takeMeta(w);
          across.push({ number, word: w, heading: meta.heading, desc: meta.desc, row: r, col: c, len: w.length });
        }
        if (startDown) {
          const w = pull(r, c, "DOWN");
          const meta = takeMeta(w);
          down.push({ number, word: w, heading: meta.heading, desc: meta.desc, row: r, col: c, len: w.length });
        }
        number++;
      }
    }
  }

  return { across, down };
}

/** Generator */
function generateGrid(
  size: number,
  words: WordData[]
): { grid: CrosswordCell[][]; placedMeta: { word: string; heading: string; desc: string }[] } {
  const items = words
    .map((w) => ({ word: w.word.trim().toLowerCase(), heading: w.referenceHeading, desc: w.referenceDesc }))
    .filter((w) => w.word.length > 1);
  items.sort((a, b) => b.word.length - a.word.length);

  const grid = range(size).map(() => range(size).map(newCell));
  const placed: typeof items = [];

  if (!items.length) return { grid, placedMeta: [] };

  // Place first word horizontally
  const first = items[0];
  const r = Math.floor(size / 2);
  const c = Math.max(0, Math.floor((size - first.word.length) / 2));
  if (canPlace(grid, r, c, first.word, "ACROSS")) {
    placeWord(grid, r, c, first.word, "ACROSS");
    placed.push(first);
  }

  // TODO: Add intersection placement (simplified)
  for (let i = 1; i < items.length; i++) {
    const w = items[i];
    for (let rr = 0; rr < size; rr++) {
      for (let cc = 0; cc < size; cc++) {
        if (canPlace(grid, rr, cc, w.word, "DOWN")) {
          placeWord(grid, rr, cc, w.word, "DOWN");
          placed.push(w);
          rr = size; // break
          break;
        }
      }
    }
  }

  return { grid, placedMeta: placed };
}

/** ---------- Component ---------- */
const CrosswordMatrixGenerator: React.FC<CrosswordMatrixProps> = ({
  defaultWords = [
    { word: "HEAT", referenceHeading: "Temperature", referenceDesc: "Form of energy that causes things to become warm" },
    { word: "APPLE", referenceHeading: "Fruit", referenceDesc: "A round fruit that keeps doctors away" },
    { word: "RABBIT", referenceHeading: "Animal", referenceDesc: "A small mammal with long ears and a love for carrots" },
    { word: "TREE", referenceHeading: "Plant", referenceDesc: "A tall plant with a trunk, branches, and leaves" },
  ],
  defaultSize = 10,
}) => {
  const [size, setSize] = useState<number>(defaultSize);
  const [wordsInput, setWordsInput] = useState<WordData[]>(defaultWords);
  const [showAnswers, setShowAnswers] = useState(false);

  const { grid, across, down } = useMemo(() => {
    const { grid: g, placedMeta } = generateGrid(size, wordsInput);
    const { across, down } = buildNumbersAndClues(g, placedMeta);

    for (const a of across) g[a.row][a.col].prefill = true;
    for (const d of down) g[d.row][d.col].prefill = true;

    return { grid: g, across, down };
  }, [size, wordsInput]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-6 text-white">
      <h2 className="text-3xl font-bold text-center mb-6">🧩 Crossword Puzzle</h2>

      <div className="flex flex-col items-center">
        <div
          className="grid bg-purple-800 p-3 rounded-xl shadow-lg mb-4"
          style={{
            gridTemplateColumns: `repeat(${size}, 2.6rem)`,
            gridTemplateRows: `repeat(${size}, 2.6rem)`,
            gap: "2px",
          }}
        >
          {Array.from({ length: size }).map((_, r) =>
            Array.from({ length: size }).map((_, c) => {
              const cell = grid[r]?.[c];
              if (!cell || !cell.isLetter) {
                return (
                  <div
                    key={`${r}-${c}-empty`}
                    className="w-10 h-10 bg-purple-700 border border-purple-900 rounded-sm"
                  />
                );
              }
              return (
                <div
                  key={`${r}-${c}`}
                  className="relative flex items-center justify-center bg-white text-black border border-black rounded-sm font-bold"
                >
                  {cell.startNo && (
                    <span className="absolute text-[0.62rem] top-[2px] left-[3px] text-gray-700">
                      {cell.startNo}
                    </span>
                  )}
                  <span className="text-xl select-none">
                    {(showAnswers || cell.prefill) ? cell.ch.toUpperCase() : ""}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => setShowAnswers((s) => !s)}
          className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-semibold"
        >
          {showAnswers ? "Hide Answers" : "Show Answers"}
        </button>

        <div className="flex items-center gap-2 mt-3">
          <label htmlFor="size" className="text-sm">Grid Size:</label>
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="bg-purple-700 border border-purple-400 text-white rounded-lg px-2 py-1"
          >
            <option value={8}>8 × 8</option>
            <option value={10}>10 × 10</option>
            <option value={15}>15 × 15</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
