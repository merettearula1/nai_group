/**
 * Google Apps Script: receives the CSV from experiment.html, emails it to you
 * and saves a copy in a Google Drive folder.
 *
 * Setup (once, about 5 minutes) — see README.md "Sending data by email":
 *   1. Sign in to Google with your personal Gmail (the RECIPIENT in .env), NOT the work account —
 *      check the account picture top right; if several accounts are signed in, use an incognito
 *      window or https://script.google.com/home?authuser=<your Gmail address>.
 *      Go to https://script.google.com → New project, paste this whole file.
 *      The script runs as the account that deploys it: mail is sent from and to that Gmail,
 *      and the Drive copies go to that account's Google Drive.
 *   2. Project Settings (gear icon) → Script properties → add one property:
 *        RECIPIENT = (your Gmail address)
 *      No personal details are written in this file, so it is safe to commit to git.
 *      There is no secret token: the page is public, so a token in it would not protect anything.
 *      Instead the script only accepts real experiment CSVs and limits emails per hour (below).
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me    Who has access: Anyone
 *      Authorise when asked (Google warns because it is your own unverified script:
 *      Advanced → Go to project → Allow).
 *   4. Copy the "Web app URL" into CONFIG.upload.url in experiment.html.
 *   After changing this code later: Deploy → Manage deployments → edit (pencil) → Version: New version
 *   → Deploy. The Web app URL stays the same.
 *
 * Limits (free Google account): about 100 emails per day.
 */

// RECIPIENT comes from Project Settings → Script properties (see step 2), not from this file.
const PROPS = PropertiesService.getScriptProperties();
const FOLDER_NAME = 'multitask_data';           // Drive folder for copies of all files
const TEST_FOLDER_NAME = 'test';                // subfolder of FOLDER_NAME for test runs (?test=1 / ?fast=1 links)
const MAX_PER_HOUR = 30;                        // emails per hour; more are rejected (protects your inbox)
const MAX_BYTES = 2 * 1024 * 1024;              // largest accepted CSV
const CSV_HEADER = 'participant_id,condition,math_single_list,';   // how experiment CSVs start

function doPost(e) {
  try {
    const RECIPIENT = PROPS.getProperty('RECIPIENT');
    if (!RECIPIENT) return reply({ ok: false, error: 'Script property RECIPIENT not set' });
    if (!e.postData || e.postData.contents.length > MAX_BYTES) return reply({ ok: false, error: 'too large' });
    const d = JSON.parse(e.postData.contents);

    // Accept only real experiment data.
    const csv = String(d.csv || '').replace(/^\uFEFF/, '');
    if (!/^multitask_[\w-]+\.csv$/.test(String(d.filename || ''))) return reply({ ok: false, error: 'bad filename' });
    if (!csv.startsWith(CSV_HEADER)) return reply({ ok: false, error: 'not experiment data' });

    // Rate limit: at most MAX_PER_HOUR emails per hour.
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    const cache = CacheService.getScriptCache();
    const key = 'n_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
    const n = Number(cache.get(key) || 0);
    if (n >= MAX_PER_HOUR) { lock.releaseLock(); return reply({ ok: false, error: 'rate limit, try again later' }); }
    cache.put(key, String(n + 1), 3700);
    lock.releaseLock();

    const name = String(d.filename);
    const isTest = d.test === true;
    const blob = Utilities.newBlob(d.csv, 'text/csv', name);   // original text incl. BOM (Excel)

    // 1) Copy in Google Drive (test runs go to multitask_data/test)
    (isTest ? getTestFolder() : getFolder()).createFile(blob);

    // 2) Email with the CSV attached
    MailApp.sendEmail({
      to: RECIPIENT,
      subject: (isTest ? '[TEST] ' : '') + 'Multitask experiment: ' + d.participant_id,
      body: 'Participant: ' + d.participant_id +
            '\nCondition: ' + d.condition +
            '\nMath list alone: ' + d.math_single_list +
            '\nFile: ' + name +
            (isTest ? '\nTEST RUN (?test=1 / ?fast=1 link)' : '') +
            '\n\nThe CSV is attached and also saved in Google Drive folder "' +
            (isTest ? FOLDER_NAME + '/' + TEST_FOLDER_NAME : FOLDER_NAME) + '".',
      attachments: [blob],
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function getFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function getTestFolder() {
  const parent = getFolder();
  const it = parent.getFoldersByName(TEST_FOLDER_NAME);
  return it.hasNext() ? it.next() : parent.createFolder(TEST_FOLDER_NAME);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
