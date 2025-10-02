// Configuration
const CONFIG = {
    // Testing URL - currently active
    // N8N_FORM_URL: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/webhook-test/new-repo-request',
    
    // Production URL - uncomment when ready to go live
    N8N_FORM_URL: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/webhook/new-repo-request',
    
    GITHUB_API_BASE: 'https://api.github.com/repos/',
    
    //Test URL
    //LICENSE_VALIDATION_ENDPOINT: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/webhook-test/validate-gumroad-license-key',
    
    //Production URL
    LICENSE_VALIDATION_ENDPOINT: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/webhook/validate-gumroad-license-key',
    
    WEBHOOK_TIMEOUT: 300000, // 5 minutes timeout
};

// DOM Elements
const licenseKeyInput = document.getElementById('licenseKey');
const repoUrlInput = document.getElementById('repoUrl');
const submitBtn = document.getElementById('submitBtn');
const licenseInfo = document.getElementById('licenseInfo');
const urlValidation = document.getElementById('urlValidation');
const statusMessage = document.getElementById('statusMessage');
const analysisForm = document.getElementById('analysisForm');
const submitContainer = document.getElementById('submitContainer');

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
let virtualShowcaseData = []; // Store all showcase data from JSON

// Store generated free trial key for validation
let generatedFreeTrialKey = null;

// Maintenance and response state
let maintenanceInterval = null;
let webhookTimeout = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCachedLicenseKey();
    initializeShowcase();
    loadShowcaseFiles();
    checkMaintenanceModeOnLoad();
    startMaintenanceMonitor();
});

// -------------------------
// initializeEventListeners
// -------------------------
function initializeEventListeners() {
    // Form validation - INCREASED DEBOUNCE to 2000ms (2 seconds)
    if (licenseKeyInput) licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 2000));
    if (repoUrlInput) {
        repoUrlInput.addEventListener('input', debounce(() => {
            // Clean URL first
            const cleanedUrl = cleanGitHubUrl(repoUrlInput.value);
            if (cleanedUrl !== repoUrlInput.value) {
                repoUrlInput.value = cleanedUrl;
                // Visual feedback
                repoUrlInput.style.backgroundColor = '#f0fff0';
                setTimeout(() => {
                    repoUrlInput.style.backgroundColor = '';
                }, 1000);
            }
            // Then validate
            validateRepoUrl();
        }, 300));
    }
    
    // Form submission
    if (analysisForm) analysisForm.addEventListener('submit', handleFormSubmission);
    
    // Modal controls
    const closeBtns = document.querySelectorAll('.close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
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
// Maintenance Mode Functions
// -------------------------
function getISTTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 3600000));
    return ist;
}

function isMaintenanceTime() {
    const ist = getISTTime();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    return (hours === 1 && minutes >= 5 && minutes < 15);
}

function checkMaintenanceModeOnLoad() {
    if (isMaintenanceTime()) {
        createMaintenanceTimer();
    }
}

function startMaintenanceMonitor() {
    setInterval(() => {
        const isCurrentlyMaintenance = isMaintenanceTime();
        const hasMaintenanceTimer = document.getElementById('maintenanceTimer');
        
        if (isCurrentlyMaintenance && !hasMaintenanceTimer) {
            createMaintenanceTimer();
        } else if (!isCurrentlyMaintenance && hasMaintenanceTimer) {
            restoreSubmitButton();
        }
    }, 30000);
}

function createMaintenanceTimer() {
    if (!submitContainer) return;
    
    if (maintenanceInterval) {
        clearInterval(maintenanceInterval);
    }
    
    submitContainer.innerHTML = `
        <div id="maintenanceTimer" class="maintenance-container">
            <div class="maintenance-message">
                <h4>Daily Maintenance Running</h4>
                <p>System updates in progress. Please wait...</p>
            </div>
            <div class="countdown-display">
                <span id="countdownTime">Calculating...</span>
            </div>
            <small>Maintenance window: 1:05 AM - 1:15 AM IST</small>
        </div>
    `;
    
    updateCountdownTimer();
    maintenanceInterval = setInterval(updateCountdownTimer, 1000);
}

