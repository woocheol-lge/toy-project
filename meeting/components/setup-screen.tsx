"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatClock } from "../format";
import { ReferenceList } from "./reference-list";
import { DEFAULT_ALLOCATED_SECONDS } from "../types";
import type { MeetingController } from "../use-meeting";

const DEFAULT_MINUTES = DEFAULT_ALLOCATED_SECONDS / 60;

/**
 * URL을 바꾸면 다시 가져오는 네트워크 요청이 걸리므로, 타이핑마다가 아니라
 * 입력을 마쳤을 때(포커스를 벗어나거나 Enter)만 반영한다.
 */
function SourceUrlInput({
  value,
  onCommit,
  label,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(value);

  function commitIfChanged() {
    if (draft.trim() !== value) onCommit(draft.trim());
  }

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitIfChanged}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        commitIfChanged();
      }}
      placeholder="비워두면 위키백과에서 자동으로 찾습니다"
      aria-label={label}
    />
  );
}

/**
 * 지웠다가 다시 치는 편집을 막지 않도록 입력칸 글자를 그대로 들고 있는다.
 * 쓸 수 있는 숫자가 됐을 때만 주제에 반영한다.
 */
function MinutesInput({
  initialMinutes,
  onChangeMinutes,
  label,
}: {
  initialMinutes: number;
  onChangeMinutes: (minutes: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(String(initialMinutes));

  return (
    <Input
      type="number"
      min={1}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);

        const parsed = Number(next);
        if (!Number.isFinite(parsed) || parsed <= 0) return;

        onChangeMinutes(parsed);
      }}
      onBlur={() => {
        const parsed = Number(draft);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setDraft(String(initialMinutes));
        }
      }}
      aria-label={label}
      className="w-20"
    />
  );
}

export function SetupScreen({ controller }: { controller: MeetingController }) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [sourceUrl, setSourceUrl] = useState("");

  const parsedMinutes = Number(minutes);
  const validMinutes = Number.isFinite(parsedMinutes) && parsedMinutes > 0;
  const addable = title.trim() !== "" && validMinutes;

  function submitNewItem() {
    if (!addable) return;

    controller.addAgendaItem({
      title: title.trim(),
      allocatedSeconds: Math.round(parsedMinutes * 60),
      sourceUrl: sourceUrl.trim(),
    });
    setTitle("");
    setMinutes(String(DEFAULT_MINUTES));
    setSourceUrl("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">포모도로 미팅 타이머</h1>
        <p className="text-muted-foreground">
          주제와 시간만 정하면, 나머지는 타이머가 굴려 드립니다.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          submitNewItem();
        }}
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">주제</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 다음 배포 일정 확정"
            aria-label="주제 제목"
          />
        </label>
        <label className="flex w-32 flex-col gap-1.5">
          <span className="text-sm font-medium">시간(분)</span>
          <Input
            type="number"
            min={1}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            aria-label="주제 시간(분)"
          />
        </label>
        <Button type="submit" disabled={!addable} className="h-9 px-4">
          주제 추가
        </Button>
      </form>

      <label className="-mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">
          자료 URL (선택)
        </span>
        <Input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="비워두면 위키백과에서 자동으로 찾습니다"
          aria-label="자료 URL"
        />
      </label>

      {controller.meeting.items.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          아직 등록한 주제가 없습니다.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {controller.meeting.items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <Input
                  value={item.title}
                  onChange={(event) =>
                    controller.updateAgendaItem(item.id, {
                      title: event.target.value,
                    })
                  }
                  aria-label={`${index + 1}번 주제 제목`}
                  className="flex-1"
                />
                <MinutesInput
                  initialMinutes={Math.round(item.allocatedSeconds / 60)}
                  onChangeMinutes={(next) =>
                    controller.updateAgendaItem(item.id, {
                      allocatedSeconds: Math.round(next * 60),
                    })
                  }
                  label={`${index + 1}번 주제 시간(분)`}
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`${index + 1}번 주제 위로`}
                    disabled={index === 0}
                    onClick={() => controller.moveAgendaItem(item.id, "up")}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`${index + 1}번 주제 아래로`}
                    disabled={index === controller.meeting.items.length - 1}
                    onClick={() => controller.moveAgendaItem(item.id, "down")}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    aria-label={`${index + 1}번 주제 삭제`}
                    onClick={() => controller.removeAgendaItem(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pl-9">
                <span className="text-sm text-muted-foreground">
                  자료 URL (선택)
                </span>
                <SourceUrlInput
                  value={item.sourceUrl}
                  onCommit={(next) =>
                    controller.setAgendaItemSourceUrl(item.id, next)
                  }
                  label={`${index + 1}번 주제 자료 URL`}
                />
              </div>

              <div
                className="pl-9"
                aria-label={`${index + 1}번 주제 배경 자료`}
              >
                <ReferenceList
                  item={item}
                  onRetry={() => controller.lookUpReferencesAgain(item.id)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="flex items-center justify-between border-t pt-6">
        <p className="text-muted-foreground">
          주제 {controller.meeting.items.length}개, 전체{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatClock(controller.totalAllocatedSeconds)}
          </span>
        </p>
        <Button
          type="button"
          disabled={!controller.startable}
          onClick={controller.start}
          className="h-11 px-6 text-base"
        >
          회의 시작
        </Button>
      </footer>
    </div>
  );
}
