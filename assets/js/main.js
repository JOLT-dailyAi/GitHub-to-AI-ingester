// Dynamic Showcase Implementation
async function loadShowcaseFiles() {
    try {
        // Option 1: Load from JSON config (recommended)
        await loadFromShowcaseJson();
    } catch (error) {
        console.log('JSON config not found, trying GitHub API...');
        // Option 2: Fallback to GitHub API
        await loadFromGitHubAPI();
    }
    
    // If both fail, show empty state
    if (showcaseData.length === 0) {
        showcaseData.push({
            title: 'No Showcase Files',
            content: 'Add files to /data/showcase/ directory to display them here.\n\nSupported formats: .txt, .md'
        });
    }
    
    buildCarousel();
}

// Option 1: Load from JSON configuration
async function loadFromShowcaseJson() {
    const configUrl = 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/main/data/showcase/showcase.json';
    
    try {
        const response = await fetch(configUrl);
        if (!response.ok) throw new Error('Config not found');
        
        const config = await response.json();
        const baseUrl = 'https://raw.githubusercontent.com/JOLT-dailyAi/GitHub-to-AI-ingester/main';
        
        // Load each file listed in config
        for (const file of config.showcaseFiles) {
            try {
                const fileResponse = await fetch(baseUrl + file.path);
                if (fileResponse.ok) {
                    const content = await fileResponse.text();
                    showcaseData.push({
                        title: file.title,
                        filename: file.filename,
                        content: content,
                        description: file.description,
                        lastUpdated: file.lastUpdated,
                        tags: file.tags
                    });
                }
            } catch (fileError) {
                console.warn(`Failed to load ${file.filename}:`, fileError);
                // Add placeholder for failed files
                showcaseData.push({
                    title: file.title,
                    filename: file.filename,
                    content: `Failed to load ${file.filename}\nFile may have been moved or deleted.`
                });
            }
        }
    } catch (error) {
        throw error; // Let caller handle fallback
    }
}

// Option 2: GitHub API fallback (your existing code, but cleaner)
async function loadFromGitHubAPI() {
    const repoOwner = 'JOLT-dailyAi';
    const repoName = 'GitHub-to-AI-ingester';
    const showcasePath = 'data/showcase';
    
    try {
        const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${showcasePath}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error('GitHub API failed');
        
        const files = await response.json();
        const textFiles = files.filter(file => 
            file.type === 'file' && 
            (file.name.endsWith('.txt') || file.name.endsWith('.md')) &&
            file.name !== 'showcase.json' // Skip the config file
        );
        
        for (const file of textFiles) {
            try {
                const contentResponse = await fetch(file.download_url);
                if (contentResponse.ok) {
                    const content = await contentResponse.text();
                    showcaseData.push({
                        title: file.name.replace(/\.(txt|md)$/i, ''),
                        filename: file.name,
                        content: content,
                        size: file.size,
                        githubUrl: file.html_url
                    });
                }
            } catch (fileError) {
                console.warn(`Failed to load ${file.name}:`, fileError);
            }
        }
    } catch (error) {
        throw error;
    }
}

// Enhanced search with tags and metadata
function searchShowcase() {
    const query = document.getElementById('showcaseSearch').value.toLowerCase();
    
    if (!query.trim()) {
        showcaseData.forEach(item => item.visible = true);
        buildCarousel();
        return;
    }
    
    let hasVisibleItems = false;
    showcaseData.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const contentMatch = item.content.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query) || false;
        const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        
        item.visible = titleMatch || contentMatch || descriptionMatch || tagsMatch;
        if (item.visible) hasVisibleItems = true;
    });
    
    if (!hasVisibleItems) {
        showNoResults();
        return;
    }
    
    buildFilteredCarousel();
}

function showNoResults() {
    carouselContainer.innerHTML = `
        <div class="showcase-item">
            <div class="showcase-header">
                <h3>No Results Found</h3>
            </div>
            <div class="no-results">
                <p>No showcase items match your search query.</p>
                <p>Try different keywords or <button onclick="clearSearch()">clear search</button></p>
            </div>
        </div>
    `;
    if (carouselDots) carouselDots.innerHTML = '';
}

function clearSearch() {
    const searchInput = document.getElementById('showcaseSearch');
    if (searchInput) {
        searchInput.value = '';
        searchShowcase();
    }
}

// Enhanced carousel building with metadata
function buildCarousel() {
    if (!carouselContainer || showcaseData.length === 0) return;
    
    carouselContainer.innerHTML = '';
    if (carouselDots) carouselDots.innerHTML = '';
    
    showcaseData.forEach((item, index) => {
        const showcaseItem = document.createElement('div');
        showcaseItem.className = 'showcase-item';
        
        // Build header with metadata
        let headerInfo = item.title;
        if (item.filename) headerInfo += ` (${item.filename})`;
        if (item.size) headerInfo += ` - ${formatFileSize(item.size)}`;
        if (item.lastUpdated) headerInfo += ` - Updated: ${item.lastUpdated}`;
        
        // Add tags if available
        let tagsHtml = '';
        if (item.tags && item.tags.length > 0) {
            tagsHtml = `<div class="showcase-tags">
                ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>`;
        }
        
        showcaseItem.innerHTML = `
            <div class="showcase-header">
                <h3>${headerInfo}</h3>
                <div class="showcase-actions">
                    ${item.githubUrl ? `<a href="${item.githubUrl}" target="_blank" class="github-link">📂</a>` : ''}
                    <button class="copy-btn" onclick="copyToClipboard('showcase-${index}')">📋</button>
                </div>
            </div>
            ${tagsHtml}
            ${item.description ? `<p class="showcase-description">${item.description}</p>` : ''}
            <textarea id="showcase-${index}" readonly>${item.content}</textarea>
        `;
        carouselContainer.appendChild(showcaseItem);
        
        // Create dot
        if (carouselDots) {
            const dot = document.createElement('div');
            dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => goToSlide(index));
            carouselDots.appendChild(dot);
        }
    });
    
    updateCarousel();
}

// Auto-refresh functionality
function setupAutoRefresh() {
    const refreshInterval = 5 * 60 * 1000; // 5 minutes
    setInterval(async () => {
        console.log('Auto-refreshing showcase data...');
        const oldLength = showcaseData.length;
        showcaseData.length = 0; // Clear array
        await loadShowcaseFiles();
        
        if (showcaseData.length !== oldLength) {
            console.log('Showcase data updated, rebuilding carousel...');
            buildCarousel();
        }
    }, refreshInterval);
}
