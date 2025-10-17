"use client";
import React, { useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type CrosswordCell = {
  isLetter: boolean;          // this square is part of any word
  ch: string;                 // letter (lowercase)
  startNo: number | null;     // printed number if this is a word start
  acrossId?: number | null;
  downId?: number | null;
  prefill?: boolean;          // show this letter even when answers are hidden
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
  acrossId: null,
  downId: null,
  prefill: false,
});

const directions = {
  ACROSS: { dr: 0, dc: 1 },
  DOWN: { dr: 1, dc: 0 },
} as const;

/** Crossword placement rules */
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

  // end bounds
  const endR = r + dr * (word.length - 1);
  const endC = c + dc * (word.length - 1);
  if (endR < 0 || endR >= H || endC < 0 || endC >= W) return false;

  // cell before start
  const prevR = r - dr;
  const prevC = c - dc;
  if (prevR >= 0 && prevR < H && prevC >= 0 && prevC < W) {
    if (grid[prevR][prevC].isLetter) return false;
  }
  // cell after end
  const nextR = endR + dr;
  const nextC = endC + dc;
  if (nextR >= 0 && nextR < H && nextC >= 0 && nextC < W) {
    if (grid[nextR][nextC].isLetter) return false;
  }

  // each step
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const cell = grid[rr][cc];

    // letter match if occupied
    if (cell?.isLetter && cell?.ch !== word[i]) return false;

    // side adjacency check (perpendicular neighbors) only if this isn't a crossing
    if (!cell?.isLetter) {
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

/** Compute numbering and clues (Across & Down) */
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
          across.push({
            number,
            word: w,
            heading: meta.heading,
            desc: meta.desc,
            row: r,
            col: c,
            len: w.length,
          });
        }
        if (startDown) {
          const w = pull(r, c, "DOWN");
          const meta = takeMeta(w);
          down.push({
            number,
            word: w,
            heading: meta.heading,
            desc: meta.desc,
            row: r,
            col: c,
            len: w.length,
          });
        }
        number++;
      }
    }
  }

  return { across, down };
}

/** Try to place all words with intersections, alternating directions. */
function generateGrid(
  size: number,
  words: WordData[]
): {
  grid: CrosswordCell[][];
  placedMeta: { word: string; heading: string; desc: string }[];
} {
  const items = words
    .map((w) => ({
      word: w.word.trim().toLowerCase(),
      heading: w.referenceHeading,
      desc: w.referenceDesc,
    }))
    .filter((w) => w.word.length > 1);
  items.sort((a, b) => b.word.length - a.word.length);

  const attempts = 12;
  let best = { grid: [] as CrosswordCell[][], placedMeta: [] as any[] };

  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid = range(size).map(() => range(size).map(newCell));
    const placed: typeof items = [];

    if (!items.length) return { grid, placedMeta: [] };

    // place first (longest) horizontally near center
    {
      const first = items[0];
      const r = Math.floor(size / 2);
      const c = Math.max(0, Math.floor((size - first.word.length) / 2));
      let ok = false;
      if (canPlace(grid, r, c, first.word, "ACROSS")) {
        placeWord(grid, r, c, first.word, "ACROSS");
        placed.push(first);
        ok = true;
      } else {
        // scan any slot
        outer: for (let rr = 0; rr < size; rr++) {
          for (let cc = 0; cc < size; cc++) {
            if (canPlace(grid, rr, cc, first.word, "ACROSS")) {
              placeWord(grid, rr, cc, first.word, "ACROSS");
              placed.push(first);
              ok = true;
              break outer;
            }
          }
        }
      }
      if (!ok) continue; // retry this attempt
    }

    let dir: "ACROSS" | "DOWN" = "DOWN";
    for (let i = 1; i < items.length; i++) {
      const { word } = items[i];

      const candidates: { r: number; c: number; dir: "ACROSS" | "DOWN" }[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = grid[r][c];
          if (!cell.isLetter) continue;
          for (let k = 0; k < word.length; k++) {
            if (word[k] !== cell.ch) continue;

            if (dir === "ACROSS") {
              const startC = c - k;
              if (canPlace(grid, r, startC, word, "ACROSS"))
                candidates.push({ r, c: startC, dir: "ACROSS" });
            } else {
              const startR = r - k;
              if (canPlace(grid, startR, c, word, "DOWN"))
                candidates.push({ r: startR, c, dir: "DOWN" });
            }
          }
        }
      }

      if (candidates.length === 0) {
        const alt: "ACROSS" | "DOWN" = dir === "ACROSS" ? "DOWN" : "ACROSS";
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (!cell.isLetter) continue;
            for (let k = 0; k < word.length; k++) {
              if (word[k] !== cell.ch) continue;
              if (alt === "ACROSS") {
                const startC = c - k;
                if (canPlace(grid, r, startC, word, "ACROSS"))
                  candidates.push({ r, c: startC, dir: "ACROSS" });
              } else {
                const startR = r - k;
                if (canPlace(grid, startR, c, word, "DOWN"))
                  candidates.push({ r: startR, c, dir: "DOWN" });
              }
            }
          }
        }
      }

      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        placeWord(grid, pick.r, pick.c, word, pick.dir);
        placed.push(items[i]);
        dir = dir === "ACROSS" ? "DOWN" : "ACROSS";
      }
    }

    if (!best.grid.length || placed.length > best.placedMeta.length) {
      best = { grid, placedMeta: placed };
    }
  }

  return best;
}

