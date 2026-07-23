$ErrorActionPreference = 'Stop'

$output = Join-Path (Split-Path $PSScriptRoot -Parent) 'Panduan-Penggunaan-dan-Serah-Terima-Website-Arsip-Plosodoyong.docx'
$temp = Join-Path (Split-Path $PSScriptRoot -Parent) '.docx-build'
$zip = Join-Path (Split-Path $PSScriptRoot -Parent) '.docx-build.zip'

if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
New-Item -ItemType Directory -Force -Path $temp, "$temp\_rels", "$temp\word", "$temp\word\_rels" | Out-Null

function X([string]$value) {
    if ($null -eq $value) { return '' }
    return [System.Security.SecurityElement]::Escape($value)
}

function Run([string]$text, [switch]$Bold, [switch]$Italic, [string]$Color = '', [int]$Size = 22) {
    $props = ''
    if ($Bold) { $props += '<w:b/>' }
    if ($Italic) { $props += '<w:i/>' }
    if ($Color) { $props += '<w:color w:val="' + $Color + '"/>' }
    $props += '<w:sz w:val="' + $Size + '"/><w:szCs w:val="' + $Size + '"/>'
    return '<w:r><w:rPr>' + $props + '</w:rPr><w:t xml:space="preserve">' + (X $text) + '</w:t></w:r>'
}

function Para([string]$text, [string]$style = 'Normal', [string]$align = '', [switch]$Bold, [switch]$Italic, [string]$color = '', [int]$size = 22, [int]$after = 100) {
    $pPr = '<w:pStyle w:val="' + $style + '"/><w:spacing w:after="' + $after + '"/>'
    if ($align) { $pPr += '<w:jc w:val="' + $align + '"/>' }
    return '<w:p><w:pPr>' + $pPr + '</w:pPr>' + (Run $text -Bold:$Bold -Italic:$Italic -Color $color -Size $size) + '</w:p>'
}

function Bullet([string]$text, [int]$level = 0) {
    return '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="' + $level + '"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="60"/></w:pPr>' + (Run $text) + '</w:p>'
}

function Numbered([string]$text) {
    return '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr>' + (Run $text) + '</w:p>'
}

function Cell([string]$text, [switch]$Header, [int]$width = 4500) {
    $shade = if ($Header) { '<w:shd w:val="clear" w:fill="D9EAD3"/>' } else { '' }
    return '<w:tc><w:tcPr><w:tcW w:w="' + $width + '" w:type="dxa"/>' + $shade + '</w:tcPr><w:p><w:pPr><w:spacing w:after="30"/></w:pPr>' + (Run $text -Bold:$Header -Size 19) + '</w:p></w:tc>'
}

function Table([array]$headers, [array]$rows, [array]$widths) {
    $xml = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7C9B3"/><w:left w:val="single" w:sz="4" w:color="B7C9B3"/><w:bottom w:val="single" w:sz="4" w:color="B7C9B3"/><w:right w:val="single" w:sz="4" w:color="B7C9B3"/><w:insideH w:val="single" w:sz="4" w:color="D6E2D3"/><w:insideV w:val="single" w:sz="4" w:color="D6E2D3"/></w:tblBorders></w:tblPr><w:tr>'
    for ($i=0; $i -lt $headers.Count; $i++) { $xml += Cell $headers[$i] -Header -width $widths[$i] }
    $xml += '</w:tr>'
    foreach ($row in $rows) {
        $xml += '<w:tr>'
        for ($i=0; $i -lt $row.Count; $i++) { $xml += Cell ([string]$row[$i]) -width $widths[$i] }
        $xml += '</w:tr>'
    }
    return $xml + '</w:tbl>' + (Para '' -after 60)
}

