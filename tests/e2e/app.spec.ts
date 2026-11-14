import { expect, test } from "@playwright/test";

test("visitor can search and open a sample job detail", async ({ page }) => {
  await page.goto("/bumn/");
  await page.getByRole("button", { name: "Cari Kerja" }).click();
  await page.getByPlaceholder("Posisi, perusahaan, lokasi...").fill("IT Specialist");
  await expect(page.getByRole("heading", { name: "IT Specialist" })).toBeVisible();
  await page.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByRole("heading", { name: "IT Specialist" })).toBeVisible();
  await expect(page.locator(".detail-hero .source-note")).toBeVisible();
});

test("layout adapts between mobile and desktop widths", async ({ page }) => {
  const app = page.locator(".app-container");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bumn/");
  const mobileBox = await app.boundingBox();
  expect(mobileBox?.width).toBe(390);

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopBox = await app.boundingBox();
  expect(desktopBox?.width).toBeGreaterThan(500);
});
