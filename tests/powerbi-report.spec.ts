import { test, expect } from '@playwright/test';
test('test', async ({ page }) => {
  
  test.setTimeout(200000);
  
  await page.goto('http://localhost:8080/');

  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).fill('000-133-7079-999');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).press('Enter');
  await page.waitForTimeout(1000);
  await page.locator('iframe').contentFrame().getByRole('option', { name: '000-133-7079-999' }).locator('div span').click();
  await page.waitForTimeout(3000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '000-133-7079-999' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber' }).locator('i').click();

  //QUOTE-NUMBER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNum' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).fill('G231121-0001');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).press('Enter');
  await page.waitForTimeout(1000);
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231121-0001' }).locator('div span').click(); 
  await page.waitForTimeout(3000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G231121-0001' }).locator('div span').click(); 
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNum' }).locator('i').click();
 
  //CUSTOMER-NAME
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).click();
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).fill('Evertz Microsystems-Burlington, ON, CAN');
  await page.locator('iframe').contentFrame().getByRole('textbox', { name: 'Search', exact: true }).press('Enter');
  await page.waitForTimeout(1000);
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Evertz Microsystems-Burlington, ON, CAN' }).locator('div span').click();
  await page.waitForTimeout(3000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Evertz Microsystems-Burlington, ON, CAN' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'CustomerName' }).locator('i').click();
  //QUOTE_DATE
  //START DATe
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).first().click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '16' }).click();
  await page.waitForTimeout(1000); 
  //END DATE
  await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.waitForTimeout(2000); 
   await page.locator('iframe').contentFrame().getByRole('button', { name: 'Calendar button - choose date' }).nth(1).click();
  await page.locator('iframe').contentFrame().getByRole('button', { name: '1', exact: true }).first().click();
  await page.waitForTimeout(2000); 
  //Search
  //await page.locator('iframe').contentFrame().locator('visual-modern').filter({ hasText: 'Search' }).locator('path').first().click();
  //Clear
  //await page.locator('iframe').contentFrame().locator('visual-modern').filter({ hasText: 'Clear' }).locator('path').first().click();
  //Close
  //await page.locator('iframe').contentFrame().locator('visual-modern').filter({ hasText: 'Close' }).locator('path').first().click();
  //FILTERS
  await page.locator('iframe').contentFrame().getByRole('group', { name: 'Bookmark . FILTER' }).locator('path').first().click();
  //QuoteStatus Filter 
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteStatus' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'All Active' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'All Active' }).locator('div span').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Completed' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Completed' }).locator('div span').click();
  //Customer-Name FILTER  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Customer' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'R&D Altanova-San Ignacio, CA' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'R&D Altanova-San Ignacio, CA' }).locator('div span').click();
  //Part_Number FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartNumber INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '14521' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '14521' }).locator('div span').click();
  //RFQ FILTER
  await page.locator('iframe').contentFrame().getByLabel('RFQ Number').getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'All Active' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'All Active' }).locator('div span').click();
  //Quote-Number FILTER  
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'QuoteNumber' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G230915-' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'G230915-' }).locator('div span').click();
  //Facility FILTER
  await page.locator('iframe').contentFrame().locator('visual-modern').filter({ hasText: 'Facility(Not yet applied) All' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByTitle('Orange').locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByTitle('Orange').locator('div span').click();
  //SalesRep FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SalesPerson_User_FullName' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'IDT test' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'IDT test' }).locator('div span').click();
  //QuoteQty FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'DueQty' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByTitle('4', { exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByTitle('4', { exact: true }).locator('div span').click();
  
  //PartUnitPrice FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'UnitPrice' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '1.00', exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '1.00', exact: true }).locator('div span').click();
  //Product Category FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ProductCategory INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-551ac070-9f07-4d3d-8188-e76cc7810839').getByRole('option', { name: 'Rigid', exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-551ac070-9f07-4d3d-8188-e76cc7810839').getByRole('option', { name: 'Rigid', exact: true }).locator('div span').click();
  //Class2 FILTER
  await page.locator('iframe').contentFrame().getByLabel('Class2').getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'A&D' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'A&D' }).locator('div span').click();
  //Class3 FILTER
  await page.locator('iframe').contentFrame().getByLabel('Class3').getByTestId('slicer-dropdown').locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'A&D' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'A&D' }).locator('div span').click();
  
  //Panel Length FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelLength INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.68' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.68' }).locator('div span').click();
  //Panel Width FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PanelWidth INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.81' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.81' }).locator('div span').click();
  //PanelUP/Array FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ArrayUp' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByTitle('1', { exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByTitle('1', { exact: true }).locator('div span').click();
  //Part Length FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'BoardLength INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.51' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.51' }).locator('div span').click();
  //Part Width FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'BoardWidth INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '1.05' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '1.05' }).locator('div span').click();
  //Total Panel FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'TotalPanel INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-33ae466b-dbac-6561-f6a3-6b769734aab7').getByRole('option', { name: '1', exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-33ae466b-dbac-6561-f6a3-6b769734aab7').getByRole('option', { name: '1', exact: true }).locator('div span').click();
  //Layer Count FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Layer INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-ddf9f32f-f6c2-a41d-a28e-9cccfd9495da > .slicer-dropdown-content > .slicerContainer > .slicerBody > .scroll-wrapper > .scrollbar-inner > .scrollRegion > .visibleGroup > div:nth-child(2) > .slicerItemContainer > .slicerCheckbox > .glyphicon').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-ddf9f32f-f6c2-a41d-a28e-9cccfd9495da > .slicer-dropdown-content > .slicerContainer > .slicerBody > .scroll-wrapper > .scrollbar-inner > .scrollRegion > .visibleGroup > div:nth-child(2) > .slicerItemContainer > .slicerCheckbox > .glyphicon').click();
  
  //LAM Cycles FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'LamCycles INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.52' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.52' }).locator('div span').click();
  //Microvias FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'MicroVias INT' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3.69' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '3.69' }).locator('div span').click();
  //Surface Finish 1 FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SurfaceFinish INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.18' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.18' }).locator('div span').click();
  //Surface Finish 2 FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'SurfaceFinish2d INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.20' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.20' }).locator('div span').click();
  //Material FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Material INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Arlon TC350' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: 'Arlon TC350' }).locator('div span').click();
  //Spacing FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'Spacing INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.55' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.55' }).locator('div span').click();
  //Thickness FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'PartThickness INT' }).click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.43' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.43' }).locator('div span').click();
  //Gold Thickness 1 FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'GoldThickness INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.27' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.27' }).locator('div span').click();
  //Gold Thickness 2 FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'GoldThickness2d INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.32' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '0.32' }).locator('div span').click();
  //# Of Ormet Connectors FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'OrmetConnections INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().getByRole('option', { name: '10' }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().getByRole('option', { name: '10' }).locator('div span').click();
  //# Of Resistor Layers FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ResistorLayers INT' }).locator('i').click();
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-2a629338-eebe-f2cc-9e79-e0092b59ee12 > .slicer-dropdown-content > .slicerContainer > .slicerBody > .scroll-wrapper > .scrollbar-inner > .scrollRegion > .visibleGroup > div:nth-child(2) > .slicerItemContainer > .slicerCheckbox > .glyphicon').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-2a629338-eebe-f2cc-9e79-e0092b59ee12 > .slicer-dropdown-content > .slicerContainer > .slicerBody > .scroll-wrapper > .scrollbar-inner > .scrollRegion > .visibleGroup > div:nth-child(2) > .slicerItemContainer > .slicerCheckbox > .glyphicon').click();
  
  //Resistor Ohm FILTER
  await page.locator('iframe').contentFrame().getByRole('combobox', { name: 'ResistorOhm' }).locator('i').click();
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-0df7657a-ad41-2bdb-868e-92d391618920').getByRole('option', { name: '1', exact: true }).locator('div span').click();
  await page.waitForTimeout(2000); 
  await page.locator('iframe').contentFrame().locator('#slicer-dropdown-popup-0df7657a-ad41-2bdb-868e-92d391618920').getByRole('option', { name: '1', exact: true }).locator('div span').click();
});