$body = ''
$body += Para 'PANDUAN PENGGUNAAN DAN SERAH-TERIMA' 'Title' 'center' -Bold -color '1B4332' -size 34 -after 120
$body += Para 'Website Arsip Dokumen Plosodoyong' 'Subtitle' 'center' -Bold -color '2D6A4F' -size 28 -after 260
$body += Para 'Dokumen operasional, teknis, dan checklist untuk pengelola berikutnya' 'Normal' 'center' -Italic -color '586B5A' -size 21 -after 300
$body += Table @('Informasi', 'Keterangan') @(
    @('Nama proyek', 'Arsip Dokumen Plosodoyong'),
    @('Repository', 'https://github.com/AchariusM/Website-Arsip-V2'),
    @('Versi dokumen', '1.0 - dibuat 20 Juli 2026'),
    @('Website produksi', '[ISI URL VERCEL/DOMAIN AKTIF]'),
    @('Pemilik/pengelola', '[ISI NAMA DAN KONTAK PENANGGUNG JAWAB]')
) @(3000, 6000)
$body += Para 'Catatan kerahasiaan' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Jangan menulis password, private key, atau token rahasia di dokumen ini. Serahkan kredensial melalui password manager atau kanal aman, lalu ganti password setelah serah-terima.' -Bold -color '9C2F24'

$body += Para '1. Tujuan dan gambaran singkat' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Website ini dipakai untuk mengelola arsip dokumen dan data penduduk Padukuhan Plosodoyong. Aplikasi berjalan sebagai website statis di Vercel, menggunakan Supabase untuk data dan penyimpanan dokumen, serta integrasi Google Sheets/Drive melalui fungsi serverless.'
$body += Para 'Alur sistem' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Para 'Pengguna -> Website di Vercel -> Supabase (users, documents, penduduk, audit_logs, Storage)'
$body += Para '                              -> API Vercel -> Google Sheets / Google Drive'
$body += Para 'Komponen utama' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Table @('Komponen', 'Fungsi', 'Lokasi') @(
    @('Frontend', 'Tampilan, login, operasi data', 'index.html, style.css, script.js'),
    @('Kontrol akses', 'Matriks izin Admin/Pengurus', 'access-control.js'),
    @('Database dan file', 'Data aplikasi dan bucket documents', 'Supabase'),
    @('Hosting/API', 'Hosting statis dan fungsi serverless', 'Vercel dan folder api/'),
    @('Integrasi', 'Sinkronisasi/ekspor data penduduk', 'Google Sheets API dan Drive API'),
    @('Pengujian', 'Tes kontrol akses dan keamanan API', 'tests/')
) @(1800, 3800, 3400)

$body += Para '2. Panduan penggunaan harian' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para '2.1 Masuk dan keluar' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Numbered 'Buka URL website produksi yang dicatat pada halaman pertama.'
$body += Numbered 'Masukkan email dan kata sandi akun aktif.'
$body += Numbered 'Klik Masuk. Jika gagal, periksa ejaan email, status akun, dan koneksi Supabase.'
$body += Numbered 'Untuk keluar, klik profil di kanan atas lalu pilih Keluar.'
$body += Para 'Catatan: akun demo dari berkas setup tidak boleh dipakai terus-menerus pada produksi. Ganti kredensial awal dan jangan membagikan satu akun kepada banyak orang.' -Italic -color '9C2F24'

$body += Para '2.2 Hak akses' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Table @('Fitur', 'Admin', 'Pengurus') @(
    @('Lihat dokumen', 'Ya', 'Ya'),
    @('Upload dokumen', 'Ya', 'Ya'),
    @('Edit/hapus dokumen', 'Ya', 'Tidak'),
    @('Lihat data penduduk', 'Ya', 'Ya'),
    @('Export data penduduk', 'Ya', 'Ya'),
    @('Import, input, clear data penduduk', 'Ya', 'Tidak'),
    @('Manajemen pengguna', 'Ya', 'Tidak'),
    @('Audit Log', 'Ya', 'Tidak')
) @(4500, 2200, 2200)

$body += Para '2.3 Dashboard' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Bullet 'Menampilkan jumlah total dokumen.'
$body += Bullet 'Menampilkan daftar dokumen terbaru.'
$body += Bullet 'Gunakan Lihat Semua untuk masuk ke Manajemen Dokumen.'

