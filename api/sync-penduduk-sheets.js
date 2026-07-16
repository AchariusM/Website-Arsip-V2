import {
  assertGoogleSheetsEnv,
  clearSheetRanges,
  ensureSheetTitles,
  getGoogleAccessToken,
  getGoogleSheetsEnv,
  updateSheetValues
} from './_google-sheets.js';

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
  const params = new URLSearchParams();
  params.set('select', KEYS.join(','));
  params.set('order', 'rt.asc,nama.asc');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/penduduk?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const text = await response.text();
  let data = [];
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error(text);
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Gagal mengambil data penduduk dari Supabase (HTTP ${response.status})`);
  }

  let rows = Array.isArray(data) ? data : [];
  if (mode !== 'all' && rt !== 'Semua') {
    rows = rows.filter(row => normalizeRt(row.rt) === normalizeRt(rt));
  }
  return applySearch(rows, search);
}

async function writeSheetsBatch(spreadsheetId, accessToken, sheetRows) {
  const ranges = sheetRows.map(sheet => `'${sheet.title}'!A:T`);
  await clearSheetRanges(spreadsheetId, accessToken, ranges);
  await updateSheetValues(spreadsheetId, accessToken, sheetRows.map(sheet => ({
    range: `'${sheet.title}'!A1`,
    values: rowsToValues(sheet.rows)
  })));
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const googleEnv = getGoogleSheetsEnv();
    assertGoogleSheetsEnv(googleEnv);

    const { mode = 'filter', rt = 'Semua', search = '' } = req.body || {};
    const rows = await fetchPendudukRows({ mode, rt, search });
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data penduduk untuk disinkronkan.' });
    }

    const accessToken = await getGoogleAccessToken(googleEnv);

    if (mode === 'all') {
      const titles = ['Semua RT', 'RT 1', 'RT 2', 'RT 3', 'RT 4', 'RT 5', 'RT 6'];
      await ensureSheetTitles(googleEnv.spreadsheetId, accessToken, titles);
      await writeSheetsBatch(googleEnv.spreadsheetId, accessToken, [
        { title: 'Semua RT', rows },
        ...['1', '2', '3', '4', '5', '6'].map(n => ({
          title: 'RT ' + n,
          rows: rows.filter(row => normalizeRt(row.rt) === n)
        }))
      ]);
      return res.status(200).json({ ok: true, mode: 'all', rows: rows.length });
    }

    const title = safeSheetTitle(rt === 'Semua' ? 'Semua RT' : 'RT ' + normalizeRt(rt));
    await ensureSheetTitles(googleEnv.spreadsheetId, accessToken, [title]);
    await writeSheetsBatch(googleEnv.spreadsheetId, accessToken, [{ title, rows }]);
    return res.status(200).json({ ok: true, mode: 'filter', sheet: title, rows: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Gagal sinkron ke Google Sheets' });
  }
}
