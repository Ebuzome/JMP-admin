// ==================== ORDER MANAGEMENT ====================

let allOrders = [];
let filteredOrders = [];
let ordersCurrentPage = 1;
let ordersPerPage = 15;
let currentOrderStatusFilter = 'all';
let currentOrderSearch = '';

async function loadOrders() {
    console.log('📦 Loading orders...');
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        allOrders = orders || [];
        applyOrdersFilters();
        updateOrderStats();
        console.log(`✅ Loaded ${allOrders.length} orders`);
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

function applyOrdersFilters() {
    let filtered = [...allOrders];
    
    if (currentOrderStatusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === currentOrderStatusFilter);
    }
    
    if (currentOrderSearch) {
        const searchLower = currentOrderSearch.toLowerCase();
        filtered = filtered.filter(order => 
            order.order_number.toLowerCase().includes(searchLower) ||
            (order.full_name && order.full_name.toLowerCase().includes(searchLower)) ||
            (order.user_email && order.user_email.toLowerCase().includes(searchLower))
        );
    }
    
    filteredOrders = filtered;
    renderOrdersTable();
    updateOrdersPagination();
}

function updateOrderStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const processing = allOrders.filter(o => o.status === 'processing').length;
    const shipped = allOrders.filter(o => o.status === 'shipped').length;
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const revenue = allOrders.reduce((sum, o) => sum + (o.grand_total || o.total_amount || 0), 0);
    
    document.getElementById('totalOrdersCount').textContent = total;
    document.getElementById('pendingOrdersCount').textContent = pending;
    document.getElementById('processingOrdersCount').textContent = processing;
    document.getElementById('deliveredOrdersCount').textContent = delivered;
    document.getElementById('cancelledOrdersCount').textContent = cancelled;
    document.getElementById('totalRevenueStatOrders').textContent = '₦' + revenue.toLocaleString();
    document.getElementById('totalOrdersStat').textContent = total;
    document.getElementById('totalRevenueStat').textContent = '₦' + revenue.toLocaleString();
    document.getElementById('ordersCount').textContent = total;
    document.getElementById('ordersCountDesktop').textContent = total;
    document.getElementById('pendingOrders').textContent = pending;
}