function updateCountdownTimer() {
    const countdownElement = document.getElementById('countdownTime');
    if (!countdownElement) return;
    
    const ist = getISTTime();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const seconds = ist.getSeconds();
    
    if (hours === 1 && minutes < 15) {
        const remainingMinutes = 14 - minutes;
        const remainingSeconds = 60 - seconds;
        
        if (remainingSeconds === 60) {
            remainingMinutes++;
            remainingSeconds = 0;
        }
        
        countdownElement.textContent = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`;
    } else {
        restoreSubmitButton();
    }
}

function restoreSubmitButton() {
    if (maintenanceInterval) {
        clearInterval(maintenanceInterval);
        maintenanceInterval = null;
    }
    
    if (submitContainer) {
        submitContainer.innerHTML = `
            <button type="submit" class="btn-primary btn-large" id="submitBtn" disabled>
                Analyze Repository
            </button>
        `;
        
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            analysisForm.removeEventListener('submit', handleFormSubmission);
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
        
        checkFormValidity();
    }
}

// -------------------------
// Response Container Functions - SIMPLIFIED TEXT MESSAGES
// -------------------------
function createResponseContainer() {
    if (!submitContainer) return;
    
    submitContainer.innerHTML = `
        <div id="responseContainer" class="response-container">
            <div class="response-header">
                <h4>Processing Repository Analysis</h4>
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <span>Please wait while we analyze your repository...</span>
                </div>
            </div>
            <div id="responseContent" class="response-content">
                <div class="status-message processing">⏳ Processing request - please wait...</div>
            </div>
            <div class="response-footer">
                <small>Processing timeout: 5 minutes</small>
            </div>
        </div>
    `;
}

function displayWebhookResponse(response, isSuccess = true) {
    const responseContent = document.getElementById('responseContent');
    const responseHeader = document.querySelector('.response-header h4');
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    if (!responseContent) return;
    
    if (webhookTimeout) {
        clearTimeout(webhookTimeout);
        webhookTimeout = null;
    }
    
    if (responseHeader) {
        responseHeader.textContent = isSuccess ? 'Request Submitted' : 'Request Failed';
    }
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    if (isSuccess) {
        const jobId = response.analysisId || response.analysis_id || response.requestId || 'N/A';
        responseContent.innerHTML = `
            <div class="response-success">
                <div class="status-message success">✅ Request submitted! Check email in 5-10 minutes. Job ID: ${jobId}</div>
                <div class="next-steps">
                </div>
                <button id="newAnalysisBtn" class="btn-secondary" onclick="resetForNewAnalysis()">
                    Submit New Request
                </button>
            </div>
        `;
    } else {
        const errorCode = response.code || response.error || 'UNKNOWN_ERROR';
        let errorMessage = '';
        
        switch(errorCode) {
            case 'LICENSE_NO_CREDITS':
                errorMessage = '❌ No credits remaining. Purchase more credits to continue.';
                break;
            case 'SERVICE_UNAVAILABLE':
            case '404':
                errorMessage = '❌ Service temporarily unavailable. Try again in 2-3 minutes.';
                break;
            case 'INVALID_LICENSE':
                errorMessage = '❌ Invalid license key. Please check and try again.';
                break;
            case 'TIMEOUT_ERROR':
                errorMessage = '⚠️ Request timeout. Check email in 10 minutes or try again.';
                break;
            default:
                errorMessage = `❌ ${response.message || 'Processing failed. Please try again.'}`;
        }
        
        responseContent.innerHTML = `
            <div class="response-error">
                <div class="status-message error">${errorMessage}</div>
                <div class="error-actions">
                    <button id="retryAnalysisBtn" class="btn-primary" onclick="retryAnalysis()">
                        Try Again
                    </button>
                    <button id="newAnalysisBtn" class="btn-secondary" onclick="resetForNewAnalysis()">
                        New Request
                    </button>
                </div>
            </div>
        `;
    }
}

function displayTimeoutResponse() {
    displayWebhookResponse({
        error: 'Request Timeout',
        message: 'Your request may still be processing - check email in 10 minutes.',
        code: 'TIMEOUT_ERROR'
    }, false);
}

function resetForNewAnalysis() {
    if (repoUrlInput) {
        repoUrlInput.value = '';
        repoUrlInput.disabled = false;
        repoUrlInput.readOnly = false;
        repoUrlInput.style.backgroundColor = '';
        repoUrlInput.style.border = '';
        repoUrlInput.style.cursor = '';
        updateUrlValidation('', '');
    }
    
    const autoLabel = document.querySelector('.auto-populated-label');
    if (autoLabel) autoLabel.remove();
    
    generatedFreeTrialKey = null;
    
    if (submitContainer) {
        submitContainer.innerHTML = `
            <button type="submit" class="btn-primary btn-large" id="submitBtn" disabled>
                Analyze Repository
            </button>
        `;
        
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            analysisForm.removeEventListener('submit', handleFormSubmission);
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
    }
    
    hideStatusMessage();
    checkFormValidity();
}

function retryAnalysis() {
    if (submitContainer) {
        submitContainer.innerHTML = `
            <button type="submit" class="btn-primary btn-large" id="submitBtn" disabled>
                Process Repository
            </button>
        `;
        
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            analysisForm.removeEventListener('submit', handleFormSubmission);
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
    }
    
    checkFormValidity();
}

// -------------------------
// Showcase Management
// -------------------------
function initializeShowcase() {
    showcaseItems = document.querySelectorAll('.showcase-item');
    
    // Only set up listeners on physical items (the 3 divs)
    showcaseItems.forEach(item => {
        const textarea = item.querySelector('textarea');
        if (textarea) {
            textarea.addEventListener('input', () => {
                try { 
                    adjustTextareaHeight(textarea); 
                } catch (err) { 
                    console.warn('Error adjusting textarea height:', err);
                }
            }, false);
        }
    });

    updateShowcaseDisplay();
}

function updateShowcaseDisplay() {
    const physicalItems = document.querySelectorAll('.showcase-item');
    
    // Hide all physical items
    physicalItems.forEach(item => item.classList.remove('active'));
    
    if (filteredItems.length > 0) {
        // Get current data from virtual array
        const currentData = filteredItems[currentShowcaseIndex];
        const currentTitle = currentData.title || `Repository ${currentShowcaseIndex + 1}`;
        const currentContent = currentData.content || 'No content available';
        
        // Update first physical item with current data
        const activePhysicalItem = physicalItems[0];
        activePhysicalItem.querySelector('h3').textContent = currentTitle;
        activePhysicalItem.querySelector('textarea').value = currentContent;
        activePhysicalItem.classList.add('active');

        setTimeout(() => {
            try {
                const textarea = activePhysicalItem.querySelector('textarea');
                if (textarea) {
                    adjustTextareaHeight(textarea);
                    adjustContainerToTextarea(activePhysicalItem);
                }
            } catch (err) {
                console.warn('Error adjusting heights:', err);
            }
        }, 50);

        // Update counters with virtual array length
        if (currentIndexSpan) currentIndexSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsSpan) totalItemsSpan.textContent = filteredItems.length;
        if (currentIndexBottomSpan) currentIndexBottomSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsBottomSpan) totalItemsBottomSpan.textContent = filteredItems.length;
        
        // Navigation buttons based on virtual array
        if (prevBtn) prevBtn.disabled = currentShowcaseIndex === 0;
        if (nextBtn) nextBtn.disabled = currentShowcaseIndex === filteredItems.length - 1;
        if (prevBtnBottom) prevBtnBottom.disabled = currentShowcaseIndex === 0;
        if (nextBtnBottom) nextBtnBottom.disabled = currentShowcaseIndex === filteredItems.length - 1;
    } else {
        if (currentIndexSpan) currentIndexSpan.textContent = '0';
        if (totalItemsSpan) totalItemsSpan.textContent = '0';
        if (currentIndexBottomSpan) currentIndexBottomSpan.textContent = '0';
        if (totalItemsBottomSpan) totalItemsBottomSpan.textContent = '0';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (prevBtnBottom) prevBtnBottom.disabled = true;
        if (nextBtnBottom) nextBtnBottom.disabled = true;
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

// -------------------------
// Search and Autocomplete Functions
// -------------------------
function handleSearchInput() {
    const query = showcaseSearch.value.toLowerCase().trim();
    
    if (query === '') {
        filteredItems = virtualShowcaseData; // Use virtual data
        currentShowcaseIndex = 0;
        updateShowcaseDisplay();
        updateAutocomplete([]);
        return;
    }
    
    // Filter virtual data instead of DOM elements
    filteredItems = virtualShowcaseData.filter(item => {
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        return title.includes(query) || content.includes(query);
    });
    
    currentShowcaseIndex = 0;
    updateShowcaseDisplay();
    
    const suggestions = generateAutocompleteSuggestions(query);
    updateAutocomplete(suggestions);
}

function generateAutocompleteSuggestions(query) {
    if (query.length < 2) return [];
    const suggestions = new Set();
    
    autocompleteData.forEach(item => {
        item.keywords.forEach(keyword => {
            if (keyword.includes(query) && keyword !== query) {
                suggestions.add(keyword);
            }
        });
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

// -------------------------
// Showcase Files Loading
// -------------------------
async function loadShowcaseFiles() {
    try {
        const response = await fetch('data/showcase/Showcase.json');
        if (response.ok) {
            const showcaseData = await response.json();
            
            // Store all data in virtual array
            virtualShowcaseData = showcaseData;
            filteredItems = virtualShowcaseData;
            
            // Build autocomplete data from virtual array
            autocompleteData = virtualShowcaseData.map(item => {
                return { 
                    title: item.title || 'Repository', 
                    keywords: extractKeywords((item.title || '') + ' ' + (item.content || '')) 
                };
            });

            // Display the first item
            currentShowcaseIndex = 0;
            updateShowcaseDisplay();

            console.log('Showcase files loaded successfully:', virtualShowcaseData.length, 'items');
        } else {
            console.log('Could not load showcase data, using existing content');
        }
    } catch (error) {
        console.error('Error loading showcase files:', error);
    }
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
    
    if (licenseKey.startsWith('FreeTrial-')) {
        if (generatedFreeTrialKey && licenseKey === generatedFreeTrialKey) {
            updateLicenseInfo('Free trial license - 1 analysis available', 'valid');
        } else {
            updateLicenseInfo('Invalid free trial key - please generate a new one', 'invalid');
        }
        cacheLicenseKey(licenseKey);
        checkFormValidity();
        return;
    }
    
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
            body: JSON.stringify({ license_key: licenseKey }),
            signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                let displayMessage = data.message || 'Valid license';
                
                const additionalInfo = [];
                for (const [key, value] of Object.entries(data)) {
                    if (key !== 'success' && key !== 'message' && value !== null && value !== undefined) {
                        const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                        additionalInfo.push(`${formattedKey}: ${value}`);
                    }
                }
                
                if (additionalInfo.length > 0) {
                    displayMessage += ' (' + additionalInfo.join(', ') + ')';
                }
                
                updateLicenseInfo(displayMessage, 'valid');
                cacheLicenseKey(licenseKey);
            } else {
                updateLicenseInfo(data.message || 'Invalid license key', 'invalid');
            }
        } else {
            updateLicenseInfo('Could not validate license key', 'invalid');
        }
    } catch (error) {
        console.error('License validation error:', error);
        
        if (error.name === 'AbortError') {
            updateLicenseInfo('Validation timeout - please try again', 'invalid');
        } else {
            updateLicenseInfo('Validation service unavailable', 'invalid');
        }
    }
    
    checkFormValidity();
}

function cleanGitHubUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    url = url.trim();
    
    if (!url.includes('github.com/')) return url;
    
    try {
        url = url
            .replace(/\.git$/, '')
            .replace(/\/$/, '')
            .replace(/#.*$/, '')
            .replace(/\?.*$/, '');
        
        const patterns = [
            /^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/.*$/,
            /^(https:\/\/github\.com\/[^\/]+\/[^\/]+)(?:\/(?:tree|blob|commit|commits|releases|issues|pull|wiki|actions|projects|security|insights|settings).*)?$/,
            /^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/archive\/.*$/,
            /^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/.*$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                if (match[1]) {
                    return match[1];
                } else if (match.length === 3) {
                    return `https://github.com/${match[1]}/${match[2]}`;
                }
            }
        }
        
        const simpleMatch = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)/);
        if (simpleMatch) {
            return simpleMatch[1];
        }
        
        return url;
        
    } catch (error) {
        console.warn('URL cleaning error:', error);
        return url;
    }
}

