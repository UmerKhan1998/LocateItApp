"use client";
import React, { useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type CrosswordCell = {
  isLetter: boolean;
  ch: string;
  startNo: number | null;
  prefill?: boolean;
};

type WordData = {
  word: string;
  referenceHeading: string;
  referenceDesc: string;
};

interface CrosswordMatrixProps {
  defaultWords?: WordData[];
  defaultSize?: number; // 8 | 10 | 15
}

/** ---------- Helpers ---------- */
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const newCell = (): CrosswordCell => ({
  isLetter: false,
  ch: "",
  startNo: null,
  prefill: false,
});

const directions = {
  ACROSS: { dr: 0, dc: 1 },
  DOWN: { dr: 1, dc: 0 },
} as const;

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

  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const cell = grid[rr][cc];
    if (cell.isLetter && cell.ch !== word[i]) return false;
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

function buildNumbersAndClues(
  grid: CrosswordCell[][],
  placedSeq: { word: string; heading: string; desc: string }[]
) {
  const H = grid.length;
  const W = grid[0].length;
  let number = 1;
  const across: any[] = [];
  const down: any[] = [];

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
          const w = [];
          let cc = c;
          while (cc < W && grid[r][cc].isLetter) {
            w.push(grid[r][cc].ch);
            cc++;
          }
          const wordStr = w.join("");
          const meta = takeMeta(wordStr);
          across.push({ number, word: wordStr, heading: meta.heading, desc: meta.desc, row: r, col: c, len: wordStr.length });
        }
        if (startDown) {
          const w = [];
          let rr = r;
          while (rr < H && grid[rr][c].isLetter) {
            w.push(grid[rr][c].ch);
            rr++;
          }
          const wordStr = w.join("");
          const meta = takeMeta(wordStr);
          down.push({ number, word: wordStr, heading: meta.heading, desc: meta.desc, row: r, col: c, len: wordStr.length });
        }
        number++;
      }
    }
  }
  return { across, down };
}

