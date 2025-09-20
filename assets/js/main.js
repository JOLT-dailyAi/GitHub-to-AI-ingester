// Configuration
const CONFIG = {
    // Your n8n form trigger URL - will be masked via Cloudflare
    N8N_FORM_URL: 'https://api.yourdomain.com/form/45f473b3-3bb4-49f0-b2f0-b63ec6ea343a',
    // GitHub API endpoint for validation
    GITHUB_API_BASE: 'https://api.github.com/repos/',
    // License validation endpoint (your backend)
    LICENSE_VALIDATION_ENDPOINT: 'https://api.yourdomain.com/webhook/validate-license'
};

// In-memory storage for session data (replacing localStorage)
const sessionData = {
    licenseKey: '',
    userEmail: '',
    discordId: ''
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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
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
    
    // Showcase search
    const showcaseSearch = document.getElementById('showcaseSearch');
    if (showcaseSearch) {
        showcaseSearch.addEventListener('input', debounce(searchShowcase, 300));
    }

    // Submit review button
    const submitReviewBtn = document.getElementById('submitReview');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', handleReviewSubmission);
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
        sessionData.licenseKey = licenseKey;
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
                sessionData.licenseKey = licenseKey;
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
                user_email: sessionData.userEmail || '',
                discord_id: sessionData.discordId || '',
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
    
    const email = document.getElementById('trialEmail').value.trim();
    const discordId = document.getElementById('discordId').value.trim();
    
    if (!email) {
        alert('Please enter your email address.');
        return;
    }
    
    const freeKey = generateFreeLicenseKey();
    
    // Store user info in session
    sessionData.userEmail = email;
    sessionData.discordId = discordId;
    sessionData.licenseKey = freeKey;
    
    // Auto-populate main form
    licenseKeyInput.value = freeKey;
    
    // Close modal first
    closeModals();
    
    // Show success message
    showStatusMessage(`Free trial activated! License key: ${freeKey}`, 'success');
    
    // Validate the pre-filled license
    // Review Submission Handler
function handleReviewSubmission() {
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!reviewText) {
        alert('Please write a review before submitting.');
        return;
    }
    
    // Here you would typically send the review to your backend
    // For now, just show a success message
    alert('Thank you for your review! It will be displayed after moderation.');
    document.getElementById('reviewText').value = '';
}

// Utility Functions
function generateFreeLicenseKey() {
    const today = new Date();
    const day = today.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const year = today.getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `FREETRIAL${day}${year}${randomSuffix}`;
}

function isValidLicenseFormat(key) {
    // Basic validation - adjust based on your actual format
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

// Modal Functions
function openModal(modal) {
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeModals() {
    if (freeTrialModal) {
        freeTrialModal.style.display = 'none';
    }
    document.body.style.overflow = ''; // Restore scrolling
}

// Showcase Functions
async function loadShowcaseFiles() {
    try {
        // Load VibeDrips showcase file
        const vibeDripsUrl = 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/main/data/showcase/VibeDrips.txt';
        const vibeDripsResponse = await fetch(vibeDripsUrl);
        if (vibeDripsResponse.ok) {
            const vibeDripsContent = await vibeDripsResponse.text();
            const showcase1 = document.getElementById('showcase1');
            if (showcase1) {
                showcase1.value = vibeDripsContent;
            }
        } else {
            console.error('Failed to load VibeDrips showcase file');
            const showcase1 = document.getElementById('showcase1');
            if (showcase1) {
                showcase1.value = 'Failed to load VibeDrips analysis content.';
            }
        }
        
        // For GitHub-to-AI-ingester showcase, create dynamic content or load from file
        const showcase2 = document.getElementById('showcase2');
        if (showcase2) {
            showcase2.value = `Loading GitHub-to-AI-ingester analysis...

This would contain the analysis output for the GitHub-to-AI-ingester repository itself.
You can replace this with actual content from a file or generate it dynamically.

Example structure:
════════════════════════════════════════════════════════════════════════════════
📊 REPOSITORY: GITHUB-TO-AI-INGESTER (👤 JOLT-dailyAi)
════════════════════════════════════════════════════════════════════════════════
🌐 Web Application
🔗 https://github.com/JOLT-dailyAi/GitHub-to-AI-ingester

📊 STATS
├── 📏 Size: 192.29 KB
├── 📁 Directories: 6
├── 📄 Files: 10
└── 🏗️ Max Depth: 2

💡 TECH STACK:
Markdown 📖, HTML 🌐, JavaScript ⚡, CSS 🎨
════════════════════════════════════════════════════════════════════════════════`;
        }
        
    } catch (error) {
        console.error('Error loading showcase files:', error);
        const showcase1 = document.getElementById('showcase1');
        const showcase2 = document.getElementById('showcase2');
        if (showcase1) showcase1.value = 'Error loading showcase content.';
        if (showcase2) showcase2.value = 'Error loading showcase content.';
    }
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
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            
            // Visual feedback
            const copyBtn = textarea.parentElement.querySelector('.copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard. Please select the text manually.');
        }
    }
}

// Debounce function to limit API calls
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        closeModals();
    }
    
    // Ctrl/Cmd + Enter submits form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !submitBtn.disabled) {
        handleFormSubmission(e);
    }
});

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showStatusMessage('An unexpected error occurred. Please refresh the page and try again.', 'error');
});

// Service worker registration (if you have one)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
