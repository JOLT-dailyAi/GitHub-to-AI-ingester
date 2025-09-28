// Enhanced debug script with HTTP response logging
console.log('=== Free Trial Enhanced Debug Test with HTTP Logging ===');

// Test 1: Check if classes are loaded
setTimeout(() => {
    console.log('1. Class availability check:');
    console.log('- ImprovedVPNDetection available:', typeof ImprovedVPNDetection !== 'undefined');
    console.log('- ImprovedCookieManager available:', typeof ImprovedCookieManager !== 'undefined');
    console.log('- FreeTrialManager available:', typeof FreeTrialManager !== 'undefined');
    console.log('- freeTrialManager instance:', typeof window.freeTrialManager !== 'undefined');
    console.log('- validateGitHubRepositoryAccess available:', typeof window.validateGitHubRepositoryAccess !== 'undefined');

    // Test 2: Check required DOM elements
    console.log('\n2. DOM elements check:');
    console.log('- freeTrial button:', !!document.getElementById('freeTrial'));
    console.log('- freeTrialForm:', !!document.getElementById('freeTrialForm'));
    console.log('- freeTrialModal:', !!document.getElementById('freeTrialModal'));
    console.log('- trialEmail input:', !!document.getElementById('trialEmail'));
    console.log('- trialRepoUrl input:', !!document.getElementById('trialRepoUrl'));
    console.log('- repoUrl input:', !!document.getElementById('repoUrl'));

    // Test 3: Check modal structure
    const modal = document.getElementById('freeTrialModal');
    if (modal) {
        console.log('\n3. Modal structure check:');
        console.log('- Modal exists:', true);
        console.log('- Modal display style:', getComputedStyle(modal).display);
        console.log('- Modal visibility:', getComputedStyle(modal).visibility);
        console.log('- Modal has form:', !!modal.querySelector('#freeTrialForm'));
        console.log('- Form has email input:', !!modal.querySelector('#trialEmail'));
        console.log('- Form has repo input:', !!modal.querySelector('#trialRepoUrl'));
    } else {
        console.log('\n3. Modal structure check:');
        console.log('- Modal exists:', false);
        console.log('⚠ Modal is missing! This explains why nothing happens when clicking the button.');
    }

    // Test 4: Test cookie detection manually
    if (typeof ImprovedCookieManager !== 'undefined') {
        console.log('\n4. Cookie detection test:');
        const cookieResult = ImprovedCookieManager.areCookiesEnabled();
        console.log('Cookie test result:', cookieResult);
    } else {
        console.log('\n4. ⚠ ImprovedCookieManager not available - this is the main problem!');
    }

    // Test 5: Test VPN detection manually (simplified version)
    if (typeof ImprovedVPNDetection !== 'undefined') {
        console.log('\n5. Starting simplified VPN detection test...');
        testSimpleVPN();
    }

    // Test 6: Check button event binding
    const freeTrialBtn = document.getElementById('freeTrial');
    if (freeTrialBtn) {
        console.log('\n6. Button event check:');
        console.log('- Button exists:', true);
        
        // Check if button has any event listeners
        const hasClickListener = freeTrialBtn.onclick !== null;
        console.log('- Button has onclick handler:', hasClickListener);
        
        // Add a test click listener to verify events work
        const testClickHandler = (e) => {
            console.log('🔥 TEST: Button click detected!');
            console.log('Event:', e);
        };
        freeTrialBtn.addEventListener('click', testClickHandler);
        
        console.log('- Test click listener added');
    }

    console.log('\n7. Script loading order check:');
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    scripts.forEach((script, index) => {
        if (script.src.includes('improved-vpn-detection') || 
            script.src.includes('free-trial') || 
            script.src.includes('debug-test') ||
            script.src.includes('main')) {
            console.log(`${index}: ${script.src.split('/').pop()}`);
        }
    });

    console.log('\n8. Ready for testing!');
    console.log('Now click "Try once for free" or enter repository URLs and watch the console for step-by-step flow...');
}, 1000);

