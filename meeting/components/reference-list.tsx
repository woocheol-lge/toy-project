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

  const fromUrl = item.sourceUrl.trim() !== "";

  if (item.referenceStatus === "failed" || item.referenceStatus === "empty") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">
          {item.referenceStatus === "failed"
            ? fromUrl
              ? "넣어 둔 URL에서 자료를 가져오지 못했습니다."
              : "자료를 가져오지 못했습니다."
            : "위키백과에 이 주제로 된 문서가 없습니다."}
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
        {fromUrl ? "추가 정보" : "위키백과에서 찾은 문서입니다."}
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
