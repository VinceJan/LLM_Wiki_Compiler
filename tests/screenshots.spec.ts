import { test, expect } from '@playwright/test';

test.describe('截图 - 黑客松展示', () => {
  test('截图1: 主页面完整视图', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 等待 React 渲染完成
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    await page.screenshot({
      path: 'E:/tmp/运行截图/01-主页面.png',
      fullPage: true
    });
    console.log('✅ 截图1: 主页面完成');
  });

  test('截图2: 1920x1080 桌面端视图', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    await page.screenshot({
      path: 'E:/tmp/运行截图/02-桌面端视图.png',
      fullPage: false
    });
    console.log('✅ 截图2: 桌面端视图完成');
  });

  test('截图3: 左侧输入区特写', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    // 截图左侧输入区
    const inputArea = page.locator('aside').first();
    await inputArea.screenshot({
      path: 'E:/tmp/运行截图/03-左侧输入区.png'
    });
    console.log('✅ 截图3: 左侧输入区完成');
  });

  test('截图4: 知识图谱区域（暂无数据状态）', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    // 截图右侧知识图谱区
    const graphArea = page.locator('aside').last();
    await graphArea.screenshot({
      path: 'E:/tmp/运行截图/04-知识图谱区域.png'
    });
    console.log('✅ 截图4: 知识图谱区域完成');
  });

  test('截图5: 底部 Query Lint 面板', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    // 点击 Lint 按钮切换到 Lint 模式
    await page.getByRole('button', { name: /🔍\s*Lint/ }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'E:/tmp/运行截图/05-Lint模式.png',
      fullPage: false
    });
    console.log('✅ 截图5: Lint 模式完成');
  });

  test('截图6: 设置面板', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('LLM Wiki Compiler')).toBeVisible();

    // 点击设置按钮
    await page.locator('button[title="设置"]').first().click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'E:/tmp/运行截图/06-设置面板.png',
      fullPage: false
    });
    console.log('✅ 截图6: 设置面板完成');
  });
});