// Simple VPN test function
async function testSimpleVPN() {
    try {
        // Test WebRTC only for now
        if (!window.RTCPeerConnection) {
            console.log('WebRTC not available');
            return;
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        let candidateCount = 0;
        let localIPs = new Set();
        let publicIPs = new Set();

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                candidateCount++;
                const parts = event.candidate.candidate.split(' ');
                const ip = parts[4];
                
                console.log(`Candidate ${candidateCount}:`, ip, parts[7]);
                
                if (isPrivateIP(ip)) {
                    localIPs.add(ip);
                } else {
                    publicIPs.add(ip);
                }
            }
        };

        pc.createDataChannel('test');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setTimeout(() => {
            pc.close();
            console.log('Simple VPN Test Results:', {
                candidateCount,
                localIPs: Array.from(localIPs),
                publicIPs: Array.from(publicIPs),
                localCount: localIPs.size,
                publicCount: publicIPs.size
            });

            // Simple analysis
            if (candidateCount === 0) {
                console.log('🚨 Possible VPN: No ICE candidates');
            } else if (localIPs.size === 0) {
                console.log('🚨 Possible VPN: No local IP addresses');
            } else if (publicIPs.size > 1) {
                console.log('🚨 Possible VPN: Multiple public IPs');
            } else {
                console.log('✅ Normal network configuration detected');
            }
        }, 3000);

    } catch (error) {
        console.error('Simple VPN test error:', error);
    }
}

function isPrivateIP(ip) {
    return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(ip);
}

// Specifically monitor form submissions to the webhook
const monitorFormSubmissions = () => {
    const form = document.getElementById('analysisForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            console.log('🚀 FORM SUBMISSION INTERCEPTED');
            console.log('Event:', e);
            
            // Don't prevent default - let it proceed normally
            // We're just logging what happens
            
            const formData = new FormData(e.target);
            const formEntries = Object.fromEntries(formData.entries());
            console.log('Form data:', formEntries);
            
            const licenseKey = document.getElementById('licenseKey')?.value;
            const repoUrl = document.getElementById('repoUrl')?.value;
            const discordId = document.getElementById('discordId')?.value;
            
            console.log('Form fields at submission:');
            console.log('- License Key:', licenseKey);
            console.log('- Repository URL:', repoUrl);
            console.log('- Discord ID:', discordId);
            
            // Check if submit button is enabled
            const submitBtn = document.getElementById('submitBtn');
            console.log('- Submit button disabled:', submitBtn?.disabled);
            console.log('- Submit button text:', submitBtn?.textContent);
        });
        
        console.log('📋 Form submission monitoring enabled');
    } else {
        console.log('⚠️ Analysis form not found for monitoring');
    }
};

// Monitor webhook URL specifically
const monitorWebhookCalls = () => {
    // Store reference to check config
    console.log('📡 Current webhook configuration:');
    if (typeof CONFIG !== 'undefined') {
        console.log('- N8N_FORM_URL:', CONFIG.N8N_FORM_URL);
        console.log('- WEBHOOK_TIMEOUT:', CONFIG.WEBHOOK_TIMEOUT);
    } else {
        console.log('⚠️ CONFIG not available in debug scope');
    }
};

// Test webhook endpoint directly
window.testWebhook = async function(testPayload = null) {
    console.log('🧪 TESTING WEBHOOK ENDPOINT');
    
    const testUrl = 'https://jolt-dailyai.jack-of-all-traits-official.workers.dev/api/webhook-test/c4cb286d-e375-4cd8-96be-9866403fa54d';
    
    const defaultPayload = {
        license_key: 'TEST-KEY-123',
        repository_url: 'https://github.com/test/repo',
        discord_username: 'debug-test',
        timestamp: new Date().toISOString(),
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        submission_source: 'debug_test_function'
    };
    
    const payload = testPayload || defaultPayload;
    
    console.log('Test URL:', testUrl);
    console.log('Test payload:', payload);
    
    try {
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('🧪 TEST RESPONSE STATUS:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('🧪 TEST RESPONSE BODY:', responseText);
        
        try {
            const responseJson = JSON.parse(responseText);
            console.log('🧪 TEST PARSED RESPONSE:', responseJson);
        } catch (e) {
            console.log('Response is not JSON');
        }
        
        return { success: response.ok, status: response.status, body: responseText };
        
    } catch (error) {
        console.error('🧪 TEST FAILED:', error);
        return { success: false, error: error.message };
    }
};

// Monitor button state changes
const monitorButtonState = () => {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'disabled') {
                        console.log('🔘 Submit button disabled state changed:', submitBtn.disabled);
                    }
                }
                if (mutation.type === 'childList') {
                    console.log('🔘 Submit button text changed:', submitBtn.textContent);
                }
            });
        });
        
        observer.observe(submitBtn, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['disabled']
        });
        
        console.log('👁️ Submit button monitoring enabled');
    }
};

