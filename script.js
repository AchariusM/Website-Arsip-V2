// ==================== KONFIGURASI SUPABASE ====================
// Ganti dua baris di bawah ini dengan milik Anda (Project Settings -> API)
const SUPABASE_URL = 'https://yjmlbytfsxgsjhvmoyvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbWxieXRmc3hnc2podm1veXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTMwMzAsImV4cCI6MjA5OTUyOTAzMH0.uxJMqH5_7Xga5_iFed0v-NnLr3Q4FrM7eo0hs56YFpQ';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let deleteCallback = null;
let selectedFile = null;
let documents = [];
let users = [];
let docPage = 1;
const docPerPage = 8;
let globalSearchQuery = '';
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
const MAX_UPLOAD_LABEL = '4MB';
const STORAGE_BUCKET = 'documents';

// ==================== UTILITAS ====================
function formatDate(s) {
    if (!s) return '-';
    const b = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const d = new Date(s);
    return isNaN(d) ? s : d.getDate() + ' ' + b[d.getMonth()] + ' ' + d.getFullYear();
}
function formatFileSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}
function getFileIcon(t) {
    if (!t) return '<i class="fas fa-file" style="color:#9CA3AF;"></i>';
    if (t.includes('pdf')) return '<i class="fas fa-file-pdf" style="color:#DC2626;"></i>';
    if (t.includes('word') || t.includes('doc')) return '<i class="fas fa-file-word" style="color:#2563EB;"></i>';
    if (t.includes('sheet') || t.includes('xls')) return '<i class="fas fa-file-excel" style="color:#059669;"></i>';
    if (t.includes('presentation') || t.includes('ppt')) return '<i class="fas fa-file-powerpoint" style="color:#D97706;"></i>';
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return '<i class="fas fa-file-image" style="color:#7C3AED;"></i>';
    return '<i class="fas fa-file" style="color:#9CA3AF;"></i>';
}
function getInitials(n) { if (!n) return '??'; const p = n.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase(); }
function getAvatarColor(n) { const c = ['#1B4332','#2D6A4F','#40916C','#065F46','#064E3B','#1E3A2F']; let h = 0; for (let i = 0; i < (n||'').length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return c[Math.abs(h) % c.length]; }
function getUploaderName(id) { if (!id) return 'Sistem'; const u = users.find(x => x.id === id); return u ? u.nama : '-'; }
function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function sanitizeFileName(name) {
    return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}
function getUploadErrorMessage(error) {
    const msg = (error && error.message) ? error.message : 'Upload gagal.';
    if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')) {
        return 'Policy database belum aktif. Jalankan fix-rls-policies.sql di Supabase SQL Editor.';
    }
    if (msg.toLowerCase().includes('bucket')) {
        return 'Bucket Supabase Storage "documents" belum siap. Jalankan supabase-setup.sql di Supabase SQL Editor.';
    }
    if (msg.includes("Failed to execute 'json'") || msg.includes('Unexpected end of JSON input')) {
        return 'Respons storage kosong. Jalankan supabase-setup.sql di Supabase SQL Editor untuk membuat bucket dan policy upload.';
    }
    return msg;
}
async function uploadFileToStorage(file) {
    const path = Date.now() + '-' + sanitizeFileName(file.name);
    const url = SUPABASE_URL + '/storage/v1/object/' + STORAGE_BUCKET + '/' + encodeURIComponent(path);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': file.type || 'application/octet-stream',
            'Cache-Control': '3600',
            'x-upsert': 'false'
        },
        body: file
    });
    const text = await response.text();
    if (!response.ok) {
        let message = text || ('HTTP ' + response.status);
        try {
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || message;
        } catch (e) {}
        throw new Error(message);
    }
    return {
        path,
        publicUrl: SUPABASE_URL + '/storage/v1/object/public/' + STORAGE_BUCKET + '/' + encodeURIComponent(path)
    };
}

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    t.innerHTML = '<i class="fas ' + (icons[type]||icons.info) + '"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3000);
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function animateNumber(el, target) {
    const dur = 700, start = parseInt(el.textContent) || 0, diff = target - start;
    if (diff === 0) { el.textContent = target; return; }
    const st = performance.now();
    function step(time) { const p = Math.min((time - st) / dur, 1); el.textContent = Math.round(start + diff * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
}

// ==================== AUTH ====================
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    const err = document.getElementById('loginError');
    if (!email || !password) { err.classList.remove('hidden'); err.querySelector('span').textContent = 'Email dan kata sandi harus diisi.'; return; }

    const { data, error } = await sb
        .from('users')
        .select('id, nama, email, password, role, status')
        .ilike('email', email)
        .limit(1);

    if (error) { err.classList.remove('hidden'); err.querySelector('span').textContent = 'Gagal terhubung ke database: ' + error.message; return; }
    if (!data || data.length === 0) {
        err.classList.remove('hidden');
        err.querySelector('span').textContent = 'Akun tidak ditemukan. Jalankan supabase-setup.sql di Supabase SQL Editor.';
        return;
    }
    if ((data[0].password || '').trim() !== password) {
        err.classList.remove('hidden');
        err.querySelector('span').textContent = 'Kata sandi salah. Untuk akun demo gunakan admin123 atau pengurus123.';
        return;
    }
    if (data[0].status === 'Nonaktif') { err.classList.remove('hidden'); err.querySelector('span').textContent = 'Akun nonaktif.'; return; }

    err.classList.add('hidden');
    currentUser = {
        id: data[0].id,
        nama: data[0].nama,
        email: data[0].email,
        role: data[0].role,
        status: data[0].status
    };
    document.getElementById('headerAvatar').textContent = getInitials(currentUser.nama);
    document.getElementById('headerName').textContent = currentUser.nama;
    document.getElementById('dropdownName').textContent = currentUser.nama;
    document.getElementById('dropdownRole').textContent = currentUser.role;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    await loadAllData();
    showPage('dashboard');
}
function handleLogout() {
    currentUser = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
    document.getElementById('profileDropdown').classList.add('hidden');
}
function toggleProfileMenu() { document.getElementById('profileDropdown').classList.toggle('hidden'); }
document.addEventListener('click', function(e) {
    const dd = document.getElementById('profileDropdown'), btn = document.getElementById('profileBtn');
    if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) dd.classList.add('hidden');
});
document.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) handleLogin(); });

