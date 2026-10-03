// The upgrade dialog's open/closed state. A tiny store (not React context) so
// non-React code can open it too: lib/queryClient.ts opens it the moment any
// request comes back 403 PLAN_REQUIRED, and components open it before a gated
// task starts. One <UpgradeDialog /> in App.tsx listens.

import { create } from "zustand";
import type { Feature } from "@shared/entitlements";

export type UpgradeFeature = Feature | "tenders";

interface UpgradeState {
  feature: UpgradeFeature | null;
  /** The server's own wording, shown if we have no translation for this feature. */
  message: string | null;
  openUpgrade: (feature: UpgradeFeature, message?: string | null) => void;
  closeUpgrade: () => void;
}

export const useUpgradeStore = create<UpgradeState>((set) => ({
  feature: null,
  message: null,
  openUpgrade: (feature, message = null) => set({ feature, message }),
  closeUpgrade: () => set({ feature: null, message: null }),
}));

/** Callable from anywhere, including outside React. */
export const openUpgrade = (feature: UpgradeFeature, message?: string | null) =>
  useUpgradeStore.getState().openUpgrade(feature, message);
