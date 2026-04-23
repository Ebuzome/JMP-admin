// ==================== COLOR MANAGEMENT ====================

let currentEditingColors = [];
let selectedColorIds = [];

function populateColorPickerGrid() {
    const container = document.getElementById('colorPickerGrid');
    if (!container) return;
    
    let html = '';
    colorDatabaseData.forEach((color, index) => {
        const isCombination = color.codes.length > 1;
        const gradient = isCombination ? `linear-gradient(135deg, ${color.codes.join(', ')})` : color.codes[0];
        
        html += `
            <button type="button" class="color-option-btn" 
                    style="background: ${gradient}"
                    data-color-name="${color.name}"
                    data-color-codes="${color.codes.join('+')}"
                    onclick="window.AdminColors.selectColor('${color.name}', '${color.codes.join('+')}')">
            </button>
        `;
    });
    
    container.innerHTML = html;
}

function searchColors(query) {
    const container = document.getElementById('colorOptions');
    if (!container) return;
    
    if (!query.trim()) {
        container.style.display = 'none';
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = colorDatabaseData.filter(color => 
        color.name.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    
    if (results.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    let html = '';
    results.forEach(color => {
        const isCombination = color.codes.length > 1;
        html += `
            <div class="color-option" onclick="window.AdminColors.selectColorFromSearch('${color.name}', '${color.codes.join('+')}')">
                ${isCombination ? `
                    <div class="color-combination">
                        ${color.codes.map(code => `<div class="color-swatch" style="background: ${code}"></div>`).join('')}
                    </div>
                ` : `
                    <div class="color-swatch" style="background: ${color.codes[0]}"></div>
                `}
                <span>${color.name}</span>
            </div>
        `;
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
    if (!selectedColorIds.includes(colorName)) {
        selectedColorIds.push(colorName);
        updateSelectedColors();
    }
    
    const currentCodes = document.getElementById('newColorCode').value.split('+').filter(c => c.trim());
    const newCodes = colorCodes.split('+');
    const allCodes = [...new Set([...currentCodes, ...newCodes])];
    document.getElementById('newColorCode').value = allCodes.join(' + ');
    
    const currentName = document.getElementById('newColorName').value;
    if (!currentName.includes(colorName)) {
        const newName = currentName ? currentName + ' + ' + colorName : colorName;
        document.getElementById('newColorName').value = newName;
    }
}

function updateSelectedColors() {
    const container = document.getElementById('selectedColors');
    if (!container) return;
    
    let html = '';
    selectedColorIds.forEach(colorName => {
        const color = colorDatabase[colorName.toLowerCase()];
        if (color) {
            const isCombination = color.codes.length > 1;
            const gradient = isCombination ? `linear-gradient(135deg, ${color.codes.join(', ')})` : color.codes[0];
            
            html += `
                <div class="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-dark-surface-2">
                    <div class="w-4 h-4 rounded" style="background: ${gradient}"></div>
                    <span class="text-xs">${color.name}</span>
                    <button type="button" onclick="window.AdminColors.removeSelectedColor('${colorName}')" class="text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function removeSelectedColor(colorName) {
    selectedColorIds = selectedColorIds.filter(id => id !== colorName);
    updateSelectedColors();
    
    const currentCodes = document.getElementById('newColorCode').value.split('+').filter(c => c.trim());
    const color = colorDatabase[colorName.toLowerCase()];
    if (color) {
        const codesToRemove = color.codes;
        const newCodes = currentCodes.filter(code => !codesToRemove.includes(code));
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

function closeAddColorModal() {
    document.getElementById('addColorModal').style.display = 'none';
}

async function saveNewColor() {
    const productId = document.getElementById('productId').value;
    if (!productId) {
        showToast('Please save the product first', 'warning');
        return;
    }
    
    const colorName = document.getElementById('newColorName').value.trim();
    const colorCode = document.getElementById('newColorCode').value.trim();
    const isDefault = document.getElementById('isDefaultColor').checked;
    
    if (!colorName || !colorCode) {
        showToast('Please enter color name and code', 'warning');
        return;
    }
    
    try {
        const colorData = {
            product_id: parseInt(productId),
            color_name: colorName,
            color_code: colorCode,
            is_default: isDefault,
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase.from('product_colors').insert([colorData]).select();
        if (error) throw error;
        
        if (!productColors[productId]) productColors[productId] = [];
        productColors[productId].push(data[0]);
        
        await window.loadColorsForProduct(productId);
        closeAddColorModal();
        showToast('Color added successfully', 'success');
    } catch (error) {
        console.error('Error saving color:', error);
        showToast('Failed to save color: ' + error.message, 'error');
    }
}

async function editColor(colorId) {
    const color = currentEditingColors.find(c => c.id == colorId);
    if (!color) return;
    
    document.getElementById('newColorName').value = color.color_name;
    document.getElementById('newColorCode').value = color.color_code;
    document.getElementById('isDefaultColor').checked = color.is_default;
    
    const colorCodes = color.color_code.split('+').map(c => c.trim());
    selectedColorIds = colorCodes;
    updateSelectedColors();
    
    document.getElementById('addColorModal').dataset.colorId = colorId;
    document.getElementById('addColorModal').querySelector('.modal-title').textContent = 'Edit Color';
    document.getElementById('addColorModal').style.display = 'flex';
}

async function deleteColor(colorId) {
    if (!confirm('Are you sure you want to delete this color? All associated sizes will also be deleted.')) {
        return;
    }
    
    try {
        const { error: sizesError } = await supabase.from('product_sizes').delete().eq('color_id', colorId);
        if (sizesError) throw sizesError;
        
        const { error: colorError } = await supabase.from('product_colors').delete().eq('id', colorId);
        if (colorError) throw colorError;
        
        const productId = document.getElementById('productId').value;
        productColors[productId] = productColors[productId].filter(c => c.id != colorId);
        if (productSizes[productId]) delete productSizes[productId][colorId];
        if (currentEditingSizes && currentEditingSizes[colorId]) delete currentEditingSizes[colorId];
        
        await window.loadColorsForProduct(productId);
        if (typeof window.loadSizesForColor === 'function') window.loadSizesForColor();
        showToast('Color deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting color:', error);
        showToast('Failed to delete color: ' + error.message, 'error');
    }
}

async function loadColorsForProduct(productId) {
    try {
        const colors = productColors[productId] || [];
        currentEditingColors = colors;
        
        const container = document.getElementById('colorsContainer');
        if (!container) return;
        
        let html = '';
        
        if (colors.length > 0) {
            colors.forEach(color => {
                const colorCodes = color.color_code ? color.color_code.split('+') : ['#ccc'];
                const isCombination = colorCodes.length > 1;
                
                html += `
                    <div class="color-item" data-color-id="${color.id}">
                        <div class="color-preview">
                            ${isCombination ? `
                                <div class="color-combination-preview">
                                    ${colorCodes.map(code => `<div class="color-slice" style="background: ${code.trim()}"></div>`).join('')}
                                </div>
                            ` : `
                                <div style="background: ${colorCodes[0]}; width: 100%; height: 100%; border-radius: var(--radius-sm);"></div>
                            `}
                        </div>
                        <div class="text-sm font-semibold mb-1">${escapeHtml(color.color_name)}</div>
                        <div class="text-xs text-gray-600 dark:text-dark-text-muted mb-2">${color.color_code}</div>
                        <div class="color-actions">
                            <button class="btn btn-sm btn-secondary flex-1" onclick="window.AdminColors.editColor(${color.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="window.AdminColors.deleteColor(${color.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
            <div class="color-item" style="border-style: dashed; cursor: pointer; text-align: center;"
                 onclick="window.AdminColors.openAddColorModal()">
                <div class="color-preview" style="background: var(--gray-200); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-plus text-gray-400 dark:text-dark-text-muted" style="font-size: 1.5rem;"></i>
                </div>
                <div class="text-sm text-gray-600 dark:text-dark-text-muted mt-2">Add Color</div>
            </div>
        `;
        
        container.innerHTML = html;
        document.getElementById('colorCount').textContent = `(${colors.length} colors)`;
        
        const colorSelector = document.getElementById('colorSelector');
        if (colorSelector) {
            let options = '<option value="">Select a color</option>';
            colors.forEach(color => {
                options += `<option value="${color.id}">${escapeHtml(color.color_name)}</option>`;
            });
            colorSelector.innerHTML = options;
        }
        
        const sizeColorSelector = document.getElementById('sizeColorSelector');
        if (sizeColorSelector) {
            let options = '<option value="">Select a color</option>';
            colors.forEach(color => {
                options += `<option value="${color.id}">${escapeHtml(color.color_name)}</option>`;
            });
            sizeColorSelector.innerHTML = options;
        }
    } catch (error) {
        console.error('Error loading colors:', error);
    }
}

// ==================== EXPORTS ====================
window.AdminColors = {
    populateColorPickerGrid,
    searchColors,
    selectColorFromSearch,
    selectColor,
    updateSelectedColors,
    removeSelectedColor,
    openAddColorModal,
    closeAddColorModal,
    saveNewColor,
    editColor,
    deleteColor,
    loadColorsForProduct,
    currentEditingColors: () => currentEditingColors
};