// ==================== MUAT DATA ====================
async function loadAllData() {
    const [docsRes, usersRes] = await Promise.all([
        sb.from('documents').select('*').order('created_at', { ascending: false }),
        sb.from('users').select('*').order('id', { ascending: true })
    ]);
    if (docsRes.error) showToast(docsRes.error.message, 'error'); else documents = docsRes.data;
    if (usersRes.error) showToast(usersRes.error.message, 'error'); else users = usersRes.data;
}

// ==================== NAVIGASI ====================
function showPage(page) {
    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
    const t = document.getElementById('page-' + page);
    if (t) { t.classList.remove('hidden'); t.classList.remove('animate-fade'); void t.offsetWidth; t.classList.add('animate-fade'); }
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    if (page === 'dashboard') renderDashboard();
    else if (page === 'dokumen') { docPage = 1; renderDocuments(); }
    else if (page === 'pengguna') renderUsers();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    if (currentUser) document.getElementById('welcomeText').textContent = 'Selamat Datang, ' + currentUser.nama;
    animateNumber(document.getElementById('statDocs'), documents.length);
    const recent = [...documents].slice(0, 6);
    let h = '<table class="data-table"><thead><tr><th>Dokumen</th><th class="hide-mobile">Kategori</th><th>Tanggal</th><th class="hide-mobile">Pengunggah</th></tr></thead><tbody>';
    if (recent.length === 0) {
        h += '<tr><td colspan="4" class="text-center py-8" style="color:var(--text-muted);">Belum ada dokumen</td></tr>';
    } else {
        recent.forEach(d => {
            h += '<tr><td><div class="flex items-center gap-3"><div class="file-icon">' + getFileIcon(d.file_type) + '</div><span class="font-500 text-sm">' + escapeHtml(d.judul) + '</span></div></td>';
            h += '<td class="hide-mobile"><span class="badge badge-kategori">' + escapeHtml(d.kategori) + '</span></td>';
            h += '<td class="text-sm" style="color:var(--text-muted);">' + formatDate(d.tanggal) + '</td>';
            h += '<td class="text-sm hide-mobile" style="color:var(--text-muted);">' + escapeHtml(getUploaderName(d.uploaded_by)) + '</td></tr>';
        });
    }
    h += '</tbody></table>';
    document.getElementById('recentDocsTable').innerHTML = h;
}

