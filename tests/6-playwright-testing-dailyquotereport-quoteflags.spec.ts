// bypass + report does load - but only part history not others - does not load all reports - dhaval 2nd code backup
// Use functions from part-history.js
import { test, expect, Page, ConsoleMessage } from '@playwright/test';
// ================== CONFIG ==================
const TEST_TOKEN =
  process.env.INTERNAL_APP_TO_API_KEY ??
  process.env.CYPRESS_TEST_TOKEN ??
  '';
if (!TEST_TOKEN) {
  throw new Error(
    'Missing INTERNAL_APP_TO_API_KEY or CYPRESS_TEST_TOKEN for E2E auth bypass.'
  );
}
// Domains
const BACKEND_API = /http:\/\/localhost:3000\/api\/.*/i;
// ================== HELPERS ==================
// Embed token store
let embedToken: string | null = null;
let embedTokenPromise: Promise<string>;
let resolveEmbedToken: (t: string) => void;
function resetEmbedToken() {
  embedTokenPromise = new Promise<string>((res) => {
    resolveEmbedToken = res;
  });
  embedToken = null;
}
resetEmbedToken();
// ================== BEFORE EACH ==================
test.beforeEach(async ({ context }) => {
  resetEmbedToken();
  // :small_blue_diamond: Store TEST_TOKEN in localStorage for UI
  await context.addInitScript(() => {
    try {
      localStorage.setItem('E2E_TEST_TOKEN', TEST_TOKEN);
      localStorage.setItem('CYPRESS_TEST_TOKEN', TEST_TOKEN);
    } catch { }
  }, TEST_TOKEN);
});
// ================== DIRECT EMBED HELPER ==================
/**
 * Helper to directly embed Power BI using the JavaScript SDK
 * This bypasses the React component entirely
 */
