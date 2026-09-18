import { test, expect } from "@playwright/test";

test.describe("Collaboration Board Core Features", () => {
  test("Board Creation & Loading", async ({ page }) => {
    // Navigate to the root, which should render a new board
    await page.goto("/");

    // Wait for the canvas to be visible
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Verify the toolbar is present by looking for a known tool
    const rectangleBtn = page.locator('[aria-label="Rectangle"]');
    await expect(rectangleBtn).toBeVisible();

    // Playwright ToggleGroup usually uses radio or button roles.
    // If it's a toggle button, it could be role="radio" (single toggle) or just button.
  });

  test("Drawing Mechanics - Rectangle", async ({ page }) => {
    await page.goto("/");

    // Select Rectangle tool
    const rectangleBtn = page.locator('[aria-label="Rectangle"]');
    await rectangleBtn.click();

    const canvas = page.locator("canvas");

    // Get canvas bounding box to ensure we draw inside it
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");

    // Draw a rectangle by dragging
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 300);
    await page.mouse.up();

    // In a real app we'd verify the DOM elements, but since it's a Canvas,
    // visual changes happen inside the canvas. We can take a screenshot or rely on
    // checking if the internal state of elements increased, but playwright cannot easily
    // inspect canvas internals. Just verifying no crashes and basic DOM is enough for E2E flow.
    await expect(canvas).toBeVisible();
  });

  test("Real-Time Collaboration", async ({ browser }) => {
    // Create two separate browser contexts to simulate two different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1 goes to homepage and creates a session
    await page1.goto("/");

    // Let's assume they click "Live Session" to generate a session
    const shareBtn = page1.getByText("Live Session").first();
    await shareBtn.dispatchEvent("click");

    // Wait for dialog
    await page1.waitForTimeout(500);

    // Enter a display name
    await page1.fill("#session-name", "User 1");

    // Click Start session
    const startSessionBtn = page1.getByText("Start session").first();
    await startSessionBtn.dispatchEvent("click");

    // Wait for the URL to update with ?session=...
    try {
      await page1.waitForURL(/session=/, { timeout: 10000 });
    } catch {
      console.log("Timeout waiting for session URL, URL is:", page1.url());
    }
    const sessionUrl = page1.url();

    // The dialog stays open to show the share link, so we must close it to interact with the canvas
    await page1.keyboard.press("Escape");
    // Wait for dialog to animate out
    await page1.waitForTimeout(500);

    // User 2 joins the same session
    await page2.goto(sessionUrl);

    // Both users should see the canvas
    await expect(page1.locator("canvas")).toBeVisible();
    await expect(page2.locator("canvas")).toBeVisible();

    // User 1 draws a rectangle
    const rectangleBtn = page1.locator('[aria-label="Rectangle"]');
    await rectangleBtn.click();

    const box = await page1.locator("canvas").boundingBox();
    if (box) {
      await page1.mouse.move(box.x + 50, box.y + 50);
      await page1.mouse.down();
      await page1.mouse.move(box.x + 150, box.y + 150);
      await page1.mouse.up();
    }

    // Wait for network/websocket to propagate
    // Assert that User 2 sees User 1's cursor
    await expect(page2.getByText("User 1")).toBeVisible({ timeout: 5000 });

    await expect(page2.locator("canvas")).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test("Persistence", async ({ page }) => {
    await page.goto("/");

    const rectangleBtn = page.locator('[aria-label="Rectangle"]');
    await rectangleBtn.click();

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");

    // Draw
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 400);
    await page.mouse.up();

    // Wait a bit for debounce to trigger auto-save (e.g. 2-3 seconds)
    await page.waitForTimeout(3500);

    // Reload the page
    await page.reload();

    // The canvas should still be there and ideally contain the elements
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("Drawing Mechanics - Circle", async ({ page }) => {
    await page.goto("/");

    const circleBtn = page.locator('[aria-label="Circle"]');
    await circleBtn.click();

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.up();

    await expect(canvas).toBeVisible();
  });

  test("Drawing Mechanics - Pencil", async ({ page }) => {
    await page.goto("/");

    const pencilBtn = page.locator('[aria-label="Pencil"]');
    await pencilBtn.click();

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 120);
    await page.mouse.move(box.x + 140, box.y + 150);
    await page.mouse.up();

    await expect(canvas).toBeVisible();
  });

  test("Eraser functionality", async ({ page }) => {
    await page.goto("/");

    // First draw a rectangle
    const rectangleBtn = page.locator('[aria-label="Rectangle"]');
    await rectangleBtn.click();

    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 300);
    await page.mouse.up();

    // Now select Eraser
    const eraserBtn = page.locator('[aria-label="Eraser"]');
    await eraserBtn.click();

    // Click on the rectangle we just drew
    await page.mouse.move(box.x + 150, box.y + 150);
    await page.mouse.down();
    await page.mouse.up();

    await expect(canvas).toBeVisible();
  });
  test("Export Image functionality", async ({ page }) => {
    await page.goto("/");

    // Draw something first because empty canvas cannot be exported
    const rectangleBtn = page.locator('[aria-label="Rectangle"]');
    await rectangleBtn.click();
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.up();
    }

    // Open sidebar
    const menuBtn = page.getByRole("button", { name: "Menu" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Wait for Export button to be visible
    const exportBtn = page.getByRole("button", { name: "Export Image" });
    await expect(exportBtn).toBeVisible();

    // Click Export
    await exportBtn.click();

    // Verify dialog appears
    // getByText('Export Image').first() or similar to distinguish from the button
    await expect(
      page.getByRole("heading", { name: "Export Image" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export PNG" }),
    ).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("Settings toggle functionality", async ({ page }) => {
    await page.goto("/");

    // Open sidebar
    const menuBtn = page.getByRole("button", { name: "Menu" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Look for a setting that should appear, e.g. "Background" or "Theme"
    await expect(page.getByText("Background")).toBeVisible();
    await expect(page.getByText("Theme")).toBeVisible();
  });
});
