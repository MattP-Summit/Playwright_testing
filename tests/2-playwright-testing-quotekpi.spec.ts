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
  const response = await page.request.fetch('http://localhost:3001/powerbi-integration/dashboard', {
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

  //GDCN Backlog
  await page.locator('iframe').contentFrame().getByTestId('pane-sections').getByText('GDCN Backlog', { exact: true }).click();

  //GDCN Backlog History

  await page.locator('iframe').contentFrame().getByTestId('pane-sections').getByText('GDCN Backlog History', { exact: true }).click();
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

  //GDCN Backlog Hisory by Status
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'GDCN Backlog History By Status' }).click();
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

  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Anaheim' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Orange' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();

  //Backlog Weekly Comparison
  await page.locator('iframe').contentFrame().getByText('Backlog Weekly Comparison').click();
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '/8/2025' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '/18/2025' }).locator('div span').click();

  //GDCN Weekly Delta
  await page.locator('iframe').contentFrame().getByText('GDCN Weekly Delta').click();
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

  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ORG' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();

  // Multiple Submits
  await page.locator('iframe').contentFrame().getByText('Multiple Submits').click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '19' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '13' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).fill('5');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).fill('10');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).press('Enter');

  // Daily Quote Logs Brad

  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Daily Quote Logs Brad' }).click();

  // Top slicer dropdown
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Priority' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ErpQuoteNumber' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();

  // Bookmark
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();

  // Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Anaheim' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Irvine' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Orange' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  // Quote Date  (widget + typing)
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByLabel('Calendar button - choose date').first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'QuoteDate' }).getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  // Deadline  (widget + typing)
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByLabel('Calendar button - choose date').first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Deadline' }).getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  // Quote Number
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNumber', exact: true }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G250811-0001' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G250811-0002' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('G250811-0012');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G250811-0012' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G250811-0012' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNumber', exact: true }).locator('i').click();

  // ERP Quote Number
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ErpQuoteNumber' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '175421' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '175454' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('175455');
  await page.locator('iframe').contentFrame().getByRole('option', { name: '175455' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '175455' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ErpQuoteNumber' }).locator('i').click();

  // Priority
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Priority' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Bid for Bid' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'New Part' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Quick Turn' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Priority' }).locator('i').click();

  // Tech Complexity (numeric inputs)
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).fill('10');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).fill('65');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).press('Enter');
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start', exact: true }).fill('0');
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).click();
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).fill('74');
  // await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End', exact: true }).press('Enter');

  // Package Name
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PackageName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '737' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Ashburn' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('8750');
  await page.locator('iframe').contentFrame().getByRole('option', { name: '8750' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '8750' }).locator('div span').click();  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PackageName' }).locator('i').click();

  // Part Number
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).locator('i').click();

  // Started  (widget + typing)
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByLabel('Calendar button - choose date').first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Started' }).getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  // Sales Rep (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Erin Russo' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Jackie Bui');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Jackie Bui' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Jackie Bui' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesRep' }).locator('i').click();

  // Customer RFQ
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerRFQ' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '48371156' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerRFQ' }).locator('i').click();

  // Status
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Status', exact: true }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'No Bid' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Status', exact: true }).locator('i').click();

  // Quoter (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quoter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Taylor Cloud' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Hector Marin' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Brad');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();

  // Approver (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Approver' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Mike Mathews' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Brad');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Approver' }).locator('i').click();

  // Pricer (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Mike');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Mike Mathews' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Mike Mathews' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();

  // OEM Customer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEMCust' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Analog Devices-Colorado Springs, CO' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
    await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Apple');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Apple-Cupertino, CA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Apple-Cupertino, CA' }).locator('div span').click();

  // FAE Status
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'FAEStatus' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'FAE Completed' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'FAE DWG RVW REQ' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'FAEStatus' }).locator('i').click();

  // FAE User (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'FAEUser' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Filomeno Ponce' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Logan Hook' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Gerry');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gerry Partida' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gerry Partida' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'FAEUser' }).locator('i').click();

  // Data Eng User (uses search)
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'DataEngUser' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Angelica Vasquez' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search' }).fill('Gus');
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'DataEngUser' }).locator('i').click();

  // Bookmarks
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();

})