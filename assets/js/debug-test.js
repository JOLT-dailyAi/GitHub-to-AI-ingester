// Add this temporary debug script to test integration
// Place this in a separate file or add to the bottom of your HTML page

console.log('=== Free Trial Debug Test ===');

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
    console.log('- trialEmail input:', !!document.getElementById('trialEmail'));
    console.log('- repoUrl input:', !!document.getElementById('repoUrl'));

    // Test 3: Test cookie detection manually
    if (typeof ImprovedCookieManager !== 'undefined') {
        console.log('\n3. Cookie detection test:');
        const cookieResult = ImprovedCookieManager.areCookiesEnabled();
        console.log('Cookie test result:', cookieResult);
    }

    // Test 4: Test VPN detection manually (this will take a few seconds)
    if (typeof ImprovedVPNDetection !== 'undefined') {
        console.log('\n4. Starting VPN detection test...');
        const vpnDetector = new ImprovedVPNDetection();
        vpnDetector.detectVPN().then(result => {
            console.log('VPN detection result:', result);
        }).catch(error => {
            console.error('VPN detection error:', error);
        });
    }

    // Test 5: Check for any JavaScript errors
    console.log('\n5. If you see this message, basic JavaScript is working.');
    console.log('Now try clicking "Try once for free" and watch for errors...');
}, 1000);

// Add error listener to catch any uncaught errors
window.addEventListener('error', function(e) {
    console.error('JavaScript Error Detected:');
    console.error('Message:', e.message);
    console.error('Source:', e.filename);
    console.error('Line:', e.lineno);
    console.error('Column:', e.colno);
    console.error('Error object:', e.error);
});

// Add unhandled promise rejection listener
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:');
    console.error('Reason:', e.reason);
    console.error('Promise:', e.promise);
});
