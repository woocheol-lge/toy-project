import { afterEach, describe, expect, test, vi } from "vitest";

import {
  parseLookupResponse,
  searchReferences,
  stripMarkup,
} from "./references";

describe("위키백과 문서 읽기", () => {
  test("제목과 요약, 문서 주소를 뽑아낸다", () => {
    const parsed = parseLookupResponse({
      query: {
        pages: {
          "1234": {
            pageid: 1234,
            title: "기술 부채",
            extract: "기술 부채는 쉬운 방법을 택해 생기는 재작업 비용이다.",
            fullurl: "https://ko.wikipedia.org/wiki/기술_부채",
          },
        },
      },
    });

    expect(parsed).toEqual([
      {
        title: "기술 부채",
        summary: "기술 부채는 쉬운 방법을 택해 생기는 재작업 비용이다.",
        url: "https://ko.wikipedia.org/wiki/기술_부채",
      },
    ]);
  });

  test("제목이 맞는 문서가 없으면 빈 목록을 준다", () => {
    expect(parseLookupResponse({ batchcomplete: "" })).toEqual([]);
  });

  test("모양이 다른 응답은 빈 목록으로 넘긴다", () => {
    expect(parseLookupResponse(null)).toEqual([]);
    expect(parseLookupResponse({})).toEqual([]);
    expect(parseLookupResponse({ query: { pages: "이상한 값" } })).toEqual([]);
  });

  test("주소가 없는 항목은 건너뛴다", () => {
    const parsed = parseLookupResponse({
      query: { pages: { "1": { title: "주소 없는 문서", extract: "요약" } } },
    });

    expect(parsed).toEqual([]);
  });

  test("요약이 비어 있어도 제목과 주소는 살린다", () => {
    const parsed = parseLookupResponse({
      query: {
        pages: {
          "1": {
            title: "마이크로서비스",
            fullurl: "https://ko.wikipedia.org/wiki/x",
          },
        },
      },
    });

    expect(parsed[0].summary).toBe("");
  });
});

describe("요약에 섞인 표시 지우기", () => {
  test("태그를 걷어내고 글자만 남긴다", () => {
    expect(stripMarkup("<b>회고</b>는 돌아보기")).toBe("회고는 돌아보기");
  });

  test("문자 표기를 원래 글자로 되돌린다", () => {
    expect(stripMarkup("&quot;배포&quot; &amp; 운영")).toBe('"배포" & 운영');
  });

  test("이어진 공백과 줄바꿈을 하나로 줄인다", () => {
    expect(stripMarkup("배포   일정\n\n확정 ")).toBe("배포 일정 확정");
  });
});

describe("전체 문구로 못 찾으면 핵심어로 다시 찾기", () => {
  function pageResponse(title: string) {
    return {
      query: {
        pages: {
          "1": {
            pageid: 1,
            title,
            extract: `${title} 요약`,
            fullurl: `https://ko.wikipedia.org/wiki/${title}`,
          },
        },
      },
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("전체 문구로 바로 찾으면 핵심어 재시도를 하지 않는다", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => pageResponse("배포"),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const found = await searchReferences("배포 일정 확정");

    expect(found[0].title).toBe("배포");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("전체 문구로 못 찾으면 핵심어로 한 번 더 찾는다", async () => {
    let call = 0;
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      call += 1;
      if (call === 1) {
        return { ok: true, json: async () => ({ batchcomplete: "" }) };
      }
      return { ok: true, json: async () => pageResponse("배포") };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const found = await searchReferences("배포 일정 확정");

    expect(found[0].title).toBe("배포");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondUrl = String(fetchSpy.mock.calls[1][0]);
    expect(secondUrl).toContain(encodeURIComponent("배포"));
  });

  test("핵심어 후보가 없으면 재시도하지 않고 빈 결과를 준다", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ batchcomplete: "" }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const found = await searchReferences("마이크로서비스 전환");

    expect(found).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("핵심어 후보도 모두 실패하면 빈 결과를 준다", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ batchcomplete: "" }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const found = await searchReferences("고객 응대 매뉴얼 정리");

    expect(found).toEqual([]);
    // 전체 문구 1번 + 핵심어 후보(매뉴얼, 고객, 응대) 3번 = 4번
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});
