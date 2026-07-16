import {
  assertGoogleSheetsEnv,
  getGoogleAccessToken,
  normalizePrivateKey
} from './_google-sheets.js';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb'
    }
  }
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getDriveEnv() {
  return {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    spreadsheetId: process.env.GOOGLE_DRIVE_FOLDER_ID
  };
}

function assertDriveEnv(env) {
  try {
    assertGoogleSheetsEnv(env);
  } catch (err) {
    throw new Error('Environment Google Drive belum lengkap: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID');
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text };
  }
}

async function driveRequest(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    const message = data.error?.message || data.error_description || data.error || `Google Drive API error (HTTP ${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function uploadFileToDrive({ accessToken, folderId, fileName, mimeType, buffer }) {
  const boundary = 'arsip_penduduk_' + Date.now();
  const metadata = {
    name: fileName,
    parents: [folderId]
  };
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const body = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n'),
    Buffer.from(delimiter + `Content-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(closeDelimiter)
  ]);

  return driveRequest(
    accessToken,
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    }
  );
}

async function makeFileReadable(accessToken, fileId) {
  return driveRequest(accessToken, `${DRIVE_API_URL}/${fileId}/permissions?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileName, mimeType, dataBase64 } = req.body || {};
    if (!fileName || !dataBase64) {
      return res.status(400).json({ error: 'File penduduk tidak lengkap.' });
    }

    const driveEnv = getDriveEnv();
    assertDriveEnv(driveEnv);
    const buffer = Buffer.from(String(dataBase64), 'base64');
    if (buffer.length === 0) return res.status(400).json({ error: 'File penduduk kosong.' });
    if (buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'File penduduk terlalu besar untuk diupload lewat Vercel.' });

    const accessToken = await getGoogleAccessToken({
      clientEmail: driveEnv.clientEmail,
      privateKey: normalizePrivateKey(driveEnv.privateKey)
    }, DRIVE_SCOPE);

    const created = await uploadFileToDrive({
      accessToken,
      folderId: driveEnv.spreadsheetId,
      fileName,
      mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer
    });
    await makeFileReadable(accessToken, created.id);

    return res.status(200).json({
      ok: true,
      file_id: created.id,
      file_name: created.name,
      file_url: created.webViewLink,
      download_url: created.webContentLink
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Gagal upload data penduduk ke Google Drive' });
  }
}
