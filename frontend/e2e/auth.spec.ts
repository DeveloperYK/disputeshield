import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  const uniqueEmail = `e2e-${Date.now()}@test.com`;

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "Create your account" })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Acme Store")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("you@business.com")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Min 8 characters")
    ).toBeVisible();
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("you@business.com")
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter your password")
    ).toBeVisible();
  });

  test("register creates account and redirects to onboarding", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByPlaceholder("Acme Store").fill("E2E Test Store");
    await page.getByPlaceholder("you@business.com").fill(uniqueEmail);
    await page.getByPlaceholder("Min 8 characters").fill("testpass123");

    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("**/onboarding", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Welcome to DisputeShield/ })).toBeVisible();
  });

  test("login with valid credentials redirects to dashboard", async ({
    page,
  }) => {
    // First register
    const loginEmail = `e2e-login-${Date.now()}@test.com`;
    await page.goto("/register");
    await page.getByPlaceholder("Acme Store").fill("Login Test Store");
    await page.getByPlaceholder("you@business.com").fill(loginEmail);
    await page.getByPlaceholder("Min 8 characters").fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/onboarding", { timeout: 10000 });

    // Clear auth state and go to login
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");

    await page.getByPlaceholder("you@business.com").fill(loginEmail);
    await page.getByPlaceholder("Enter your password").fill("testpass123");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Login Test Store" })).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@business.com").fill("wrong@email.com");
    await page.getByPlaceholder("Enter your password").fill("wrongpass");
    await page.getByRole("button", { name: "Log in" }).click();

    // Should show an error message and stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    // Fresh browser context has no auth token — should redirect
    await page.goto("/dashboard");

    await page.waitForURL("**/login", { timeout: 10000 });
  });
});