// -------------------------
// Repository URL Validation
// -------------------------
async function validateRepoUrl() {
    const repoUrlInput = document.getElementById('repoUrl');
    if (!repoUrlInput || repoUrlInput.disabled) {
        return;
    }
    
    const url = repoUrlInput.value.trim();
    if (!url) {
        updateUrlValidation('', '');
        return;
    }
    
    updateUrlValidation('Checking repository access...', '');
    
    const result = await window.validateGitHubRepositoryAccess(url);
    updateUrlValidation(result.message, result.type);
    checkFormValidity();
}

window.validateGitHubRepositoryAccess = async function(repoUrl) {
    const cleanedUrl = cleanGitHubUrl(repoUrl);
        
    if (!isValidGitHubUrl(cleanedUrl)) {
        return { 
            valid: false, 
            message: 'Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)',
            type: 'invalid' 
        };
    }
    
    const match = cleanedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match || !match[1] || !match[2]) {
        return { 
            valid: false, 
            message: 'Invalid GitHub URL format. Must include both owner and repository name.',
            type: 'invalid' 
        };
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '').replace(/\/$/, '');
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitHub-to-AI-ingester'
            },
            signal: AbortSignal.timeout(8000)
        });
        
        if (response.status === 200) {
            const data = await response.json();
            
            if (data.private) {
                return { 
                    valid: false, 
                    message: 'Repository is private. Only public repositories can be analyzed.',
                    type: 'invalid' 
                };
            }
            
            if (data.size === 0) {
                return { 
                    valid: false, 
                    message: 'Repository appears to be empty.',
                    type: 'invalid' 
                };
            }
            
            if (data.archived) {
                return { 
                    valid: true, 
                    message: `Valid public repository: ${data.full_name} (archived)`,
                    type: 'valid',
                    repoData: data
                };
            }
            
            return { 
                valid: true, 
                message: `Valid public repository: ${data.full_name}`,
                type: 'valid',
                repoData: data
            };
            
        } else if (response.status === 404) {
            return { 
                valid: false, 
                message: 'Repository not found. Please check the URL and ensure it exists and is publicly accessible.',
                type: 'invalid' 
            };
        } else if (response.status === 403) {
            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
            if (rateLimitReset) {
                const resetTime = new Date(parseInt(rateLimitReset) * 1000);
                const now = new Date();
                const waitMinutes = Math.ceil((resetTime - now) / 60000);
                return { 
                    valid: true, 
                    message: `GitHub API rate limited (resets in ${waitMinutes}min) - repository will be verified during submission.`,
                    type: 'valid' 
                };
            } else {
                return { 
                    valid: false, 
                    message: 'GitHub API access denied. Repository may be private or restricted.',
                    type: 'invalid' 
                };
            }
        } else if (response.status === 451) {
            return { 
                valid: false, 
                message: 'Repository is unavailable for legal reasons.',
                type: 'invalid' 
            };
        } else {
            return { 
                valid: false, 
                message: `GitHub API error (${response.status}). Please try again.`,
                type: 'invalid' 
            };
        }
        
    } catch (error) {
        console.error('Repository validation error:', error);
        
        if (error.name === 'AbortError') {
            return { 
                valid: true, 
                message: 'Validation timeout - repository will be verified during submission.',
                type: 'valid' 
            };
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            return { 
                valid: true, 
                message: 'Network error - repository will be verified during submission.',
                type: 'valid' 
            };
        } else {
            return { 
                valid: true, 
                message: 'Validation service unavailable - repository will be verified during submission.',
                type: 'valid' 
            };
        }
    }
};

function isValidGitHubUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    url = cleanGitHubUrl(url);
    
    if (!url.startsWith('https://github.com/')) return false;
    
    url = url.replace(/\.git$/, '').replace(/\/$/, '');
    
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    
    if (!githubRegex.test(url)) return false;
    
    const parts = url.split('/');
    if (parts.length !== 5) return false;
    
    const owner = parts[3];
    const repo = parts[4];
    
    if (owner.length === 0 || repo.length === 0) return false;
    if (owner.startsWith('.') || owner.endsWith('.')) return false;
    if (repo.startsWith('.') || repo.endsWith('.')) return false;
    if (owner.startsWith('-') || owner.endsWith('-')) return false;
    if (repo.startsWith('-') || repo.endsWith('-')) return false;
    
    const reservedNames = ['settings', 'notifications', 'explore', 'integrations', 'marketplace'];
    if (reservedNames.includes(owner.toLowerCase()) || reservedNames.includes(repo.toLowerCase())) return false;
    
    return true;
}

// -------------------------
// Form Submission Handler
// -------------------------
async function handleFormSubmission(e) {
    e.preventDefault();
    
    if (isMaintenanceTime()) {
        showStatusMessage('System is currently under maintenance. Please try again in a few minutes.', 'error');
        return;
    }
    
    const licenseKey = licenseKeyInput.value.trim();
    const repoUrl = repoUrlInput.value.trim();
    const discordId = document.getElementById('discordId')?.value.trim() || '';
    const trialEmail = document.getElementById('trialEmail')?.value.trim() || '';
    const trialRepoUrl = document.getElementById('trialRepoUrl')?.value.trim() || '';
    
    if (!licenseKey || !repoUrl) {
        showStatusMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const payload = {
        license_key: licenseKey,
        repository_url: repoUrl,
        discord_id: discordId,
        email: trialEmail,
        trial_repository_url: trialRepoUrl,
        is_free_trial: licenseKey.startsWith('FreeTrial-'),
        timestamp: new Date().toISOString(),
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        submission_source: 'github_ai_ingester_web'
    };
    
    console.log('Sending payload:', payload);
    
    createResponseContainer();
    
    webhookTimeout = setTimeout(() => {
        displayTimeoutResponse();
    }, CONFIG.WEBHOOK_TIMEOUT);
    
    try {
        const response = await fetch(CONFIG.N8N_FORM_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Webhook response:', data);
            
            if (data.status === 'error') {
                displayWebhookResponse(data, false);
            } else {
                displayWebhookResponse({
                    status: data.status || 'Success',
                    message: data.message || 'Analysis request submitted successfully!',
                    analysisId: data.analysisId || data.analysis_id || data.requestId,
                    estimatedTime: data.estimatedTime || data.estimated_time || data.estimatedProcessingTime,
                    repositoryName: data.repositoryName || data.repository_name
                }, true);
            }
            
        } else {
            let errorData;
            try {
                errorData = await response.json();
                displayWebhookResponse(errorData, false);
            } catch {
                errorData = { error: 'Server Error', message: `HTTP ${response.status}: ${response.statusText}` };
                displayWebhookResponse(errorData, false);
            }
        }
    } catch (error) {
        console.error('Submission error:', error);
        
        displayWebhookResponse({
            error: 'Network Error',
            message: 'Failed to connect to the server. Please check your internet connection and try again.',
            code: 'NETWORK_ERROR'
        }, false);
    }
    
    if (licenseKey.startsWith('FreeTrial-') && window.freeTrialManager) {
        try {
            await window.freeTrialManager.markFreeTrialAsUsed(licenseKey);
        } catch (error) {
            console.log('Could not mark free trial as used:', error.message);
        }
    }
}

// -------------------------
// Free Trial Integration Functions
// -------------------------
function setGeneratedFreeTrialKey(key) {
    generatedFreeTrialKey = key;
}

// -------------------------
// Utility Functions
// -------------------------
function isValidLicenseFormat(key) {
    return key.length >= 8 && /^[A-Z0-9-]+$/i.test(key);
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
    const currentSubmitBtn = document.getElementById('submitBtn');
    if (!currentSubmitBtn) return;
    
    const licenseValid = licenseInfo && licenseInfo.classList.contains('valid');
    const urlValid = urlValidation && urlValidation.classList.contains('valid');
    const bothFilled = licenseKeyInput && repoUrlInput && 
                       licenseKeyInput.value.trim() && repoUrlInput.value.trim();
    
    currentSubmitBtn.disabled = !(licenseValid && urlValid && bothFilled);
}

function showStatusMessage(message, type) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
    }
}

