// Enhanced VPN Detection with proper fallback methods and better accuracy
class ImprovedVPNDetection {
    constructor() {
        this.config = {
            VPN_DETECTION_TIMEOUT: 3000,
            VPN_CONFIDENCE_THRESHOLD: 70, // Increased threshold for better accuracy
            MAX_RETRIES: 2
        };
        
        this.detectionResults = {
            webrtc: { detected: false, confidence: 0, reason: '', details: {} },
            timing: { detected: false, confidence: 0, reason: '', details: {} },
            behavioral: { detected: false, confidence: 0, reason: '', details: {} },
            network: { detected: false, confidence: 0, reason: '', details: {} }
        };
    }

    async detectVPN() {
        try {
            console.log('🔍 Starting VPN detection...');
            
            // Run detections in parallel with proper error handling
            const detectionPromises = [
                this.detectVPNWebRTC(),
                this.detectVPNTiming(),
                this.detectVPNBehavioral(),
                this.detectVPNNetwork()
            ];

            const results = await Promise.allSettled(detectionPromises);
            
            // Process results
            this.processDetectionResult(results[0], 'webrtc');
            this.processDetectionResult(results[1], 'timing');
            this.processDetectionResult(results[2], 'behavioral');
            this.processDetectionResult(results[3], 'network');

            // Calculate overall confidence
            const totalConfidence = this.calculateOverallConfidence();
            
            console.log('VPN Detection Results:', {
                confidence: totalConfidence,
                threshold: this.config.VPN_CONFIDENCE_THRESHOLD,
                details: this.detectionResults,
                isVPN: totalConfidence >= this.config.VPN_CONFIDENCE_THRESHOLD
            });

            return totalConfidence >= this.config.VPN_CONFIDENCE_THRESHOLD;
        } catch (error) {
            console.error('VPN detection error:', error);
            return false; // Fail open
        }
    }

    processDetectionResult(result, method) {
        if (result.status === 'fulfilled' && result.value) {
            this.detectionResults[method] = result.value;
        } else {
            this.detectionResults[method] = { 
                detected: false, 
                confidence: 0, 
                reason: 'detection_failed',
                error: result.reason?.message || 'unknown_error'
            };
        }
    }

    calculateOverallConfidence() {
        // Improved weighting system
        const weights = { 
            webrtc: 0.4,    // Most reliable when it works
            timing: 0.3,    // Good secondary indicator  
            behavioral: 0.2, // Less reliable but useful
            network: 0.1    // Supplementary
        };
        
        let totalConfidence = 0;
        let totalWeight = 0;

        Object.keys(this.detectionResults).forEach(method => {
            const result = this.detectionResults[method];
            if (result.confidence > 0) {
                totalConfidence += result.confidence * weights[method];
                totalWeight += weights[method];
            }
        });

        // Normalize based on actual contributing weights
        return totalWeight > 0 ? Math.round(totalConfidence / totalWeight * 100) / 100 : 0;
    }

