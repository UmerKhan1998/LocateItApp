"use client";
import React, { useEffect, useState } from "react";

type CrosswordCell = {
  isPattern: boolean;
  aplhabet: string;
  referenceNo: number | null;
  referenceHeading: string;
  referenceDesc: string;
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

  const createEmptyCell = (): CrosswordCell => ({
    isPattern: false,
    aplhabet: "",
    referenceNo: null,
    referenceHeading: "",
    referenceDesc: "",
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
        target.referenceNo = refNo;
        target.referenceHeading = `Word ${refNo}`;
        target.referenceDesc = `Starts with '${word[i]}'`;
      }
    }
  };

  const generateCrossword = (): CrosswordCell[][] => {
    const grid = createEmptyMatrix();
    let reference = 1;

    for (const word of wordsInput) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        attempts++;
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, word, row, col, horizontal)) {
          placeWord(grid, word, reference, row, col, horizontal);
          reference++;
          placed = true;
        }
      }

      if (!placed) console.warn(`Could not place word: ${word}`);
    }

    return grid;
  };

  useEffect(() => {
    setMatrix(generateCrossword());
  }, [wordsInput]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 p-6">
      <h2 className="text-white text-2xl font-bold mb-6">Crossword Puzzle</h2>

      <div
        className="grid bg-purple-800 p-3 rounded-xl shadow-lg"
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
              className={`relative flex items-center justify-center font-bold border 
                ${
                  cell.isPattern
                    ? "bg-white text-black border-black"
                    : "bg-purple-700 border-purple-700"
                }
                rounded-sm text-lg transition-all duration-200
              `}
            >
              {cell.referenceNo && (
                <span
                  className="absolute text-[0.6rem] top-[2px] left-[4px] text-gray-600 font-semibold"
                >
                  {cell.referenceNo}
                </span>
              )}
              {cell.isPattern ? cell.aplhabet.toUpperCase() : ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CrosswordMatrixGenerator;
