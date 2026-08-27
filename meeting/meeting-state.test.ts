import { describe, expect, test } from "vitest";

import {
  addItem,
  createEmptyMeeting,
  currentElapsedSeconds,
  currentItem,
  goToNext,
  goToPrevious,
  isFirstItem,
  moveItem,
  pause,
  removeItem,
  resume,
  setNotes,
  startMeeting,
  totalAllocatedSeconds,
  totalElapsedSeconds,
  updateItem,
} from "./meeting-state";

const T0 = 1_700_000_000_000;

function meetingWithItems() {
  let meeting = createEmptyMeeting();
  meeting = addItem(meeting, { title: "배포 일정", allocatedSeconds: 600 });
  meeting = addItem(meeting, { title: "채용", allocatedSeconds: 900 });
  meeting = addItem(meeting, { title: "회고", allocatedSeconds: 300 });
  return meeting;
}

describe("회의 준비", () => {
  test("빈 회의는 주제가 없고 시작할 수 없다", () => {
    const meeting = createEmptyMeeting();

    expect(meeting.phase).toBe("setup");
    expect(meeting.items).toHaveLength(0);
  });

  test("주제를 추가하고 수정하고 삭제할 수 있다", () => {
    let meeting = addItem(createEmptyMeeting(), {
      title: "배포 일정",
      allocatedSeconds: 600,
    });
    const id = meeting.items[0].id;

    meeting = updateItem(meeting, id, { title: "배포 일정 재조정" });
    expect(meeting.items[0].title).toBe("배포 일정 재조정");

    meeting = updateItem(meeting, id, { allocatedSeconds: 1200 });
    expect(meeting.items[0].allocatedSeconds).toBe(1200);

    meeting = removeItem(meeting, id);
    expect(meeting.items).toHaveLength(0);
  });

  test("회의 전체 배정 시간은 주제 배정 시간의 합이다", () => {
    expect(totalAllocatedSeconds(meetingWithItems())).toBe(1800);
  });

  test("자료 URL을 넣지 않으면 빈 문자열이고, 넣으면 그대로 저장된다", () => {
    const noUrl = addItem(createEmptyMeeting(), {
      title: "배포 일정",
      allocatedSeconds: 600,
    });
    expect(noUrl.items[0].sourceUrl).toBe("");

    let withUrl = addItem(createEmptyMeeting(), {
      title: "배포 일정",
      allocatedSeconds: 600,
      sourceUrl: "https://example.com/deploy",
    });
    expect(withUrl.items[0].sourceUrl).toBe("https://example.com/deploy");

    const id = withUrl.items[0].id;
    withUrl = updateItem(withUrl, id, {
      sourceUrl: "https://example.com/updated",
    });
    expect(withUrl.items[0].sourceUrl).toBe("https://example.com/updated");
  });
});

