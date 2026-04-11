import { test, expect } from "@playwright/test";

test.describe("LLM Wiki Compiler - UI Render Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("页面应该能正常加载（HTTP 200）", async ({ page }) => {
    // 验证页面响应状态为 200（通过检查页面已加载）
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("页面标题应该包含 LLM Wiki Compiler", async ({ page }) => {
    await expect(page).toHaveTitle(/LLM Wiki Compiler/);
  });

  test("Header 应该显示 LLM Wiki Compiler 标题和版本号", async ({ page }) => {
    // Header 标题
    const headerTitle = page.getByRole("heading", { name: "LLM Wiki Compiler" });
    await expect(headerTitle).toBeVisible();

    // 版本号
    await expect(page.getByText("v0.1.0")).toBeVisible();
  });

  test("左侧输入区应该存在", async ({ page }) => {
    // 查找包含 "📥 输入区" 的元素
    const inputArea = page.getByText("📥 输入区");
    await expect(inputArea).toBeVisible();

    // 左侧面板应该是一个 aside 元素
    const aside = page.locator("aside").first();
    await expect(aside).toBeVisible();
  });

  test("中间编译状态区应该存在", async ({ page }) => {
    // 查找包含 "⚙️ 编译状态" 的元素
    const compileStatus = page.getByText("⚙️ 编译状态");
    await expect(compileStatus).toBeVisible();

    // 中间面板应该是 main 元素
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("右侧知识图谱区应该存在", async ({ page }) => {
    // 查找包含 "🗺️ 知识图谱" 的元素
    const knowledgeGraph = page.getByText("🗺️ 知识图谱");
    await expect(knowledgeGraph).toBeVisible();
  });

  test("三面板布局应该同时存在", async ({ page }) => {
    // 验证三个面板区域都存在
    const asides = page.locator("aside");
    await expect(asides).toHaveCount(2); // 左侧和右侧各一个 aside

    const main = page.locator("main");
    await expect(main).toBeVisible();

    // 验证三个标题文字都存在
    await expect(page.getByText("📥 输入区")).toBeVisible();
    await expect(page.getByText("⚙️ 编译状态")).toBeVisible();
    await expect(page.getByText("🗺️ 知识图谱")).toBeVisible();
  });

  test("文件拖放区域应该存在", async ({ page }) => {
    // 拖放区域包含 "拖放文件到此处" 文字
    const dropZone = page.getByText("拖放文件到此处");
    await expect(dropZone).toBeVisible();

    // 文件类型提示（拖放区域内的文字，使用 first() 避免匹配到底部的类似文字）
    const fileTypeHint = page.locator('input[type="url"]').locator("..").locator("..").getByText("PDF, DOCX, XLSX, MD, TXT", { exact: true });
    await expect(fileTypeHint.first()).toBeVisible();
  });

  test("URL 输入框和提交按钮应该存在", async ({ page }) => {
    // URL 输入框（type="url" 的 input）
    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute("placeholder", /粘贴 URL/);

    // 提交按钮
    const submitButton = page.getByRole("button", { name: "提交" });
    await expect(submitButton).toBeVisible();
  });

  test("底部 Query/Lint 面板应该存在", async ({ page }) => {
    // 底部面板容器
    const bottomPanel = page.locator(".border-t").last();
    await expect(bottomPanel).toBeVisible();
  });

  test("底部应该有 Query 和 Lint 切换按钮", async ({ page }) => {
    // 💬 Query 按钮
    const queryButton = page.getByRole("button", { name: /💬\s*Query/ });
    await expect(queryButton).toBeVisible();

    // 🔍 Lint 按钮
    const lintButton = page.getByRole("button", { name: /🔍\s*Lint/ });
    await expect(lintButton).toBeVisible();
  });

  test("Query 模式默认显示输入框和发送按钮", async ({ page }) => {
    // Query 模式是默认模式
    // 应该看到 Query 按钮处于激活状态（高亮）
    const queryButton = page.getByRole("button", { name: /💬\s*Query/ });
    await expect(queryButton).toBeVisible();

    // Query 输入框
    const queryInput = page.getByPlaceholder(/向知识库提问/);
    await expect(queryInput).toBeVisible();

    // 发送按钮
    const sendButton = page.getByRole("button", { name: "发送" });
    await expect(sendButton).toBeVisible();
  });

  test("切换到 Lint 模式应该显示 Lint 相关内容", async ({ page }) => {
    // 点击 Lint 按钮
    await page.getByRole("button", { name: /🔍\s*Lint/ }).click();

    // Lint 描述文字
    await expect(page.getByText("运行 Lint 检查断链、矛盾和孤儿页")).toBeVisible();

    // 运行检查按钮
    await expect(page.getByRole("button", { name: "运行检查" })).toBeVisible();
  });

  test("知识图谱区域应该显示暂无数据提示", async ({ page }) => {
    // 初始状态没有图谱数据，应显示提示
    await expect(page.getByText("暂无知识图谱")).toBeVisible();
    await expect(page.getByText("摄入内容后将自动生成")).toBeVisible();
  });

  test("输入区底部应该显示支持格式说明", async ({ page }) => {
    await expect(page.getByText("支持格式：PDF, DOCX, XLSX, MD, TXT")).toBeVisible();
    await expect(page.getByText("拖放文件或粘贴 URL 开始编译")).toBeVisible();
  });
});
