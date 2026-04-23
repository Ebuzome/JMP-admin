// ==================== SIZE MANAGEMENT ====================

let currentEditingSizes = {};

async function loadSizesForProduct(productId) {
    try {
        currentEditingSizes = productSizes[productId] || {};
    } catch (error) {
        console.error('Error loading sizes:', error);
    }
}

function loadSizesForColor() {
    const colorId = document.getElementById('colorSelector').value;
    const productId = currentProductId;
    
    const sizes = currentEditingSizes[colorId] || [];
    const container = document.getElementById('sizesContainer');
    
    if (!container) return;
    
    if (!colorId) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-dark-text-muted">
                <i class="fas fa-shoe-prints mb-2" style="font-size: 2rem;"></i>
                <p>Select a color to manage sizes</p>
            </div>
        `;
        document.getElementById('sizeCount').textContent = '(Select a color)';
        return;
    }
    
    const colorSelector = document.getElementById('colorSelector');
    const colorName = colorSelector.options[colorSelector.selectedIndex].text;
    
    let html = '';
    const sizeMap = {};
    sizes.forEach(size => {
        if (size && size.size_value) sizeMap[size.size_value] = size;
    });
    
    commonSizes.forEach(size => {
        const sizeData = sizeMap[size];
        const stock = sizeData ? (sizeData.stock_quantity || 0) : 0;
        const isAvailable = sizeData ? (sizeData.is_available || false) : false;
        const sizeId = sizeData ? sizeData.id : null;
        
        html += `
            <div class="size-item" data-size="${size}" data-size-id="${sizeId || ''}">
                <div class="size-label">Size</div>
                <div class="size-value">${size}</div>
                <input type="number" class="size-stock-input" value="${stock}" 
                       data-color-id="${colorId}" data-size="${size}"
                       placeholder="0" min="0"
                       onchange="window.AdminSizes.updateSizeStock(this, ${colorId}, '${size}')">
                <div class="text-xs ${stock > 0 ? 'text-green-600' : 'text-gray-600'} mt-1">
                    Stock: ${stock}
                </div>
                <div class="flex items-center justify-center mt-1">
                    <input type="checkbox" ${isAvailable ? 'checked' : ''} 
                           onchange="window.AdminSizes.toggleSizeAvailability(this, ${colorId}, '${size}')"
                           class="mr-1">
                    <span class="text-xs">Available</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('sizeCount').textContent = `(${commonSizes.length} sizes for ${escapeHtml(colorName)})`;
}

function openAddSizeModal() {
    const colorId = document.getElementById('colorSelector').value;
    if (!colorId) {
        showToast('Please select a color first', 'warning');
        return;
    }
    
    document.getElementById('addSizeModal').style.display = 'flex';
    document.getElementById('sizeColorSelector').value = colorId;
    document.getElementById('newSizeValue').value = '';
    document.getElementById('newSizeStock').value = 0;
}

function closeAddSizeModal() {
    document.getElementById('addSizeModal').style.display = 'none';
}

async function saveNewSize() {
    const productId = document.getElementById('productId').value;
    const colorId = document.getElementById('sizeColorSelector').value;
    const sizeValue = document.getElementById('newSizeValue').value.trim();
    const stockQuantity = parseInt(document.getElementById('newSizeStock').value) || 0;
    
    if (!productId || !colorId || !sizeValue) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        const sizeData = {
            product_id: parseInt(productId),
            color_id: parseInt(colorId),
            size_value: sizeValue,
            stock_quantity: stockQuantity,
            is_available: stockQuantity > 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase.from('product_sizes').insert([sizeData]).select();
        if (error) throw error;
        
        if (!productSizes[productId]) productSizes[productId] = {};
        if (!productSizes[productId][colorId]) productSizes[productId][colorId] = [];
        productSizes[productId][colorId].push(data[0]);
        
        if (!currentEditingSizes[colorId]) currentEditingSizes[colorId] = [];
        currentEditingSizes[colorId].push(data[0]);
        
        loadSizesForColor();
        closeAddSizeModal();
        showToast('Size added successfully', 'success');
    } catch (error) {
        console.error('Error saving size:', error);
        showToast('Failed to save size: ' + error.message, 'error');
    }
}

async function updateSizeStock(input, colorId, sizeValue) {
    const productId = currentProductId;
    const stockQuantity = parseInt(input.value) || 0;
    
    try {
        const sizes = currentEditingSizes[colorId] || [];
        const existingSize = sizes.find(s => s && s.size_value === sizeValue);
        
        if (existingSize) {
            const { error } = await supabase
                .from('product_sizes')
                .update({
                    stock_quantity: stockQuantity,
                    is_available: stockQuantity > 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSize.id);
            
            if (error) throw error;
            
            existingSize.stock_quantity = stockQuantity;
            existingSize.is_available = stockQuantity > 0;
            
            if (productSizes[productId] && productSizes[productId][colorId]) {
                const sizeIndex = productSizes[productId][colorId].findIndex(s => s.id === existingSize.id);
                if (sizeIndex !== -1) productSizes[productId][colorId][sizeIndex] = existingSize;
            }
            
            showToast('Stock updated successfully', 'success');
        } else {
            const sizeData = {
                product_id: parseInt(productId),
                color_id: parseInt(colorId),
                size_value: sizeValue,
                stock_quantity: stockQuantity,
                is_available: stockQuantity > 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase.from('product_sizes').insert([sizeData]).select();
            if (error) throw error;
            
            if (!productSizes[productId]) productSizes[productId] = {};
            if (!productSizes[productId][colorId]) productSizes[productId][colorId] = [];
            productSizes[productId][colorId].push(data[0]);
            
            if (!currentEditingSizes[colorId]) currentEditingSizes[colorId] = [];
            currentEditingSizes[colorId].push(data[0]);
            
            showToast('Size added successfully', 'success');
        }
        
        const stockElement = input.parentElement.querySelector('.text-xs');
        if (stockElement) {
            stockElement.textContent = `Stock: ${stockQuantity}`;
            stockElement.className = `text-xs ${stockQuantity > 0 ? 'text-green-600' : 'text-gray-600'} mt-1`;
        }
    } catch (error) {
        console.error('Error updating size stock:', error);
        showToast('Failed to update stock: ' + error.message, 'error');
    }
}

async function toggleSizeAvailability(checkbox, colorId, sizeValue) {
    const productId = currentProductId;
    const isAvailable = checkbox.checked;
    
    try {
        const sizes = currentEditingSizes[colorId] || [];
        const existingSize = sizes.find(s => s && s.size_value === sizeValue);
        
        if (existingSize) {
            const { error } = await supabase
                .from('product_sizes')
                .update({
                    is_available: isAvailable,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSize.id);
            
            if (error) throw error;
            existingSize.is_available = isAvailable;
            showToast('Availability updated', 'success');
        }
    } catch (error) {
        console.error('Error updating availability:', error);
        showToast('Failed to update availability: ' + error.message, 'error');
        checkbox.checked = !isAvailable;
    }
}

// ==================== EXPORTS ====================
window.AdminSizes = {
    loadSizesForProduct,
    loadSizesForColor,
    openAddSizeModal,
    closeAddSizeModal,
    saveNewSize,
    updateSizeStock,
    toggleSizeAvailability,
    currentEditingSizes: () => currentEditingSizes
};
