"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Pencil } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { resolveDecision } from "../conclusion";
import { formatClock, toMarkdown } from "../format";
import type { AgendaItem } from "../types";
import type { MeetingController } from "../use-meeting";

type CopyState = "idle" | "copied" | "failed";

/**
 * 자동으로 뽑은 결정사항을 보여주고, 연필 아이콘을 누르면 손으로 고칠 수
 * 있게 한다. 빈 값으로 저장하면 다시 자동으로 뽑은 값으로 돌아간다.
 */
function DecisionField({
  item,
  onSave,
}: {
  item: AgendaItem;
  onSave: (value: string) => void;
}) {
  const decision = resolveDecision(item);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(decision);

  if (!editing) {
    return (
      <p data-testid="topic-conclusion" className="flex items-start gap-2">
        <span className="font-medium">결정사항</span>
        <span className="flex-1">{decision}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="결정사항 고치기"
          onClick={() => {
            setDraft(decision);
            setEditing(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
      </p>
    );
  }

  function commit() {
    onSave(draft.trim());
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium whitespace-nowrap">결정사항</span>
      <Input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commit();
        }}
        aria-label="결정사항 입력"
        data-testid="topic-conclusion"
        className="flex-1"
      />
    </div>
  );
}

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
          const notes = item.notes.trim();
          const empty = notes === "";
          const over = item.elapsedSeconds > item.allocatedSeconds;

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-md border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-xl font-medium">{item.title}</h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatClock(item.elapsedSeconds)} / 배정{" "}
                  {formatClock(item.allocatedSeconds)}
                </span>
                {over && <Badge variant="destructive">시간 초과</Badge>}
                {empty && <Badge variant="outline">논의사항 없음</Badge>}
              </div>
              {empty ? (
                <p className="text-muted-foreground">
                  이 주제는 논의사항을 남기지 않았습니다.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <DecisionField
                    item={item}
                    onSave={(value) =>
                      controller.updateAgendaItem(item.id, {
                        decisionOverride: value,
                      })
                    }
                  />
                  <p
                    data-testid="topic-notes"
                    className="text-sm whitespace-pre-wrap text-muted-foreground"
                  >
                    {notes}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="h-11 px-5 text-base"
              >
                다음 회의로 넘어가기
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                정말 다음 회의로 넘어가시겠습니까?
              </AlertDialogTitle>
              <AlertDialogDescription>
                지금 보이는 회의 결론이 사라지고 되돌릴 수 없습니다. 필요하다면
                먼저 마크다운으로 복사해 두세요.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                render={<Button variant="outline">취소</Button>}
              />
              <AlertDialogAction
                render={<Button onClick={controller.reset}>넘어가기</Button>}
              />
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
