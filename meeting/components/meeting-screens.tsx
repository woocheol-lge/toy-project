"use client";

import { FinishedScreen } from "./finished-screen";
import { RunningScreen } from "./running-screen";
import { SetupScreen } from "./setup-screen";
import { useMeeting } from "../use-meeting";

export function MeetingScreens() {
  const controller = useMeeting();

  if (controller.meeting.phase === "running") {
    return <RunningScreen controller={controller} />;
  }

  if (controller.meeting.phase === "finished") {
    return <FinishedScreen controller={controller} />;
  }

  return <SetupScreen controller={controller} />;
}
