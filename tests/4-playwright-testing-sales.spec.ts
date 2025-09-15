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
  const response = await page.request.fetch('http://localhost:3001/powerbi-integration/sales', {
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

  // Date (widget + typing)
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '3', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');
  // Quote Capture Period
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Quarter' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Month' }).locator('div span').click();

  //Filter
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  //New/Repeat
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'New' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();
  //System
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'System' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Alpine' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'System' }).locator('i').click();
  //Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).click();
  //isITAR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Y', exact: true }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  //Customer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions-Erie, PA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //CSR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Allison Herrera' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brian Hughey' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //HubSpotRep
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '10x Genomics-Pleasanton, CA *' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  //Pricer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  //Order Value
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').fill('1000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').fill('100000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').press('Enter');
  //Tech Level
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').press('Enter');
  //Turn Days
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').fill('8000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').press('Enter');
  // %BOM
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').fill('100');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  //Panel Size
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //# Layers
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  // Lam Cycles
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Close').click();

  //Win Rate
  await page.locator('iframe').contentFrame().getByRole('tab', { name: 'Win Rate' }).click();
  //Year
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '2024' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '2023' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '2025' }).locator('div span').click();
  //Filter
//New/Repeat
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'New' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();
  //System
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'System' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Alpine' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'System' }).locator('i').click();
  //Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).click();
  //Customer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions-Erie, PA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //CSR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Allison Herrera' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brian Hughey' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //HubSpotRep
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '10x Genomics-Pleasanton, CA *' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  //Pricer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brad Banister' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Gus Cantuna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Pricer' }).locator('i').click();
  //Order Value
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').fill('1000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('Start').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').fill('100000000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Order Value' }).getByLabel('End').press('Enter');
  //Tech Level
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').fill('50');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Tech Level' }).getByLabel('End').press('Enter');
  //Turn Days
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').fill('8000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').press('Enter');
  // %BOM
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').fill('100');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  //Panel Size
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //# Layers
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  // Lam Cycles
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Close').click();

  // New and Repeat Counts
  await page.locator('iframe').contentFrame().getByText('New And Repeat Counts').click();
  
  //Calendar
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '3', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');
  //Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ORG' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //isITAR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Y' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  //Customer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions-Erie, PA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  
  //Sales Summary
  await page.locator('iframe').contentFrame().getByText('Sales Summary').click();

  //Calendar
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '3', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

  //Filter
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  //New/Repeat
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'New' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Activity' }).locator('i').click();

//Facility
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'ANA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Facility' }).click();
  //isITAR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Y', exact: true }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'isITAR' }).locator('i').click();
  //Customer
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '4Front Solutions-Erie, PA' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //CSR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Allison Herrera' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Brian Hughey' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //HubSpotRep
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '10x Genomics-Pleasanton, CA *' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OEM' }).locator('i').click();

   //Turn Days
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').fill('8000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Turn Days' }).getByLabel('End').press('Enter');
  // %BOM
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('Start').fill('100');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').fill('10000');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '% BOM' }).getByLabel('End').press('Enter');
  //Panel Size
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelSize' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  //# Layers
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('Start').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').fill('30');
  await page.locator('iframe').contentFrame().getByRole('group', { name: '# Layers' }).getByLabel('End').press('Enter');
  // Lam Cycles
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('Start').fill('2');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').click();
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').fill('10');
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Lam Cycles' }).getByLabel('End').press('Enter');
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Search').click();
  await page.locator('iframe').contentFrame().getByRole('link', { name: 'Bookmark . Click here to' }).first().click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Clear').click();
  await page.locator('iframe').contentFrame().getByText('Press Enter to explore dataBookmark Close').click();
  //CSR
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Abigail Reyna' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Select all' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CSR' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'HubSpotRep' }).locator('i').click();
  //Date
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '3', exact: true }).first().click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Start date. Available input' }).fill('8/10/2025');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).click({ clickCount: 3 });
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).press('Delete');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'End date. Available input' }).fill('9/4/2025');

})