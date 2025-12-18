import React, { useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

/**
 * Types that match your constants.ts shape.
 */
export type BookPage = {
  page: string;
  audio?: string | null;
  pageStatus?: string;
  audioStatus?: string;
};

export type BookDetail = {
  slug: string;
  title: string;
  pages: BookPage[];
  // You can extend this as needed (tagline, price, etc.)
  [key: string]: any;
};

type Props = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  bookDetail?: BookDetail | null;
  imageURL: string; // e.g. "https://cdn.example.com/" (must end with / if needed)
};

export default function BookModal({
  modalOpen,
  setModalOpen,
  bookDetail,
  imageURL,
}: Props) {
  const book = useRef<any>(null);
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Escape closes modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, setModalOpen]);

  const pageImgWidth = useMemo(() => {
    if (width < 425) return "38%";
    if (width < 450) return "42%";
    if (width < 500) return "49%";
    if (width < 550) return "60%";
    if (width < 600) return "65%";
    if (width < 650) return "70%";
    if (width < 700) return "74%";
    if (width < 750) return "80%";
    if (width < 770) return "78%";
    return "100%";
  }, [width]);

  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside to close */}
      <div
        className="absolute inset-0"
        onClick={() => setModalOpen(false)}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative mx-auto flex h-full w-full flex-col px-4 py-3 md:px-8">
        {/* Top bar */}
        <div className="z-[1000] flex items-center justify-between gap-3">
          <p className="max-w-[80%] truncate font-grobold text-xl uppercase text-white sm:text-2xl md:text-3xl">
            {bookDetail?.title ?? "Book"}
          </p>

          <button
            onClick={() => setModalOpen(false)}
            className="cursor-pointer text-2xl font-bold text-white md:text-3xl"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Flipbook area */}
        <div className="flex w-full flex-1 items-start justify-center pt-6 md:pt-10">
          <div className="w-full">
            <HTMLFlipBook
              width={2400}
              height={1250}
              size="stretch"
              minWidth={950}
              maxWidth={2400}
              minHeight={700}
              maxHeight={1250}
              ref={book}
              usePortrait={true}
              showPageCorners={false}
              {...(width < 600 ? { flippingTime: 1 } : {})}
              showCover={false}
              mobileScrollSupport={true}
              drawShadow={width < 600 ? false : true}
              className="h-full w-full shadow-2xl md:rounded-xl"
            >
              {(bookDetail?.pages ?? []).map((page, index) => (
                <div
                  key={index}
                  className="no-hover flex h-full w-full justify-center pb-8 md:rounded-lg"
                >
                  <img
                    src={imageURL + page.page}
                    alt={`Page ${index + 1}`}
                    style={{
                      width: pageImgWidth,
                      objectFit: "contain",
                      borderRadius: "20px",
                    }}
                    className="h-auto max-h-[85vh] w-full object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        </div>
      </div>
    </div>
  );
}
