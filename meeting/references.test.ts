import { describe, expect, test } from "vitest";

import { parseSearchResponse, stripMarkup } from "./references";

describe("위키백과 검색 결과 읽기", () => {
  test("제목과 요약, 문서 주소를 뽑아낸다", () => {
    const parsed = parseSearchResponse({
      query: {
        search: [
          {
            pageid: 1234,
            title: "스크럼 (소프트웨어 개발)",
            snippet: '<span class="searchmatch">스크럼</span>은 팀이 일하는 방식이다',
          },
        ],
      },
    });

    expect(parsed).toEqual([
      {
        title: "스크럼 (소프트웨어 개발)",
        summary: "스크럼은 팀이 일하는 방식이다",
        url: "https://ko.wikipedia.org/?curid=1234",
      },
    ]);
  });

  test("검색 결과가 없으면 빈 목록을 준다", () => {
    expect(parseSearchResponse({ query: { search: [] } })).toEqual([]);
  });

  test("모양이 다른 응답은 빈 목록으로 넘긴다", () => {
    expect(parseSearchResponse(null)).toEqual([]);
    expect(parseSearchResponse({})).toEqual([]);
    expect(parseSearchResponse({ query: { search: "이상한 값" } })).toEqual([]);
  });

  test("항목에 필요한 값이 빠져 있으면 그 항목만 건너뛴다", () => {
    const parsed = parseSearchResponse({
      query: {
        search: [
          { pageid: 1, title: "제대로 된 문서", snippet: "요약" },
          { title: "번호 없는 문서", snippet: "요약" },
        ],
      },
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("제대로 된 문서");
  });
});

describe("요약에 섞인 표시 지우기", () => {
  test("태그를 걷어내고 글자만 남긴다", () => {
    expect(stripMarkup('<span class="searchmatch">회고</span>는 <b>돌아보기</b>')).toBe(
      "회고는 돌아보기"
    );
  });

  test("문자 표기를 원래 글자로 되돌린다", () => {
    expect(stripMarkup("&quot;배포&quot; &amp; 운영 &lt;주의&gt;")).toBe(
      '"배포" & 운영 <주의>'
    );
  });

  test("이어진 공백을 하나로 줄인다", () => {
    expect(stripMarkup("배포   일정\n\n확정 ")).toBe("배포 일정 확정");
  });
});
