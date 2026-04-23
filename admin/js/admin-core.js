// ==================== ADMIN CORE ====================
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4';

let supabase = null;
let categories = [];
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let productsPerPage = 12;
let currentFilter = 'all';
let productColors = {};
let productSizes = {};
let currentProductId = null;
let refreshInterval = null;
let allOrders = [];
let filteredOrders = [];
let ordersCurrentPage = 1;
let ordersPerPage = 15;
let currentOrderStatusFilter = 'all';
let currentOrderSearch = '';

const imageConfig = {
    baseUrl: 'https://ebuzome.github.io/JMPOTTERS/assets/images/',
    paths: {
        'mensfootwear': 'mensfootwear/',
        'womensfootwear': '',
        'bags': '',
        'household': 'household2/',
        'kids': 'kids/',
        'accessories': 'accessories/',
        'healthcare': ''
    }
};

const colorDatabaseData = [
    { name: "Black", codes: ["#000000"] }, { name: "White", codes: ["#FFFFFF"] },
    { name: "Red", codes: ["#FF0000"] }, { name: "Blue", codes: ["#0000FF"] },
    { name: "Green", codes: ["#008000"] }, { name: "Yellow", codes: ["#FFFF00"] },
    { name: "Orange", codes: ["#FFA500"] }, { name: "Purple", codes: ["#800080"] },
    { name: "Pink", codes: ["#FFC0CB"] }, { name: "Brown", codes: ["#8B4513"] },
    { name: "Gray", codes: ["#808080"] }, { name: "Black + White", codes: ["#000000", "#FFFFFF"] },
    { name: "Red + Black", codes: ["#FF0000", "#000000"] }, { name: "Blue + White", codes: ["#0000FF", "#FFFFFF"] },
    { name: "Black + Gold", codes: ["#000000", "#FFD700"] }, { name: "Navy Blue", codes: ["#000080"] },
    { name: "Royal Blue", codes: ["#4169E1"] }, { name: "Teal", codes: ["#008080"] },
    { name: "Emerald", codes: ["#50C878"] }, { name: "Maroon", codes: ["#800000"] },
    { name: "Burgundy", codes: ["#800020"] }, { name: "Gold", codes: ["#FFD700"] },
    { name: "Silver", codes: ["#C0C0C0"] }, { name: "Rose Gold", codes: ["#B76E79"] },
    { name: "Lavender", codes: ["#E6E6FA"] }, { name: "Beige", codes: ["#F5F5DC"] }
];

let colorDatabase = {};
const commonSizes = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<div class="toast-icon"><i class="fas ${icons[type]}"></i></div><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function buildCorrectImageUrl(filename, categorySlug) {
    if (!filename) return 'https://via.placeholder.com/300x200?text=No+Image';
    const categoryPath = imageConfig.paths[categorySlug] || '';
    return imageConfig.baseUrl + categoryPath + filename;
}

function getProductImageUrl(product) {
    const category = categories.find(c => c.id === product.category_id);
    const categorySlug = category?.slug;
    const filename = product.image_url || '';
    return buildCorrectImageUrl(filename, categorySlug);
}

function parseImageFilenameFromUrl(imageUrl) {
    if (!imageUrl) return '';
    let filename = imageUrl.replace(imageConfig.baseUrl, '');
    Object.values(imageConfig.paths).forEach(path => {
        if (path && filename.startsWith(path)) filename = filename.replace(path, '');
    });
    return filename;
}

function initializeColorDatabase() {
    colorDatabaseData.forEach(color => { colorDatabase[color.name.toLowerCase()] = color; });
}

async function initSupabase() {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase initialized');
    return supabase;
}

function getSupabase() { return supabase; }

window.AdminCore = {
    supabase: () => supabase,
    getSupabase,
    categories: () => categories,
    setCategories: (cats) => { categories = cats; },
    allProducts: () => allProducts,
    setAllProducts: (products) => { allProducts = products; },
    filteredProducts: () => filteredProducts,
    setFilteredProducts: (products) => { filteredProducts = products; },
    productColors: () => productColors,
    setProductColors: (colors) => { productColors = colors; },
    productSizes: () => productSizes,
    setProductSizes: (sizes) => { productSizes = sizes; },
    currentProductId: () => currentProductId,
    setCurrentProductId: (id) => { currentProductId = id; },
    allOrders: () => allOrders,
    setAllOrders: (orders) => { allOrders = orders; },
    filteredOrders: () => filteredOrders,
    setFilteredOrders: (orders) => { filteredOrders = orders; },
    ordersCurrentPage: () => ordersCurrentPage,
    setOrdersCurrentPage: (page) => { ordersCurrentPage = page; },
    currentOrderStatusFilter: () => currentOrderStatusFilter,
    setCurrentOrderStatusFilter: (filter) => { currentOrderStatusFilter = filter; },
    currentOrderSearch: () => currentOrderSearch,
    setCurrentOrderSearch: (search) => { currentOrderSearch = search; },
    colorDatabase: () => colorDatabase,
    colorDatabaseData: colorDatabaseData,
    commonSizes: commonSizes,
    imageConfig: imageConfig,
    escapeHtml,
    showToast,
    buildCorrectImageUrl,
    getProductImageUrl,
    parseImageFilenameFromUrl,
    initializeColorDatabase,
    initSupabase,
    getCurrentPage: () => currentPage,
    setCurrentPage: (page) => { currentPage = page; },
    getProductsPerPage: () => productsPerPage,
    getCurrentFilter: () => currentFilter,
    setCurrentFilter: (filter) => { currentFilter = filter; }
};