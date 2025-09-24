// Improved VPN Detection with reduced false positives
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
            ip: { detected: false, confidence: 0, reason: '' },
            timezone: { detected: false, confidence: 0, reason: '' }
        };
    }

    async detectVPN() {
        try {
            // Run detections in parallel with reduced aggression
            const [webrtcResult, ipResult, timezoneResult] = await Promise.allSettled([
                this.detectVPNWebRTCImproved(),
                this.detectVPNIPAnalysis(),
                this.detectVPNTimezoneImproved()
            ]);

            // Process results with confidence scoring
            this.processDetectionResult(webrtcResult, 'webrtc');
            this.processDetectionResult(ipResult, 'ip');
            this.processDetectionResult(timezoneResult, 'timezone');

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
        const weights = { webrtc: 0.4, ip: 0.4, timezone: 0.2 }; // Reduced timezone weight
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
                    confidence = 30;
                    reason = 'no_candidates';
                    detected = true;
                } else if (publicIPCount > 2) {
                    // Multiple public IPs - high VPN probability
                    confidence = 80;
                    reason = 'multiple_public_ips';
                    detected = true;
                } else if (publicIPCount === 1 && localIPCount === 0) {
                    // Only public IP, no local - moderate VPN probability
                    confidence = 50;
                    reason = 'no_local_ip';
                    detected = true;
                } else if (localIPCount > 3) {
                    // Too many local IPs - might indicate VPN tunneling
                    confidence = 40;
                    reason = 'excessive_local_ips';
                    detected = true;
                }

                resolve({ detected, confidence, reason, details: { publicIPCount, localIPCount, candidateCount } });
            }, this.config.VPN_DETECTION_TIMEOUT);
        });
    }

    async detectVPNIPAnalysis() {
        try {
            const response = await fetch('https://ipapi.co/json/', {
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) {
                return { detected: false, confidence: 0, reason: 'api_failed' };
            }

            const data = await response.json();
            let confidence = 0;
            let indicators = [];
            
            // Check organization name for VPN indicators
            const org = (data.org || '').toLowerCase();
            if (org.includes('vpn')) {
                confidence += 40;
                indicators.push('org_contains_vpn');
            }
            if (org.includes('proxy')) {
                confidence += 35;
                indicators.push('org_contains_proxy');
            }
            if (org.includes('hosting') && !org.includes('web hosting')) {
                confidence += 20;
                indicators.push('hosting_provider');
            }
            if (org.includes('datacenter') || org.includes('data center')) {
                confidence += 25;
                indicators.push('datacenter');
            }

            // Check ASN against known VPN providers (more specific list)
            if (data.asn && this.config.KNOWN_VPN_ASNS.includes(data.asn)) {
                confidence += 30;
                indicators.push('known_vpn_asn');
            }

            // Check for suspicious network types
            if (data.network_type === 'hosting' || data.network_type === 'business') {
                confidence += 15;
                indicators.push('suspicious_network_type');
            }

            const detected = confidence >= 30; // Lower threshold for IP detection
            
            return { 
                detected, 
                confidence: Math.min(confidence, 90), // Cap at 90% for IP detection
                reason: indicators.join(',') || 'clean_ip',
                details: { org: data.org, asn: data.asn, country: data.country_code }
            };
        } catch (error) {
            console.error('IP analysis error:', error);
            return { detected: false, confidence: 0, reason: 'analysis_failed' };
        }
    }

    async detectVPNTimezoneImproved() {
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch('https://ipapi.co/json/', {
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) {
                return { detected: false, confidence: 0, reason: 'api_failed' };
            }

            const data = await response.json();
            const ipTimezone = data.timezone;
            
            if (!ipTimezone) {
                return { detected: false, confidence: 0, reason: 'no_timezone_data' };
            }

            // More sophisticated timezone comparison
            const userTZ = new Date().toLocaleString('en', { timeZoneName: 'short', timeZone: userTimezone });
            const ipTZ = new Date().toLocaleString('en', { timeZoneName: 'short', timeZone: ipTimezone });
            
            // Extract timezone offsets for comparison
            const userOffset = new Date().getTimezoneOffset();
            const ipOffset = this.getTimezoneOffset(ipTimezone);
            
            const offsetDifference = Math.abs(userOffset - ipOffset);
            let confidence = 0;
            
            if (userTimezone !== ipTimezone) {
                if (offsetDifference > 180) { // More than 3 hours difference
                    confidence = 40;
                } else if (offsetDifference > 60) { // 1-3 hours difference
                    confidence = 25;
                } else {
                    confidence = 10; // Same timezone family, low confidence
                }
            }

            const detected = confidence >= 25;
            
            return { 
                detected, 
                confidence,
                reason: detected ? 'timezone_mismatch' : 'timezone_match',
                details: { userTimezone, ipTimezone, offsetDifference }
            };
        } catch (error) {
            console.error('Timezone detection error:', error);
            return { detected: false, confidence: 0, reason: 'detection_failed' };
        }
    }

    getTimezoneOffset(timezone) {
        try {
            const date = new Date();
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const targetTime = new Date(utc + (this.getTimezoneOffsetMinutes(timezone) * 60000));
            return -targetTime.getTimezoneOffset();
        } catch (error) {
            return 0;
        }
    }

    getTimezoneOffsetMinutes(timezone) {
        try {
            const date = new Date();
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
            const localDate = new Date(date.toLocaleString('en-US'));
            return (targetDate.getTime() - localDate.getTime()) / 60000;
        } catch (error) {
            return 0;
        }
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

// Improved Cookie Detection
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
