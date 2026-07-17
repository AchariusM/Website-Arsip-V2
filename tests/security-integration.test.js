import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const sql = await readFile(new URL('../audit-log-setup.sql', import.meta.url), 'utf8');

test('aksi berisiko memiliki pemeriksaan izin', () => {
    const requiredGuards = [
        "requirePermission('documents.update'",
        "requirePermission('documents.delete'",
        "requirePermission('penduduk.create'",
        "requirePermission('penduduk.import'",
        "requirePermission('penduduk.clear'",
        "requirePermission('users.manage'"
    ];
    requiredGuards.forEach(guard => assert.match(script, new RegExp(guard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
});

test('menu khusus Admin tersembunyi secara default', () => {
    assert.match(html, /id="userManagementNav"[^>]*hidden[^>]*display:none !important/);
    assert.match(html, /id="auditLogNav"[^>]*hidden[^>]*display:none !important/);
});

test('audit log tidak menyediakan policy update atau delete', () => {
    assert.doesNotMatch(sql, /for\s+(update|delete)/i);
    assert.match(sql, /for\s+insert/i);
    assert.match(sql, /for\s+select/i);
});
