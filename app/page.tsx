"use client";

import dynamic from "next/dynamic";

import LocateItComp from "@/components/LocateItComp";
const CrosswordPuzzle = dynamic(() => import("@/components/CrosswordPuzzle"), {
  ssr: false,
});

const page = () => {
  return (
    <div>
      <LocateItComp />
      {/* <CrosswordPuzzle /> */}
    </div>
  );
};

export default page;
