class FreeTrialManager {
    constructor() {
        this.config = {
            SHOWCASE_JSON_URL: 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/refs/heads/main/data/showcase/Showcase.json',
            VPN_DETECTION_TIMEOUT: 3000,
            KNOWN_VPN_ASNS: [
                'AS13335', 'AS16509', 'AS8075', 'AS15169',
                'AS396982', 'AS63023', 'AS397444', 'AS54600',
                'AS20473', 'AS26496', 'AS16276', 'AS24940'
            ],
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
    }

    async handleFreeTrialButtonClick() {
        const freeTrialBtn = document.getElementById('freeTrial');
        if (!freeTrialBtn) return;

        this.updateButtonState(freeTrialBtn, 'loading', 'Checking connection...');

        try {
            if (!this.areCookiesEnabled()) {
                this.showNotification('Cookies are required to use the free trial. Please enable cookies.', 'error', 5000);
                this.resetButton(freeTrialBtn);
                return;
            }

            const isVPN = await this.detectVPN();
            if (isVPN) {
                this.handleVPNDetected(freeTrialBtn);
                return;
            }

            const email = this.getCurrentEmailValue();
            if (email && await this.hasEmailUsedTrial(email)) {
                this.showNotification('Free trial already used this month for this email.', 'error', 5000);
                this.resetButton(freeTrialBtn);
                return;
            }

            this.checkCookieConsent() ? this.showFreeTrialModal() : this.showCookieConsentModal();
            this.resetButton(freeTrialBtn);
        } catch (error) {
            console.error('Free trial initialization error:', error);
            this.showNotification('An error occurred. Please try again.', 'error', 5000);
            this.resetButton(freeTrialBtn);
        }
    }

    updateButtonState(button, state, text) {
        button.textContent = text;
        button.disabled = true;
        button.classList.remove('btn-loading', 'btn-blocked');
        if (state !== 'default') button.classList.add(`btn-${state}`);
    }

    resetButton(button) {
        button.textContent = 'Try once for free';
        button.disabled = false;
        button.classList.remove('btn-loading', 'btn-blocked');
    }

    handleVPNDetected(button) {
        this.state.vpnDetected = true;
        this.updateButtonState(button, 'blocked', 'Please Disable VPN');
        this.showNotification('VPN/Proxy detected. Please disable VPN to use free trial.', 'warning', 5000);

        setTimeout(() => this.resetButton(button), 30000);
    }

    // VPN Detection Methods
    async detectVPN() {
    const vpnDetector = new ImprovedVPNDetection();
    return await vpnDetector.detectVPN();
}

    async retryFetch(fn, retries = 2, delay = 1000) {
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }

    detectVPNWebRTC() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                resolve(false);
                return;
            }

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            let localIPs = [];
            let publicIPs = [];

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const ip = event.candidate.candidate.split(' ')[4];
                    if (this.isPrivateIP(ip)) {
                        localIPs.push(ip);
                    } else if (this.isValidPublicIP(ip)) {
                        publicIPs.push(ip);
                    }
                }
            };

            pc.createDataChannel('test');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => resolve(false));

            setTimeout(() => {
                pc.close();
                const uniquePublicIPs = [...new Set(publicIPs)];
                const suspiciousVPN = uniquePublicIPs.length > 1 || 
                                    (uniquePublicIPs.length === 1 && localIPs.length === 0);
                resolve(suspiciousVPN);
            }, this.config.VPN_DETECTION_TIMEOUT);
        });
    }

    async detectVPNTimezone() {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch('https://ipapi.co/json/', {
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) return false;

            const location = await response.json();
            const ipTimezone = location.timezone || userTimezone;
            return userTimezone !== ipTimezone;
        } catch (error) {
            console.error('Timezone VPN detection error:', error);
            return false;
        }
    }

    async detectVPNKnownIPs() {
        try {
            const response = await fetch('https://ipapi.co/json/', {
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) return false;

            const data = await response.json();
            const org = data.org ? data.org.toLowerCase() : '';
            const vpnIndicators = [
                org.includes('vpn'),
                org.includes('proxy'),
                org.includes('hosting'),
                org.includes('datacenter'),
                data.asn && this.config.KNOWN_VPN_ASNS.includes(data.asn)
            ];

            return vpnIndicators.some(indicator => indicator === true);
        } catch (error) {
            console.error('Known IP VPN detection error:', error);
            return false;
        }
    }

    // Cookie and Consent Management
    areCookiesEnabled() {
    const result = ImprovedCookieManager.areCookiesEnabled();
    if (!result.overall) {
        // Show instructions to user
        ImprovedCookieManager.showCookieEnableInstructions();
    }
    return result.overall;
}

    checkCookieConsent() {
        return this.getCookie('freeTrialConsent') === 'true' || 
               localStorage.getItem('freeTrialConsent') === 'true';
    }

    showCookieConsentModal() {
        this.createCookieConsentModal();
        const modal = document.getElementById('cookieConsentModal');
        if (modal) {
            modal.style.display = 'block';
            modal.querySelector('#acceptCookiesBtn').focus();
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
        localStorage.setItem('freeTrialConsent', 'true');
        this.hideCookieModal();
        this.showFreeTrialModal();
    }

    handleCookieReject() {
        this.hideCookieModal();
        this.showNotification('Free trial requires cookies. Use paid credits instead.', 'info', 5000);
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

        this.updateValidationMessage(validationMsg, 'Valid email - ready for free trial', 'valid');
        this.state.emailValidated = true;
        this.normalizedEmail = this.normalizeEmail(email);
        this.emailHash = await this.hashEmail(this.normalizedEmail);
    }

    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isDisposableEmail(email) {
        const domain = email.split('@')[1].toLowerCase();
        return this.config.DISPOSABLE_EMAIL_DOMAINS.includes(domain);
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

    // Form Submission
    async handleFreeTrialFormSubmission(event) {
        event.preventDefault();

        if (!this.state.cookieConsentGiven) {
            this.showNotification('Cookie consent required for free trial', 'error', 5000);
            return;
        }

        const emailInput = document.getElementById('trialEmail');
        const repoUrlInput = document.getElementById('repoUrl');
        
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

        const submitBtn = event.target.querySelector('button[type="submit"]');
        this.setSubmitButtonLoading(submitBtn, true);

        try {
            if (!this.state.emailValidated) {
                await this.validateTrialEmail();
                if (!this.state.emailValidated) {
                    throw new Error('Email validation failed');
                }
            }

            const repoCheck = await this.checkRepositoryDuplicate(repoUrl);
            if (repoCheck.error) {
                throw new Error(repoCheck.error);
            }
            if (repoCheck.isDuplicate) {
                throw new Error(repoCheck.message);
            }

            const freeTrialKey = await this.generateMonthlyFreeTrialKey(email);
            await this.setFreeTrialUsedFlag(this.emailHash);
            
            this.populateMainFormWithTrialKey(freeTrialKey);
            this.showTrialKeySuccess(freeTrialKey);
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
                return { isDuplicate: false, error: 'Invalid repository URL' };
            }

            const response = await fetch(this.config.SHOWCASE_JSON_URL, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch showcase data: ${response.status}`);
            }

            const showcaseData = await response.json();
            const isDuplicate = showcaseData.some(item => 
                item.title.toLowerCase() === repoName.toLowerCase()
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
                const parts = repoUrl.split('github.com/')[1].split('/');
                return parts[1];
            } else if (repoUrl.includes('/')) {
                const parts = repoUrl.split('/');
                return parts[parts.length - 1];
            }
            return repoUrl;
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

    async setFreeTrialUsedFlag(emailHash) {
        const flag = `freetrial_used_${emailHash}`;
        const timestamp = new Date().toISOString();
        const endOfMonth = this.getEndOfCurrentMonth();

        try {
            localStorage.setItem(flag, timestamp);
            sessionStorage.setItem(flag, timestamp);
            this.setCookie(flag, timestamp, endOfMonth);
            await this.storeInIndexedDB(flag, timestamp);

            if ('caches' in window) {
                const cache = await caches.open('freetrial-cache');
                await cache.put(`/freetrial/${emailHash}`, new Response(timestamp));
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
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FreeTrialDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['freetrial'], 'readwrite');
                const store = transaction.objectStore('freetrial');
                store.put({ id: key, timestamp: value, created: Date.now() });
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('freetrial')) {
                    const store = db.createObjectStore('freetrial', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async checkIndexedDB(flag) {
        return new Promise((resolve) => {
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

    // Modal Management
    showFreeTrialModal() {
        const modal = document.getElementById('freeTrialModal');
        if (modal) {
            modal.style.display = 'block';
            modal.querySelector('#trialEmail').focus();
        }
    }

    populateMainFormWithTrialKey(freeTrialKey) {
        const licenseKeyInput = document.getElementById('licenseKey');
        if (licenseKeyInput) {
            licenseKeyInput.value = freeTrialKey;
            licenseKeyInput.disabled = true;
            const event = new Event('input');
            licenseKeyInput.dispatchEvent(event);
        }
    }

    showTrialKeySuccess(freeTrialKey) {
        const modal = document.getElementById('freeTrialModal');
        if (modal) modal.style.display = 'none';
        this.showTrialKeyModal(freeTrialKey);
    }

    showTrialKeyModal(freeTrialKey) {
        let keyModal = document.getElementById('trialKeyDisplayModal');
        if (!keyModal) {
            const modalHTML = `
                <div id="trialKeyDisplayModal" class="modal">
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>Free Trial Activated! 🎉</h2>
                        <p class="success-message">Your private license key for this month has been generated (holds 1 credit)</p>
                        <div class="key-display-container">
                            <input type="text" id="displayedTrialKey" value="${freeTrialKey}" readonly>
                            <button id="copyKeyBtn" class="btn-secondary">📋 Copy</button>
                        </div>
                        <p class="key-note">This key has been automatically added to the main form. You can now analyze your repository!</p>
                        <button id="closeKeyModal" class="btn-primary">Continue to Analysis</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            keyModal = document.getElementById('trialKeyDisplayModal');

            const closeBtn = keyModal.querySelector('.close');
            const closeKeyBtn = document.getElementById('closeKeyModal');
            const copyBtn = document.getElementById('copyKeyBtn');

            [closeBtn, closeKeyBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => {
                        keyModal.style.display = 'none';
                    });
                }
            });

            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyKeyToClipboard(freeTrialKey, copyBtn));
            }
        }
        keyModal.style.display = 'block';
        keyModal.querySelector('#closeKeyModal').focus();
    }

    async copyKeyToClipboard(key, button) {
        try {
            await navigator.clipboard.writeText(key);
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (error) {
            const keyInput = document.getElementById('displayedTrialKey');
            if (keyInput) {
                keyInput.select();
                document.execCommand('copy');
                button.textContent = '✅ Copied!';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 2000);
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

    isPrivateIP(ip) {
        return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(ip);
    }

    isValidPublicIP(ip) {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        return ipRegex.test(ip) && !this.isPrivateIP(ip);
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

// Initialize Free Trial Manager
const freeTrialManager = new FreeTrialManager();
