"use client";

import dynamic from "next/dynamic";

const FillInTheBlanks = dynamic(() => import("@/components/FillInTheBlanks"), {
  ssr: false,
});

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
const CropImageComp = dynamic(() => import("@/components/CropImageComp"), {
  ssr: false,
});
const FillTheKabahComp = dynamic(() => import("@/components/FillTheKabah"), {
  ssr: false,
});
const WordDidscoverYPayload = dynamic(
  () => import("@/components/WordDidscoveryPayload"),
  {
    ssr: false,
  }
);

const page = () => {
  return (
    <>
      {/* <LocateItComp />
      <MazeComp /> */}
      {/* <CrosswordPuzzle /> */}
      {/* <FillInTheBlanks
        text={`By those [b1] sent forth in succession, those that blow violently, 
         and scatter [b2] far and wide, And by those angels who bring criterion [b3]; 
         ... Woe on that Day to the deniers [b4]!`}
        answers={[
          { id: "b1", correct: "winds" },
          { id: "b2", correct: "rainclouds" },
          { id: "b3", correct: "1" },
          { id: "b4", correct: "3" },
        ]}
      /> */}
      <CropImageComp />
      <FillTheKabahComp />
      {/* <WordDiscovery /> */}
      {/* <WordDidscoverYPayload /> */}
    </>
  );
};

export default page;
