/**
 * Receives Realty ONE Group x TEG leads from the TEG website and appends them
 * to the "Realty ONE Group x TEG Referrals" sheet.
 *
 * Setup (about two minutes):
 * 1. Open the sheet, then Extensions > Apps Script. Paste this file in.
 * 2. Project Settings > Script properties: add SECRET with any long random string.
 * 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web app URL. On the website host, set the environment variables
 *    ROG_SHEET_WEBHOOK_URL (that URL) and ROG_SHEET_WEBHOOK_SECRET (the same SECRET).
 */
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || d.secret !== secret) {
    return ContentService.createTextOutput('forbidden');
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  // Leading apostrophe keeps text that looks like a formula or number as text.
  function t(v) { v = String(v || ''); return /^[=+\-@]/.test(v) ? "'" + v : v; }
  sheet.appendRow([
    new Date().toISOString(), t(d.type), t(d.name), t(d.email), t(d.office),
    t(d.market), t(d.goal), t(d.source), t(d.ref), t(d.page)
  ]);
  return ContentService.createTextOutput('ok');
}
