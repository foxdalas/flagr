import { test, expect } from '@playwright/test'
const { API, createFlag, createVariant, createSegment } = require('./helpers')

// Guards the segment "error protection" surfaces: per-segment warning banners
// for silent misconfigurations (0% rollout, no distribution) and the flag-level
// roll-up summary at the top of Config.
test.describe('Segment configuration warnings', () => {
  let brokenFlagId, healthyFlagId

  test.beforeAll(async () => {
    // Broken: a segment with 0% rollout and no distribution -> both warnings.
    const broken = await createFlag('warn-broken-' + Date.now())
    brokenFlagId = broken.id
    await createSegment(brokenFlagId, 'broken-seg', 0)

    // Healthy: 100% rollout + a distribution -> no warnings.
    const healthy = await createFlag('warn-healthy-' + Date.now())
    healthyFlagId = healthy.id
    const variant = await createVariant(healthyFlagId, 'on')
    const seg = await createSegment(healthyFlagId, 'healthy-seg', 100)
    await fetch(`${API}/flags/${healthyFlagId}/segments/${seg.id}/distributions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributions: [{ variantID: variant.id, variantKey: 'on', percent: 100 }] }),
    })
  })

  test('Broken segment shows rollout + distribution warnings', async ({ page }) => {
    await page.goto(`/#/flags/${brokenFlagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    const warnings = page.locator('.segments-container-inner .segment-warnings li')
    await expect(warnings).toHaveCount(2)
    const banner = page.locator('.segments-container-inner .segment-warnings')
    await expect(banner).toContainText('Rollout is 0%')
    await expect(banner).toContainText('No distribution')
  })

  test('Flag-level summary rolls up segment warnings at the top', async ({ page }) => {
    await page.goto(`/#/flags/${brokenFlagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    const summary = page.locator('.flag-warnings-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('segment configuration warning')
    await expect(summary.locator('.flag-warnings-summary__link')).toHaveCount(2)
  })

  test('Summary link scrolls down to the segment', async ({ page }) => {
    await page.goto(`/#/flags/${brokenFlagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    const before = await page.evaluate(() => window.scrollY)
    await page.locator('.flag-warnings-summary__link').first().click()
    await page.waitForTimeout(700)
    const after = await page.evaluate(() => window.scrollY)
    expect(after).toBeGreaterThan(before)
  })

  test('Healthy segment shows no warnings', async ({ page }) => {
    await page.goto(`/#/flags/${healthyFlagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
    await page.waitForTimeout(500)
    await expect(page.locator('.segment-warnings')).toHaveCount(0)
    await expect(page.locator('.flag-warnings-summary')).toHaveCount(0)
  })
})