$body += Para '2.4 Manajemen dokumen' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Para 'Upload dokumen:' -Bold
$body += Numbered 'Pilih Manajemen Dokumen -> Upload Dokumen Baru.'
$body += Numbered 'Pilih atau seret file. Format yang diterima: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG/JPEG, dan PNG.'
$body += Numbered 'Ukuran maksimum satu file adalah 10 MB.'
$body += Numbered 'Isi Judul, Kategori, Tanggal Dokumen, dan Deskripsi bila diperlukan.'
$body += Numbered 'Klik Upload Sekarang dan tunggu notifikasi berhasil.'
$body += Para 'Operasi lain:' -Bold
$body += Bullet 'Preview membuka pratinjau file yang didukung.'
$body += Bullet 'Download mengunduh dokumen asli.'
$body += Bullet 'Admin dapat mengubah informasi dokumen dan menghapus dokumen. Penghapusan bersifat permanen.'
$body += Bullet 'Gunakan kolom pencarian global untuk mencari judul, kategori, atau deskripsi.'

$body += Para '2.5 Data penduduk' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Bullet 'Tab Semua dan RT 1-RT 6 menyaring data berdasarkan RT.'
$body += Bullet 'Kotak Cari Nama atau NIK menyaring data yang sedang tampil.'
$body += Bullet 'Export Filter mengunduh data sesuai filter aktif.'
$body += Bullet 'Export per RT membuat workbook dengan sheet Semua RT dan RT 1-RT 6.'
$body += Bullet 'Admin dapat memakai Input Manual, Import Excel/CSV, dan Clear Import.'
$body += Para 'Aturan import:' -Bold
$body += Bullet 'Gunakan header seperti NIK, Nomor KK, Nama, Padukuhan, RW, RT, Pekerjaan, Tanggal Lahir, dan kolom lain sesuai template ekspor.'
$body += Bullet 'RT yang diterima adalah 1 sampai 6.'
$body += Bullet 'Tanggal aman menggunakan format YYYY-MM-DD atau DD/MM/YYYY.'
$body += Bullet 'Sebelum import besar, ekspor/backup data dan uji dahulu dengan beberapa baris.'
$body += Bullet 'Clear Import menghapus seluruh data penduduk; pastikan backup tersedia sebelum konfirmasi.'

$body += Para '2.6 Manajemen pengguna (Admin)' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Bullet 'Tambah Pengurus: isi nama, email unik, password awal, role, dan status.'
$body += Bullet 'Edit Pengguna: ubah nama, email, role, atau status.'
$body += Bullet 'Gunakan status Nonaktif untuk mencabut akses tanpa kehilangan catatan pengguna.'
$body += Bullet 'Hapus akun hanya bila benar-benar diperlukan karena dapat memengaruhi keterbacaan riwayat.'

$body += Para '2.7 Audit Log (Admin)' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Para 'Audit Log menyimpan aktivitas penting seperti login dan perubahan data. Tinjau log saat terjadi perubahan yang tidak dikenali. Saat ini aplikasi memuat maksimum 500 entri terbaru.'

$body += Para '3. Link dan akses yang harus diserahkan' 'Heading1' -Bold -color '1B4332' -size 28
$body += Table @('Layanan', 'Link', 'Yang harus diserahkan') @(
    @('GitHub', 'https://github.com/AchariusM/Website-Arsip-V2', 'Akses repository/collaborator'),
    @('Vercel', 'https://vercel.com/dashboard', 'Akses project, domain, deployments, logs, env'),
    @('Website aktif', '[ISI URL PRODUKSI]', 'URL publik dan domain/DNS bila ada'),
    @('Supabase project', 'https://supabase.com/dashboard/project/yjmlbytfsxgsjhvmoyvh', 'Akses organisasi/project, database, Storage'),
    @('Google Cloud', 'https://console.cloud.google.com/', 'Project, service account, Sheets API, Drive API'),
    @('Google Sheet', '[ISI URL SPREADSHEET]', 'Share Editor ke pengelola dan service account'),
    @('Folder Google Drive', '[ISI URL FOLDER]', 'Share Editor ke pengelola dan service account'),
    @('Domain/DNS', '[ISI PROVIDER DAN URL]', 'Akses registrar/DNS dan tanggal perpanjangan'),
    @('Email pemulihan', '[ISI EMAIL PENANGGUNG JAWAB]', 'Pastikan bukan email pribadi yang akan hilang')
) @(1800, 3500, 3700)
$body += Para 'Data yang wajib dicatat terpisah secara aman' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Bullet 'Pemilik akun dan minimal satu admin cadangan untuk GitHub, Vercel, Supabase, Google Cloud, dan domain.'
$body += Bullet 'Lokasi password manager/vault dan prosedur pemulihan akun.'
$body += Bullet 'Service account email; private key harus disimpan sebagai secret, bukan di Git atau dokumen ini.'
$body += Bullet 'Tanggal perpanjangan domain atau layanan berbayar, metode pembayaran, dan pihak yang menyetujui biaya.'

