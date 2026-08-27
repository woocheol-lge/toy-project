import { describe, expect, test } from "vitest";

import { extractKeyPhraseCandidates } from "./key-phrase";

describe("주제에서 다시 찾아볼 핵심어 후보 뽑기", () => {
  test("회의용 군더더기 말을 걷어내고 남은 단어를 긴 순서로 준다", () => {
    expect(extractKeyPhraseCandidates("배포 일정 확정")).toEqual(["배포"]);
    expect(extractKeyPhraseCandidates("채용 진행 상황")).toEqual(["채용"]);
    expect(extractKeyPhraseCandidates("이번 주 예산 검토")).toEqual(["예산"]);
  });

  test("여러 단어가 남으면 긴 단어부터 순서대로 후보로 준다", () => {
    expect(extractKeyPhraseCandidates("다음 분기 로드맵")).toEqual([
      "로드맵",
      "분기",
    ]);
    expect(extractKeyPhraseCandidates("고객 응대 매뉴얼 정리")).toEqual([
      "매뉴얼",
      "고객",
      "응대",
    ]);
  });

  test("길이가 같으면 원래 순서를 지킨다", () => {
    expect(extractKeyPhraseCandidates("신규 서버 도입 검토")).toEqual([
      "서버",
      "도입",
    ]);
  });

  test("걸러낼 말이 하나도 없으면 후보가 없다", () => {
    expect(extractKeyPhraseCandidates("마이크로서비스 전환")).toEqual([]);
  });

  test("모든 단어가 군더더기면 후보가 없다", () => {
    expect(extractKeyPhraseCandidates("다음 회의 계획")).toEqual([]);
  });

  test("빈 주제는 후보가 없다", () => {
    expect(extractKeyPhraseCandidates("")).toEqual([]);
    expect(extractKeyPhraseCandidates("   ")).toEqual([]);
  });
});
