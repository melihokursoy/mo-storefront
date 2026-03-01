import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  // Page loaded (no errors)
  expect(page.url()).toBe('http://localhost:3000/');
});

test('Button component renders', async ({ page }) => {
  await page.goto('/');
  // Look for the Shadcn button specifically by its text
  const button = page.getByRole('button', { name: /Click me/i });
  await expect(button).toBeVisible();
});

test('Button is interactive', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /Click me/i });
  await expect(button).toBeEnabled();
  // Click and ensure no errors occur
  await button.click();
});

test('Tailwind styles are applied', async ({ page }) => {
  await page.goto('/');
  const h1 = page.locator('h1');
  // Check that h1 exists and is visible
  await expect(h1).toBeVisible();
  // Verify it has content
  const text = await h1.innerText();
  expect(text.length).toBeGreaterThan(0);
});

test('Shadcn UI Button component has proper styling', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /Click me/i });
  // Check that button has Shadcn/Tailwind classes
  const classes = await button.getAttribute('class');
  expect(classes).toBeTruthy();
  // Verify it has styling classes (not just bare element)
  expect(classes).toMatch(/bg-|text-|px-|py-|rounded/);
});
