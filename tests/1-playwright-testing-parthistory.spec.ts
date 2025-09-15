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
  test.setTimeout(6000000);
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
  const response = await page.request.fetch('http://localhost:3001/powerbi-integration', {
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


  //DATE FIILTER
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();

  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
   
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Columns' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ErpQuoteNum' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Facility' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'QuoteDate' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').dblclick();
  await page.waitForTimeout(1500);
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Columns' }).locator('i').click();
  
  //PartNumber 
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10000034466' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10000034466' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10000034466' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '116E6021P1' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '-301551-001' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').dblclick();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('311032');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).press('Enter');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'U1-311032FAB' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'U1-311032FAB' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).locator('i').click();


  //QuoteNumber
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNumber' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231121-0001' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231129-0003' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231129-0004' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('G231121-0001');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).press('Enter');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231121-' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231121-' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNumber' }).locator('i').click();

  //CustomerName
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerName' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '24M Technologies-Indianapolis' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '3D Engineering' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions', exact: true }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('3G Wireless');
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3G Wireless' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3G Wireless' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerName' }).locator('i').click();

  //Customer
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . FILTER' }).click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Customer', exact: true }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '24M Technologies-Indianapolis' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '3D Engineering' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions', exact: true }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('3G Wireless');
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3G Wireless' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3G Wireless' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Customer', exact: true }).locator('i').click();

  //PartNumber
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Part Number' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10000034466' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '116E6021P1' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '-301551-001' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').dblclick();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('311032');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).press('Enter');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'U1-311032FAB' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'U1-311032FAB' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Part Number' }).locator('i').click();

  //Tech Complexity
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').fill('25');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').fill('74');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Complexity' }).getByLabel('End').press('Enter');

  //Quote Status
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteStatus' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Lost' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Won' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Cancelled' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();

  //RFQNum
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'RFQNum' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '(PCB P 3/7/23)' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '(CB P 3/19/23)' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'NWI 00907 RFQ' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('SH 3/22/23');
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '(SH 3/22/23)' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '(SH 3/22/23)' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'RFQNum' }).locator('i').click();

  //ErpQuoteNumber
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ErpQuoteNumber' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10001' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '10016' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('31675');
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '31675' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '31675' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ErpQuoteNumber' }).locator('i').click();

  // Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ORG' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  //Class2
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Class2' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'N', exact: true }).locator('div span').click();  
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Class2' }).click();

  //SalesRep
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Angelica Castaneda' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();
  
  //QuoteQTY
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('Start').fill('500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').fill('1000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').fill('1698400');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteQTY' }).getByLabel('End').click();

  //PartUnitPrice
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').fill('500000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').fill('523065');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartUnitPrice' }).getByLabel('End').click();

  //Category
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Category' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Coin' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Assembly' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Heatsink' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Category' }).locator('i').click();
  
  //Class3
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Class3' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Class3' }).locator('i').click();

  //PanelLength
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').fill('3000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').fill('3024');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelLength' }).getByLabel('End').press('Enter');

  //PanelWidth
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').fill('180');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').fill('185');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelWidth' }).getByLabel('End').press('Enter');


  //PanelUp/Array
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').fill('25000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').fill('27000');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PanelUp/Array' }).getByLabel('End').press('Enter');


  //PartLength
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('End').fill('30000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('End').fill('33735');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartLength' }).getByLabel('End').press('Enter');

  //PartWidth
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').fill('13000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').fill('14900');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'PartWidth' }).getByLabel('End').press('Enter');
  
  //TotalPanel
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').fill('70000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').fill('72576');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'TotalPanel' }).getByLabel('End').press('Enter');

  //LayerCount
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').fill('99');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LayerCount' }).getByLabel('End').press('Enter');

  //LamCycles
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('Start').fill('1');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').fill('12');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'LamCycles' }).getByLabel('End').press('Enter');

  //MicroVias
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').fill('4500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').fill('5004');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'MicroVias' }).getByLabel('End').press('Enter');

  //Material
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Material' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '35N' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '3M TAPE' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: '84HP' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Material' }).locator('i').click();

  //SurfaceFinish1
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'SurfaceFinish1' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'ENIG' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Entech' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Entek' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('EPIG');
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'EPIG', exact: true }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'EPIG', exact: true }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'SurfaceFinish1' }).locator('i').click();


  //SurfaceFinish2
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'SurfaceFinish2' }).locator('i').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'ENIG' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Entech' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'Entek' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('EPIG');
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'EPIG' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'EPIG' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'SurfaceFinish2' }).locator('i').click();

  //Spacing
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Spacing' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Spacing' }).locator('i').click();

  //Thickness
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').fill('2500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('Start').fill('-0.10');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').fill('3062');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'Thickness', exact: true }).getByLabel('End').press('Enter');

  //GoldThickness1
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').fill('3500');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').fill('4552');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness1', exact: true }).getByLabel('End').press('Enter');


  //GoldThickness2
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').fill('100');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').fill('200');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'GoldThickness2', exact: true }).getByLabel('End').press('Enter');

  //# Of Ormet Connections
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').fill('22');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Ormet Connections' }).getByLabel('End').press('Enter');

  // # Of Resistor Layers
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('Start').fill('1');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('Start').fill('0');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').fill('12');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: '# Of Resistor Layers' }).getByLabel('End').press('Enter');

  //ResistorOhm
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('Start').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').fill('75');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('Start').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('Start').fill('25');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').click();
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').fill('100');
  // await page.locator('iframe').contentFrame().getByRole('group', { name: 'ResistorOhm' }).getByLabel('End').press('Enter');

  //Enter
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . FILTER' }).click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Close').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . FILTER' }).click();

  //Clear
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();

  //Close
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Close').click();
})