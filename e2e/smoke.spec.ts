import { expect, test, type Page } from "@playwright/test";

const WIKIPEDIA = "https://ko.wikipedia.org/w/api.php*";

/** 검사가 바깥 네트워크에 기대지 않도록 위키백과 응답을 정해 둔다. */
async function stubReferences(page: Page, title: string | null) {
  await page.route(WIKIPEDIA, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        title === null
          ? { batchcomplete: "" }
          : {
              query: {
                pages: {
                  "1": {
                    pageid: 1,
                    title,
                    extract: `${title} 요약`,
                    fullurl: `https://ko.wikipedia.org/wiki/${encodeURIComponent(title)}`,
                  },
                },
              },
            }
      ),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await stubReferences(page, null);
});

async function addAgendaItem(page: Page, title: string, minutes: string) {
  await page.getByLabel("주제 제목", { exact: true }).fill(title);
  await page.getByLabel("주제 시간(분)", { exact: true }).fill(minutes);
  await page.getByRole("button", { name: "주제 추가" }).click();
}

test("주제를 등록하고 회의를 진행해 결론을 마크다운으로 복사한다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  await expect(page).toHaveTitle("포모도로 미팅 타이머");
  const start = page.getByRole("button", { name: "회의 시작" });
  await expect(start).toBeDisabled();

  await addAgendaItem(page, "배포 일정 확정", "10");
  await addAgendaItem(page, "채용 진행 상황", "5");

  // 회의 전체 배정 시간은 주제 배정 시간의 합이다.
  await expect(page.getByText("주제 2개, 전체")).toContainText("15:00");

  await expect(start).toBeEnabled();
  await start.click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "배포 일정 확정"
  );
  await expect(page.getByLabel("남은 시간")).toHaveText("10:00");
  await expect(page.getByText("회의 전체")).toContainText("남음");

  await page
    .getByLabel("이 주제의 결론")
    .fill("다음 주 화요일 오전 배포로 확정");
  await page.getByRole("button", { name: "다음 주제" }).click();

  // 두 번째 주제는 결론을 비운 채로 마친다.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "채용 진행 상황"
  );
  await page.getByRole("button", { name: "회의 마치기" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("회의 결론");
  await expect(
    page.getByText("다음 주 화요일 오전 배포로 확정")
  ).toBeVisible();
  await expect(page.getByText("결론 없음")).toBeVisible();

  await page.getByRole("button", { name: "마크다운 복사" }).click();
  await expect(page.getByRole("button", { name: "복사했습니다" })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("## 배포 일정 확정");
  expect(copied).toContain("다음 주 화요일 오전 배포로 확정");
  expect(copied).toContain("## 채용 진행 상황");
  expect(copied).toContain("_결론 없음_");
});

test("회의를 시작하기 전에는 주제를 고치고 지울 수 있다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await addAgendaItem(page, "채용 진행 상황", "5");

  await page.getByLabel("1번 주제 제목").fill("배포 일정 재조정");

  // 숫자를 지웠다가 다시 치는 편집이 막히지 않아야 한다.
  const minutes = page.getByLabel("1번 주제 시간(분)");
  await minutes.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("20");
  await expect(minutes).toHaveValue("20");
  await expect(page.getByText("주제 2개, 전체")).toContainText("25:00");

  await page.getByRole("button", { name: "2번 주제 삭제" }).click();
  await expect(page.getByText("주제 1개, 전체")).toContainText("20:00");

  await page.getByRole("button", { name: "1번 주제 삭제" }).click();
  await expect(page.getByText("아직 등록한 주제가 없습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "회의 시작" })).toBeDisabled();
});

test("진행 중인 회의는 새로고침해도 이어서 보인다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await page.getByRole("button", { name: "회의 시작" }).click();
  await page.getByLabel("이 주제의 결론").fill("작성 중인 결론");

  await page.reload();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "배포 일정 확정"
  );
  await expect(page.getByLabel("이 주제의 결론")).toHaveValue("작성 중인 결론");
});