// HTTP Response Logging System - Enhanced for webhook monitoring
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const startTime = Date.now();
    const [url, options] = args;
    
    // Check if this is our webhook call
    const isWebhookCall = typeof url === 'string' && 
                         url.includes('jack-of-all-traits-official.workers.dev');
    
    if (isWebhookCall) {
        console.log('🎯 WEBHOOK CALL DETECTED');
        console.log('URL:', url);
        console.log('Method:', options?.method);
        console.log('Headers:', options?.headers);
        
        if (options?.body) {
            try {
                const bodyData = JSON.parse(options.body);
                console.log('Webhook payload:', bodyData);
                
                // Validate required fields
                const requiredFields = ['license_key', 'repository_url'];
                const missingFields = requiredFields.filter(field => !bodyData[field]);
                if (missingFields.length > 0) {
                    console.log('⚠️ Missing required fields:', missingFields);
                } else {
                    console.log('✅ All required fields present');
                }
            } catch (e) {
                console.log('Body (not JSON):', options.body);
            }
        }
    } else {
        console.log(`🌐 HTTP REQUEST START`);
        console.log(`URL: ${url}`);
        console.log(`Method: ${options?.method || 'GET'}`);
        if (options?.headers) console.log(`Headers:`, options.headers);
        if (options?.body) {
            try {
                const bodyContent = typeof options.body === 'string' ? 
                    JSON.parse(options.body) : options.body;
                console.log(`Body:`, bodyContent);
            } catch {
                console.log(`Body: ${options.body}`);
            }
        }
    }
    
    try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;
        
        if (isWebhookCall) {
            console.log(`🎯 WEBHOOK RESPONSE (${duration}ms)`);
            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));
            
            // Clone response to read body without consuming it
            const responseClone = response.clone();
            try {
                const responseText = await responseClone.text();
                console.log('Response body:', responseText);
                
                // Try to parse as JSON
                try {
                    const responseJson = JSON.parse(responseText);
                    console.log('Parsed response:', responseJson);
                } catch (e) {
                    console.log('Response is not JSON');
                }
            } catch (e) {
                console.log('Could not read response body:', e.message);
            }
            
            // Check for common error statuses
            if (response.status === 403) {
                console.log('🚨 403 FORBIDDEN - Possible causes:');
                console.log('- Authentication required');
                console.log('- IP blocking');
                console.log('- Rate limiting');
                console.log('- Incorrect endpoint');
            } else if (response.status === 404) {
                console.log('🚨 404 NOT FOUND - Check webhook URL');
            } else if (response.status === 500) {
                console.log('🚨 500 SERVER ERROR - Backend issue');
            } else if (response.status >= 200 && response.status < 300) {
                console.log('✅ Successful webhook response');
            }
        } else {
            console.log(`🌐 HTTP RESPONSE RECEIVED (${duration}ms)`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            // For non-webhook requests, only log response body for GitHub API calls
            if (url.includes('api.github.com') || url.includes('github.com')) {
                const responseClone = response.clone();
                try {
                    const text = await responseClone.text();
                    if (text.includes('<!DOCTYPE html') || text.includes('<html')) {
                        console.log('📄 GitHub HTML response detected');
                        if (text.includes("Didn't find anything here!")) {
                            console.log('🔍 GitHub Analysis: PRIVATE/NOT FOUND repository detected');
                        } else if (text.includes('repository-content')) {
                            console.log('🔍 GitHub Analysis: PUBLIC repository detected');
                        }
                    } else {
                        try {
                            const json = JSON.parse(text);
                            console.log('🔍 GitHub API Response:', json);
                        } catch {
                            console.log('🔍 GitHub Response (text):', text.substring(0, 200));
                        }
                    }
                } catch (error) {
                    console.log('Could not read GitHub response body:', error.message);
                }
            }
        }
        
        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        
        if (isWebhookCall) {
            console.log(`🚨 WEBHOOK FAILED (${duration}ms)`);
            console.log('Error:', error.message);
            console.log('Error type:', error.name);
            
            if (error.name === 'AbortError') {
                console.log('Request was aborted (timeout or cancelled)');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.log('Network error - could not connect to server');
            }
        } else {
            console.error(`🚨 HTTP REQUEST FAILED (${duration}ms)`);
            console.error(`Error:`, error.message);
        }
        
        throw error;
    }
};

// Monitor repository validation calls specifically
const setupRepoValidationMonitoring = () => {
    if (typeof window.validateGitHubRepositoryAccess === 'function') {
        const originalValidate = window.validateGitHubRepositoryAccess;
        window.validateGitHubRepositoryAccess = async function(repoUrl) {
            console.log(`🔍 REPO VALIDATION START: ${repoUrl}`);
            
            try {
                const result = await originalValidate.call(this, repoUrl);
                console.log(`🔍 REPO VALIDATION RESULT:`, result);
                return result;
            } catch (error) {
                console.error(`🚨 REPO VALIDATION ERROR:`, error);
                throw error;
            }
        };
        console.log('📋 Repository validation function wrapped for logging');
        return true;
    }
    return false;
};

