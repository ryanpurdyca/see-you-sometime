"use client";

import { createContext, useContext, type ReactNode } from "react";

export type BookReadingNav = {
  onRightPagePointer: () => void;
  onRightPageClick: () => void;
};

const BookReadingContext = createContext<BookReadingNav | null>(null);

export function BookReadingProvider({
  value,
  children,
}: {
  value: BookReadingNav;
  children: ReactNode;
}) {
  return <BookReadingContext.Provider value={value}>{children}</BookReadingContext.Provider>;
}

export function useBookReadingNav(): BookReadingNav | null {
  return useContext(BookReadingContext);
}
