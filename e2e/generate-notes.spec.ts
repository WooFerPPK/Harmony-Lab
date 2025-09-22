import { expect, test } from "@playwright/test";

test.describe("Harmony Lab note generation", () => {
  test("generates notes and respects lock toggle", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Generate" }).click();

    const generatedLead = page.locator(".generated__text").first();
    await expect(generatedLead).not.toHaveText("");

    const leadTextarea = page.getByLabel("Lead (8ths)");
    await leadTextarea.fill("C4 --- C4 ---");
    await expect(page.getByLabel("Lock my notes")).not.toBeChecked();

    await page.getByRole("button", { name: "Generate" }).click();
    await expect(leadTextarea).not.toHaveValue("C4 --- C4 ---");

    await page.getByLabel("Lock my notes").check();
    await leadTextarea.fill("C4 --- C4 ---");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(leadTextarea).toHaveValue("C4 --- C4 ---");
    const afterGenerate = await generatedLead.textContent();
    expect(afterGenerate?.trim().length ?? 0).toBeGreaterThan(0);
    expect(afterGenerate).not.toBe("C4 --- C4 ---");
  });
});
