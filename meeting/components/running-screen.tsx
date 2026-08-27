"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { formatClock, formatWallClock } from "../format";
import { ReferenceList } from "./reference-list";
import { TimerDial } from "./timer-dial";
import type { MeetingController } from "../use-meeting";

/** 남은 시간이 이보다 적으면(초과 포함) 시계를 위험 색으로 바꾼다. */
const DANGER_THRESHOLD_SECONDS = 5 * 60;

/**
 * 배정 시간의 절반을 넘긴 주제를 한 번만 표시하려고 id를 들고 있는다.
 * 개발 모드의 StrictMode 이중 렌더링에서도 꺼지는 타이머가 취소되지
 * 않도록, 정리 함수에서 타이머를 지우지 않고 그대로 끝까지 돈다.
 */
function useHalfwayFlash(itemId: string | undefined, halfwayPassed: boolean) {
  const [flashing, setFlashing] = useState(false);
  const flashed = useRef(new Set<string>());

  useEffect(() => {
    if (!itemId || !halfwayPassed || flashed.current.has(itemId)) return;

    flashed.current.add(itemId);
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), 900);
  }, [itemId, halfwayPassed]);

  return flashing;
}

export function RunningScreen({
  controller,
}: {
  controller: MeetingController;
}) {
  const item = controller.currentItem;

  const halfwayPassed = Boolean(
    item && controller.currentElapsedSeconds >= item.allocatedSeconds / 2,
  );
  const flashing = useHalfwayFlash(item?.id, halfwayPassed);

  if (!item) return null;

  const overtime = controller.currentOvertimeSeconds > 0;
  const danger = controller.currentRemainingSeconds <= DANGER_THRESHOLD_SECONDS;
  const totalOvertime = controller.totalOvertimeSeconds > 0;
  const position = controller.meeting.currentIndex + 1;
  const count = controller.meeting.items.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      {flashing && (
        <div
          aria-hidden="true"
          data-testid="halfway-flash"
          className="pointer-events-none fixed inset-0 z-50 animate-halfway-flash bg-primary/25"
        />
      )}
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-lg text-muted-foreground tabular-nums">
          주제 {position} / {count}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-lg">
          <p className="text-muted-foreground tabular-nums">
            지금{" "}
            <span className="font-medium text-foreground">
              {formatWallClock(controller.now)}
            </span>
          </p>
          <p
            className={cn(
              "tabular-nums",
              totalOvertime ? "text-destructive" : "text-muted-foreground",
            )}
          >
            회의 전체{" "}
            <span className="font-medium">
              {totalOvertime
                ? `+${formatClock(controller.totalOvertimeSeconds)} 초과`
                : `${formatClock(controller.totalRemainingSeconds)} 남음`}
            </span>
          </p>
        </div>
      </header>

      <section className="flex flex-col items-center gap-4 py-2">
        <h1 className="text-center text-4xl font-semibold text-balance">
          {item.title}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-8">
          <TimerDial
            remainingRatio={controller.currentRemainingRatio}
            overtime={overtime}
          />

          <div className="flex flex-col items-center gap-1">
            <p
              className={cn(
                "font-mono text-7xl leading-none font-bold tabular-nums sm:text-8xl",
                danger && "text-destructive",
              )}
              aria-label={overtime ? "초과 시간" : "남은 시간"}
            >
              {overtime
                ? `+${formatClock(controller.currentOvertimeSeconds)}`
                : formatClock(controller.currentRemainingSeconds)}
            </p>
            <p
              className={cn(
                "text-lg",
                danger
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {overtime
                ? "배정 시간을 넘겼습니다"
                : `배정 ${formatClock(item.allocatedSeconds)}`}
            </p>
            {controller.paused && (
              <p className="text-lg font-medium">일시정지 중</p>
            )}
          </div>
        </div>

        {overtime && (
          <p className="text-lg font-medium text-destructive">
            논의사항을 적고 넘어가세요.
          </p>
        )}
      </section>

      <div className="grid flex-1 gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-base font-medium">논의사항</span>
          <Textarea
            value={item.notes}
            onChange={(event) => controller.writeNotes(event.target.value)}
            placeholder="회의 중 나온 이야기를 자유롭게 적어 두세요. 마지막 줄이 결론으로 정리됩니다."
            aria-label="논의사항"
            className="min-h-32 text-base"
          />
        </label>

        <section
          className="flex flex-col gap-2"
          aria-label="이 주제의 배경 자료"
        >
          <h2 className="text-base font-medium">배경 자료</h2>
          <ReferenceList
            item={item}
            onRetry={() => controller.lookUpReferencesAgain(item.id)}
          />
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={
            controller.paused ? controller.resumeTimer : controller.pauseTimer
          }
          className="h-11 px-5 text-base"
        >
          {controller.paused ? <Play /> : <Pause />}
          {controller.paused ? "다시 시작" : "일시정지"}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={controller.firstItem}
            onClick={controller.previous}
            className="h-11 px-5 text-base"
          >
            <SkipBack />
            이전 주제
          </Button>
          <Button
            type="button"
            onClick={controller.next}
            className="h-11 px-6 text-base"
          >
            {controller.lastItem ? "회의 마치기" : "다음 주제"}
            <SkipForward />
          </Button>
        </div>
      </footer>
    </div>
  );
}