test("일시정지하면 주제와 회의 전체의 시간이 모두 멈춘다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await page.getByRole("button", { name: "회의 시작" }).click();

  await page.getByRole("button", { name: "일시정지" }).click();
  await expect(page.getByText("일시정지 중")).toBeVisible();

  const stopped = await page.getByLabel("남은 시간").textContent();
  const stoppedTotal = await page.getByText("회의 전체").textContent();
  await page.waitForTimeout(2000);

  await expect(page.getByLabel("남은 시간")).toHaveText(stopped ?? "");
  await expect(page.getByText("회의 전체")).toHaveText(stoppedTotal ?? "");

  // 다시 시작하면 멈춘 지점부터 이어진다.
  await page.getByRole("button", { name: "다시 시작" }).click();
  await expect(page.getByText("일시정지 중")).toBeHidden();
  await expect(page.getByLabel("남은 시간")).not.toHaveText(stopped ?? "");
});

test("회의를 시작하기 전에 주제 순서를 바꾼다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await addAgendaItem(page, "채용 진행 상황", "15");
  await addAgendaItem(page, "지난 스프린트 회고", "5");

  await expect(page.getByLabel("1번 주제 제목")).toHaveValue("배포 일정 확정");
  await expect(page.getByRole("button", { name: "1번 주제 위로" })).toBeDisabled();

  await page.getByRole("button", { name: "3번 주제 위로" }).click();
  await expect(page.getByLabel("2번 주제 제목")).toHaveValue(
    "지난 스프린트 회고"
  );
  await expect(page.getByLabel("3번 주제 제목")).toHaveValue("채용 진행 상황");

  await page.getByRole("button", { name: "1번 주제 아래로" }).click();
  await expect(page.getByLabel("1번 주제 제목")).toHaveValue(
    "지난 스프린트 회고"
  );

  // 바뀐 순서대로 회의가 진행된다.
  await page.getByRole("button", { name: "회의 시작" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "지난 스프린트 회고"
  );
});

test("다음 주제로 갔다가 이전 주제로 돌아와 결론을 이어서 고친다", async ({
  page,
}) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await addAgendaItem(page, "채용 진행 상황", "15");
  await page.getByRole("button", { name: "회의 시작" }).click();

  await expect(page.getByRole("button", { name: "이전 주제" })).toBeDisabled();
  await page.getByLabel("이 주제의 결론").fill("화요일 배포로 확정");

  await page.getByRole("button", { name: "다음 주제" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "채용 진행 상황"
  );

  await page.getByRole("button", { name: "이전 주제" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "배포 일정 확정"
  );
  await expect(page.getByLabel("이 주제의 결론")).toHaveValue(
    "화요일 배포로 확정"
  );

  await page
    .getByLabel("이 주제의 결론")
    .fill("화요일 배포로 확정. 롤백 담당은 지수.");
  await page.getByRole("button", { name: "다음 주제" }).click();
  await page.getByRole("button", { name: "회의 마치기" }).click();

  await expect(
    page.getByText("화요일 배포로 확정. 롤백 담당은 지수.")
  ).toBeVisible();
});

test("회의 중에는 지금 시각이 함께 보인다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "배포 일정 확정", "10");
  await page.getByRole("button", { name: "회의 시작" }).click();

  await expect(page.getByText(/^지금 \d{2}:\d{2}$/)).toBeVisible();
});

test("주제를 등록하면 공개 웹에서 찾은 자료가 주제에 붙는다", async ({
  page,
}) => {
  await stubReferences(page, "스크럼 (소프트웨어 개발)");
  await page.goto("/");
  await addAgendaItem(page, "스크럼 회고", "10");

  const references = page.getByLabel("1번 주제 배경 자료");
  await expect(
    references.getByRole("link", { name: /스크럼 \(소프트웨어 개발\)/ })
  ).toBeVisible();
  await expect(
    references.getByText("스크럼 (소프트웨어 개발) 요약")
  ).toBeVisible();

  // 회의 중에도 그 주제의 자료를 함께 본다.
  await page.getByRole("button", { name: "회의 시작" }).click();
  const running = page.getByLabel("이 주제의 배경 자료");
  await expect(
    running.getByRole("link", { name: /스크럼 \(소프트웨어 개발\)/ })
  ).toBeVisible();
});

test("찾은 자료가 없으면 없다고 알리고 다시 찾을 수 있다", async ({ page }) => {
  await page.goto("/");
  await addAgendaItem(page, "사내 전용 용어", "10");

  await expect(
    page.getByText("위키백과에 이 주제로 된 문서가 없습니다.")
  ).toBeVisible();

  await stubReferences(page, "소프트웨어 배포");
  await page.getByRole("button", { name: "다시 찾기" }).click();

  await expect(
    page.getByRole("link", { name: /소프트웨어 배포/ })
  ).toBeVisible();
});