/** ---------- Component ---------- */
const CrosswordMatrixGenerator: React.FC<CrosswordMatrixProps> = ({
  defaultWords = [
    { word: "HEAT", referenceHeading: "Temperature", referenceDesc: "Form of energy that causes things to become warm" },
    { word: "APPLE", referenceHeading: "Fruit", referenceDesc: "A round fruit that keeps doctors away" },
    { word: "RABBIT", referenceHeading: "Animal", referenceDesc: "A small mammal with long ears and a love for carrots" },
    { word: "BIRD", referenceHeading: "Creature", referenceDesc: "A feathered animal that can usually fly" },
    { word: "MINT", referenceHeading: "Herb", referenceDesc: "A fragrant plant often used for flavoring or freshness" },
    { word: "TOPIC", referenceHeading: "Subject", referenceDesc: "The main idea or theme of a discussion" },
    { word: "TREE", referenceHeading: "Plant", referenceDesc: "A tall plant with a trunk, branches, and leaves" },
  ],
  defaultSize = 10, // show 10×10 first
}) => {
  const [size, setSize] = useState<number>(defaultSize); // 8 | 10 | 15
  const [wordsInput, setWordsInput] = useState<WordData[]>(defaultWords);
  const [showAnswers, setShowAnswers] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // UI inputs
  const [newWord, setNewWord] = useState("");
  const [newHeading, setNewHeading] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // generate on inputs/size
  const { grid, across, down, placedList } = useMemo(() => {
    const { grid: fullGrid, placedMeta } = generateGrid(size, wordsInput);
    const { across, down } = buildNumbersAndClues(fullGrid, placedMeta);

    // prefill the first letter of each word (Across & Down)
    for (const a of across) fullGrid[a.row][a.col].prefill = true;
    for (const d of down) fullGrid[d.row][d.col].prefill = true;

    return { grid: fullGrid, across, down, placedList: placedMeta };
  }, [size, wordsInput]);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  const addWord = () => {
    const w = newWord.trim();
    if (!w) return;
    setWordsInput((p) => [
      ...p,
      {
        word: w.toUpperCase(),
        referenceHeading: newHeading.trim() || "Clue",
        referenceDesc: newDesc.trim() || "—",
      },
    ]);
    setNewWord("");
    setNewHeading("");
    setNewDesc("");
  };

  const updateWordField = (i: number, field: keyof WordData, value: string) => {
    setWordsInput((prev) => {
      const cp = [...prev];
      (cp[i] as any)[field] = value;
      return cp;
    });
  };

  const deleteWord = (i: number) => setWordsInput((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    try {
      setStatus("submitting");
      const payload = {
        title: "Crossword Puzzle",
        description: "Solve the crossword based on the given clues.",
        surahId: "66607aa1d7639ce76b12ff08",
        typeId: "68e5ff0422e84795f82789c4",
        crosswordPuzzleMatrix: grid,
        references: wordsInput,
      };
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

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Grid + cards */}
        <div className="flex flex-col items-center">
          {/* Fixed-size Grid (8×8 / 10×10 / 15×15) with visible boxes */}
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

                // Empty cells are still visible as white squares with borders
                if (!cell || !cell.isLetter) {
                  return (
                    <div
                      key={`${r}-${c}-empty`}
                      className="w-10 h-10"
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

          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setShowAnswers((s) => !s)}
              className="bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-semibold"
            >
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>

            <div className="flex items-center gap-2">
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

          {/* Slider of placed words */}
          <div className="relative w-full max-w-lg overflow-hidden mt-2">
            <button
              onClick={() => scrollSlider("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md"
            >
              ‹
            </button>
            <div
              ref={sliderRef}
              className="flex overflow-x-auto gap-3 scroll-smooth px-10 py-3 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-900"
            >
              {placedList.map((p, i) => (
                <div key={i} className="flex-shrink-0 w-64 bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl shadow-md text-white p-4">
                  <h3 className="text-lg font-semibold mb-1">{p.word.toUpperCase()}</h3>
                  <p className="text-sm text-purple-200 font-semibold">{p.heading}</p>
                  <p className="text-sm text-purple-300 mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => scrollSlider("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md"
            >
              ›
            </button>
          </div>
        </div>

        {/* RIGHT: Words / Clues / Submit */}
        <div className="bg-purple-800 rounded-xl p-5 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Manage Words & Clues</h3>
          <div className="space-y-2 mb-5">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Enter WORD"
              className="w-full bg-purple-700 px-3 py-2 rounded-lg"
            />
            <input
              type="text"
              value={newHeading}
              onChange={(e) => setNewHeading(e.target.value)}
              placeholder="Reference heading"
              className="w-full bg-purple-700 px-3 py-2 rounded-lg"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Reference description"
              className="w-full bg-purple-700 px-3 py-2 rounded-lg"
            />
            <button onClick={addWord} className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-semibold">
              ➕ Add Word
            </button>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-900 pr-2">
            {wordsInput.map((item, index) => (
              <div key={index} className="bg-purple-700 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">#{index + 1}: {item.word.toUpperCase()}</span>
                  <button onClick={() => deleteWord(index)} className="bg-red-500 hover:bg-red-400 text-white px-2 py-1 rounded">
                    🗑
                  </button>
                </div>
                <input
                  type="text"
                  value={item.referenceHeading}
                  onChange={(e) => updateWordField(index, "referenceHeading", e.target.value)}
                  placeholder="Heading"
                  className="bg-purple-600 px-2 py-1 rounded"
                />
                <input
                  type="text"
                  value={item.referenceDesc}
                  onChange={(e) => updateWordField(index, "referenceDesc", e.target.value)}
                  placeholder="Description"
                  className="bg-purple-600 px-2 py-1 rounded"
                />
              </div>
            ))}
          </div>

          {/* Clues */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">ACROSS</h4>
              <ul className="space-y-1 text-sm">
                {across.map((a) => (
                  <li key={`A${a.number}`}>
                    <span className="font-bold">{a.number}. </span>
                    <span className="italic">{a.heading}</span> — {a.desc} ({a.len})
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">DOWN</h4>
              <ul className="space-y-1 text-sm">
                {down.map((d) => (
                  <li key={`D${d.number}`}>
                    <span className="font-bold">{d.number}. </span>
                    <span className="italic">{d.heading}</span> — {d.desc} ({d.len})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={status === "submitting"}
            className="w-full mt-5 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold"
          >
            {status === "submitting" ? "Saving..." : "💾 Submit Crossword"}
          </button>
          {status === "success" && <p className="mt-2 text-green-300 text-sm">Saved!</p>}
          {status === "error" && <p className="mt-2 text-red-300 text-sm">Couldn’t save.</p>}
        </div>
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
