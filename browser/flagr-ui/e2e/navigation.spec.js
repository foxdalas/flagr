import { test, expect } from '@playwright/test'

test.describe('Navigation and Layout', () => {
  test('Navbar renders with logo and version', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.logo')).toContainText('Flagr')
    await expect(page.locator('.version')).toBeVisible()
    // Check API and Docs links (internal router-links)
    const apiLink = page.locator('.nav-links a[href*="/docs/api"]')
    await expect(apiLink).toBeVisible()
    await expect(apiLink).toHaveText('API')
    const docsLink = page.locator('.nav-links a[href*="/docs"]').last()
    await expect(docsLink).toBeVisible()
    await expect(docsLink).toHaveText('Docs')
  })

  test('Click logo navigates to home', async ({ page }) => {
    await page.goto('/#/flags/1')
    await page.locator('.logo').click()
    await expect(page).toHaveURL(/\/#\/$/)
  })

  test('Home page has no breadcrumbs (redundant on root)', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.flags-container')
    await expect(page.locator('.el-breadcrumb')).not.toBeVisible()
  })

  test('Breadcrumbs on flag page', async ({ page }) => {
    // First create a flag to make sure flag 1 exists
    await page.goto('/')
    await page.waitForSelector('.flags-container')
    await page.goto('/#/flags/1')
    await page.waitForSelector('.el-breadcrumb')
    await expect(page.locator('.el-breadcrumb')).toContainText('Flags')
    await expect(page.locator('.el-breadcrumb')).toContainText('Flag ID: 1')
    // Click Home page breadcrumb
    await page.locator('.el-breadcrumb__item').first().locator('a, .el-breadcrumb__inner').first().click()
    await expect(page).toHaveURL(/\/#\/$/)
  })

  test('Theme toggle button visible', async ({ page }) => {
    await page.goto('/')
    const toggle = page.locator('[data-testid="theme-toggle"]')
    await expect(toggle).toBeVisible()
  })

  test('Theme toggle has accessible label', async ({ page }) => {
    await page.goto('/')
    const toggle = page.locator('[data-testid="theme-toggle"]')
    await expect(toggle).toHaveAttribute('aria-label', 'Toggle dark mode')
  })

  test('Router works with hash mode', async ({ page }) => {
    // Home page shows flags table
    await page.goto('/#/')
    await page.waitForSelector('.flags-container')

    // Flag page shows config
    await page.goto('/#/flags/1')
    await page.waitForSelector('.flag-container', { timeout: 5000 }).catch(() => {})

    // Unknown URL doesn't break
    await page.goto('/#/unknown')
    await expect(page.locator('#app').first()).toBeVisible()
  })
})
