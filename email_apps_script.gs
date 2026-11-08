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
 *   2. Project Settings (gear icon) → Script properties → add two properties, values from .env:
 *        RECIPIENT = (your Gmail address)
 *        TOKEN     = (the TOKEN value in .env)
 *      No personal details are written in this file, so it is safe to commit to git.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me    Who has access: Anyone
 *      Authorise when asked (Google warns because it is your own unverified script:
 *      Advanced → Go to project → Allow).
 *   4. Copy the "Web app URL" into UPLOAD_URL in .env (experiment.html reads .env when it
 *      runs through http://localhost:8000).
 *
 * Limits (free Google account): about 100 emails per day.
 */

// RECIPIENT and TOKEN come from Project Settings → Script properties (see step 2), not from this file.
const PROPS = PropertiesService.getScriptProperties();
const FOLDER_NAME = 'multitask_data';           // Drive folder for copies of all files

function doPost(e) {
  try {
    const RECIPIENT = PROPS.getProperty('RECIPIENT'), TOKEN = PROPS.getProperty('TOKEN');
    if (!RECIPIENT || !TOKEN) return reply({ ok: false, error: 'Script properties RECIPIENT / TOKEN not set' });
    const d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return reply({ ok: false, error: 'wrong token' });
    if (!d.csv || !d.filename) return reply({ ok: false, error: 'no data' });

    const name = String(d.filename).replace(/[^\w.\-]/g, '_');
    const blob = Utilities.newBlob(d.csv, 'text/csv', name);

    // 1) Copy in Google Drive
    getFolder().createFile(blob);

    // 2) Email with the CSV attached
    MailApp.sendEmail({
      to: RECIPIENT,
      subject: 'Multitask experiment: ' + d.participant_id,
      body: 'Participant: ' + d.participant_id +
            '\nCondition: ' + d.condition +
            '\nMath list alone: ' + d.math_single_list +
            '\nFile: ' + name +
            '\n\nThe CSV is attached and also saved in Google Drive folder "' + FOLDER_NAME + '".',
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

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
