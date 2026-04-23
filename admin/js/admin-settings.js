// ==================== SETTINGS & UI ====================

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    document.getElementById('darkModeToggle').checked = isDarkMode;
    showToast(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

function changeFontSize(size) {
    document.documentElement.style.fontSize = size + 'px';
    localStorage.setItem('fontSize', size);
}

function changePrimaryColor(color) {
    document.documentElement.style.setProperty('--primary-500', color);
    document.documentElement.style.setProperty('--primary-600', darkenColor(color, 20));
    localStorage.setItem('primaryColor', color);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function changeButtonStyle(style) {
    localStorage.setItem('buttonStyle', style);
    const styleData = {
        rounded: { borderRadius: '0.5rem', padding: '0.625rem 1rem' },
        square: { borderRadius: '0.25rem', padding: '0.625rem 1rem' },
        pill: { borderRadius: '9999px', padding: '0.625rem 1.5rem' }
    };
    const selectedStyle = styleData[style] || styleData.rounded;
    document.documentElement.style.setProperty('--radius', selectedStyle.borderRadius);
    showToast(`Button style changed to ${style}`, 'success');
}

function changeIconLibrary(library) {
    localStorage.setItem('iconLibrary', library);
    showToast(`Icon library changed to ${library}`, 'info');
}

function changeAnimationSpeed(speed) {
    localStorage.setItem('animationSpeed', speed);
    const root = document.documentElement;
    switch(speed) {
        case 'fast':
            root.style.setProperty('--transition-fast', '100ms cubic-bezier(0.4, 0, 0.2, 1)');
            root.style.setProperty('--transition', '150ms cubic-bezier(0.4, 0, 0.2, 1)');
            break;
        case 'slow':
            root.style.setProperty('--transition-fast', '300ms cubic-bezier(0.4, 0, 0.2, 1)');
            root.style.setProperty('--transition', '500ms cubic-bezier(0.4, 0, 0.2, 1)');
            break;
        case 'none':
            root.style.setProperty('--transition-fast', '0ms');
            root.style.setProperty('--transition', '0ms');
            break;
        default:
            root.style.setProperty('--transition-fast', '150ms cubic-bezier(0.4, 0, 0.2, 1)');
            root.style.setProperty('--transition', '250ms cubic-bezier(0.4, 0, 0.2, 1)');
    }
    showToast(`Animation speed set to ${speed}`, 'success');
}

function changeGridDensity(density) {
    localStorage.setItem('gridDensity', density);
    const root = document.documentElement;
    switch(density) {
        case 'compact':
            root.style.setProperty('--space-4', '0.75rem');
            root.style.setProperty('--space-6', '1rem');
            break;
        case 'spacious':
            root.style.setProperty('--space-4', '1.25rem');
            root.style.setProperty('--space-6', '2rem');
            break;
        default:
            root.style.setProperty('--space-4', '1rem');
            root.style.setProperty('--space-6', '1.5rem');
    }
    showToast(`Grid density set to ${density}`, 'success');
}

function setSyncInterval(interval) {
    localStorage.setItem('syncInterval', interval);
    showToast(`Sync interval set to ${interval}`, 'success');
}

function toggleDeveloperMode() {
    const enabled = document.getElementById('developerMode').checked;
    localStorage.setItem('developerMode', enabled);
    showToast(enabled ? 'Developer mode enabled' : 'Developer mode disabled', 'info');
}

function setRefreshInterval(interval) {
    localStorage.setItem('refreshInterval', interval);
    if (refreshInterval) clearInterval(refreshInterval);
    const intervalMs = parseInt(interval);
    if (intervalMs > 0) {
        refreshInterval = setInterval(() => {
            if (typeof window.loadInitialData === 'function') {
                window.loadInitialData();
            }
            showToast('Data refreshed automatically', 'info');
        }, intervalMs);
    }
    showToast('Auto-refresh updated', 'success');
}

function toggleNotifications() {
    const enabled = document.getElementById('notificationsToggle').checked;
    localStorage.setItem('notifications', enabled);
    if (enabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    showToast(enabled ? 'Notifications enabled' : 'Notifications disabled', 'success');
}

async function testConnection() {
    showToast('Testing database connection...', 'info');
    try {
        const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
        if (error) throw error;
        document.getElementById('dbConnectionStatus').textContent = 'Connected';
        showToast('✅ Database connection successful!', 'success');
    } catch (error) {
        console.error('Connection test failed:', error);
        document.getElementById('dbConnectionStatus').textContent = 'Disconnected';
        showToast('❌ Connection failed: ' + error.message, 'error');
    }
}

function clearCache() {
    localStorage.removeItem('cachedProducts');
    localStorage.removeItem('cachedColors');
    localStorage.removeItem('cachedSizes');
    showToast('Cache cleared successfully', 'success');
    if (typeof window.loadInitialData === 'function') {
        window.loadInitialData();
    }
}

async function backupDatabase() {
    showToast('Creating backup...', 'info');
    try {
        const [products, colors, sizes] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('product_colors').select('*'),
            supabase.from('product_sizes').select('*')
        ]);
        
        const backupData = {
            timestamp: new Date().toISOString(),
            products: products.data || [],
            colors: colors.data || [],
            sizes: sizes.data || []
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `jmpotters-backup-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showToast('Backup created successfully', 'success');
    } catch (error) {
        console.error('Backup failed:', error);
        showToast('Backup failed: ' + error.message, 'error');
    }
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
        for (const [category, path] of Object.entries(imageConfig.paths)) {
            html += `  "${category}": "${path}",\n`;
        }
        html = html.slice(0, -2) + '\n}';
        container.textContent = html;
    }
}

// ==================== EXPORTS ====================
window.AdminSettings = {
    toggleDarkMode,
    changeFontSize,
    changePrimaryColor,
    changeButtonStyle,
    changeIconLibrary,
    changeAnimationSpeed,
    changeGridDensity,
    setSyncInterval,
    toggleDeveloperMode,
    setRefreshInterval,
    toggleNotifications,
    testConnection,
    clearCache,
    backupDatabase,
    resetSettings,
    updateCategoryPaths
};
