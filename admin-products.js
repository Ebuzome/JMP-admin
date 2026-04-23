// ==================== PRODUCT MANAGEMENT ====================

async function loadProductColorsBatch() {
    try {
        const { data: colors } = await supabase
            .from('product_colors')
            .select('*')
            .order('product_id, color_name');
        
        if (colors) {
            productColors = {};
            colors.forEach(color => {
                if (!productColors[color.product_id]) productColors[color.product_id] = [];
                productColors[color.product_id].push(color);
            });
        }
        console.log(`✅ Loaded colors for ${Object.keys(productColors).length} products`);
    } catch (error) {
        console.error('Failed to load colors:', error);
    }
}

async function loadProductSizesBatch() {
    try {
        const { data: sizes } = await supabase
            .from('product_sizes')
            .select('*')
            .order('product_id, color_id, size_value');
        
        if (sizes) {
            productSizes = {};
            sizes.forEach(size => {
                if (!productSizes[size.product_id]) productSizes[size.product_id] = {};
                if (!productSizes[size.product_id][size.color_id]) productSizes[size.product_id][size.color_id] = [];
                productSizes[size.product_id][size.color_id].push(size);
            });
        }
        console.log(`✅ Loaded sizes for ${Object.keys(productSizes).length} products`);
    } catch (error) {
        console.error('Failed to load sizes:', error);
    }
}

function calculateProductTotalStock() {
    allProducts.forEach(product => {
        let totalStock = 0;
        const sizes = productSizes[product.id];
        if (sizes) {
            Object.values(sizes).forEach(colorSizes => {
                if (Array.isArray(colorSizes)) {
                    colorSizes.forEach(size => {
                        totalStock += size.stock_quantity || 0;
                    });
                }
            });
        }
        product.total_stock = totalStock;
    });
}

function updateProductCounts() {
    const total = allProducts.length;
    const lowStock = allProducts.filter(p => {
        if (p.total_stock !== undefined) return p.total_stock < 10 && p.total_stock > 0;
        return (p.stock || 0) < 10 && (p.stock || 0) > 0;
    }).length;
    const outOfStock = allProducts.filter(p => {
        if (p.total_stock !== undefined) return p.total_stock === 0;
        return (p.stock || 0) === 0;
    }).length;
    
    document.getElementById('productsCount').textContent = total;
    document.getElementById('productsCountDesktop').textContent = total;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('lowStockCountDesktop').textContent = lowStock;
    document.getElementById('lowStockCountStat').textContent = lowStock;
    document.getElementById('outOfStockCount').textContent = outOfStock;
    document.getElementById('totalProductsCount').textContent = total;
    
    // Inventory stats
    const totalStock = allProducts.reduce((sum, p) => sum + (p.total_stock !== undefined ? p.total_stock : (p.stock || 0)), 0);
    const inventoryValue = allProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.total_stock !== undefined ? p.total_stock : (p.stock || 0))), 0);
    document.getElementById('inventoryTotalStock').textContent = totalStock.toLocaleString();
    document.getElementById('inventoryLowStock').textContent = lowStock;
    document.getElementById('inventoryOutOfStock').textContent = outOfStock;
    document.getElementById('inventoryValue').textContent = '₦' + Math.round(inventoryValue).toLocaleString();
}

