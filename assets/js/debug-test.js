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
        console.log('❌ Modal is missing! This explains why nothing happens when clicking the button.');
    }

    // Test 4: Test cookie detection manually
    if (typeof ImprovedCookieManager !== 'undefined') {
        console.log('\n4. Cookie detection test:');
        const cookieResult = ImprovedCookieManager.areCookiesEnabled();
        console.log('Cookie test result:', cookieResult);
    } else {
        console.log('\n4. ❌ ImprovedCookieManager not available - this is the main problem!');
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

// HTTP Response Logging System
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const startTime = Date.now();
    const [url, options] = args;
    
    console.log(`🌐 HTTP REQUEST START`);
    console.log(`URL: ${url}`);
    console.log(`Method: ${options?.method || 'GET'}`);
    console.log(`Headers:`, options?.headers || 'None');
    if (options?.body) {
        try {
            const bodyContent = typeof options.body === 'string' ? 
                JSON.parse(options.body) : options.body;
            console.log(`Body:`, bodyContent);
        } catch {
            console.log(`Body: ${options.body}`);
        }
    }
    
    try {
        const response = await originalFetch.apply(this, args);
        const duration = Date.now() - startTime;
        
        console.log(`🌐 HTTP RESPONSE RECEIVED (${duration}ms)`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
        
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        
        try {
            // Try to read as text first
            const text = await responseClone.text();
            
            // Check if it's JSON
            try {
                const json = JSON.parse(text);
                console.log(`Response JSON:`, json);
            } catch {
                // Check if it's HTML (repository validation)
                if (text.includes('<!DOCTYPE html') || text.includes('<html')) {
                    console.log(`Response HTML Preview (first 500 chars):`);
                    console.log(text.substring(0, 500) + '...');
                    
                    // Check for specific GitHub indicators
                    if (text.includes("Didn't find anything here!")) {
                        console.log(`🔍 GitHub Analysis: PRIVATE/NOT FOUND repository detected`);
                    } else if (text.includes('repository-content') || 
                               text.includes('js-repo-pjax-container') ||
                               text.includes('data-testid="repository-container"')) {
                        console.log(`🔍 GitHub Analysis: PUBLIC repository detected`);
                    } else if (text.includes('branches') && text.includes('commits')) {
                        console.log(`🔍 GitHub Analysis: Repository content detected (fallback)`);
                    } else {
                        console.log(`🔍 GitHub Analysis: Unknown content type`);
                    }
                } else {
                    console.log(`Response Text:`, text);
                }
            }
        } catch (error) {
            console.log(`Could not read response body:`, error.message);
        }
        
        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`🚨 HTTP REQUEST FAILED (${duration}ms)`);
        console.error(`Error:`, error.message);
        throw error;
    }
};

// Monitor repository validation calls specifically
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
} else {
    console.log('❌ validateGitHubRepositoryAccess not found - will monitor when available');
    
    // Watch for when it becomes available
    const checkForValidation = setInterval(() => {
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
            console.log('📋 Repository validation function wrapped for logging (delayed)');
            clearInterval(checkForValidation);
        }
    }, 500);
    
    // Stop checking after 10 seconds
    setTimeout(() => {
        clearInterval(checkForValidation);
    }, 10000);
}

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
            console.log(`📝 Trial repo input changed: ${trialRepoInput.value}`);
        });
        console.log('📋 Trial repository input monitoring enabled');
    }
    
    if (mainRepoInput) {
        mainRepoInput.addEventListener('input', () => {
            console.log(`📝 Main repo input changed: ${mainRepoInput.value}`);
        });
        console.log('📋 Main repository input monitoring enabled');
    }
};

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
        console.log('❌ validateGitHubRepositoryAccess not available yet');
        return { error: 'Function not available' };
    }
};

console.log('\n🧪 Manual test available: testRepoValidation("https://github.com/owner/repo")');