describe("회의 진행", () => {
  test("시작하면 첫 주제가 현재 주제가 되고 타이머가 돈다", () => {
    const meeting = startMeeting(meetingWithItems(), T0);

    expect(meeting.phase).toBe("running");
    expect(currentItem(meeting)?.title).toBe("배포 일정");
    expect(meeting.runningSince).toBe(T0);
  });

  test("시간이 흐르면 현재 주제와 회의 전체의 경과가 함께 늘어난다", () => {
    const meeting = startMeeting(meetingWithItems(), T0);
    const now = T0 + 90_000;

    expect(currentElapsedSeconds(meeting, now)).toBe(90);
    expect(totalElapsedSeconds(meeting, now)).toBe(90);
  });

  test("배정 시간을 넘겨도 주제가 바뀌지 않고 경과가 계속 늘어난다", () => {
    const meeting = startMeeting(meetingWithItems(), T0);
    const now = T0 + 700_000;

    expect(currentItem(meeting)?.title).toBe("배포 일정");
    expect(currentElapsedSeconds(meeting, now)).toBe(700);
  });

  test("일시정지하면 경과가 멈추고 재개하면 이어진다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = pause(meeting, T0 + 60_000);

    expect(meeting.runningSince).toBeNull();
    expect(currentElapsedSeconds(meeting, T0 + 300_000)).toBe(60);
    expect(totalElapsedSeconds(meeting, T0 + 300_000)).toBe(60);

    meeting = resume(meeting, T0 + 300_000);
    expect(currentElapsedSeconds(meeting, T0 + 310_000)).toBe(70);
  });

  test("다음 주제로 넘기면 이전 주제의 경과가 확정되고 새 주제가 0에서 시작한다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = goToNext(meeting, T0 + 120_000);

    expect(currentItem(meeting)?.title).toBe("채용");
    expect(meeting.items[0].elapsedSeconds).toBe(120);
    expect(currentElapsedSeconds(meeting, T0 + 120_000)).toBe(0);
    expect(totalElapsedSeconds(meeting, T0 + 180_000)).toBe(180);
  });

  test("결론은 현재 주제에 남고 주제를 옮겨도 유지된다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = setNotes(meeting, "다음 주 화요일 배포로 확정");
    meeting = goToNext(meeting, T0 + 60_000);

    expect(meeting.items[0].notes).toBe("다음 주 화요일 배포로 확정");
    expect(currentItem(meeting)?.notes).toBe("");
  });

  test("결론이 비어 있어도 다음 주제로 넘어간다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = goToNext(meeting, T0 + 60_000);

    expect(meeting.items[0].notes).toBe("");
    expect(currentItem(meeting)?.title).toBe("채용");
  });

  test("회의 전체 배정 시간을 넘겨도 회의가 끝나지 않는다", () => {
    const meeting = startMeeting(meetingWithItems(), T0);

    expect(totalElapsedSeconds(meeting, T0 + 2_000_000)).toBe(2000);
    expect(meeting.phase).toBe("running");
  });

  test("마지막 주제에서 다음으로 넘기면 회의가 끝난다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = goToNext(meeting, T0 + 60_000);
    meeting = goToNext(meeting, T0 + 120_000);
    meeting = goToNext(meeting, T0 + 180_000);

    expect(meeting.phase).toBe("finished");
    expect(meeting.runningSince).toBeNull();
    expect(meeting.items[2].elapsedSeconds).toBe(60);
    expect(totalElapsedSeconds(meeting, T0 + 900_000)).toBe(180);
  });
});

describe("주제 순서 바꾸기", () => {
  test("주제를 위아래로 옮기면 순서가 바뀐다", () => {
    let meeting = meetingWithItems();

    meeting = moveItem(meeting, meeting.items[2].id, "up");
    expect(meeting.items.map((item) => item.title)).toEqual([
      "배포 일정",
      "회고",
      "채용",
    ]);

    meeting = moveItem(meeting, meeting.items[0].id, "down");
    expect(meeting.items.map((item) => item.title)).toEqual([
      "회고",
      "배포 일정",
      "채용",
    ]);
  });

  test("맨 위에서 더 올리거나 맨 아래에서 더 내리면 그대로 둔다", () => {
    const meeting = meetingWithItems();

    expect(moveItem(meeting, meeting.items[0].id, "up")).toEqual(meeting);
    expect(moveItem(meeting, meeting.items[2].id, "down")).toEqual(meeting);
  });
});

describe("이전 주제로 돌아가기", () => {
  test("이전 주제로 돌아가면 그 주제의 시간이 이어서 흐른다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = setNotes(meeting, "배포는 화요일");
    meeting = goToNext(meeting, T0 + 120_000);
    meeting = goToPrevious(meeting, T0 + 180_000);

    expect(currentItem(meeting)?.title).toBe("배포 일정");
    expect(currentItem(meeting)?.notes).toBe("배포는 화요일");
    // 앞서 쌓인 120초에서 이어진다.
    expect(currentElapsedSeconds(meeting, T0 + 190_000)).toBe(130);
    // 두 번째 주제에 머문 60초도 남아 있다.
    expect(meeting.items[1].elapsedSeconds).toBe(60);
  });

  test("첫 주제에서는 더 돌아가지 않는다", () => {
    const meeting = startMeeting(meetingWithItems(), T0);

    expect(goToPrevious(meeting, T0 + 60_000)).toEqual(meeting);
    expect(isFirstItem(meeting)).toBe(true);
  });

  test("일시정지 상태로 돌아가면 멈춘 채로 있는다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = goToNext(meeting, T0 + 120_000);
    meeting = pause(meeting, T0 + 180_000);
    meeting = goToPrevious(meeting, T0 + 200_000);

    expect(meeting.runningSince).toBeNull();
    expect(currentElapsedSeconds(meeting, T0 + 900_000)).toBe(120);
  });

  test("회의를 마친 뒤에는 돌아가지 않는다", () => {
    let meeting = startMeeting(meetingWithItems(), T0);
    meeting = goToNext(meeting, T0 + 60_000);
    meeting = goToNext(meeting, T0 + 120_000);
    meeting = goToNext(meeting, T0 + 180_000);

    expect(goToPrevious(meeting, T0 + 240_000)).toEqual(meeting);
  });
});
