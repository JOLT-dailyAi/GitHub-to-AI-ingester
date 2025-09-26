// Configuration
const CONFIG = {
    // Testing URL - currently active
    N8N_FORM_URL: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/form-test/45f473b3-3bb4-49f0-b2f0-b63ec6ea343a',
    
    // Production URL - uncomment when ready to go live
    // N8N_FORM_URL: 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/form/45f473b3-3bb4-49f0-b2f0-b63ec6ea343a',
    
    GITHUB_API_BASE: 'https://api.github.com/repos/',
    LICENSE_VALIDATION_ENDPOINT: 'https://api.yourdomain.com/webhook/validate-license',
    WEBHOOK_TIMEOUT: 300000 // 5 minutes timeout
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

function initializeEventListeners() {
    // Form validation
    if (licenseKeyInput) licenseKeyInput.addEventListener('input', debounce(validateLicenseKey, 500));
    if (repoUrlInput) repoUrlInput.addEventListener('input', debounce(validateRepoUrl, 300));
    
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
    // Convert to IST (UTC+5:30)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 3600000));
    return ist;
}

function isMaintenanceTime() {
    const ist = getISTTime();
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    
    // Check if time is between 1:05 AM and 1:15 AM IST
    return (hours === 1 && minutes >= 5 && minutes < 15);
}

function checkMaintenanceModeOnLoad() {
    if (isMaintenanceTime()) {
        createMaintenanceTimer();
    }
}

function startMaintenanceMonitor() {
    // Check every 30 seconds for maintenance window
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
    
    // Clear any existing intervals
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
        // Maintenance window ended
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
        
        // Re-attach event listener to new button
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            // Remove old listener if exists
            analysisForm.removeEventListener('submit', handleFormSubmission);
            // Add new listener
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
        
        // Re-validate form to set correct button state
        checkFormValidity();
    }
}

// -------------------------
// Response Container Functions
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
                <div class="response-placeholder">
                    <p>⏳ Initializing analysis...</p>
                    <p>📡 Connecting to processing server...</p>
                    <p>🔄 This may take several minutes depending on repository size...</p>
                </div>
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
    
    // Clear timeout
    if (webhookTimeout) {
        clearTimeout(webhookTimeout);
        webhookTimeout = null;
    }
    
    // Update header
    if (responseHeader) {
        responseHeader.textContent = isSuccess ? 'Analysis Complete' : 'Analysis Failed';
    }
    
    // Hide loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Display response
    if (isSuccess) {
        responseContent.innerHTML = `
            <div class="response-success">
                <div class="success-icon">✅</div>
                <h5>Repository Analysis Successful!</h5>
                <div class="response-details">
                    <p><strong>Status:</strong> ${response.status || 'Completed'}</p>
                    <p><strong>Message:</strong> ${response.message || 'Analysis request submitted successfully!'}</p>
                    ${response.analysisId ? `<p><strong>Analysis ID:</strong> ${response.analysisId}</p>` : ''}
                    ${response.estimatedTime ? `<p><strong>Est. Completion:</strong> ${response.estimatedTime}</p>` : ''}
                </div>
                <div class="next-steps">
                    <h6>What's Next?</h6>
                    <ul>
                        <li>Check your email for results within 5-10 minutes</li>
                        <li>Results will also be posted to Discord (if provided)</li>
                        <li>Large repositories may take longer to process</li>
                    </ul>
                </div>
                <button id="newAnalysisBtn" class="btn-secondary" onclick="resetForNewAnalysis()">
                    Start New Analysis
                </button>
            </div>
        `;
    } else {
        responseContent.innerHTML = `
            <div class="response-error">
                <div class="error-icon">❌</div>
                <h5>Analysis Failed</h5>
                <div class="error-details">
                    <p><strong>Error:</strong> ${response.error || 'Unknown error occurred'}</p>
                    <p><strong>Message:</strong> ${response.message || 'Please try again or contact support.'}</p>
                    ${response.code ? `<p><strong>Error Code:</strong> ${response.code}</p>` : ''}
                </div>
                <div class="troubleshooting">
                    <h6>Troubleshooting:</h6>
                    <ul>
                        <li>Check if the repository URL is correct and accessible</li>
                        <li>Verify your license key has remaining credits</li>
                        <li>Try again in a few minutes</li>
                        <li>Contact support if the issue persists</li>
                    </ul>
                </div>
                <div class="error-actions">
                    <button id="retryAnalysisBtn" class="btn-primary" onclick="retryAnalysis()">
                        Try Again
                    </button>
                    <button id="newAnalysisBtn" class="btn-secondary" onclick="resetForNewAnalysis()">
                        New Analysis
                    </button>
                </div>
            </div>
        `;
    }
}

function displayTimeoutResponse() {
    displayWebhookResponse({
        error: 'Request Timeout',
        message: 'The analysis request timed out after 5 minutes. Your request may still be processing in the background.',
        code: 'TIMEOUT_ERROR'
    }, false);
}

function resetForNewAnalysis() {
    // Clear the repo URL field and re-enable it
    if (repoUrlInput) {
        repoUrlInput.value = '';
        repoUrlInput.disabled = false;
        updateUrlValidation('', '');
    }
    
    // Reset generated free trial key
    generatedFreeTrialKey = null;
    
    // Restore submit button
    if (submitContainer) {
        submitContainer.innerHTML = `
            <button type="submit" class="btn-primary btn-large" id="submitBtn" disabled>
                Analyze Repository
            </button>
        `;
        
        // Re-attach event listener
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            analysisForm.removeEventListener('submit', handleFormSubmission);
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
    }
    
    // Clear status message
    hideStatusMessage();
    
    // Re-validate form
    checkFormValidity();
}

