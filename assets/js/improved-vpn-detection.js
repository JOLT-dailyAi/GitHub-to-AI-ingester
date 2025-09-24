// More Sensitive VPN Detection - Better at catching modern VPNs
class SensitiveVPNDetection {
    constructor() {
        this.config = {
            TIMEOUT: 5000,
            CONFIDENCE_THRESHOLD: 40 // Lower threshold for better detection
        };
    }

    async detectVPN() {
        console.log('🔍 Starting sensitive VPN detection...');
        
        const results = await Promise.allSettled([
            this.testWebRTC(),
            this.testMultipleLatency(), 
            this.testBrowserFingerprint(),
            this.testNetworkBehavior()
        ]);

        const webrtc = results[0].status === 'fulfilled' ? results[0].value : { score: 0 };
        const latency = results[1].status === 'fulfilled' ? results[1].value : { score: 0 };
        const fingerprint = results[2].status === 'fulfilled' ? results[2].value : { score: 0 };
        const network = results[3].status === 'fulfilled' ? results[3].value : { score: 0 };

        const totalScore = webrtc.score + latency.score + fingerprint.score + network.score;
        const isVPN = totalScore >= this.config.CONFIDENCE_THRESHOLD;

        console.log('Sensitive VPN Detection Results:', {
            webrtc: webrtc,
            latency: latency,
            fingerprint: fingerprint,
            network: network,
            totalScore: totalScore,
            threshold: this.config.CONFIDENCE_THRESHOLD,
            isVPN: isVPN
        });

        return isVPN;
    }

