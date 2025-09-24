// CORS-free VPN Detection with fallback methods
class ImprovedVPNDetection {
    constructor() {
        this.config = {
            // More specific VPN ASNs (removed major cloud providers)
            KNOWN_VPN_ASNS: [
                'AS396982', 'AS63023', 'AS397444', 'AS54600', // Specific VPN providers
                'AS174', 'AS3356', 'AS1299' // Known VPN transit providers
            ],
            // Reduced timeout for faster user experience
            VPN_DETECTION_TIMEOUT: 2000,
            // Confidence scoring system
            VPN_CONFIDENCE_THRESHOLD: 60 // Out of 100
        };
        
        this.detectionResults = {
            webrtc: { detected: false, confidence: 0, reason: '' },
            dns: { detected: false, confidence: 0, reason: '' },
            behavioral: { detected: false, confidence: 0, reason: '' }
        };
    }

    async detectVPN() {
        try {
            // Run detections in parallel - removed API-dependent methods
            const [webrtcResult, dnsResult, behavioralResult] = await Promise.allSettled([
                this.detectVPNWebRTCImproved(),
                this.detectVPNDNSBehavior(),
                this.detectVPNBehavioral()
            ]);

            // Process results with confidence scoring
            this.processDetectionResult(webrtcResult, 'webrtc');
            this.processDetectionResult(dnsResult, 'dns');
            this.processDetectionResult(behavioralResult, 'behavioral');

            // Calculate overall confidence
            const totalConfidence = this.calculateOverallConfidence();
            
            console.log('VPN Detection Results:', {
                confidence: totalConfidence,
                details: this.detectionResults,
                threshold: this.config.VPN_CONFIDENCE_THRESHOLD
            });

            return totalConfidence >= this.config.VPN_CONFIDENCE_THRESHOLD;
        } catch (error) {
            console.error('VPN detection error:', error);
            // Fail open - don't block users on detection errors
            return false;
        }
    }

    processDetectionResult(result, method) {
        if (result.status === 'fulfilled' && result.value) {
            this.detectionResults[method] = result.value;
        } else {
            this.detectionResults[method] = { detected: false, confidence: 0, reason: 'detection_failed' };
        }
    }

    calculateOverallConfidence() {
        const weights = { webrtc: 0.5, dns: 0.3, behavioral: 0.2 };
        let totalConfidence = 0;

        Object.keys(this.detectionResults).forEach(method => {
            if (this.detectionResults[method].detected) {
                totalConfidence += this.detectionResults[method].confidence * weights[method];
            }
        });

        return Math.round(totalConfidence);
    }

    detectVPNWebRTCImproved() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                resolve({ detected: false, confidence: 0, reason: 'webrtc_unavailable' });
                return;
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            let localIPs = new Set();
            let publicIPs = new Set();
            let candidateCount = 0;

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidateCount++;
                    const ip = event.candidate.candidate.split(' ')[4];
                    
