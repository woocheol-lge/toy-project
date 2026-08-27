"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { formatClock, toMarkdown } from "../format";
import type { MeetingController } from "../use-meeting";

type CopyState = "idle" | "copied" | "failed";

export function FinishedScreen({
  controller,
}: {
  controller: MeetingController;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState === "idle") return;

    const id = window.setTimeout(() => setCopyState("idle"), 2500);

    return () => window.clearTimeout(id);
  }, [copyState]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdown(controller.meeting));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">회의 결론</h1>
        <p className="text-muted-foreground">
          주제 {controller.meeting.items.length}개를 마쳤습니다. 결론을 복사해
          원래 쓰던 곳에 붙여넣으세요.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {controller.meeting.items.map((item) => {
          const empty = item.conclusion.trim() === "";
          const over = item.elapsedSeconds > item.allocatedSeconds;

          return (
            <li key={item.id} className="flex flex-col gap-2 rounded-md border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-xl font-medium">{item.title}</h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatClock(item.elapsedSeconds)} / 배정{" "}
                  {formatClock(item.allocatedSeconds)}
                </span>
                {over && <Badge variant="destructive">시간 초과</Badge>}
                {empty && <Badge variant="outline">결론 없음</Badge>}
              </div>
              {empty ? (
                <p className="text-muted-foreground">
                  이 주제는 결론을 남기지 않았습니다.
                </p>
              ) : (
                <p className="whitespace-pre-wrap">{item.conclusion}</p>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={controller.reset}
          className="h-11 px-5 text-base"
        >
          새 회의 준비
        </Button>
        <div className="flex items-center gap-3">
          {copyState === "failed" && (
            <span className="text-sm text-destructive">
              복사하지 못했습니다.
            </span>
          )}
          <Button
            type="button"
            onClick={copyMarkdown}
            className="h-11 px-6 text-base"
          >
            {copyState === "copied" ? <Check /> : <Copy />}
            {copyState === "copied" ? "복사했습니다" : "마크다운 복사"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
