// Simple but Effective VPN Detection
class SimpleVPNDetection {
    constructor() {
        this.config = {
            TIMEOUT: 5000,
            CONFIDENCE_THRESHOLD: 60
        };
    }

    async detectVPN() {
        console.log('🔍 Starting simple VPN detection...');
        
        const results = await Promise.allSettled([
            this.testWebRTC(),
            this.testLatency(),
            this.testHeaders()
        ]);

        const webrtc = results[0].status === 'fulfilled' ? results[0].value : { score: 0 };
        const latency = results[1].status === 'fulfilled' ? results[1].value : { score: 0 };
        const headers = results[2].status === 'fulfilled' ? results[2].value : { score: 0 };

        const totalScore = webrtc.score + latency.score + headers.score;
        const isVPN = totalScore >= this.config.CONFIDENCE_THRESHOLD;

        console.log('VPN Detection Results:', {
            webrtc: webrtc,
            latency: latency,
            headers: headers,
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
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            let candidateCount = 0;
            let hasLocalIP = false;
            let publicIPs = new Set();

            const timeout = setTimeout(() => {
                pc.close();
                
                let score = 0;
                let reason = '';

                if (candidateCount === 0) {
                    score = 40;
                    reason = 'no_candidates';
                } else if (!hasLocalIP) {
                    score = 35;
                    reason = 'no_local_ip';
                } else if (publicIPs.size > 1) {
                    score = 45;
                    reason = 'multiple_public_ips';
                } else {
                    score = 0;
                    reason = 'normal_webrtc';
                }

                resolve({ 
                    score, 
                    reason,
                    details: { candidateCount, hasLocalIP, publicIPCount: publicIPs.size }
                });
            }, 3000);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidateCount++;
                    const ip = event.candidate.candidate.split(' ')[4];
                    
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
                    resolve({ score: 25, reason: 'webrtc_error' });
                });
        });
    }

    async testLatency() {
        try {
            const testSites = [
                'https://www.google.com/favicon.ico',
                'https://www.cloudflare.com/favicon.ico',
                'https://www.github.com/favicon.ico'
            ];

            const latencies = [];
            
            for (const site of testSites) {
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
                    // Site blocked or slow - might indicate VPN
                    latencies.push(5000);
                }
            }

            const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
            const maxLatency = Math.max(...latencies);

            let score = 0;
            let reason = '';

            if (avgLatency > 1000) {
                score = 30;
                reason = 'high_avg_latency';
            } else if (maxLatency > 3000) {
                score = 25;
                reason = 'high_max_latency';
            } else if (avgLatency > 500) {
                score = 15;
                reason = 'moderate_latency';
            } else {
                score = 0;
                reason = 'normal_latency';
            }

            return { 
                score, 
                reason,
                details: { avgLatency: Math.round(avgLatency), maxLatency: Math.round(maxLatency) }
            };
        } catch (error) {
            return { score: 10, reason: 'latency_test_failed' };
        }
    }

    testHeaders() {
        try {
            let score = 0;
            let indicators = [];

            // Check user agent for VPN indicators
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('vpn') || ua.includes('proxy') || ua.includes('tor')) {
                score += 30;
                indicators.push('suspicious_ua');
            }

            // Check for headless browser
            if (navigator.webdriver || 
                window.phantom || 
                window._phantom ||
                document.documentElement.getAttribute('webdriver') ||
                (navigator.plugins.length === 0 && !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent))) {
                score += 25;
                indicators.push('headless');
            }

            // Check timezone vs language
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const lang = navigator.language.split('-')[0];
            
            if (this.isTimezoneSuspicious(timezone, lang)) {
                score += 20;
                indicators.push('timezone_mismatch');
            }

            // Check for unusual screen resolution
            const screenRatio = screen.width / screen.height;
            if (screenRatio === 1.25 || screenRatio === 1.6 || 
                (screen.width === 800 && screen.height === 600) ||
                (screen.width === 1024 && screen.height === 768)) {
                score += 15;
                indicators.push('vm_screen');
            }

            return { 
                score, 
                reason: indicators.join(',') || 'normal_headers',
                details: { indicators, timezone, lang, screenRatio }
            };
        } catch (error) {
            return { score: 0, reason: 'header_test_failed' };
        }
    }

    isTimezoneSuspicious(timezone, lang) {
        const commonPairs = {
            'en': ['America/', 'Europe/London', 'Australia/', 'Pacific/'],
            'es': ['Europe/Madrid', 'America/Mexico', 'America/Argentina', 'America/Chile'],
            'fr': ['Europe/Paris', 'America/Montreal', 'Africa/'],
            'de': ['Europe/Berlin', 'Europe/Zurich', 'Europe/Vienna'],
            'it': ['Europe/Rome'],
            'pt': ['Europe/Lisbon', 'America/Sao_Paulo'],
            'ru': ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk'],
            'ja': ['Asia/Tokyo'],
            'ko': ['Asia/Seoul'],
            'zh': ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei']
        };

        const expectedPatterns = commonPairs[lang];
        if (!expectedPatterns) return false;

        return !expectedPatterns.some(pattern => timezone.includes(pattern));
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

// Replace the complex version
window.ImprovedVPNDetection = SimpleVPNDetection;

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

