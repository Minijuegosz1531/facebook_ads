import { type Page, expect } from "@playwright/test";

// Reusable helper: drive the new-campaign wizard up to (but not including) publish.
export async function fillCampaignForm(
  page: Page,
  opts: { clientLabel?: string; name?: string; description?: string } = {},
) {
  const {
    clientLabel = "Cafetería Andina",
    name = "Campaña Café Premium",
    description = "Promocionar café de especialidad colombiano premium tostado artesanal",
  } = opts;

  await page.goto("/campaigns/new");

  await page.getByTestId("client-select").selectOption({ label: clientLabel });
  await page.getByTestId("field-name").fill(name);
  await page.getByTestId("field-description").fill(description);
  await page.getByTestId("submit-campaign-form").click();

  // Wait for the AI results (mock returns ready quickly).
  await expect(page.getByTestId("inspiration-results")).toBeVisible();
}
