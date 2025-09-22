// Configuration
const CONFIG = {
  // Your n8n form trigger URL - will be masked via Cloudflare
  N8N_FORM_URL: 'https://api.yourdomain.com/form/45f473b3-3bb4-49f0-b2f0-b63ec6ea343a',
  // GitHub API endpoint for validation
  GITHUB_API_BASE: 'https://api.github.com/repos/',
  // License validation endpoint (your backend)
  LICENSE_VALIDATION_ENDPOINT: 'https://api.yourdomain.com/webhook/validate-license'
};

// DOM Elements
const licenseKeyInput = document.getElementById('licenseKey');
const repoUrlInput = document.getElementById('repoUrl');
const submitBtn = document.getElementById('submitBtn');
const licenseInfo = document.getElementById('licenseInfo');
const urlValidation = document.getElementById('urlValidation');
const statusMessage = document.getElementById('statusMessage');
const analysisForm = document.getElementById('analysisForm');

// Modal elements
const freeTrialModal = document.getElementById('freeTrialModal');
const freeTrialBtn = document.getElementById('freeTrial');
const closeBtns = document.querySelectorAll('.close');

// Search elements
const showcaseSearch = document.getElementById('showcaseSearch');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');

// -------------------------
// Showcase Carousel Class
// -------------------------
class ShowcaseCarousel {
    constructor() {
        this.currentIndex = 0;
        this.items = [];
        this.track = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.currentCounter = null;
        this.totalCounter = null;
        this.showcaseData = [];
        this.filteredData = [];
        this.autocompleteData = [];
    }

