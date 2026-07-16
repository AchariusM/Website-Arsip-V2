import { google } from 'googleapis';

function normalizePrivateKey(key) {
  return String(key || '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return res.status(500).json({
        ok: false,
        error: 'Environment Google Sheets belum lengkap.',
        hasClientEmail: Boolean(clientEmail),
        hasPrivateKey: Boolean(privateKey),
        hasSpreadsheetId: Boolean(spreadsheetId)
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: normalizePrivateKey(privateKey)
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });

    return res.status(200).json({
      ok: true,
      title: meta.data.properties?.title || null,
      sheetCount: meta.data.sheets?.length || 0,
      serviceAccount: clientEmail
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal cek Google Sheets' });
  }
}
