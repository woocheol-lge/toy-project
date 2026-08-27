import { stripMarkup } from "./references";
import type { Reference } from "./types";

const PRIVATE_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

/** 사설망이나 루프백 주소로 보이는 호스트인지 대략적으로 가려낸다. */
function looksPrivate(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (PRIVATE_HOSTNAMES.has(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

  return false;
}

/**
 * 서버가 가져와도 안전한 공개 http/https 주소인지 확인한다.
 * 내부망을 훑는 데 쓰이지 않도록 최소한의 방어만 둔다.
 */
export function isFetchableUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (looksPrivate(url.hostname)) return false;

  return true;
}

function findMetaContent(html: string, key: string): string | null {
  const metaRegex = /<meta\b[^>]*>/gi;
  const attrRegex =
    /([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"|([a-zA-Z0-9:_-]+)\s*=\s*'([^']*)'/g;

  for (const tagMatch of html.matchAll(metaRegex)) {
    const tag = tagMatch[0];
    const attrs: Record<string, string> = {};

    for (const attrMatch of tag.matchAll(attrRegex)) {
      const name = (attrMatch[1] ?? attrMatch[3])?.toLowerCase();
      const value = attrMatch[2] ?? attrMatch[4] ?? "";
      if (name) attrs[name] = value;
    }

    if (
      attrs.property?.toLowerCase() === key ||
      attrs.name?.toLowerCase() === key
    ) {
      if (attrs.content) return attrs.content;
    }
  }

  return null;
}

/** 페이지 HTML에서 제목과 설명을 뽑는다. AI 요약이 아니라 메타 정보 추출이다. */
export function extractPageSummary(html: string, pageUrl: string): Reference {
  const ogTitle = findMetaContent(html, "og:title");
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const rawTitle = ogTitle ?? titleTag ?? pageUrl;

  const description =
    findMetaContent(html, "og:description") ??
    findMetaContent(html, "description");

  return {
    title: stripMarkup(rawTitle),
    summary: description ? stripMarkup(description) : "",
    url: pageUrl,
  };
}