function renderProductCard(product) {
    const stock = product.total_stock !== undefined ? product.total_stock : (product.stock || 0);
    const stockClass = stock > 10 ? 'stock-high' : stock > 0 ? 'stock-medium' : 'stock-low';
    const stockText = stock > 10 ? `${stock} in stock` : stock > 0 ? `${stock} left` : 'Out of stock';
    const isFootwear = product.category?.slug?.includes('footwear') || product.product_modals?.[0]?.modal_type === 'footwear';
    const colors = productColors[product.id] || [];
    const sizes = productSizes[product.id] || {};
    const isActive = product.is_active !== false;
    const imageUrl = getProductImageUrl(product);
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${escapeHtml(product.name)}" class="product-image"
                     onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                ${!isActive ? `<div class="product-badge" style="background: var(--danger-500);"><i class="fas fa-ban"></i> Inactive</div>` : ''}
                ${stock === 0 ? `<div class="product-badge" style="background: var(--danger-600);"><i class="fas fa-times"></i> Out of Stock</div>` : ''}
            </div>
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <span class="product-category">${product.category?.name || 'Uncategorized'}</span>
                </div>
                <div class="product-price">₦${(product.price || 0).toLocaleString()}</div>
                <div class="product-meta">
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    <div class="text-xs ${isActive ? 'text-green-600' : 'text-red-600'}">
                        <i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
                ${colors.length > 0 ? `
                    <div class="product-variants">
                        ${colors.slice(0, 3).map(color => {
                            const colorSizes = sizes[color.id] || [];
                            const sizeCount = colorSizes.length;
                            const colorCodes = color.color_code ? color.color_code.split('+') : ['#ccc'];
                            return `
                                <span class="variant-tag">
                                    ${colorCodes.map(code => `<span class="color-dot" style="background: ${code.trim()}"></span>`).join('')}
                                    ${escapeHtml(color.color_name)}${sizeCount > 0 ? `(${sizeCount} sizes)` : ''}
                                </span>
                            `;
                        }).join('')}
                        ${colors.length > 3 ? `<span class="variant-tag">+${colors.length - 3} more</span>` : ''}
                    </div>
                ` : ''}
                <div class="product-actions">
                    <button class="btn btn-primary btn-sm flex-1" onclick="window.AdminProducts.editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <div class="status-dropdown">
                        <button class="btn btn-sm ${isActive ? 'btn-success' : 'btn-secondary'}" onclick="window.AdminProducts.toggleStatusDropdown(${product.id}, this)">
                            <i class="fas fa-power-off"></i>
                        </button>
                        <div class="status-dropdown-content" id="statusDropdown${product.id}">
                            <div class="status-option ${isActive ? 'active' : ''}" onclick="window.AdminProducts.activateProduct(${product.id})">
                                <i class="fas fa-check-circle"></i> Activate
                            </div>
                            <div class="status-option ${!isActive ? 'active' : ''}" onclick="window.AdminProducts.deactivateProduct(${product.id})">
                                <i class="fas fa-ban"></i> Deactivate
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="window.AdminProducts.duplicateProduct(${product.id})">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderRecentProducts() {
    const container = document.getElementById('recentProducts');
    if (!container) return;
    
    const recentProducts = allProducts.slice(0, 8);
    
    if (recentProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-box-open"></i></div>
                <h3 class="empty-title">No Products Yet</h3>
                <button class="btn btn-primary mt-4" onclick="window.AdminProducts.openAddProductModal()">
                    <i class="fas fa-plus"></i> Add First Product
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    recentProducts.forEach(product => {
        html += renderProductCard(product);
    });
    container.innerHTML = html;
}

function renderProductsPage() {
    const container = document.getElementById('allProducts');
    if (!container) return;
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    if (pageProducts.length === 0) {
        let message = '';
        switch (currentFilter) {
            case 'low_stock': message = 'No products with low stock'; break;
            case 'inactive': message = 'No inactive products'; break;
            case 'footwear': message = 'No footwear products'; break;
            default: message = 'No products found';
        }
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon"><i class="fas fa-search"></i></div>
                <h3 class="empty-title">${message}</h3>
                <button class="btn btn-primary mt-4" onclick="window.AdminProducts.openAddProductModal()">
                    <i class="fas fa-plus"></i> Add New Product
                </button>
            </div>
        `;
        document.getElementById('paginationContainer').style.display = 'none';
        return;
    }
    
    let html = '';
    pageProducts.forEach(product => {
        html += renderProductCard(product);
    });
    container.innerHTML = html;
    
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    
    document.getElementById('startRow').textContent = startIndex + 1;
    document.getElementById('endRow').textContent = Math.min(endIndex, totalProducts);
    document.getElementById('totalRows').textContent = totalProducts;
    
    document.getElementById('paginationContainer').style.display = totalProducts > productsPerPage ? 'flex' : 'none';
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

function filterProducts(filterType) {
    currentFilter = filterType;
    currentPage = 1;
    
    switch (filterType) {
        case 'footwear':
            filteredProducts = allProducts.filter(p => 
                p.category?.slug?.includes('footwear') || 
                p.product_modals?.[0]?.modal_type === 'footwear'
            );
            break;
        case 'low_stock':
            filteredProducts = allProducts.filter(p => {
                if (p.total_stock !== undefined) return p.total_stock < 10 && p.total_stock > 0;
                return (p.stock || 0) < 10 && (p.stock || 0) > 0;
            });
            break;
        case 'inactive':
            filteredProducts = allProducts.filter(p => !p.is_active);
            break;
        default:
            filteredProducts = [...allProducts];
    }
    
    // Apply category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && categoryFilter.value) {
        filteredProducts = filteredProducts.filter(p => p.category_id == categoryFilter.value);
    }
    
    // Apply search filter
    const searchInput = document.getElementById('productSearch');
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.description || '').toLowerCase().includes(searchTerm)
        );
    }
    
    renderProductsPage();
}

function nextPage() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderProductsPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderProductsPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function populateCategoryFilters() {
    const categorySelect = document.getElementById('categoryFilter');
    const productCategory = document.getElementById('productCategory');
    
    if (categorySelect) {
        let options = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const productCount = allProducts.filter(p => p.category_id === category.id).length;
            options += `<option value="${category.id}">${escapeHtml(category.name)} (${productCount})</option>`;
        });
        categorySelect.innerHTML = options;
        categorySelect.addEventListener('change', () => filterProducts(currentFilter));
    }
    
    if (productCategory) {
        let options = '<option value="">Select Category</option>';
        categories.forEach(category => {
            options += `<option value="${category.id}" data-slug="${category.slug}">${escapeHtml(category.name)}</option>`;
        });
        productCategory.innerHTML = options;
    }
    
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterProducts(currentFilter));
    }
}

function openAddProductModal() {
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productId').value = '';
    document.getElementById('isFootwear').value = 'false';
    document.getElementById('productForm').reset();
    document.getElementById('colorManagementSection').style.display = 'none';
    document.getElementById('sizeManagementSection').style.display = 'none';
    document.getElementById('colorsContainer').innerHTML = '';
    document.getElementById('sizesContainer').innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-shoe-prints mb-2" style="font-size: 2rem;"></i>
            <p>Select a color to manage sizes</p>
        </div>
    `;
    document.getElementById('imagePreviewContainer').style.display = 'none';
    openModal();
}

function onCategoryChange() {
    const categorySelect = document.getElementById('productCategory');
    const categoryId = categorySelect.value;
    const category = categories.find(c => c.id == categoryId);
    
    if (category && category.slug.includes('footwear')) {
        document.getElementById('isFootwear').value = 'true';
        document.getElementById('colorManagementSection').style.display = 'block';
        document.getElementById('sizeManagementSection').style.display = 'block';
    } else {
        document.getElementById('isFootwear').value = 'false';
        document.getElementById('colorManagementSection').style.display = 'none';
        document.getElementById('sizeManagementSection').style.display = 'none';
    }
    
    if (typeof window.updateImagePreview === 'function') {
        window.updateImagePreview();
    }
}

async function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    const isFootwear = product.category?.slug?.includes('footwear') || 
                      product.product_modals?.[0]?.modal_type === 'footwear';
    
    currentProductId = productId;
    
    document.getElementById('modalTitle').textContent = `Edit: ${product.name}`;
    document.getElementById('productId').value = product.id;
    document.getElementById('isFootwear').value = isFootwear;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('productDescription').value = product.description || '';
    
    const categorySelect = document.getElementById('productCategory');
    if (categorySelect) {
        categorySelect.value = product.category_id || '';
        onCategoryChange();
    }
    
    const imageUrl = product.image_url || '';
    const imageFilename = parseImageFilenameFromUrl(imageUrl);
    document.getElementById('productImageName').value = imageFilename;
    
    if (typeof window.updateImagePreview === 'function') {
        window.updateImagePreview();
    }
    
    if (isFootwear) {
        if (typeof window.loadColorsForProduct === 'function') {
            await window.loadColorsForProduct(productId);
        }
        if (typeof window.loadSizesForProduct === 'function') {
            await window.loadSizesForProduct(productId);
        }
    }
    
    openModal();
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
        
        await window.loadInitialData();
        showToast('Product deleted successfully', 'success');
    } catch (error) {
        showToast('Failed to delete product: ' + error.message, 'error');
    }
}

async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const isFootwear = document.getElementById('isFootwear').value === 'true';
    const isNew = !productId;
    
    const categoryId = document.getElementById('productCategory').value;
    const category = categories.find(c => c.id == categoryId);
    if (!category) {
        showToast('Please select a category', 'error');
        return;
    }
    
    const imageName = document.getElementById('productImageName').value.trim();
    if (!imageName) {
        showToast('Please enter an image filename', 'error');
        return;
    }
    
    const productData = {
        name: document.getElementById('productName').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        category_id: parseInt(categoryId),
        description: document.getElementById('productDescription').value.trim(),
        image_url: imageName,
        is_active: true,
        stock: 0,
        updated_at: new Date().toISOString()
    };
    
    if (isNew) {
        productData.created_at = new Date().toISOString();
    }
    
    if (!productData.name || productData.price <= 0) {
        showToast('Please fill all required fields correctly', 'warning');
        return;
    }
    
    try {
        let result;
        if (isNew) {
            const { data, error } = await supabase.from('products').insert([productData]).select();
            if (error) throw error;
            result = data[0];
            document.getElementById('productId').value = result.id;
            currentProductId = result.id;
        } else {
            const { data, error } = await supabase.from('products').update(productData).eq('id', productId).select();
            if (error) throw error;
            result = data[0];
        }
        
        await window.loadInitialData();
        showToast('✅ Product saved successfully!', 'success');
        setTimeout(() => closeModal(), 1500);
    } catch (error) {
        console.error('Save failed:', error);
        showToast('❌ Save failed: ' + error.message, 'error');
    }
}

