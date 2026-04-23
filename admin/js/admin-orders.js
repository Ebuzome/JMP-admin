// ==================== ORDER MANAGEMENT ====================

async function loadOrders() {
    const supabase = AdminCore.getSupabase();
    try {
        const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        AdminCore.setAllOrders(orders || []);
        applyOrdersFilters();
        updateOrderStats();
        console.log(`✅ Loaded ${(orders || []).length} orders`);
    } catch (error) { console.error('Error loading orders:', error); AdminCore.showToast('Failed to load orders', 'error'); }
}

function applyOrdersFilters() {
    const allOrders = AdminCore.allOrders();
    const currentOrderStatusFilter = AdminCore.currentOrderStatusFilter();
    const currentOrderSearch = AdminCore.currentOrderSearch();
    let filtered = [...allOrders];
    if (currentOrderStatusFilter !== 'all') filtered = filtered.filter(order => order.status === currentOrderStatusFilter);
    if (currentOrderSearch) {
        const searchLower = currentOrderSearch.toLowerCase();
        filtered = filtered.filter(order => 
            order.order_number.toLowerCase().includes(searchLower) ||
            (order.full_name && order.full_name.toLowerCase().includes(searchLower)) ||
            (order.user_email && order.user_email.toLowerCase().includes(searchLower))
        );
    }
    AdminCore.setFilteredOrders(filtered);
    renderOrdersTable();
    updateOrdersPagination();
}

function updateOrderStats() {
    const allOrders = AdminCore.allOrders();
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const processing = allOrders.filter(o => o.status === 'processing').length;
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const revenue = allOrders.reduce((sum, o) => sum + (o.grand_total || o.total_amount || 0), 0);
    
    document.getElementById('totalOrdersCount') && (document.getElementById('totalOrdersCount').textContent = total);
    document.getElementById('pendingOrdersCount') && (document.getElementById('pendingOrdersCount').textContent = pending);
    document.getElementById('processingOrdersCount') && (document.getElementById('processingOrdersCount').textContent = processing);
    document.getElementById('deliveredOrdersCount') && (document.getElementById('deliveredOrdersCount').textContent = delivered);
    document.getElementById('cancelledOrdersCount') && (document.getElementById('cancelledOrdersCount').textContent = cancelled);
    document.getElementById('totalRevenueStatOrders') && (document.getElementById('totalRevenueStatOrders').textContent = '₦' + revenue.toLocaleString());
    document.getElementById('totalOrdersStat') && (document.getElementById('totalOrdersStat').textContent = total);
    document.getElementById('totalRevenueStat') && (document.getElementById('totalRevenueStat').textContent = '₦' + revenue.toLocaleString());
    document.getElementById('ordersCount') && (document.getElementById('ordersCount').textContent = total);
    document.getElementById('ordersCountDesktop') && (document.getElementById('ordersCountDesktop').textContent = total);
    document.getElementById('pendingOrders') && (document.getElementById('pendingOrders').textContent = pending);
}

