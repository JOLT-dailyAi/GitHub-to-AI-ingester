# CHANGELOG

## v2.4 - Documentation & UI Polish
**Comprehensive documentation additions and floating widget visual refinements.**

### 📖 Documentation Expansion
- **Blog Post Addition**: Added "Why GitHub to AI Ingester Exists" analyzing the repository discovery gap
- **README Enhancement**: Added "Why This Exists" section explaining the problem space
- **Third-Person Voice**: All documentation written in analytical third-person for professional tone
- **Cross-Linking**: README links to full blog post for detailed technical analysis
- **File Location**: Blog post placed in root as `BLOG-why-github-to-ai-ingester-exists.md`

### 🎨 Floating Widget Refinements
- **Transparent Backgrounds**: Removed solid color circles from Discord and GitHub floating buttons
- **Sticker-Style Design**: Buttons now display as pure GIF stickers without background interference
- **Simplified Hover Effects**: Retained scale animation, removed shadow/color transitions
- **Cleaner Aesthetics**: GIF animations fully visible without circular containers
- **CSS Optimization**: Removed `border-radius`, `box-shadow`, `background-color`, and `overflow` properties

### 📝 Content Cleanup
- **Removed Consulting References**: Deleted outdated "consulting options" line from README
- **Consistent Voice**: Changed "you" to "developers/the AI" for neutral perspective
- **Link Accuracy**: Updated blog link path to match actual file location in root
- **Formatting**: Standardized to use regular dashes throughout (no em-dashes)

### 🔧 Technical Changes
- **CSS Simplification**: Reduced floating-widgets.css by 9 lines (removed redundant properties)
- **Maintained Functionality**: All hover effects and responsive behavior preserved
- **GitHub Button**: Added second floating button (right side) linking to repository

---

## v2.3 - Virtual Showcase Architecture
**Refactored showcase system from DOM-based to data-driven virtual architecture for improved performance and scalability.**

### 🔄 Showcase System Overhaul
- **Virtual Data Layer**: Introduced `virtualShowcaseData` array to store all showcase content
- **Single DOM Item**: Reduced from multiple physical DOM elements to one reusable showcase container
- **Dynamic Content Loading**: Physical DOM updated on-demand from virtual data array
- **Memory Optimization**: Eliminated redundant DOM elements for large showcase datasets

### ⚡ Performance Improvements
- **Reduced DOM Manipulation**: Single item updated per navigation instead of hiding/showing multiple elements
- **Faster Search**: Filter operations on JavaScript array instead of DOM queries
- **Lazy Rendering**: Content rendered only when displayed, not on initial load
- **Improved Responsiveness**: Smoother navigation between showcase items

### 🔍 Enhanced Search Functionality
- **Virtual Filtering**: Search operates on data array rather than DOM elements
- **Consistent Results**: Maintains filter state independently of DOM
- **Autocomplete Optimization**: Built from virtual data for faster suggestions

### 🛠️ Code Quality Improvements
- **Simplified Logic**: Removed complex DOM traversal and class toggling
- **Better Separation**: Clear distinction between data layer and presentation layer
- **Maintainability**: Easier to add/modify showcase items programmatically
- **Debugging**: Console logging shows virtual data count for verification

### 🐛 Bug Fixes
- **Textarea Height Calculation**: Fixed race conditions in height adjustment
- **Active State Management**: Proper handling of single active showcase item
- **Event Listener Cleanup**: Streamlined listener attachment for dynamic content

---

## v2.2 - Production Deployment & Enhanced Validation
**Switched to production endpoints, improved license validation system, streamlined user feedback with cleaner messaging, integrated review system, and enhanced community features.**

### 🚀 Production Environment Activation
- **Live Endpoints**: Switched from test to production webhook URLs
- **Repository Submission**: Now using `/api/webhook/new-repo-request` endpoint
- **License Validation**: Active production endpoint for Gumroad license verification
- **Configuration Management**: Easy test/production toggle via commented configuration

### 🔐 Enhanced License Validation System
- **Timeout Protection**: Added 10-second timeout with AbortSignal for validation requests
- **Dynamic Response Display**: License info now shows all returned fields from API
- **Flexible Messaging**: Automatically formats and displays any additional metadata from validation response
- **Field Formatting**: Converts snake_case API responses to readable display format
- **Improved Error Handling**: Specific timeout error messages for better user experience

