"use client";

import { cn } from "@/lib/utils";

const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 남은 시간을 원으로 보여준다. 시간이 갈수록 원이 비고,
 * 배정 시간을 넘기면 가득 찬 상태로 색이 바뀐다.
 */
export function TimerDial({
  remainingRatio,
  overtime,
}: {
  remainingRatio: number;
  overtime: boolean;
}) {
  const shown = overtime ? 1 : remainingRatio;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="size-44 shrink-0 sm:size-56"
      role="presentation"
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-muted-foreground/20"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        className={cn(
          "transition-[stroke-dashoffset] duration-300 ease-linear",
          overtime ? "stroke-destructive" : "stroke-foreground"
        )}
      />
    </svg>
  );
}
