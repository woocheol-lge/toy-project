"use client";

import { ExternalLink, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { AgendaItem } from "../types";

export function ReferenceList({
  item,
  onRetry,
}: {
  item: AgendaItem;
  onRetry: () => void;
}) {
  if (item.referenceStatus === "idle") {
    return (
      <p className="text-muted-foreground">주제에 맞는 자료를 찾는 중입니다.</p>
    );
  }

  if (item.referenceStatus === "failed" || item.referenceStatus === "empty") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">
          {item.referenceStatus === "failed"
            ? "자료를 가져오지 못했습니다."
            : "이 주제로 찾은 자료가 없습니다."}
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw />
          다시 찾기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        위키백과에서 찾은 문서입니다. 주제와 상관없는 것이 섞일 수 있습니다.
      </p>
      <ul className="flex flex-col gap-3">
        {item.references.map((reference) => (
          <li key={reference.url} className="flex flex-col gap-1">
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              {reference.title}
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
            <p className="text-sm text-muted-foreground">{reference.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
