import { expect, test } from '@playwright/test';

test.describe('TextEdit Lexical editor', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'has_visited',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    await page.goto('/?w=textedit:README', { waitUntil: 'networkidle' });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByRole('textbox', { name: 'README' })).toBeVisible({ timeout: 30000 });
  });

  test('types at a middle caret without resetting to the start', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'README' });
    await editor.click();
    await page.keyboard.press('Meta+ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('XYZ');

    const text = await editor.innerText();
    expect(text.includes('XYZ')).toBe(true);
    expect(text.startsWith('XYZ')).toBe(false);
  });

  test('opens the font-size control and applies it to selected text only', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'README' });
    const fontSize = page.getByLabel('Font size');
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('SizeProbe ');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await fontSize.click();
    await expect(fontSize).toBeFocused();
    await fontSize.selectOption('24');

    const sized = editor.locator('span[style*="font-size: 24px"]');
    await expect(sized.first()).toBeVisible();
    await expect(editor).not.toHaveCSS('font-size', '24px');
  });

  test('aligns the current paragraph without rewriting the whole document root', async ({
    page,
  }) => {
    const editor = page.getByRole('textbox', { name: 'README' });
    await editor.click();
    await page.getByRole('button', { name: 'Align center' }).click();

    await expect(editor.locator('p[style*="text-align: center"]').first()).toBeVisible();
    await expect(editor).not.toHaveCSS('text-align', 'center');
  });

  test('discards edits after close and reopen', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'README' });
    await editor.click();
    await page.keyboard.type('TRANSIENT_MARKER');
    await expect(editor).toContainText('TRANSIENT_MARKER');

    await page.getByRole('button', { name: 'Close' }).click();
    await page.goto('/?w=textedit:README');
    await expect(page.getByRole('textbox', { name: 'README' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('textbox', { name: 'README' })).not.toContainText(
      'TRANSIENT_MARKER'
    );
  });

  test('preserves edits across minimize and dock restore', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'README' });
    await editor.click();
    await page.keyboard.type('MINIMIZE_MARKER');
    await expect(editor).toContainText('MINIMIZE_MARKER');

    await page.getByRole('button', { name: 'Minimize' }).click();
    await page.getByRole('button', { name: 'TextEdit' }).click();

    await expect(page.getByRole('textbox', { name: 'README' })).toContainText('MINIMIZE_MARKER');
  });

  test('dock TextEdit opens an untitled window when none are open', async ({ page }) => {
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'TextEdit' }).click();

    await expect(page.getByRole('textbox', { name: 'Untitled' })).toBeVisible();
  });
});
