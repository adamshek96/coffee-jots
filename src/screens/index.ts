import type { ComponentType } from "react";
import type { Screen } from "../store";
import { FinishRoast } from "./FinishRoast";
import { LiveRoast } from "./LiveRoast";

/**
 * Screens register here as they're ported; App falls back to Home for
 * anything missing so every commit stays runnable.
 */
export const SCREENS: Partial<Record<Screen, ComponentType>> = {
  live: LiveRoast,
  post: FinishRoast,
};