// ==================== DOKUMEN ====================
function renderDocuments() {
    const q = (globalSearchQuery || '').toLowerCase().trim();
    let filtered = documents.filter(d => {
        if (!q) return true;
        return d.judul.toLowerCase().includes(q) || d.kategori.toLowerCase().includes(q) || (d.deskripsi||'').toLowerCase().includes(q) || formatDate(d.tanggal).toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / docPerPage));
    if (docPage > totalPages) docPage = totalPages;
    const start = (docPage - 1) * docPerPage;
    const paged = filtered.slice(start, start + docPerPage);

    let h = '<table class="data-table"><thead><tr><th style="width:40px;">No</th><th>Dokumen</th><th class="hide-mobile">Kategori</th><th>Tanggal</th><th class="hide-mobile">Pengunggah</th><th class="hide-mobile">Ukuran</th><th style="width:160px;">Aksi</th></tr></thead><tbody>';
    if (paged.length === 0) {
        h += '<tr><td colspan="7" class="text-center py-12"><div class="empty-state"><i class="fas fa-folder-open block"></i><p class="text-sm">Tidak ada dokumen ditemukan</p></div></td></tr>';
    } else {
        paged.forEach((d, i) => {
            h += '<tr><td class="text-sm" style="color:var(--text-muted);">' + (start + i + 1) + '</td>';
            h += '<td><div class="flex items-center gap-3"><div class="file-icon">' + getFileIcon(d.file_type) + '</div><div class="min-w-0"><p class="font-500 text-sm truncate max-w-xs">' + escapeHtml(d.judul) + '</p></div></div></td>';
            h += '<td class="hide-mobile"><span class="badge badge-kategori">' + escapeHtml(d.kategori) + '</span></td>';
            h += '<td class="text-sm" style="color:var(--text-muted);">' + formatDate(d.tanggal) + '</td>';
            h += '<td class="text-sm hide-mobile" style="color:var(--text-muted);">' + escapeHtml(getUploaderName(d.uploaded_by)) + '</td>';
            h += '<td class="text-sm hide-mobile" style="color:var(--text-muted);">' + formatFileSize(d.file_size) + '</td>';
            h += '<td><div class="crud-actions">';
            if (d.file_url) {
                h += '<button class="crud-btn view" title="Lihat" onclick="previewDocument(' + d.id + ')"><i class="fas fa-eye"></i></button>';
                h += '<button class="crud-btn download" title="Unduh" onclick="downloadDocument(' + d.id + ')"><i class="fas fa-download"></i></button>';
            }
            h += '<button class="crud-btn edit" title="Edit" onclick="openEditDocModal(' + d.id + ')"><i class="fas fa-pen"></i></button>';
            h += '<button class="crud-btn delete" title="Hapus" onclick="confirmDeleteDoc(' + d.id + ')"><i class="fas fa-trash-alt"></i></button>';
            h += '</div></td></tr>';
        });
    }
    h += '</tbody></table>';
    document.getElementById('docsTableContainer').innerHTML = h;

    let ph = '<span class="text-sm" style="color:var(--text-muted);">' + (paged.length === 0 ? 0 : start + 1) + '-' + (start + paged.length) + ' dari ' + filtered.length + '</span><div class="flex gap-1.5">';
    ph += '<button class="page-btn" onclick="goToPage(' + (docPage - 1) + ')" ' + (docPage <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left text-xs"></i></button>';
    for (let p = 1; p <= totalPages; p++) {
        if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - docPage) > 1) { if (p === 2 || p === totalPages - 1) ph += '<span class="page-btn" style="border:none;cursor:default;">...</span>'; continue; }
        ph += '<button class="page-btn ' + (p === docPage ? 'active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
    }
    ph += '<button class="page-btn" onclick="goToPage(' + (docPage + 1) + ')" ' + (docPage >= totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right text-xs"></i></button></div>';
    document.getElementById('docsPagination').innerHTML = ph;
}
function goToPage(p) { const tp = Math.max(1, Math.ceil(documents.length / docPerPage)); if (p < 1 || p > tp) return; docPage = p; renderDocuments(); }

function openUploadModal() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadJudul').value = '';
    document.getElementById('uploadKategori').value = '';
    document.getElementById('uploadTanggal').value = todayStr();
    document.getElementById('uploadDeskripsi').value = '';
    const z = document.getElementById('uploadZone'); z.classList.remove('has-file');
    document.getElementById('uploadZoneContent').innerHTML = '<i class="fas fa-cloud-upload-alt text-3xl mb-3" style="color:var(--accent);"></i><p class="text-sm font-600 mb-1">Klik atau seret file ke sini</p><p class="text-xs" style="color:var(--text-muted);">PDF, DOCX, XLSX, PPTX, JPG, PNG (Maks. ' + MAX_UPLOAD_LABEL + ')</p>';
    openModal('modalUpload');
}
function handleDragOver(e) { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag-over'); }
function handleDragLeave(e) { e.preventDefault(); document.getElementById('uploadZone').classList.remove('drag-over'); }
function handleDrop(e) { e.preventDefault(); document.getElementById('uploadZone').classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]); }
function handleFileSelect(e) { if (e.target.files.length > 0) processFile(e.target.files[0]); }

