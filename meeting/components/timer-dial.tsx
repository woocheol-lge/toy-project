"use client";

import { cn } from "@/lib/utils";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2;

/** 12시 방향에서 시계 방향으로 도는 파이 조각의 SVG 경로를 만든다. */
function pieSlicePath(ratio: number): string | null {
  if (ratio <= 0) return null;
  if (ratio >= 1) return `M ${CENTER} 0 A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER - 0.01} 0 Z`;

  const angle = ratio * 360;
  const toRadians = (degrees: number) => ((degrees - 90) * Math.PI) / 180;
  const x = CENTER + RADIUS * Math.cos(toRadians(angle));
  const y = CENTER + RADIUS * Math.sin(toRadians(angle));
  const largeArc = angle > 180 ? 1 : 0;

  return `M ${CENTER} ${CENTER} L ${CENTER} 0 A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x} ${y} Z`;
}

/**
 * 포모도로 타이머처럼 가득 찬 빨간 원이 시간이 갈수록 파이 조각으로 줄어든다.
 * 배정 시간을 넘기면 빨간 조각은 남지 않고, 테두리가 초과를 알린다.
 */
export function TimerDial({
  remainingRatio,
  overtime,
}: {
  remainingRatio: number;
  overtime: boolean;
}) {
  const path = overtime ? null : pieSlicePath(remainingRatio);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="size-44 shrink-0 sm:size-56"
      role="presentation"
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS - 1}
        fill="none"
        strokeWidth={2}
        className={cn(overtime ? "stroke-destructive" : "stroke-muted-foreground/25")}
      />
      {path && (
        <path
          d={path}
          className="fill-destructive transition-[d] duration-300 ease-linear"
        />
      )}
    </svg>
  );
}