function hideStatusMessage() {
    if (statusMessage) {
        statusMessage.className = 'status-message';
    }
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

function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
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

function adjustTextareaHeight(el) {
    if (!el) return;
    try {
        el.style.height = 'auto';
        const needed = el.scrollHeight;
        if (needed && needed > 0) {
            el.style.height = Math.max(needed, 80) + 'px';
        }
    } catch (err) {
        console.warn('adjustTextareaHeight error:', err);
    }
}

function adjustContainerToTextarea(showcaseItem) {
    if (!showcaseItem) return;
    
    try {
        const textarea = showcaseItem.querySelector('textarea');
        const header = showcaseItem.querySelector('.showcase-header');
        
        if (textarea && header) {
            textarea.style.height = 'auto';
            let textareaHeight = textarea.scrollHeight;
            textareaHeight = Math.max(textareaHeight, 80);
            textarea.style.height = textareaHeight + 'px';
            
            let scaleFactor = 0.85;
            if (window.innerWidth <= 768) scaleFactor = 0.8;
            if (window.innerWidth <= 480) scaleFactor = 0.75;
            
            const scaledTextareaHeight = textareaHeight * scaleFactor;
            const headerHeight = header.offsetHeight || 60;
            const totalHeight = headerHeight + scaledTextareaHeight + 2;
            showcaseItem.style.height = totalHeight + 'px';
        }
    } catch (err) {
        console.warn('Error adjusting container height:', err);
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
