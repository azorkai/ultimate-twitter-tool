/**
 * Twitter Profile Prank Content Script
 * This script modifies the Twitter profile page to show custom stats
 * (followers, following, posts) and verification status.
 */

(function() {
    console.log('Twitter Profile Prank Content Script loaded');
    
    // Enable debug mode
    const DEBUG = true;
    
    // Cache for DOM elements to reduce queries
    const elementCache = {
        statsElements: null,
        displayNameElement: null,
        lastStatsElementsCheck: 0,
        lastDisplayNameCheck: 0
    };
    
    // Max cache age in milliseconds (5 seconds)
    const MAX_CACHE_AGE = 5000;
    
    // Store original values to restore them later
    let originalValues = {
        followers: null,
        following: null,
        posts: null,
        verified: null
    };
    
    // Store current prank settings
    let currentSettings = {
        followers: null,
        following: null,
        posts: null,
        verified: 'none',
        blurUsername: false,
        isActive: false
    };
    
    // Performance-optimized debug function
    function debugLog(...args) {
        if (DEBUG) {
            console.log(...args);
        }
    }
    
    // Debug function to analyze Twitter's HTML structure - only called on demand
    function analyzeTwitterStructure() {
        console.log('=== TWITTER STRUCTURE ANALYSIS ===');
        
        // Check if we're on a profile page
        const isProfile = isProfilePage();
        console.log('Is profile page:', isProfile);
        
        if (!isProfile) {
            console.log('Not on a profile page, skipping analysis');
            return;
        }
        
        // Find key elements for profile page
        const userNameElement = document.querySelector('[data-testid="UserName"]');
        console.log('UserName element:', userNameElement);
        
        // Find links related to profile stats
        const allLinks = Array.from(document.querySelectorAll('a[role="link"]')).filter(a => {
            const href = a.getAttribute('href') || '';
            return href.includes('/following') || href.includes('/followers') || href.includes('/posts');
        });
        
        console.log('Profile stat links:', allLinks);
        
        // Find verification badge if exists
        const verificationBadge = findVerificationBadge();
        console.log('Verification badge:', verificationBadge);
        
        console.log('=== END OF ANALYSIS ===');
    }
    
    // Set up a listener for messages from popup
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        debugLog('Received message:', message);
        
        // Ping message to check if content script is active
        if (message.action === 'ping') {
            console.log('Content script ping received');
            sendResponse({ status: 'ok' });
            return true;
        }
        
        if (message.action === 'getStatus') {
            sendResponse({
                isActive: currentSettings.isActive,
                settings: currentSettings
            });
            return true;
        }
        
        if (message.action === 'applyPrankProfile') {
            // Store original values first time we activate
            if (!originalValues.followers) {
                storeOriginalValues();
            }
            
            // Update current settings with new values
            currentSettings = {
                followers: message.followers !== undefined ? parseInt(message.followers) : currentSettings.followers,
                following: message.following !== undefined ? parseInt(message.following) : currentSettings.following,
                posts: message.posts !== undefined ? parseInt(message.posts) : currentSettings.posts,
                verified: message.verified || currentSettings.verified,
                blurUsername: message.blurUsername || currentSettings.blurUsername,
                isActive: true
            };
            
            debugLog('Updated settings:', currentSettings);
            
            // Force a refresh of element cache and try to apply settings
            clearElementCache();
            applyCurrentSettings();
            
            // Force refresh mutation observer
            setupFocusedMutationObserver();
            
            // Also set a timeout to reapply after a short delay
            // This helps with tricky Twitter loading
            setTimeout(() => {
                clearElementCache();
                applyCurrentSettings();
            }, 1000);
            
            sendResponse({ success: true });
            return true;
        }
        
        if (message.action === 'resetPrankProfile') {
            resetPrankProfile();
            sendResponse({ success: true });
            return true;
        }
        
        if (message.action === 'analyzeTwitterStructure') {
            analyzeTwitterStructure();
            sendResponse({ success: true });
            return true;
        }
        
        if (message.action === 'captureProfileScreenshot') {
            // Respond immediately to prevent connection loss
            sendResponse({ status: 'processing' });
            
            // Process the screenshot capture asynchronously
            captureProfileScreenshot()
                .then(imageData => {
                    // Since we already sent a response, we can't use sendResponse again
                    // Instead, we'll send a new message back to the popup
                    chrome.runtime.sendMessage({
                        action: 'screenshotCaptured',
                        imageData: imageData
                    });
                })
                .catch(error => {
                    console.error('Error capturing screenshot:', error);
                    chrome.runtime.sendMessage({
                        action: 'screenshotError',
                        error: error.message || 'Failed to capture screenshot'
                    });
                });
            
            // Return true to indicate we will respond asynchronously
            return true;
        }
        
        return false;
    });
    
    // Capture profile screenshot
    function captureProfileScreenshot() {
        return new Promise((resolve, reject) => {
            try {
                // Check if we're on a profile page
                if (!isProfilePage()) {
                    throw new Error("Not on a Twitter profile page");
                }
                
                debugLog('Capturing profile screenshot');
                
                // Find the profile header area (red box from the example)
                const profileHeader = document.querySelector('[data-testid="primaryColumn"]');
                
                if (!profileHeader) {
                    throw new Error("Could not find Twitter profile area");
                }
                
                // Add a notification to the page
                showScreenshotNotification('Capturing profile screenshot...');
                
                // Inject screenshot styles
                injectScreenshotStyles();
                
                // Use a more reliable method to load html2canvas
                // First check if it's already loaded
                if (typeof window.html2canvas !== 'undefined') {
                    debugLog('html2canvas already loaded, capturing now');
                    captureWithHtml2Canvas(profileHeader, resolve, reject);
                    return;
                }
                
                // Try to load it from extension
                debugLog('Attempting to load html2canvas from extension');
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('html2canvas.min.js');
                script.onload = () => {
                    try {
                        debugLog('html2canvas loaded from extension, checking if defined');
                        if (typeof window.html2canvas !== 'undefined') {
                            debugLog('html2canvas successfully loaded from extension, capturing now');
                            captureWithHtml2Canvas(profileHeader, resolve, reject);
                        } else {
                            throw new Error('html2canvas is not defined after loading from extension');
                        }
                    } catch (error) {
                        debugLog('Error after loading from extension:', error);
                        tryLoadingFromCDN();
                    }
                };
                script.onerror = tryLoadingFromCDN;
                
                // Function to try loading from various CDN sources
                function tryLoadingFromCDN() {
                    debugLog('Failed to load from extension, trying multiple CDNs');
                    
                    // List of CDN URLs to try
                    const cdnUrls = [
                        'removed'
                    ];
                    
                    // Try each CDN URL in sequence
                    tryNextCDN(0);
                    
                    function tryNextCDN(index) {
                        if (index >= cdnUrls.length) {
                            debugLog('All CDNs failed, trying direct implementation');
                            // Try our direct implementation as a last resort
                            loadHtml2CanvasDirectly()
                                .then(() => {
                                    debugLog('Direct implementation loaded, capturing now');
                                    captureWithHtml2Canvas(profileHeader, resolve, reject);
                                })
                                .catch(error => {
                                    debugLog('Direct implementation also failed:', error);
                                    reject(new Error('Failed to load html2canvas from any source: ' + error.message));
                                });
                            return;
                        }
                        
                        const currentUrl = cdnUrls[index];
                        debugLog(`Trying CDN #${index + 1}: ${currentUrl}`);
                        
                        const cdnScript = document.createElement('script');
                        cdnScript.src = currentUrl;
                        cdnScript.onload = () => {
                            try {
                                debugLog(`html2canvas loaded from CDN ${index + 1}, checking if defined`);
                                if (typeof window.html2canvas !== 'undefined') {
                                    debugLog('html2canvas successfully loaded from CDN, capturing now');
                                    captureWithHtml2Canvas(profileHeader, resolve, reject);
                                } else {
                                    throw new Error(`html2canvas is not defined after loading from CDN ${index + 1}`);
                                }
                            } catch (error) {
                                debugLog(`Error after loading from CDN ${index + 1}:`, error);
                                tryNextCDN(index + 1);
                            }
                        };
                        cdnScript.onerror = () => {
                            debugLog(`Failed to load from CDN ${index + 1}, trying next`);
                            tryNextCDN(index + 1);
                        };
                        document.head.appendChild(cdnScript);
                    }
                }
                
                document.head.appendChild(script);
            } catch (error) {
                console.error('Error setting up screenshot capture:', error);
                reject(error);
            }
        });
    }
    
    // Show a notification on the page when capturing screenshot
    function showScreenshotNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'screenshot-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '10000';
        notification.style.animation = 'fadeInOut 2.5s ease-in-out forwards';
        
        // Add keyframes for fadeInOut animation if not already present
        if (!document.querySelector('#screenshot-keyframes')) {
            const style = document.createElement('style');
            style.id = 'screenshot-keyframes';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after animation completes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2500);
    }
    
    // Inject styles for screenshot capture
    function injectScreenshotStyles() {
        if (!document.querySelector('#screenshot-styles')) {
            const style = document.createElement('style');
            style.id = 'screenshot-styles';
            style.textContent = `
                .capture-profile {
                    position: relative;
                    z-index: 9999;
                }
                
                .screenshot-spinner {
                    animation: rotateSpinner 1.5s linear infinite;
                }
                
                @keyframes rotateSpinner {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Capture screenshot with html2canvas
    function captureWithHtml2Canvas(element, resolve, reject) {
        try {
            // Add a temporary class for better screenshot quality
            element.classList.add('capture-profile');
            
            // Set capture options
            const options = {
                scale: 2,  // Higher quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false
            };
            
            // Make sure html2canvas is defined
            if (typeof window.html2canvas === 'undefined') {
                throw new Error('html2canvas is not defined');
            }
            
            // Use html2canvas to capture the element
            window.html2canvas(element, options)
                .then(canvas => {
                    // Remove the temporary class
                    element.classList.remove('capture-profile');
                    
                    // Convert canvas to data URL
                    const imageData = canvas.toDataURL('image/png');
                    
                    // Resolve the promise with the image data
                    resolve(imageData);
                })
                .catch(error => {
                    element.classList.remove('capture-profile');
                    console.error('Error in html2canvas:', error);
                    reject(new Error('Failed to render screenshot'));
                });
        } catch (error) {
            element.classList.remove('capture-profile');
            console.error('Error capturing with html2canvas:', error);
            reject(error);
        }
    }
    
    // Helper function to load external scripts
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Check if we're on a profile page - optimized for performance
    function isProfilePage() {
        // Twitter profile URLs are in the format: twitter.com/username or x.com/username
        const url = window.location.href;
        const isTwitter = url.includes('twitter.com/') || url.includes('x.com/');
        
        if (!isTwitter) {
            return false;
        }
        
        // Exclude known non-profile pages
        const nonProfilePages = [
            '/home', '/explore', '/notifications', '/messages', 
            '/bookmarks', '/lists', '/communities', '/verified_followers'
        ];
        
        for (const page of nonProfilePages) {
            if (url.includes(page)) {
                return false;
            }
        }
        
        // Check if URL has format twitter.com/username
        const urlParts = url.split('/');
        const potentialUsername = urlParts[urlParts.length - 1];
        
        // If it has a query string or hash, it's likely not a simple profile
        if (potentialUsername.includes('?') || potentialUsername.includes('#')) {
            return false;
        }
        
        return true;
    }
    
    // Apply prank profile settings
    function applyPrankProfile(settings) {
        if (!isProfilePage()) {
            console.log('Not on a profile page, skipping prank');
            return;
        }
        
        // Clear element cache to ensure fresh elements
        clearElementCache();
        
        debugLog('Applying prank profile settings with retry mechanism');
        
        // Wait for the profile page to fully load, then try to apply changes
        setTimeout(() => {
            applyPrankWithRetry(settings, 0);
        }, 2000); // Wait 2 seconds for the page to load
    }
    
    // Clear element cache
    function clearElementCache() {
        elementCache.statsElements = null;
        elementCache.displayNameElement = null;
        elementCache.lastStatsElementsCheck = 0;
        elementCache.lastDisplayNameCheck = 0;
    }
    
    // Apply prank with retry mechanism - optimized version
    function applyPrankWithRetry(settings, retryCount, maxRetries = 3) {
        debugLog(`Attempt ${retryCount + 1} to apply prank settings`);
        
        // Save original values if not already saved
        if (originalValues.followers === null) {
            saveOriginalValues();
        }
        
        let successCount = 0;
        let totalChanges = 0;
        
        // Count how many changes we're trying to make
        if (settings.followers !== null) totalChanges++;
        if (settings.following !== null) totalChanges++;
        if (settings.posts !== null) totalChanges++;
        if (settings.verified !== 'none') totalChanges++;
        if (settings.blurUsername !== undefined) totalChanges++;
        
        // Apply changes
        if (settings.followers !== null) {
            try {
                const success = updateFollowersCount(settings.followers);
                if (success) {
                    successCount++;
                    debugLog('Successfully updated followers count');
                } else {
                    console.error('Failed to update followers count');
                }
            } catch (error) {
                console.error('Error updating followers count:', error);
            }
        }
        
        if (settings.following !== null) {
            try {
                const success = updateFollowingCount(settings.following);
                if (success) {
                    successCount++;
                    debugLog('Successfully updated following count');
                } else {
                    console.error('Failed to update following count');
                }
            } catch (error) {
                console.error('Error updating following count:', error);
            }
        }
        
        if (settings.posts !== null) {
            try {
                const success = updatePostsCount(settings.posts);
                if (success) {
                    successCount++;
                    debugLog('Successfully updated posts count');
                } else {
                    console.error('Failed to update posts count');
                }
            } catch (error) {
                console.error('Error updating posts count:', error);
            }
        }
        
        if (settings.verified !== 'none') {
            try {
                const success = updateVerifiedStatus(settings.verified);
                if (success) {
                    successCount++;
                    debugLog('Successfully updated verified status');
                } else {
                    console.error('Failed to update verified status');
                }
            } catch (error) {
                console.error('Error updating verified status:', error);
            }
        }
        
        if (settings.blurUsername !== undefined) {
            try {
                const success = updateUsernameBlur(settings.blurUsername);
                if (success) {
                    successCount++;
                    debugLog('Successfully updated username blur');
                } else {
                    console.error('Failed to update username blur');
                }
            } catch (error) {
                console.error('Error updating username blur:', error);
            }
        }
        
        // Prank aktifse, "Get Verified" butonunu gizle
        hideGetVerifiedButton(true);
        
        // Ensure sidebar menu items are not hidden
        ensureSidebarMenuItemsVisible();
        
        // Check if we need to retry
        if (successCount < totalChanges && retryCount < maxRetries) {
            debugLog(`Only ${successCount}/${totalChanges} changes applied successfully, retrying in 500ms...`);
            setTimeout(() => {
                applyPrankWithRetry(settings, retryCount + 1, maxRetries);
            }, 500);
            return;
        }
        
        // Setup mutation observer to keep changes applied
        setupFocusedMutationObserver();
        
        // Update current settings
        currentSettings = {
            followers: settings.followers,
            following: settings.following,
            posts: settings.posts,
            verified: settings.verified,
            blurUsername: settings.blurUsername,
            isActive: true
        };
        
        debugLog(`Prank applied with ${successCount}/${totalChanges} successful changes`);
    }
    
    // Ensure sidebar menu items are visible
    function ensureSidebarMenuItemsVisible() {
        try {
            debugLog('Ensuring sidebar menu items are visible');
            
            // Sol menüdeki linkleri tanımlamak için seçici
            const sidebarSelector = 'nav[aria-label="Primary"], nav[role="navigation"], header[role="banner"] nav';
            const sidebar = document.querySelector(sidebarSelector);
            
            if (!sidebar) {
                debugLog('Sidebar not found');
                return;
            }
            
            // Özel menü öğelerini doğrudan hedefle
            const specificMenuItems = [
                'Premium',
                'Verified Orgs',
                'Grok'
            ];
            
            // Tüm menü öğelerini kontrol et
            const allMenuItems = sidebar.querySelectorAll('a[role="link"]');
            for (const item of allMenuItems) {
                const itemText = item.textContent.trim();
                
                // Özel menü öğesi mi kontrol et
                const isSpecificItem = specificMenuItems.some(menuText => 
                    itemText.includes(menuText) || 
                    itemText.toLowerCase().includes(menuText.toLowerCase())
                );
                
                // Özel href'leri kontrol et
                const href = item.getAttribute('href');
                const isSpecificHref = href === '/i/verified_orgs' || 
                                      href === '/i/premium' || 
                                      href === '/i/grok';
                
                if (isSpecificItem || isSpecificHref) {
                    debugLog(`Ensuring visibility of sidebar item: ${itemText}`);
                    
                    // Görünürlüğü sağla
                    if (item.style.display === 'none') {
                        item.style.display = '';
                    }
                    
                    // data-prank-hidden özelliğini kaldır
                    if (item.getAttribute('data-prank-hidden') === 'true') {
                        item.removeAttribute('data-prank-hidden');
                    }
                    
                    // Üst elementleri de kontrol et
                    let parent = item.parentElement;
                    while (parent && parent !== sidebar) {
                        if (parent.style.display === 'none') {
                            parent.style.display = '';
                        }
                        parent = parent.parentElement;
                    }
                }
            }
        } catch (error) {
            console.error('Error ensuring sidebar menu items visibility:', error);
        }
    }
    
    // Reset prank profile to original values
    function resetPrankProfile() {
        if (!isProfilePage()) {
            console.log('Not on a profile page, skipping reset');
            return;
        }
        
        // Reset to original values if we have them
        if (originalValues.followers !== null) {
            updateFollowersCount(originalValues.followers);
        }
        
        if (originalValues.following !== null) {
            updateFollowingCount(originalValues.following);
        }
        
        if (originalValues.posts !== null) {
            updatePostsCount(originalValues.posts);
        }
        
        // Remove any fake verification badge
        removeVerificationBadge();
        
        // Remove username blur
        updateUsernameBlur(false);
        
        // Reset current settings
        currentSettings = {
            followers: null,
            following: null,
            posts: null,
            verified: 'none',
            blurUsername: false,
            isActive: false
        };
        
        // Show the "Get Verified" button again
        hideGetVerifiedButton(false);
        
        // Remove mutation observer
        if (window.prankMutationObserver) {
            window.prankMutationObserver.disconnect();
            window.prankMutationObserver = null;
        }
        
        // Clear element cache
        clearElementCache();
    }
    
    // Find profile stats elements - optimized for performance with caching
    function findProfileStatsElements() {
        // Check if we have cached elements and the cache is not too old
        const now = Date.now();
        if (elementCache.statsElements && now - elementCache.lastStatsElementsCheck < MAX_CACHE_AGE) {
            return elementCache.statsElements;
        }
        
        debugLog('Finding profile stats elements with optimized approach');
        
        // First try to find followers element directly
        const followersLink = document.querySelector('a[href*="/followers"][role="link"]');
        if (followersLink) {
            // Find the follower count using our specialized approach
            const followerElement = findFollowerCountElement(followersLink);
            if (followerElement) {
                debugLog('Found follower element directly:', followerElement);
                
                // Now try to find the other elements
                const followingLink = document.querySelector('a[href*="/following"][role="link"]');
                const postsLink = document.querySelector('a[href*="/posts"][role="link"]');
                
                const followingElement = followingLink ? findNumberElementInLink(followingLink) : null;
                const postsElement = postsLink ? findNumberElementInLink(postsLink) : null;
                
                if (followingElement && postsElement) {
                    const statsElements = [followingElement, followerElement, postsElement];
                    elementCache.statsElements = statsElements;
                    elementCache.lastStatsElementsCheck = now;
                    return statsElements;
                }
            }
        }
        
        // Continue with our standard approach
        const statsLinks = findStatsLinks();
        if (statsLinks.length >= 3) {
            const statsElements = [];
            
            // Find elements with numbers in each link
            for (const link of statsLinks) {
                const href = link.getAttribute('href') || '';
                const spans = link.querySelectorAll('span, div');
                
                for (const span of spans) {
                    if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim())) {
                        if (href.includes('/following')) {
                            statsElements[0] = span;
                        } else if (href.includes('/followers')) {
                            statsElements[1] = span;
                        } else if (href.includes('/posts')) {
                            statsElements[2] = span;
                        }
                        break;
                    }
                }
            }
            
            // If we found all three elements
            if (statsElements[0] && statsElements[1] && statsElements[2]) {
                debugLog('Found all stats elements from links:', statsElements);
                elementCache.statsElements = statsElements;
                elementCache.lastStatsElementsCheck = now;
                return statsElements;
            }
        }
        
        // If the fast approach failed, try with targeted selectors
        const followingSelector = 'a[href*="/following"] span, a[href*="/following"] div[dir="auto"]';
        const followersSelector = 'a[href*="/followers"] span, a[href*="/followers"] div[dir="auto"]';
        const postsSelector = 'a[href*="/posts"] span, a[href*="/posts"] div[dir="auto"]';
        
        const followingElements = Array.from(document.querySelectorAll(followingSelector))
            .filter(el => el.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(el.textContent.trim()));
        
        const followersElements = Array.from(document.querySelectorAll(followersSelector))
            .filter(el => el.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(el.textContent.trim()));
        
        const postsElements = Array.from(document.querySelectorAll(postsSelector))
            .filter(el => el.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(el.textContent.trim()));
        
        if (followingElements.length > 0 && followersElements.length > 0 && postsElements.length > 0) {
            const statsElements = [followingElements[0], followersElements[0], postsElements[0]];
            debugLog('Found profile stats elements with targeted selectors');
            elementCache.statsElements = statsElements;
            elementCache.lastStatsElementsCheck = now;
            return statsElements;
        }
        
        debugLog('Could not find profile stats elements');
        return null;
    }
    
    // Helper function to find follower count element
    function findFollowerCountElement(followersLink) {
        if (!followersLink) return null;
        
        // First try nested spans with specific CSS classes
        const cssClassSpans = followersLink.querySelectorAll('.css-1jxf684');
        for (const span of cssClassSpans) {
            if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim()) && !span.querySelector('span')) {
                return span;
            }
        }
        
        // Then try direct spans
        const spans = followersLink.querySelectorAll('span');
        for (const span of spans) {
            if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim()) && !span.querySelector('span')) {
                return span;
            }
        }
        
        // Try text nodes approach
        const textNodes = [];
        findTextNodesWithNumbers(followersLink, textNodes);
        if (textNodes.length > 0) {
            for (const textNode of textNodes) {
                if (/^\d+$|^\d+\.\d+[KMBkmb]?$/.test(textNode.nodeValue.trim())) {
                    return textNode.parentNode;
                }
            }
        }
        
        return null;
    }
    
    // Helper function to find number element in a link
    function findNumberElementInLink(link) {
        if (!link) return null;
        
        // Try spans with specific CSS classes first
        const cssClassSpans = link.querySelectorAll('.css-1jxf684');
        for (const span of cssClassSpans) {
            if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim()) && !span.querySelector('span')) {
                return span;
            }
        }
        
        // Then try any spans
        const spans = link.querySelectorAll('span');
        for (const span of spans) {
            if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim()) && !span.querySelector('span')) {
                return span;
            }
        }
        
        // Try divs with direct auto direction
        const divs = link.querySelectorAll('div[dir="auto"]');
        for (const div of divs) {
            if (div.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(div.textContent.trim()) && !div.querySelector('div, span')) {
                return div;
            }
        }
        
        // Try text nodes approach
        const textNodes = [];
        findTextNodesWithNumbers(link, textNodes);
        if (textNodes.length > 0) {
            for (const textNode of textNodes) {
                if (/^\d+$|^\d+\.\d+[KMBkmb]?$/.test(textNode.nodeValue.trim())) {
                    return textNode.parentNode;
                }
            }
        }
        
        return null;
    }
    
    // Find stats links (following, followers, posts)
    function findStatsLinks() {
        debugLog('Finding stats links');
        
        // Method 1: Find links with specific URLs
        const followingLink = document.querySelector('a[href*="/following"][role="link"]');
        const followersLink = document.querySelector('a[href*="/followers"][role="link"]');
        const postsLink = document.querySelector('a[href*="/posts"][role="link"]');
        
        if (followingLink && followersLink && postsLink) {
            debugLog('Found all stats links via URL patterns');
            return [followingLink, followersLink, postsLink];
        }
        
        // Method 2: Find links based on content
        const allLinks = document.querySelectorAll('a[role="link"]');
        const statsLinks = [];
        
        for (const link of allLinks) {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            
            // Check if this link contains a number (could be a stat)
            if (/\d/.test(text)) {
                if (href.includes('/following') || text.toLowerCase().includes('following')) {
                    statsLinks[0] = link;
                } else if (href.includes('/followers') || text.toLowerCase().includes('follower')) {
                    statsLinks[1] = link;
                } else if (href.includes('/posts') || text.toLowerCase().includes('post')) {
                    statsLinks[2] = link;
                }
            }
        }
        
        // Return only if we found all three links
        if (statsLinks[0] && statsLinks[1] && statsLinks[2]) {
            debugLog('Found all stats links via content search');
            return statsLinks;
        }
        
        // Method 3: Find within profile header
        const profileHeader = document.querySelector('[data-testid="UserProfileHeader_Items"]');
        if (profileHeader) {
            const headerLinks = profileHeader.querySelectorAll('a[role="link"]');
            
            // If we found exactly 3 links, assume they're the stats
            if (headerLinks.length === 3) {
                debugLog('Found all stats links in profile header');
                return Array.from(headerLinks);
            }
        }
        
        debugLog('Could not find all stats links');
        return [];
    }
    
    // Save original values before applying prank
    function saveOriginalValues() {
        const statsElements = findProfileStatsElements();
        
        if (statsElements && statsElements.length >= 3) {
            originalValues.following = extractNumberFromText(statsElements[0].textContent);
            originalValues.followers = extractNumberFromText(statsElements[1].textContent);
            originalValues.posts = extractNumberFromText(statsElements[2].textContent);
            
            debugLog('Saved original values:', originalValues);
        } else {
            console.error('Could not save original values, stats elements not found');
        }
        
        // Check if profile is verified
        const verificationBadge = findVerificationBadge();
        originalValues.verified = !!verificationBadge;
        
        debugLog('Profile is verified:', originalValues.verified);
    }
    
    // Find verification badge - optimized
    function findVerificationBadge() {
        return document.querySelector('[data-testid="UserName"] svg[data-testid*="icon-verified"]');
    }
    
    // Extract number from formatted text (e.g., "1.2K Followers" -> 1200)
    function extractNumberFromText(text) {
        if (!text) return 0;
        
        // Remove commas and extract the number part
        const numStr = text.replace(/,/g, '').match(/^([\d.]+)/);
        if (!numStr || !numStr[1]) {
            return 0;
        }
        
        let num = parseFloat(numStr[1]);
        
        // Handle K, M, B suffixes
        if (text.includes('K') || text.includes('k')) {
            num *= 1000;
        } else if (text.includes('M') || text.includes('m')) {
            num *= 1000000;
        } else if (text.includes('B') || text.includes('b')) {
            num *= 1000000000;
        }
        
        return Math.round(num);
    }
    
    // Helper function to find text nodes containing numbers
    function findTextNodesWithNumbers(node, results) {
        // Check if this is a text node
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue.trim();
            // If it contains a number (standalone or with K/M/B suffix)
            if (/\d+|\d+\.\d+[KMBkmb]?/.test(text)) {
                results.push(node);
            }
            return;
        }
        
        // If this is an element node, check its children
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Don't look inside certain elements like scripts or meta tags
            if (['SCRIPT', 'STYLE', 'META', 'LINK'].includes(node.tagName)) {
                return;
            }
            
            // Recursively check children
            for (let i = 0; i < node.childNodes.length; i++) {
                findTextNodesWithNumbers(node.childNodes[i], results);
            }
        }
    }
    
    // Helper function to format a number for display (adding K, M, B suffixes)
    function formatNumberForDisplay(number) {
        if (typeof number !== 'number' || isNaN(number)) {
            return number?.toString() || '0';
        }
        
        // Format with locale (adds commas or periods based on locale)
        if (number < 10000) {
            return number.toLocaleString();
        }
        
        // Format with K, M, B suffixes
        if (number < 1000000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        if (number < 1000000000) {
            return (number / 1000000).toFixed(1) + 'M';
        }
        return (number / 1000000000).toFixed(1) + 'B';
    }
    
    // Update followers count - optimized and fixed for nested spans
    function updateFollowersCount(count) {
        debugLog(`Attempting to update followers count to ${count}`);
        
        // Format the count for display
        const formattedCount = formatNumberForDisplay(count);
        
        // Try the exact structure from the user's example
        try {
            // Example: <div class="css-175oi2r"><a href="/tradepulseai/verified_followers" dir="ltr" role="link" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1loqt21" style="color: rgb(231, 233, 234);"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-1b43r93 r-1cwl3u0 r-b88u0q" style="color: rgb(231, 233, 234);"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">2,181</span></span> <span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-1b43r93 r-1cwl3u0" style="color: rgb(113, 118, 123);"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">Followers</span></span></a></div>
            const verifiedFollowersLinks = document.querySelectorAll('a[href*="/verified_followers"][role="link"]');
            for (const link of verifiedFollowersLinks) {
                // Find the span that contains the number
                const spans = link.querySelectorAll('span.css-1jxf684');
                for (const span of spans) {
                    // Look for the innermost span with just the number
                    if (span.textContent && /^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(span.textContent.trim()) && !span.querySelector('span')) {
                        debugLog(`Found exact match for user's verified followers example: ${span.textContent} -> ${formattedCount}`);
                        span.textContent = formattedCount;
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Error trying to match exact verified followers structure:', error);
        }
        
        // Try the new structure from the user's example first
        const verifiedFollowersLink = document.querySelector('a[href*="/verified_followers"]');
        if (verifiedFollowersLink) {
            const nestedSpans = verifiedFollowersLink.querySelectorAll('span.css-1jxf684');
            for (const span of nestedSpans) {
                if (span.textContent && /^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(span.textContent.trim())) {
                    debugLog(`Found verified followers match: ${span.textContent} -> ${formattedCount}`);
                    span.textContent = formattedCount;
                    return true;
                }
            }
        }
        
        // Try the specific structure from the user's example first
        const doubleNestedSpans = document.querySelectorAll('span.css-1jxf684[style*="color"] > span.css-1jxf684');
        
        for (const span of doubleNestedSpans) {
            // Check if it's in a followers link
            const followersLink = span.closest('a[href*="/followers"]');
            if (followersLink && /^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(span.textContent.trim())) {
                debugLog(`Found exact match for user's example: ${span.textContent} -> ${formattedCount}`);
                span.textContent = formattedCount;
                return true;
            }
        }
        
        // Method 1: CSS classes-based approach (most reliable for Twitter's current structure)
        const cssClassSelector = 'a[href*="/followers"] .css-1jxf684';
        
        // Find all elements with the specific CSS class inside followers link
        const cssClassElements = document.querySelectorAll(cssClassSelector);
        debugLog(`Found ${cssClassElements.length} elements with CSS class selector`);
        
        // Loop through candidates and find elements containing just numbers
        for (const element of cssClassElements) {
            // Check if this contains only a number
            if (element.textContent && /^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(element.textContent.trim())) {
                debugLog(`Found followers element with content: "${element.textContent}"`);
                
                // Deal with nested structure - check if this is the innermost span
                const hasNestedSpans = element.querySelector('span');
                if (!hasNestedSpans) {
                    element.textContent = formattedCount;
                    debugLog(`Updated innermost span to: ${formattedCount}`);
                    return true;
                }
            }
        }
        
        // Method 2: Direct attribute selector for followers link
        const followersLink = document.querySelector('a[href*="/followers"][role="link"]');
        if (followersLink) {
            // First, try direct children that match the pattern
            const spans = followersLink.querySelectorAll('span');
            
            // Check each span and its children
            for (const span of spans) {
                // First check if it's a direct match
                if (span.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim())) {
                    // If it has no children spans, it's likely the target
                    const childSpans = span.querySelectorAll('span');
                    if (childSpans.length === 0) {
                        debugLog(`Updating direct span: ${span.textContent} -> ${formattedCount}`);
                        span.textContent = formattedCount;
                        return true;
                    }
                }
                
                // Then check for nested spans
                const nestedSpans = span.querySelectorAll('span');
                for (const nestedSpan of nestedSpans) {
                    if (nestedSpan.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(nestedSpan.textContent.trim())) {
                        debugLog(`Updating nested span: ${nestedSpan.textContent} -> ${formattedCount}`);
                        nestedSpan.textContent = formattedCount;
                        return true;
                    }
                }
            }
            
            // Try with alternative DOM traversal
            const textNodes = [];
            findTextNodesWithNumbers(followersLink, textNodes);
            
            if (textNodes.length > 0) {
                debugLog(`Found ${textNodes.length} text nodes with numbers`);
                for (const textNode of textNodes) {
                    if (/^\d+$|^\d+\.\d+[KMBkmb]?$/.test(textNode.nodeValue.trim())) {
                        debugLog(`Updating text node: ${textNode.nodeValue} -> ${formattedCount}`);
                        textNode.nodeValue = formattedCount;
                        return true;
                    }
                }
            }
        }
        
        // Method 3: Our original approach with stats elements
        const statsElements = findProfileStatsElements();
        if (statsElements && statsElements.length >= 2) {
            const followersElement = statsElements[1];
            if (followersElement) {
                const text = followersElement.textContent || '';
                const suffix = text.replace(/^[\d,.]+(K|M|B|k|m|b)?/, '');
                
                const newText = formattedCount + suffix;
                debugLog(`Updating followers count: ${text} -> ${newText}`);
                
                followersElement.textContent = newText;
                return true;
            }
        }
        
        // Method 4: Target specific CSS classes
        const specificClassElements = document.querySelectorAll('.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3');
        for (const element of specificClassElements) {
            // Check if this is near a followers link
            const parent = element.parentElement;
            const isNearFollowers = parent && 
                (parent.textContent.toLowerCase().includes('follower') || 
                 (parent.parentElement && parent.parentElement.textContent.toLowerCase().includes('follower')));
            
            if (isNearFollowers && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(element.textContent.trim())) {
                debugLog(`Updating specific class element: ${element.textContent} -> ${formattedCount}`);
                element.textContent = formattedCount;
                return true;
            }
        }
        
        console.error('Could not update followers count, element not found');
        return false;
    }
    
    // Update following count - optimized version
    function updateFollowingCount(count) {
        debugLog(`Attempting to update following count to ${count}`);
        
        const statsElements = findProfileStatsElements();
        if (statsElements && statsElements.length >= 1) {
            const followingElement = statsElements[0];
            const text = followingElement.textContent;
            const suffix = text.replace(/^[\d,.]+(K|M|B|k|m|b)?/, '');
            
            const newText = formatNumberForDisplay(count) + suffix;
            debugLog(`Updating following count: ${text} -> ${newText}`);
            
            followingElement.textContent = newText;
            return true;
        }
        
        const followingLink = document.querySelector('a[href*="/following"][role="link"]');
        if (followingLink) {
            const numberElement = Array.from(followingLink.querySelectorAll('span, div'))
                .find(el => el.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(el.textContent.trim()));
            
            if (numberElement) {
                const newText = formatNumberForDisplay(count);
                debugLog(`Updating following count directly: ${numberElement.textContent} -> ${newText}`);
                numberElement.textContent = newText;
                return true;
            }
        }
        
        console.error('Could not update following count, element not found');
        return false;
    }
    
    // Generic approach for any following link with any structure
    function tryGenericFollowingUpdate(count) {
        const formattedCount = formatNumberForDisplay(count);
        try {
            // Find all links that might be following links
            const allPossibleFollowingLinks = document.querySelectorAll('a[href*="/following"]');
            
            for (const link of allPossibleFollowingLinks) {
                // Get all elements inside the link
                const allElements = link.querySelectorAll('*');
                
                // Find elements that contain just numbers or formatted numbers
                for (const el of allElements) {
                    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                        const text = el.textContent.trim();
                        if (/^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(text)) {
                            debugLog(`Found following count using generic approach: ${text} -> ${formattedCount}`);
                            el.textContent = formattedCount;
                            return true;
                        }
                    }
                }
                
                // Try direct text nodes in the link
                const textNodes = [];
                findTextNodesWithNumbers(link, textNodes);
                
                for (const textNode of textNodes) {
                    const text = textNode.nodeValue.trim();
                    if (/^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(text)) {
                        debugLog(`Found following count in text node: ${text} -> ${formattedCount}`);
                        textNode.nodeValue = formattedCount;
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Error in generic following approach:', error);
        }
        return false;
    }
    
    // Update the updateFollowingCount function to use the generic approach
    const originalUpdateFollowingCount = updateFollowingCount;
    updateFollowingCount = function(count) {
        const result = originalUpdateFollowingCount(count);
        if (result) {
            return true;
        }
        
        // If the original function failed, try the generic approach
        return tryGenericFollowingUpdate(count);
    };
    
    // Update posts count - optimized version
    function updatePostsCount(count) {
        debugLog(`Attempting to update posts count to ${count}`);
        
        // Try the specific structure from the user's example first - newest Twitter structure
        const formattedCount = formatNumberForDisplay(count);
        
        // Look for divs with specific class combinations mentioned in the user's example
        const dirElements = document.querySelectorAll('div[dir="ltr"].css-146c3p1, div.css-146c3p1[style*="color"], div[dir="ltr"][style*="color: rgb(113, 118, 123)"]');
        
        for (const element of dirElements) {
            // Check if it contains "posts" text and a number
            if (element.textContent && element.textContent.toLowerCase().includes('post') && /\d/.test(element.textContent)) {
                // Extract the text parts
                const originalText = element.textContent;
                const newText = originalText.replace(/\d+(\.\d+)?(K|M|B|k|m|b)?/, formattedCount);
                
                debugLog(`Found posts element with newer structure: "${originalText}" -> "${newText}"`);
                element.textContent = newText;
                return true;
            }
        }
        
        // Method 1: Use the stats elements approach
        const statsElements = findProfileStatsElements();
        if (statsElements && statsElements.length >= 3) {
            const postsElement = statsElements[2];
            if (postsElement) {
                const text = postsElement.textContent || '';
                const suffix = text.replace(/^[\d,.]+(K|M|B|k|m|b)?/, '');
                
                const newText = formattedCount + suffix;
                debugLog(`Updating posts count: ${text} -> ${newText}`);
                
                postsElement.textContent = newText;
                return true;
            }
        }
        
        // Method 2: Direct selector for the posts link
        const postsLink = document.querySelector('a[href*="/posts"][role="link"]');
        if (postsLink) {
            // First try to find a number element directly
            const numberElement = Array.from(postsLink.querySelectorAll('span, div'))
                .find(el => el.textContent && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(el.textContent.trim()));
            
            if (numberElement) {
                const newText = formattedCount;
                debugLog(`Updating posts count directly: ${numberElement.textContent} -> ${newText}`);
                numberElement.textContent = newText;
                return true;
            }
            
            // Then try to find an element that contains both a number and "posts" text
            const postsElements = Array.from(postsLink.querySelectorAll('span, div'))
                .filter(el => el.textContent && el.textContent.toLowerCase().includes('post') && /\d/.test(el.textContent));
            
            if (postsElements.length > 0) {
                const postEl = postsElements[0];
                const originalText = postEl.textContent;
                const newText = originalText.replace(/\d+(\.\d+)?(K|M|B|k|m|b)?/, formattedCount);
                
                debugLog(`Updating posts element: "${originalText}" -> "${newText}"`);
                postEl.textContent = newText;
                return true;
            }
        }
        
        // Method 3: Look for "posts" text in the whole document
        const postTextElements = Array.from(document.querySelectorAll('div[dir="ltr"], span'))
            .filter(el => el.textContent && 
                    el.textContent.toLowerCase().includes('post') && 
                    /\d/.test(el.textContent) &&
                    !el.querySelector('div, span')); // Ensure it's a leaf element
        
        if (postTextElements.length > 0) {
            const postEl = postTextElements[0];
            const originalText = postEl.textContent;
            const newText = originalText.replace(/\d+(\.\d+)?(K|M|B|k|m|b)?/, formattedCount);
            
            debugLog(`Updating general posts element: "${originalText}" -> "${newText}"`);
            postEl.textContent = newText;
            return true;
        }
        
        // Method 4: Look for header area and analyze its children
        const headerArea = document.querySelector('[data-testid="UserProfileHeader_Items"]');
        if (headerArea) {
            const allTexts = Array.from(headerArea.querySelectorAll('div, span'))
                .filter(el => el.textContent && 
                       el.textContent.toLowerCase().includes('post') && 
                       /\d/.test(el.textContent) &&
                       !el.querySelector('div, span')); // Ensure it's a leaf element
            
            if (allTexts.length > 0) {
                const postEl = allTexts[0];
                const originalText = postEl.textContent;
                const newText = originalText.replace(/\d+(\.\d+)?(K|M|B|k|m|b)?/, formattedCount);
                
                debugLog(`Updating header area posts element: "${originalText}" -> "${newText}"`);
                postEl.textContent = newText;
                return true;
            }
        }
        
        console.error('Could not update posts count, element not found');
        return false;
    }
    
    // Find the display name element - optimized with caching
    function findDisplayNameElement() {
        // Check if we have cached element and the cache is not too old
        const now = Date.now();
        if (elementCache.displayNameElement && now - elementCache.lastDisplayNameCheck < MAX_CACHE_AGE) {
            return elementCache.displayNameElement;
        }
        
        // First try with data-testid attribute (most reliable)
        const userNameEl = document.querySelector('[data-testid="UserName"]');
        if (userNameEl) {
            // Find span that's not part of an SVG
            const spans = userNameEl.querySelectorAll('span');
            for (const span of spans) {
                if (span.textContent.trim() && !span.closest('svg')) {
                    debugLog('Found display name in UserName:', span.textContent);
                    elementCache.displayNameElement = span;
                    elementCache.lastDisplayNameCheck = now;
                    return span;
                }
            }
            
            // Try div elements if span fails
            const divs = userNameEl.querySelectorAll('div[dir="auto"]');
            for (const div of divs) {
                if (div.textContent.trim() && !div.closest('svg')) {
                    debugLog('Found display name in UserName div:', div.textContent);
                    elementCache.displayNameElement = div;
                    elementCache.lastDisplayNameCheck = now;
                    return div;
                }
            }
        }
        
        // If we still haven't found it, try h2 heading
        const h2Element = document.querySelector('h2[role="heading"]');
        if (h2Element) {
            const span = h2Element.querySelector('span');
            if (span && span.textContent.trim()) {
                debugLog('Found display name in heading:', span.textContent);
                elementCache.displayNameElement = span;
                elementCache.lastDisplayNameCheck = now;
                return span;
            }
        }
        
        console.error('Could not find display name element');
        return null;
    }
    
    // Update verified status
    function updateVerifiedStatus(verifiedStatus) {
        if (!isProfilePage()) {
            debugLog('Not on a profile page, skipping verified status update');
            return false;
        }
        
        debugLog('Updating verified status to:', verifiedStatus);
        
        // If no change needed, return
        if (verifiedStatus === 'none') {
            return true;
        }
        
        // Find the display name element
        const displayNameElement = findDisplayNameElement();
        if (!displayNameElement) {
            console.error('Cannot find display name element');
            return false;
        }
        
        debugLog('Found display name element:', displayNameElement);
        
        // Remove existing verification badge
        removeVerificationBadge();
        
        // If verified is set to false, we're done (badge was removed)
        if (verifiedStatus === 'false') {
            return true;
        }
        
        // Generate unique ID for gradient definitions (to avoid conflicts)
        const badgeId = `badge-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        
        // Create the badge element based on the verification type
        let badgeHTML = '';
        
        switch (verifiedStatus) {
            case 'blue':
                // Blue verified badge (Twitter Blue)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <g fill="#1d9bf0">
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                        </g>
                    </svg>
                `;
                break;
            
            case 'gold':
                // Gold verified badge (Company/Organization)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-gold-1" x1="4.17%" y1="0%" x2="44.7%" y2="100%">
                                <stop offset="0%" style="stop-color: rgb(247, 165, 0); stop-opacity: 1"></stop>
                                <stop offset="100%" style="stop-color: rgb(245, 162, 0); stop-opacity: 1"></stop>
                            </linearGradient>
                            <linearGradient id="${badgeId}-gold-2" x1="4.17%" y1="0%" x2="44.7%" y2="100%">
                                <stop offset="0%" style="stop-color: rgb(252, 240, 212); stop-opacity: 1"></stop>
                                <stop offset="100%" style="stop-color: rgb(235, 170, 59); stop-opacity: 1"></stop>
                            </linearGradient>
                        </defs>
                        <g clip-rule="evenodd" fill-rule="evenodd">
                            <path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#${badgeId}-gold-1)"></path>
                            <path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#${badgeId}-gold-2)"></path>
                            <path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"></path>
                        </g>
                    </svg>
                `;
                break;
            
            case 'gray':
                // Gray verified badge (Government/Official)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <g fill="#6e767d">
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="#829aab" fill-rule="evenodd"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'diamond':
                // Diamond verified badge (Premium diamond badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-diamond-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #00c6ff; stop-opacity: 1"/>
                                <stop offset="50%" style="stop-color: #c644fd; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #ff72ff; stop-opacity: 1"/>
                            </linearGradient>
                            <linearGradient id="${badgeId}-diamond-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #e0f7ff; stop-opacity: 1"/>
                                <stop offset="50%" style="stop-color: #ffffff; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #f0e6ff; stop-opacity: 1"/>
                            </linearGradient>
                            <linearGradient id="${badgeId}-diamond-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #ffffff; stop-opacity: 0.8"/>
                                <stop offset="100%" style="stop-color: #ffffff; stop-opacity: 0"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-diamond-1)"></path>
                            <path d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" fill="url(#${badgeId}-diamond-2)"></path>
                            <path d="M12 4.5l5.5 5.5-5.5 5.5-5.5-5.5L12 4.5z" fill="url(#${badgeId}-diamond-shine)" opacity="0.5" transform="translate(0, 2)"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'rainbow':
                // Rainbow verified badge (Colorful gradient badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #ff0000; stop-opacity: 1"/>
                                <stop offset="16.67%" style="stop-color: #ff8000; stop-opacity: 1"/>
                                <stop offset="33.33%" style="stop-color: #ffff00; stop-opacity: 1"/>
                                <stop offset="50%" style="stop-color: #00ff00; stop-opacity: 1"/>
                                <stop offset="66.67%" style="stop-color: #0080ff; stop-opacity: 1"/>
                                <stop offset="83.33%" style="stop-color: #8000ff; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #ff00ff; stop-opacity: 1"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-rainbow)"></path>
                            <path d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" fill="white"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'red':
                // Red verified badge (Exclusive red badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-red" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #ff3030; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #aa0000; stop-opacity: 1"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-red)"></path>
                            <path d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" fill="white"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'crown':
                // Crown verified badge (Royal crown badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-crown-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #ffd700; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #ffa500; stop-opacity: 1"/>
                            </linearGradient>
                            <linearGradient id="${badgeId}-crown-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #fffaf0; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #ffd700; stop-opacity: 1"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-crown-1)"></path>
                            <path d="M12 5.5l2 3.5h-4l2-3.5z M12 5.5l2.5 1.5v2.5h-5V7l2.5-1.5z M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" fill="url(#${badgeId}-crown-2)"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'star':
                // Star verified badge (Star-shaped badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-star-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #4facfe; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #00f2fe; stop-opacity: 1"/>
                            </linearGradient>
                            <linearGradient id="${badgeId}-star-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #e6f8ff; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #4facfe; stop-opacity: 1"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-star-1)"></path>
                            <path d="M12 7l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5L12 7z" fill="url(#${badgeId}-star-2)"></path>
                        </g>
                    </svg>
                `;
                break;
                
            case 'dark':
                // Dark Mode verified badge (Dark-themed badge)
                badgeHTML = `
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="19" height="19">
                        <defs>
                            <linearGradient id="${badgeId}-dark-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #2c3e50; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #000000; stop-opacity: 1"/>
                            </linearGradient>
                            <linearGradient id="${badgeId}-dark-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color: #8e9eab; stop-opacity: 1"/>
                                <stop offset="100%" style="stop-color: #eef2f3; stop-opacity: 1"/>
                            </linearGradient>
                        </defs>
                        <g>
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" fill="url(#${badgeId}-dark-1)"></path>
                            <path d="M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" fill="url(#${badgeId}-dark-2)"></path>
                        </g>
                    </svg>
                `;
                break;
            
            default:
                console.error('Unknown verified status:', verifiedStatus);
                return false;
        }
        
        // Create badge container
        const badgeContainer = document.createElement('span');
        badgeContainer.className = 'custom-prank-verified-badge';
        badgeContainer.style.display = 'inline-flex';
        badgeContainer.style.marginLeft = '2px';
        badgeContainer.style.verticalAlign = 'text-bottom';
        badgeContainer.innerHTML = badgeHTML;
        
        // Method 1: Insert after the display name if it has children
        if (displayNameElement.children.length > 0) {
            displayNameElement.insertBefore(badgeContainer, displayNameElement.children[displayNameElement.children.length - 1].nextSibling);
            debugLog('Method 1: Inserted badge after display name child element');
            return true;
        }
        
        // Method 2: Try to append to the display name if it doesn't have children
        displayNameElement.appendChild(badgeContainer);
        debugLog('Method 2: Appended badge to display name');
        return true;
    }
    
    // Remove fake verification badge
    function removeVerificationBadge() {
        // Remove our custom badges
        const fakeBadges = document.querySelectorAll('.prank-verified-badge, .prank-verified-badge-container, .prank-verified-badge-fixed');
        if (fakeBadges.length > 0) {
            debugLog(`Removing ${fakeBadges.length} fake verification badge(s)`);
            fakeBadges.forEach(badge => badge.remove());
        }
        
        // Remove any injected styles
        const badgeStyles = document.querySelectorAll('.prank-verified-badge-style');
        if (badgeStyles.length > 0) {
            debugLog(`Removing ${badgeStyles.length} injected badge style(s)`);
            badgeStyles.forEach(style => style.remove());
        }
        
        // Restore any hidden original badges
        const hiddenBadges = document.querySelectorAll('svg[data-testid="icon-verified"][style*="display: none"]');
        if (hiddenBadges.length > 0) {
            hiddenBadges.forEach(badge => badge.style.display = '');
        }
    }
    
    // Set up focused mutation observer for profile elements
    function setupFocusedMutationObserver() {
        // If we already have an observer, disconnect it
        if (window.prankMutationObserver) {
            window.prankMutationObserver.disconnect();
        }
        
        // Create a new mutation observer
        window.prankMutationObserver = new MutationObserver(function(mutations) {
            // Only process if prank is active
            if (!currentSettings.isActive) {
                return;
            }
            
            // Check if we need to reapply settings
            let needToReapply = false;
            
            // Check for DOM changes that might affect our prank
            for (const mutation of mutations) {
                // If nodes were added, check if they might be relevant
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if this is a stats element
                            const hasStatsLink = node.querySelector && (
                                node.querySelector('a[href*="/followers"]') ||
                                node.querySelector('a[href*="/following"]') ||
                                node.querySelector('a[href*="/verified_followers"]')
                            );
                            
                            // Check if this is a verification badge
                            const hasVerificationBadge = node.querySelector && 
                                node.querySelector('svg[data-testid*="icon-verified"]');
                            
                            if (hasStatsLink || hasVerificationBadge) {
                                needToReapply = true;
                                break;
                            }
                        }
                    }
                }
                
                // If attributes changed, check if they might be relevant
                if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
                    const target = mutation.target;
                    
                    // Check if this is a stats element
                    if (target.tagName === 'A' && (
                        target.href.includes('/followers') || 
                        target.href.includes('/following') ||
                        target.href.includes('/verified_followers')
                    )) {
                        needToReapply = true;
                        break;
                    }
                    
                    // Check if this is a verification badge
                    if (target.tagName === 'SVG' && target.getAttribute('data-testid') && 
                        target.getAttribute('data-testid').includes('icon-verified')) {
                        needToReapply = true;
                        break;
                    }
                }
            }
            
            // Reapply settings if needed
            if (needToReapply) {
                debugLog('DOM changes detected, reapplying prank settings');
                applyCurrentSettings();
            }
            
            // Always ensure sidebar menu items are visible
            ensureSidebarMenuItemsVisible();
        });
        
        // Start observing the document with the configured parameters
        window.prankMutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'style', 'class', 'data-testid']
        });
        
        debugLog('Focused mutation observer set up');
    }
    
    // Apply current settings without retry
    function applyCurrentSettings() {
        if (!currentSettings.isActive) return;
        
        if (currentSettings.followers !== null) {
            updateFollowersCount(currentSettings.followers);
        }
        
        if (currentSettings.following !== null) {
            updateFollowingCount(currentSettings.following);
        }
        
        if (currentSettings.posts !== null) {
            updatePostsCount(currentSettings.posts);
        }
        
        if (currentSettings.verified !== 'none') {
            updateVerifiedStatus(currentSettings.verified);
        }
        
        if (currentSettings.blurUsername !== undefined) {
            updateUsernameBlur(currentSettings.blurUsername);
        }
        
        // Prank aktifse, "Get Verified" butonunu gizle
        hideGetVerifiedButton(true);
    }
    
    // Hide the "Get Verified" button if prank is active
    function hideGetVerifiedButton(hide) {
        debugLog(`${hide ? 'Hiding' : 'Showing'} "Get Verified" button`);
        
        try {
            // Sol menüdeki linkleri tanımlamak için seçici
            const sidebarSelector = 'nav[aria-label="Primary"], nav[role="navigation"], header[role="banner"] nav';
            const sidebar = document.querySelector(sidebarSelector);
            
            // Ekran görüntüsündeki sol menü yapısını doğrudan hedefleyen seçici
            const sideMenuItems = document.querySelectorAll('a[href="/i/verified_orgs"], a[href="/i/premium"], a[href="/i/grok"]');
            
            // Sol menü öğelerini koruma
            sideMenuItems.forEach(item => {
                if (hide && item.style.display === 'none') {
                    debugLog(`Restoring sidebar specific item: ${item.textContent}`);
                    item.style.display = '';
                    item.removeAttribute('data-prank-hidden');
                }
            });
            
            // 1. Href'e göre "Get Verified" butonlarını bul
            const getVerifiedButtons = document.querySelectorAll(
                'a[href*="/premium_sign_up"], a[href*="/i/premium_sign_up"], a[href*="/premium"], a[href*="/verified"]'
            );
            
            // Bulunan tüm butonları işle
            getVerifiedButtons.forEach(button => {
                // Sol menüde olup olmadığını kontrol et
                const isInSidebar = sidebar && sidebar.contains(button);
                const isSpecificMenuItem = button.getAttribute('href') === '/i/verified_orgs' || 
                                          button.getAttribute('href') === '/i/premium' || 
                                          button.getAttribute('href') === '/i/grok';
                
                if (isInSidebar || isSpecificMenuItem) {
                    debugLog(`Skipping sidebar menu item: ${button.textContent}`);
                    
                    // Eğer gizlenmişse, göster
                    if (button.getAttribute('data-prank-hidden') === 'true') {
                        button.style.display = '';
                        button.removeAttribute('data-prank-hidden');
                    }
                    
                    return; // Sol menüdeki öğeleri atla
                }
                
                // Butonun içeriğini kontrol et
                const buttonText = button.textContent.toLowerCase();
                if (buttonText.includes('get verified') || buttonText.includes('verified') || buttonText.includes('premium')) {
                    debugLog(`Found "Get Verified" button: ${buttonText}`);
                    
                    // Butonu gizle/göster
                    if (hide) {
                        button.style.display = 'none';
                        button.setAttribute('data-prank-hidden', 'true');
                    } else if (button.getAttribute('data-prank-hidden') === 'true') {
                        button.style.display = '';
                        button.removeAttribute('data-prank-hidden');
                    }
                }
            });
            
            // 2. Doğrudan DOM yapısına göre "Get Verified" butonunu bul
            const verifiedTextElements = Array.from(document.querySelectorAll('span, div'))
                .filter(el => {
                    const text = el.textContent.toLowerCase();
                    // Sol menüde olup olmadığını kontrol et
                    const isInSidebar = sidebar && sidebar.contains(el);
                    
                    // Özel menü öğelerini kontrol et
                    const closestLink = el.closest('a[role="link"]');
                    const isSpecificMenuItem = closestLink && (
                        closestLink.getAttribute('href') === '/i/verified_orgs' || 
                        closestLink.getAttribute('href') === '/i/premium' || 
                        closestLink.getAttribute('href') === '/i/grok'
                    );
                    
                    return (text.includes('get verified') || text.includes('verified') || 
                           (text.includes('premium') && text.length < 30)) &&
                           !el.closest('.prank-verified-badge-container') &&
                           !isInSidebar && !isSpecificMenuItem; // Sol menüdeki öğeleri filtrele
                });
            
            // Bu elementlerin ana butonlarını bul ve gizle
            verifiedTextElements.forEach(el => {
                const parentButton = el.closest('a[href*="/premium"], a[href*="/verified"], a[role="link"]');
                if (parentButton) {
                    // Sol menüde olup olmadığını kontrol et
                    const isInSidebar = sidebar && sidebar.contains(parentButton);
                    const isSpecificMenuItem = parentButton.getAttribute('href') === '/i/verified_orgs' || 
                                              parentButton.getAttribute('href') === '/i/premium' || 
                                              parentButton.getAttribute('href') === '/i/grok';
                    
                    if (isInSidebar || isSpecificMenuItem) {
                        debugLog(`Skipping sidebar menu item: ${parentButton.textContent}`);
                        
                        // Eğer gizlenmişse, göster
                        if (parentButton.getAttribute('data-prank-hidden') === 'true') {
                            parentButton.style.display = '';
                            parentButton.removeAttribute('data-prank-hidden');
                        }
                        
                        return; // Sol menüdeki öğeleri atla
                    }
                    
                    debugLog(`Found "Get Verified" button via text: ${parentButton.textContent}`);
                    
                    if (hide) {
                        parentButton.style.display = 'none';
                        parentButton.setAttribute('data-prank-hidden', 'true');
                    } else if (parentButton.getAttribute('data-prank-hidden') === 'true') {
                        parentButton.style.display = '';
                        parentButton.removeAttribute('data-prank-hidden');
                    }
                }
            });
            
            // 3. SVG içeren "Get Verified" butonlarını da kontrol et
            const verifiedSVGs = document.querySelectorAll('svg[viewBox="0 0 22 22"]');
            for (const svg of verifiedSVGs) {
                // "Get Verified" butonu içinde olabilecek SVG'leri bul
                const button = svg.closest('a[role="link"], button');
                if (button && !button.closest('.prank-verified-badge-container')) {
                    // Sol menüde olup olmadığını kontrol et
                    const isInSidebar = sidebar && sidebar.contains(button);
                    const isSpecificMenuItem = button.getAttribute('href') === '/i/verified_orgs' || 
                                              button.getAttribute('href') === '/i/premium' || 
                                              button.getAttribute('href') === '/i/grok';
                    
                    if (isInSidebar || isSpecificMenuItem) {
                        debugLog(`Skipping sidebar menu item with SVG: ${button.textContent}`);
                        
                        // Eğer gizlenmişse, göster
                        if (button.getAttribute('data-prank-hidden') === 'true') {
                            button.style.display = '';
                            button.removeAttribute('data-prank-hidden');
                        }
                        
                        continue; // Sol menüdeki öğeleri atla
                    }
                    
                    const buttonText = button.textContent.toLowerCase();
                    if (buttonText.includes('verified') || buttonText.includes('premium')) {
                        debugLog(`Found "Get Verified" button with SVG: ${buttonText}`);
                        
                        if (hide) {
                            button.style.display = 'none';
                            button.setAttribute('data-prank-hidden', 'true');
                        } else if (button.getAttribute('data-prank-hidden') === 'true') {
                            button.style.display = '';
                            button.removeAttribute('data-prank-hidden');
                        }
                    }
                }
            }
            
            // 4. Kullanıcının paylaştığı HTML yapısını doğrudan hedefleme
            const verifiedContainers = document.querySelectorAll('.css-175oi2r.r-1awozwy.r-6koalj.r-18u37iz.r-bnwqim');
            for (const container of verifiedContainers) {
                // Sol menüde olup olmadığını kontrol et
                const isInSidebar = sidebar && sidebar.contains(container);
                
                // Konteyner içinde özel menü öğesi var mı kontrol et
                const hasSpecificMenuItem = container.querySelector('a[href="/i/verified_orgs"], a[href="/i/premium"], a[href="/i/grok"]');
                
                if (isInSidebar || hasSpecificMenuItem) {
                    debugLog(`Skipping sidebar container`);
                    
                    // Eğer gizlenmişse, göster
                    if (container.getAttribute('data-prank-hidden') === 'true') {
                        container.style.display = '';
                        container.removeAttribute('data-prank-hidden');
                    }
                    
                    continue; // Sol menüdeki öğeleri atla
                }
                
                const links = container.querySelectorAll('a[href*="/premium_sign_up"], a[href*="/i/premium_sign_up"]');
                for (const link of links) {
                    if (hide) {
                        link.style.display = 'none';
                        link.setAttribute('data-prank-hidden', 'true');
                    } else if (link.getAttribute('data-prank-hidden') === 'true') {
                        link.style.display = '';
                        link.removeAttribute('data-prank-hidden');
                    }
                }
            }
            
            // 5. Özel olarak sol menüdeki "Premium", "Verified Orgs" ve "Grok" gibi linkleri koruma
            const sidebarItems = sidebar ? sidebar.querySelectorAll('a[role="link"]') : [];
            for (const item of sidebarItems) {
                // Özel menü öğelerini kontrol et
                const isSpecificMenuItem = item.getAttribute('href') === '/i/verified_orgs' || 
                                          item.getAttribute('href') === '/i/premium' || 
                                          item.getAttribute('href') === '/i/grok';
                
                // Menü öğesi içeriğini kontrol et
                const itemText = item.textContent.toLowerCase();
                const isMenuKeyword = itemText.includes('premium') || 
                                     itemText.includes('verified') || 
                                     itemText.includes('grok');
                
                if (isSpecificMenuItem || isMenuKeyword) {
                    if (item.getAttribute('data-prank-hidden') === 'true' || item.style.display === 'none') {
                        debugLog(`Restoring sidebar menu item: ${item.textContent}`);
                        item.style.display = '';
                        item.removeAttribute('data-prank-hidden');
                    }
                }
            }
            
            // 6. Ekran görüntüsündeki menü yapısını doğrudan hedefle
            const menuItems = document.querySelectorAll('a[role="link"] span');
            for (const span of menuItems) {
                const text = span.textContent.trim();
                if (text === 'Premium' || text === 'Verified Orgs' || text === 'Grok') {
                    const menuItem = span.closest('a[role="link"]');
                    if (menuItem && (menuItem.getAttribute('data-prank-hidden') === 'true' || menuItem.style.display === 'none')) {
                        debugLog(`Restoring specific menu item: ${text}`);
                        menuItem.style.display = '';
                        menuItem.removeAttribute('data-prank-hidden');
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error hiding/showing "Get Verified" button:', error);
            return false;
        }
    }
    
    // Find the direct followers element using the specific CSS classes from user's example
    function findDirectFollowersElement() {
        // Look for elements with the exact CSS class combination shared by the user
        const elements = document.querySelectorAll('.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3');
        for (const element of elements) {
            // Check if it's within a followers link
            const followersLink = element.closest('a[href*="/followers"]');
            if (followersLink) {
                // Check if this element or its direct children contain just a number
                if (/^\d+$|^\d+\.\d+[KMBkmb]?$/.test(element.textContent.trim())) {
                    debugLog('Found direct followers element with exact CSS classes:', element);
                    return element;
                }
                
                // Check for nested spans
                const childSpans = element.querySelectorAll('span');
                for (const span of childSpans) {
                    if (/^\d+$|^\d+\.\d+[KMBkmb]?$/.test(span.textContent.trim())) {
                        debugLog('Found nested followers element within CSS classes:', span);
                        return span;
                    }
                }
            }
        }
        
        // Try the double-nested approach from the user's example
        const outerSpans = document.querySelectorAll('span.css-1jxf684[style*="color"]');
        for (const span of outerSpans) {
            // Check if it's in a followers link
            const followersLink = span.closest('a[href*="/followers"]');
            if (followersLink) {
                // Look for inner span
                const innerSpan = span.querySelector('span.css-1jxf684');
                if (innerSpan && /^\d+$|^\d+\.\d+[KMBkmb]?$/.test(innerSpan.textContent.trim())) {
                    debugLog('Found double-nested followers element:', innerSpan);
                    return innerSpan;
                }
            }
        }
        
        return null;
    }
    
    // Initialize Twitter Prank immediately
    // Set up observer
    setupFocusedMutationObserver();

    // Initial analysis on load
    setTimeout(analyzeTwitterStructure, 3000);

    // Check if we should apply prank on page load
    chrome.storage.local.get('prankSettings', function(data) {
        if (data.prankSettings && data.prankSettings.isActive) {
            console.log('Applying saved prank settings on page load:', data.prankSettings);
            currentSettings = data.prankSettings;
            
            // Wait for the page to fully load
            setTimeout(() => {
                clearElementCache();
                applyCurrentSettings();
            }, 2000);
        }
    });

    // Find username element - optimized with selectors
    function findUsernameElement() {
        debugLog('Finding username element');
        
        // Method 1: Try the specific class selector the user provided
        const specificClassSelector = '.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3';
        const specificElements = document.querySelectorAll(specificClassSelector);
        
        for (const element of specificElements) {
            const text = element.textContent || '';
            if (text.startsWith('@')) {
                debugLog('Found username with specific class selector:', text);
                return element;
            }
        }
        
        // Method 2: Try to find within UserName element
        const userNameElement = document.querySelector('[data-testid="UserName"]');
        if (userNameElement) {
            const spans = userNameElement.querySelectorAll('span');
            for (const span of spans) {
                const text = span.textContent || '';
                if (text.startsWith('@')) {
                    debugLog('Found username in UserName element:', text);
                    return span;
                }
            }
        }
        
        // Method 3: Look for any span with @ symbol
        const allSpans = document.querySelectorAll('span');
        for (const span of allSpans) {
            const text = span.textContent || '';
            if (text.startsWith('@') && text.length > 1) {
                debugLog('Found username with general span search:', text);
                return span;
            }
        }
        
        debugLog('Could not find username element');
        return null;
    }

    // Update username blur status
    function updateUsernameBlur(blurStatus) {
        if (!isProfilePage()) {
            debugLog('Not on a profile page, skipping username blur update');
            return false;
        }
        
        debugLog('Updating username blur to:', blurStatus);
        
        // Find the username element
        const usernameElement = findUsernameElement();
        if (!usernameElement) {
            console.error('Cannot find username element');
            return false;
        }
        
        // Remove any existing blur wrapper
        const existingWrapper = document.querySelector('.username-blur-wrapper');
        if (existingWrapper) {
            // Restore original text
            if (existingWrapper.parentNode) {
                existingWrapper.parentNode.insertBefore(usernameElement, existingWrapper);
                existingWrapper.remove();
            }
        }
        
        // Remove any existing blur style element
        const existingStyle = document.getElementById('username-blur-style');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // If blur is enabled
        if (blurStatus) {
            try {
                // Create a style element with CSS for username blur
                const styleElement = document.createElement('style');
                styleElement.id = 'username-blur-style';
                styleElement.textContent = `
                    .username-blur-wrapper {
                        position: relative;
                        display: inline-flex;
                        align-items: center;
                    }
                    
                    .username-visible-part {
                        display: inline-block;
                    }
                    
                    .username-blur-part {
                        display: inline-block;
                        filter: blur(5px);
                        transition: filter 0.3s ease;
                    }
                    
                    .username-blur-part:hover {
                        filter: blur(0);
                        transition: filter 0.2s ease;
                    }
                `;
                document.head.appendChild(styleElement);
                
                // Get the username text
                const username = usernameElement.textContent || '';
                
                if (username.startsWith('@') && username.length > 1) {
                    // Create wrapper element
                    const wrapper = document.createElement('span');
                    wrapper.className = 'username-blur-wrapper';
                    
                    // Create visible part (@ symbol)
                    const visiblePart = document.createElement('span');
                    visiblePart.className = 'username-visible-part';
                    visiblePart.textContent = '@';
                    
                    // Create blurred part (username without @)
                    const blurPart = document.createElement('span');
                    blurPart.className = 'username-blur-part';
                    blurPart.textContent = username.substring(1);
                    
                    // Add elements to wrapper
                    wrapper.appendChild(visiblePart);
                    wrapper.appendChild(blurPart);
                    
                    // Replace original element with our wrapper
                    usernameElement.parentNode.replaceChild(wrapper, usernameElement);
                    
                    debugLog('Applied enhanced blur to username with DOM replacement');
                    return true;
                } else {
                    console.error('Username does not start with @ or is too short');
                    return false;
                }
            } catch (error) {
                console.error('Error applying username blur:', error);
                return false;
            }
        } 
        
        return true;
    }

    // Helper function to load html2canvas directly from its content
    function loadHtml2CanvasDirectly() {
        return new Promise((resolve, reject) => {
            try {
                debugLog('Creating html2canvas directly in memory');
                
                // Instead of trying to inject script content, define the function directly in current context
                window.html2canvas = function(element, options) {
                    return new Promise(function(resolve, reject) {
                        try {
                            // Create canvas element
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            
                            // Set dimensions
                            const rect = element.getBoundingClientRect();
                            const scale = options && options.scale ? options.scale : 1;
                            canvas.width = rect.width * scale;
                            canvas.height = rect.height * scale;
                            
                            // Use a simpler approach that works in most cases
                            // Create a quick feedback for user that screenshot was taken
                            context.fillStyle = '#f8f8f8';
                            context.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // Draw a text explaining the issue
                            context.font = '14px Arial';
                            context.fillStyle = '#333';
                            context.textAlign = 'center';
                            context.fillText('Screenshot capture limitli çalışıyor.', canvas.width / 2, 40);
                            context.fillText('Alternatif olarak tarayıcı ekran görüntüsü kullanabilirsiniz.', canvas.width / 2, 60);
                            
                            // Draw a box to simulate the captured area
                            context.strokeStyle = '#2196F3';
                            context.lineWidth = 3;
                            context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
                            
                            // Add Twitter logo-like symbol
                            context.fillStyle = '#1DA1F2';
                            context.font = 'bold 40px Arial';
                            context.fillText('X', canvas.width / 2, canvas.height / 2);
                            
                            resolve(canvas);
                        } catch (e) {
                            reject(e);
                        }
                    });
                };
                
                // Check if we successfully defined the function
                if (typeof window.html2canvas === 'function') {
                    debugLog('Successfully created html2canvas function in memory');
                    resolve();
                } else {
                    throw new Error('Failed to create html2canvas function');
                }
            } catch (error) {
                debugLog('Error creating html2canvas in memory:', error);
                reject(error);
            }
        });
    }

    // Generic approach for any followers link with any structure
    function tryGenericFollowersUpdate(count) {
        const formattedCount = formatNumberForDisplay(count);
        try {
            // Find all links that might be followers links
            const allPossibleFollowersLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/verified_followers"]');
            
            for (const link of allPossibleFollowersLinks) {
                // Get all elements inside the link
                const allElements = link.querySelectorAll('*');
                
                // Find elements that contain just numbers or formatted numbers
                for (const el of allElements) {
                    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                        const text = el.textContent.trim();
                        if (/^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(text)) {
                            debugLog(`Found followers count using generic approach: ${text} -> ${formattedCount}`);
                            el.textContent = formattedCount;
                            return true;
                        }
                    }
                }
                
                // Try direct text nodes in the link
                const textNodes = [];
                findTextNodesWithNumbers(link, textNodes);
                
                for (const textNode of textNodes) {
                    const text = textNode.nodeValue.trim();
                    if (/^[\d,]+$|^[\d,.]+[KMBkmb]?$/.test(text)) {
                        debugLog(`Found followers count in text node: ${text} -> ${formattedCount}`);
                        textNode.nodeValue = formattedCount;
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Error in generic followers approach:', error);
        }
        return false;
    }

    // Update the updateFollowersCount function to use the generic approach
    const originalUpdateFollowersCount = updateFollowersCount;
    updateFollowersCount = function(count) {
        const result = originalUpdateFollowersCount(count);
        if (result) {
            return true;
        }
        
        // If the original function failed, try the generic approach
        return tryGenericFollowersUpdate(count);
    };
})(); 