function renderOrdersTable() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    const ordersCurrentPage = AdminCore.ordersCurrentPage();
    const ordersPerPage = 15;
    const filteredOrders = AdminCore.filteredOrders();
    const startIndex = (ordersCurrentPage - 1) * ordersPerPage;
    const pageOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);
    
    if (pageOrders.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-shopping-cart"></i></div><h3 class="empty-title">No Orders Found</h3><p class="empty-description">No orders have been placed yet.</p></div>`;
        return;
    }
    
    let html = '';
    pageOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('en-NG');
        const statusClass = order.status === 'pending' ? 'status-pending' : order.status === 'processing' ? 'status-processing' : order.status === 'shipped' ? 'status-shipped' : order.status === 'delivered' ? 'status-delivered' : 'status-cancelled';
        const paymentText = order.payment_status === 'paid' ? 'Paid' : 'Pending';
        
        html += `
            <div class="order-row">
                <div><input type="checkbox"></div>
                <div class="order-number"><a href="#" onclick="window.AdminOrders.viewOrderDetail('${order.order_number}'); return false;">${order.order_number}</a></div>
                <div class="order-date">${orderDate}</div>
                <div class="order-customer"><div class="customer-name">${AdminCore.escapeHtml(order.full_name || order.user_name || 'N/A')}</div><div class="customer-email">${AdminCore.escapeHtml(order.user_email || '')}</div></div>
                <div class="order-total">₦${(order.grand_total || order.total_amount || 0).toLocaleString()}</div>
                <div><span class="order-status-badge ${statusClass}">${order.status || 'pending'}</span></div>
                <div><span class="order-payment-badge payment-${order.payment_status === 'paid' ? 'paid' : 'pending'}">${paymentText}</span></div>
                <div class="order-actions">
                    <button class="order-action-btn" onclick="window.AdminOrders.viewOrderDetail('${order.order_number}')"><i class="fas fa-eye"></i></button>
                    <button class="order-action-btn" onclick="window.AdminOrders.generateInvoice('${order.order_number}')"><i class="fas fa-file-invoice"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    
    const total = filteredOrders.length;
    document.getElementById('ordersStartRow') && (document.getElementById('ordersStartRow').textContent = startIndex + 1);
    document.getElementById('ordersEndRow') && (document.getElementById('ordersEndRow').textContent = Math.min(startIndex + ordersPerPage, total));
    document.getElementById('ordersTotalRows') && (document.getElementById('ordersTotalRows').textContent = total);
    document.getElementById('ordersPagination') && (document.getElementById('ordersPagination').style.display = total > ordersPerPage ? 'flex' : 'none');
    document.getElementById('ordersPrevBtn') && (document.getElementById('ordersPrevBtn').disabled = ordersCurrentPage === 1);
    document.getElementById('ordersNextBtn') && (document.getElementById('ordersNextBtn').disabled = ordersCurrentPage >= Math.ceil(total / ordersPerPage));
}

function updateOrdersPagination() {
    const filteredOrders = AdminCore.filteredOrders();
    const ordersPerPage = 15;
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const ordersCurrentPage = AdminCore.ordersCurrentPage();
    document.getElementById('ordersPrevBtn') && (document.getElementById('ordersPrevBtn').disabled = ordersCurrentPage === 1);
    document.getElementById('ordersNextBtn') && (document.getElementById('ordersNextBtn').disabled = ordersCurrentPage === totalPages);
}

function filterOrdersByStatus(status) {
    AdminCore.setCurrentOrderStatusFilter(status);
    AdminCore.setOrdersCurrentPage(1);
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) btn.classList.add('active');
    });
    applyOrdersFilters();
}

function searchOrders() {
    AdminCore.setCurrentOrderSearch(document.getElementById('orderSearchInput')?.value || '');
    AdminCore.setOrdersCurrentPage(1);
    applyOrdersFilters();
}

function ordersPrevPage() {
    let ordersCurrentPage = AdminCore.ordersCurrentPage();
    if (ordersCurrentPage > 1) {
        ordersCurrentPage--;
        AdminCore.setOrdersCurrentPage(ordersCurrentPage);
        renderOrdersTable();
        updateOrdersPagination();
    }
}

function ordersNextPage() {
    let ordersCurrentPage = AdminCore.ordersCurrentPage();
    const filteredOrders = AdminCore.filteredOrders();
    const totalPages = Math.ceil(filteredOrders.length / 15);
    if (ordersCurrentPage < totalPages) {
        ordersCurrentPage++;
        AdminCore.setOrdersCurrentPage(ordersCurrentPage);
        renderOrdersTable();
        updateOrdersPagination();
    }
}

async function viewOrderDetail(orderNumber) {
    const allOrders = AdminCore.allOrders();
    const order = allOrders.find(o => o.order_number === orderNumber);
    if (!order) return;
    
    const items = order.items || [];
    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `<tr><td style="padding: var(--space-2);">${AdminCore.escapeHtml(item.name || 'Product')}</td><td style="padding: var(--space-2);">${item.color_name ? AdminCore.escapeHtml(item.color_name) + (item.size_value ? ' / ' + AdminCore.escapeHtml(item.size_value) : '') : '-'}</td><td style="padding: var(--space-2); text-align: center;">${item.quantity}</td><td style="padding: var(--space-2); text-align: right;">₦${(item.price || 0).toLocaleString()}</td><td style="padding: var(--space-2); text-align: right;">₦${((item.price || 0) * item.quantity).toLocaleString()}</td></tr>`;
    });
    
    const modalHtml = `
        <div class="modal-overlay" id="orderDetailModal" style="display: flex;">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header"><h2 class="modal-title">Order Details: ${order.order_number}</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button></div>
                <div class="modal-body">
                    <div><strong>Customer:</strong> ${AdminCore.escapeHtml(order.full_name || order.user_name)}</div>
                    <div><strong>Email:</strong> ${AdminCore.escapeHtml(order.user_email || 'N/A')}</div>
                    <div><strong>Phone:</strong> ${AdminCore.escapeHtml(order.user_phone || 'N/A')}</div>
                    <div><strong>Address:</strong> ${AdminCore.escapeHtml(order.shipping_address || 'N/A')}</div>
                    <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
                    <div><strong>Status:</strong> ${order.status}</div>
                    <div><strong>Total:</strong> ₦${(order.grand_total || order.total_amount || 0).toLocaleString()}</div>
                    <h3 class="mt-4">Items</h3>
                    <table class="w-full" style="border-collapse: collapse; border: 1px solid var(--gray-200);"><thead><tr style="background: var(--gray-50);"><th style="padding: var(--space-2);">Product</th><th>Variant</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="5">No items</td></tr>'}</tbody></table>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function exportOrders() { AdminCore.showToast('Export feature coming soon', 'info'); }
function refreshOrders() { loadOrders(); AdminCore.showToast('Refreshing orders...', 'info'); }
function generateInvoice(orderNumber) { window.open(`invoice.html?order=${orderNumber}`, '_blank'); }

window.AdminOrders = {
    loadOrders, filterOrdersByStatus, searchOrders, ordersPrevPage, ordersNextPage,
    viewOrderDetail, exportOrders, refreshOrders, generateInvoice
};