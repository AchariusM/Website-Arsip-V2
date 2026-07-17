import test from 'node:test';
import assert from 'node:assert/strict';
import '../access-control.js';

const { hasPermission, normalizeRole } = globalThis.AppAccess;

test('role dinormalisasi tanpa memperhatikan kapital dan spasi', () => {
    assert.equal(normalizeRole(' Admin '), 'admin');
    assert.equal(normalizeRole('PENGURUS'), 'pengurus');
});

test('Admin memiliki seluruh izin pengelolaan penting', () => {
    const permissions = [
        'documents.create', 'documents.update', 'documents.delete',
        'penduduk.create', 'penduduk.import', 'penduduk.clear',
        'users.manage', 'audit.view'
    ];
    permissions.forEach(permission => assert.equal(hasPermission('Admin', permission), true));
});

test('Pengurus hanya dapat upload dokumen serta melihat dan export data', () => {
    assert.equal(hasPermission('Pengurus', 'documents.create'), true);
    assert.equal(hasPermission('Pengurus', 'documents.update'), false);
    assert.equal(hasPermission('Pengurus', 'documents.delete'), false);
    assert.equal(hasPermission('Pengurus', 'penduduk.view'), true);
    assert.equal(hasPermission('Pengurus', 'penduduk.export'), true);
    assert.equal(hasPermission('Pengurus', 'penduduk.import'), false);
    assert.equal(hasPermission('Pengurus', 'penduduk.clear'), false);
    assert.equal(hasPermission('Pengurus', 'users.manage'), false);
    assert.equal(hasPermission('Pengurus', 'audit.view'), false);
});

test('role yang tidak dikenal tidak memperoleh izin', () => {
    assert.equal(hasPermission('', 'documents.view'), false);
    assert.equal(hasPermission('Tamu', 'documents.view'), false);
});