function openModal() {
    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentProductId = null;
}

function saveAsDraft() {
    showToast('Draft saved (feature in development)', 'info');
}

async function testWrite() {
    showToast('Testing write permissions...', 'info');
    
    const testData = {
        name: 'Write Test ' + Date.now(),
        price: 999,
        stock: 9,
        category_id: 1,
        image_url: 'test-image.jpg',
        description: 'Database write test',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase.from('products').insert([testData]).select();
        if (error) throw error;
        showToast('✅ Write test successful!', 'success');
        await window.loadInitialData();
    } catch (error) {
        console.error('Write test failed:', error);
        showToast('❌ Write test failed: ' + error.message, 'error');
    }
}

let activeStatusDropdown = null;

function toggleStatusDropdown(productId, button) {
    if (activeStatusDropdown && activeStatusDropdown !== productId) {
        const prevDropdown = document.getElementById('statusDropdown' + activeStatusDropdown);
        if (prevDropdown) prevDropdown.classList.remove('show');
    }
    
    const dropdown = document.getElementById('statusDropdown' + productId);
    if (dropdown) {
        dropdown.classList.toggle('show');
        activeStatusDropdown = dropdown.classList.contains('show') ? productId : null;
    }
    
    document.addEventListener('click', function closeDropdown(e) {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            activeStatusDropdown = null;
            document.removeEventListener('click', closeDropdown);
        }
    });
}