// Enhanced error tracking
window.addEventListener('error', function(e) {
    console.error('🚨 JavaScript Error Detected:');
    console.error('Message:', e.message);
    console.error('Source:', e.filename);
    console.error('Line:', e.lineno);
    console.error('Column:', e.colno);
    if (e.error && e.error.stack) {
        console.error('Stack:', e.error.stack);
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Unhandled Promise Rejection:');
    console.error('Reason:', e.reason);
});

// Monitor modal state changes
const observeModalChanges = () => {
    const modal = document.getElementById('freeTrialModal');
    if (modal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const display = getComputedStyle(modal).display;
                    console.log(`📋 Modal display changed to: ${display}`);
                }
            });
        });
        
        observer.observe(modal, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
        
        console.log('👀 Modal observer set up - will track display changes');
    }
};

// Monitor form validation events
const monitorFormValidation = () => {
    const trialRepoInput = document.getElementById('trialRepoUrl');
    const mainRepoInput = document.getElementById('repoUrl');
    
    if (trialRepoInput) {
        trialRepoInput.addEventListener('input', () => {
            console.log(`🔍 Trial repo input changed: ${trialRepoInput.value}`);
        });
        console.log('📋 Trial repository input monitoring enabled');
    }
    
    if (mainRepoInput) {
        mainRepoInput.addEventListener('input', () => {
            console.log(`🔍 Main repo input changed: ${mainRepoInput.value}`);
        });
        console.log('📋 Main repository input monitoring enabled');
    }
};

// Test repository validation manually
window.testRepoValidation = async function(repoUrl) {
    if (!repoUrl) {
        console.log('Usage: testRepoValidation("https://github.com/owner/repo")');
        return;
    }
    
    console.log(`🧪 MANUAL REPO TEST: ${repoUrl}`);
    
    if (typeof window.validateGitHubRepositoryAccess === 'function') {
        try {
            const result = await window.validateGitHubRepositoryAccess(repoUrl);
            console.log(`🧪 MANUAL TEST RESULT:`, result);
            return result;
        } catch (error) {
            console.error(`🧪 MANUAL TEST ERROR:`, error);
            return { error: error.message };
        }
    } else {
        console.log('⚠ validateGitHubRepositoryAccess not available yet');
        return { error: 'Function not available' };
    }
};

// Simple auto-population debug
const monitorAutoPopulation = () => {
    if (window.freeTrialManager && window.freeTrialManager.populateMainFormWithTrialKey) {
        const original = window.freeTrialManager.populateMainFormWithTrialKey;
        window.freeTrialManager.populateMainFormWithTrialKey = function(key, repo) {
            console.log('AUTO-POPULATION: Starting with', key, repo);
            const result = original.call(this, key, repo);
            
            setTimeout(() => {
                const submitBtn = document.getElementById('submitBtn');
                const urlValidation = document.getElementById('urlValidation');
                console.log('AUTO-POPULATION: Button disabled?', submitBtn?.disabled);
                console.log('AUTO-POPULATION: URL validation:', urlValidation?.textContent, urlValidation?.className);
            }, 300);
            
            return result;
        };
        console.log('Auto-population monitoring enabled');
        return true;
    }
    return false;
};

// Initialize all monitoring functions
setTimeout(() => {
    monitorFormSubmissions();
    monitorWebhookCalls();
    monitorButtonState();
    
    // Try to set up repo validation monitoring
    if (!setupRepoValidationMonitoring()) {
        console.log('⚠ validateGitHubRepositoryAccess not found - will monitor when available');
        
        // Watch for when it becomes available
        const checkForValidation = setInterval(() => {
            if (setupRepoValidationMonitoring()) {
                clearInterval(checkForValidation);
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkForValidation), 10000);
    }
    
    // Try to set up auto-population monitoring
    if (!monitorAutoPopulation()) {
        setTimeout(() => monitorAutoPopulation(), 2000);
    }
    
    console.log('\n🧪 Debug functions available:');
    console.log('- testWebhook() - Test webhook endpoint directly');
    console.log('- testWebhook(customPayload) - Test with custom data');
    console.log('- testRepoValidation("https://github.com/owner/repo") - Test repo validation');
    
    console.log('\n📋 All monitoring systems active. Now try:');
    console.log('1. Fill out the form normally');
    console.log('2. Click "Analyze Repository"'); 
    console.log('3. Watch this console for detailed request/response logging');
    
}, 2000);

// Set up observers after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        observeModalChanges();
        monitorFormValidation();
    });
} else {
    observeModalChanges();
    monitorFormValidation();
}
