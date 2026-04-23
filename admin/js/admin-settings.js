// ==================== SETTINGS & UI ====================

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    document.getElementById('darkModeToggle') && (document.getElementById('darkModeToggle').checked = isDarkMode);
    AdminCore.showToast(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

function changeFontSize(size) {
    document.documentElement.style.fontSize = size + 'px';
    localStorage.setItem('fontSize', size);
}

function changePrimaryColor(color) {
    document.documentElement.style.setProperty('--primary-500', color);
    localStorage.setItem('primaryColor', color);
}

function setRefreshInterval(interval) {
    localStorage.setItem('refreshInterval', interval);
    if (window.refreshInterval) clearInterval(window.refreshInterval);
    const intervalMs = parseInt(interval);
    if (intervalMs > 0) {
        window.refreshInterval = setInterval(() => { if (typeof window.loadInitialData === 'function') window.loadInitialData(); }, intervalMs);
    }
    AdminCore.showToast('Auto-refresh updated', 'success');
}

function clearCache() {
    localStorage.removeItem('cachedProducts');
    AdminCore.showToast('Cache cleared', 'success');
    if (typeof window.loadInitialData === 'function') window.loadInitialData();
}

async function backupDatabase() {
    const supabase = AdminCore.getSupabase();
    AdminCore.showToast('Creating backup...', 'info');
    try {
        const [products, colors, sizes] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('product_colors').select('*'),
            supabase.from('product_sizes').select('*')
        ]);
        const backupData = { timestamp: new Date().toISOString(), products: products.data || [], colors: colors.data || [], sizes: sizes.data || [] };
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jmpotters-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        AdminCore.showToast('Backup created successfully', 'success');
    } catch (error) { AdminCore.showToast('Backup failed: ' + error.message, 'error'); }
}

function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default?')) return;
    localStorage.clear();
    location.reload();
}

function updateCategoryPaths() {
    const container = document.getElementById('categoryPaths');
    if (container) {
        let html = '{\n';
        for (const [category, path] of Object.entries(AdminCore.imageConfig.paths)) html += `  "${category}": "${path}",\n`;
        html = html.slice(0, -2) + '\n}';
        container.textContent = html;
    }
}

window.AdminSettings = {
    toggleDarkMode, changeFontSize, changePrimaryColor, setRefreshInterval, clearCache, backupDatabase, resetSettings, updateCategoryPaths
};