import { afterEach, describe, expect, test, vi } from "vitest";

import {
  looksKorean,
  parseTranslateResponse,
  translateToKorean,
} from "./translate";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("이미 한글인지 가늠하기", () => {
  test("한글이 대부분이면 이미 한국어로 본다", () => {
    expect(looksKorean("기술 부채는 이런 것이다")).toBe(true);
  });

  test("영어 문장은 한국어가 아니라고 본다", () => {
    expect(looksKorean("Build software better, together")).toBe(false);
  });

  test("빈 문자열은 번역할 것이 없으니 이미 됐다고 본다", () => {
    expect(looksKorean("")).toBe(true);
    expect(looksKorean("   ")).toBe(true);
  });

  test("한글 속에 영어 낱말이 조금 섞여도 한국어로 본다", () => {
    expect(looksKorean("GitHub는 사람들이 소프트웨어를 만드는 곳입니다.")).toBe(
      true,
    );
  });
});

describe("번역 응답 읽기", () => {
  test("성공 응답에서 번역문을 뽑는다", () => {
    expect(
      parseTranslateResponse({
        responseStatus: 200,
        responseData: { translatedText: "번역된 문장" },
      }),
    ).toBe("번역된 문장");
  });

  test("상태 코드가 200이 아니면 실패로 본다", () => {
    expect(
      parseTranslateResponse({
        responseStatus: 403,
        responseData: { translatedText: "쓸 수 없는 값" },
      }),
    ).toBeNull();
  });

  test("모양이 다른 응답은 실패로 본다", () => {
    expect(parseTranslateResponse(null)).toBeNull();
    expect(parseTranslateResponse({})).toBeNull();
  });
});

describe("한국어로 번역하기", () => {
  test("이미 한국어면 네트워크를 부르지 않고 그대로 돌려준다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await translateToKorean("기술 부채는 이런 것이다");

    expect(result).toBe("기술 부채는 이런 것이다");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("빈 문자열은 그대로 빈 문자열이다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await translateToKorean("")).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("영어 문장을 번역해서 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          responseStatus: 200,
          responseData: { translatedText: "함께 소프트웨어를 더 잘 만드세요" },
        }),
      })),
    );

    expect(await translateToKorean("Build software better, together")).toBe(
      "함께 소프트웨어를 더 잘 만드세요",
    );
  });

  test("번역에 실패하면 원문을 그대로 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("네트워크 없음");
      }),
    );

    expect(await translateToKorean("Build software better, together")).toBe(
      "Build software better, together",
    );
  });

  test("응답이 실패 모양이어도 원문을 그대로 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ responseStatus: 403 }),
      })),
    );

    expect(await translateToKorean("Build software better, together")).toBe(
      "Build software better, together",
    );
  });
});
