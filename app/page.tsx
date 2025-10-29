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
const WordDidscoverYPayload = dynamic(
  () => import("@/components/WordDidscoveryPayload"),
  {
    ssr: false,
  }
);

const page = () => {
  return (
    <div>
      <LocateItComp />
      <MazeComp />
      <CrosswordPuzzle />
      <WordDiscovery />
      {/* <WordDidscoverYPayload /> */}
    </div>
  );
};

export default page;
