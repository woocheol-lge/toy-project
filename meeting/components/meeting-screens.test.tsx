import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { MeetingScreens } from "./meeting-screens";

function wikipediaReply(title: string | null) {
  return {
    ok: true,
    json: async () =>
      title === null
        ? { batchcomplete: "" }
        : {
            query: {
              pages: {
                "1": {
                  pageid: 1,
                  title,
                  extract: `${title} 요약`,
                  fullurl: `https://ko.wikipedia.org/wiki/${title}`,
                },
              },
            },
          },
  } as Response;
}

beforeEach(() => {
  window.localStorage.clear();
  // 검사에서 실제 위키백과를 부르지 않는다.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply(null))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function addAgendaItem(title: string, minutes: string) {
  fireEvent.change(screen.getByLabelText("주제 제목"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("주제 시간(분)"), {
    target: { value: minutes },
  });
  fireEvent.click(screen.getByRole("button", { name: "주제 추가" }));
}

test("주제가 없으면 회의를 시작할 수 없다", () => {
  render(<MeetingScreens />);

  expect(
    screen.getByRole("heading", { level: 1, name: "회의 준비" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "회의 시작" })).toBeDisabled();
});

test("주제를 등록하고 회의를 시작하면 첫 주제와 남은 시간이 보인다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");

  const start = screen.getByRole("button", { name: "회의 시작" });
  expect(start).toBeEnabled();
  fireEvent.click(start);

  expect(
    screen.getByRole("heading", { level: 1, name: "배포 일정" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("남은 시간")).toHaveTextContent("10:00");
});

test("결론을 적고 마치면 종료 화면에 그 결론이 남는다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));

  fireEvent.change(screen.getByLabelText("이 주제의 결론"), {
    target: { value: "다음 주 화요일 배포로 확정" },
  });
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  expect(
    screen.getByRole("heading", { level: 1, name: "회의 결론" })
  ).toBeInTheDocument();
  expect(screen.getByText("다음 주 화요일 배포로 확정")).toBeInTheDocument();
});

test("결론을 비운 채 마치면 종료 화면에서 결론 없음으로 구분된다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  expect(screen.getByText("결론 없음")).toBeInTheDocument();
});

test("진행 중인 회의는 다시 그려도 이어서 보인다", () => {
  const first = render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.change(screen.getByLabelText("이 주제의 결론"), {
    target: { value: "작성 중인 결론" },
  });
  first.unmount();

  render(<MeetingScreens />);

  expect(
    screen.getByRole("heading", { level: 1, name: "배포 일정" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("이 주제의 결론")).toHaveValue("작성 중인 결론");
});

test("주제를 등록하면 찾은 자료를 주제 아래에 보여준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply("스크럼 (소프트웨어 개발)"))
  );

  render(<MeetingScreens />);
  addAgendaItem("스크럼 회고", "10");

  expect(await screen.findByText("스크럼 (소프트웨어 개발)")).toBeInTheDocument();
  expect(
    screen.getByText("스크럼 (소프트웨어 개발) 요약")
  ).toBeInTheDocument();
});

test("자료를 가져오지 못하면 다시 찾을 수 있다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("네트워크 없음");
    })
  );

  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");

  expect(
    await screen.findByText("자료를 가져오지 못했습니다.")
  ).toBeInTheDocument();

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply("소프트웨어 배포"))
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 찾기" }));

  expect(await screen.findByText("소프트웨어 배포")).toBeInTheDocument();
});

test("찾은 자료가 없으면 없다고 알려준다", async () => {
  render(<MeetingScreens />);
  addAgendaItem("사내 전용 용어", "10");

  await waitFor(() =>
    expect(
      screen.getByText("위키백과에 이 주제로 된 문서가 없습니다.")
    ).toBeInTheDocument()
  );
});
