import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { RUN_LENGTH, SCIENTIST_CONFIG } from "../../src/config";

type StaticAsset = {
  readonly fileName: string;
  readonly contentType: string;
};

const DIST_ASSETS: Readonly<Record<string, StaticAsset>> = {
  "/": { fileName: "index.html", contentType: "text/html; charset=utf-8" },
  "/index.html": { fileName: "index.html", contentType: "text/html; charset=utf-8" },
  "/main.js": { fileName: "main.js", contentType: "text/javascript; charset=utf-8" },
  "/style.css": { fileName: "style.css", contentType: "text/css; charset=utf-8" },
};

// Full display names derived from SCIENTIST_CONFIG in src/config.ts.
// Used to assert that NO scientist name leaks into the DOM during the run phase.
const SCIENTIST_NAMES = Object.values(SCIENTIST_CONFIG).map((c) => c.name);

function getRepoRoot(): string {
  const root = execSync("git rev-parse --show-toplevel", { encoding: "utf8" });
  return root.trim();
}

function serveDistFile(
  distDir: string,
  request: http.IncomingMessage,
  response: http.ServerResponse,
): void {
  const requestUrl = request.url ?? "/";
  const asset = DIST_ASSETS[requestUrl];
  if (asset === undefined) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const filePath = path.join(distDir, asset.fileName);
  const body = fs.readFileSync(filePath);
  response.writeHead(200, { "content-type": asset.contentType });
  response.end(body);
}

async function startDistServer(
  distDir: string,
): Promise<{ readonly url: string; close: () => Promise<void> }> {
  const server = http.createServer((request, response) => {
    serveDistFile(distDir, request, response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not determine local dist server port.");
  }

  const url = `http://127.0.0.1:${address.port}/`;
  const close = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };

  return { url, close };
}

// Assert that the current DOM text contains none of the five scientist full names.
// This is the core "blind run" invariant: no name may leak before the result screen.
async function assertNoScientistNameVisible(page: import("@playwright/test").Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  for (const scientistName of SCIENTIST_NAMES) {
    if (bodyText.includes(scientistName)) {
      throw new Error(
        `Scientist name leaked during run phase: "${scientistName}" found in DOM text.`,
      );
    }
  }
}

test("blind run loop: no name during run, reveal after final answer, restart returns to run", async ({
  page,
}) => {
  const distDir = path.join(getRepoRoot(), "dist");
  const server = await startDistServer(distDir);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url);

    // Initial game-shell should be in run phase with no scientist attributed.
    await expect(page.locator("main.game-shell")).toBeVisible();
    await expect(page.locator("main.game-shell[data-phase='run']")).toBeVisible();
    // data-scientist must NOT be present on the shell during the run phase.
    const shellDataScientist = await page.locator("main.game-shell").getAttribute("data-scientist");
    if (shellDataScientist !== null) {
      throw new Error(
        `data-scientist attribute found on game-shell during run phase: "${shellDataScientist}"`,
      );
    }

    // Meters: one per stat ID (4 total).
    await expect(page.locator(".stat__meter")).toHaveCount(4);

    // Initial eyebrow shows "Question 1 of <RUN_LENGTH>".
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);

    // Two choice buttons present.
    await expect(page.locator(".choice-button")).toHaveCount(2);

    // No scientist name in DOM at start of run.
    await assertNoScientistNameVisible(page);

    // Play through RUN_LENGTH questions, alternating keyboard and button clicks to
    // cover input parity. Even-numbered questions (0-indexed) use keyboard; odd use button.
    for (let turn = 0; turn < RUN_LENGTH; turn += 1) {
      // Verify still in run phase and no scientist name has leaked.
      await expect(page.locator("main.game-shell[data-phase='run']")).toBeVisible();
      await assertNoScientistNameVisible(page);

      // Eyebrow shows the correct question number.
      const expectedQuestion = turn + 1;
      await expect(page.locator(".eyebrow")).toContainText(
        `Question ${expectedQuestion} of ${RUN_LENGTH}`,
      );

      // Alternate between keyboard (ArrowLeft / D) and button click.
      if (turn % 2 === 0) {
        // Keyboard: ArrowLeft = choice 0.
        await page.keyboard.press("ArrowLeft");
      } else {
        // Button click: last choice-button = choice 1.
        await page.locator(".choice-button").last().click();
      }
    }

    // After the final answer the game should transition to the result phase.
    await expect(page.locator("main.game-shell[data-phase='result']")).toBeVisible({
      timeout: 5000,
    });

    // The result headline must contain "You most resemble" and one of the scientist names.
    const headlineEl = page.locator("h2.result-headline__title");
    await expect(headlineEl).toBeVisible();
    const headlineText = await headlineEl.innerText();
    if (!headlineText.includes("You most resemble")) {
      throw new Error(
        `Result headline does not contain "You most resemble". Got: "${headlineText}"`,
      );
    }
    const matchedName = SCIENTIST_NAMES.find((name) => headlineText.includes(name));
    if (matchedName === undefined) {
      throw new Error(
        `Result headline does not include any scientist name. Got: "${headlineText}"`,
      );
    }

    // Ranking list must contain exactly 5 items, with the first marked as the match.
    const rankingItems = page.locator("ol.ranking__list li.ranking__item");
    await expect(rankingItems).toHaveCount(5);
    await expect(rankingItems.first()).toHaveClass(/ranking__item--match/);

    // Every ranking item should contain a scientist name (names only, no raw distances).
    const rankingTexts = await rankingItems.allInnerTexts();
    for (const itemText of rankingTexts) {
      const hasName = SCIENTIST_NAMES.some((name) => itemText.includes(name));
      if (!hasName) {
        throw new Error(`Ranking item does not contain a scientist name. Item text: "${itemText}"`);
      }
      // Assert no purely-numeric distance is shown (no pattern like "42.3" or "123.45").
      // The design decision is names only; raw floats should not appear in ranking items.
      if (/\b\d+\.\d+\b/.test(itemText)) {
        throw new Error(
          `Ranking item appears to contain a numeric distance. Item text: "${itemText}"`,
        );
      }
    }

    // Source notes links should be present on the result screen.
    await expect(page.locator("a.source-notes__link").first()).toBeVisible();

    // Restart: clicking "Restart run" should return to the run phase at question 1.
    await page.locator("button.primary-action").click();
    await expect(page.locator("main.game-shell[data-phase='run']")).toBeVisible();
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);
    // After restart the game-shell must not carry data-scientist.
    const shellAfterRestart = await page.locator("main.game-shell").getAttribute("data-scientist");
    if (shellAfterRestart !== null) {
      throw new Error(`data-scientist attribute persisted after restart: "${shellAfterRestart}"`);
    }
  } finally {
    await server.close();
  }
});