    init() {
        this.track = document.getElementById('carouselTrack');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentCounter = document.getElementById('currentIndex');
        this.totalCounter = document.getElementById('totalItems');

        if (!this.track) {
            console.warn('Carousel track not found, falling back to legacy showcase');
            return false;
        }

        this.setupEventListeners();
        this.loadShowcaseData();
        return true;
    }

    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousSlide());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.previousSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });

        // Touch/swipe support for mobile
        let startX = 0;
        let startY = 0;
        
        if (this.track) {
            this.track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });

            this.track.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                // Only trigger if horizontal swipe is more significant than vertical
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        this.nextSlide();
                    } else {
                        this.previousSlide();
                    }
                }
                
                startX = 0;
                startY = 0;
            }, { passive: true });
        }
    }

    async loadShowcaseData() {
        try {
            const response = await fetch('data/showcase/Showcase.json');
            if (response.ok) {
                this.showcaseData = await response.json();
                this.filteredData = [...this.showcaseData];
                this.renderCarousel();
                this.updateAutocompleteData();
                console.log('Showcase carousel loaded successfully');
            } else {
                console.error('Failed to load showcase data');
                this.renderEmptyCarousel();
            }
        } catch (error) {
            console.error('Error loading showcase data:', error);
            this.renderEmptyCarousel();
        }
    }

    renderCarousel() {
        if (!this.track) return;

        this.track.innerHTML = '';

        if (this.filteredData.length === 0) {
            this.renderEmptyCarousel();
            return;
        }

        this.filteredData.forEach((item, index) => {
            const slideHtml = `
                <div class="carousel-item">
                    <div class="item-header">
                        <h3 class="item-title">${this.escapeHtml(item.title || `Repository ${index + 1}`)}</h3>
                        <button class="copy-btn" onclick="showcaseCarousel.copySlideContent(${index})">📋 Copy</button>
                    </div>
                    <textarea readonly>${this.escapeHtml(item.content || 'No content available')}</textarea>
                </div>
            `;
            this.track.insertAdjacentHTML('beforeend', slideHtml);
        });

        this.items = this.track.querySelectorAll('.carousel-item');
        this.currentIndex = 0;
        this.initializeTextareas();
        this.updateDisplay();
    }

    renderEmptyCarousel() {
        if (!this.track) return;
        
        this.track.innerHTML = `
            <div class="carousel-item">
                <div class="item-header">
                    <h3 class="item-title">No Results Found</h3>
                </div>
                <textarea readonly>No showcase data available or no matches for your search.</textarea>
            </div>
        `;
        
        this.items = this.track.querySelectorAll('.carousel-item');
        this.currentIndex = 0;
        this.updateDisplay();
    }

    initializeTextareas() {
        this.items.forEach(item => {
            const textarea = item.querySelector('textarea');
            if (textarea) {
                this.autoExpandTextarea(textarea);
                textarea.addEventListener('input', () => {
                    this.autoExpandTextarea(textarea);
                });
            }
        });
    }

    autoExpandTextarea(textarea) {
        if (!textarea) return;
        try {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            if (scrollHeight && scrollHeight > 0) {
                textarea.style.height = Math.max(scrollHeight, 200) + 'px';
            }
        } catch (error) {
            console.warn('Error adjusting textarea height:', error);
        }
    }

    previousSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateDisplay();
        }
    }

    nextSlide() {
        if (this.currentIndex < this.items.length - 1) {
            this.currentIndex++;
            this.updateDisplay();
        }
    }

    goToSlide(index) {
        if (index >= 0 && index < this.items.length) {
            this.currentIndex = index;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (this.track && this.items.length > 0) {
            this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        }
        
        if (this.currentCounter) {
            this.currentCounter.textContent = this.items.length > 0 ? this.currentIndex + 1 : 0;
        }
        
        if (this.totalCounter) {
            this.totalCounter.textContent = this.items.length;
        }
        
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentIndex === 0 || this.items.length === 0;
        }
        
        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentIndex === this.items.length - 1 || this.items.length === 0;
        }

        // Adjust current slide textarea after transition
        setTimeout(() => {
            const currentItem = this.items[this.currentIndex];
            if (currentItem) {
                const textarea = currentItem.querySelector('textarea');
                if (textarea) {
                    this.autoExpandTextarea(textarea);
                }
            }
        }, 100);
    }

    copySlideContent(slideIndex) {
        const slide = this.items[slideIndex];
        if (!slide) return;

        const textarea = slide.querySelector('textarea');
        const copyBtn = slide.querySelector('.copy-btn');
        
        if (textarea) {
            // Modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textarea.value).then(() => {
                    this.showCopySuccess(copyBtn);
                }).catch(() => {
                    // Fallback to legacy method
                    this.legacyCopy(textarea, copyBtn);
                });
            } else {
                this.legacyCopy(textarea, copyBtn);
            }
        }
    }

    legacyCopy(textarea, copyBtn) {
        try {
            textarea.select();
            document.execCommand('copy');
            this.showCopySuccess(copyBtn);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }

    showCopySuccess(copyBtn) {
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }

    // Enhanced search functionality
    handleSearch(query) {
        if (!query.trim()) {
            this.filteredData = [...this.showcaseData];
        } else {
            const searchTerms = query.toLowerCase().split(/\s+/);
            this.filteredData = this.showcaseData.filter(item => {
                const searchText = (item.title + ' ' + item.content).toLowerCase();
                return searchTerms.every(term => searchText.includes(term));
            });
        }
        
        this.renderCarousel();
    }

    updateAutocompleteData() {
        this.autocompleteData = this.showcaseData.map(item => ({
            title: item.title || 'Untitled',
            keywords: this.extractKeywords((item.title || '') + ' ' + (item.content || ''))
        }));
    }

    extractKeywords(text) {
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 20);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize carousel instance
let showcaseCarousel;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCachedLicenseKey();
    
    // Initialize the new carousel
    showcaseCarousel = new ShowcaseCarousel();
    const carouselInitialized = showcaseCarousel.init();
    
    // Fallback to legacy showcase if carousel fails
    if (!carouselInitialized) {
        initializeLegacyShowcase();
    }
});

function initializeEventListeners() {
    // Form validation
    if (licenseKeyInput) licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 500));
    if (repoUrlInput) repoUrlInput.addEventListener('input', debounce(validateRepoUrl, 300));
    
    // Form submission
    if (analysisForm) analysisForm.addEventListener('submit', handleFormSubmission);
    
    // Modal controls
    if (freeTrialBtn) {
        freeTrialBtn.addEventListener('click', () => openModal(freeTrialModal));
    }
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Free trial form
    const freeTrialForm = document.getElementById('freeTrialForm');
    if (freeTrialForm) {
        freeTrialForm.addEventListener('submit', handleFreeTrialSubmission);
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
// Search and Autocomplete Functions  
// -------------------------
function handleSearchInput() {
    const query = showcaseSearch.value.toLowerCase().trim();
    
    // Use carousel search if available
    if (showcaseCarousel && showcaseCarousel.handleSearch) {
        showcaseCarousel.handleSearch(query);
    } else {
        // Fallback to legacy search
        handleLegacySearch(query);
    }
    
    // Update autocomplete suggestions
    const suggestions = generateAutocompleteSuggestions(query);
    updateAutocomplete(suggestions);
}

function generateAutocompleteSuggestions(query) {
    if (query.length < 2) return [];
    
    const suggestions = new Set();
    const autocompleteData = showcaseCarousel ? 
        showcaseCarousel.autocompleteData : 
        getLegacyAutocompleteData();
    
    // Add matching keywords from all items
    autocompleteData.forEach(item => {
        if (item.keywords) {
            item.keywords.forEach(keyword => {
                if (keyword.includes(query) && keyword !== query) {
                    suggestions.add(keyword);
                }
            });
        }
        // Add title if it matches
        if (item.title && item.title.toLowerCase().includes(query)) {
            suggestions.add(item.title);
        }
    });
    
    return Array.from(suggestions).slice(0, 5);
}

function updateAutocomplete(suggestions) {
    if (!autocompleteDropdown) return;
    
    autocompleteDropdown.innerHTML = '';
    
    if (suggestions.length === 0) {
        hideAutocomplete();
        return;
    }
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = suggestion;
        item.addEventListener('click', () => {
            showcaseSearch.value = suggestion;
            handleSearchInput();
            hideAutocomplete();
        });
        autocompleteDropdown.appendChild(item);
    });
    
    showAutocomplete();
}

