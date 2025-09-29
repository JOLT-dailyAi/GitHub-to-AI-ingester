class FreeTrialManager {
    constructor() {
        this.config = {
            SHOWCASE_JSON_URL: 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/refs/heads/main/data/showcase/Showcase.json',
            DISPOSABLE_EMAIL_DOMAINS: [
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
                'throwaway.email', 'temp-mail.org', 'getairmail.com', 'sharklasers.com',
                'yopmail.com', 'emailondeck.com', 'trashmail.com', '33mail.com'
            ]
        };

        this.state = {
            cookieConsentGiven: false,
            vpnDetected: false,
            emailValidated: false,
            repositoryChecked: false,
            hasUsedTrial: false
        };

        // Initialize improved detectors
        this.vpnDetector = new ImprovedVPNDetection();
        this.cookieManager = ImprovedCookieManager;
        
        // Store generated key for validation
        this.generatedKey = null;

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const freeTrialBtn = document.getElementById('freeTrial');
        if (freeTrialBtn) {
            freeTrialBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFreeTrialButtonClick();
            });
        }

        const freeTrialForm = document.getElementById('freeTrialForm');
        if (freeTrialForm) {
            freeTrialForm.addEventListener('submit', (e) => this.handleFreeTrialFormSubmission(e));
        }

        const trialEmailInput = document.getElementById('trialEmail');
        if (trialEmailInput) {
            trialEmailInput.addEventListener('input', this.debounce(() => this.validateTrialEmail(), 500));
            trialEmailInput.addEventListener('blur', () => this.validateTrialEmail());
        }

        // Add real-time repo validation
        const trialRepoInput = document.getElementById('trialRepoUrl');
        if (trialRepoInput) {
            trialRepoInput.addEventListener('input', this.debounce(() => {
                // Clean URL first
                const cleanedUrl = cleanGitHubUrl(trialRepoInput.value);
                if (cleanedUrl !== trialRepoInput.value) {
                    trialRepoInput.value = cleanedUrl;
                    // Visual feedback
                    trialRepoInput.style.backgroundColor = '#f0fff0';
                    setTimeout(() => {
                        trialRepoInput.style.backgroundColor = '';
                    }, 1000);
                }
                // Then validate
                this.validateTrialRepository();
            }, 500));
            trialRepoInput.addEventListener('blur', () => this.validateTrialRepository());
        }
    }

    async handleFreeTrialButtonClick() {
        const freeTrialBtn = document.getElementById('freeTrial');
        if (!freeTrialBtn) return;

        this.updateButtonState(freeTrialBtn, 'loading', 'Checking connection...');

        try {
            // Check cookies with improved detection
            const cookieCheck = this.cookieManager.areCookiesEnabled();
            console.log('Cookie check result:', cookieCheck);
            
            if (!cookieCheck.overall) {
                this.showNotification('Cookies required for free trial. Please enable cookies and try again.', 'error', 5000);
                this.cookieManager.showCookieEnableInstructions();
                this.resetButton(freeTrialBtn);
                return;
            }

            // Check VPN with improved detection
            this.updateButtonState(freeTrialBtn, 'loading', 'Checking network...');
            const isVPN = await this.vpnDetector.detectVPN();
            console.log('VPN detection result:', isVPN);
            
            if (isVPN) {
                this.handleVPNDetected(freeTrialBtn);
                return;
            }

            // Check if email already used trial
            const email = this.getCurrentEmailValue();
            console.log('Current email value:', email);
            
            if (email && email.length > 0) {
                console.log('Checking if email has used trial...');
                const hasUsedTrial = await this.hasEmailUsedTrial(email);
                console.log('Email trial check result:', hasUsedTrial);
                
                if (hasUsedTrial) {
                    this.showNotification('Free trial already used this month for this email.', 'error', 5000);
                    this.resetButton(freeTrialBtn);
                    return;
                }
            }

            // Check cookie consent
            console.log('Checking cookie consent...');
            const hasConsent = this.checkCookieConsent();
            console.log('Cookie consent result:', hasConsent);
            
            // Proceed to modal
            if (hasConsent) {
                console.log('Showing free trial modal...');
                this.showFreeTrialModal();
            } else {
                console.log('Showing cookie consent modal...');
                this.showCookieConsentModal();
            }
            
            this.resetButton(freeTrialBtn);

        } catch (error) {
            console.error('Free trial initialization error:', error);
            this.showNotification('Network check failed. Please check your connection and try again.', 'error', 5000);
            this.resetButton(freeTrialBtn);
        }
    }

    updateButtonState(button, state, text) {
        if (!button) return;
        button.textContent = text;
        button.disabled = true;
        button.classList.remove('btn-loading', 'btn-blocked');
        if (state !== 'default') button.classList.add(`btn-${state}`);
    }

    resetButton(button) {
        if (!button) return;
        button.textContent = 'Try once for free';
        button.disabled = false;
        button.classList.remove('btn-loading', 'btn-blocked');
    }

    handleVPNDetected(button) {
        this.state.vpnDetected = true;
        this.updateButtonState(button, 'blocked', 'VPN Detected - Please Disable');
        this.showNotification('VPN/Proxy detected. Please disable VPN to access free trial.', 'warning', 7000);
        
        // Auto-reset button after 30 seconds
        setTimeout(() => {
            if (button) this.resetButton(button);
        }, 30000);
    }

    // Cookie and Consent Management
    checkCookieConsent() {
        return this.getCookie('freeTrialConsent') === 'true' || 
               localStorage.getItem('freeTrialConsent') === 'true';
    }

    showCookieConsentModal() {
        this.createCookieConsentModal();
        const modal = document.getElementById('cookieConsentModal');
        if (modal) {
            modal.style.display = 'block';
            const acceptBtn = modal.querySelector('#acceptCookiesBtn');
            if (acceptBtn) acceptBtn.focus();
        }
    }

    createCookieConsentModal() {
        if (document.getElementById('cookieConsentModal')) return;

        const modalHTML = `
            <div id="cookieConsentModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Cookie Consent Required</h2>
                    <p>Free trial requires cookies to prevent abuse. We only store a small usage flag with expiry date - no tracking or advertising.</p>
                    <div class="cookie-consent-details">
                        <h4>What we store:</h4>
                        <ul>
                            <li>✅ Small usage flag (expires end of month)</li>
                            <li>❌ No personal data</li>
                            <li>❌ No tracking cookies</li>
                            <li>❌ No advertising cookies</li>
                        </ul>
                        <p><strong>Paid features work without cookies.</strong></p>
                    </div>
                    <div class="modal-buttons">
                        <button id="acceptCookiesBtn" class="btn-primary">Accept & Continue</button>
                        <button id="rejectCookiesBtn" class="btn-secondary">No Thanks</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindCookieModalEvents();
    }

    bindCookieModalEvents() {
        const modal = document.getElementById('cookieConsentModal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.close');
        const acceptBtn = document.getElementById('acceptCookiesBtn');
        const rejectBtn = document.getElementById('rejectCookiesBtn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hideCookieModal());
        if (acceptBtn) acceptBtn.addEventListener('click', () => this.handleCookieAccept());
        if (rejectBtn) rejectBtn.addEventListener('click', () => this.handleCookieReject());
    }

    handleCookieAccept() {
        this.state.cookieConsentGiven = true;
        this.setCookie('freeTrialConsent', 'true', this.getEndOfCurrentMonth());
        
        try {
            localStorage.setItem('freeTrialConsent', 'true');
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
        
        this.hideCookieModal();
        this.showFreeTrialModal();
    }

    handleCookieReject() {
        this.hideCookieModal();
        this.showNotification('Free trial requires cookies. Click "Try once for free" again anytime to reconsider.', 'info', 7000);
        // Don't set any permanent rejection flags - allow user to try again
    }

    hideCookieModal() {
        const modal = document.getElementById('cookieConsentModal');
        if (modal) modal.style.display = 'none';
    }

    // Email Validation
    async validateTrialEmail() {
        const emailInput = document.getElementById('trialEmail');
        const validationMsg = document.getElementById('emailValidationMsg') || this.createEmailValidationElement();

        if (!emailInput || !validationMsg) return;

        const email = emailInput.value.trim();

        if (!email) {
            this.updateValidationMessage(validationMsg, '', '');
            this.state.emailValidated = false;
            return;
        }

        if (!this.isValidEmailFormat(email)) {
            this.updateValidationMessage(validationMsg, 'Invalid email format', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        if (this.isDisposableEmail(email)) {
            this.updateValidationMessage(validationMsg, 'Temporary emails not allowed', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        if (await this.hasEmailUsedTrial(email)) {
            this.updateValidationMessage(validationMsg, 'Free trial already used this month for this email', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        // NEW: Check server database of used keys
        if (await this.checkUsedKeysDatabase(email)) {
            this.updateValidationMessage(validationMsg, 'Free trial has already been redeemed this month. Please try again next month.', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        this.updateValidationMessage(validationMsg, 'Valid email - ready for free trial', 'valid');
        this.state.emailValidated = true;
        this.normalizedEmail = this.normalizeEmail(email);
        this.emailHash = await this.hashEmail(this.normalizedEmail);
    }

    // Repository Validation
    // -------------------------
    // Updated Free Trial Repository Validation (Replace validateTrialRepository in free-trial.js)
    // -------------------------
    async validateTrialRepository() {
        const repoInput = document.getElementById('trialRepoUrl');
        const validationMsg = document.getElementById('repoValidationMsg') || this.createRepoValidationElement();
    
        if (!repoInput || !validationMsg) return;
    
        const repoUrl = repoInput.value.trim();
    
        if (!repoUrl) {
            this.updateValidationMessage(validationMsg, '', '');
            this.state.repositoryChecked = false;
            return;
        }
    
        this.updateValidationMessage(validationMsg, 'Checking repository...', '');
    
        try {
            // Use the shared validation function
            const accessResult = await window.validateGitHubRepositoryAccess(repoUrl);
            
            if (!accessResult.valid) {
                this.updateValidationMessage(validationMsg, accessResult.message, 'invalid');
                this.state.repositoryChecked = false;
                return;
            }
    
            // Additional check for duplicates in showcase
            const repoCheck = await this.checkRepositoryDuplicate(repoUrl);
            if (repoCheck.error) {
                this.updateValidationMessage(validationMsg, repoCheck.error, 'invalid');
                this.state.repositoryChecked = false;
                return;
            }
            if (repoCheck.isDuplicate) {
                this.updateValidationMessage(validationMsg, repoCheck.message, 'invalid');
                this.state.repositoryChecked = false;
                return;
            }
    
            this.updateValidationMessage(validationMsg, 'Repository eligible for free trial', 'valid');
            this.state.repositoryChecked = true;
    
        } catch (error) {
            this.updateValidationMessage(validationMsg, 'Repository check failed. Please try again.', 'invalid');
            this.state.repositoryChecked = false;
        }
    }

    createRepoValidationElement() {
        const repoInput = document.getElementById('trialRepoUrl');
        if (!repoInput) return null;

        const validationDiv = document.createElement('div');
        validationDiv.id = 'repoValidationMsg';
        validationDiv.className = 'repo-validation';
        repoInput.parentNode.insertBefore(validationDiv, repoInput.nextSibling);
        return validationDiv;
    }

    isValidGitHubUrl(url) {
        const githubRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
        return githubRegex.test(url);
    }

    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isDisposableEmail(email) {
        const domain = email.split('@')[1]?.toLowerCase();
        return domain && this.config.DISPOSABLE_EMAIL_DOMAINS.includes(domain);
    }

    createEmailValidationElement() {
        const emailInput = document.getElementById('trialEmail');
        if (!emailInput) return null;

        const validationDiv = document.createElement('div');
        validationDiv.id = 'emailValidationMsg';
        validationDiv.className = 'email-validation';
        emailInput.parentNode.insertBefore(validationDiv, emailInput.nextSibling);
        return validationDiv;
    }

    updateValidationMessage(element, message, type) {
        if (element) {
            element.textContent = message;
            element.className = `email-validation ${type}`;
        }
    }

    // Form Submission - UPDATED LOGIC
    async handleFreeTrialFormSubmission(event) {
        event.preventDefault();
    
        if (!this.checkCookieConsent()) {
            this.showNotification('Cookie consent required for free trial', 'error', 5000);
            return;
        }
    
        const emailInput = document.getElementById('trialEmail');
        const repoUrlInput = document.getElementById('trialRepoUrl');
        
        if (!emailInput || !repoUrlInput) {
            this.showNotification('Required form elements not found', 'error', 5000);
            return;
        }
    
        const email = emailInput.value.trim();
        const repoUrl = repoUrlInput.value.trim();
    
        if (!email || !repoUrl) {
            this.showNotification('Please fill in both email and repository URL', 'error', 5000);
            return;
        }
    
        // Check if both validations passed
        if (!this.state.emailValidated || !this.state.repositoryChecked) {
            this.showNotification('Please ensure both email and repository are valid', 'error', 5000);
            return;
        }
    
        const submitBtn = event.target.querySelector('button[type="submit"]');
        this.setSubmitButtonLoading(submitBtn, true);
    
        // Double-check used keys database before generating key
        if (await this.checkUsedKeysDatabase(email)) {
            this.showNotification('Free trial has already been redeemed this month. Please try again next month.', 'error', 5000);
            this.setSubmitButtonLoading(submitBtn, false);
            return;
        }
    
        try {
            // Generate trial key and store it
            const freeTrialKey = await this.generateMonthlyFreeTrialKey(email);
            this.generatedKey = freeTrialKey;
            
            // Store key in main.js for validation
            if (window.setGeneratedFreeTrialKey) {
                window.setGeneratedFreeTrialKey(freeTrialKey);
            }
            
            // Success - populate repo URL only and replace button with input field
            this.populateMainFormWithTrialKey(freeTrialKey, repoUrl);
            this.replaceFreeTrialButtonWithInput(freeTrialKey);
            // DON'T auto-close modal - let user close manually
    
        } catch (error) {
            console.error('Free trial submission error:', error);
            this.showNotification(error.message || 'Free trial setup failed. Please try again.', 'error', 5000);
        } finally {
            this.setSubmitButtonLoading(submitBtn, false);
        }
    }

    setSubmitButtonLoading(button, loading) {
        if (button) {
            button.disabled = loading;
            button.textContent = loading ? 'Processing...' : 'Start Free Trial';
        }
    }

    // Repository Management
    async checkRepositoryDuplicate(repoUrl) {
        try {
            const repoName = this.extractRepositoryName(repoUrl);
            if (!repoName) {
                return { isDuplicate: false, error: 'Invalid repository URL format' };
            }

            const response = await fetch(this.config.SHOWCASE_JSON_URL, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch showcase data: ${response.status}`);
            }

            const showcaseData = await response.json();
            const isDuplicate = showcaseData.some(item => 
                item.title?.toLowerCase() === repoName.toLowerCase()
            );

            return { 
                isDuplicate, 
                repoName,
                message: isDuplicate ? 
                    `Repository "${repoName}" already analyzed. Free trial is for new repositories only.` : 
                    `Repository "${repoName}" is eligible for free trial.`
            };
        } catch (error) {
            console.error('Repository duplicate check error:', error);
            return { 
                isDuplicate: false, 
                error: 'Could not verify repository status. Please try again.',
                repoName: null 
            };
        }
    }


    extractRepositoryName(repoUrl) {
        try {
            if (repoUrl.includes('github.com/')) {
                const parts = repoUrl.split('github.com/')[1]?.split('/');
                return parts && parts.length >= 2 ? `${parts[0]}_${parts[1]}` : null;
            }
            return null;
        } catch (error) {
            console.error('Error extracting repository name:', error);
            return null;
            }
    }
    

    // Key Generation and Storage
    async generateMonthlyFreeTrialKey(email) {
        const normalizedEmail = this.normalizeEmail(email);
        const emailHash = await this.hashEmail(normalizedEmail);
        const now = new Date();
        const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const year = now.getFullYear();
        return `FreeTrial-${month}${year}-${emailHash}`;
    }

    normalizeEmail(email) {
        let [local, domain] = email.toLowerCase().split('@');
        if (domain === 'gmail.com') {
            local = local.replace(/\./g, '').split('+')[0];
        }
        return `${local}@${domain}`;
    }

    async hashEmail(email) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(email);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
        } catch (e) {
            console.error('Email hash error:', e);
            return this.hashStringFallback(email);
        }
    }

    hashStringFallback(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }

    async hasEmailUsedTrial(email) {
        const normalizedEmail = this.normalizeEmail(email);
        const emailHash = await this.hashEmail(normalizedEmail);
        return await this.checkFreeTrialUsed(emailHash);
    }

    // Mark trial as used (called from main.js after successful analysis submission)
    async markFreeTrialAsUsed(licenseKey) {
        if (!licenseKey.startsWith('FreeTrial-')) return;
        
        try {
            const emailHash = licenseKey.split('-')[2]; // Extract hash from key
            await this.setFreeTrialUsedFlag(emailHash);
            console.log('Free trial marked as used:', licenseKey);
        } catch (error) {
            console.error('Error marking free trial as used:', error);
        }
    }

    async setFreeTrialUsedFlag(emailHash) {
        const flag = `freetrial_used_${emailHash}`;
        const timestamp = new Date().toISOString();
        const endOfMonth = this.getEndOfCurrentMonth();

        try {
            // Store in multiple places for redundancy
            if (typeof Storage !== 'undefined') {
                localStorage.setItem(flag, timestamp);
                sessionStorage.setItem(flag, timestamp);
            }
            
            this.setCookie(flag, timestamp, endOfMonth);
            await this.storeInIndexedDB(flag, timestamp);

            if ('caches' in window) {
                try {
                    const cache = await caches.open('freetrial-cache');
                    await cache.put(`/freetrial/${emailHash}`, new Response(timestamp));
                } catch (e) {
                    console.warn('Cache API not available:', e);
                }
            }
        } catch (error) {
            console.error('Error storing free trial flag:', error);
        }
    }

    async checkFreeTrialUsed(emailHash) {
        const flag = `freetrial_used_${emailHash}`;
        
        try {
            const checks = await Promise.allSettled([
                this.checkStorage(localStorage, flag),
                this.checkStorage(sessionStorage, flag),
                Promise.resolve(document.cookie.includes(flag + '=')),
                this.checkIndexedDB(flag),
                this.checkCache(emailHash)
            ]);
            
            return checks.some(result => result.status === 'fulfilled' && result.value === true);
        } catch (error) {
            console.error('Error checking free trial usage:', error);
            return false;
        }
    }

    checkStorage(storage, flag) {
        try {
            return Promise.resolve(!!storage.getItem(flag));
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    async storeInIndexedDB(key, value) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('FreeTrialDB', 1);
                request.onerror = () => resolve();
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['freetrial'], 'readwrite');
                    const store = transaction.objectStore('freetrial');
                    store.put({ id: key, timestamp: value, created: Date.now() });
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => resolve();
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('freetrial')) {
                        const store = db.createObjectStore('freetrial', { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                };
            } catch (error) {
                resolve();
            }
        });
    }

    async checkIndexedDB(flag) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('FreeTrialDB', 1);
                request.onerror = () => resolve(false);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('freetrial')) {
                        resolve(false);
                        return;
                    }
                    const transaction = db.transaction(['freetrial'], 'readonly');
                    const store = transaction.objectStore('freetrial');
                    const getRequest = store.get(flag);
                    getRequest.onsuccess = () => resolve(!!getRequest.result);
                    getRequest.onerror = () => resolve(false);
                };
            } catch (error) {
                resolve(false);
            }
        });
    }

    async checkCache(emailHash) {
        try {
            if (!('caches' in window)) return false;
            const cache = await caches.open('freetrial-cache');
            const response = await cache.match(`/freetrial/${emailHash}`);
            return !!response;
        } catch (error) {
            return false;
        }
    }

    // Add this new method around line 530, after checkCache method
    async checkUsedKeysDatabase(email) {
        try {
            const response = await fetch('data/FreeTrialKeys/UsedFreeLicenseKeys.json', {
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                console.warn('Could not fetch used keys database');
                return false;
            }
    
            const data = await response.json();
            
            // Handle n8n's array wrapper format: [{"usedKeys": [...]}]
            let usedKeys = [];
            if (Array.isArray(data) && data.length > 0 && data[0].usedKeys) {
                usedKeys = data[0].usedKeys;
            } else if (data.usedKeys) {
                // Fallback for object format: {"usedKeys": [...]}
                usedKeys = data.usedKeys;
            }
            
            const normalizedEmail = this.normalizeEmail(email);
            const emailHash = await this.hashEmail(normalizedEmail);
            const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const currentYear = new Date().getFullYear();
            const expectedKey = `FreeTrial-${currentMonth}${currentYear}-${emailHash}`;
            
            console.log('Checking key:', expectedKey, 'against database:', usedKeys);
            return usedKeys.includes(expectedKey);
            
        } catch (error) {
            console.error('Error checking used keys database:', error);
            return false;
        }
    }
    
    // Modal Management
    showFreeTrialModal() {
        const modal = document.getElementById('freeTrialModal');
        if (modal) {
            modal.style.display = 'block';
            const emailInput = modal.querySelector('#trialEmail');
            if (emailInput) emailInput.focus();
        }
    }

    hideFreeTrialModal() {
        const modal = document.getElementById('freeTrialModal');
        if (modal) modal.style.display = 'none';

        // Cleanup trial credit info
        const creditInfo = document.querySelector('.trial-credit-info');
        if (creditInfo) creditInfo.remove();
    }

    // UPDATED: Only populate repo URL, DO NOT auto-populate license key
    // Replace the populateMainFormWithTrialKey function in free-trial.js
    populateMainFormWithTrialKey(freeTrialKey, repoUrl) {
        const mainRepoInput = document.getElementById('repoUrl');
        if (mainRepoInput && repoUrl) {
            mainRepoInput.value = repoUrl;
            
            // Make field readonly instead of disabled
            mainRepoInput.readOnly = true;
            
            // Apply visual styling to show it's locked
            mainRepoInput.style.backgroundColor = '#f0f8ff';
            mainRepoInput.style.border = '2px solid #4CAF50';
            mainRepoInput.style.cursor = 'not-allowed';
            mainRepoInput.style.color = '#333';
            
            // Add auto-populated label
            if (!document.querySelector('.auto-populated-label')) {
                const label = document.createElement('small');
                label.className = 'auto-populated-label';
                label.textContent = '✓ Auto-populated from free trial';
                label.style.color = '#4CAF50';
                label.style.display = 'block';
                label.style.marginTop = '4px';
                label.style.fontSize = '12px';
                label.style.fontWeight = 'bold';
                mainRepoInput.parentNode.insertBefore(label, mainRepoInput.nextSibling);
            }
            
            // Trigger validation normally (field is not disabled, so validation will run)
            if (typeof validateRepoUrl === 'function') {
                validateRepoUrl();
            }
            
            // Also trigger the input event for any other listeners
            mainRepoInput.dispatchEvent(new Event('input'));
            
            // Force form validity check after validation completes
            setTimeout(() => {
                if (typeof checkFormValidity === 'function') {
                    checkFormValidity();
                }
            }, 100);
        }
    }

   // UPDATED: Replace modal's "Start Free Trial" button with input field
    replaceFreeTrialButtonWithInput(freeTrialKey) {
        const buttonContainer = document.getElementById('freeTrialButtonContainer');
        if (!buttonContainer) return;
    
        // Insert credit info box above container (only once)
        if (!document.querySelector('.trial-credit-info')) {
            const creditInfo = document.createElement('div');
            creditInfo.className = 'trial-credit-info';
            creditInfo.style.cssText = `
                background-color: #e8f5e8; 
                border: 1px solid #4CAF50; 
                padding: 10px; 
                margin: 15px 0; 
                border-radius: 4px; 
                text-align: center;
                font-size: 14px;
                color: #2E7D32;
            `;
            creditInfo.innerHTML = `<strong>Free Trial Key Generated – 1 Analysis Credit Available</strong>`;
            buttonContainer.parentNode.insertBefore(creditInfo, buttonContainer);
        }

    // Replace content inside buttonContainer
    buttonContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
            <input type="text" value="${freeTrialKey}" readonly style="
                width: 280px;
                padding: 8px 12px;
                font-size: 14px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background-color: #f9f9f9;
                color: #333;
                font-family: monospace;
            ">
            <button id="copyTrialKeyBtn" class="btn-secondary" style="
                padding: 8px 12px;
                font-size: 14px;
                min-width: auto;
            ">📋 Copy</button>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666; text-align: center;">
            Copy this key and paste it in the License Key field above
        </p>
    `;

    // Add copy functionality
    const copyBtn = document.getElementById('copyTrialKeyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyKeyToClipboard(freeTrialKey, copyBtn));
    }
}


    async copyKeyToClipboard(key, button) {
        try {
            await navigator.clipboard.writeText(key);
            const originalText = button.textContent;
            button.textContent = '✅ Copied';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (error) {
            // Fallback for older browsers
            try {
                const input = document.createElement('input');
                input.value = key;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                
                button.textContent = '✅ Copied';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 2000);
            } catch (e) {
                console.error('Copy failed:', e);
            }
        }
    }

    // Utility Functions
    getCurrentEmailValue() {
        const emailInput = document.getElementById('trialEmail');
        return emailInput ? emailInput.value.trim() : '';
    }

    getEndOfCurrentMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    showNotification(message, type = 'info', duration = 5000) {
        let notification = document.getElementById('freeTrialNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'freeTrialNotification';
            notification.className = 'free-trial-notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `free-trial-notification ${type} show`;
        setTimeout(() => {
            notification.className = `free-trial-notification ${type}`;
        }, duration);
    }

    setCookie(name, value, expires) {
        try {
            const date = new Date(expires);
            document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; Secure; SameSite=Strict`;
        } catch (e) {
            console.error('Failed to set cookie:', e);
        }
    }

    getCookie(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        } catch (e) {
            console.error('Failed to get cookie:', e);
            return null;
        }
    }

    debounce(func, wait) {
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
}

// Initialize Free Trial Manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.freeTrialManager = new FreeTrialManager();
    });
} else {
    window.freeTrialManager = new FreeTrialManager();
}
