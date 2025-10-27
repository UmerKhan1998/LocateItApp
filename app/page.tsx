"use client";

import dynamic from "next/dynamic";

const CrosswordPuzzle = dynamic(() => import("@/components/CrosswordPuzzle"), {
  ssr: false,
});
const LocateItComp = dynamic(() => import("@/components/LocateItComp"), {
  ssr: false,
});
const MazeComp = dynamic(() => import("@/components/MazeComp"), {
  ssr: false,
});
const WordDiscovery = dynamic(() => import("@/components/WordDiscovery"), {
  ssr: false,
});

const page = () => {
  const gridData = [
    // B1
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    }, // A1
    {
      isPathCorrect: true,
      isStartPoint: true,
      isEndPoint: false,
      startColor: "#00FF00",
      endColor: "",
      CharacterMoveImage: "character-move.png",
    }, // A2 🟢
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    }, // A3
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    }, // A4
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    }, // A5
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    }, // A6

    // B2
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },

    // B3
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },

    // B4
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },

    // B5
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },

    // B6
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
    {
      isPathCorrect: true,
      isStartPoint: false,
      isEndPoint: true,
      startColor: "",
      endColor: "#F87171",
      CharacterMoveImage: "character-move.png",
    }, // A5 🔴
    {
      isPathCorrect: false,
      isStartPoint: false,
      isEndPoint: false,
      startColor: "",
      endColor: "",
      CharacterMoveImage: "",
    },
  ];
  return (
    <div>
      {/* <LocateItComp />
      <MazeComp /> */}
      <CrosswordPuzzle />
      <WordDiscovery />
    </div>
  );
};

export default page;