function showAutocomplete() {
    if (autocompleteDropdown && autocompleteDropdown.children.length > 0) {
        autocompleteDropdown.style.display = 'block';
    }
}

function hideAutocomplete() {
    if (autocompleteDropdown) {
        autocompleteDropdown.style.display = 'none';
    }
}

function handleSearchKeydown(e) {
    if (!autocompleteDropdown) return;
    
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    let highlighted = autocompleteDropdown.querySelector('.autocomplete-item.highlighted');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!highlighted) {
            if (items.length > 0) items[0].classList.add('highlighted');
        } else {
            highlighted.classList.remove('highlighted');
            const next = highlighted.nextElementSibling || items[0];
            next.classList.add('highlighted');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!highlighted) {
            if (items.length > 0) items[items.length - 1].classList.add('highlighted');
        } else {
            highlighted.classList.remove('highlighted');
            const prev = highlighted.previousElementSibling || items[items.length - 1];
            prev.classList.add('highlighted');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted) {
            highlighted.click();
        }
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    }
}

// -------------------------
// Legacy Showcase Support (Fallback)
// -------------------------
let currentShowcaseIndex = 0;
let showcaseItems = [];
let filteredItems = [];
let legacyAutocompleteData = [];

function initializeLegacyShowcase() {
    console.log('Initializing legacy showcase');
    showcaseItems = document.querySelectorAll('.showcase-item');
    filteredItems = Array.from(showcaseItems);
    
    // Legacy navigation buttons
    const legacyPrevBtn = document.getElementById('legacyPrevBtn');
    const legacyNextBtn = document.getElementById('legacyNextBtn');
    
    if (legacyPrevBtn && legacyNextBtn) {
        legacyPrevBtn.addEventListener('click', showPreviousShowcase);
        legacyNextBtn.addEventListener('click', showNextShowcase);
    }

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
    loadLegacyShowcaseFiles();
}

function updateShowcaseDisplay() {
    // Hide all items
    showcaseItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show current item if exists
    if (filteredItems.length > 0) {
        filteredItems[currentShowcaseIndex].classList.add('active');

        try {
            const activeItem = filteredItems[currentShowcaseIndex];
            if (activeItem) {
                const tas = activeItem.querySelectorAll('textarea');
                tas.forEach(el => {
                    adjustTextareaHeight(el);
                });
            }
        } catch (err) {
            console.warn('Error adjusting textarea height for active showcase item', err);
        }

        const currentIndexSpan = document.getElementById('currentIndex');
        const totalItemsSpan = document.getElementById('totalItems');
        
        if (currentIndexSpan) currentIndexSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsSpan) totalItemsSpan.textContent = filteredItems.length;
        
        // Update navigation buttons
        const legacyPrevBtn = document.getElementById('legacyPrevBtn');
        const legacyNextBtn = document.getElementById('legacyNextBtn');
        
        if (legacyPrevBtn) legacyPrevBtn.disabled = currentShowcaseIndex === 0;
        if (legacyNextBtn) legacyNextBtn.disabled = currentShowcaseIndex === filteredItems.length - 1;
    } else {
        const currentIndexSpan = document.getElementById('currentIndex');
        const totalItemsSpan = document.getElementById('totalItems');
        
        if (currentIndexSpan) currentIndexSpan.textContent = '0';
        if (totalItemsSpan) totalItemsSpan.textContent = '0';
        
        const legacyPrevBtn = document.getElementById('legacyPrevBtn');
        const legacyNextBtn = document.getElementById('legacyNextBtn');
        
        if (legacyPrevBtn) legacyPrevBtn.disabled = true;
        if (legacyNextBtn) legacyNextBtn.disabled = true;
    }
}

