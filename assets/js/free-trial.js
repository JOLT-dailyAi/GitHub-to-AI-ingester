// ===============================================================================================
// FREE TRIAL MANAGEMENT SYSTEM
// ===============================================================================================
// Handles: VPN Detection, Cookie Consent, Email Validation, Repository Duplicate Checking,
// Monthly Key Generation, Multi-Storage Persistence, and Complete Free Trial Flow
// ===============================================================================================

class FreeTrialManager {
    constructor() {
        this.config = {
            SHOWCASE_JSON_URL: 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/refs/heads/main/data/showcase/Showcase.json',
            VPN_DETECTION_TIMEOUT: 3000,
            KNOWN_VPN_ASNS: [
                'AS13335', 'AS16509', 'AS8075', 'AS15169', // Major cloud/VPN providers
                'AS396982', 'AS63023', 'AS397444', 'AS54600' // Known VPN ASNs
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
            repositoryChecked: false
        };

        this.initializeEventListeners();
    }

    // ===============================================================================================
    // INITIALIZATION & EVENT LISTENERS
    // ===============================================================================================
    
    initializeEventListeners() {
        // Free trial button click
        const freeTrialBtn = document.getElementById('freeTrial');
        if (freeTrialBtn) {
            freeTrialBtn.addEventListener('click', () => this.handleFreeTrialButtonClick());
        }

        // Cookie consent modal events
        this.setupCookieConsentModal();
        
        // Free trial form submission
        const freeTrialForm = document.getElementById('freeTrialForm');
        if (freeTrialForm) {
            freeTrialForm.addEventListener('submit', (e) => this.handleFreeTrialFormSubmission(e));
        }

        // Email input validation
        const trialEmailInput = document.getElementById('trialEmail');
        if (trialEmailInput) {
            trialEmailInput.addEventListener('input', this.debounce(() => this.validateTrialEmail(), 500));
            trialEmailInput.addEventListener('blur', () => this.validateTrialEmail());
        }
    }

    setupCookieConsentModal() {
        // Create cookie consent modal if it doesn't exist
        if (!document.getElementById('cookieConsentModal')) {
            this.createCookieConsentModal();
        }

        // Event listeners for cookie consent
        const cookieAcceptBtn = document.getElementById('acceptCookiesBtn');
        const cookieRejectBtn = document.getElementById('rejectCookiesBtn');
        
        if (cookieAcceptBtn) {
            cookieAcceptBtn.addEventListener('click', () => this.handleCookieAccept());
        }
        
        if (cookieRejectBtn) {
            cookieRejectBtn.addEventListener('click', () => this.handleCookieReject());
        }
    }

    // ===============================================================================================
    // FREE TRIAL BUTTON HANDLER
    // ===============================================================================================

    async handleFreeTrialButtonClick() {
        const freeTrialBtn = document.getElementById('freeTrial');
        if (!freeTrialBtn) return;

        // Step 1: VPN Detection
        freeTrialBtn.textContent = 'Checking connection...';
        freeTrialBtn.disabled = true;
        freeTrialBtn.classList.add('btn-loading');

        try {
            const isVPN = await this.detectVPN();
            
            if (isVPN) {
                this.handleVPNDetected(freeTrialBtn);
                return;
            }

            // Step 2: Show cookie consent modal
            this.showCookieConsentModal();
            
        } catch (error) {
            console.error('Error during free trial initialization:', error);
            freeTrialBtn.textContent = 'Error - Try again';
            freeTrialBtn.disabled = false;
            freeTrialBtn.classList.remove('btn-loading');
        }
    }

    handleVPNDetected(freeTrialBtn) {
        freeTrialBtn.textContent = 'VPN Detected - Please disable VPN';
        freeTrialBtn.classList.remove('btn-loading');
        freeTrialBtn.classList.add('btn-blocked');
        freeTrialBtn.disabled = true;
        
        // Show VPN detection message
        this.showNotification('VPN/Proxy detected. Please disable VPN to use free trial.', 'warning');
        
        // Reset button after 30 seconds to allow retry
        setTimeout(() => {
            freeTrialBtn.textContent = 'Try once for free';
            freeTrialBtn.classList.remove('btn-blocked');
            freeTrialBtn.disabled = false;
        }, 30000);
    }

    // ===============================================================================================
    // VPN DETECTION SYSTEM
    // ===============================================================================================

    async detectVPN() {
        try {
            const [webrtcVPN, timezoneVPN, ipVPN] = await Promise.allSettled([
                this.detectVPNWebRTC(),
                this.detectVPNTimezone(),
                this.detectVPNKnownIPs()
            ]);

            // Return true if ANY detection method indicates VPN
            return (
                (webrtcVPN.status === 'fulfilled' && webrtcVPN.value) ||
                (timezoneVPN.status === 'fulfilled' && timezoneVPN.value) ||
                (ipVPN.status === 'fulfilled' && ipVPN.value)
            );
        } catch (error) {
            console.error('VPN detection error:', error);
            return false; // Don't block on detection errors
        }
    }

    detectVPNWebRTC() {
        return new Promise((resolve) => {
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
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            setTimeout(() => {
                pc.close();
                
                // VPN indicators:
                // 1. Multiple different public IPs = VPN switching
                // 2. No local IP but has public = VPN masking
                const uniquePublicIPs = [...new Set(publicIPs)];
                const suspiciousVPN = uniquePublicIPs.length > 1 || 
                                    (uniquePublicIPs.length > 0 && localIPs.length === 0);
                
                resolve(suspiciousVPN);
            }, this.config.VPN_DETECTION_TIMEOUT);
        });
    }

    async detectVPNTimezone() {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Use a free IP geolocation service
            const response = await fetch('https://ipapi.co/json/', {
                timeout: 5000
            });
            
            if (!response.ok) return false;
            
            const location = await response.json();
            const ipTimezone = location.timezone;
            
            // Simple timezone mismatch check
            return userTimezone !== ipTimezone;
        } catch (error) {
            console.error('Timezone VPN detection error:', error);
            return false;
        }
    }