    // Enhanced WebRTC detection with better analysis
    detectVPNWebRTC() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                resolve({ detected: false, confidence: 0, reason: 'webrtc_unavailable' });
                return;
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' }
                ]
            });

            let localIPs = new Set();
            let publicIPs = new Set();
            let candidateTypes = new Set();
            let candidateCount = 0;
            let timeoutReached = false;

            pc.onicecandidate = (event) => {
                if (event.candidate && !timeoutReached) {
                    candidateCount++;
                    const parts = event.candidate.candidate.split(' ');
                    const ip = parts[4];
                    const type = parts[7]; // candidate type
                    
                    candidateTypes.add(type);
                    
                    if (this.isPrivateIP(ip)) {
                        localIPs.add(ip);
                    } else if (this.isValidPublicIP(ip)) {
                        publicIPs.add(ip);
                    }
                }
            };

            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete' && !timeoutReached) {
                    this.analyzeWebRTCResults(resolve, {
                        localIPs, publicIPs, candidateTypes, candidateCount
                    });
                    pc.close();
                }
            };

            // Create data channel and offer
            pc.createDataChannel('test');
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => {
                    resolve({ detected: false, confidence: 0, reason: 'offer_failed' });
                    pc.close();
                });

            // Timeout fallback
            setTimeout(() => {
                if (!timeoutReached) {
                    timeoutReached = true;
                    this.analyzeWebRTCResults(resolve, {
                        localIPs, publicIPs, candidateTypes, candidateCount
                    });
                    pc.close();
                }
            }, this.config.VPN_DETECTION_TIMEOUT);
        });
    }

    analyzeWebRTCResults(resolve, { localIPs, publicIPs, candidateTypes, candidateCount }) {
        const publicIPCount = publicIPs.size;
        const localIPCount = localIPs.size;
        const hasRelay = candidateTypes.has('relay');
        const hasHost = candidateTypes.has('host');
        
        let confidence = 0;
        let reason = '';
        let detected = false;

        // More sophisticated analysis
        if (candidateCount === 0) {
            confidence = 30;
            reason = 'no_ice_candidates';
            detected = true;
        } else if (!hasHost && hasRelay) {
            confidence = 80;
            reason = 'relay_only_candidates';
            detected = true;
        } else if (publicIPCount > 2) {
            confidence = 75;
            reason = 'multiple_public_ips';
            detected = true;
        } else if (publicIPCount === 1 && localIPCount === 0) {
            confidence = 55;
            reason = 'public_ip_no_local';
            detected = true;
        } else if (localIPCount === 0 && candidateCount > 0) {
            confidence = 45;
            reason = 'no_local_network';
            detected = true;
        } else if (this.hasVPNIPPattern([...publicIPs, ...localIPs])) {
            confidence = 60;
            reason = 'vpn_ip_pattern';
            detected = true;
        }

        resolve({
            detected,
            confidence,
            reason,
            details: {
                publicIPCount,
                localIPCount,
                candidateCount,
                candidateTypes: [...candidateTypes],
                hasRelay,
                hasHost
            }
        });
    }

    // New timing-based detection method
    async detectVPNTiming() {
        try {
            const testDomains = [
                'google.com',
                'cloudflare.com', 
                'amazon.com',
                'microsoft.com'
            ];

            const timingResults = await Promise.all(
                testDomains.map(domain => this.measureConnectionTime(domain))
            );

            const validResults = timingResults.filter(r => r.success);
            
            if (validResults.length < 2) {
                return { detected: false, confidence: 0, reason: 'insufficient_timing_data' };
            }

            const times = validResults.map(r => r.time);
            const avgTime = times.reduce((a, b) => a + b) / times.length;
            const maxTime = Math.max(...times);
            const variance = this.calculateVariance(times);

            let confidence = 0;
            let detected = false;
            let reason = '';

            // High average latency suggests VPN
            if (avgTime > 200) {
                confidence += 40;
                reason += 'high_latency,';
            }

            // High variance suggests routing through different servers
            if (variance > 5000) {
                confidence += 30;
                reason += 'high_variance,';
            }

            // Very high max time
            if (maxTime > 500) {
                confidence += 20;
                reason += 'extreme_latency,';
            }

            detected = confidence >= 30;

            return {
                detected,
                confidence,
                reason: reason.slice(0, -1) || 'timing_normal',
                details: {
                    avgTime: Math.round(avgTime),
                    maxTime,
                    variance: Math.round(variance),
                    testCount: validResults.length
                }
            };
        } catch (error) {
            return { detected: false, confidence: 0, reason: 'timing_test_failed' };
        }
    }

    async measureConnectionTime(domain) {
        const start = performance.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            await fetch(`https://${domain}/favicon.ico`, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const time = performance.now() - start;
            return { success: true, time, domain };
        } catch (error) {
            return { success: false, error: error.message, domain };
        }
    }

    // Enhanced behavioral detection
    detectVPNBehavioral() {
        try {
            let confidence = 0;
            let indicators = [];
            
            // Check user agent
            const ua = navigator.userAgent.toLowerCase();
            const suspiciousUA = ['vpn', 'proxy', 'tor', 'tunnel'].some(term => ua.includes(term));
            if (suspiciousUA) {
                confidence += 50;
                indicators.push('suspicious_user_agent');
            }

            // Check for headless indicators
            const headlessIndicators = [
                navigator.webdriver,
                window.phantom,
                window._phantom,
                window.callPhantom,
                window._selenium,
                document.documentElement.getAttribute('webdriver'),
                navigator.plugins.length === 0 && !this.isMobile()
            ];

            if (headlessIndicators.some(indicator => indicator)) {
                confidence += 35;
                indicators.push('headless_browser');
            }

            // Check timezone/language mismatch (improved)
            const timezoneMismatch = this.checkTimezoneMismatch();
            if (timezoneMismatch.suspicious) {
                confidence += timezoneMismatch.confidence;
                indicators.push('timezone_mismatch');
            }

            // Check for VPN-typical screen resolutions
            const screenSuspicious = this.checkSuspiciousScreen();
            if (screenSuspicious) {
                confidence += 15;
                indicators.push('suspicious_screen');
            }

            // Check connection properties
            const connectionSuspicious = this.checkConnectionProperties();
            if (connectionSuspicious.suspicious) {
                confidence += connectionSuspicious.confidence;
                indicators.push('suspicious_connection');
            }

            const detected = confidence >= 25;

            return Promise.resolve({
                detected,
                confidence: Math.min(confidence, 85),
                reason: indicators.join(',') || 'behavioral_normal',
                details: { 
                    indicators, 
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    screenRes: `${screen.width}x${screen.height}`,
                    pluginCount: navigator.plugins.length
                }
            });
        } catch (error) {
            return Promise.resolve({ 
                detected: false, 
                confidence: 0, 
                reason: 'behavioral_test_failed',
                error: error.message 
            });
        }
    }

    // Simple network fingerprinting
    async detectVPNNetwork() {
        try {
            let confidence = 0;
            let indicators = [];

            // Test DNS resolution patterns
            const dnsTest = await this.testDNSPatterns();
            if (dnsTest.suspicious) {
                confidence += dnsTest.confidence;
                indicators.push('dns_pattern');
            }

            // Check if multiple requests show different apparent locations
            // (This is a simplified version - real implementation would need more sophisticated testing)
            const consistencyTest = await this.testLocationConsistency();
            if (!consistencyTest.consistent) {
                confidence += 25;
                indicators.push('location_inconsistent');
            }

            return {
                detected: confidence >= 20,
                confidence,
                reason: indicators.join(',') || 'network_normal',
                details: { indicators, dnsTest, consistencyTest }
            };
        } catch (error) {
            return { 
                detected: false, 
                confidence: 0, 
                reason: 'network_test_failed' 
            };
        }
    }

    // Helper methods
    hasVPNIPPattern(ips) {
        const vpnPatterns = [
            /^10\.8\./,     // Common OpenVPN range
            /^10\.0\.0\./,  // Common VPN range
            /^172\.16\./,   // Private range often used by VPNs
            /^192\.168\.1[0-9][0-9]\./  // Unusual private ranges
        ];
        
        return ips.some(ip => vpnPatterns.some(pattern => pattern.test(ip)));
    }

    checkTimezoneMismatch() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language.split('-')[0];
            
            // Common timezone/language pairs
            const commonPairs = {
                'en': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London'],
                'es': ['Europe/Madrid', 'America/Mexico_City', 'America/Argentina/Buenos_Aires'],
                'fr': ['Europe/Paris', 'America/Montreal'],
                'de': ['Europe/Berlin'],
                'it': ['Europe/Rome'],
                'pt': ['Europe/Lisbon', 'America/Sao_Paulo'],
                'ru': ['Europe/Moscow'],
                'ja': ['Asia/Tokyo'],
                'ko': ['Asia/Seoul'],
                'zh': ['Asia/Shanghai', 'Asia/Hong_Kong']
            };

            const expectedTimezones = commonPairs[language] || [];
            const matches = expectedTimezones.some(tz => timezone.includes(tz));
            
            if (!matches && expectedTimezones.length > 0) {
                return { suspicious: true, confidence: 30 };
            }

            return { suspicious: false, confidence: 0 };
        } catch (error) {
            return { suspicious: false, confidence: 0 };
        }
    }

    checkSuspiciousScreen() {
        const width = screen.width;
        const height = screen.height;
        const ratio = width / height;
        
        // Common VPN/VM screen resolutions
        const suspiciousResolutions = [
            { w: 800, h: 600 }, { w: 1024, h: 768 }, { w: 1280, h: 1024 }
        ];
        
        return suspiciousResolutions.some(res => 
            Math.abs(width - res.w) < 10 && Math.abs(height - res.h) < 10
        ) || ratio === 1.25 || ratio === 1.6; // Common VM ratios
    }

    checkConnectionProperties() {
        try {
            // Check for connection API
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (connection) {
                // Suspicious connection types or unrealistic speeds
                const suspiciousTypes = ['bluetooth', 'cellular', 'none'];
                const type = connection.effectiveType || connection.type;
                
                if (suspiciousTypes.includes(type) && connection.downlink > 10) {
                    return { suspicious: true, confidence: 20 };
                }
            }
            
            return { suspicious: false, confidence: 0 };
        } catch (error) {
            return { suspicious: false, confidence: 0 };
        }
    }

    async testDNSPatterns() {
        try {
            // Test if DNS resolution times are unusually high or inconsistent
            const dnsTests = ['8.8.8.8', '1.1.1.1', 'dns.google'].map(async (host) => {
                const start = performance.now();
                try {
                    await fetch(`https://${host === '8.8.8.8' ? 'dns.google' : host === '1.1.1.1' ? 'cloudflare-dns.com' : host}/favicon.ico`, {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: AbortSignal.timeout(3000)
                    });
                    return performance.now() - start;
                } catch {
                    return null;
                }
            });

            const results = (await Promise.all(dnsTests)).filter(r => r !== null);
            
            if (results.length < 2) {
                return { suspicious: false, confidence: 0 };
            }

            const avgTime = results.reduce((a, b) => a + b) / results.length;
            
            return {
                suspicious: avgTime > 150,
                confidence: avgTime > 150 ? Math.min(Math.floor(avgTime / 10), 30) : 0
            };
        } catch (error) {
            return { suspicious: false, confidence: 0 };
        }
    }

    async testLocationConsistency() {
        // Simplified test - in real implementation you'd test multiple endpoints
        // that might show different geographic responses
        try {
            const tests = [
                fetch('https://httpbin.org/ip', { signal: AbortSignal.timeout(3000) }),
                fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
            ];
            
            const results = await Promise.allSettled(tests);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            // If multiple IP services are blocked, might indicate VPN
            return { consistent: successful >= 1 };
        } catch (error) {
            return { consistent: true };
        }
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
        return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|fc00:|fe80:)/i.test(ip);
    }

    isValidPublicIP(ip) {
        if (!ip) return false;
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return (ipv4Regex.test(ip) || ipv6Regex.test(ip)) && !this.isPrivateIP(ip);
    }
}

// Export for use
window.ImprovedVPNDetection = ImprovedVPNDetection;
