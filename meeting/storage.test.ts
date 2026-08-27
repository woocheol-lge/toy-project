import { beforeEach, describe, expect, test } from "vitest";

import { addItem, createEmptyMeeting, startMeeting } from "./meeting-state";
import { loadMeeting, saveMeeting } from "./storage";

describe("회의 상태 저장", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("저장한 회의를 그대로 복원한다", () => {
    let meeting = addItem(createEmptyMeeting(), {
      title: "배포 일정",
      allocatedSeconds: 600,
    });
    meeting = startMeeting(meeting, 1_700_000_000_000);
    saveMeeting(meeting);

    expect(loadMeeting()).toEqual(meeting);
  });

  test("저장된 것이 없으면 아무것도 돌려주지 않는다", () => {
    expect(loadMeeting()).toBeNull();
  });

  test("저장된 내용이 깨져 있으면 아무것도 돌려주지 않는다", () => {
    window.localStorage.setItem("meeting-timer:current", "{ 깨진 값");

    expect(loadMeeting()).toBeNull();
  });

  test("회의 모양이 아닌 값은 받아들이지 않는다", () => {
    window.localStorage.setItem(
      "meeting-timer:current",
      JSON.stringify({ phase: "running" })
    );

    expect(loadMeeting()).toBeNull();
  });
});

describe("예전에 저장된 회의 이어쓰기", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("자료 항목이 없던 회의도 빈 자료로 채워서 돌려준다", () => {
    window.localStorage.setItem(
      "meeting-timer:current",
      JSON.stringify({
        phase: "running",
        currentIndex: 0,
        runningSince: null,
        items: [
          {
            id: "item-old",
            title: "배포 일정",
            allocatedSeconds: 600,
            conclusion: "",
            elapsedSeconds: 0,
          },
        ],
      })
    );

    const restored = loadMeeting();

    expect(restored?.items[0].references).toEqual([]);
    expect(restored?.items[0].referenceStatus).toBe("idle");
    expect(restored?.items[0].sourceUrl).toBe("");
  });
});
