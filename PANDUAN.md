# Panduan Setup: Arsip Plosodoyong + MySQL di Vercel

## 1. Kenapa 404 muncul sebelumnya?
Vercel mencari `index.html` sebagai halaman utama. File Anda bernama `arsip.html`,
jadi domain root tidak menemukan apa-apa. Sudah diperbaiki: file sekarang bernama `index.html`.

## 2. Kenapa perlu folder /api?
Vercel adalah platform hosting **statis + serverless function**, bukan server yang
selalu menyala. Tidak bisa "menaruh" MySQL di dalam Vercel. Jadi arsitekturnya:

```
Browser  --->  Vercel (index.html, script.js, style.css)
                  |
                  v
            /api/*.js (serverless function, jalan sebentar tiap ada request)
                  |
                  v
            Database MySQL (di-hosting terpisah, contoh: Aiven / Railway / Clever Cloud)
```

`script.js` sekarang tidak lagi menyimpan data di array JavaScript — semua
data diambil/disimpan lewat `fetch()` ke `/api/documents` dan `/api/users`.

## 3. Siapkan database MySQL
Vercel tidak menyediakan MySQL sendiri, jadi pakai penyedia gratis, misalnya:
- **Railway** (railway.app) — gratis dengan limit
- **Aiven** (aiven.io) — ada free tier MySQL
- **Clever Cloud** (clever-cloud.com)

Setelah database dibuat, Anda akan dapat: host, port, username, password, nama database.
Jalankan isi file `schema.sql` di database tersebut (lewat phpMyAdmin bawaan provider,
atau `mysql -h HOST -u USER -p NAMA_DB < schema.sql`).

## 4. Struktur proyek
```
website-arsip/
├── index.html
├── script.js
├── style.css
├── vercel.json
├── package.json
├── schema.sql
├── .env.example
└── api/
    ├── _db.js
    ├── login.js
    ├── documents/
    │   ├── index.js      (GET semua, POST tambah)
    │   └── [id].js       (PUT edit, DELETE hapus)
    └── users/
        ├── index.js
        └── [id].js
```

## 5. Upload ke GitHub lalu deploy di Vercel
1. Push seluruh folder ini ke repository GitHub.
2. Di dashboard Vercel: **Add New Project** → pilih repo tersebut → Deploy.
3. **Sebelum** deploy selesai (atau setelahnya di Settings → Environment Variables),
   isi variabel berikut sesuai kredensial MySQL Anda:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DB_SSL` (isi `true` jika provider mewajibkan SSL, kebanyakan begitu)
4. Redeploy setelah environment variable diisi (Vercel tidak otomatis reload).

## 6. Login demo
Setelah `schema.sql` dijalankan, akun berikut sudah ada di database:
- `admin@plosodoyong.id` / `admin123` (Admin)
- `pengurus@plosodoyong.id` / `pengurus123` (Pengurus)

## 7. Batasan yang perlu Anda tahu
- **File fisik dokumen belum tersimpan permanen.** MySQL cocok untuk data
  seperti judul/kategori/tanggal, tapi *tidak* cocok untuk menyimpan file besar (PDF, DOCX, dll).
  Kolom `file_url` sekarang masih kosong saat upload. Untuk file sungguhan,
  tambahkan **Vercel Blob** atau **Cloudinary** (upload file ke sana, lalu simpan URL-nya
  ke kolom `file_url`) — beri tahu saya kalau mau saya bantu sambungkan.
- **Password disimpan polos (plain text)** di `schema.sql`/API demi kesederhanaan.
  Untuk produksi sungguhan, sebaiknya di-hash pakai `bcrypt` sebelum disimpan.
