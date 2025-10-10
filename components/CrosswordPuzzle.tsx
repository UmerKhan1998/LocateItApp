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
  console.log('matrix', matrix);

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

  const addStructuredBlanks = (grid: CrosswordCell[][]): CrosswordCell[][] => {
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = newGrid[r][c];
        // Only consider pattern cells that aren't starting points
        if (cell.isPattern && !cell.referenceNo) {
          // Apply structured blanking rule (for crossword effect)
          // Blank every other diagonal cell for aesthetic gaps
          if ((r + c) % 3 === 0 && Math.random() < 0.5) {
            cell.isPattern = false;
            cell.aplhabet = "";
          }
        }
      }
    }
    return newGrid;
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

    // Apply crossword-like blank structure
    return addStructuredBlanks(grid);
  };

  useEffect(() => {
    setMatrix(generateCrossword());
  }, [wordsInput]);

  return (
    <div className="p-4">
      <h2 className="font-bold text-xl mb-4 text-center">Crossword Puzzle</h2>
      <div
        className="grid"
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
              className={`flex items-center justify-center border text-sm font-semibold ${
                cell.isPattern
                  ? "bg-black text-white"
                  : "bg-gray-200 text-transparent"
              }`}
              style={{ position: "relative" }}
            >
              {cell.referenceNo && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 3,
                    fontSize: "0.6rem",
                    color: "yellow",
                  }}
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