function showPreviousShowcase() {
    if (currentShowcaseIndex > 0) {
        currentShowcaseIndex--;
        updateShowcaseDisplay();
    }
}

function showNextShowcase() {
    if (currentShowcaseIndex < filteredItems.length - 1) {
        currentShowcaseIndex++;
        updateShowcaseDisplay();
    }
}

function handleLegacySearch(query) {
    if (query === '') {
        filteredItems = Array.from(showcaseItems);
        currentShowcaseIndex = 0;
        updateShowcaseDisplay();
        return;
    }
    
    filteredItems = Array.from(showcaseItems).filter(item => {
        const titleEl = item.querySelector('h3');
        const taEl = item.querySelector('textarea');
        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        const content = taEl ? taEl.value.toLowerCase() : '';
        return title.includes(query) || content.includes(query);
    });
    
    currentShowcaseIndex = 0;
    updateShowcaseDisplay();
}

function getLegacyAutocompleteData() {
    return legacyAutocompleteData;
}

async function loadLegacyShowcaseFiles() {
    try {
        const response = await fetch('data/showcase/Showcase.json');
        if (response.ok) {
            const showcaseData = await response.json();
            const textareas = document.querySelectorAll('.showcase-item textarea');
            const titles = document.querySelectorAll('.showcase-item h3');
            
            showcaseData.forEach((item, index) => {
                if (textareas[index]) {
                    textareas[index].value = item.content || 'No content available';
                }
                if (titles[index]) {
                    titles[index].textContent = item.title || `Repository ${index + 1}`;
                }
            });

            // Initialize autocomplete data with loaded content
            legacyAutocompleteData = Array.from(showcaseItems).map(item => {
                const title = item.querySelector('h3').textContent;
                const content = item.querySelector('textarea').value;
                return { title: title, keywords: extractKeywords(title + ' ' + content) };
            });

            try {
                showcaseItems.forEach(item => {
                    if (item.classList.contains('active')) {
                        const tas = item.querySelectorAll('textarea');
                        tas.forEach(el => adjustTextareaHeight(el));
                    }
                });
            } catch (err) {
                console.warn('Error adjusting textarea heights after loading showcase files', err);
            }

            console.log('Legacy showcase files loaded successfully');
        }
    } catch (error) {
        console.error('Error loading legacy showcase files:', error);
    }
}

function extractKeywords(text) {
    const words = text.toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 20);
    return [...new Set(words)];
}

// -------------------------
// License Key Validation
// -------------------------
async function validateLicenseKey() {
    const licenseKey = licenseKeyInput.value.trim();
    if (!licenseKey) {
        updateLicenseInfo('', '');
        return;
    }
    // Check for free trial key
    if (licenseKey === generateFreeLicenseKey()) {
        updateLicenseInfo('Free trial license - 1 analysis available', 'valid');
        cacheLicenseKey(licenseKey);
        checkFormValidity();
        return;
    }
    // Basic format validation
    if (!isValidLicenseFormat(licenseKey)) {
        updateLicenseInfo('Invalid license key format', 'invalid');
        checkFormValidity();
        return;
    }
    updateLicenseInfo('Validating license key...', '');
    try {
        const response = await fetch(CONFIG.LICENSE_VALIDATION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.uses < data.max_uses) {
                const remaining = data.max_uses - data.uses;
                updateLicenseInfo(`Valid license - ${remaining} analyses remaining`, 'valid');
                cacheLicenseKey(licenseKey);
            } else {
                updateLicenseInfo('License key expired or invalid', 'invalid');
            }
        } else {
            updateLicenseInfo('Could not validate license key', 'invalid');
        }
    } catch (error) {
        console.error('License validation error:', error);
        updateLicenseInfo('Validation service unavailable', 'invalid');
    }
    checkFormValidity();
}

// -------------------------
// Repository URL Validation
// -------------------------
async function validateRepoUrl() {
    const url = repoUrlInput.value.trim();
    if (!url) {
        updateUrlValidation('', '');
        return;
    }
    if (!isValidGitHubUrl(url)) {
        updateUrlValidation('Please enter a valid GitHub repository URL', 'invalid');
        checkFormValidity();
        return;
    }
    updateUrlValidation('Validating repository...', '');
    try {
        const repoPath = extractRepoPath(url);
        const response = await fetch(CONFIG.GITHUB_API_BASE + repoPath);
        if (response.ok) {
            const data = await response.json();
            if (data.private) {
                updateUrlValidation('Private repositories are not supported', 'invalid');
            } else {
                updateUrlValidation('Valid public repository', 'valid');
            }
        } else if (response.status === 404) {
            updateUrlValidation('Repository not found or private', 'invalid');
        } else {
            updateUrlValidation('Could not validate repository', 'invalid');
        }
    } catch (error) {
        console.error('Repository validation error:', error);
        updateUrlValidation('Validation failed', 'invalid');
    }
    checkFormValidity();
}

