import type { ComponentType } from "react";
import type { Screen } from "../store";
import { Analytics } from "./Analytics";
import { Devices } from "./Devices";
import { DeviceSetup } from "./DeviceSetup";
import { FinishRoast } from "./FinishRoast";
import { Home } from "./Home";
import { LiveRoast } from "./LiveRoast";
import { NewRoast } from "./NewRoast";
import { Onboarding } from "./Onboarding";
import { Passport } from "./Passport";
import { Profile } from "./Profile";
import { RoastDetail } from "./RoastDetail";
import { Share } from "./Share";

/**
 * Screens register here as they're ported; App falls back to Home for
 * anything missing so every commit stays runnable.
 */
export const SCREENS: Partial<Record<Screen, ComponentType>> = {
  onboard: Onboarding,
  home: Home,
  live: LiveRoast,
  post: FinishRoast,
  detail: RoastDetail,
  setup: NewRoast,
  devices: Devices,
  device: DeviceSetup,
  analytics: Analytics,
  passport: Passport,
  share: Share,
  profile: Profile,
};
