import React, { useEffect, useMemo, useState } from "react";

type AnswerMap = { [blankId: string]: string };

export default function DragDropFillBlank({
  text,
  answers,
}: {
  text: string;
  answers: { id: string; correct: string }[];
}) {
  const [filled, setFilled] = useState<AnswerMap>({});
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Shuffle the words once
  const shuffled = useMemo(
    () => [...answers.map((a) => a.correct)].sort(() => Math.random() - 0.5),
    []
  );

  const handleDrop = (event: React.DragEvent, blankId: string) => {
    const word = event.dataTransfer.getData("text/plain");

    // Prevent reusing words
    if (usedWords.includes(word)) return;

    setFilled((prev) => ({ ...prev, [blankId]: word }));
    setUsedWords((prev) => [...prev, word]);
    setDragOver(null);
  };

  const handleReset = () => {
    setFilled({});
    setUsedWords([]);
  };

  const getColor = (blankId: string) => {
    const userAns = filled[blankId];
    if (!userAns) return "#fff";

    const correct = answers.find((a) => a.id === blankId)?.correct;
    return userAns === correct ? "#bbf7d0" : "#fecaca";
  };

  return (
    <div style={{ padding: 20, fontSize: 18 }}>
      {/* FORMATTED TEXT WITH BLANKS */}
      <FormattedText
        text={text}
        filled={filled}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onDrop={handleDrop}
        getColor={getColor}
      />

      {/* WORD BANK */}
      <div
        style={{
          marginTop: 25,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {shuffled.map((word) => {
          const disabled = usedWords.includes(word);
          return (
            <div
              key={word}
              draggable={!disabled}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", word)}
              style={{
                padding: "10px 16px",
                background: disabled ? "#e5e7eb" : "#bfdbfe",
                borderRadius: "10px",
                cursor: disabled ? "not-allowed" : "grab",
                opacity: disabled ? 0.5 : 1,
                transition: "0.2s",
                userSelect: "none",
              }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* RESET BUTTON */}
      <button
        onClick={handleReset}
        style={{
          marginTop: 20,
          padding: "10px 18px",
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    </div>
  );
}

/* -------------------------
   Renders text with blanks
-------------------------- */
function FormattedText({
  text,
  filled,
  dragOver,
  setDragOver,
  onDrop,
  getColor,
}: {
  text: string;
  filled: AnswerMap;
  dragOver: string | null;
  setDragOver: (id: string | null) => void;
  onDrop: (event: React.DragEvent, id: string) => void;
  getColor: (id: string) => string;
}) {
  // Replace [b1], [b2], etc. with Blank components
  const parts = text.split(/(\[b\d+\])/g);

  return (
    <p>
      {parts.map((part) => {
        if (part.match(/\[b\d+\]/)) {
          const id = part.replace("[", "").replace("]", "");

          return (
            <Blank
              key={id}
              id={id}
              value={filled[id]}
              dragOver={dragOver === id}
              onDragEnter={() => setDragOver(id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={onDrop}
              bgColor={getColor(id)}
            />
          );
        }

        return part;
      })}
    </p>
  );
}

/* -------------------------
   Blank Component
-------------------------- */
function Blank({
  id,
  value,
  dragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  bgColor,
}: {
  id: string;
  value?: string;
  dragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  bgColor: string;
}) {
  return (
    <span
      onDrop={(e) => onDrop(e, id)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      style={{
        display: "inline-block",
        minWidth: 90,
        padding: "4px 8px",
        borderBottom: "2px solid black",
        borderRadius: 6,
        textAlign: "center",
        margin: "0 6px",
        background: bgColor,
        transition: "0.2s",
        boxShadow: dragOver
          ? "0 0 8px rgba(59,130,246,.8)"
          : "0 0 0 rgba(0,0,0,0)",
      }}
    >
      {value || "_____"}
    </span>
  );
}
