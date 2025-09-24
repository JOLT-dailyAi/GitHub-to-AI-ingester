// Fixed Enhanced debug script
console.log('=== Free Trial Enhanced Debug Test (Fixed) ===');

// Test 1: Check if classes are loaded
setTimeout(() => {
    console.log('1. Class availability check:');
    console.log('- ImprovedVPNDetection available:', typeof ImprovedVPNDetection !== 'undefined');
    console.log('- ImprovedCookieManager available:', typeof ImprovedCookieManager !== 'undefined');
    console.log('- FreeTrialManager available:', typeof FreeTrialManager !== 'undefined');
    console.log('- freeTrialManager instance:', typeof window.freeTrialManager !== 'undefined');

    // Test 2: Check required DOM elements
    console.log('\n2. DOM elements check:');
    console.log('- freeTrial button:', !!document.getElementById('freeTrial'));
    console.log('- freeTrialForm:', !!document.getElementById('freeTrialForm'));
    console.log('- freeTrialModal:', !!document.getElementById('freeTrialModal'));
    console.log('- trialEmail input:', !!document.getElementById('trialEmail'));
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
        console.log('- Form has repo input:', !!modal.querySelector('#repoUrl'));
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
            script.src.includes('debug-test')) {
            console.log(`${index}: ${script.src.split('/').pop()}`);
        }
    });

    console.log('\n8. Ready for testing!');
    console.log('Now click "Try once for free" and watch the console for step-by-step flow...');
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

// Set up modal observer after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeModalChanges);
} else {
    observeModalChanges();
}