    testWebRTC() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                resolve({ score: 20, reason: 'webrtc_blocked' });
                return;
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' }
                ]
            });

            let candidateCount = 0;
            let hasLocalIP = false;
            let publicIPs = new Set();
            let candidateTypes = new Set();
            let ipPatterns = new Set();

            const timeout = setTimeout(() => {
                pc.close();
                
                let score = 0;
                let reasons = [];

                // High-confidence indicators
                if (candidateCount === 0) {
                    score += 25;
                    reasons.push('no_candidates');
                }

                if (!hasLocalIP && candidateCount > 0) {
                    score += 20;
                    reasons.push('no_local_ip');
                }

                if (candidateTypes.has('relay') && !candidateTypes.has('host')) {
                    score += 30;
                    reasons.push('relay_only');
                }

                if (publicIPs.size > 1) {
                    score += 25;
                    reasons.push('multiple_public_ips');
                }

                // Check for unusual IP patterns
                const allIPs = Array.from(publicIPs);
                if (this.hasVPNIPPattern(allIPs)) {
                    score += 15;
                    reasons.push('vpn_ip_pattern');
                }

                // Very few candidates might indicate filtering
                if (candidateCount > 0 && candidateCount < 3) {
                    score += 10;
                    reasons.push('few_candidates');
                }

                resolve({ 
                    score, 
                    reason: reasons.join(',') || 'normal_webrtc',
                    details: { 
                        candidateCount, 
                        hasLocalIP, 
                        publicIPCount: publicIPs.size,
                        candidateTypes: Array.from(candidateTypes),
                        publicIPs: Array.from(publicIPs)
                    }
                });
            }, 4000);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidateCount++;
                    const parts = event.candidate.candidate.split(' ');
                    const ip = parts[4];
                    const type = parts[7];
                    
                    candidateTypes.add(type);
                    
                    if (this.isPrivateIP(ip)) {
                        hasLocalIP = true;
                        ipPatterns.add('private');
                    } else if (this.isValidPublicIP(ip)) {
                        publicIPs.add(ip);
                        ipPatterns.add('public');
                    } else {
                        ipPatterns.add('other');
                    }
                }
            };

            pc.createDataChannel('test');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {
                    clearTimeout(timeout);
                    pc.close();
                    resolve({ score: 15, reason: 'webrtc_error' });
                });
        });
    }

    async testMultipleLatency() {
        try {
            const testRounds = 3;
            const allResults = [];
            
            for (let round = 0; round < testRounds; round++) {
                const roundResult = await this.measureLatencyRound(round);
                allResults.push(roundResult);
                
                if (round < testRounds - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Analyze patterns across rounds
            const allLatencies = allResults.flat();
            const validLatencies = allLatencies.filter(l => l > 0 && l < 10000);
            
            if (validLatencies.length < 4) {
                return { score: 10, reason: 'insufficient_data' };
            }

            const avgLatency = validLatencies.reduce((a, b) => a + b) / validLatencies.length;
            const variance = this.calculateVariance(validLatencies);
            const maxLatency = Math.max(...validLatencies);
            const minLatency = Math.min(...validLatencies);
            const range = maxLatency - minLatency;

            let score = 0;
            let reasons = [];

            // High variance suggests routing through different servers
            if (variance > 50000) {
                score += 15;
                reasons.push('high_variance');
            }

            // Very high average latency
            if (avgLatency > 1500) {
                score += 12;
                reasons.push('high_avg_latency');
            }

            // Large range in response times
            if (range > 2000) {
                score += 10;
                reasons.push('inconsistent_timing');
            }

            // Some very slow responses
            if (maxLatency > 4000) {
                score += 8;
                reasons.push('slow_responses');
            }

            return { 
                score, 
                reason: reasons.join(',') || 'normal_latency',
                details: { 
                    avgLatency: Math.round(avgLatency),
                    variance: Math.round(variance),
                    range: Math.round(range),
                    sampleCount: validLatencies.length
                }
            };
        } catch (error) {
            return { score: 5, reason: 'latency_test_failed' };
        }
    }

    async measureLatencyRound(round) {
        const testSites = [
            'https://www.google.com/favicon.ico',
            'https://www.github.com/favicon.ico',
            'https://www.cloudflare.com/favicon.ico',
            'https://www.microsoft.com/favicon.ico'
        ];

        const latencies = [];
        
        // Test different sites each round for variety
        const sitesToTest = testSites.slice(0, 3);
        
        for (const site of sitesToTest) {
            const start = performance.now();
            try {
                await fetch(site, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(4000)
                });
                const latency = performance.now() - start;
                latencies.push(latency);
            } catch (error) {
                latencies.push(2000); // Moderate penalty
            }
        }

        return latencies;
    }

    testBrowserFingerprint() {
        try {
            let score = 0;
            let indicators = [];

            // 1. User Agent Analysis
            const ua = navigator.userAgent;
            const uaLower = ua.toLowerCase();
            
            // VPN-specific keywords
            const vpnKeywords = ['vpn', 'proxy', 'tor', 'tunnel', 'private', 'secure'];
            if (vpnKeywords.some(keyword => uaLower.includes(keyword))) {
                score += 25;
                indicators.push('vpn_keyword');
            }

            // Opera GX specific checks
            if (uaLower.includes('oprgx')) {
                score += 5; // Opera GX has built-in VPN
                indicators.push('opera_gx');
            }

            // 2. WebRTC leaks (additional check)
            if (typeof RTCPeerConnection === 'undefined' || 
                typeof webkitRTCPeerConnection === 'undefined') {
                score += 10;
                indicators.push('webrtc_disabled');
            }

            // 3. Plugin analysis
            const pluginCount = navigator.plugins.length;
            if (pluginCount === 0 && !this.isMobile()) {
                score += 12;
                indicators.push('no_plugins');
            }

            // 4. Screen resolution patterns
            const screen_score = this.analyzeScreenResolution();
            score += screen_score.score;
            if (screen_score.suspicious) {
                indicators.push('suspicious_screen');
            }

            // 5. Connection API
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                // Unusual connection types
                if (connection.effectiveType === 'slow-2g' && connection.downlink > 5) {
                    score += 8;
                    indicators.push('connection_mismatch');
                }
            }

            // 6. Language/locale checks (less aggressive)
            const languages = navigator.languages || [navigator.language];
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Only flag very obvious mismatches
            if (this.isObviousLocaleMismatch(languages, timezone)) {
                score += 8;
                indicators.push('locale_mismatch');
            }

            return { 
                score, 
                reason: indicators.join(',') || 'normal_fingerprint',
                details: { 
                    indicators,
                    pluginCount,
                    ua_snippet: ua.substring(0, 50) + '...',
                    languages: languages.slice(0, 3),
                    timezone
                }
            };
        } catch (error) {
            return { score: 0, reason: 'fingerprint_test_failed' };
        }
    }

    async testNetworkBehavior() {
        try {
            let score = 0;
            let indicators = [];

            // Test DNS behavior
            const dnsTest = await this.testDNSBehavior();
            score += dnsTest.score;
            if (dnsTest.suspicious) {
                indicators.push('dns_anomaly');
            }

            // Test request patterns
            const requestTest = await this.testRequestPatterns();
            score += requestTest.score;
            if (requestTest.suspicious) {
                indicators.push('request_pattern');
            }

            return {
                score,
                reason: indicators.join(',') || 'normal_network',
                details: { indicators, dnsTest, requestTest }
            };
        } catch (error) {
            return { score: 0, reason: 'network_test_failed' };
        }
    }

    async testDNSBehavior() {
        try {
            const dnsTests = [
                { host: 'dns.google', url: 'https://dns.google/favicon.ico' },
                { host: '1.1.1.1', url: 'https://1.1.1.1/favicon.ico' },
                { host: 'cloudflare', url: 'https://www.cloudflare.com/favicon.ico' }
            ];

            let failCount = 0;
            let slowCount = 0;

            for (const test of dnsTests) {
                const start = performance.now();
                try {
                    await fetch(test.url, {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: AbortSignal.timeout(3000)
                    });
                    const time = performance.now() - start;
                    if (time > 2000) slowCount++;
                } catch (error) {
                    failCount++;
                }
            }

            let score = 0;
            if (failCount >= 2) {
                score = 10;
            } else if (failCount === 1 && slowCount >= 1) {
                score = 5;
            }

            return {
                score,
                suspicious: score > 0,
                details: { failCount, slowCount }
            };
        } catch (error) {
            return { score: 0, suspicious: false };
        }
    }

    async testRequestPatterns() {
        try {
            // Test if requests consistently show patterns of proxying
            const testUrls = [
                'https://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'https://icanhazip.com'
            ];

            let successCount = 0;
            let responses = [];

            for (const url of testUrls) {
                try {
                    const response = await fetch(url, {
                        signal: AbortSignal.timeout(3000)
                    });
                    if (response.ok) {
                        successCount++;
                        const text = await response.text();
                        responses.push(text);
                    }
                } catch (error) {
                    // Request blocked/failed
                }
            }

            let score = 0;
            // If most IP detection services are blocked, might indicate VPN
            if (successCount === 0) {
                score = 8;
            } else if (successCount === 1) {
                score = 3;
            }

            return {
                score,
                suspicious: score > 0,
                details: { successCount, totalTests: testUrls.length }
            };
        } catch (error) {
            return { score: 0, suspicious: false };
        }
    }

    analyzeScreenResolution() {
        const width = screen.width;
        const height = screen.height;
        const ratio = width / height;

        // Common VPN/VM resolutions
        const suspiciousResolutions = [
            [800, 600], [1024, 768], [1152, 864], [1280, 960], [1280, 1024]
        ];

        const exactMatch = suspiciousResolutions.some(([w, h]) => 
            Math.abs(width - w) < 5 && Math.abs(height - h) < 5
        );

        const suspiciousRatios = [1.25, 1.333, 1.6];
        const ratioMatch = suspiciousRatios.some(r => Math.abs(ratio - r) < 0.01);

        let score = 0;
        if (exactMatch) score = 10;
        else if (ratioMatch) score = 5;

        return {
            score,
            suspicious: score > 0,
            details: { width, height, ratio }
        };
    }

    isObviousLocaleMismatch(languages, timezone) {
        // Only flag very obvious mismatches to avoid false positives
        const primaryLang = (languages[0] || '').split('-')[0].toLowerCase();
        
        const obviousMismatches = {
            'ja': !timezone.includes('Asia/Tokyo'),
            'ko': !timezone.includes('Asia/Seoul'),
            'zh': !timezone.includes('Asia/Shanghai') && !timezone.includes('Asia/Hong_Kong'),
            'ru': !timezone.includes('Europe/Moscow') && !timezone.includes('Asia/'),
            'fr': !timezone.includes('Europe/Paris') && !timezone.includes('America/Montreal') && !timezone.includes('Africa/')
        };

        return obviousMismatches[primaryLang] || false;
    }

    hasVPNIPPattern(ips) {
        const vpnPatterns = [
            /^10\.8\./,          // OpenVPN default
            /^10\.0\.0\./,       // Common VPN range
            /^172\.16\./,        // Private range used by some VPNs
            /^198\.18\./,        // RFC 2544 range sometimes used
        ];
        
        return ips.some(ip => vpnPatterns.some(pattern => pattern.test(ip)));
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b) / numbers.length;
        const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
        return squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
    }

    isMobile() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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

// Complete ImprovedCookieManager class
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

// Export both classes properly
window.ImprovedVPNDetection = SensitiveVPNDetection;
window.ImprovedCookieManager = ImprovedCookieManager;
