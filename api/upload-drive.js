import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

// Vercel: matikan body parser bawaan supaya kita bisa terima file (multipart/form-data)
export const config = {
  api: { bodyParser: false }
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // Maksimum 10MB
    const [, files] = await form.parse(req);
    const uploaded = files.file?.[0];
    if (!uploaded) return res.status(400).json({ error: 'File tidak ditemukan' });

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!serviceAccountEmail || !serviceAccountPrivateKey || !driveFolderId) {
      return res.status(500).json({
        error: 'Konfigurasi Google Drive belum lengkap. Pastikan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, dan GOOGLE_DRIVE_FOLDER_ID sudah diisi.'
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const created = await drive.files.create({
      requestBody: {
        name: uploaded.originalFilename,
        parents: [driveFolderId],
      },
      media: {
        mimeType: uploaded.mimetype,
        body: fs.createReadStream(uploaded.filepath),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    // Jadikan file bisa diakses siapa saja yang punya link
    await drive.permissions.create({
      fileId: created.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    res.status(200).json({
      file_id: created.data.id,
      file_url: created.data.webViewLink,
      download_url: created.data.webContentLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Gagal upload ke Google Drive' });
  }
}
