import { describe, expect, test } from "vitest";

import { summarizeConclusion } from "./conclusion";

describe("논의사항에서 결론 뽑기", () => {
  test("여러 줄 중 마지막 줄을 결론으로 삼는다", () => {
    const notes = "일정 후보를 논의함\n화요일과 목요일이 나옴\n화요일로 확정";

    expect(summarizeConclusion(notes)).toBe("화요일로 확정");
  });

  test("끝에 빈 줄이 있어도 마지막 내용 있는 줄을 찾는다", () => {
    const notes = "화요일로 확정\n\n   \n";

    expect(summarizeConclusion(notes)).toBe("화요일로 확정");
  });

  test("한 줄에 문장이 여러 개면 마지막 문장을 뽑는다", () => {
    const notes = "여러 후보를 논의했다. 화요일로 확정했다.";

    expect(summarizeConclusion(notes)).toBe("화요일로 확정했다.");
  });

  test("목록 표시(-, 1., 2))는 걷어내고 내용만 남긴다", () => {
    expect(summarizeConclusion("- 화요일로 확정")).toBe("화요일로 확정");
    expect(summarizeConclusion("2) 화요일로 확정")).toBe("화요일로 확정");
    expect(summarizeConclusion("3. 화요일로 확정")).toBe("화요일로 확정");
  });

  test("빈 글이면 결론도 없다", () => {
    expect(summarizeConclusion("")).toBe("");
    expect(summarizeConclusion("   \n  \n")).toBe("");
  });

  test("앞뒤 공백은 정리한다", () => {
    expect(summarizeConclusion("  화요일로 확정   ")).toBe("화요일로 확정");
  });
});
