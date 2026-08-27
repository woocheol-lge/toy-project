import { describe, expect, test } from "vitest";

import { addItem, createEmptyMeeting, setNotes } from "./meeting-state";
import { formatClock, formatWallClock, toMarkdown } from "./format";

describe("시간 표시", () => {
  test("분과 초로 보여준다", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(600)).toBe("10:00");
  });

  test("한 시간을 넘으면 시간까지 보여준다", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("현재 시각 표시", () => {
  test("시와 분을 두 자리로 보여준다", () => {
    expect(formatWallClock(new Date(2026, 7, 27, 14, 5).getTime())).toBe(
      "14:05",
    );
    expect(formatWallClock(new Date(2026, 7, 27, 9, 30).getTime())).toBe(
      "09:30",
    );
  });
});

describe("결론 마크다운", () => {
  function meetingWithConclusions() {
    let meeting = createEmptyMeeting();
    meeting = addItem(meeting, { title: "배포 일정", allocatedSeconds: 600 });
    meeting = addItem(meeting, { title: "채용", allocatedSeconds: 900 });
    meeting = setNotes(
      meeting,
      "배포 후보 두 가지를 검토함\n다음 주 화요일 배포로 확정",
    );
    return meeting;
  }

  test("주제 제목과 논의사항, 정리된 결론을 함께 담는다", () => {
    const markdown = toMarkdown(meetingWithConclusions());

    expect(markdown).toContain("## 배포 일정");
    expect(markdown).toContain("**결론:** 다음 주 화요일 배포로 확정");
    expect(markdown).toContain("배포 후보 두 가지를 검토함");
  });

  test("논의사항이 빈 주제도 제목은 담고 논의사항 없음을 표시한다", () => {
    const markdown = toMarkdown(meetingWithConclusions());

    expect(markdown).toContain("## 채용");
    expect(markdown).toContain("_논의사항 없음_");
  });

  test("주제 순서를 그대로 지킨다", () => {
    const markdown = toMarkdown(meetingWithConclusions());

    expect(markdown.indexOf("## 배포 일정")).toBeLessThan(
      markdown.indexOf("## 채용"),
    );
  });
});
