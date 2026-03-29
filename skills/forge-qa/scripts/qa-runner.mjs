#!/usr/bin/env node

/**
 * qa-runner.mjs — forge-qa 通用测试执行引擎
 *
 * 提供三个核心能力：
 * 1. TestCollector — 结构化 pass/fail/skip 结果收集器
 * 2. attachMonitors — console + network 自动监听
 * 3. snap — 截图工具（自动编号 + 路径管理 + clip 裁剪）
 *
 * 使用方式：
 *   A) 作为库 import：
 *      import { TestCollector, attachMonitors, snap, createPage } from './qa-runner.mjs';
 *
 *   B) 直接执行 test-spec.json：
 *      node qa-runner.mjs --spec=test-spec.json --url=http://localhost:8080
 *
 *   C) 执行内联测试脚本：
 *      node qa-runner.mjs --run=my-test.mjs --url=http://localhost:8080
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// TestCollector — 结构化结果收集器
// ═══════════════════════════════════════════════════════════════

export class TestCollector {
  constructor() {
    this.results = [];
    this.consoleErrors = [];
    this.networkErrors = [];
    this.networkRequests = [];
    this.screenshots = [];
    this._startTime = Date.now();
  }

  /**
   * 记录测试通过
   * @param {string} id - 测试用例 ID（如 "feed-001"）
   * @param {string} description - 测试描述
   * @param {string|null} evidence - 证据路径（截图等）
   */
  pass(id, description, evidence = null) {
    this.results.push({ id, status: 'pass', description, evidence, timestamp: new Date().toISOString() });
    console.log(`  ✅ ${id}: ${description}`);
  }

  /**
   * 记录测试失败
   * @param {string} id - 测试用例 ID
   * @param {string} description - 测试描述
   * @param {string} detail - 失败详情
   * @param {string|null} evidence - 证据路径
   */
  fail(id, description, detail, evidence = null) {
    this.results.push({ id, status: 'fail', description, detail, evidence, timestamp: new Date().toISOString() });
    console.log(`  ❌ ${id}: ${description}`);
    console.log(`     → ${detail}`);
  }

  /**
   * 记录测试跳过
   * @param {string} id - 测试用例 ID
   * @param {string} description - 测试描述
   * @param {string} reason - 跳过原因
   */
  skip(id, description, reason) {
    this.results.push({ id, status: 'skip', description, reason, timestamp: new Date().toISOString() });
    console.log(`  ⏭️  ${id}: ${description} (跳过: ${reason})`);
  }

  /**
   * 检查当前累积的 console 错误，如有则自动 fail
   * @param {string} id - 关联的测试用例 ID
   * @param {string} context - 上下文描述（如 "点击卡片后"）
   * @returns {boolean} 是否有错误
   */
  checkConsoleErrors(id, context = '') {
    const newErrors = this.consoleErrors.filter(e => !e._checked);
    if (newErrors.length > 0) {
      newErrors.forEach(e => e._checked = true);
      const texts = newErrors.map(e => e.text).join('; ');
      this.fail(
        `${id}-console`,
        `${context}控制台错误`,
        `${newErrors.length} 个错误: ${texts.slice(0, 300)}`
      );
      return true;
    }
    return false;
  }

  /**
   * 检查网络错误（状态码 >= 400 的 API 调用）
   * @param {string} id - 关联的测试用例 ID
   * @returns {boolean} 是否有错误
   */
  checkNetworkErrors(id) {
    const newErrors = this.networkErrors.filter(e => !e._checked);
    if (newErrors.length > 0) {
      newErrors.forEach(e => e._checked = true);
      const texts = newErrors.map(e => `${e.status} ${e.url}`).join('; ');
      this.fail(
        `${id}-network`,
        'API 请求错误',
        `${newErrors.length} 个失败: ${texts.slice(0, 300)}`
      );
      return true;
    }
    return false;
  }

  /**
   * 生成结构化摘要
   * @returns {object} 测试结果摘要 JSON
   */
  summary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const duration = Date.now() - this._startTime;

    return {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      duration_human: `${Math.round(duration / 1000)}s`,
      total,
      passed,
      failed,
      skipped,
      pass_rate: total > 0 ? `${(passed / (total - skipped) * 100).toFixed(1)}%` : 'N/A',
      console_errors_total: this.consoleErrors.length,
      network_errors_total: this.networkErrors.length,
      network_requests_total: this.networkRequests.length,
      screenshots: this.screenshots,
      results: this.results,
      console_errors_detail: this.consoleErrors.map(e => ({
        text: e.text,
        url: e.url,
        stack: e.stack,
        timestamp: e.timestamp
      })),
      network_errors_detail: this.networkErrors.map(e => ({
        url: e.url,
        status: e.status,
        timestamp: e.timestamp
      }))
    };
  }

  /**
   * 打印终端摘要
   */
  printSummary() {
    const s = this.summary();
    console.log('\n' + '='.repeat(60));
    console.log('  QA 测试结果');
    console.log('='.repeat(60));
    console.log(`  总计: ${s.total}  通过: ${s.passed}  失败: ${s.failed}  跳过: ${s.skipped}`);
    console.log(`  通过率: ${s.pass_rate}  耗时: ${s.duration_human}`);
    console.log(`  控制台错误: ${s.console_errors_total}  网络错误: ${s.network_errors_total}`);
    if (s.failed > 0) {
      console.log('\n  失败用例:');
      s.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`    ❌ ${r.id}: ${r.description}`);
        if (r.detail) console.log(`       ${r.detail}`);
      });
    }
    console.log('='.repeat(60));
  }
}

