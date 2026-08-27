import { describe, expect, test } from "vitest";

import {
  extractPageSummary,
  isFetchableUrl,
  looksLikeUrl,
} from "./link-preview";

describe("가져올 수 있는 URL인지 확인", () => {
  test("일반적인 https 주소는 가져올 수 있다", () => {
    expect(isFetchableUrl("https://example.com/article")).toBe(true);
  });

  test("http 주소도 가져올 수 있다", () => {
    expect(isFetchableUrl("http://example.com")).toBe(true);
  });

  test("http/https가 아닌 프로토콜은 막는다", () => {
    expect(isFetchableUrl("ftp://example.com")).toBe(false);
    expect(isFetchableUrl("javascript:alert(1)")).toBe(false);
  });

  test("내부망을 가리키는 주소는 막는다", () => {
    expect(isFetchableUrl("http://localhost:3000")).toBe(false);
    expect(isFetchableUrl("http://127.0.0.1")).toBe(false);
    expect(isFetchableUrl("http://192.168.1.5")).toBe(false);
    expect(isFetchableUrl("http://10.0.0.1")).toBe(false);
    expect(isFetchableUrl("http://[::1]")).toBe(false);
  });

  test("URL 모양이 아니거나 비어 있으면 막는다", () => {
    expect(isFetchableUrl("")).toBe(false);
    expect(isFetchableUrl("이런 건 URL이 아니다")).toBe(false);
  });
});

describe("페이지에서 제목과 설명 뽑기", () => {
  const URL = "https://example.com/article";

  test("og:title과 og:description을 우선 쓴다", () => {
    const html = `
      <html><head>
        <title>덜 정확한 제목</title>
        <meta property="og:title" content="정확한 제목" />
        <meta property="og:description" content="정확한 설명입니다." />
        <meta name="description" content="덜 정확한 설명" />
      </head></html>
    `;

    expect(extractPageSummary(html, URL)).toEqual({
      title: "정확한 제목",
      summary: "정확한 설명입니다.",
      url: URL,
    });
  });

  test("og 태그가 없으면 title과 description 메타로 대신한다", () => {
    const html = `
      <html><head>
        <title>페이지 제목</title>
        <meta name="description" content="일반 설명입니다.">
      </head></html>
    `;

    expect(extractPageSummary(html, URL)).toEqual({
      title: "페이지 제목",
      summary: "일반 설명입니다.",
      url: URL,
    });
  });

  test("속성 순서가 달라도 읽는다", () => {
    const html = `<meta content="속성 순서가 달라도" property="og:title">`;

    expect(extractPageSummary(html, URL).title).toBe("속성 순서가 달라도");
  });

  test("제목도 설명도 없으면 URL을 제목으로 대신하고 설명은 비운다", () => {
    const html = `<html><head></head><body>내용만 있음</body></html>`;

    expect(extractPageSummary(html, URL)).toEqual({
      title: URL,
      summary: "",
      url: URL,
    });
  });

  test("문자 표기와 태그가 섞여 있어도 걷어낸다", () => {
    const html = `<meta property="og:description" content="A &amp; B &lt;태그&gt;">`;

    expect(extractPageSummary(html, URL).summary).toBe("A & B <태그>");
  });
});

describe("URL 모양인지만 가려내기", () => {
  test("http/https 주소는 URL 모양이다", () => {
    expect(looksLikeUrl("https://example.com")).toBe(true);
    expect(looksLikeUrl("http://example.com")).toBe(true);
  });

  test("스킴이 없는 낱말은 URL 모양이 아니다", () => {
    expect(looksLikeUrl("MCP")).toBe(false);
    expect(looksLikeUrl("서버 아키텍처")).toBe(false);
  });

  test("차단 대상인 내부망 주소도 URL 모양으로는 본다", () => {
    expect(looksLikeUrl("http://localhost:9999")).toBe(true);
  });

  test("빈 문자열은 URL 모양이 아니다", () => {
    expect(looksLikeUrl("")).toBe(false);
    expect(looksLikeUrl("   ")).toBe(false);
  });
});