    async detectVPNKnownIPs() {
        try {
            const response = await fetch('https://ipapi.co/json/', {
                timeout: 5000
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            
            // Check multiple VPN indicators
            const vpnIndicators = [
                data.org && data.org.toLowerCase().includes('vpn'),
                data.org && data.org.toLowerCase().includes('proxy'),
                data.org && data.org.toLowerCase().includes('hosting'),
                data.org && data.org.toLowerCase().includes('datacenter'),
                data.asn && this.config.KNOWN_VPN_ASNS.includes(data.asn),
                data.country_code && data.country_code !== this.getExpectedCountryFromTimezone()
            ];
            
            return vpnIndicators.some(indicator => indicator === true);
        } catch (error) {
            console.error('Known IP VPN detection error:', error);
            return false;
        }
    }

    // ===============================================================================================
    // COOKIE CONSENT SYSTEM
    // ===============================================================================================

    createCookieConsentModal() {
        const modalHTML = `
            <div id="cookieConsentModal" class="modal">
                <div class="modal-content">
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
    }

    showCookieConsentModal() {
        const modal = document.getElementById('cookieConsentModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideCookieConsentModal() {
        const modal = document.getElementById('cookieConsentModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    handleCookieAccept() {
        this.state.cookieConsentGiven = true;
        this.hideCookieConsentModal();
        this.showFreeTrialModal();
        
        // Reset free trial button
        const freeTrialBtn = document.getElementById('freeTrial');
        if (freeTrialBtn) {
            freeTrialBtn.textContent = 'Try once for free';
            freeTrialBtn.disabled = false;
            freeTrialBtn.classList.remove('btn-loading');
        }
    }

    handleCookieReject() {
        this.state.cookieConsentGiven = false;
        this.hideCookieConsentModal();
        
        // Reset free trial button
        const freeTrialBtn = document.getElementById('freeTrial');
        if (freeTrialBtn) {
            freeTrialBtn.textContent = 'Try once for free';
            freeTrialBtn.disabled = false;
            freeTrialBtn.classList.remove('btn-loading');
        }
        
        this.showNotification('Free trial requires cookies. Use paid credits instead.', 'info');
    }

    showFreeTrialModal() {
        const modal = document.getElementById('freeTrialModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // ===============================================================================================
    // EMAIL VALIDATION SYSTEM
    // ===============================================================================================

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

        // Basic format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.updateValidationMessage(validationMsg, 'Invalid email format', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        // Check disposable emails
        const domain = email.split('@')[1].toLowerCase();
        if (this.config.DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
            this.updateValidationMessage(validationMsg, 'Temporary emails not allowed', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        // Normalize email
        const normalizedEmail = this.normalizeEmail(email);
        const emailHash = await this.hashEmail(normalizedEmail);

        // Check if already used this month
        if (await this.checkFreeTrialUsed(emailHash)) {
            this.updateValidationMessage(validationMsg, 'Free trial already used this month for this email', 'invalid');
            this.state.emailValidated = false;
            return;
        }

        this.updateValidationMessage(validationMsg, 'Valid email - ready for free trial', 'valid');
        this.state.emailValidated = true;
        
        // Store normalized email for later use
        this.normalizedEmail = normalizedEmail;
        this.emailHash = emailHash;
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

    normalizeEmail(email) {
        let [local, domain] = email.toLowerCase().split('@');
        
        // Handle Gmail normalization
        if (domain === 'gmail.com') {
            // Remove dots
            local = local.replace(/\./g, '');
            // Remove aliases (everything after +)
            local = local.split('+')[0];
        }
        
        return `${local}@${domain}`;
    }

    async hashEmail(email) {
        const encoder = new TextEncoder();
        const data = encoder.encode(email);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
    }

    // ===============================================================================================
    // REPOSITORY DUPLICATE CHECKING
    // ===============================================================================================

    async checkRepositoryDuplicate(repoUrl) {
        try {
            // Extract repository name from URL
            const repoName = this.extractRepositoryName(repoUrl);
            if (!repoName) {
                return { isDuplicate: false, error: 'Invalid repository URL' };
            }

            // Fetch showcase data
            const response = await fetch(this.config.SHOWCASE_JSON_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch showcase data: ${response.status}`);
            }

            const showcaseData = await response.json();
            
            // Check for duplicates (case-insensitive)
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
            // Handle different URL formats
            if (repoUrl.includes('github.com/')) {
                const parts = repoUrl.split('github.com/')[1].split('/');
                return parts[1]; // Return repository name
            } else if (repoUrl.includes('/')) {
                const parts = repoUrl.split('/');
                return parts[parts.length - 1]; // Last part as repo name
            } else {
                return repoUrl; // Assume it's just the repo name
            }
        } catch (error) {
            console.error('Error extracting repository name:', error);
            return null;
        }
    }

    // ===============================================================================================
    // MONTHLY KEY GENERATION
    // ===============================================================================================

    async generateMonthlyFreeTrialKey(email) {
        const normalizedEmail = this.normalizeEmail(email);
        const emailHash = await this.hashEmail(normalizedEmail);
        
        const now = new Date();
        const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const year = now.getFullYear();
        
        return `FreeTrial-${month}${year}-${emailHash}`;
    }

    // ===============================================================================================
    // MULTI-STORAGE PERSISTENCE SYSTEM
    // ===============================================================================================

    async setFreeTrialUsedFlag(emailHash) {
        const flag = `freetrial_used_${emailHash}`;
        const timestamp = new Date().toISOString();
        const endOfMonth = this.getEndOfCurrentMonth();
        
        try {
            // 1. localStorage
            localStorage.setItem(flag, timestamp);
            
            // 2. sessionStorage
            sessionStorage.setItem(flag, timestamp);
            
            // 3. Cookie (expires end of current month)
            const cookieExpiry = Math.floor(endOfMonth.getTime() / 1000); // Unix timestamp
            document.cookie = `${flag}=${timestamp}; expires=${endOfMonth.toUTCString()}; path=/; SameSite=Strict`;
            
            // 4. IndexedDB
            await this.storeInIndexedDB(flag, timestamp);
            
            // 5. Cache API
            if ('caches' in window) {
                const cache = await caches.open('freetrial-cache');
                await cache.put(`/freetrial/${emailHash}`, new Response(timestamp));
            }
            
            console.log('Free trial flag stored across all storage methods');
        } catch (error) {
            console.error('Error storing free trial flag:', error);
        }
    }

    async checkFreeTrialUsed(emailHash) {
        const flag = `freetrial_used_${emailHash}`;
        
        try {
            // Check all storage locations
            const checks = await Promise.allSettled([
                this.checkLocalStorage(flag),
                this.checkSessionStorage(flag),
                this.checkCookie(flag),
                this.checkIndexedDB(flag),
                this.checkCache(flag, emailHash)
            ]);
            
            // Return true if ANY storage indicates usage
            return checks.some(result => result.status === 'fulfilled' && result.value === true);
        } catch (error) {
            console.error('Error checking free trial usage:', error);
            return false; // Don't block on check errors
        }
    }

    checkLocalStorage(flag) {
        try {
            return Promise.resolve(!!localStorage.getItem(flag));
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    checkSessionStorage(flag) {
        try {
            return Promise.resolve(!!sessionStorage.getItem(flag));
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    checkCookie(flag) {
        try {
            return Promise.resolve(document.cookie.includes(flag + '='));
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

    async checkCache(flag, emailHash) {
        try {
            if (!('caches' in window)) return false;
            
            const cache = await caches.open('freetrial-cache');
            const response = await cache.match(`/freetrial/${emailHash}`);
            return !!response;
        } catch (error) {
            return false;
        }
    }

    // ===============================================================================================
    // FREE TRIAL FORM SUBMISSION
    // ===============================================================================================

    async handleFreeTrialFormSubmission(event) {
        event.preventDefault();
        
        if (!this.state.cookieConsentGiven) {
            this.showNotification('Cookie consent required for free trial', 'error');
            return;
        }

        const emailInput = document.getElementById('trialEmail');
        const repoUrlInput = document.getElementById('repoUrl'); // Main form repo URL
        
        if (!emailInput || !repoUrlInput) {
            this.showNotification('Required form elements not found', 'error');
            return;
        }

        const email = emailInput.value.trim();
        const repoUrl = repoUrlInput.value.trim();

        if (!email || !repoUrl) {
            this.showNotification('Please fill in both email and repository URL', 'error');
            return;
        }

        try {
            // Final validation steps
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }

            // 1. Final email validation
            if (!this.state.emailValidated) {
                await this.validateTrialEmail();
                if (!this.state.emailValidated) {
                    throw new Error('Email validation failed');
                }
            }

            // 2. Repository duplicate check
            const repoCheck = await this.checkRepositoryDuplicate(repoUrl);
            if (repoCheck.error) {
                throw new Error(repoCheck.error);
            }
            if (repoCheck.isDuplicate) {
                throw new Error(repoCheck.message);
            }

            // 3. Generate monthly key
            const freeTrialKey = await this.generateMonthlyFreeTrialKey(email);

            // 4. Set persistent usage flags
            await this.setFreeTrialUsedFlag(this.emailHash);

            // 5. Update main form with generated key
            await this.populateMainFormWithTrialKey(freeTrialKey);

            // 6. Show success and close modal
            this.showTrialKeySuccess(freeTrialKey);
            
        } catch (error) {
            console.error('Free trial submission error:', error);
            this.showNotification(error.message || 'Free trial setup failed. Please try again.', 'error');
        } finally {
            // Reset submit button
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Start Free Trial';
            }
        }
    }

    async populateMainFormWithTrialKey(freeTrialKey) {
        const licenseKeyInput = document.getElementById('licenseKey');
        if (licenseKeyInput) {
            licenseKeyInput.value = freeTrialKey;
            licenseKeyInput.disabled = true; // Prevent editing
            
            // Trigger validation if available
            if (typeof validateLicenseKey === 'function') {
                await validateLicenseKey();
            }
        }
    }

    showTrialKeySuccess(freeTrialKey) {
        // Close free trial modal
        const modal = document.getElementById('freeTrialModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Show success notification with copy functionality
        this.showTrialKeyModal(freeTrialKey);
    }

    showTrialKeyModal(freeTrialKey) {
        // Create or update trial key display modal
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

            // Add event listeners
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
            // Fallback for browsers without clipboard API
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

    // ===============================================================================================
    // UTILITY FUNCTIONS
    // ===============================================================================================

    getEndOfCurrentMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    getExpectedCountryFromTimezone() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Simple mapping - extend as needed
        if (timezone.includes('America')) return 'US';
        if (timezone.includes('Europe')) return 'EU';
        if (timezone.includes('Asia/Kolkata')) return 'IN';
        return 'Unknown';
    }

    isPrivateIP(ip) {
        return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(ip);
    }

    isValidPublicIP(ip) {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        return ipRegex.test(ip) && !this.isPrivateIP(ip);
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Create or update notification element
        let notification = document.getElementById('freeTrialNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'freeTrialNotification';
            notification.className = 'free-trial-notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `free-trial-notification ${type} show`;

        // Auto-hide after duration
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
