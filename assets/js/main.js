// Configuration
const CONFIG = {
    N8N_FORM_URL: 'https://api.yourdomain.com/form/45f473b3-3bb4-49f0-b2f0-b63ec6ea343a',
    GITHUB_API_BASE: 'https://api.github.com/repos/',
    LICENSE_VALIDATION_ENDPOINT: 'https://api.yourdomain.com/webhook/validate-license',
    SHOWCASE_JSON_URL: 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/refs/heads/main/data/showcase/Showcase.json'
};

// DOM Elements
const licenseKeyInput = document.getElementById('licenseKey');
const repoUrlInput = document.getElementById('repoUrl');
const submitBtn = document.getElementById('submitBtn');
const licenseInfo = document.getElementById('licenseInfo');
const urlValidation = document.getElementById('urlValidation');
const statusMessage = document.getElementById('statusMessage');
const analysisForm = document.getElementById('analysisForm');

// Showcase elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtnBottom = document.getElementById('prevBtnBottom');
const nextBtnBottom = document.getElementById('nextBtnBottom');
const currentIndexSpan = document.getElementById('currentIndex');
const totalItemsSpan = document.getElementById('totalItems');
const currentIndexBottomSpan = document.getElementById('currentIndexBottom');
const totalItemsBottomSpan = document.getElementById('totalItemsBottom');
const showcaseSearch = document.getElementById('showcaseSearch');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');

// Showcase state
let currentShowcaseIndex = 0;
let showcaseItems = [];
let filteredItems = [];
let autocompleteData = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCachedLicenseKey();
    initializeShowcase();
    loadShowcaseFiles();
});

function initializeEventListeners() {
    // Form validation
    if (licenseKeyInput) licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 500));
    if (repoUrlInput) repoUrlInput.addEventListener('input', debounce(validateRepoUrl, 300));
    
    // Form submission
    if (analysisForm) analysisForm.addEventListener('submit', handleFormSubmission);
    
    // Showcase navigation
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', showPreviousShowcase);
        nextBtn.addEventListener('click', showNextShowcase);
    }
    if (prevBtnBottom && nextBtnBottom) {
        prevBtnBottom.addEventListener('click', showPreviousShowcase);
        nextBtnBottom.addEventListener('click', showNextShowcase);
    }
    
    // Showcase search with autocomplete
    if (showcaseSearch) {
        showcaseSearch.addEventListener('input', debounce(handleSearchInput, 300));
        showcaseSearch.addEventListener('focus', showAutocomplete);
        showcaseSearch.addEventListener('blur', () => {
            setTimeout(hideAutocomplete, 200);
        });
        showcaseSearch.addEventListener('keydown', handleSearchKeydown);
    }
}

// -------------------------
// Showcase Management
// -------------------------
function initializeShowcase() {
    showcaseItems = document.querySelectorAll('.showcase-item');
    filteredItems = Array.from(showcaseItems);

    // Attach input listeners for textareas inside showcase items
    showcaseItems.forEach(item => {
        const textareas = item.querySelectorAll('textarea');
        textareas.forEach(el => {
            if (!el) return;
            el.addEventListener('input', () => {
                try { adjustTextareaHeight(el); } catch (err) { /* swallow */ }
            }, false);
        });
    });

    updateShowcaseDisplay();
}

function updateShowcaseDisplay() {
    // Hide all items
    showcaseItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show current item if exists
    if (filteredItems.length > 0) {
        filteredItems[currentShowcaseIndex].classList.add('active');

        // Adjust heights after a slight delay to ensure DOM updates
        setTimeout(() => {
            try {
                const activeItem = filteredItems[currentShowcaseIndex];
                if (activeItem) {
                    const textarea = activeItem.querySelector('textarea');
                    if (textarea) {
