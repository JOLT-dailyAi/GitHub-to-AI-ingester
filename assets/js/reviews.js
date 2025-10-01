// reviews.js - Dynamic Google Sheets Review System
// Place this in assets/js/reviews.js

const SHEET_ID = '1N3n5jgGqP0Geu-JgcSyThQcMCZUDy9eRQ9BqvGTolDQ';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const GOOGLE_FORM_URL = 'https://forms.gle/cF5izZhej5GZ8M1k7';
const REFRESH_INTERVAL = 60000; // Refresh every 60 seconds

let allReviews = [];
let currentPage = 0;
let REVIEWS_PER_PAGE = 2; // Default for narrow sidebars

// Adjust reviews per page based on container width
function adjustReviewsPerPage() {
    const sidebar = document.querySelector('.sidebar-right');
    if (sidebar) {
        const width = sidebar.offsetWidth;
        REVIEWS_PER_PAGE = width > 250 ? 3 : 2;
    }
}

// Initialize review system
function initReviewSystem() {
    fetchReviews();
    setInterval(fetchReviews, REFRESH_INTERVAL);
    
    // Setup pagination if needed
    setupPagination();
}

// Fetch reviews from Google Sheets
async function fetchReviews() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const reviews = parseCSV(csvText);
        
        if (reviews.length > 0) {
            allReviews = reviews;
            displayReviews();
            updatePagination();
        }
    } catch (error) {
        console.error('Error fetching reviews:', error);
        displayErrorMessage();
    }
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');
    const reviews = [];
    
    // Skip header row (index 0) and start from index 1
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (handling quotes and commas)
        const values = parseCSVLine(line);
        
        if (values.length >= 4) {
            // Expected columns: Timestamp, Name, User Type, Rating, Review, Use Case, Email, Suggestions
            reviews.push({
                timestamp: values[0] || '',
                name: values[1] || 'Anonymous',
                userType: values[2] || '',
                rating: parseInt(values[3]) || 5,
                review: values[4] || '',
                useCase: values[5] || '',
                email: values[6] || '',
                suggestions: values[7] || ''
            });
        }
    }
    
    // Return reviews in reverse order (newest first)
    return reviews.reverse();
}

// Parse a single CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Display reviews
function displayReviews() {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;
    
    const start = currentPage * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE;
    const reviewsToShow = allReviews.slice(start, end);
    
    if (reviewsToShow.length === 0) {
        container.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to share your experience!</p>';
        return;
    }
    
    container.innerHTML = reviewsToShow.map(review => createReviewHTML(review)).join('');
}

// Create HTML for a single review
function createReviewHTML(review) {
    const stars = '⭐'.repeat(review.rating);
    const timeAgo = getTimeAgo(review.timestamp);
    const badge = getUserBadge(review.userType);
    
    return `
        <div class="review" data-rating="${review.rating}">
            <div class="review-header">
                <div class="review-author">
                    <strong>${escapeHTML(review.name)}</strong>
                    ${badge}
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            <p class="review-text">"${escapeHTML(review.review)}"</p>
            ${review.useCase ? `<p class="review-use-case"><small>Using with: ${escapeHTML(review.useCase)}</small></p>` : ''}
            ${review.suggestions ? `<p class="review-suggestions"><small>💡 Suggestion: ${escapeHTML(review.suggestions)}</small></p>` : ''}
            <small class="review-time">${timeAgo}</small>
        </div>
    `;
}

// Get user badge based on type
function getUserBadge(userType) {
    const badges = {
        'Gumroad Customer (Paid)': '<span class="badge badge-paid">💎 Paid Customer</span>',
        'Free Trial User': '<span class="badge badge-trial">🎁 Free Trial</span>',
        'Referred by a friend': '<span class="badge badge-referral">👥 Referral</span>',
        'Found online': '<span class="badge badge-organic">🔍 Organic</span>'
    };
    return badges[userType] || '';
}

// Calculate time ago
function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return '';
    }
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Display error message
function displayErrorMessage() {
    const container = document.getElementById('reviewsContainer');
    if (container) {
        container.innerHTML = '<p class="error-message">Unable to load reviews. Please try again later.</p>';
    }
}

// Setup pagination
function setupPagination() {
    const prevBtn = document.getElementById('prevReviewBtn');
    const nextBtn = document.getElementById('nextReviewBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                displayReviews();
                updatePagination();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if ((currentPage + 1) * REVIEWS_PER_PAGE < allReviews.length) {
                currentPage++;
                displayReviews();
                updatePagination();
            }
        });
    }
}

// Update pagination buttons
function updatePagination() {
    const prevBtn = document.getElementById('prevReviewBtn');
    const nextBtn = document.getElementById('nextReviewBtn');
    const pageInfo = document.getElementById('reviewPageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = (currentPage + 1) * REVIEWS_PER_PAGE >= allReviews.length;
    
    if (pageInfo && allReviews.length > 0) {
        const totalPages = Math.ceil(allReviews.length / REVIEWS_PER_PAGE);
        pageInfo.textContent = `${currentPage + 1}/${totalPages}`;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReviewSystem);
} else {
    initReviewSystem();
}
