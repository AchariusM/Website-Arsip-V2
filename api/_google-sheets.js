import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export function normalizePrivateKey(key) {
  return String(key || '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n');
}

export function getGoogleSheetsEnv() {
  return {
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  };
}

export function assertGoogleSheetsEnv({ clientEmail, privateKey, spreadsheetId }) {
  if (!clientEmail || !privateKey || !spreadsheetId) {
    const missing = [
      !clientEmail && 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      !privateKey && 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      !spreadsheetId && 'GOOGLE_SHEETS_SPREADSHEET_ID'
    ].filter(Boolean);

    throw new Error('Environment Google Sheets belum lengkap: ' + missing.join(', '));
  }
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(unsignedJwt, privateKey) {
  return crypto
    .createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(normalizePrivateKey(privateKey), 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function getGoogleAccessToken({ clientEmail, privateKey }, scope = SHEETS_SCOPE) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  };

  const unsignedJwt = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const jwt = `${unsignedJwt}.${signJwt(unsignedJwt, privateKey)}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error_description || data.error || `Gagal autentikasi Google (HTTP ${response.status})`);
  }

  if (!data.access_token) {
    throw new Error('Google tidak mengembalikan access token.');
  }

  return data.access_token;
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

export function encodeRange(range) {
  return String(range)
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

export async function googleSheetsRequest(spreadsheetId, accessToken, path = '', options = {}) {
  const response = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    const message = data.error?.message || data.error_description || data.error || `Google Sheets API error (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function getSpreadsheetMeta(spreadsheetId, accessToken) {
  return googleSheetsRequest(spreadsheetId, accessToken);
}

export async function ensureSheetTitles(spreadsheetId, accessToken, titles) {
  const meta = await getSpreadsheetMeta(spreadsheetId, accessToken);
  const existing = new Set((meta.sheets || []).map(sheet => sheet.properties?.title));
  const requests = titles
    .filter(title => !existing.has(title))
    .map(title => ({ addSheet: { properties: { title } } }));

  if (requests.length === 0) return meta;

  await googleSheetsRequest(spreadsheetId, accessToken, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests })
  });

  return getSpreadsheetMeta(spreadsheetId, accessToken);
}

export async function clearSheetRanges(spreadsheetId, accessToken, ranges) {
  return googleSheetsRequest(spreadsheetId, accessToken, '/values:batchClear', {
    method: 'POST',
    body: JSON.stringify({ ranges })
  });
}

export async function updateSheetValues(spreadsheetId, accessToken, data) {
  return googleSheetsRequest(spreadsheetId, accessToken, '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data
    })
  });
}
