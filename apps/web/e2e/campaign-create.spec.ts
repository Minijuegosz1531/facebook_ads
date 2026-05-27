import { test, expect } from "@playwright/test";
import { fillCampaignForm } from "./fixtures/campaign";

test.describe("New campaign wizard", () => {
  test("creates a paused campaign from selected image + copy", async ({ page }) => {
    await test.step("fill form and trigger inspiration", async () => {
      await fillCampaignForm(page);
    });

    await test.step("AI produced 5 images and 10 copies", async () => {
      await expect(page.getByTestId("image-grid").locator("button")).toHaveCount(5);
      await expect(page.getByTestId("copy-list").locator("button")).toHaveCount(10);
    });

    await test.step("publish is blocked until a selection is made", async () => {
      await expect(page.getByTestId("publish-campaign")).toBeDisabled();
    });

    await test.step("select an image and a copy, then preview appears", async () => {
      await page.getByTestId("image-option-0").click();
      await page.getByTestId("copy-option-2").click();
      await expect(page.getByTestId("ad-preview")).toBeVisible();
      await expect(page.getByTestId("publish-campaign")).toBeEnabled();
    });

    await test.step("publish navigates to the campaign detail in PAUSED state", async () => {
      await page.getByTestId("publish-campaign").click();
      await expect(page).toHaveURL(/\/campaigns\/camp_/);
      await expect(page.getByTestId("campaign-name")).toHaveText("Campaña Café Premium");
      await expect(page.getByTestId("status-badge").first()).toHaveText("PAUSED");
    });
  });

  test("can activate a campaign from its detail page", async ({ page }) => {
    await fillCampaignForm(page, { name: "Campaña Activable" });
    await page.getByTestId("image-option-1").click();
    await page.getByTestId("copy-option-0").click();
    await page.getByTestId("publish-campaign").click();

    await expect(page.getByTestId("campaign-name")).toHaveText("Campaña Activable");
    await page.getByTestId("toggle-status").click();
    await expect(page.getByTestId("status-badge").first()).toHaveText("ACTIVE");
  });
});