### 🔒 Free Trial Anti-Abuse Enhancements
- **Pre-Generation Validation**: Added double-check against UsedFreeLicenseKeys.json before generating trial keys
- **Database Path Update**: Changed from `/data/` to `data/FreeTrialKeys/` for organized file structure
- **n8n Format Handling**: Enhanced JSON parsing to handle n8n's array wrapper format `[{"usedKeys": [...]}]`
- **Fallback Support**: Maintains compatibility with both array and object JSON formats
- **Early Exit Prevention**: Stops trial generation if key already used, before any processing
- **Debug Logging**: Added console logging for key verification during validation process
- **Improved User Feedback**: Clear "already redeemed this month" messaging at validation stage

### ⚡ Performance Optimization
- **Debounce Adjustment**: Increased license key input debounce from 500ms to 2 seconds
- **Reduced API Calls**: Prevents excessive validation requests during rapid typing
- **Better UX**: Allows users to finish typing before triggering validation

### 💬 Streamlined User Communication
- **Simplified Success Messages**: Clean single-line status with Job ID display
- **Error Code System**: Categorized error messages (LICENSE_NO_CREDITS, SERVICE_UNAVAILABLE, INVALID_LICENSE, TIMEOUT_ERROR)
- **Context-Aware Responses**: Different messages based on specific error conditions
- **Reduced Visual Clutter**: Removed verbose multi-paragraph placeholder text
- **Action-Oriented Labels**: Updated button text ("Submit New Request" vs "Start New Analysis")

### 🛠️ Response Handling Improvements
- **Job ID Extraction**: Multiple fallback fields (analysisId, analysis_id, requestId)
- **Error Response Processing**: Enhanced error detection from API responses
- **Status Differentiation**: Proper handling of error status within successful HTTP responses
- **Free Trial Marking**: Moved trial-used marking to after response processing (prevents premature marking)

### 🔄 Form State Management
- **Field Reset Enhancement**: Proper cleanup of auto-populated labels on new analysis
- **ReadOnly Property Fix**: Consistent handling of field locking states
- **Visual State Restoration**: Complete style reset when starting new submissions

### 🎨 UI/UX Improvements
- **Terminology Update**: Changed "Analysis" to "Processing" throughout interface for clarity
- **Discord Field Enhancement**: Updated to "Discord User ID" with number-only placeholder and support server link
- **Pricing Display**: Added "EARLY BIRD: 12% OFF" promotional banner
- **Credit Options**: Updated to show "10 or 20 credit options" messaging
- **Button Text Refinement**: Standardized action buttons ("Process Repository" vs "Analyze Repository")

### ⭐ Review System Integration
- **External Review Form**: Added Google Forms integration for customer reviews
- **Review Display**: New dedicated reviews section with pagination support
- **Dynamic Loading**: JavaScript-powered review fetching and display system
- **Navigation Controls**: Previous/Next buttons with page indicator
- **Dedicated Stylesheet**: New `reviews.css` for modular review component styling
- **Loading States**: Smooth loading experience with placeholder text

### 🔗 Community & Support Features
- **Discord Floating Button**: Added persistent Discord server invitation button
- **Ko-fi Widget Support**: Prepared infrastructure for donation widget (commented out)
- **Discord Widget Integration**: New `discord-widget.js` for enhanced server presence
- **Floating Widgets CSS**: Dedicated stylesheet for floating UI elements
- **Support Server Link**: Direct link in Discord field help text

### 🏗️ Code Structure
- **Modular JavaScript**: Added `reviews.js` for review system functionality
- **Separated Concerns**: Individual CSS files for different UI components
- **HTML Cleanup**: Fixed missing closing div tags
- **Accessibility**: Added ARIA labels for pagination buttons

### 📝 Code Quality
- **Comment Cleanup**: Removed redundant inline comments throughout codebase
- **Consistent Formatting**: Improved code readability and organization
- **Better Error Logging**: Maintained debugging capabilities while cleaning production code

### 🎯 Data Collection Updates
- **Simplified Email Field**: Changed `trial_email` to `email` in payload
- **Discord Field Rename**: Changed `discord_username` to `discord_id` for consistency
- **Metadata Preservation**: Maintained timestamp, timezone, and source tracking

---

## v2.0 - Production-Ready Analysis Platform
**Evolved from basic form submission to production-ready analysis platform with anti-abuse measures, webhook integration, maintenance automation, and bulletproof free trial flow.**

### 🔒 Enhanced Free Trial System
- **Manual Copy/Paste Flow**: Changed from auto-populated license key to secure manual copy/paste approach
- **Credit Display Interface**: Added "Free Trial Key Generated – 1 Analysis Credit Available" notification
- **Modal Persistence**: User must manually close modal after copying key (no auto-close)
- **Anti-Abuse Integration**: Client-side validation against UsedFreeLicenseKeys.json database
- **Cross-Session Protection**: Prevents duplicate free trial usage across sessions/devices