function generateGrid(
  size: number,
  words: WordData[]
): {
  grid: CrosswordCell[][];
  placedMeta: { word: string; heading: string; desc: string }[];
} {
  const items = words.map((w) => ({
    word: w.word.trim().toLowerCase(),
    heading: w.referenceHeading,
    desc: w.referenceDesc,
  }));

  const grid = range(size).map(() => range(size).map(newCell));
  const placed: typeof items = [];

  if (items.length === 0) return { grid, placedMeta: [] };

  // Place first word across
  const first = items[0];
  const r = Math.floor(size / 2);
  const c = Math.max(0, Math.floor((size - first.word.length) / 2));
  if (canPlace(grid, r, c, first.word, "ACROSS")) {
    placeWord(grid, r, c, first.word, "ACROSS");
    placed.push(first);
  }

  // Try others
  for (let i = 1; i < items.length; i++) {
    const w = items[i];
    let placedFlag = false;
    for (let rr = 0; rr < size && !placedFlag; rr++) {
      for (let cc = 0; cc < size && !placedFlag; cc++) {
        if (!grid[rr][cc].isLetter) continue;
        for (let k = 0; k < w.word.length; k++) {
          if (w.word[k] !== grid[rr][cc].ch) continue;
          if (canPlace(grid, rr - k, cc, w.word, "DOWN")) {
            placeWord(grid, rr - k, cc, w.word, "DOWN");
            placed.push(w);
            placedFlag = true;
          } else if (canPlace(grid, rr, cc - k, w.word, "ACROSS")) {
            placeWord(grid, rr, cc - k, w.word, "ACROSS");
            placed.push(w);
            placedFlag = true;
          }
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
  ],
  defaultSize = 10,
}) => {
  const [size, setSize] = useState(defaultSize);
  const [wordsInput, setWordsInput] = useState<WordData[]>(defaultWords);
  const [showAnswers, setShowAnswers] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const { grid, across, down } = useMemo(() => {
    const { grid, placedMeta } = generateGrid(size, wordsInput);
    const { across, down } = buildNumbersAndClues(grid, placedMeta);
    for (const a of across) grid[a.row][a.col].prefill = true;
    for (const d of down) grid[d.row][d.col].prefill = true;
    return { grid, across, down };
  }, [size, wordsInput]);

  const [newWord, setNewWord] = useState("");
  const [newHeading, setNewHeading] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const addWord = () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    setWordsInput(prev => [...prev, {
      word: w.toUpperCase(),
      referenceHeading: newHeading || "Clue",
      referenceDesc: newDesc || "—",
    }]);
    setNewWord(""); setNewHeading(""); setNewDesc("");
  };

  /** ---------- Updated handleSubmit ---------- */
  const handleSubmit = async () => {
    try {
      setStatus("submitting");

      // Transform grid to required format
      const formattedGrid = grid.map(row =>
        row.map(cell => {
          if (!cell || !cell.isLetter) {
            return {
              isPattern: false,
              aplhabet: "",
              referenceNo: null,
              referenceHeading: "",
              referenceDesc: "",
            };
          }

          let refNo: number | null = cell.startNo;
          let heading = "";
          let desc = "";
          if (refNo) {
            const clue =
              across.find(a => a.number === refNo) ||
              down.find(d => d.number === refNo);
            if (clue) {
              heading = clue.heading;
              desc = clue.desc;
            }
          }
          return {
            isPattern: true,
            aplhabet: cell.ch.toUpperCase(),
            referenceNo: refNo,
            referenceHeading: heading,
            referenceDesc: desc,
          };
        })
      );

      const payload = {
        title: "Crossword Puzzle",
        description: "Solve the crossword based on the given clues.",
        typeId: 4,
        crosswordPuzzleMatrix: formattedGrid,
      };

      console.log("Submitting payload:", payload);

      const res = await fetch("http://localhost:5001/api/activity/CrosswordPuzzleMatrix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save crossword");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-6 text-white">
      <h2 className="text-3xl font-bold text-center mb-6">🧩 Crossword Puzzle Generator</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* LEFT: Grid */}
        <div className="flex flex-col items-center">
          <div
            className="grid bg-purple-800 p-3 rounded-xl shadow-lg mb-4"
            style={{
              gridTemplateColumns: `repeat(${size}, 2.5rem)`,
              gridTemplateRows: `repeat(${size}, 2.5rem)`,
              gap: "2px",
            }}
          >
            {Array.from({ length: size }).map((_, r) =>
              Array.from({ length: size }).map((_, c) => {
                const cell = grid[r][c];
                if (!cell.isLetter) {
                  return <div key={`${r}-${c}`} className="w-10 h-10" />;
                }
                return (
                  <div key={`${r}-${c}`} className="relative flex items-center justify-center bg-white text-black border border-black font-bold">
                    {cell.startNo && (
                      <span className="absolute text-[0.6rem] top-[2px] left-[3px] text-gray-700">
                        {cell.startNo}
                      </span>
                    )}
                    <span>{(showAnswers || cell.prefill) ? cell.ch.toUpperCase() : ""}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-3 mb-3">
            <button onClick={() => setShowAnswers(s => !s)} className="bg-purple-600 px-3 py-1 rounded">
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
            <select value={size} onChange={e => setSize(Number(e.target.value))} className="bg-purple-700 px-2 py-1 rounded">
              <option value={8}>8 × 8</option>
              <option value={10}>10 × 10</option>
              <option value={15}>15 × 15</option>
            </select>
          </div>
        </div>
        {/* RIGHT: Controls */}
        <div className="bg-purple-800 p-5 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Manage Words & Clues</h3>
          <input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Word" className="w-full mb-2 px-2 py-1 bg-purple-700 rounded" />
          <input value={newHeading} onChange={e => setNewHeading(e.target.value)} placeholder="Heading" className="w-full mb-2 px-2 py-1 bg-purple-700 rounded" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full mb-2 px-2 py-1 bg-purple-700 rounded" />
          <button onClick={addWord} className="w-full bg-purple-600 py-1 rounded">➕ Add Word</button>
          <div className="mt-5">
            <h4 className="font-bold mb-1">Across</h4>
            {across.map(a => (
              <div key={a.number}>{a.number}. {a.heading} — {a.desc}</div>
            ))}
            <h4 className="font-bold mt-3 mb-1">Down</h4>
            {down.map(d => (
              <div key={d.number}>{d.number}. {d.heading} — {d.desc}</div>
            ))}
          </div>
          <button onClick={handleSubmit} className="w-full mt-5 bg-green-600 py-1 rounded">
            {status === "submitting" ? "Saving..." : "💾 Submit Crossword"}
          </button>
          {status === "success" && <p className="text-green-300 mt-2">Saved!</p>}
          {status === "error" && <p className="text-red-300 mt-2">Error saving</p>}
        </div>
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