$body += Para '4. Menjalankan proyek untuk pengembangan' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Prasyarat' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Bullet 'Git.'
$body += Bullet 'Node.js versi LTS dan pnpm 11.4.0 (versi tercatat di package.json).'
$body += Bullet 'Akun/akses Supabase dan Vercel.'
$body += Bullet 'Vercel CLI bila ingin menjalankan endpoint api/ secara lokal.'
$body += Para 'Langkah awal' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Numbered 'Clone: git clone https://github.com/AchariusM/Website-Arsip-V2.git'
$body += Numbered 'Masuk folder proyek lalu jalankan: pnpm install'
$body += Numbered 'Jalankan tes: pnpm test'
$body += Numbered 'Untuk tampilan saja, layani folder dengan local web server. Untuk frontend beserta api/, gunakan Vercel CLI: vercel dev.'
$body += Numbered 'Buat .env.local untuk secret lokal dan jangan commit file tersebut.'
$body += Para 'Berkas penting' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Table @('Berkas', 'Kegunaan') @(
    @('index.html', 'Struktur halaman dan modal'),
    @('style.css', 'Tampilan responsif'),
    @('script.js', 'Logika aplikasi dan konfigurasi Supabase frontend'),
    @('access-control.js', 'Daftar izin per role'),
    @('api/', 'Fungsi Vercel untuk Google dan API MySQL lama'),
    @('supabase-setup.sql', 'Setup awal tabel, bucket, dan policy Supabase'),
    @('penduduk-setup.sql', 'Setup tabel data penduduk'),
    @('audit-log-setup.sql', 'Setup tabel audit log'),
    @('fix-*.sql', 'Perbaikan policy/schema cache bila dibutuhkan'),
    @('tests/', 'Tes otomatis'),
    @('GOOGLE_SHEETS_SETUP.md', 'Detail konfigurasi integrasi Google')
) @(3000, 6000)

$body += Para '5. Konfigurasi deployment' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Supabase' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Numbered 'Buat/pilih project Supabase.'
$body += Numbered 'Jalankan supabase-setup.sql lewat SQL Editor. Jalankan penduduk-setup.sql dan audit-log-setup.sql bila tabel belum ada.'
$body += Numbered 'Pastikan bucket Storage bernama documents tersedia.'
$body += Numbered 'Ubah SUPABASE_URL dan SUPABASE_ANON_KEY di script.js bila project dipindahkan.'
$body += Numbered 'Tambahkan SUPABASE_URL dan SUPABASE_ANON_KEY di environment Vercel untuk endpoint sinkronisasi.'
$body += Para 'Anon key memang ditujukan untuk frontend, tetapi keamanan tetap bergantung pada Row Level Security (RLS). Jangan pernah menaruh Supabase service_role key di script.js.' -Italic -color '9C2F24'