// -------------------------
// Form Submission Handler
// -------------------------
async function handleFormSubmission(e) {
    e.preventDefault();
    const licenseKey = licenseKeyInput.value.trim();
    const repoUrl = repoUrlInput.value.trim();
    if (!licenseKey || !repoUrl) {
        showStatusMessage('Please fill in all required fields', 'error');
        return;
    }
    setFormLoading(true);
    try {
        const response = await fetch(CONFIG.N8N_FORM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey, repository_url: repoUrl, timestamp: new Date().toISOString() })
        });
        if (response.ok) {
            showStatusMessage(
                'Analysis request submitted successfully! Check your email and Discord for results within 5-10 minutes.',
                'success'
            );
            setTimeout(() => {
                repoUrlInput.value = '';
                updateUrlValidation('', '');
                hideStatusMessage();
            }, 5000);
        } else {
            throw new Error('Failed to submit request');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showStatusMessage('Failed to submit request.\nPlease try again or contact support.', 'error');
    } finally {
        setFormLoading(false);
    }
}

// -------------------------
// Free Trial Handler
// -------------------------
function handleFreeTrialSubmission(e) {
    e.preventDefault();
    const freeKey = generateFreeLicenseKey();
    licenseKeyInput.value = freeKey;
    licenseKeyInput.disabled = true;
    alert(`Free trial activated! License key: ${freeKey}`);
    closeModals();
    validateLicenseKey();
}

// -------------------------
// Utility Functions
// -------------------------
function generateFreeLicenseKey() {
    const today = new Date();
    const day = today.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const year = today.getFullYear();
    return `FREETRIAL${day}${year}`;
}

function isValidLicenseFormat(key) {
    return key.length >= 8 && /^[A-Z0-9-]+$/i.test(key);
}

function isValidGitHubUrl(url) {
    const githubRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    return githubRegex.test(url);
}

function extractRepoPath(url) {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : '';
}

function updateLicenseInfo(message, type) {
    if (licenseInfo) {
        licenseInfo.textContent = message;
        licenseInfo.className = `license-info ${type}`;
    }
}

function updateUrlValidation(message, type) {
    if (urlValidation) {
        urlValidation.textContent = message;
        urlValidation.className = `url-validation ${type}`;
    }
}

function checkFormValidity() {
    const licenseValid = licenseInfo && licenseInfo.classList.contains('valid');
    const urlValid = urlValidation && urlValidation.classList.contains('valid');
    const bothFilled = licenseKeyInput && repoUrlInput && licenseKeyInput.value.trim() && repoUrlInput.value.trim();
    if (submitBtn) submitBtn.disabled = !(licenseValid && urlValid && bothFilled);
}

function showStatusMessage(message, type) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
    }
}

function hideStatusMessage() {
    if (statusMessage) statusMessage.className = 'status-message';
}

function setFormLoading(loading) {
    if (submitBtn) submitBtn.disabled = loading;
    if (submitBtn) submitBtn.textContent = loading ? 'Submitting...' : 'Analyze Repository';
    if (analysisForm) analysisForm.classList.toggle('loading', loading);
}

function cacheLicenseKey(key) {
    try {
        localStorage.setItem('github_ai_license', key);
    } catch (e) {
        console.log('LocalStorage not available');
    }
}

function loadCachedLicenseKey() {
    try {
        const cached = localStorage.getItem('github_ai_license');
        if (cached && licenseKeyInput) {
            licenseKeyInput.value = cached;
            validateLicenseKey();
        }
    } catch (e) {
        console.log('LocalStorage not available');
    }
}

function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function closeModals() {
    if (freeTrialModal) freeTrialModal.style.display = 'none';
}

function copyToClipboard(textareaId) {
    // Legacy function for backwards compatibility
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textarea.value);
        } else {
            textarea.select();
            document.execCommand('copy');
        }
        
        const copyBtn = textarea.parentElement.querySelector('.copy-btn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    }
}

// Auto-resize helper used only for legacy showcase textareas
function adjustTextareaHeight(el) {
    if (!el) return;
    try {
        el.style.height = 'auto';
        const needed = el.scrollHeight;
        if (needed && needed > 0) {
            el.style.height = needed + 'px';
        }
    } catch (err) {
        console.warn('adjustTextareaHeight error', err);
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
