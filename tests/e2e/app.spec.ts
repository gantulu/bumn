import { expect, test } from "@playwright/test";

test("visitor can search and open a sample job detail", async ({ page }) => {
  await page.goto("/bumn/");
  await page.getByRole("button", { name: "Cari Kerja" }).click();
  await page.getByPlaceholder("Posisi, perusahaan, lokasi...").fill("IT Specialist");
  await expect(page.getByRole("heading", { name: "IT Specialist" })).toBeVisible();
  await page.getByRole("button", { name: "Detail" }).click();
  await expect(page.getByRole("heading", { name: "IT Specialist" })).toBeVisible();
  await expect(page.getByText(/data contoh untuk demonstrasi aplikasi/i)).toBeVisible();
});
