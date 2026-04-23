// ==================== ADMIN CORE ====================
// Supabase configuration
const SUPABASE_URL = 'https://tmpggeeuwdvlngvfncaa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcGdnZWV1d2R2bG5ndmZuY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTc0MDYsImV4cCI6MjA3Nzc3MzQwNn0.EKzkKWmzYMvQuN11vEjRTDHrUbh6dYXk7clxVsYQ0b4';

// Global variables
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

// Image configuration
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

// Color database
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

// Common shoe sizes
const commonSizes = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

// ==================== UTILITY FUNCTIONS ====================
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
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<div class="toast-icon"><i class="fas ${icons[type]}"></i></div><div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
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
    colorDatabaseData.forEach(color => {
        colorDatabase[color.name.toLowerCase()] = color;
    });
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>`;
    }
}

// ==================== INITIALIZATION ====================
async function initSupabase() {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase initialized');
    return supabase;
}

function loadUserPreferences() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').checked = darkMode;
    
    const fontSize = localStorage.getItem('fontSize') || '14';
    document.documentElement.style.fontSize = fontSize + 'px';
    if (document.getElementById('fontSizeSlider')) {
        document.getElementById('fontSizeSlider').value = fontSize;
    }
    
    const primaryColor = localStorage.getItem('primaryColor') || '#6366F1';
    document.documentElement.style.setProperty('--primary-500', primaryColor);
    if (document.getElementById('primaryColorPicker')) {
        document.getElementById('primaryColorPicker').value = primaryColor;
    }
    
    const refreshIntervalValue = localStorage.getItem('refreshInterval') || '60000';
    if (document.getElementById('refreshInterval')) {
        document.getElementById('refreshInterval').value = refreshIntervalValue;
    }
    
    const buttonStyle = localStorage.getItem('buttonStyle') || 'rounded';
    if (document.getElementById('buttonStyle')) {
        document.getElementById('buttonStyle').value = buttonStyle;
    }
}

function setupAutoRefresh() {
    const interval = parseInt(localStorage.getItem('refreshInterval') || '60000');
    if (interval > 0) {
        refreshInterval = setInterval(() => {
            if (typeof window.loadInitialData === 'function') {
                window.loadInitialData();
            }
            showToast('Data refreshed automatically', 'info');
        }, interval);
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Mobile menu toggle
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.style.display = 'block';
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.style.display = 'none';
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.style.display = 'none';
            });
        });
    }
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const sectionId = this.dataset.section;
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            window.location.hash = sectionId;
        });
    });
    
    // Hash change
    window.addEventListener('hashchange', () => {
        const sectionId = window.location.hash.substring(1) || 'dashboard';
        const link = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (link) link.click();
    });
    
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        const link = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (link) link.click();
    }
    
    // Close color options when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.color-autocomplete')) {
            const options = document.getElementById('colorOptions');
            if (options) options.style.display = 'none';
        }
    });
}

// ==================== EXPORTS ====================
window.AdminCore = {
    supabase: () => supabase,
    getSupabase: () => supabase,
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
    colorDatabase: () => colorDatabase,
    colorDatabaseData: colorDatabaseData,
    commonSizes: commonSizes,
    imageConfig: imageConfig,
    escapeHtml: escapeHtml,
    showToast: showToast,
    buildCorrectImageUrl: buildCorrectImageUrl,
    getProductImageUrl: getProductImageUrl,
    parseImageFilenameFromUrl: parseImageFilenameFromUrl,
    initializeColorDatabase: initializeColorDatabase,
    initSupabase: initSupabase,
    loadUserPreferences: loadUserPreferences,
    setupAutoRefresh: setupAutoRefresh,
    setupEventListeners: setupEventListeners,
    showLoading: showLoading
};
