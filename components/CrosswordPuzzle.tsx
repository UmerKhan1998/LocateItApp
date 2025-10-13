"use client";
import React, { useEffect, useRef, useState } from "react";

type CrosswordCell = {
  isPattern: boolean;
  aplhabet: string;
  referenceNo: number | null;
  referenceHeading: string;
  referenceDesc: string;
  isFirstLetter?: boolean;
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
  defaultSize = 10,
}) => {
  const [size, setSize] = useState<number>(defaultSize);
  const [wordsInput, setWordsInput] = useState<WordData[]>(defaultWords);
  const [matrix, setMatrix] = useState<CrosswordCell[][]>([]);
  const [placedWords, setPlacedWords] = useState<
    { referenceNo: number; word: string; referenceHeading: string; referenceDesc: string }[]
  >([]);
  const [newWord, setNewWord] = useState<string>("");
  const [newHeading, setNewHeading] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollSlider = (direction: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = 250;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // --- Crossword Helpers ---
  const createEmptyCell = (): CrosswordCell => ({
    isPattern: false,
    aplhabet: "",
    referenceNo: null,
    referenceHeading: "",
    referenceDesc: "",
    isFirstLetter: false,
  });

  const createEmptyMatrix = (): CrosswordCell[][] =>
    Array.from({ length: size }, () => Array.from({ length: size }, createEmptyCell));

  const canPlaceWord = (grid: CrosswordCell[][], word: string, row: number, col: number, horizontal: boolean): boolean => {
    if (horizontal) {
      if (col + word.length > size) return false;
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row][col + i];
        if (cell.isPattern && cell.aplhabet !== word[i]) return false;
      }
    } else {
      if (row + word.length > size) return false;
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row + i][col];
        if (cell.isPattern && cell.aplhabet !== word[i]) return false;
      }
    }
    return true;
  };

  const placeWord = (
    grid: CrosswordCell[][],
    word: string,
    refNo: number,
    heading: string,
    desc: string,
    row: number,
    col: number,
    horizontal: boolean
  ) => {
    for (let i = 0; i < word.length; i++) {
      const target = horizontal ? grid[row][col + i] : grid[row + i][col];
      target.isPattern = true;
      target.aplhabet = word[i];
      target.referenceHeading = heading;
      target.referenceDesc = desc;
      if (i === 0) {
        target.isFirstLetter = true;
        target.referenceNo = refNo;
      }
    }
  };

  // --- Improved Connected Crossword Generator ---
  const generateCrossword = (): {
    grid: CrosswordCell[][];
    placed: { referenceNo: number; word: string; referenceHeading: string; referenceDesc: string }[];
  } => {
    const tryGenerate = () => {
      const grid = createEmptyMatrix();
      const placed: { referenceNo: number; word: string; referenceHeading: string; referenceDesc: string }[] = [];
      let reference = 1;

      const placeFirstWord = (wordData: WordData) => {
        const startRow = Math.floor(size / 2);
        const startCol = Math.floor((size - wordData.word.length) / 2);
        placeWord(grid, wordData.word.toLowerCase(), reference, wordData.referenceHeading, wordData.referenceDesc, startRow, startCol, true);
        placed.push({ referenceNo: reference, word: wordData.word.toLowerCase(), referenceHeading: wordData.referenceHeading, referenceDesc: wordData.referenceDesc });
        reference++;
      };

      const findIntersections = (word: string) => {
        const intersections: { row: number; col: number; horizontal: boolean }[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cell = grid[r][c];
            if (cell.isPattern && word.includes(cell.aplhabet.toLowerCase())) {
              const idx = word.indexOf(cell.aplhabet.toLowerCase());
              const startCol = c - idx;
              if (startCol >= 0 && startCol + word.length <= size && canPlaceWord(grid, word, r, startCol, true))
                intersections.push({ row: r, col: startCol, horizontal: true });
              const startRow = r - idx;
              if (startRow >= 0 && startRow + word.length <= size && canPlaceWord(grid, word, startRow, c, false))
                intersections.push({ row: startRow, col: c, horizontal: false });
            }
          }
        }
        return intersections;
      };

      if (wordsInput.length > 0) placeFirstWord(wordsInput[0]);

      for (let i = 1; i < wordsInput.length; i++) {
        const item = wordsInput[i];
        const word = item.word.toLowerCase();
        const intersections = findIntersections(word);
        if (intersections.length > 0) {
          const choice = intersections[Math.floor(Math.random() * intersections.length)];
          placeWord(grid, word, reference, item.referenceHeading, item.referenceDesc, choice.row, choice.col, choice.horizontal);
          placed.push({ referenceNo: reference, word, referenceHeading: item.referenceHeading, referenceDesc: item.referenceDesc });
          reference++;
        }
      }
      return { grid, placed };
    };

    let bestResult = tryGenerate();
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = tryGenerate();
      if (result.placed.length > bestResult.placed.length) bestResult = result;
    }
    return bestResult;
  };

  useEffect(() => {
    const { grid, placed } = generateCrossword();
    setMatrix(grid);
    setPlacedWords(placed);
  }, [wordsInput, size]);

  // --- CRUD ---
  const addWord = () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    const newItem: WordData = { word, referenceHeading: newHeading.trim(), referenceDesc: newDesc.trim() };
    setWordsInput([...wordsInput, newItem]);
    setNewWord("");
    setNewHeading("");
    setNewDesc("");
  };

  const updateWordField = (index: number, field: keyof WordData, value: string) => {
    const updated = [...wordsInput];
    updated[index][field] = value;
    setWordsInput(updated);
  };

  const deleteWord = (index: number) => setWordsInput(wordsInput.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    try {
      setStatus("submitting");
      const payload = {
        title: "Crossword Puzzle",
        description: "Solve the crossword based on the given clues related to the Surah.",
        surahId: "670f9a77b3e45a1234567890",
        typeId: 4,
        crosswordPuzzleMatrix: matrix,
        createdBy: "670f9c12ab4e89a987654321",
      };
      const res = await fetch("http://localhost:5001/api/activity/CrosswordPuzzleMatrix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save crossword");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-8 text-white">
      <h2 className="text-3xl font-bold text-center mb-8">🧩 Crossword Puzzle Generator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* LEFT SIDE */}
        <div className="flex flex-col items-center justify-start">
          <div
            className="grid bg-purple-800 p-3 rounded-xl shadow-lg mb-6"
            style={{
              gridTemplateColumns: `repeat(${size}, 2.5rem)`,
              gridTemplateRows: `repeat(${size}, 2.5rem)`,
              gap: "2px",
            }}
          >
            {matrix.flatMap((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isEmpty = cell.referenceNo === null && !cell.isPattern;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`relative flex items-center justify-center font-bold border rounded-sm text-lg transition-colors duration-200
                      ${isEmpty ? "bg-white/10 border-purple-500" : ""}
                      ${cell.isPattern ? "bg-white text-black border-black" : ""}
                    `}
                  >
                    {cell.referenceNo && (
                      <span className="absolute text-[0.6rem] top-[2px] left-[4px] text-gray-600 font-semibold">
                        {cell.referenceNo}
                      </span>
                    )}
                    {cell.referenceNo === null ? "" : cell.aplhabet.toUpperCase()}
                  </div>
                );
              })
            )}
          </div>

          {/* Slider */}
          <div className="relative w-full max-w-lg overflow-hidden">
            <button
              onClick={() => scrollSlider("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-md"
            >
              ‹
            </button>

            <div
              ref={sliderRef}
              className="flex overflow-x-auto gap-4 scroll-smooth px-10 py-4 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-800 hover:scrollbar-thumb-purple-300"
            >
              {placedWords.map((item) => (
                <div
                  key={item.referenceNo}
                  className="flex-shrink-0 w-60 bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl shadow-md text-white p-4"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    #{item.referenceNo} — {item.word.toUpperCase()}
                  </h3>
                  <p className="text-sm text-purple-200 font-semibold">{item.referenceHeading}</p>
                  <p className="text-sm text-purple-300 mt-1">{item.referenceDesc}</p>
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

        {/* RIGHT COLUMN */}
        <div className="bg-purple-800 rounded-xl p-5 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Manage Words & Clues</h3>
          <div className="space-y-2 mb-5">
            <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Enter word" className="w-full bg-purple-700 px-3 py-2 rounded-lg" />
            <input type="text" value={newHeading} onChange={(e) => setNewHeading(e.target.value)} placeholder="Reference heading" className="w-full bg-purple-700 px-3 py-2 rounded-lg" />
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Reference description" className="w-full bg-purple-700 px-3 py-2 rounded-lg" />
            <button onClick={addWord} className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-semibold">
              ➕ Add Word
            </button>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-900 pr-2">
            {wordsInput.map((item, index) => (
              <div key={index} className="bg-purple-700 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    #{index + 1}: {item.word.toUpperCase()}
                  </span>
                  <button onClick={() => deleteWord(index)} className="bg-red-500 hover:bg-red-400 text-white px-2 py-1 rounded">
                    🗑
                  </button>
                </div>
                <input type="text" value={item.referenceHeading} onChange={(e) => updateWordField(index, "referenceHeading", e.target.value)} placeholder="Heading" className="bg-purple-600 px-2 py-1 rounded" />
                <input type="text" value={item.referenceDesc} onChange={(e) => updateWordField(index, "referenceDesc", e.target.value)} placeholder="Description" className="bg-purple-600 px-2 py-1 rounded" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <label htmlFor="size" className="text-sm font-medium">Grid Size:</label>
            <select id="size" value={size} onChange={(e) => setSize(Number(e.target.value))} className="bg-purple-700 border border-purple-400 text-white rounded-lg px-3 py-1">
              <option value={8}>8 × 8</option>
              <option value={10}>10 × 10</option>
              <option value={12}>12 × 12</option>
            </select>
          </div>

          <button onClick={handleSubmit} disabled={status === "submitting"} className="w-full mt-4 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold">
            {status === "submitting" ? "Saving..." : "💾 Submit Crossword"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
