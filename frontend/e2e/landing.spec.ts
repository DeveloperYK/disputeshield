import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section with key messaging", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Fight the right");
    await expect(page.locator("h1")).toContainText("Win them.");
  });

  test("displays stats section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Industry avg win rate").first()).toBeVisible();
    await expect(page.getByText("Per analysis")).toBeVisible();
    await expect(page.getByText("Revenue share")).toBeVisible();
  });

  test("shows dispute simulation", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText("Every dispute gets a verdict")
    ).toBeVisible();
    await expect(page.getByText("$487.00")).toBeVisible();
    await expect(page.getByText("$1,249.00")).toBeVisible();
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Win Probability" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Response Writer" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Evidence Compiler" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Performance Analytics" })
    ).toBeVisible();
  });

  test("has interactive savings calculator", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText("Calculate what you'll save")
    ).toBeVisible();
    await expect(page.getByText("They charge")).toBeVisible();
    await expect(page.getByText("We charge")).toBeVisible();
    await expect(page.getByText("You save")).toBeVisible();
  });

  test("shows pricing tiers", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Starter" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Growth" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Agency" })
    ).toBeVisible();
    await expect(page.getByText("Most popular")).toBeVisible();
  });

  test("nav has login and register links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", {
        name: "Start free trial",
      })
    ).toBeVisible();
  });
});
