// Enhanced debug script to track the complete flow
console.log('=== Free Trial Enhanced Debug Test ===');

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
    }

    // Test 5: Test VPN detection manually (now CORS-free)
    if (typeof ImprovedVPNDetection !== 'undefined') {
        console.log('\n5. Starting VPN detection test...');
        const vpnDetector = new ImprovedVPNDetection();
        vpnDetector.detectVPN().then(result => {
            console.log('VPN detection result:', result);
            console.log('✅ VPN detection completed successfully (no CORS errors)');
        }).catch(error => {
            console.error('VPN detection error:', error);
        });
    }

    // Test 6: Check button event binding
    const freeTrialBtn = document.getElementById('freeTrial');
    if (freeTrialBtn) {
        console.log('\n6. Button event check:');
        console.log('- Button exists:', true);
        console.log('- Button has click listener:', freeTrialBtn.onclick !== null || getEventListeners(freeTrialBtn)?.click?.length > 0);
        
        // Add a test click listener to verify events work
        const testClickHandler = () => {
            console.log('🔥 TEST: Button click detected!');
        };
        freeTrialBtn.addEventListener('click', testClickHandler);
        
        console.log('- Test click listener added');
    }

    console.log('\n7. Ready for testing!');
    console.log('Now click "Try once for free" and watch the console for step-by-step flow...');
}, 1000);

// Enhanced error tracking
window.addEventListener('error', function(e) {
    console.error('🚨 JavaScript Error Detected:');
    console.error('Message:', e.message);
    console.error('Source:', e.filename);
    console.error('Line:', e.lineno);
    console.error('Column:', e.colno);
    console.error('Stack:', e.error?.stack);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Unhandled Promise Rejection:');
    console.error('Reason:', e.reason);
    console.error('Promise:', e.promise);
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

// Helper function to get event listeners (Chrome DevTools)
function getEventListeners(element) {
    if (typeof getEventListeners === 'function') {
        return getEventListeners(element);
    }
    return null;
}