function processFile(file) {
    const allowed = ['.pdf','.docx','.doc','.xlsx','.xls','.pptx','.ppt','.jpg','.jpeg','.png'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { showToast('Tipe file tidak diizinkan.', 'error'); return; }
    if (file.size > MAX_UPLOAD_SIZE) { showToast('Ukuran file melebihi ' + MAX_UPLOAD_LABEL + '.', 'error'); return; }
    selectedFile = file;
    document.getElementById('uploadZone').classList.add('has-file');
    document.getElementById('uploadZoneContent').innerHTML = '<i class="fas fa-file-check text-3xl mb-3" style="color:var(--primary-light);"></i><p class="text-sm font-600 mb-1">' + escapeHtml(file.name) + '</p><p class="text-xs" style="color:var(--text-muted);">' + formatFileSize(file.size) + ' &mdash; Klik untuk ganti</p>';
    if (!document.getElementById('uploadJudul').value.trim()) document.getElementById('uploadJudul').value = file.name.replace(/\.[^/.]+$/, '');
}

async function handleUpload() {
    try {
        const judul = document.getElementById('uploadJudul').value.trim();
        const kategori = document.getElementById('uploadKategori').value.trim();
        const tanggal = document.getElementById('uploadTanggal').value;
        const deskripsi = document.getElementById('uploadDeskripsi').value.trim();
        if (!judul) { showToast('Judul dokumen wajib diisi.', 'error'); return; }
        if (!kategori) { showToast('Kategori wajib diisi.', 'error'); return; }
        if (!tanggal) { showToast('Tanggal dokumen wajib diisi.', 'error'); return; }

        let file_url = null, file_name = null, file_type = null, file_size = null;

        if (selectedFile) {
            const uploaded = await uploadFileToStorage(selectedFile);
            file_url = uploaded.publicUrl;
            file_name = selectedFile.name;
            file_type = selectedFile.type;
            file_size = selectedFile.size;
        }

        const { error } = await sb.from('documents').insert({
            judul, deskripsi, kategori, tanggal,
            uploaded_by: currentUser ? currentUser.id : null,
            file_name, file_url, file_type, file_size
        });
        if (error) { showToast(error.message, 'error'); return; }

        closeModal('modalUpload');
        showToast('Dokumen "' + judul + '" berhasil diunggah.');
        await loadAllData();
        if (!document.getElementById('page-dokumen').classList.contains('hidden')) renderDocuments();
        renderDashboard();
    } catch (e) {
        showToast('Gagal upload file: ' + getUploadErrorMessage(e), 'error');
    }
}

function openEditDocModal(id) {
    const d = documents.find(x => x.id === id); if (!d) return;
    document.getElementById('editDocId').value = id;
    document.getElementById('editDocJudul').value = d.judul;
    document.getElementById('editDocKategori').value = d.kategori;
    document.getElementById('editDocTanggal').value = d.tanggal ? d.tanggal.split('T')[0] : '';
    document.getElementById('editDocDeskripsi').value = d.deskripsi || '';
    openModal('modalEditDoc');
}
async function handleEditDoc() {
    const id = parseInt(document.getElementById('editDocId').value);
    const judul = document.getElementById('editDocJudul').value.trim();
    const kategori = document.getElementById('editDocKategori').value.trim();
    if (!judul) { showToast('Judul wajib diisi.', 'error'); return; }
    if (!kategori) { showToast('Kategori wajib diisi.', 'error'); return; }
    const { error } = await sb.from('documents').update({
        judul, kategori,
        tanggal: document.getElementById('editDocTanggal').value,
        deskripsi: document.getElementById('editDocDeskripsi').value.trim()
    }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    closeModal('modalEditDoc'); showToast('Dokumen berhasil diperbarui.');
    await loadAllData(); renderDocuments(); renderDashboard();
}

function confirmDeleteDoc(id) {
    const d = documents.find(x => x.id === id); if (!d) return;
    document.getElementById('deleteMessage').textContent = 'Apakah Anda yakin ingin menghapus dokumen "' + d.judul + '"?';
    deleteCallback = async function() {
        const { error } = await sb.from('documents').delete().eq('id', id);
        if (error) { showToast(error.message, 'error'); return; }
        closeModal('modalDelete'); showToast('Dokumen berhasil dihapus.', 'success');
        await loadAllData(); renderDocuments(); renderDashboard();
    };
    openModal('modalDelete');
}
function executeDelete() { if (typeof deleteCallback === 'function') deleteCallback(); deleteCallback = null; }

function previewDocument(id) {
    const d = documents.find(x => x.id === id);
    if (!d || !d.file_url) { showToast('File tidak tersedia.', 'error'); return; }
    document.getElementById('previewTitle').textContent = d.judul;
    const c = document.getElementById('previewContent');
    if ((d.file_type || '').includes('image') && (d.download_url || d.file_url)) {
        c.innerHTML = '<img src="' + (d.download_url || d.file_url) + '" style="display:block;margin:0 auto;max-width:100%;max-height:70vh;object-fit:contain;border-radius:8px;">';
    } else if ((d.file_type || '').includes('pdf') && (d.download_url || d.file_url)) {
        c.innerHTML = '<iframe src="' + (d.download_url || d.file_url) + '" style="width:100%;height:70vh;border:none;border-radius:8px;"></iframe>';
    } else if (d.file_id && d.file_url && d.file_url.includes('drive.google.com')) {
        c.innerHTML = '<iframe src="https://drive.google.com/file/d/' + d.file_id + '/preview" style="width:100%;height:70vh;border:none;border-radius:8px;"></iframe>';
    } else {
        c.innerHTML = '<div class="text-center py-8"><i class="fas fa-file-alt text-4xl mb-4" style="color:var(--text-muted);opacity:0.3;"></i><p class="text-sm mb-4" style="color:var(--text-muted);">Preview tidak tersedia untuk tipe file ini.</p><button onclick="downloadDocument(' + id + ')" class="btn btn-primary"><i class="fas fa-download"></i> Unduh File</button></div>';
    }
    openModal('modalPreview');
}
function downloadDocument(id) {
    const d = documents.find(x => x.id === id);
    if (!d || !d.file_url) { showToast('File tidak tersedia.', 'error'); return; }
    const link = d.download_url || d.file_url;
    window.open(link, '_blank');
    showToast('Membuka "' + (d.file_name || 'file') + '"...', 'info');
}

// ==================== PENGGUNA ====================
function renderUsers() {
    let h = '<table class="data-table"><thead><tr><th style="width:40px;">No</th><th>Pengguna</th><th>Email</th><th>Role</th><th>Status</th><th style="width:100px;">Aksi</th></tr></thead><tbody>';
    if (users.length === 0) {
        h += '<tr><td colspan="6" class="text-center py-12"><div class="empty-state"><i class="fas fa-users block"></i><p class="text-sm">Belum ada pengguna</p></div></td></tr>';
    } else {
        users.forEach((u, i) => {
            const isA = (u.role || '').toLowerCase() === 'admin';
            h += '<tr><td class="text-sm" style="color:var(--text-muted);">' + (i + 1) + '</td>';
            h += '<td><div class="flex items-center gap-3"><div class="avatar text-xs text-white" style="background:' + getAvatarColor(u.nama) + ';">' + getInitials(u.nama) + '</div><span class="font-500 text-sm">' + escapeHtml(u.nama) + '</span></div></td>';
            h += '<td class="text-sm" style="color:var(--text-muted);">' + escapeHtml(u.email) + '</td>';
            h += '<td><span class="badge ' + (isA ? 'badge-admin' : 'badge-pengurus') + '">' + u.role + '</span></td>';
            h += '<td><div class="flex items-center gap-2"><span class="status-dot" style="background:' + (u.status === 'Aktif' ? '#059669' : '#9CA3AF') + ';"></span><span class="text-sm">' + (u.status || 'Aktif') + '</span></div></td>';
            h += '<td><div class="crud-actions">';
            h += '<button class="crud-btn edit" title="Edit" onclick="openEditUserModal(' + u.id + ')"><i class="fas fa-pen"></i></button>';
            if (!isA) h += '<button class="crud-btn delete" title="Hapus" onclick="confirmDeleteUser(' + u.id + ')"><i class="fas fa-trash-alt"></i></button>';
            h += '</div></td></tr>';
        });
    }
    h += '</tbody></table>';
    document.getElementById('usersTableContainer').innerHTML = h;
}

function openAddUserModal() {
    document.getElementById('addUserName').value = ''; document.getElementById('addUserEmail').value = '';
    document.getElementById('addUserPassword').value = '';
    document.getElementById('addUserRole').value = 'Pengurus'; document.getElementById('addUserStatus').value = 'Aktif';
    openModal('modalAddUser');
}
async function handleAddUser() {
    const nama = document.getElementById('addUserName').value.trim();
    const email = document.getElementById('addUserEmail').value.trim();
    const password = document.getElementById('addUserPassword').value;
    const role = document.getElementById('addUserRole').value;
    const status = document.getElementById('addUserStatus').value;
    if (!nama) { showToast('Nama wajib diisi.', 'error'); return; }
    if (!email || !email.includes('@')) { showToast('Email tidak valid.', 'error'); return; }
    if (!password) { showToast('Kata sandi wajib diisi.', 'error'); return; }

    const { data: dupe } = await sb.from('users').select('id').eq('email', email);
    if (dupe && dupe.length > 0) { showToast('Email sudah terdaftar.', 'error'); return; }

    const { error } = await sb.from('users').insert({ nama, email, password, role, status });
    if (error) { showToast(error.message, 'error'); return; }
    closeModal('modalAddUser'); showToast('Pengurus "' + nama + '" berhasil ditambahkan.');
    await loadAllData(); renderUsers(); renderDashboard();
}
function openEditUserModal(id) {
    const u = users.find(x => x.id === id); if (!u) return;
    document.getElementById('editUserId').value = id; document.getElementById('editUserName').value = u.nama;
    document.getElementById('editUserEmail').value = u.email; document.getElementById('editUserRole').value = u.role;
    document.getElementById('editUserStatus').value = u.status || 'Aktif'; openModal('modalEditUser');
}
async function handleEditUser() {
    const id = parseInt(document.getElementById('editUserId').value);
    const nama = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    if (!nama) { showToast('Nama wajib diisi.', 'error'); return; }
    if (!email || !email.includes('@')) { showToast('Email tidak valid.', 'error'); return; }

    const { data: dupe } = await sb.from('users').select('id').eq('email', email).neq('id', id);
    if (dupe && dupe.length > 0) { showToast('Email sudah digunakan.', 'error'); return; }

    const { error } = await sb.from('users').update({
        nama, email,
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value
    }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    closeModal('modalEditUser'); showToast('Data pengguna berhasil diperbarui.');
    await loadAllData(); renderUsers(); renderDashboard();
}
function confirmDeleteUser(id) {
    const u = users.find(x => x.id === id); if (!u) return;
    if ((u.role || '').toLowerCase() === 'admin') { showToast('Akun Admin tidak dapat dihapus.', 'error'); return; }
    document.getElementById('deleteMessage').textContent = 'Apakah Anda yakin ingin menghapus pengguna "' + u.nama + '"?';
    deleteCallback = async function() {
        const { error } = await sb.from('users').delete().eq('id', id);
        if (error) { showToast(error.message, 'error'); return; }
        closeModal('modalDelete'); showToast('Pengguna "' + u.nama + '" berhasil dihapus.', 'success');
        await loadAllData(); renderUsers(); renderDashboard();
    };
    openModal('modalDelete');
} 

function handleGlobalSearch(q) {
    globalSearchQuery = q;
    if (!document.getElementById('page-dokumen').classList.contains('hidden')) { docPage = 1; renderDocuments(); }
    else if (q.trim().length > 0) { showPage('dokumen'); }
}

// ==================== INIT ====================
document.getElementById('footerYear').textContent = new Date().getFullYear();
