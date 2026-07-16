import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yjmlbytfsxgsjhvmoyvh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbWxieXRmc3hnc2podm1veXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTMwMzAsImV4cCI6MjA5OTUyOTAzMH0.uxJMqH5_7Xga5_iFed0v-NnLr3Q4FrM7eo0hs56YFpQ';

const HEADERS = [
  'No',
  'NIK',
  'Nomor KK',
  'Nomor RTS',
  'Nama',
  'Padukuhan',
  'RW',
  'RT',
  'Pendidikan (dLm KK)',
  'Pendidikan (sdg ditemph)',
  'Pekerjaan',
  'Tanggal Lahir',
  'Tempat Lahir',
  'Umur',
  'Kawin',
  'SHDK',
  'Gol. Darah',
  'Nama Ayah',
  'Nama Ibu',
  'Status'
];

const KEYS = [
  'nomor',
  'nik',
  'nomor_kk',
  'nomor_rts',
  'nama',
  'padukuhan',
  'rw',
  'rt',
  'pendidikan_dlm_kk',
  'pendidikan_sdg_ditemph',
  'pekerjaan',
  'tanggal_lahir',
  'tempat_lahir',
  'umur',
  'kawin',
  'shdk',
  'gol_darah',
  'nama_ayah',
  'nama_ibu',
  'status'
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeRt(rt) {
  const match = String(rt || '').match(/\d+/);
  return match ? String(parseInt(match[0], 10)) : '';
}

function safeSheetTitle(title) {
  return String(title || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').slice(0, 100);
}

function rowsToValues(rows) {
  return [HEADERS, ...rows.map(row => KEYS.map(key => row[key] ?? ''))];
}

function applySearch(rows, search) {
  const q = String(search || '').toLowerCase().trim();
  if (!q) return rows;
  return rows.filter(row =>
    String(row.nama || '').toLowerCase().includes(q) ||
    String(row.nik || '').toLowerCase().includes(q)
  );
}

async function fetchPendudukRows({ mode, rt, search }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('penduduk')
    .select(KEYS.join(','))
    .order('rt', { ascending: true })
    .order('nama', { ascending: true });

  if (error) throw new Error(error.message);

  let rows = data || [];
  if (mode !== 'all' && rt !== 'Semua') {
    rows = rows.filter(row => normalizeRt(row.rt) === normalizeRt(rt));
  }
  return applySearch(rows, search);
}

async function ensureSheets(sheets, spreadsheetId, titles) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets || []).map(sheet => sheet.properties?.title));
  const requests = titles
    .filter(title => !existing.has(title))
    .map(title => ({ addSheet: { properties: { title } } }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }
}

async function writeSheet(sheets, spreadsheetId, title, rows) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${title}'!A:T`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rowsToValues(rows) }
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return res.status(500).json({
        error: 'Environment Google Sheets belum lengkap. Isi GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, dan GOOGLE_SHEETS_SPREADSHEET_ID di Vercel.'
      });
    }

    const { mode = 'filter', rt = 'Semua', search = '' } = req.body || {};
    const rows = await fetchPendudukRows({ mode, rt, search });
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data penduduk untuk disinkronkan.' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    if (mode === 'all') {
      const titles = ['Semua RT', 'RT 1', 'RT 2', 'RT 3', 'RT 4', 'RT 5', 'RT 6'];
      await ensureSheets(sheets, spreadsheetId, titles);
      await writeSheet(sheets, spreadsheetId, 'Semua RT', rows);
      for (const n of ['1', '2', '3', '4', '5', '6']) {
        await writeSheet(sheets, spreadsheetId, 'RT ' + n, rows.filter(row => normalizeRt(row.rt) === n));
      }
      return res.status(200).json({ ok: true, mode: 'all', rows: rows.length });
    }

    const title = safeSheetTitle(rt === 'Semua' ? 'Semua RT' : 'RT ' + normalizeRt(rt));
    await ensureSheets(sheets, spreadsheetId, [title]);
    await writeSheet(sheets, spreadsheetId, title, rows);
    return res.status(200).json({ ok: true, mode: 'filter', sheet: title, rows: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Gagal sinkron ke Google Sheets' });
  }
}
