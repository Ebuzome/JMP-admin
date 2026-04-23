// ==================== COLOR MANAGEMENT ====================

let currentEditingColors = [];
let selectedColorIds = [];

function populateColorPickerGrid() {
    const container = document.getElementById('colorPickerGrid');
    if (!container) return;
    let html = '';
    AdminCore.colorDatabaseData.forEach(color => {
        const isCombination = color.codes.length > 1;
        const gradient = isCombination ? `linear-gradient(135deg, ${color.codes.join(', ')})` : color.codes[0];
        html += `<button type="button" class="color-option-btn" style="background: ${gradient}" data-color-name="${color.name}" data-color-codes="${color.codes.join('+')}" onclick="window.AdminColors.selectColor('${color.name}', '${color.codes.join('+')}')"></button>`;
    });
    container.innerHTML = html;
}

function searchColors(query) {
    const container = document.getElementById('colorOptions');
    if (!container) return;
    if (!query.trim()) { container.style.display = 'none'; return; }
    const searchTerm = query.toLowerCase();
    const results = AdminCore.colorDatabaseData.filter(color => color.name.toLowerCase().includes(searchTerm)).slice(0, 10);
    if (results.length === 0) { container.style.display = 'none'; return; }
    let html = '';
    results.forEach(color => {
        const isCombination = color.codes.length > 1;
        html += `<div class="color-option" onclick="window.AdminColors.selectColorFromSearch('${color.name}', '${color.codes.join('+')}')">${isCombination ? `<div class="color-combination">${color.codes.map(code => `<div class="color-swatch" style="background: ${code}"></div>`).join('')}</div>` : `<div class="color-swatch" style="background: ${color.codes[0]}"></div>`}<span>${color.name}</span></div>`;
    });
    container.innerHTML = html;
    container.style.display = 'block';
}

function selectColorFromSearch(colorName, colorCodes) {
    document.getElementById('newColorName').value = colorName;
    document.getElementById('newColorCode').value = colorCodes;
    selectedColorIds = [colorName];
    updateSelectedColors();
    document.getElementById('colorOptions').style.display = 'none';
}

function selectColor(colorName, colorCodes) {
    if (!selectedColorIds.includes(colorName)) { selectedColorIds.push(colorName); updateSelectedColors(); }
    const currentCodes = document.getElementById('newColorCode').value.split('+').filter(c => c.trim());
    const newCodes = colorCodes.split('+');
    const allCodes = [...new Set([...currentCodes, ...newCodes])];
    document.getElementById('newColorCode').value = allCodes.join(' + ');
    const currentName = document.getElementById('newColorName').value;
    if (!currentName.includes(colorName)) { document.getElementById('newColorName').value = currentName ? currentName + ' + ' + colorName : colorName; }
}

function updateSelectedColors() {
    const container = document.getElementById('selectedColors');
    if (!container) return;
    let html = '';
    selectedColorIds.forEach(colorName => {
        const color = AdminCore.colorDatabase()[colorName.toLowerCase()];
        if (color) {
            const isCombination = color.codes.length > 1;
            const gradient = isCombination ? `linear-gradient(135deg, ${color.codes.join(', ')})` : color.codes[0];
            html += `<div class="flex items-center gap-1 px-2 py-1 rounded bg-gray-100"><div class="w-4 h-4 rounded" style="background: ${gradient}"></div><span class="text-xs">${color.name}</span><button type="button" onclick="window.AdminColors.removeSelectedColor('${colorName}')" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-xs"></i></button></div>`;
        }
    });
    container.innerHTML = html;
}

function removeSelectedColor(colorName) {
    selectedColorIds = selectedColorIds.filter(id => id !== colorName);
    updateSelectedColors();
    const currentCodes = document.getElementById('newColorCode').value.split('+').filter(c => c.trim());
    const color = AdminCore.colorDatabase()[colorName.toLowerCase()];
    if (color) {
        const newCodes = currentCodes.filter(code => !color.codes.includes(code));
        document.getElementById('newColorCode').value = newCodes.join(' + ');
    }
    const currentName = document.getElementById('newColorName').value;
    const names = currentName.split(' + ').filter(name => name.trim() !== colorName);
    document.getElementById('newColorName').value = names.join(' + ');
}

function openAddColorModal() {
    document.getElementById('addColorModal').style.display = 'flex';
    document.getElementById('newColorName').value = '';
    document.getElementById('newColorCode').value = '';
    selectedColorIds = [];
    updateSelectedColors();
    document.getElementById('isDefaultColor').checked = true;
}

function closeAddColorModal() { document.getElementById('addColorModal').style.display = 'none'; }

async function saveNewColor() {
    const supabase = AdminCore.getSupabase();
    const productId = document.getElementById('productId').value;
    if (!productId) { AdminCore.showToast('Please save the product first', 'warning'); return; }
    const colorName = document.getElementById('newColorName').value.trim();
    const colorCode = document.getElementById('newColorCode').value.trim();
    const isDefault = document.getElementById('isDefaultColor').checked;
    if (!colorName || !colorCode) { AdminCore.showToast('Please enter color name and code', 'warning'); return; }
    try {
        const colorData = { product_id: parseInt(productId), color_name: colorName, color_code: colorCode, is_default: isDefault, sort_order: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const { data } = await supabase.from('product_colors').insert([colorData]).select();
        if (data && data[0]) {
            const productColors = AdminCore.productColors();
            if (!productColors[productId]) productColors[productId] = [];
            productColors[productId].push(data[0]);
            AdminCore.setProductColors(productColors);
            await window.AdminProducts.loadColorsForProduct(productId);
        }
        closeAddColorModal();
        AdminCore.showToast('Color added successfully', 'success');
    } catch (error) { AdminCore.showToast('Failed to save color: ' + error.message, 'error'); }
}

async function editColor(colorId) {
    const productId = document.getElementById('productId').value;
    const productColors = AdminCore.productColors();
    const color = (productColors[productId] || []).find(c => c.id == colorId);
    if (!color) return;
    document.getElementById('newColorName').value = color.color_name;
    document.getElementById('newColorCode').value = color.color_code;
    document.getElementById('isDefaultColor').checked = color.is_default;
    const colorCodes = color.color_code.split('+').map(c => c.trim());
    selectedColorIds = colorCodes;
    updateSelectedColors();
    document.getElementById('addColorModal').style.display = 'flex';
}

async function deleteColor(colorId) {
    if (!confirm('Are you sure you want to delete this color? All associated sizes will also be deleted.')) return;
    const supabase = AdminCore.getSupabase();
    try {
        await supabase.from('product_sizes').delete().eq('color_id', colorId);
        await supabase.from('product_colors').delete().eq('id', colorId);
        const productId = document.getElementById('productId').value;
        const productColors = AdminCore.productColors();
        productColors[productId] = (productColors[productId] || []).filter(c => c.id != colorId);
        AdminCore.setProductColors(productColors);
        await window.AdminProducts.loadColorsForProduct(productId);
        AdminCore.showToast('Color deleted successfully', 'success');
    } catch (error) { AdminCore.showToast('Failed to delete color: ' + error.message, 'error'); }
}

window.AdminColors = {
    populateColorPickerGrid, searchColors, selectColorFromSearch, selectColor,
    updateSelectedColors, removeSelectedColor, openAddColorModal, closeAddColorModal,
    saveNewColor, editColor, deleteColor
};