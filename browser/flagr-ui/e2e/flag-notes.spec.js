import { test, expect } from '@playwright/test'
const { createFlag } = require('./helpers')

let flagId

test.describe('Flag Notes', () => {
  test.beforeAll(async () => {
    const flag = await createFlag('notes-test-' + Date.now())
    flagId = flag.id
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(`/#/flags/${flagId}`)
    await page.waitForSelector('.flag-container', { timeout: 10000 })
  })

  test('Edit/view button toggles mode', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /edit|view/ }).first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await expect(toggleBtn).toContainText('view')
    await toggleBtn.click()
    await expect(toggleBtn).toContainText('edit')
  })

  test('Empty state shows when no notes and editor closed', async ({ page }) => {
    const empty = page.locator('.markdown-editor__empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('No notes yet')
  })

  test('Markdown editor textarea appears in edit mode', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await expect(textarea).toBeVisible()
  })

  test('Markdown preview renders', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('**bold text**')
    await page.waitForTimeout(300)
    const preview = page.locator('.markdown-body')
    await expect(preview).toBeVisible()
  })

  test('XSS filtering', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('<script>alert(1)</script>')
    await page.waitForTimeout(300)
    const scriptTag = page.locator('.markdown-body script')
    expect(await scriptTag.count()).toBe(0)
  })

  test('Save notes via Save Flag', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    const noteText = 'Test note ' + Date.now()
    await textarea.fill(noteText)
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: 'Save Flag' }).first().click()
    await expect(page.locator('.el-message')).toContainText('Flag updated')
    await page.reload()
    await page.waitForSelector('.flag-container')
    await page.waitForTimeout(500)
    const preview = page.locator('.markdown-body')
    await expect(preview).toBeVisible({ timeout: 5000 })
    await expect(preview).toContainText(noteText)
  })

  // ─── New tests ──────────────────────────────────────────

  test('Toolbar visible when editor open', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const toolbar = page.locator('.md-toolbar')
    await expect(toolbar).toBeVisible()
  })

  test('Bold button wraps selected text with **', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('hello world')
    // Select "world" (chars 6-11)
    await textarea.evaluate((el) => {
      el.setSelectionRange(6, 11)
    })
    const boldBtn = page.locator('.md-toolbar-btn').filter({ hasText: 'B' }).first()
    await boldBtn.click()
    const value = await textarea.inputValue()
    expect(value).toContain('**world**')
  })

  test('Bold button inserts **text** placeholder when no selection', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('')
    const boldBtn = page.locator('.md-toolbar-btn').filter({ hasText: 'B' }).first()
    await boldBtn.click()
    const value = await textarea.inputValue()
    expect(value).toContain('**text**')
  })

  test('Ctrl+B applies bold formatting', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('hello')
    await textarea.evaluate((el) => {
      el.setSelectionRange(0, 5)
    })
    await textarea.press('Control+b')
    const value = await textarea.inputValue()
    expect(value).toContain('**hello**')
  })

  test('Ctrl+I applies italic formatting', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('hello')
    await textarea.evaluate((el) => {
      el.setSelectionRange(0, 5)
    })
    await textarea.press('Control+i')
    const value = await textarea.inputValue()
    expect(value).toContain('*hello*')
  })

  test('Ctrl+K inserts link template', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('click here')
    await textarea.evaluate((el) => {
      el.setSelectionRange(6, 10)
    })
    await textarea.press('Control+k')
    const value = await textarea.inputValue()
    expect(value).toContain('[here](url)')
  })

  test('KaTeX renders math in preview', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    await textarea.fill('$E=mc^2$')
    await page.waitForTimeout(500)
    const katex = page.locator('.markdown-body .katex')
    await expect(katex).toBeVisible({ timeout: 5000 })
  })

  test('Save without blur preserves data', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: 'edit' }).first()
    await toggleBtn.click()
    await page.waitForTimeout(300)
    const textarea = page.locator('.markdown-editor textarea')
    const noteText = 'no-blur-save-' + Date.now()
    // Type directly without blur
    await textarea.fill(noteText)
    // Immediately click Save Flag without clicking elsewhere
    await page.locator('button').filter({ hasText: 'Save Flag' }).first().click()
    await expect(page.locator('.el-message')).toContainText('Flag updated')
    await page.reload()
    await page.waitForSelector('.flag-container')
    await page.waitForTimeout(500)
    const preview = page.locator('.markdown-body')
    await expect(preview).toBeVisible({ timeout: 5000 })
    await expect(preview).toContainText(noteText)
  })
})