function renderOrdersTable() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    const startIndex = (ordersCurrentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    if (pageOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-shopping-cart"></i></div>
                <h3 class="empty-title">No Orders Found</h3>
                <p class="empty-description">${currentOrderStatusFilter !== 'all' ? `No ${currentOrderStatusFilter} orders found.` : 'No orders have been placed yet.'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    pageOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-NG', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const statusClass = order.status === 'pending' ? 'status-pending' : 
                           order.status === 'processing' ? 'status-processing' : 
                           order.status === 'shipped' ? 'status-shipped' : 
                           order.status === 'delivered' ? 'status-delivered' : 'status-cancelled';
        
        const statusIcon = order.status === 'processing' ? 'fa-spinner fa-pulse' : 
                          order.status === 'delivered' ? 'fa-check-circle' : 
                          order.status === 'shipped' ? 'fa-truck' : 'fa-clock';
        
        const paymentClass = order.payment_status === 'paid' ? 'payment-paid' : 'payment-pending';
        const paymentText = order.payment_status === 'paid' ? 'Paid' : 'Pending';
        
        html += `
            <div class="order-row">
                <div><input type="checkbox" class="order-select" value="${order.id}"></div>
                <div class="order-number">
                    <a href="#" onclick="window.AdminOrders.viewOrderDetail('${order.order_number}'); return false;">
                        ${order.order_number}
                    </a>
                </div>
                <div class="order-date">${orderDate}</div>
                <div class="order-customer">
                    <div class="customer-name">${escapeHtml(order.full_name || order.user_name || 'N/A')}</div>
                    <div class="customer-email">${escapeHtml(order.user_email || '')}</div>
                </div>
                <div class="order-total">₦${(order.grand_total || order.total_amount || 0).toLocaleString()}</div>
                <div>
                    <span class="order-status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${order.status || 'pending'}
                    </span>
                </div>
                <div>
                    <span class="order-payment-badge ${paymentClass}">
                        <i class="fas ${paymentText === 'Paid' ? 'fa-check-circle' : 'fa-clock'}"></i> ${paymentText}
                    </span>
                </div>
                <div class="order-actions">
                    <button class="order-action-btn" onclick="window.AdminOrders.viewOrderDetail('${order.order_number}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <div class="status-dropdown" style="position: relative;">
                        <button class="order-action-btn" onclick="window.AdminOrders.toggleOrderStatusDropdown(this)" title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="status-dropdown-content" style="display: none; position: absolute; right: 0; top: 100%; min-width: 140px; background: white; border-radius: var(--radius); box-shadow: var(--shadow-lg); z-index: 100;">
                            <div class="status-option" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.AdminOrders.updateOrderStatus('${order.id}', 'pending')">
                                <i class="fas fa-clock"></i> Pending
                            </div>
                            <div class="status-option" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.AdminOrders.updateOrderStatus('${order.id}', 'processing')">
                                <i class="fas fa-spinner"></i> Processing
                            </div>
                            <div class="status-option" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.AdminOrders.updateOrderStatus('${order.id}', 'shipped')">
                                <i class="fas fa-truck"></i> Shipped
                            </div>
                            <div class="status-option" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.AdminOrders.updateOrderStatus('${order.id}', 'delivered')">
                                <i class="fas fa-check-circle"></i> Delivered
                            </div>
                            <div class="status-option" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.AdminOrders.updateOrderStatus('${order.id}', 'cancelled')">
                                <i class="fas fa-ban"></i> Cancelled
                            </div>
                        </div>
                    </div>
                    <button class="order-action-btn" onclick="window.AdminOrders.generateInvoice('${order.order_number}')" title="Generate Invoice">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateOrdersPaginationInfo();
}

function updateOrdersPaginationInfo() {
    const start = (ordersCurrentPage - 1) * ordersPerPage + 1;
    const end = Math.min(start + ordersPerPage - 1, filteredOrders.length);
    const total = filteredOrders.length;
    
    document.getElementById('ordersStartRow').textContent = total > 0 ? start : 0;
    document.getElementById('ordersEndRow').textContent = end;
    document.getElementById('ordersTotalRows').textContent = total;
    document.getElementById('ordersPagination').style.display = total > ordersPerPage ? 'flex' : 'none';
}

function updateOrdersPagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    document.getElementById('ordersPrevBtn').disabled = ordersCurrentPage === 1;
    document.getElementById('ordersNextBtn').disabled = ordersCurrentPage === totalPages;
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        
        if (error) throw error;
        
        const order = allOrders.find(o => o.id == orderId);
        if (order) order.status = newStatus;
        
        applyOrdersFilters();
        showToast(`Order status updated to ${newStatus}`, 'success');
    } catch (error) {
        showToast('Failed to update order status', 'error');
    }
}

async function viewOrderDetail(orderNumber) {
    const order = allOrders.find(o => o.order_number === orderNumber);
    if (!order) return;
    
    const items = order.items || [];
    const subtotal = order.total_amount || 0;
    const shippingFee = order.shipping_fee || 0;
    const grandTotal = order.grand_total || subtotal + shippingFee;
    const orderDate = new Date(order.created_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let itemsHtml = '';
    if (items.length > 0) {
        items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td style="padding: var(--space-2);">${escapeHtml(item.name || 'Product')}</td>
                    <td style="padding: var(--space-2);">${item.color_name ? escapeHtml(item.color_name) + (item.size_value ? ' / ' + escapeHtml(item.size_value) : '') : '-'}</td>
                    <td style="padding: var(--space-2); text-align: center;">${item.quantity}</td>
                    <td style="padding: var(--space-2); text-align: right;">₦${(item.price || 0).toLocaleString()}</td>
                    <td style="padding: var(--space-2); text-align: right;">₦${((item.price || 0) * item.quantity).toLocaleString()}</td>
                </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="5" class="text-center">No items found</td></tr>';
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="orderDetailModal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2 class="modal-title">Order Details</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b">
                        <div>
                            <div class="font-mono font-bold text-primary-600">${order.order_number}</div>
                            <div class="text-sm text-gray-500">Placed on ${orderDate}</div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="order-status-badge ${order.status === 'pending' ? 'status-pending' : order.status === 'processing' ? 'status-processing' : order.status === 'shipped' ? 'status-shipped' : order.status === 'delivered' ? 'status-delivered' : 'status-cancelled'}">
                                <i class="fas ${order.status === 'processing' ? 'fa-spinner fa-pulse' : order.status === 'delivered' ? 'fa-check-circle' : order.status === 'shipped' ? 'fa-truck' : 'fa-clock'}"></i> ${order.status}
                            </span>
                            <select class="form-control text-sm w-auto" onchange="window.AdminOrders.updateOrderStatusFromModal('${order.id}', this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-xs uppercase text-gray-500 mb-3"><i class="fas fa-user"></i> Customer Information</h4>
                            <p><strong>${escapeHtml(order.full_name || order.user_name || 'N/A')}</strong></p>
                            <p>${escapeHtml(order.user_email || 'No email')}</p>
                            <p>${escapeHtml(order.user_phone || 'No phone')}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-xs uppercase text-gray-500 mb-3"><i class="fas fa-truck"></i> Shipping Address</h4>
                            <p>${escapeHtml(order.shipping_address || 'No address')}</p>
                            <p>${order.city ? escapeHtml(order.city) + ', ' : ''}${order.state || ''}</p>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="text-xs uppercase text-gray-500 mb-3"><i class="fas fa-receipt"></i> Order Items</h4>
                        <table class="w-full" style="border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--gray-200);">
                                    <th style="padding: var(--space-2); text-align: left;">Product</th>
                                    <th style="padding: var(--space-2); text-align: left;">Variant</th>
                                    <th style="padding: var(--space-2); text-align: center;">Qty</th>
                                    <th style="padding: var(--space-2); text-align: right;">Price</th>
                                    <th style="padding: var(--space-2); text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        
                        <div class="text-right mt-4 pt-4 border-t">
                            <div class="flex justify-end gap-4 mb-1">
                                <span>Subtotal:</span>
                                <span>₦${subtotal.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-end gap-4 mb-1">
                                <span>Shipping:</span>
                                <span>₦${shippingFee.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-end gap-4 text-lg font-bold text-primary-600">
                                <span>Total:</span>
                                <span>₦${grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${order.notes ? `
                        <div class="bg-gray-50 p-4 rounded-lg mt-4">
                            <h4 class="text-xs uppercase text-gray-500 mb-3"><i class="fas fa-pen"></i> Order Notes</h4>
                            <p>${escapeHtml(order.notes)}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer p-4 border-t flex gap-3 justify-end">
                    <button class="btn btn-secondary" onclick="window.AdminOrders.generateInvoice('${order.order_number}')">
                        <i class="fas fa-file-invoice"></i> Generate Invoice
                    </button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function updateOrderStatusFromModal(orderId, newStatus) {
    await updateOrderStatus(orderId, newStatus);
    const modal = document.getElementById('orderDetailModal');
    if (modal) modal.remove();
    const order = allOrders.find(o => o.id == orderId);
    if (order) await viewOrderDetail(order.order_number);
}

function toggleOrderStatusDropdown(button) {
    const dropdown = button.nextElementSibling;
    const isVisible = dropdown.style.display === 'block';
    
    document.querySelectorAll('.status-dropdown-content').forEach(d => d.style.display = 'none');
    
    if (!isVisible) {
        dropdown.style.display = 'block';
        const closeDropdown = (e) => {
            if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }
}

function filterOrdersByStatus(status) {
    currentOrderStatusFilter = status;
    ordersCurrentPage = 1;
    
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) btn.classList.add('active');
    });
    
    applyOrdersFilters();
}

function searchOrders() {
    currentOrderSearch = document.getElementById('orderSearchInput')?.value || '';
    ordersCurrentPage = 1;
    applyOrdersFilters();
}

function ordersPrevPage() {
    if (ordersCurrentPage > 1) {
        ordersCurrentPage--;
        renderOrdersTable();
        updateOrdersPagination();
    }
}

function ordersNextPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (ordersCurrentPage < totalPages) {
        ordersCurrentPage++;
        renderOrdersTable();
        updateOrdersPagination();
    }
}

async function exportOrders() {
    try {
        const dataStr = JSON.stringify(filteredOrders, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jmpotters-orders-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Orders exported successfully', 'success');
    } catch (error) {
        showToast('Failed to export orders', 'error');
    }
}

function refreshOrders() {
    loadOrders();
    showToast('Refreshing orders...', 'info');
}

function generateInvoice(orderNumber) {
    window.open(`invoice.html?order=${orderNumber}`, '_blank');
}

// ==================== EXPORTS ====================
window.AdminOrders = {
    loadOrders,
    applyOrdersFilters,
    updateOrderStats,
    renderOrdersTable,
    updateOrderStatus,
    viewOrderDetail,
    updateOrderStatusFromModal,
    toggleOrderStatusDropdown,
    filterOrdersByStatus,
    searchOrders,
    ordersPrevPage,
    ordersNextPage,
    exportOrders,
    refreshOrders,
    generateInvoice,
    allOrders: () => allOrders,
    filteredOrders: () => filteredOrders
};
