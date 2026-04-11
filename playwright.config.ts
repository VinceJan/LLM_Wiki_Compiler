import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 30000,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // API 集成测试
    {
      name: 'api',
      testMatch: /.*test_api\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:8000',
      },
    },
    // 前端 UI 渲染测试
    {
      name: 'ui',
      testMatch: /.*test_ui_render\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:3000',
        browserName: 'chromium',
      },
    },
    // 截图测试
    {
      name: 'screenshots',
      testMatch: /.*screenshots\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:3000',
        browserName: 'chromium',
      },
    },
  ],
});
