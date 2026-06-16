import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

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

test("built game supports buttons, keyboard, and restart", async ({ page }) => {
  const distDir = path.join(getRepoRoot(), "dist");
  const server = await startDistServer(distDir);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(server.url);

    await expect(page.getByRole("heading", { name: "Science Career Survival" })).toBeVisible();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".choice-button")).toHaveCount(2);
    await expect(page.locator(".stat__meter")).toHaveCount(4);
    await expect(page.locator(".stat__segment")).toHaveCount(40);
    await expect(page.getByText(/Step [0-9]+ of 10/).first()).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Last choice had a small effect.")).toBeVisible();

    await page.locator(".choice-button").first().click();
    await expect(page.getByText("Your choices are sorting the career route.")).toBeVisible();

    for (let turn = 0; turn < 8; turn += 1) {
      const restartButton = page.getByRole("button", { name: "Restart run" });
      if ((await restartButton.count()) > 0) {
        await restartButton.click();
        await expect(page.getByText("Your choices are sorting the career route.")).toBeVisible();
        return;
      }
      await page.locator(".choice-button").last().click();
    }

    await expect(page.getByRole("button", { name: "Restart run" })).toBeVisible();
  } finally {
    await server.close();
  }
});

test("desktop card click does not choose, but a drag does", async ({ page }) => {
  const distDir = path.join(getRepoRoot(), "dist");
  const server = await startDistServer(distDir);
  try {
    await page.setViewportSize({ width: 1100, height: 760 });
    await page.goto(server.url);

    const card = page.locator(".card--draggable");
    await expect(card).toBeVisible();
    await expect(page.getByText("Each choice reveals only effect size.")).toBeVisible();

    const cardBox = await card.boundingBox();
    if (cardBox === null) {
      throw new Error("Expected card bounding box before desktop drag.");
    }
    const centerX = cardBox.x + cardBox.width / 2;
    const centerY = cardBox.y + cardBox.height / 2;

    // A plain click on the card with no travel must not commit a choice.
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.getByText("Each choice reveals only effect size.")).toBeVisible();

    // A horizontal drag well past the commit threshold commits a choice.
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + cardBox.width * 0.55, centerY, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByText(/Last choice had a .+ effect\./)).toBeVisible();
  } finally {
    await server.close();
  }
});
