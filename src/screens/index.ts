import type { ComponentType } from "react";
import type { Screen } from "../store";
import { Devices } from "./Devices";
import { DeviceSetup } from "./DeviceSetup";
import { FinishRoast } from "./FinishRoast";
import { Home } from "./Home";
import { LiveRoast } from "./LiveRoast";
import { NewRoast } from "./NewRoast";
import { RoastDetail } from "./RoastDetail";

/**
 * Screens register here as they're ported; App falls back to Home for
 * anything missing so every commit stays runnable.
 */
export const SCREENS: Partial<Record<Screen, ComponentType>> = {
  home: Home,
  live: LiveRoast,
  post: FinishRoast,
  detail: RoastDetail,
  setup: NewRoast,
  devices: Devices,
  device: DeviceSetup,
};
