import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'load', timeout: 30000 });
    const title = await page.title();
    console.log(`Page title: ${title}`);
    await page.screenshot({
      path: path.join(__dirname, 'example.png'),
      fullPage: true,
    });
    console.log('Screenshot saved to spike/example.png');
  } finally {
    if (browser) await browser.close();
  }
})();
