# Setup Google Sheets Sync

## 1. Buat Spreadsheet

1. Buat Google Spreadsheet kosong.
2. Salin Spreadsheet ID dari URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## 2. Buat Service Account

1. Buka Google Cloud Console.
2. Aktifkan `Google Sheets API`.
3. Buat Service Account.
4. Buat key JSON.
5. Ambil nilai `client_email` dan `private_key` dari JSON.

## 3. Share Spreadsheet

Share spreadsheet ke email `client_email` service account sebagai `Editor`.

## 4. Environment Variables Vercel

Tambahkan di Vercel Project Settings:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=client_email_dari_json
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=private_key_dari_json
GOOGLE_SHEETS_SPREADSHEET_ID=id_spreadsheet
```

Untuk private key, gunakan nilai lengkap yang berisi `\n`, misalnya:

```text
-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## 5. Redeploy

Redeploy project setelah environment variable ditambahkan.

## 6. Tombol di Website

Di halaman `Data Penduduk`:

- `Sync Filter`: mengirim data yang sedang tampil/filter RT aktif ke satu sheet.
- `Sync Semua RT`: mengirim semua data ke sheet `Semua RT`, `RT 1`, `RT 2`, `RT 3`, `RT 4`, `RT 5`, dan `RT 6`.

## Troubleshooting

Jika muncul `FUNCTION_INVOCATION_FAILED`:

1. Pastikan project sudah di-redeploy setelah env dibuat.
2. Pastikan spreadsheet sudah di-share ke `GOOGLE_SERVICE_ACCOUNT_EMAIL` sebagai `Editor`.
3. Pastikan `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` berisi private key lengkap, termasuk:
   `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`.
4. Buka Vercel Dashboard -> Project -> Functions/Logs untuk melihat error detail dari `/api/sync-penduduk-sheets`.

Endpoint sync mengambil data penduduk langsung dari Supabase, jadi browser tidak mengirim seluruh data besar ke function.