async function activateProduct(productId) {
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', productId);
        if (error) throw error;
        
        const product = allProducts.find(p => p.id === productId);
        if (product) product.is_active = true;
        
        renderRecentProducts();
        renderProductsPage();
        showToast('Product activated successfully', 'success');
        
        const dropdown = document.getElementById('statusDropdown' + productId);
        if (dropdown) dropdown.classList.remove('show');
        activeStatusDropdown = null;
    } catch (error) {
        showToast('Failed to activate product: ' + error.message, 'error');
    }
}

async function deactivateProduct(productId) {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', productId);
        if (error) throw error;
        
        const product = allProducts.find(p => p.id === productId);
        if (product) product.is_active = false;
        
        renderRecentProducts();
        renderProductsPage();
        showToast('Product deactivated successfully', 'success');
        
        const dropdown = document.getElementById('statusDropdown' + productId);
        if (dropdown) dropdown.classList.remove('show');
        activeStatusDropdown = null;
    } catch (error) {
        showToast('Failed to deactivate product: ' + error.message, 'error');
    }
}

function duplicateProduct(productId) {
    showToast('Product duplication coming soon', 'info');
}

function updateImagePreview() {
    const categorySelect = document.getElementById('productCategory');
    const imageName = document.getElementById('productImageName').value;
    const previewContainer = document.getElementById('imagePreviewContainer');
    
    if (!categorySelect?.value || !imageName) {
        if (previewContainer) previewContainer.style.display = 'none';
        return;
    }
    
    const category = categories.find(c => c.id == categorySelect.value);
    if (!category) return;
    
    const imageUrl = buildCorrectImageUrl(imageName, category.slug);
    
    if (previewContainer) {
        const previewImg = document.getElementById('imagePreview');
        const placeholder = document.getElementById('imagePreviewPlaceholder');
        const pathInfo = document.getElementById('imagePathInfo');
        const statusInfo = document.getElementById('imageStatus');
        
        if (previewImg) {
            previewImg.src = imageUrl;
            previewImg.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (pathInfo) pathInfo.textContent = `Preview: ${imageName}`;
        if (statusInfo) statusInfo.textContent = `Will be saved as: ${imageName}`;
        
        previewContainer.style.display = 'block';
    }
}

// ==================== EXPORTS ====================
window.AdminProducts = {
    loadProductColorsBatch,
    loadProductSizesBatch,
    calculateProductTotalStock,
    updateProductCounts,
    renderProductCard,
    renderRecentProducts,
    renderProductsPage,
    filterProducts,
    nextPage,
    prevPage,
    populateCategoryFilters,
    openAddProductModal,
    onCategoryChange,
    editProduct,
    deleteProduct,
    saveProduct,
    openModal,
    closeModal,
    saveAsDraft,
    testWrite,
    toggleStatusDropdown,
    activateProduct,
    deactivateProduct,
    duplicateProduct,
    updateImagePreview,
    currentPage: () => currentPage,
    productsPerPage: () => productsPerPage,
    currentFilter: () => currentFilter
};
