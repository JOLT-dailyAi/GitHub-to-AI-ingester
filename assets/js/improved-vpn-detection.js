// More Accurate VPN Detection with reduced false positives
class AccurateVPNDetection {
    constructor() {
        this.config = {
            TIMEOUT: 5000,
            CONFIDENCE_THRESHOLD: 75 // Higher threshold to reduce false positives
        };
    }

    async detectVPN() {
        console.log('🔍 Starting accurate VPN detection...');
        
        const results = await Promise.allSettled([
            this.testWebRTC(),
            this.testConsistentLatency(),
            this.testSpecificIndicators()
        ]);

        const webrtc = results[0].status === 'fulfilled' ? results[0].value : { score: 0 };
        const latency = results[1].status === 'fulfilled' ? results[1].value : { score: 0 };
        const specific = results[2].status === 'fulfilled' ? results[2].value : { score: 0 };

        const totalScore = webrtc.score + latency.score + specific.score;
        const isVPN = totalScore >= this.config.CONFIDENCE_THRESHOLD;

        console.log('Accurate VPN Detection Results:', {
            webrtc: webrtc,
            latency: latency,
            specific: specific,
            totalScore: totalScore,
            threshold: this.config.CONFIDENCE_THRESHOLD,
            isVPN: isVPN
        });

        return isVPN;
    }

    testWebRTC() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                // WebRTC not available - suspicious but not definitive
                resolve({ score: 15, reason: 'webrtc_unavailable' });
                return;
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            let candidateCount = 0;
            let hasLocalIP = false;
            let publicIPs = new Set();
            let relayCount = 0;
            let hostCount = 0;

            const timeout = setTimeout(() => {
                pc.close();
                
                let score = 0;
                let reason = '';

                // More sophisticated analysis
                if (candidateCount === 0) {
                    score = 25; // Reduced from 40
                    reason = 'no_ice_candidates';
                } else if (relayCount > 0 && hostCount === 0) {
                    // Only relay candidates, no host - strong VPN indicator
                    score = 50;
                    reason = 'relay_only';
                } else if (publicIPs.size > 2) {
                    // Multiple different public IPs - very suspicious
                    score = 45;
                    reason = 'multiple_public_ips';
                } else if (!hasLocalIP && publicIPs.size > 0) {
                    // Public IP but no local - moderate suspicion
                    score = 20; // Reduced from 35
                    reason = 'no_local_ip';
                } else {
                    score = 0;
                    reason = 'normal_webrtc';
                }

                resolve({ 
                    score, 
                    reason,
                    details: { 
                        candidateCount, 
                        hasLocalIP, 
                        publicIPCount: publicIPs.size,
                        relayCount,
                        hostCount
                    }
                });
            }, 4000); // Increased timeout

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidateCount++;
                    const parts = event.candidate.candidate.split(' ');
                    const ip = parts[4];
                    const type = parts[7]; // candidate type
                    
                    if (type === 'relay') relayCount++;
                    if (type === 'host') hostCount++;
                    
