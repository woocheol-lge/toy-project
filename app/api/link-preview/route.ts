import { NextResponse } from "next/server";

import { extractPageSummary, isFetchableUrl } from "@/meeting/link-preview";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_LENGTH = 300_000;

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url") ?? "";

  if (!isFetchableUrl(target)) {
    return NextResponse.json(
      { error: "가져올 수 없는 주소입니다." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "meeting-timer-link-preview/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `페이지를 가져오지 못했습니다: ${response.status}` },
        { status: 502 },
      );
    }

    const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
    const reference = extractPageSummary(html, response.url || target);

    return NextResponse.json(reference);
  } catch {
    return NextResponse.json(
      { error: "페이지를 가져오는 중 문제가 생겼습니다." },
      { status: 502 },
    );
  }
}