$body += Para 'Environment variables Vercel' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Table @('Nama', 'Dipakai untuk', 'Rahasia?') @(
    @('SUPABASE_URL', 'Endpoint sync data penduduk', 'Tidak'),
    @('SUPABASE_ANON_KEY', 'Akses Supabase sesuai RLS', 'Bukan secret, tetapi tetap kelola dengan benar'),
    @('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'Autentikasi Sheets/Drive', 'Tidak sensitif sendiri'),
    @('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'Autentikasi service account', 'YA - sangat rahasia'),
    @('GOOGLE_SHEETS_SPREADSHEET_ID', 'Spreadsheet tujuan', 'Terbatas'),
    @('GOOGLE_DRIVE_FOLDER_ID', 'Folder ekspor Drive', 'Terbatas'),
    @('DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL', 'API MySQL lama di api/documents, api/users, api/login', 'DB_PASSWORD rahasia')
) @(3100, 3900, 2000)
$body += Para 'Setelah environment variable diubah, lakukan redeploy. Untuk private key, simpan nilai lengkap termasuk BEGIN/END PRIVATE KEY dan karakter baris baru sesuai format Vercel.'

$body += Para 'Deploy Vercel' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Numbered 'Push perubahan yang sudah diuji ke GitHub.'
$body += Numbered 'Di Vercel, import repository Website-Arsip-V2 atau gunakan project yang sudah ada.'
$body += Numbered 'Periksa environment variables untuk Production/Preview sesuai kebutuhan.'
$body += Numbered 'Deploy, lalu uji login, upload/preview/download dokumen, operasi data, dan endpoint Google.'
$body += Numbered 'Periksa Functions/Logs jika ada error.'
$body += Para 'Catatan arsitektur: frontend aktif memakai Supabase langsung. Beberapa endpoint api/login, api/documents, dan api/users masih memakai MySQL dan tampak sebagai jalur lama. Jangan menghapusnya sebelum memastikan tidak ada deployment/klien lain yang masih menggunakannya.' -Italic

$body += Para '6. Google Sheets dan Google Drive' 'Heading1' -Bold -color '1B4332' -size 28
$body += Numbered 'Buat project di Google Cloud dan aktifkan Google Sheets API serta Google Drive API.'
$body += Numbered 'Buat service account dan key JSON. Masukkan email serta private key ke environment Vercel.'
$body += Numbered 'Share spreadsheet dan folder Drive kepada email service account sebagai Editor.'
$body += Numbered 'Isi GOOGLE_SHEETS_SPREADSHEET_ID dan GOOGLE_DRIVE_FOLDER_ID.'
$body += Numbered 'Redeploy dan uji /api/ping serta /api/check-google-sheets.'
$body += Para 'Rincian tambahan tersedia di GOOGLE_SHEETS_SETUP.md. Tombol sinkronisasi Google mungkin tidak ditampilkan pada antarmuka versi saat ini, tetapi endpoint integrasinya masih ada di folder api/.' -Italic

$body += Para '7. Backup dan pemulihan' 'Heading1' -Bold -color '1B4332' -size 28
$body += Bullet 'Sebelum perubahan besar, buat backup database Supabase dan ekspor data penduduk.'
$body += Bullet 'Backup bucket documents atau pastikan ada kebijakan retensi/salinan file.'
$body += Bullet 'Pastikan repository GitHub berisi commit stabil terakhir dan tag/release bila perlu.'
$body += Bullet 'Simpan daftar environment variable tanpa nilainya di dokumentasi; simpan nilai rahasia di vault.'
$body += Bullet 'Lakukan uji pemulihan berkala: pulihkan database/file ke lingkungan uji dan verifikasi website.'
$body += Para 'Prosedur cepat saat bermasalah' 'Heading2' -Bold -color '2D6A4F' -size 24
$body += Numbered 'Jangan menghapus data atau mengubah policy secara acak.'
$body += Numbered 'Catat waktu, akun, langkah, dan pesan error; ambil screenshot bila perlu.'
$body += Numbered 'Periksa Vercel Deployment/Functions Logs dan Supabase Logs.'
$body += Numbered 'Bandingkan dengan deployment/commit terakhir yang diketahui stabil.'
$body += Numbered 'Jika harus rollback, gunakan redeploy deployment stabil di Vercel; jangan memakai git reset --hard pada salinan kerja yang belum diamankan.'

$body += Para '8. Troubleshooting ringkas' 'Heading1' -Bold -color '1B4332' -size 28
$body += Table @('Gejala', 'Pemeriksaan/solusi') @(
    @('Login gagal/akun tidak ditemukan', 'Periksa tabel users, email, status Aktif, URL/key Supabase, dan policy RLS.'),
    @('Upload gagal karena bucket/RLS', 'Pastikan bucket documents dan policy benar; jalankan setup/fix SQL yang relevan di Supabase SQL Editor.'),
    @('Tabel penduduk tidak ditemukan/schema cache', 'Jalankan fix-penduduk-schema-cache.sql, tunggu 10-30 detik, lalu refresh.'),
    @('Import tanggal gagal', 'Gunakan YYYY-MM-DD atau DD/MM/YYYY dan buang nilai tanggal invalid.'),
    @('Google FUNCTION_INVOCATION_FAILED', 'Uji /api/ping, /api/check-google-sheets, env, sharing service account, lalu cek Vercel logs.'),
    @('Website 404', 'Pastikan root berisi index.html, repository/project benar, dan vercel.json terdeploy.'),
    @('Tampilan rusak', 'Periksa akses CDN Tailwind, Font Awesome, Supabase JS, xlsx-js-style, serta console browser.'),
    @('Perubahan tidak muncul', 'Pastikan commit sudah dipush, deployment selesai, lalu hard refresh/cache browser.')
) @(3200, 5800)

$body += Para '9. Risiko dan pekerjaan lanjutan prioritas' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'PENTING: jangan gunakan aplikasi untuk data penduduk sensitif secara produksi sebelum butir keamanan prioritas tinggi diselesaikan.' -Bold -color '9C2F24'
$body += Table @('Prioritas', 'Temuan', 'Tindakan yang disarankan') @(
    @('Sangat tinggi', 'Password pengguna tersimpan dan dibandingkan sebagai teks biasa di frontend/database.', 'Migrasikan ke Supabase Auth atau autentikasi server-side; hash password; paksa reset password.'),
    @('Sangat tinggi', 'Policy SQL memberi anon full access pada tabel penting; kontrol role di browser dapat dilewati.', 'Terapkan RLS berbasis pengguna terautentikasi dan role; batasi SELECT/INSERT/UPDATE/DELETE per kebutuhan.'),
    @('Sangat tinggi', 'Data penduduk/NIK berpotensi terbaca melalui anon key jika policy permisif.', 'Tutup akses publik, audit paparan, rotasi key bila perlu, dan lakukan penilaian perlindungan data.'),
    @('Tinggi', 'Bucket documents bersifat public dan policy anon permisif.', 'Gunakan bucket private dan signed URL; validasi tipe/ukuran file di server.'),
    @('Tinggi', 'Endpoint Google perlu autentikasi/otorisasi server-side.', 'Batasi endpoint agar hanya pengguna berizin yang dapat menjalankan sync/upload.'),
    @('Sedang', 'Frontend Supabase dan API MySQL lama hidup berdampingan.', 'Putuskan satu arsitektur, migrasikan jika perlu, lalu hapus jalur lama setelah audit pemakaian.'),
    @('Sedang', 'Library frontend dari CDN tanpa penguncian/integrity yang konsisten.', 'Bundel dependency atau pin versi dan gunakan Subresource Integrity jika tersedia.'),
    @('Sedang', 'Belum ada proses backup/monitoring tertulis dalam repo.', 'Tetapkan jadwal backup, owner alert, log retention, dan latihan restore.')
) @(1300, 3800, 3900)

$body += Para '10. Checklist serah-terima' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Akses dan kepemilikan' 'Heading2' -Bold -color '2D6A4F' -size 24
foreach ($item in @('[ ] Penerus menerima akses GitHub dengan role yang tepat.','[ ] Penerus menerima akses Vercel dan mengetahui URL produksi.','[ ] Penerus menerima akses Supabase dan memahami tabel serta Storage.','[ ] Penerus menerima akses Google Cloud, Spreadsheet, dan folder Drive.','[ ] Penerus menerima akses domain/DNS dan informasi perpanjangan.','[ ] MFA aktif; recovery code dan admin cadangan tersedia secara aman.')) { $body += Bullet $item }
$body += Para 'Validasi teknis bersama' 'Heading2' -Bold -color '2D6A4F' -size 24
foreach ($item in @('[ ] Clone repository, install dependency, dan pnpm test berhasil.','[ ] Login Admin dan Pengurus diuji.','[ ] Upload, preview, download, edit, dan hapus dokumen diuji sesuai role.','[ ] Filter, pencarian, import kecil, input manual, dan export data penduduk diuji.','[ ] Manajemen pengguna dan Audit Log diuji.','[ ] Endpoint/integrasi Google diuji bila dipakai.','[ ] Deployment percobaan dan cara membaca log diperagakan.','[ ] Backup terbaru tersedia dan proses restore dijelaskan.')) { $body += Bullet $item }
$body += Para 'Administrasi' 'Heading2' -Bold -color '2D6A4F' -size 24
foreach ($item in @('[ ] Semua placeholder [ISI ...] pada dokumen ini sudah dilengkapi.','[ ] Secret disimpan di password manager, bukan chat/email/dokumen Word.','[ ] Akun milik pengelola lama dinonaktifkan setelah transisi selesai.','[ ] Password/key yang pernah dibagikan dirotasi.','[ ] Daftar risiko keamanan telah diterima dan ada rencana perbaikan.','[ ] Nama, tanggal, dan persetujuan kedua pihak dicatat.')) { $body += Bullet $item }

$body += Para '11. Berita acara singkat' 'Heading1' -Bold -color '1B4332' -size 28
$body += Para 'Pada tanggal ____________________, pengelolaan Website Arsip Dokumen Plosodoyong diserahkan oleh ____________________ kepada ____________________. Akses, dokumentasi, backup, serta risiko yang tercantum telah dijelaskan dan diperiksa bersama.'
$body += Para '' -after 240
$body += Table @('Pihak yang menyerahkan', 'Pihak yang menerima') @(
    @('Nama: ____________________', 'Nama: ____________________'),
    @('Tanda tangan: ____________', 'Tanda tangan: ____________'),
    @('Tanggal: __________________', 'Tanggal: __________________')
) @(4500, 4500)

$body += Para 'Lampiran - nilai yang perlu dilengkapi' 'Heading1' -Bold -color '1B4332' -size 28
$body += Table @('Item', 'Nilai') @(
    @('URL website produksi', '____________________________________________'),
    @('Nama project Vercel', '____________________________________________'),
    @('URL Google Spreadsheet', '____________________________________________'),
    @('URL folder Google Drive', '____________________________________________'),
    @('Google Cloud project ID', '____________________________________________'),
    @('Provider dan akun domain', '____________________________________________'),
    @('Kontak admin utama', '____________________________________________'),
    @('Kontak admin cadangan', '____________________________________________'),
    @('Lokasi vault/password manager', '____________________________________________'),
    @('Tanggal backup terakhir', '____________________________________________')
) @(4000, 5000)

$sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="500" w:footer="500" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>'
$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + $body + $sect + '</w:body></w:document>'

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'
$rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
$docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'
$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:outlineLvl w:val="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style></w:styles>'
$numbering = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>'

[IO.File]::WriteAllText("$temp\[Content_Types].xml", $contentTypes, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$temp\_rels\.rels", $rels, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$temp\word\document.xml", $document, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$temp\word\styles.xml", $styles, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$temp\word\numbering.xml", $numbering, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$temp\word\_rels\document.xml.rels", $docRels, [Text.UTF8Encoding]::new($false))

Compress-Archive -Path "$temp\*" -DestinationPath $zip -Force
if (Test-Path $output) { Remove-Item -LiteralPath $output -Force }
Move-Item -LiteralPath $zip -Destination $output
Remove-Item -LiteralPath $temp -Recurse -Force
Write-Output $output