function retryAnalysis() {
    // Simply restore the submit button without clearing fields
    if (submitContainer) {
        submitContainer.innerHTML = `
            <button type="submit" class="btn-primary btn-large" id="submitBtn" disabled>
                Analyze Repository
            </button>
        `;
        
        // Re-attach event listener
        const newSubmitBtn = document.getElementById('submitBtn');
        if (newSubmitBtn && analysisForm) {
            analysisForm.removeEventListener('submit', handleFormSubmission);
            analysisForm.addEventListener('submit', handleFormSubmission);
        }
    }
    
    // Re-validate form
    checkFormValidity();
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
                try { 
                    adjustTextareaHeight(el); 
                } catch (err) { 
                    console.warn('Error adjusting textarea height:', err);
                }
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

        // Adjust heights after DOM updates
        setTimeout(() => {
            try {
                const activeItem = filteredItems[currentShowcaseIndex];
                if (activeItem) {
                    const textarea = activeItem.querySelector('textarea');
                    if (textarea) {
                        adjustTextareaHeight(textarea);
                        adjustContainerToTextarea(activeItem);
                    }
                }
            } catch (err) {
                console.warn('Error adjusting heights for active showcase item:', err);
            }
        }, 50);

        // Update counters
        if (currentIndexSpan) currentIndexSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsSpan) totalItemsSpan.textContent = filteredItems.length;
        if (currentIndexBottomSpan) currentIndexBottomSpan.textContent = currentShowcaseIndex + 1;
        if (totalItemsBottomSpan) totalItemsBottomSpan.textContent = filteredItems.length;
        
        // Update navigation buttons
        if (prevBtn) prevBtn.disabled = currentShowcaseIndex === 0;
        if (nextBtn) nextBtn.disabled = currentShowcaseIndex === filteredItems.length - 1;
        if (prevBtnBottom) prevBtnBottom.disabled = currentShowcaseIndex === 0;
        if (nextBtnBottom) nextBtnBottom.disabled = currentShowcaseIndex === filteredItems.length - 1;
    } else {
        // No filtered items
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
        filteredItems = Array.from(showcaseItems);
        currentShowcaseIndex = 0;
        updateShowcaseDisplay();
        updateAutocomplete([]);
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

            // Initialize autocomplete data
            autocompleteData = Array.from(showcaseItems).map(item => {
                const title = item.querySelector('h3').textContent;
                const content = item.querySelector('textarea').value;
                return { title: title, keywords: extractKeywords(title + ' ' + content) };
            });

            // Adjust heights for active item
            setTimeout(() => {
                try {
                    showcaseItems.forEach(item => {
                        if (item.classList.contains('active')) {
                            const textarea = item.querySelector('textarea');
                            if (textarea) {
                                adjustTextareaHeight(textarea);
                                adjustContainerToTextarea(item);
                            }
                        }
                    });
                } catch (err) {
                    console.warn('Error adjusting heights after loading showcase files:', err);
                }
            }, 100);

            console.log('Showcase files loaded successfully');
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
        // Validate if this matches the generated free trial key
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
    const repoUrlInput = document.getElementById('repoUrl');
    if (!repoUrlInput || repoUrlInput.disabled) {
        return; // Skip validation if field is disabled (populated from free trial)
    }
    
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
    
    // Check maintenance mode first
    if (isMaintenanceTime()) {
        showStatusMessage('System is currently under maintenance. Please try again in a few minutes.', 'error');
        return;
    }
    
    const licenseKey = licenseKeyInput.value.trim();
    const repoUrl = repoUrlInput.value.trim();
    
    if (!licenseKey || !repoUrl) {
        showStatusMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Create response container
    createResponseContainer();
    
    // Set timeout for webhook response
    webhookTimeout = setTimeout(() => {
        displayTimeoutResponse();
    }, CONFIG.WEBHOOK_TIMEOUT);
    
    try {
        const response = await fetch(CONFIG.N8N_FORM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                license_key: licenseKey, 
                repository_url: repoUrl, 
                timestamp: new Date().toISOString() 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // If using a free trial key, mark it as used
            if (licenseKey.startsWith('FreeTrial-') && window.freeTrialManager) {
                await window.freeTrialManager.markFreeTrialAsUsed(licenseKey);
            }
            
            // Display success response
            displayWebhookResponse({
                status: data.status || 'Success',
                message: data.message || 'Analysis request submitted successfully! Check your email and Discord for results within 5-10 minutes.',
                analysisId: data.analysisId,
                estimatedTime: data.estimatedTime
            }, true);
            
        } else {
            // Handle HTTP error responses
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: 'Server Error', message: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            displayWebhookResponse({
                error: errorData.error || 'Request Failed',
                message: errorData.message || 'Failed to submit analysis request. Please try again.',
                code: errorData.code || `HTTP_${response.status}`
            }, false);
        }
    } catch (error) {
        console.error('Submission error:', error);
        
        displayWebhookResponse({
            error: 'Network Error',
            message: 'Failed to connect to the server. Please check your internet connection and try again.',
            code: 'NETWORK_ERROR'
        }, false);
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
    const currentSubmitBtn = document.getElementById('submitBtn');
    if (!currentSubmitBtn) return; // No submit button (in maintenance or response mode)
    
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
