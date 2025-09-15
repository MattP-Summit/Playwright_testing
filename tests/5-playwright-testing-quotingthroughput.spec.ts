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
  const response = await page.request.fetch('http://localhost:3001/powerbi-integration/quotingthroughput', {
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
  await page.waitForFunction(() => (window as any).__PBI_RENDERED === true, { timeout: 2400000 });
//  test.setTimeout(900000);
  // Update status
  await page.evaluate(() => {
    document.getElementById('status')!.textContent = 'Report loaded successfully!';
  });
  // Verify the report loaded
  await expect(page.locator('#direct-pbi-container iframe')).toBeVisible();


  // Pricer Throughput

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

//Quoter Throughput

  await page.locator('iframe').contentFrame().getByText('Quoter Throughput').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  //Data Entry Throughput
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Data Entry Throughput' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  //Average Quotes Over Time
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Average Quotes Over Time' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).click();
  // await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Quote' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Price' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Total' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();

  //Minutes Per Quote
  await page.locator('iframe').contentFrame().getByText('Minutes Per Quote').click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).dblclick();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Quote' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Price' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Data' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
   
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  //Daily Breakdown
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Daily Breakdown', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).dblclick();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Anaheim' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Orange' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Quote' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Price' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Data' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Role' }).locator('i').click();
  
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
   
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');
  
  //Approver Throughput / Average

  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Approver Throughput / Average' }).click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q2' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Q3' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Quarter' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  //Approver Daily Breakdown
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Approver Daily Breakdown' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Next month' }).dblclick();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '18' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Previous month' }).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '4' }).first().click();

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'March' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'June' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'May' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Month' }).locator('i').click();

  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 }); 
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
   
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');
})