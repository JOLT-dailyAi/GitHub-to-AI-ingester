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

// Showcase elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentIndexSpan = document.getElementById('currentIndex');
const totalItemsSpan = document.getElementById('totalItems');
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
    licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 500));
    repoUrlInput.addEventListener('input', debounce(validateRepoUrl, 300));
    
    // Form submission
    analysisForm.addEventListener('submit', handleFormSubmission);
    
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
    
    // Showcase navigation
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', showPreviousShowcase);
        nextBtn.addEventListener('click', showNextShowcase);
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

// Showcase Management
function initializeShowcase() {
    showcaseItems = document.querySelectorAll('.showcase-item');
    filteredItems = Array.from(showcaseItems);
+
+    // Auto-resize textareas inside Showcase items
+    const showcaseTextareas = document.querySelectorAll('.showcase-item textarea');
+    showcaseTextareas.forEach((el) => {
+        el.style.height = el.scrollHeight + "px";
+        el.style.overflowY = "hidden";
+        el.addEventListener("input", (e) => {
+            e.target.style.height = "auto";
+            e.target.style.height = e.target.scrollHeight + "px";
+        });
+    });
+
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
        if (currentIndexSpan) currentIndexSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsSpan) totalItemsSpan.textContent = filteredItems.length;
        
        // Update navigation buttons
        if (prevBtn) prevBtn.disabled = currentShowcaseIndex === 0;
        if (nextBtn) nextBtn.disabled = currentShowcaseIndex === filteredItems.length - 1;
    } else {
        if (currentIndexSpan) currentIndexSpan.textContent = '0';
        if (totalItemsSpan) totalItemsSpan.textContent = '0';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
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

// Search and Autocomplete Functions
function handleSearchInput() {
    const query = showcaseSearch.value.toLowerCase().trim();
    
    if (query === '') {
        filteredItems = Array.from(showcaseItems);
        currentShowcaseIndex = 0;
        updateShowcaseDisplay();
        updateAutocomplete([]);
        return;
    }
    
    // Filter showcase items (original search functionality)
    filteredItems = Array.from(showcaseItems).filter(item => {
        const title = item.querySelector('h3').textContent.toLowerCase();
        const content = item.querySelector('textarea').value.toLowerCase();
        return title.includes(query) || content.includes(query);
    });
    
    currentShowcaseIndex = 0;
    updateShowcaseDisplay();
    
    // Update autocomplete suggestions
    const suggestions = generateAutocompleteSuggestions(query);
    updateAutocomplete(suggestions);
}

function generateAutocompleteSuggestions(query) {
    if (query.length < 2) return [];
    
    const suggestions = new Set();
    
    // Add matching keywords from all items
    autocompleteData.forEach(item => {
        item.keywords.forEach(keyword => {
            if (keyword.includes(query) && keyword !== query) {
                suggestions.add(keyword);
            }
        });
        
        // Add title if it matches
        if (item.title.toLowerCase().includes(query)) {
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

function extractKeywords(text) {
    const words = text.toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 20);
    
    return [...new Set(words)];
}

// Showcase Files Loading (your original working function)
async function loadShowcaseFiles() {
    try {
        const showcaseGrid = document.getElementById('showcaseGrid') || document.querySelector('.showcase-container');
        
        // Load the actual showcase data from your JSON
        const response = await fetch('data/showcase/Showcase.json');
        if (response.ok) {
            const showcaseData = await response.json();
            
            // Update existing showcase items with real data
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
            autocompleteData = Array.from(showcaseItems).map(item => {
                const title = item.querySelector('h3').textContent;
                const content = item.querySelector('textarea').value;
                return {
                    title: title,
                    keywords: extractKeywords(title + ' ' + content)
                };
            });
            
            console.log('Showcase files loaded successfully');
        } else {
            console.log('Could not load showcase data, using existing content');
        }
    } catch (error) {
        console.error('Error loading showcase files:', error);
    }
}

// License Key Validation
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
            headers: {
                'Content-Type': 'application/json'
            },
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

// Repository URL Validation
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

// Form Submission Handler
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: licenseKey,
                repository_url: repoUrl,
                timestamp: new Date().toISOString()
            })
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
        showStatusMessage('Failed to submit request. Please try again or contact support.', 'error');
    } finally {
        setFormLoading(false);
    }
}

// Free Trial Handler
function handleFreeTrialSubmission(e) {
    e.preventDefault();
    
    const freeKey = generateFreeLicenseKey();
    
    licenseKeyInput.value = freeKey;
    licenseKeyInput.disabled = true;
    
    alert(`Free trial activated! License key: ${freeKey}`);
    closeModals();
    
    validateLicenseKey();
}

// Utility Functions
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
    licenseInfo.textContent = message;
    licenseInfo.className = `license-info ${type}`;
}

function updateUrlValidation(message, type) {
    urlValidation.textContent = message;
    urlValidation.className = `url-validation ${type}`;
}

function checkFormValidity() {
    const licenseValid = licenseInfo.classList.contains('valid');
    const urlValid = urlValidation.classList.contains('valid');
    const bothFilled = licenseKeyInput.value.trim() && repoUrlInput.value.trim();
    
    submitBtn.disabled = !(licenseValid && urlValid && bothFilled);
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

function hideStatusMessage() {
    statusMessage.className = 'status-message';
}

function setFormLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Submitting...' : 'Analyze Repository';
    analysisForm.classList.toggle('loading', loading);
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
        if (cached) {
            licenseKeyInput.value = cached;
            validateLicenseKey();
        }
    } catch (e) {
        console.log('LocalStorage not available');
    }
}

function openModal(modal) {
    modal.style.display = 'block';
}

function closeModals() {
    if (freeTrialModal) freeTrialModal.style.display = 'none';
}

function copyToClipboard(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.select();
        document.execCommand('copy');
        
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
