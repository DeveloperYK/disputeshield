import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Register a fresh user for each test
    const email = `e2e-dash-${Date.now()}@test.com`;
    await page.goto("/register");
    await page.getByPlaceholder("Acme Store").fill("Dashboard Test");
    await page.getByPlaceholder("you@business.com").fill(email);
    await page.getByPlaceholder("Min 8 characters").fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/onboarding", { timeout: 10000 });
    // Skip onboarding to get to dashboard
    await page.getByText("Skip setup").click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("shows empty state with Stripe connect prompt", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Connect your Stripe account" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Connect Stripe" })
    ).toBeVisible();
  });

  test("nav rail has all navigation items", async ({ page }) => {
    // Nav rail uses icon-only links
    const nav = page.locator("nav");
    await expect(nav.locator('a[href="/dashboard"]').first()).toBeVisible();
    await expect(nav.locator('a[href="/analytics"]')).toBeVisible();
    await expect(nav.locator('a[href="/settings"]')).toBeVisible();
  });

  test("can navigate to analytics page", async ({ page }) => {
    await page.locator('nav a[href="/analytics"]').click();
    await page.waitForURL("**/analytics", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Analytics" })
    ).toBeVisible();
    await expect(page.getByText("Total disputes")).toBeVisible();
  });

  test("can navigate to settings page", async ({ page }) => {
    await page.locator('nav a[href="/settings"]').click();
    await page.waitForURL("**/settings", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
    await expect(page.getByText("Stripe Connection")).toBeVisible();
    await expect(page.getByText("Subscription")).toBeVisible();
  });

  test("settings shows account info", async ({ page }) => {
    await page.locator('nav a[href="/settings"]').click();
    await page.waitForURL("**/settings", { timeout: 10000 });

    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(page.getByText("Connect Stripe")).toBeVisible();
  });
});
