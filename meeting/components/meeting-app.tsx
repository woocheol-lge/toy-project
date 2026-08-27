"use client";

import dynamic from "next/dynamic";

// 회의 상태는 브라우저에만 있으므로 서버에서 미리 그리지 않는다.
// 그래야 저장된 회의를 첫 렌더에서 바로 이어 보여줄 수 있다.
const MeetingScreens = dynamic(
  () => import("./meeting-screens").then((module) => module.MeetingScreens),
  { ssr: false }
);

export function MeetingApp() {
  return <MeetingScreens />;
}
