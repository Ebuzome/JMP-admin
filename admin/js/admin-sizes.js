// ==================== SIZE MANAGEMENT ====================

function openAddSizeModal() {
    const colorId = document.getElementById('colorSelector').value;
    if (!colorId) { AdminCore.showToast('Please select a color first', 'warning'); return; }
    document.getElementById('addSizeModal').style.display = 'flex';
    document.getElementById('sizeColorSelector').value = colorId;
    document.getElementById('newSizeValue').value = '';
    document.getElementById('newSizeStock').value = 0;
}

function closeAddSizeModal() { document.getElementById('addSizeModal').style.display = 'none'; }

async function saveNewSize() {
    const supabase = AdminCore.getSupabase();
    const productId = document.getElementById('productId').value;
    const colorId = document.getElementById('sizeColorSelector').value;
    const sizeValue = document.getElementById('newSizeValue').value.trim();
    const stockQuantity = parseInt(document.getElementById('newSizeStock').value) || 0;
    if (!productId || !colorId || !sizeValue) { AdminCore.showToast('Please fill all required fields', 'warning'); return; }
    try {
        const sizeData = { product_id: parseInt(productId), color_id: parseInt(colorId), size_value: sizeValue, stock_quantity: stockQuantity, is_available: stockQuantity > 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const { data } = await supabase.from('product_sizes').insert([sizeData]).select();
        if (data && data[0]) {
            const productSizes = AdminCore.productSizes();
            if (!productSizes[productId]) productSizes[productId] = {};
            if (!productSizes[productId][colorId]) productSizes[productId][colorId] = [];
            productSizes[productId][colorId].push(data[0]);
            AdminCore.setProductSizes(productSizes);
            window.currentEditingSizes = productSizes[productId] || {};
            window.AdminProducts.loadSizesForColor();
        }
        closeAddSizeModal();
        AdminCore.showToast('Size added successfully', 'success');
    } catch (error) { AdminCore.showToast('Failed to save size: ' + error.message, 'error'); }
}

window.AdminSizes = {
    openAddSizeModal, closeAddSizeModal, saveNewSize
};