### 🔧 Advanced Repository Validation
- **Intelligent URL Cleaning**: Handles `/tree/`, `/blob/`, `/commit/`, archive URLs, raw URLs automatically
- **Visual Feedback**: Green flash animation when URLs are auto-cleaned
- **Collision Prevention**: Fixed repository name extraction to use `owner_repo` format
- **Shared Validation**: Unified `validateGitHubRepositoryAccess` function for both forms
- **GitHub API Integration**: Real-time repository accessibility checking

### 🌐 Webhook Infrastructure
- **Production Endpoints**: Replaced n8n forms with Cloudflare Worker webhook endpoints
- **Comprehensive Payloads**: Enhanced data collection with metadata, timestamps, timezone info
- **Response Management**: Dynamic response containers replace submit button during processing
- **Error Handling**: Proper success/failure states with 5-minute timeout protection
- **Test/Production Switching**: Easy configuration toggle between test and live endpoints

### 🛠️ Maintenance Automation
- **IST Timezone Awareness**: Automatic maintenance window detection (1:05-1:15 AM IST)
- **Real-Time Countdown**: Live timer display during maintenance periods
- **Seamless Recovery**: Automatic form restoration after maintenance completion
- **User Communication**: Clear messaging prevents confusion during maintenance

### 🎯 State Management System
- **Dynamic Button Replacement**: Handles maintenance, processing, and normal states
- **Event Listener Management**: Automatic re-attachment for dynamically created elements
- **Form Validation Enhancement**: Cross-state validity checking with proper CSS class detection
- **Repository Auto-Population**: Fixed `readOnly` property casing and async validation timing

### 🐛 Critical Bug Fixes
- **Field Locking**: Resolved `readonly` vs `readOnly` property casing issue
- **Validation Timing**: Fixed async repository validation race conditions
- **Modal Conflicts**: Added proper `trialRepoUrl` field ID to prevent DOM conflicts
- **Visual Styling**: Proper field locking with blue background and green border indication

### 📊 Enhanced Debugging
- **HTTP Logging**: Comprehensive request/response monitoring system
- **Flow Tracking**: Auto-population process debugging with detailed state analysis
- **GitHub API Debugging**: Response analysis for repository validation troubleshooting
- **Manual Testing**: Built-in functions for development and troubleshooting

---

## v1.9 - Major Infrastructure Changes
**Major architectural improvements (development in progress)**

---

## v1.8 - VPN Detection
**VPN detection system implemented and functioning correctly**

### Features
- Advanced VPN detection algorithms
- Multiple detection methods for reliability
- User feedback for VPN-detected scenarios

---

## v1.7 - Cookie Management
**Cookie functionality fully operational**

### Features
- Reliable cookie detection and management
- Cross-browser compatibility
- Proper consent handling

---

## v1.6 - Modular Architecture
**Refactored codebase into modular architecture**

### Features
- **Separation of Concerns**: Dedicated free-trial.css and free-trial.js files
- **Desktop Layout**: Fixed heights (630px) for uniform desktop experience
- **Code Organization**: Improved maintainability and scalability

---

## v1.5 - Layout Standardization
**Implemented consistent fixed heights across all containers**

### Features
- **Uniform Heights**: sidebar-left, form-container, sidebar-right, and main container
- **Discord Integration**: Moved Discord field to main form-container
- **Free Trial Foundation**: Initial free-trial.js implementation

---

## v1.4 - Navigation Optimization
**Compacted showcase navigation for better space utilization**

### Features
- **Horizontal Layout**: Single row for Previous, counter, and Next across all views
- **Responsive Design**: Consistent behavior on desktop, mobile, and mobile desktop
- **Space Efficiency**: Reduced button and counter dimensions

---

## v1.3 - Textarea Improvements
**Enhanced textarea display and scrolling behavior**

### Features
- **Scrollbar Management**: Removed horizontal scrollbar for desktop, retained for mobile
- **Text Rendering**: Consistent `\n` handling with `white-space: pre`
- **Cross-Platform**: Unified behavior across desktop and mobile desktop views

---

## v1.2 - UI Alignment Fixes
**Resolved button alignment and text positioning issues**

### Features
- **Button Text**: Changed "Try once for free" to "Free Trial"
- **Text Alignment**: Left-aligned "Repository Analysis" header text
- **Form Layout**: Improved visual hierarchy in form-container

---

## v1.1 - Showcase Container Fix
**Fixed blank space issues in showcase display**

### Features
- **Dynamic Heights**: Automatic container height adjustment
- **TextArea Optimization**: Eliminated unwanted blank space
- **Active State Management**: Proper showcase-item.active display handling
