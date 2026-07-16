import {
  assertGoogleSheetsEnv,
  getGoogleAccessToken,
  getGoogleSheetsEnv,
  getSpreadsheetMeta
} from './_google-sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const googleEnv = getGoogleSheetsEnv();
    try {
      assertGoogleSheetsEnv(googleEnv);
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message,
        hasClientEmail: Boolean(googleEnv.clientEmail),
        hasPrivateKey: Boolean(googleEnv.privateKey),
        hasSpreadsheetId: Boolean(googleEnv.spreadsheetId)
      });
    }

    const accessToken = await getGoogleAccessToken(googleEnv);
    const meta = await getSpreadsheetMeta(googleEnv.spreadsheetId, accessToken);

    return res.status(200).json({
      ok: true,
      title: meta.properties?.title || null,
      sheetCount: meta.sheets?.length || 0,
      serviceAccount: googleEnv.clientEmail
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || 'Gagal cek Google Sheets' });
  }
}
