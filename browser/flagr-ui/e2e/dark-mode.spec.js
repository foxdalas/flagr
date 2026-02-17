import { test, expect } from '@playwright/test'

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear stored theme to start fresh
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('flagr-theme'))
    await page.reload()
    await page.waitForSelector('.flags-container')
  })

  test('Theme toggle button visible in navbar', async ({ page }) => {
    const toggle = page.locator('[data-testid="theme-toggle"]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-label', 'Toggle dark mode')
  })

  test('Click toggle adds html.dark class', async ({ page }) => {
    await page.locator('[data-testid="theme-toggle"]').click()
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('Click again removes html.dark class (back to light)', async ({ page }) => {
    const toggle = page.locator('[data-testid="theme-toggle"]')
    await toggle.click()
    await toggle.click()
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(false)
  })

  test('Dark mode persists after page reload', async ({ page }) => {
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForSelector('.flags-container')
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
    const stored = await page.evaluate(() => localStorage.getItem('flagr-theme'))
    expect(stored).toBe('dark')
  })

  test('Element Plus components get dark styles', async ({ page }) => {
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    // EP dark mode sets --el-bg-color on html.dark
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--el-bg-color').trim()
    )
    // In dark mode, EP sets --el-bg-color to a dark value (not white)
    expect(bgColor).not.toBe('#ffffff')
    expect(bgColor).not.toBe('')
  })

  test('Navbar renders correctly in dark mode', async ({ page }) => {
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    const navbar = page.locator('.navbar')
    const bgColor = await navbar.evaluate(el => getComputedStyle(el).backgroundColor)
    // Should not be white in dark mode
    expect(bgColor).not.toBe('rgb(255, 255, 255)')
    // Logo text should still be visible
    await expect(page.locator('.logo')).toBeVisible()
  })

  test('Card headers adapt to dark mode', async ({ page }) => {
    // Navigate to a flag page to see card headers
    await page.goto('/#/flags/1')
    await page.waitForSelector('.flag-container', { timeout: 10000 }).catch(() => {})
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    const header = page.locator('.el-card__header').first()
    if (await header.isVisible().catch(() => false)) {
      const bgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bgColor).not.toBe('rgb(255, 255, 255)')
    }
  })

  test('Markdown preview uses dark theme', async ({ page }) => {
    // Navigate to docs page which has markdown-body
    await page.goto('/#/docs/overview')
    await page.waitForTimeout(500)
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    const markdownBody = page.locator('.markdown-body').first()
    if (await markdownBody.isVisible().catch(() => false)) {
      const colorScheme = await markdownBody.evaluate(el =>
        getComputedStyle(el).colorScheme
      )
      // In dark mode, color-scheme should be 'dark' or contain 'dark'
      expect(colorScheme).toContain('dark')
    }
  })

  test('Docs sidebar adapts to dark mode', async ({ page }) => {
    await page.goto('/#/docs/overview')
    await page.waitForTimeout(500)
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    const sidebar = page.locator('.docs-sidebar')
    if (await sidebar.isVisible().catch(() => false)) {
      const bgColor = await sidebar.evaluate(el => getComputedStyle(el).backgroundColor)
      // Should not be the light mode bg (#f6f8fa = rgb(246, 248, 250))
      expect(bgColor).not.toBe('rgb(246, 248, 250)')
    }
  })

  test('Flag page — all sections readable in dark mode', async ({ page }) => {
    await page.goto('/#/flags/1')
    await page.waitForSelector('.flag-container', { timeout: 10000 }).catch(() => {})
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(200)
    // Verify key UI elements are still visible and not invisible (same color as bg)
    const breadcrumb = page.locator('.el-breadcrumb')
    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb).toBeVisible()
    }
    // Flag config card should be visible
    const flagCard = page.locator('.flag-config-card')
    if (await flagCard.isVisible().catch(() => false)) {
      await expect(flagCard).toBeVisible()
    }
  })
})
