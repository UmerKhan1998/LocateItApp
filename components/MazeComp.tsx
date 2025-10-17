"use client";
import React from "react";

type GridCell = {
  isPathCorrect: boolean;
  isStartPoint: boolean;
  isEndPoint: boolean;
  startColor: string;
  endColor: string;
  CharacterMoveImage: string;
};

type Props = {
  gridData: GridCell[];
};

const GridBoard: React.FC<Props> = ({ gridData }) => {
  const gridSize = 6; // 6x6 grid

  return (
    <div className="inline-block border border-gray-300 rounded-lg overflow-hidden">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 40px)`,
          gridTemplateRows: `repeat(${gridSize}, 40px)`,
        }}
      >
        {gridData.map((cell, index) => {
          const {
            isPathCorrect,
            isStartPoint,
            isEndPoint,
            startColor,
            endColor,
          } = cell;

          let cellContent = null;
          if (isStartPoint) {
            cellContent = (
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: startColor || "#00FF00" }}
              ></div>
            );
          } else if (isEndPoint) {
            cellContent = (
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: endColor || "#F87171" }}
              ></div>
            );
          }

          return (
            <div
              key={index}
              className={`flex items-center justify-center ${
                isPathCorrect ? "bg-white" : "bg-[#2C0E4E]"
              }`}
            >
              {cellContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GridBoard;