test("keyboard and button parity: both inputs advance the eyebrow question counter", async ({
  page,
}) => {
  const distDir = path.join(getRepoRoot(), "dist");
  const server = await startDistServer(distDir);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url);

    // Start at question 1.
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);

    // A keyboard press (ArrowLeft) should advance to question 2.
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".eyebrow")).toContainText(`Question 2 of ${RUN_LENGTH}`);

    // A button click should advance to question 3.
    await page.locator(".choice-button").first().click();
    await expect(page.locator(".eyebrow")).toContainText(`Question 3 of ${RUN_LENGTH}`);

    // A D-key press should advance to question 4.
    await page.keyboard.press("d");
    await expect(page.locator(".eyebrow")).toContainText(`Question 4 of ${RUN_LENGTH}`);

    // An A-key press should advance to question 5.
    await page.keyboard.press("a");
    await expect(page.locator(".eyebrow")).toContainText(`Question 5 of ${RUN_LENGTH}`);
  } finally {
    await server.close();
  }
});

test("desktop text selection on prompt does not trigger a choice", async ({ page }) => {
  const distDir = path.join(getRepoRoot(), "dist");
  const server = await startDistServer(distDir);
  try {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto(server.url);

    // At desktop viewport, the draggable card should be visible.
    const card = page.locator(".card--draggable");
    await expect(card).toBeVisible();

    // Verify we start at question 1.
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);

    const cardBox = await card.boundingBox();
    if (cardBox === null) {
      throw new Error("Expected card bounding box before desktop selection test.");
    }
    const centerX = cardBox.x + cardBox.width / 2;
    const centerY = cardBox.y + cardBox.height / 2;

    // A plain click on the card with no travel must not commit a choice.
    // The eyebrow should still show `Question 1 of ${RUN_LENGTH}` after the click.
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);

    // A short horizontal drag within the card (not past the commit threshold) must not
    // commit a choice. The eyebrow should remain at `Question 1 of ${RUN_LENGTH}`.
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + cardBox.width * 0.1, centerY, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator(".eyebrow")).toContainText(`Question 1 of ${RUN_LENGTH}`);

    // A full horizontal drag past the commit threshold does commit a choice.
    // The eyebrow should advance to `Question 2 of ${RUN_LENGTH}`.
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + cardBox.width * 0.55, centerY, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator(".eyebrow")).toContainText(`Question 2 of ${RUN_LENGTH}`);
  } finally {
    await server.close();
  }
});