                    if (this.isPrivateIP(ip)) {
                        localIPs.add(ip);
                    } else if (this.isValidPublicIP(ip)) {
                        publicIPs.add(ip);
                    }
                }
            };

            pc.createDataChannel('test');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => resolve({ detected: false, confidence: 0, reason: 'offer_failed' }));

            setTimeout(() => {
                pc.close();
                
                // More sophisticated analysis
                const publicIPCount = publicIPs.size;
                const localIPCount = localIPs.size;
                
                let confidence = 0;
                let reason = '';
                let detected = false;

                if (candidateCount === 0) {
                    // No candidates - might be blocked/VPN
                    confidence = 40;
                    reason = 'no_candidates';
                    detected = true;
                } else if (publicIPCount > 2) {
                    // Multiple public IPs - high VPN probability
                    confidence = 85;
                    reason = 'multiple_public_ips';
                    detected = true;
                } else if (publicIPCount === 1 && localIPCount === 0) {
                    // Only public IP, no local - moderate VPN probability
                    confidence = 60;
                    reason = 'no_local_ip';
                    detected = true;
                } else if (localIPCount > 3) {
                    // Too many local IPs - might indicate VPN tunneling
                    confidence = 50;
                    reason = 'excessive_local_ips';
                    detected = true;
                }

                resolve({ detected, confidence, reason, details: { publicIPCount, localIPCount, candidateCount } });
            }, this.config.VPN_DETECTION_TIMEOUT);
        });
    }

    // DNS-based detection (CORS-free)
    async detectVPNDNSBehavior() {
        try {
            const dnsTests = [
                this.testDNSResolution('google.com'),
                this.testDNSResolution('cloudflare.com'),
                this.testDNSResolution('1.1.1.1')
            ];

            const results = await Promise.allSettled(dnsTests);
            const failedCount = results.filter(r => r.status === 'rejected').length;
            
            let confidence = 0;
            let detected = false;
            
            if (failedCount >= 2) {
                confidence = 40;
                detected = true;
            } else if (failedCount === 1) {
                confidence = 20;
                detected = true;
            }

            return {
                detected,
                confidence,
                reason: `dns_failures_${failedCount}`,
                details: { failedCount, totalTests: dnsTests.length }
            };
        } catch (error) {
            return { detected: false, confidence: 0, reason: 'dns_test_failed' };
        }
    }

    async testDNSResolution(domain) {
        return new Promise((resolve, reject) => {
            const start = performance.now();
            fetch(`https://${domain}/favicon.ico`, { 
                method: 'HEAD', 
                mode: 'no-cors',
                signal: AbortSignal.timeout(3000)
            })
            .then(() => {
                const duration = performance.now() - start;
                resolve(duration);
            })
            .catch(reject);
        });
    }

    // Behavioral detection (user agent, screen, etc.)
    detectVPNBehavioral() {
        try {
            let confidence = 0;
            let indicators = [];
            
            // Check for common VPN user agent patterns
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('vpn') || ua.includes('proxy') || ua.includes('tor')) {
                confidence += 60;
                indicators.push('suspicious_user_agent');
            }

            // Check screen resolution patterns common with VPNs/VMs
            const screenRatio = screen.width / screen.height;
            if (screenRatio === 1.25 || screenRatio === 1.6) { // Common VM ratios
                confidence += 20;
                indicators.push('vm_screen_ratio');
            }

            // Check for headless browser indicators
            if (navigator.webdriver || window.phantom || window._phantom) {
                confidence += 40;
                indicators.push('headless_browser');
            }

            // Check timezone vs language mismatch
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language;
            if (this.isTimezoneLangMismatch(timezone, language)) {
                confidence += 25;
                indicators.push('timezone_lang_mismatch');
            }

            const detected = confidence >= 30;
            
            return Promise.resolve({
                detected,
                confidence: Math.min(confidence, 80),
                reason: indicators.join(',') || 'clean_behavioral',
                details: { indicators, timezone, language }
            });
        } catch (error) {
            return Promise.resolve({ detected: false, confidence: 0, reason: 'behavioral_test_failed' });
        }
    }

    isTimezoneLangMismatch(timezone, language) {
        // Basic timezone/language correlation check
        const tzLangMap = {
            'en': ['America/', 'Europe/London'],
            'es': ['America/Mexico', 'Europe/Madrid'],
            'fr': ['Europe/Paris', 'America/Montreal'],
            'de': ['Europe/Berlin', 'Europe/Zurich'],
            'ja': ['Asia/Tokyo'],
            'zh': ['Asia/Shanghai', 'Asia/Hong_Kong'],
            'ru': ['Europe/Moscow', 'Asia/Yekaterinburg']
        };

        const baseLang = language.split('-')[0];
        const expectedTzs = tzLangMap[baseLang];
        
        if (!expectedTzs) return false;
        return !expectedTzs.some(tz => timezone.includes(tz));
    }

    isPrivateIP(ip) {
        return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|fc00:|fe80:)/i.test(ip);
    }

    isValidPublicIP(ip) {
        const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return (ipv4Regex.test(ip) || ipv6Regex.test(ip)) && !this.isPrivateIP(ip);
    }
}

// Improved Cookie Detection (unchanged, working correctly)
class ImprovedCookieManager {
    static areCookiesEnabled() {
        try {
            // Test multiple cookie scenarios
            const testValue = 'test_' + Date.now();
            
            // Test basic cookie
            document.cookie = `cookietest=${testValue}; SameSite=Strict; path=/`;
            const basicTest = document.cookie.indexOf(`cookietest=${testValue}`) !== -1;
            
            // Clean up test cookie
            document.cookie = 'cookietest=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            
            // Test localStorage as additional check
            let localStorageTest = false;
            try {
                localStorage.setItem('lsTest', testValue);
                localStorageTest = localStorage.getItem('lsTest') === testValue;
                localStorage.removeItem('lsTest');
            } catch (e) {
                localStorageTest = false;
            }
            
            return {
                cookies: basicTest,
                localStorage: localStorageTest,
                overall: basicTest || localStorageTest,
                details: { basicTest, localStorageTest }
            };
        } catch (error) {
            console.error('Cookie detection error:', error);
            return { cookies: false, localStorage: false, overall: false, error: error.message };
        }
    }

    static showCookieEnableInstructions() {
        const modal = this.createInstructionModal();
        modal.style.display = 'block';
    }

    static createInstructionModal() {
        let modal = document.getElementById('cookieInstructionsModal');
        if (modal) return modal;

        const modalHTML = `
            <div id="cookieInstructionsModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="this.parentElement.parentElement.style.display='none'">&times;</span>
                    <h2>Enable Cookies Required</h2>
                    <p>To use the free trial, please enable cookies in your browser:</p>
                    
                    <div class="cookie-instructions">
                        <div class="browser-instruction">
                            <h4>Chrome:</h4>
                            <ol>
                                <li>Click the three dots menu → Settings</li>
                                <li>Go to Privacy and security → Cookies</li>
                                <li>Select "Allow all cookies" or add this site to exceptions</li>
                            </ol>
                        </div>
                        
                        <div class="browser-instruction">
                            <h4>Firefox:</h4>
                            <ol>
                                <li>Click the menu button → Settings</li>
                                <li>Go to Privacy & Security</li>
                                <li>Under Cookies, select "Standard" or add exception</li>
                            </ol>
                        </div>
                        
                        <div class="browser-instruction">
                            <h4>Safari:</h4>
                            <ol>
                                <li>Safari menu → Preferences</li>
                                <li>Privacy tab</li>
                                <li>Uncheck "Block all cookies"</li>
                            </ol>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="location.reload()" class="btn-primary">I've Enabled Cookies - Retry</button>
                        <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('cookieInstructionsModal');
    }
}

// Export for use
window.ImprovedVPNDetection = ImprovedVPNDetection;
window.ImprovedCookieManager = ImprovedCookieManager;
