import { create } from "zustand";
import type { PortfolioParams } from "@/lib/types";

export type Solver = "classical-cobyla" | "qaoa";

interface PortfolioState {
  /** α lợi nhuận · β rủi ro biến động · γ ESG · δ phạt rủi ro (0–1). */
  params: PortfolioParams;
  solver: Solver;
  /** DN người dùng đã bấm "Thêm vào danh mục" ở Cổng 1. */
  watchlist: string[];
  setParam: (key: keyof PortfolioParams, value: number) => void;
  resetParams: () => void;
  setSolver: (solver: Solver) => void;
  addToWatchlist: (ticker: string) => void;
}

const DEFAULT_PARAMS: PortfolioParams = { alpha: 1, beta: 1, gamma: 1, delta: 1 };

export const usePortfolioStore = create<PortfolioState>((set) => ({
  params: DEFAULT_PARAMS,
  solver: "classical-cobyla",
  watchlist: [],
  setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  resetParams: () => set({ params: DEFAULT_PARAMS }),
  setSolver: (solver) => set({ solver }),
  addToWatchlist: (ticker) =>
    set((s) => (s.watchlist.includes(ticker) ? s : { watchlist: [...s.watchlist, ticker] })),
}));