async function embedPowerBIDirectly(page: Page, embedInfo: {
  accessToken: string;
  embedUrl: string;
  reportId: string;
}) {
  // Inject the powerbi-client script if not already present
  await page.evaluate(() => {
    if (!document.querySelector('script[src*="powerbi-client"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js';
      document.head.appendChild(script);
    }
  });
  // Wait for the library to load
  await page.waitForFunction(() => typeof (window as any).powerbi !== 'undefined');
  // Create a container for the report if it doesn't exist
  await page.evaluate(() => {
    if (!document.getElementById('direct-pbi-container')) {
      const container = document.createElement('div');
      container.id = 'direct-pbi-container';
      container.style.width = '100%';
      container.style.height = '800px';
      document.body.appendChild(container);
    }
  });
  // Embed the report using the JavaScript SDK
  await page.evaluate(({ accessToken, embedUrl, reportId }) => {
    const powerbi = (window as any).powerbi;
    // Create the embed configuration
    const config = {
      type: 'report',
      tokenType: 1, // TokenType.Embed
      accessToken,
      embedUrl,
      id: reportId,
      settings: {
        panes: {
          filters: { expanded: false, visible: false }
        }
      }
    };
    // Get the container
    const reportContainer = document.getElementById('direct-pbi-container');
    // Create the report
    const report = powerbi.embed(reportContainer, config);
    // Set up event handlers
    report.on('loaded', () => {
      console.log('Power BI report loaded directly');
      (window as any).__PBI_RENDERED = true;
    });
    report.on('error', (event: any) => {
      console.error('Power BI embed error', event);
    });
  }, embedInfo);
}
// ================== TEST ==================
test('Parts report loads using direct SDK embed', async ({ page }) => {
  test.setTimeout(2400000);
//test.setTimeout(900000);
  // Create a minimal page that doesn't need your React app
  await page.setContent(`
    <html>
      <head><title>Power BI Direct Test</title></head>
      <body>
        <h1>Power BI Direct Embed Test</h1>
        <div id="status">Fetching embed info...</div>
      </body>
    </html>
  `);
  // Fetch the embed info directly
  const response = await page.request.fetch('http://localhost:3001/powerbi-integration/quoteflags', {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`
    }
  });
  const embedInfo = await response.json();
  console.log('Embed info:', embedInfo);
  // Update status
  await page.evaluate(() => {
    document.getElementById('status')!.textContent = 'Embedding report...';
  });
  // Directly embed the report
  await embedPowerBIDirectly(page, {
    accessToken: embedInfo.accessToken,
    embedUrl: embedInfo.embedUrl[0].embedUrl,
    reportId: embedInfo.id
  });
  // Wait for the report to render
  await page.waitForFunction(() => (window as any).__PBI_RENDERED === true, { timeout: 900000 });
//  test.setTimeout(900000);
  // Update status
  await page.evaluate(() => {
    document.getElementById('status')!.textContent = 'Report loaded successfully!';
  });
  // Verify the report loaded
  await expect(page.locator('#direct-pbi-container iframe')).toBeVisible();

  //Alpine Quote Report (All Days)
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();

  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'GDCN' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'GDCN' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PCBType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PCBType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'MaterialType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'MaterialType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'IPCClass' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'IPCClass' }).locator('i').click();


  // ===== Ranged inputs (Start/End + Enter) =====
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GQC Turn' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GQC Turn' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GQC Turn' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GQC Turn' }).getByLabel('End').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GQC Turn' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('40');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').fill('3600');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Via Fills' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Via Fills' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Via Fills' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Via Fills' }).getByLabel('End').fill('1000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Via Fills' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').fill('5568');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').fill('130');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').fill('265026');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').fill('150');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').fill('100000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').fill('500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').fill('3000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').fill('1028');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').fill('1653333');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').fill('4000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').fill('1500000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLP' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLP' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLP' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLP' }).getByLabel('End').fill('119658.54');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLP' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLL' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLL' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLL' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLL' }).getByLabel('End').fill('42857.14');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / TLL' }).getByLabel('End').press('Enter');


  //ProCIM Quote Report (All Days)
  await page.locator('iframe').contentFrame().getByText('ProCIM Quote Report (All Days)', { exact: true }).click();
  //Date
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();

//Filter
  
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ToolNum' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ToolNum' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNum' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNum' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteType' }).locator('i').click();


  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'IPCClass' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'IPCClass' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'CSR' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'OEM' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PCBType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PCBType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'MaterialType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'MaterialType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').press('Enter');
  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('40');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').fill('1818');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').fill('5000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ BOM' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').fill('303');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Panel Qty' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').fill('66908');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Qty' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').fill('9999');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lead Time' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').fill('287655');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').fill('95');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').fill('14663950');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Min Lot' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').fill('15381');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Quote / Calc' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').fill('4906000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / PNL' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').fill('817666');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / LYR' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('Start').fill('0');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').fill('1653833');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam' }).getByLabel('End').press('Enter');

  //Booking Report (All Days)
  await page.locator('iframe').contentFrame().getByText('Bookings Report (All Days)', { exact: true }).click();
  // Date
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();
  //Filter
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OrderNum' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '112233-4' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OrderNum' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteRef' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '167944' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteRef' }).locator('i').click();
  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'AlpineQuoteNumLookup.' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G250512-' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'AlpineQuoteNumLookup.' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'NewOrTool' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'T18192' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'NewOrTool' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  await page.locator( 'iframe').contentFrame().getByRole('combobox', { name: 'SystemName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ProCIM' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SystemName' }).locator('i').click();

  //Issue testing dates on filter widget because they are all identified by the same code.

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SOType' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Assembly' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SOType' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Priority' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Premium' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Priority' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Mod No.' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Mod No.' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Mod No.' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Mod No.' }).getByLabel('End').fill('20');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Mod No.' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Angelica Castaneda' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Audrey Whiteside' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Y' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ITAR' }).click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'DPASRatingLevel' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'DPASRatingLevel' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions-Erie, PA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustName' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'BAE Systems - Endicott - NY' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '1000208425' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNo' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CategoryName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CategoryName' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '18x24' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# LYR' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# LYR' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# LYR' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# LYR' }).getByLabel('End').fill('40');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# LYR' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').fill('800');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Up' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Start Panel' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Start Panel' }).getByLabel('Start').fill('100');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Start Panel' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Start Panel' }).getByLabel('End').fill('1000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Start Panel' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').fill('15000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').fill('400000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Unit $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').fill('18000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Ext $' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Panel' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Panel' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Panel' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Panel' }).getByLabel('End').fill('1000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Panel' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Layer' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Layer' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Layer' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Layer' }).getByLabel('End').fill('600000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Layer' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam Cycle' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam Cycle' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam Cycle' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam Cycle' }).getByLabel('End').fill('1500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '$ / Lam Cycle' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').fill('5');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').press('Enter');

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ProgramName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ProgramName' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Industry' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Industry' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();

  //Alpine Quote Summary Table
  await page.locator('iframe').contentFrame().getByText('Alpine Quote Summary Table').click();
  //Order Booking Summary
  await page.locator('iframe').contentFrame().getByText('Order Bookings Summary').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();

  //Quote Completion Summary
  await page.locator('iframe').contentFrame().getByText('Quote Completion Summary').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();

  //Quote Backlog Summary
  await page.locator('iframe').contentFrame().getByText('Quote Backlog Summary').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '5', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '21' }).click();

  //Flag Summary
  await page.locator('iframe').contentFrame().getByText('Flag Summary').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Bookings' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ProCIM' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Alpine' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '$ / LYR' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Min Lot' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '$ / TLP' }).locator('div span').click();
  //Flags
  await page.locator('iframe').contentFrame().getByText('Flags').click();

})