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
const singlePurchaseModal = document.getElementById('singlePurchaseModal');
const freeTrialBtn = document.getElementById('freeTrial');
const singlePurchaseBtn = document.getElementById('singlePurchase');
const closeBtns = document.querySelectorAll('.close');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCachedLicenseKey();
    loadShowcaseFiles();
});

function initializeEventListeners() {
    // Form validation
    licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 500));
    repoUrlInput.addEventListener('input', debounce(validateRepoUrl, 300));
    
    // Form submission
    analysisForm.addEventListener('submit', handleFormSubmission);
    
    // Modal controls
    freeTrialBtn.addEventListener('click', () => openModal(freeTrialModal));
    singlePurchaseBtn.addEventListener('click', () => openModal(singlePurchaseModal));
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Free trial form
    document.getElementById('freeTrialForm').addEventListener('submit', handleFreeTrialSubmission);
    
    // Showcase search
    document.getElementById('showcaseSearch').addEventListener('input', debounce(searchShowcase, 300));
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
        // This should call your backend endpoint, not Gumroad directly
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
    
    // Disable form during submission
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
            
            // Clear form for next use
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
    
    const email = document.getElementById('trialEmail').value;
    const discordId = document.getElementById('discordId').value;
    const freeKey = generateFreeLicenseKey();
    
    // Auto-populate main form
    licenseKeyInput.value = freeKey;
    licenseKeyInput.disabled = true;
    
    // Show success and close modal
    alert(`Free trial activated! License key: ${freeKey}`);
    closeModals();
    
    // Validate the pre-filled license
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
    // Basic validation - adjust based on Gumroad's actual format
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
    localStorage.setItem('github_ai_license', key);
}

function loadCachedLicenseKey() {
    const cached = localStorage.getItem('github_ai_license');
    if (cached) {
        licenseKeyInput.value = cached;
        validateLicenseKey();
    }
}

// Modal Functions
function openModal(modal) {
    modal.style.display = 'block';
}

function closeModals() {
    freeTrialModal.style.display = 'none';
    singlePurchaseModal.style.display = 'none';
}

// Showcase Functions
async function loadShowcaseFiles() {
    // This would load files from your data/showcase directory
    // For now, showing placeholder
    const showcaseGrid = document.getElementById('showcaseGrid');
    
    // You'll need to implement this based on your actual file structure
    // This is just a placeholder for the structure
    console.log('Showcase files would be loaded here');
}

function searchShowcase() {
    const query = document.getElementById('showcaseSearch').value.toLowerCase();
    const items = document.querySelectorAll('.showcase-item');
    
    items.forEach(item => {
        const title = item.querySelector('h3').textContent.toLowerCase();
        const content = item.querySelector('textarea').value.toLowerCase();
        const matches = title.includes(query) || content.includes(query);
        item.style.display = matches ? 'block' : 'none';
    });
}

function copyToClipboard(textareaId) {
    const textarea = document.getElementById(textareaId);
    textarea.select();
    document.execCommand('copy');
    
    // Visual feedback
    const copyBtn = textarea.parentElement.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(