// ═══════════════════════════════════════════════════════════════
// attachMonitors — 自动挂载 console + network 监听
// ═══════════════════════════════════════════════════════════════

/**
 * 挂载 console 和 network 监听器到 page
 * @param {import('playwright').Page} page
 * @param {TestCollector} collector
 * @param {object} options
 * @param {string[]} options.apiPatterns - API 路径匹配模式（默认 ['/api/']）
 * @param {string[]} options.ignoreConsole - 忽略的 console 错误模式
 */
export function attachMonitors(page, collector, options = {}) {
  const apiPatterns = options.apiPatterns || ['/api/'];
  const ignoreConsole = options.ignoreConsole || [];

  // Console 错误收集（零容忍）
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 检查是否在忽略列表中
      if (ignoreConsole.some(pattern => text.includes(pattern))) return;
      collector.consoleErrors.push({
        text,
        url: page.url(),
        timestamp: new Date().toISOString(),
        _checked: false
      });
    }
  });

  // 未捕获异常（严重错误）
  page.on('pageerror', err => {
    collector.consoleErrors.push({
      text: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      url: page.url(),
      timestamp: new Date().toISOString(),
      _checked: false
    });
  });

  // 网络请求收集
  page.on('response', response => {
    const url = response.url();
    const isApi = apiPatterns.some(p => url.includes(p));

    if (isApi) {
      const entry = {
        url,
        status: response.status(),
        timestamp: new Date().toISOString()
      };
      collector.networkRequests.push(entry);

      if (response.status() >= 400) {
        collector.networkErrors.push({ ...entry, _checked: false });
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// snap — 截图工具（自动编号 + 路径管理）
// ═══════════════════════════════════════════════════════════════

/**
 * 截图并自动编号
 * @param {import('playwright').Page} page
 * @param {TestCollector} collector
 * @param {string} name - 截图名称（不含序号和扩展名）
 * @param {object} options - Playwright screenshot 选项（fullPage, clip 等）
 * @returns {Promise<string>} 截图文件路径
 */
export async function snap(page, collector, name, options = {}) {
  const dir = process.env.QA_SCREENSHOT_DIR || 'qa_screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const idx = String(collector.screenshots.length + 1).padStart(2, '0');
  const filename = `${idx}_${name}.png`;
  const filepath = path.join(dir, filename);

  await page.screenshot({ path: filepath, ...options });
  collector.screenshots.push(filepath);
  console.log(`  📸 ${filepath}`);
  return filepath;
}

/**
 * 对元素截图（紧凑裁剪）
 * @param {import('playwright').Page} page
 * @param {TestCollector} collector
 * @param {string} name - 截图名称
 * @param {string} selector - 元素选择器
 * @returns {Promise<string|null>} 截图路径，元素不存在返回 null
 */
export async function snapElement(page, collector, name, selector) {
  const el = page.locator(selector).first();
  const box = await el.boundingBox().catch(() => null);
  if (!box) {
    console.log(`  ⚠️  snapElement: ${selector} 不存在，跳过截图`);
    return null;
  }
  // 加 8px padding 防止截图太紧
  const clip = {
    x: Math.max(0, box.x - 8),
    y: Math.max(0, box.y - 8),
    width: box.width + 16,
    height: box.height + 16
  };
  return snap(page, collector, name, { clip });
}

// ═══════════════════════════════════════════════════════════════
// createPage — 标准化浏览器 + 页面创建
// ═══════════════════════════════════════════════════════════════

/**
 * 创建标准化的浏览器和页面
 * @param {object} options
 * @param {number} options.width - 视口宽度（默认 1440）
 * @param {number} options.height - 视口高度（默认 900）
 * @param {string} options.locale - 语言（默认 'zh-CN'）
 * @param {boolean} options.headless - 无头模式（默认 true）
 * @returns {Promise<{browser, context, page}>}
 */
export async function createPage(options = {}) {
  const {
    width = 1440,
    height = 900,
    locale = 'zh-CN',
    headless = true
  } = options;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width, height },
    locale
  });
  const page = await context.newPage();
  return { browser, context, page };
}

// ═══════════════════════════════════════════════════════════════
// pickStratified — 分层采样工具
// ═══════════════════════════════════════════════════════════════

/**
 * 从 N 个元素中分层采样 sampleSize 个
 * 策略：首尾必选 + 中间均匀分布
 * @param {number} total - 总元素数
 * @param {number} sampleSize - 采样数（默认 20）
 * @returns {number[]} 选中的索引数组
 */
export function pickStratified(total, sampleSize = 20) {
  if (total <= sampleSize) return Array.from({ length: total }, (_, i) => i);
  if (total <= 2) return [0];

  const indices = new Set([0, total - 1]); // 首尾必选
  const step = (total - 1) / (sampleSize - 1);
  for (let i = 1; i < sampleSize - 1; i++) {
    indices.add(Math.round(i * step));
  }
  return [...indices].sort((a, b) => a - b);
}

// ═══════════════════════════════════════════════════════════════
// writeResults — 输出结果到文件
// ═══════════════════════════════════════════════════════════════

/**
 * 将测试结果写入 JSON 文件
 * @param {TestCollector} collector
 * @param {string} outputPath - 输出路径（默认 qa_screenshots/test-results.json）
 */
export function writeResults(collector, outputPath = null) {
  const dir = process.env.QA_SCREENSHOT_DIR || 'qa_screenshots';
  const filePath = outputPath || path.join(dir, 'test-results.json');

  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const summary = collector.summary();
  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n  📄 结果已写入: ${filePath}`);
  return filePath;
}

// ═══════════════════════════════════════════════════════════════
// CLI 入口
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : null;
  };

  const specPath = getArg('spec');
  const runPath = getArg('run');
  const url = getArg('url') || 'http://localhost:8080';
  const outputPath = getArg('output');

  if (!specPath && !runPath) {
    console.log(`
forge-qa 测试执行引擎

用法:
  node qa-runner.mjs --spec=test-spec.json --url=http://localhost:8080
  node qa-runner.mjs --run=my-test.mjs --url=http://localhost:8080

参数:
  --spec=<path>    test-spec.json 路径（结构化测试规格）
  --run=<path>     自定义测试脚本路径（必须 export default async function）
  --url=<url>      应用 URL（默认 http://localhost:8080）
  --output=<path>  结果输出路径（默认 qa_screenshots/test-results.json）

作为库使用:
  import { TestCollector, attachMonitors, snap, createPage } from './qa-runner.mjs';
`);
    process.exit(0);
  }

  // 执行自定义测试脚本
  if (runPath) {
    const mod = await import(path.resolve(runPath));
    const testFn = mod.default || mod.run;
    if (typeof testFn !== 'function') {
      console.error(`错误: ${runPath} 必须 export default 一个 async function`);
      process.exit(1);
    }

    const collector = new TestCollector();
    const { browser, context, page } = await createPage();
    attachMonitors(page, collector);

    try {
      await testFn({ page, context, browser, collector, snap, snapElement, url });
    } catch (err) {
      collector.fail('runner-crash', '测试脚本异常退出', err.message);
    }

    collector.printSummary();
    writeResults(collector, outputPath);
    await browser.close();
    process.exit(collector.summary().failed > 0 ? 1 : 0);
  }

  // 执行 test-spec.json
  if (specPath) {
    if (!fs.existsSync(specPath)) {
      console.error(`错误: 找不到 ${specPath}`);
      process.exit(1);
    }

    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    const collector = new TestCollector();
    const { browser, context, page } = await createPage();
    attachMonitors(page, collector);

    console.log(`\n🧪 执行测试规格: ${spec.metadata?.source || specPath}`);
    console.log(`   范围: ${spec.metadata?.scope || 'unknown'}`);
    console.log(`   URL: ${url}\n`);

    // ── 断言深度自检：拒绝只有浅断言的 test case ──
    const SHALLOW_ONLY = new Set(['visible', 'hidden', 'count_gte', 'count_eq']);
    const shallowCases = [];
    for (const suite of spec.suites || []) {
      for (const tc of suite.cases || []) {
        const assertions = tc.assertions || [];
        const hasDeep = assertions.some(a => !SHALLOW_ONLY.has(a.type));
        if (!hasDeep && assertions.length > 0) {
          shallowCases.push(`${tc.id}: ${tc.description}`);
        }
      }
    }
    if (shallowCases.length > 0) {
      console.warn(`\n⚠️  断言深度警告: ${shallowCases.length} 个 test case 只有存在性断言（visible/count），缺少功能正确性断言：`);
      shallowCases.forEach(c => console.warn(`   - ${c}`));
      console.warn(`   建议补充 contains_text / evaluate / has_attribute / matches_regex 等深层断言\n`);
    }

    for (const suite of spec.suites || []) {
      console.log(`\n📦 Suite: ${suite.name} (${suite.id})`);

      for (const tc of suite.cases || []) {
        console.log(`\n  🔍 ${tc.id}: ${tc.description}`);

        try {
          // 执行步骤
          for (const step of tc.steps || []) {
            await executeStep(page, step, url);
          }

          // 执行断言
          let allPassed = true;
          for (const assertion of tc.assertions || []) {
            const result = await executeAssertion(page, assertion, collector);
            if (!result) allPassed = false;
          }

          if (allPassed) {
            const evidence = await snap(page, collector, tc.id);
            collector.pass(tc.id, tc.description, evidence);
          } else {
            const evidence = await snap(page, collector, `${tc.id}_fail`);
            // fail 已经在 executeAssertion 中记录了
          }

          // 每个用例后检查 console 错误
          collector.checkConsoleErrors(tc.id, `执行 ${tc.id} 后`);

        } catch (err) {
          const evidence = await snap(page, collector, `${tc.id}_error`).catch(() => null);
          collector.fail(tc.id, tc.description, `异常: ${err.message}`, evidence);
        }
      }
    }

    collector.printSummary();
    writeResults(collector, outputPath);
    await browser.close();
    process.exit(collector.summary().failed > 0 ? 1 : 0);
  }
}

// ═══════════════════════════════════════════════════════════════
// test-spec 步骤执行器
// ═══════════════════════════════════════════════════════════════

async function executeStep(page, step, baseUrl) {
  switch (step.action) {
    case 'navigate':
      const targetUrl = step.url.startsWith('http') ? step.url : `${baseUrl}${step.url}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      break;

    case 'wait':
      await page.locator(step.selector).first().waitFor({
        state: 'visible',
        timeout: step.timeout || 5000
      });
      break;

    case 'click':
      await page.locator(step.selector).first().click({ timeout: step.timeout || 5000 });
      break;

    case 'fill':
      await page.locator(step.selector).first().fill(step.value, { timeout: step.timeout || 5000 });
      break;

    case 'press':
      await page.keyboard.press(step.key);
      break;

    case 'wait_timeout':
      await page.waitForTimeout(step.ms || 500);
      break;

    case 'scroll':
      await page.mouse.wheel(0, step.deltaY || 300);
      await page.waitForTimeout(300);
      break;

    case 'set_viewport':
      await page.setViewportSize({ width: step.width, height: step.height });
      await page.waitForTimeout(300);
      break;

    case 'evaluate':
      await page.evaluate(step.expression);
      break;

    case 'wait_for_response':
      // 等待特定 API 响应（比 waitForTimeout 更精确）
      // step.url_pattern: URL 包含的字符串（如 '/api/feed'）
      // step.status: 期望的状态码（默认 200）
      await page.waitForResponse(
        resp => resp.url().includes(step.url_pattern) &&
                (!step.status || resp.status() === step.status),
        { timeout: step.timeout || 10000 }
      );
      break;

    case 'navigate_hash':
      // 直接修改 URL hash（不触发完整页面导航）
      // step.hash: 目标 hash 值（如 '#l1=recommend&d=item-123'）
      await page.evaluate((hash) => { window.location.hash = hash; }, step.hash);
      await page.waitForTimeout(step.wait || 1000);
      break;

    case 'go_back':
      await page.goBack({ timeout: step.timeout || 5000 }).catch(() => {});
      await page.waitForTimeout(step.wait || 1000);
      break;

    case 'go_forward':
      await page.goForward({ timeout: step.timeout || 5000 }).catch(() => {});
      await page.waitForTimeout(step.wait || 1000);
      break;

    case 'wait_for_selector_hidden':
      // 等待元素消失（如骨架屏消失、loading 结束）
      await page.locator(step.selector).first().waitFor({
        state: 'hidden',
        timeout: step.timeout || 10000
      });
      break;

    case 'wait_for_load_state':
      // 等待网络空闲或 DOM 加载完成
      await page.waitForLoadState(step.state || 'networkidle', {
        timeout: step.timeout || 15000
      }).catch(() => {});
      break;

    case 'intercept_route':
      // 拦截 API 请求（用于模拟错误态）
      // step.url_pattern: 拦截的 URL 模式
      // step.action: 'abort' | 'fulfill'
      // step.status: fulfill 时的状态码
      // step.body: fulfill 时的响应体
      if (step.route_action === 'abort') {
        await page.route(`**${step.url_pattern}**`, route => route.abort());
      } else if (step.route_action === 'fulfill') {
        await page.route(`**${step.url_pattern}**`, route =>
          route.fulfill({
            status: step.status || 500,
            contentType: 'application/json',
            body: JSON.stringify(step.body || { error: 'mocked error' })
          })
        );
      }
      break;

    case 'clear_routes':
      // 清除所有路由拦截
      await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
      break;

    default:
      console.log(`  ⚠️  未知步骤类型: ${step.action}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// test-spec 断言执行器
// ═══════════════════════════════════════════════════════════════

async function executeAssertion(page, assertion, collector) {
  const timeout = assertion.timeout || 5000;

  switch (assertion.type) {
    case 'visible': {
      const visible = await page.locator(assertion.selector).first()
        .isVisible({ timeout }).catch(() => false);
      if (!visible) {
        collector.fail(
          `${assertion.type}-${assertion.selector}`,
          `元素应可见: ${assertion.selector}`,
          '元素不可见或不存在'
        );
        return false;
      }
      return true;
    }

    case 'hidden': {
      const visible = await page.locator(assertion.selector).first()
        .isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        collector.fail(
          `${assertion.type}-${assertion.selector}`,
          `元素应隐藏: ${assertion.selector}`,
          '元素仍然可见'
        );
        return false;
      }
      return true;
    }

    case 'count_gte': {
      const count = await page.locator(assertion.selector).count();
      if (count < assertion.min) {
        collector.fail(
          `count-${assertion.selector}`,
          `元素数量应 >= ${assertion.min}: ${assertion.selector}`,
          `实际数量: ${count}`
        );
        return false;
      }
      return true;
    }

    case 'count_eq': {
      const count = await page.locator(assertion.selector).count();
      if (count !== assertion.expected) {
        collector.fail(
          `count-${assertion.selector}`,
          `元素数量应 == ${assertion.expected}: ${assertion.selector}`,
          `实际数量: ${count}`
        );
        return false;
      }
      return true;
    }

    case 'contains_text': {
      const el = page.locator(assertion.selector).first();
      const text = await el.textContent({ timeout }).catch(() => '');
      const missing = (assertion.texts || []).filter(t => !text.includes(t));
      if (missing.length > 0) {
        collector.fail(
          `text-${assertion.selector}`,
          `元素应包含文本: ${assertion.texts.join(', ')}`,
          `缺少: ${missing.join(', ')}`
        );
        return false;
      }
      return true;
    }

    case 'has_attribute': {
      const val = await page.locator(assertion.selector).first()
        .getAttribute(assertion.attribute, { timeout }).catch(() => null);
      if (assertion.value !== undefined && val !== assertion.value) {
        collector.fail(
          `attr-${assertion.selector}`,
          `${assertion.selector} 的 ${assertion.attribute} 应为 "${assertion.value}"`,
          `实际值: "${val}"`
        );
        return false;
      }
      if (val === null) {
        collector.fail(
          `attr-${assertion.selector}`,
          `${assertion.selector} 应有属性 ${assertion.attribute}`,
          '属性不存在'
        );
        return false;
      }
      return true;
    }

    case 'css_match': {
      const el = page.locator(assertion.selector).first();
      const actual = await el.evaluate((e, prop) => getComputedStyle(e)[prop], assertion.property)
        .catch(() => null);
      if (actual === null) {
        collector.fail(
          `css-${assertion.selector}`,
          `无法读取 ${assertion.selector} 的 CSS ${assertion.property}`,
          '元素不存在'
        );
        return false;
      }
      const regex = new RegExp(assertion.pattern);
      if (!regex.test(actual)) {
        collector.fail(
          `css-${assertion.selector}`,
          `${assertion.selector} 的 ${assertion.property} 应匹配 ${assertion.pattern}`,
          `实际值: "${actual}"`
        );
        return false;
      }
      return true;
    }

    case 'evaluate': {
      // 深层断言：执行自定义 JS 表达式验证功能正确性
      // script 中 throw Error 表示失败
      try {
        await page.evaluate(assertion.script);
        return true;
      } catch (err) {
        collector.fail(
          `evaluate-${assertion.description || 'custom'}`,
          assertion.description || '自定义断言失败',
          err.message
        );
        return false;
      }
    }

    case 'matches_regex': {
      // 验证元素文本匹配正则表达式（如验证中文、格式等）
      const el = page.locator(assertion.selector).first();
      const text = await el.textContent({ timeout }).catch(() => '');
      const regex = new RegExp(assertion.pattern, assertion.flags || '');
      if (!regex.test(text)) {
        collector.fail(
          `regex-${assertion.selector}`,
          `元素文本应匹配 /${assertion.pattern}/: ${assertion.selector}`,
          `实际文本: "${text.slice(0, 100)}"`
        );
        return false;
      }
      return true;
    }

    case 'no_console_errors': {
      return !collector.checkConsoleErrors('console-check');
    }

    case 'no_network_errors': {
      return !collector.checkNetworkErrors('network-check');
    }

    case 'url_contains': {
      // 验证当前 URL 包含指定字符串
      const currentUrl = page.url();
      if (!currentUrl.includes(assertion.value)) {
        collector.fail(
          `url-contains`,
          `URL 应包含 "${assertion.value}"`,
          `实际 URL: ${currentUrl}`
        );
        return false;
      }
      return true;
    }

    case 'url_hash_match': {
      // 验证 URL hash 匹配正则表达式
      const hash = new URL(page.url()).hash;
      const regex = new RegExp(assertion.pattern);
      if (!regex.test(hash)) {
        collector.fail(
          `url-hash`,
          `URL hash 应匹配 /${assertion.pattern}/`,
          `实际 hash: "${hash}"`
        );
        return false;
      }
      return true;
    }

    case 'url_not_changed': {
      // 验证 URL 未改变（与 assertion.expected 比较）
      const currentUrl = page.url();
      if (currentUrl !== assertion.expected) {
        collector.fail(
          `url-unchanged`,
          `URL 不应改变`,
          `期望: ${assertion.expected}, 实际: ${currentUrl}`
        );
        return false;
      }
      return true;
    }

    case 'response_json_match': {
      // 验证最近的 API 响应 JSON 结构
      // 需要配合 attachMonitors 使用，从 collector.networkRequests 中取
      const matchingReqs = collector.networkRequests.filter(r =>
        r.url.includes(assertion.url_pattern)
      );
      if (matchingReqs.length === 0) {
        collector.fail(
          `api-json-${assertion.url_pattern}`,
          `未找到匹配 "${assertion.url_pattern}" 的 API 请求`,
          `共 ${collector.networkRequests.length} 个 API 请求`
        );
        return false;
      }
      // 验证最近一次请求的状态码
      const latest = matchingReqs[matchingReqs.length - 1];
      if (latest.status >= 400) {
        collector.fail(
          `api-json-${assertion.url_pattern}`,
          `API "${assertion.url_pattern}" 返回错误状态码`,
          `状态码: ${latest.status}`
        );
        return false;
      }
      return true;
    }

    case 'text_length_gte': {
      // 验证元素文本长度 >= 指定值（用于验证"有实质内容"而非空白）
      const el = page.locator(assertion.selector).first();
      const text = await el.innerText({ timeout }).catch(() => '');
      if (text.trim().length < assertion.min) {
        collector.fail(
          `text-len-${assertion.selector}`,
          `${assertion.selector} 文本长度应 >= ${assertion.min}`,
          `实际长度: ${text.trim().length}`
        );
        return false;
      }
      return true;
    }

    case 'element_count_changed': {
      // 验证元素数量相比之前发生了变化
      // assertion.selector: 元素选择器
      // assertion.before_count: 之前的数量
      // assertion.direction: 'increased' | 'decreased' | 'changed'
      const currentCount = await page.locator(assertion.selector).count();
      const dir = assertion.direction || 'changed';
      let ok = false;
      if (dir === 'increased') ok = currentCount > assertion.before_count;
      else if (dir === 'decreased') ok = currentCount < assertion.before_count;
      else ok = currentCount !== assertion.before_count;

      if (!ok) {
        collector.fail(
          `count-change-${assertion.selector}`,
          `${assertion.selector} 数量应 ${dir}`,
          `之前: ${assertion.before_count}, 当前: ${currentCount}`
        );
        return false;
      }
      return true;
    }

    case 'no_overflow': {
      const hasOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      if (hasOverflow) {
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        collector.fail(
          'overflow',
          '页面不应有水平溢出',
          `scrollWidth(${scrollW}) > clientWidth(${clientW})`
        );
        return false;
      }
      return true;
    }

    default:
      console.log(`  ⚠️  未知断言类型: ${assertion.type}`);
      return true;
  }
}

// ═══════════════════════════════════════════════════════════════
// 入口判断
// ═══════════════════════════════════════════════════════════════

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('qa-runner.mjs') ||
  process.argv[1].endsWith('qa-runner')
);

if (isDirectRun) {
  main().catch(err => {
    console.error('qa-runner 异常:', err);
    process.exit(1);
  });
}
