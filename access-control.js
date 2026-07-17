(function (global) {
    const ROLE_PERMISSIONS = Object.freeze({
        admin: Object.freeze([
            'documents.view', 'documents.create', 'documents.update', 'documents.delete',
            'penduduk.view', 'penduduk.export', 'penduduk.create', 'penduduk.import', 'penduduk.clear',
            'users.manage', 'audit.view'
        ]),
        pengurus: Object.freeze([
            'documents.view', 'documents.create',
            'penduduk.view', 'penduduk.export'
        ])
    });

    function normalizeRole(role) {
        return String(role || '').trim().toLowerCase();
    }

    function hasPermission(role, permission) {
        const permissions = ROLE_PERMISSIONS[normalizeRole(role)] || [];
        return permissions.includes(permission);
    }

    global.AppAccess = Object.freeze({ ROLE_PERMISSIONS, normalizeRole, hasPermission });
})(typeof window !== 'undefined' ? window : globalThis);
