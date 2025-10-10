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

interface CrosswordMatrixProps {
  wordsInput: string[];
  size?: number;
}

const CrosswordMatrixGenerator: React.FC<CrosswordMatrixProps> = ({
  wordsInput,
  size = 10,
}) => {
  const [matrix, setMatrix] = useState<CrosswordCell[][]>([]);
  const [placedWords, setPlacedWords] = useState<
    { referenceNo: number; word: string }[]
  >([]);

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

  const createEmptyCell = (): CrosswordCell => ({
    isPattern: false,
    aplhabet: "",
    referenceNo: null,
    referenceHeading: "",
    referenceDesc: "",
    isFirstLetter: false,
  });

  const createEmptyMatrix = (): CrosswordCell[][] =>
    Array.from({ length: size }, () =>
      Array.from({ length: size }, createEmptyCell)
    );

  const canPlaceWord = (
    grid: CrosswordCell[][],
    word: string,
    row: number,
    col: number,
    horizontal: boolean
  ): boolean => {
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
    row: number,
    col: number,
    horizontal: boolean
  ) => {
    for (let i = 0; i < word.length; i++) {
      const target = horizontal ? grid[row][col + i] : grid[row + i][col];
      target.isPattern = true;
      target.aplhabet = word[i];
      if (i === 0) {
        target.isFirstLetter = true;
        target.referenceNo = refNo;
      }
    }
  };

  const generateCrossword = (): {
    grid: CrosswordCell[][];
    placed: { referenceNo: number; word: string }[];
  } => {
    const grid = createEmptyMatrix();
    const placed: { referenceNo: number; word: string }[] = [];
    let reference = 1;

    for (const word of wordsInput) {
      let placedFlag = false;
      let attempts = 0;

      while (!placedFlag && attempts < 200) {
        attempts++;
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, word, row, col, horizontal)) {
          placeWord(grid, word, reference, row, col, horizontal);
          placed.push({ referenceNo: reference, word });
          reference++;
          placedFlag = true;
        }
      }
    }

    return { grid, placed };
  };

  useEffect(() => {
    const { grid, placed } = generateCrossword();
    setMatrix(grid);
    setPlacedWords(placed);
  }, [wordsInput]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-6">
      <h2 className="text-white text-2xl font-bold mb-6">Crossword Puzzle</h2>

      {/* Crossword Grid */}
      <div
        className="grid bg-purple-800 p-3 rounded-xl shadow-lg mb-8"
        style={{
          gridTemplateColumns: `repeat(${size}, 2.5rem)`,
          gridTemplateRows: `repeat(${size}, 2.5rem)`,
          gap: "2px",
        }}
      >
        {matrix.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`relative flex items-center justify-center font-bold border ${
                cell.isPattern
                  ? "bg-white text-black border-black"
                  : "bg-purple-700 border-purple-700"
              } rounded-sm text-lg`}
            >
              {cell.referenceNo && (
                <span className="absolute text-[0.6rem] top-[2px] left-[4px] text-gray-600 font-semibold">
                  {cell.referenceNo}
                </span>
              )}
              {cell.isPattern && cell.isFirstLetter
                ? cell.aplhabet.toUpperCase()
                : ""}
            </div>
          ))
        )}
      </div>

      {/* 🟪 Slider Section */}
      <div className="relative w-full max-w-lg overflow-hidden">
        {/* Left Arrow */}
        <button
          onClick={() => scrollSlider("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
        >
          ‹
        </button>

        {/* Scrollable Cards */}
        <div
          ref={sliderRef}
          className="flex overflow-x-auto gap-4 scrollbar-hide scroll-smooth px-10 py-4"
        >
          {placedWords.map((item) => (
            <div
              key={item.referenceNo}
              className="flex-shrink-0 w-60 bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl shadow-md text-white p-4"
            >
              <h3 className="text-lg font-semibold mb-2">
                #{item.referenceNo} — {item.word.toUpperCase()}
              </h3>
              <p className="text-sm text-purple-200">
                Word length: {item.word.length} letters
              </p>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollSlider("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