                    if (this.isPrivateIP(ip)) {
                        hasLocalIP = true;
                    } else if (this.isValidPublicIP(ip)) {
                        publicIPs.add(ip);
                    }
                }
            };

            pc.createDataChannel('test');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {
                    clearTimeout(timeout);
                    pc.close();
                    resolve({ score: 10, reason: 'webrtc_error' });
                });
        });
    }

    async testConsistentLatency() {
        try {
            // Test multiple rounds to check for consistency
            const rounds = 2;
            const allLatencies = [];
            
            for (let round = 0; round < rounds; round++) {
                const roundLatencies = await this.measureLatencyRound();
                allLatencies.push(...roundLatencies);
                
                // Small delay between rounds
                if (round < rounds - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const validLatencies = allLatencies.filter(l => l > 0 && l < 10000);
            
            if (validLatencies.length < 3) {
                return { score: 15, reason: 'insufficient_latency_data' };
            }

            const avgLatency = validLatencies.reduce((a, b) => a + b) / validLatencies.length;
            const maxLatency = Math.max(...validLatencies);
            const variance = this.calculateVariance(validLatencies);
            
            let score = 0;
            let reason = '';

            // Adjusted thresholds for global users
            if (avgLatency > 2000) { // Very high average
                score = 25;
                reason = 'very_high_latency';
            } else if (variance > 100000) { // Very inconsistent
                score = 20;
                reason = 'inconsistent_latency';
            } else if (maxLatency > 5000) { // Some very slow responses
                score = 15;
                reason = 'some_slow_responses';
            } else if (avgLatency > 1000) { // High but reasonable for some locations
                score = 5; // Very low score
                reason = 'moderate_latency';
            } else {
                score = 0;
                reason = 'normal_latency';
            }

            return { 
                score, 
                reason,
                details: { 
                    avgLatency: Math.round(avgLatency), 
                    maxLatency: Math.round(maxLatency),
                    variance: Math.round(variance),
                    sampleCount: validLatencies.length
                }
            };
        } catch (error) {
            return { score: 5, reason: 'latency_test_failed' };
        }
    }

    async measureLatencyRound() {
        const testSites = [
            'https://www.google.com/favicon.ico',
            'https://www.cloudflare.com/favicon.ico',
            'https://www.microsoft.com/favicon.ico'
        ];

        const latencies = [];
        
        for (const site of testSites) {
            const start = performance.now();
            try {
                await fetch(site, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(5000)
                });
                const latency = performance.now() - start;
                latencies.push(latency);
            } catch (error) {
                // Don't penalize failed requests as much
                latencies.push(3000); // Moderate penalty instead of 5000
            }
        }

        return latencies;
    }

    testSpecificIndicators() {
        try {
            let score = 0;
            let indicators = [];

            // 1. Very specific VPN indicators in user agent
            const ua = navigator.userAgent.toLowerCase();
            const vpnKeywords = ['vpn', 'proxy', 'tor', 'tunnel', 'anonymizer'];
            if (vpnKeywords.some(keyword => ua.includes(keyword))) {
                score += 40; // High confidence for explicit VPN in UA
                indicators.push('vpn_in_useragent');
            }

            // 2. Headless browser indicators (more specific)
            const headlessIndicators = [
                navigator.webdriver === true,
                window.phantom !== undefined,
                window._phantom !== undefined,
                document.documentElement.getAttribute('webdriver') !== null
            ];

            if (headlessIndicators.some(indicator => indicator)) {
                score += 30;
                indicators.push('headless_browser');
            }

            // 3. Plugin count (less aggressive)
            if (navigator.plugins.length === 0 && 
                !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent) &&
                !/Chrome/.test(navigator.userAgent)) { // Chrome can have 0 plugins normally
                score += 15; // Reduced from 25
                indicators.push('no_plugins');
            }

            // 4. Removed timezone checking as it was causing false positives

            // 5. Very specific screen resolution patterns (VMs)
            const width = screen.width;
            const height = screen.height;
            const commonVMResolutions = [
                [800, 600], [1024, 768], [1152, 864], [1280, 960]
            ];
            
            if (commonVMResolutions.some(([w, h]) => 
                Math.abs(width - w) < 5 && Math.abs(height - h) < 5)) {
                score += 20;
                indicators.push('vm_resolution');
            }

            // 6. Check for specific VPN-related properties
            if (window.chrome && window.chrome.webstore === undefined && 
                navigator.userAgent.includes('Chrome')) {
                score += 10;
                indicators.push('modified_chrome');
            }

            return { 
                score, 
                reason: indicators.join(',') || 'normal_indicators',
                details: { 
                    indicators, 
                    pluginCount: navigator.plugins.length,
                    screenRes: `${width}x${height}`,
                    userAgent: navigator.userAgent.substring(0, 100) + '...'
                }
            };
        } catch (error) {
            return { score: 0, reason: 'indicator_test_failed' };
        }
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b) / numbers.length;
        const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
        return squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
    }

    isPrivateIP(ip) {
        if (!ip) return false;
        return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(ip);
    }

    isValidPublicIP(ip) {
        if (!ip) return false;
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip) && !this.isPrivateIP(ip);
    }
}

// Replace the previous version
window.ImprovedVPNDetection = AccurateVPNDetection;

// Complete ImprovedCookieManager class - add this to your improved-vpn-detection.js file
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
            <div id="cookieInstructionsModal" class="modal" style="
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.5);
            ">
                <div class="modal-content" style="
                    background-color: #fefefe;
                    margin: 5% auto;
                    padding: 20px;
                    border: 1px solid #888;
                    width: 90%;
                    max-width: 600px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                ">
                    <span class="close" onclick="this.parentElement.parentElement.style.display='none'" style="
                        color: #aaa;
                        float: right;
                        font-size: 28px;
                        font-weight: bold;
                        cursor: pointer;
                        line-height: 1;
                    ">&times;</span>
                    <h2 style="margin-top: 0; color: #333;">Enable Cookies Required</h2>
                    <p style="color: #666; margin-bottom: 20px;">To use the free trial, please enable cookies in your browser:</p>
                    
                    <div class="cookie-instructions" style="margin: 20px 0;">
                        <div class="browser-instruction" style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #333;">Chrome:</h4>
                            <ol style="color: #666; line-height: 1.5;">
                                <li>Click the three dots menu → Settings</li>
                                <li>Go to Privacy and security → Cookies</li>
                                <li>Select "Allow all cookies" or add this site to exceptions</li>
                            </ol>
                        </div>
                        
                        <div class="browser-instruction" style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #333;">Firefox:</h4>
                            <ol style="color: #666; line-height: 1.5;">
                                <li>Click the menu button → Settings</li>
                                <li>Go to Privacy & Security</li>
                                <li>Under Cookies, select "Standard" or add exception</li>
                            </ol>
                        </div>
                        
                        <div class="browser-instruction" style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #333;">Safari:</h4>
                            <ol style="color: #666; line-height: 1.5;">
                                <li>Safari menu → Preferences</li>
                                <li>Privacy tab</li>
                                <li>Uncheck "Block all cookies"</li>
                            </ol>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="location.reload()" class="btn-primary" style="
                            background-color: #007bff;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            margin: 5px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">I've Enabled Cookies - Retry</button>
                        <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn-secondary" style="
                            background-color: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            margin: 5px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('cookieInstructionsModal');
    }
}

// Export for use
window.ImprovedCookieManager = ImprovedCookieManager;

