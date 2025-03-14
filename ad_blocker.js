// Twitter Ad Blocker - Simplified Version
// This script blocks ads on Twitter/X platform

(function() {
    // Basic variables
    let isEnabled = true;
    let showPanel = false; // Panel visibility control
    let removeAdsCompletely = true; // Reklamları tamamen kaldır
    let chillModeEnabled = false; // Kedi fotoğrafları göster
    const storageKey = 'twitter_ad_blocker_enabled';
    const panelVisibilityKey = 'twitter_ad_blocker_panel_visible';
    let panelElement = null; // Reference to the panel element
    
    // Kedi fotoğrafları koleksiyonu
    const catImages = [
        'https://i.pinimg.com/236x/7e/0a/34/7e0a34a030e0cb470599701d7a5c618e.jpg', // Turuncu kedi
        'https://i.pinimg.com/236x/c8/bf/25/c8bf2504099200fa89c8329ca504c7c1.jpg', // Uyuyan kedi
        'https://i.pinimg.com/236x/b5/dd/84/b5dd842f7a77d3797a611277136f074b.jpg', // Gri kedi
        'https://i.pinimg.com/236x/03/67/f8/0367f83d36aa973ea4c0ac564a529b73.jpg', // Yavru kedi
        'https://i.pinimg.com/236x/be/44/40/be444014a81a6838a95853d6aadc7f7f.jpg' // Siyah beyaz kedi
    ];
    
    // Statistics
    let stats = {
        blockedAds: 0,
        lastBlockedTime: null
    };
    
    // Debug mode for troubleshooting
    const debugMode = true;
    
    // Log function that only works in debug mode
    function log(...args) {
        if (debugMode) {
            console.log("[Ad Blocker]", ...args);
        }
    }
    
    log("Ad Blocker script loaded");
    
    // Add styles
    function addStyles() {
        // Check if styles already added
        if (document.getElementById('twitter-ad-blocker-styles')) {
            return;
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'twitter-ad-blocker-styles';
        styleElement.textContent = `
            /* Control panel */
            #twitter-ad-blocker-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #1DA1F2;
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-size: 16px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                font-family: Arial, sans-serif;
                display: none; /* Hidden by default */
            }
            
            #twitter-ad-blocker-toggle {
                margin-left: 10px;
                cursor: pointer;
                background-color: white;
                color: #1DA1F2;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                font-weight: bold;
            }
            
            #twitter-ad-blocker-counter {
                margin-left: 10px;
                background-color: white;
                color: #1DA1F2;
                padding: 5px 10px;
                border-radius: 5px;
                font-weight: bold;
            }
            
            /* Blocked ads */
            .twitter-ad-blocked {
                position: relative !important;
                min-height: 100px !important;
                background-color: #f8f8f8 !important;
                border: 1px solid #ddd !important;
                border-radius: 10px !important;
                margin: 10px 0 !important;
                padding: 10px !important;
                overflow: hidden !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .twitter-ad-blocked:not(.chill-mode) * {
                display: none !important;
            }
            
            .twitter-ad-blocked:not(.chill-mode)::after {
                content: "THIS AD HAS BEEN BLOCKED";
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                font-family: Arial, sans-serif !important;
                font-size: 18px !important;
                font-weight: bold !important;
                color: #e02f2f !important;
                text-align: center !important;
                width: 100% !important;
                display: block !important;
            }
            
            /* Chill mode styles */
            .twitter-ad-blocked.chill-mode {
                display: block !important;
                background-color: transparent !important;
                border: none !important;
                width: 100% !important;
                box-sizing: border-box !important;
                padding: 0 !important;
                margin: 10px 0 !important;
            }
            
            .twitter-ad-blocked.chill-mode * {
                display: initial !important;
            }
            
            .twitter-ad-blocked.chill-mode img {
                display: block !important;
                max-width: 100% !important;
                height: auto !important;
                margin-bottom: 10px !important;
            }
            
            .twitter-ad-blocked.chill-mode .cat-image-container {
                display: block !important;
                width: 100% !important;
                padding: 12px !important;
                text-align: center !important;
                border-radius: 12px !important;
                margin: 10px 0 !important;
                overflow: hidden !important;
                background-color: #f8f8f8 !important;
                border: 1px solid #e1e8ed !important;
                box-sizing: border-box !important;
            }
            
            .twitter-ad-blocked.chill-mode p {
                color: #657786 !important;
                font-family: Arial, sans-serif !important;
                margin: 10px 0 0 0 !important;
                padding: 0 !important;
                font-size: 14px !important;
                font-weight: bold !important;
                text-align: center !important;
                display: block !important;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .twitter-ad-blocked {
                    background-color: #192734 !important;
                    border-color: #38444d !important;
                }
                
                .twitter-ad-blocked:not(.chill-mode)::after {
                    color: #f8f8f8 !important;
                }
                
                .twitter-ad-blocked.chill-mode .cat-image-container {
                    background-color: #192734 !important;
                    border-color: #38444d !important;
                }
                
                .twitter-ad-blocked.chill-mode p {
                    color: #8899a6 !important;
                }
            }
        `;
        document.head.appendChild(styleElement);
        log("Styles added");
    }
    
    // Load settings
    function loadSettings() {
        log("Loading settings");
        
        // First check localStorage
        const savedSetting = localStorage.getItem(storageKey);
        if (savedSetting !== null) {
            isEnabled = savedSetting === 'true';
            log("Loaded ad blocker enabled setting from localStorage:", isEnabled);
        }
        
        const savedPanelSetting = localStorage.getItem(panelVisibilityKey);
        if (savedPanelSetting !== null) {
            showPanel = savedPanelSetting === 'true';
            log("Loaded panel visibility from localStorage:", showPanel);
        }
        
        // Then check Chrome storage (overrides localStorage)
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                chrome.storage.local.get([
                    'adBlockerEnabled', 
                    'adBlockerPanelEnabled', 
                    'removeAdsCompletely', 
                    'chillModeEnabled', 
                    'blockedAdsCount', 
                    'lastBlockedTime'
                ], function(data) {
                    log("Loaded settings from Chrome storage:", data);
                    
                    // Update ad blocker enabled setting if available
                    if (data.adBlockerEnabled !== undefined) {
                        isEnabled = data.adBlockerEnabled;
                        localStorage.setItem(storageKey, isEnabled.toString());
                        log("Loaded ad blocker enabled setting from Chrome storage:", isEnabled);
                    }
                    
                    // Update panel visibility setting if available
                    if (data.adBlockerPanelEnabled !== undefined) {
                        showPanel = data.adBlockerPanelEnabled;
                        localStorage.setItem(panelVisibilityKey, showPanel.toString());
                        log("Loaded panel visibility from Chrome storage:", showPanel);
                        
                        // Update panel visibility immediately
                        updatePanelVisibility();
                    }
                    
                    // Update remove ads completely setting if available
                    if (data.removeAdsCompletely !== undefined) {
                        removeAdsCompletely = data.removeAdsCompletely;
                        log("Loaded remove ads completely setting from Chrome storage:", removeAdsCompletely);
                    }
                    
                    // Update chill mode setting if available
                    if (data.chillModeEnabled !== undefined) {
                        chillModeEnabled = data.chillModeEnabled;
                        log("Loaded chill mode setting from Chrome storage:", chillModeEnabled);
                    }
                    
                    // Update stats if available
                    if (data.blockedAdsCount !== undefined) {
                        stats.blockedAds = data.blockedAdsCount;
                        log("Loaded blocked ads count from Chrome storage:", stats.blockedAds);
                    }
                    
                    if (data.lastBlockedTime) {
                        stats.lastBlockedTime = data.lastBlockedTime;
                        log("Loaded last blocked time from Chrome storage:", stats.lastBlockedTime);
                    }
                    
                    updateCounter();
                    
                    // Ayarlar yüklendikten sonra reklamları hemen engelle
                    if (isEnabled) {
                        findAndBlockAds();
                    }
                });
            } catch (error) {
                log("Error loading from Chrome storage:", error);
            }
        }
    }
    
    // Save settings to storage
    function saveSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                chrome.storage.local.set({
                    adBlockerEnabled: isEnabled,
                    adBlockerPanelEnabled: showPanel,
                    removeAdsCompletely: removeAdsCompletely,
                    chillModeEnabled: chillModeEnabled
                }, function() {
                    log("Settings saved to Chrome storage");
                });
            } catch (error) {
                log("Error saving settings to Chrome storage:", error);
            }
        }
    }
    
    // Update panel visibility
    function updatePanelVisibility() {
        log("Updating panel visibility. Should be visible:", showPanel);
        
        // If panel should be visible
        if (showPanel) {
            // Create panel if it doesn't exist
            if (!panelElement) {
                createPanel();
            } else {
                // Make sure it's in the DOM
                if (!document.body.contains(panelElement)) {
                    document.body.appendChild(panelElement);
                    log("Re-added panel to DOM");
                }
                
                // Make panel visible
                panelElement.style.display = 'block';
                log("Panel is now visible");
            }
        } 
        // If panel should be hidden
        else {
            // If panel exists, remove it from DOM
            if (panelElement) {
                if (document.body.contains(panelElement)) {
                    document.body.removeChild(panelElement);
                    log("Panel removed from DOM");
                }
            }
            
            // Also remove any other panels that might exist
            const existingPanels = document.querySelectorAll('#twitter-ad-blocker-panel');
            existingPanels.forEach(panel => {
                if (panel !== panelElement && document.body.contains(panel)) {
                    document.body.removeChild(panel);
                    log("Removed additional panel from DOM");
                }
            });
        }
    }
    
    // Save stats to storage
    function saveStats() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                chrome.storage.local.set({
                    blockedAdsCount: stats.blockedAds,
                    lastBlockedTime: stats.lastBlockedTime
                }, function() {
                    log("Stats saved to Chrome storage");
                });
            } catch (error) {
                log("Error saving stats to Chrome storage:", error);
            }
        }
    }
    
    // Create control panel
    function createPanel() {
        // Don't create panel if it should be hidden
        if (!showPanel) {
            log("Panel creation skipped because showPanel is false");
            return;
        }
        
        // If panel already exists, don't create it again
        if (panelElement) {
            log("Panel already exists, not creating again");
            return;
        }
        
        log("Creating panel");
        const panel = document.createElement('div');
        panel.id = 'twitter-ad-blocker-panel';
        panel.innerHTML = `
            <span>Ad Blocker:</span>
            <button id="twitter-ad-blocker-toggle">${isEnabled ? 'ON' : 'OFF'}</button>
            <span id="twitter-ad-blocker-counter">${stats.blockedAds}</span>
        `;
        
        // Store reference to panel
        panelElement = panel;
        
        // Add to DOM if panel should be visible
        if (showPanel) {
            document.body.appendChild(panel);
            log("Panel created and added to DOM");
            
            // Toggle button event listener
            const toggleButton = document.getElementById('twitter-ad-blocker-toggle');
            if (toggleButton) {
                toggleButton.addEventListener('click', function() {
                    isEnabled = !isEnabled;
                    this.textContent = isEnabled ? 'ON' : 'OFF';
                    saveSettings();
                    log("Toggle button clicked, new state:", isEnabled);
                    
                    if (isEnabled) {
                        findAndBlockAds();
                    } else {
                        // Restore blocked ads
                        document.querySelectorAll('.twitter-ad-blocked').forEach(ad => {
                            ad.classList.remove('twitter-ad-blocked');
                            ad.classList.remove('chill-mode');
                            ad.removeAttribute('data-ad-processed');
                            ad.removeAttribute('data-ad-mode');
                            ad.style.display = ''; // Reset display style
                        });
                        log("Unblocked all ads");
                    }
                });
            }
        } else {
            log("Panel created but not added to DOM because showPanel is false");
        }
    }
    
    // Update counter
    function updateCounter() {
        if (panelElement) {
            const counter = panelElement.querySelector('#twitter-ad-blocker-counter');
            if (counter) {
                counter.textContent = stats.blockedAds.toString();
                log("Counter updated to:", stats.blockedAds);
            }
        }
    }
    
    // Find and block ads
    function findAndBlockAds() {
        if (!isEnabled) {
            return;
        }
        
        log("Searching for ads...");
        
        // Find all tweets
        const tweets = document.querySelectorAll('article');
        log(`Found ${tweets.length} potential tweets/articles to check`);
        
        let newBlockedCount = 0;
        
        // Check each tweet
        tweets.forEach(tweet => {
            // Skip if already blocked
            if (tweet.classList.contains('twitter-ad-blocked')) {
                // Eğer ayarlar değiştiyse, zaten engellenmiş reklamları güncelle
                if (tweet.getAttribute('data-ad-processed') === 'true') {
                    const currentMode = tweet.getAttribute('data-ad-mode');
                    
                    if (removeAdsCompletely && currentMode !== 'removed') {
                        // Reklamı tamamen kaldır
                        tweet.style.display = 'none';
                        tweet.setAttribute('data-ad-mode', 'removed');
                        log("Updated already blocked ad to completely remove it");
                    } else if (chillModeEnabled && currentMode !== 'chill') {
                        // Kedi fotoğrafı göster
                        replaceWithCatImage(tweet);
                        tweet.setAttribute('data-ad-mode', 'chill');
                        log("Updated already blocked ad to show cat image");
                    } else if (!removeAdsCompletely && !chillModeEnabled && currentMode !== 'blocked') {
                        // Eski davranış: "THIS AD HAS BEEN BLOCKED" mesajı göster
                        tweet.innerHTML = '<div style="padding: 20px; text-align: center; color: #657786; font-family: Arial, sans-serif; border: 1px solid #e1e8ed; border-radius: 15px; margin: 10px 0;">THIS AD HAS BEEN BLOCKED</div>';
                        tweet.setAttribute('data-ad-mode', 'blocked');
                        log("Updated already blocked ad to show blocked message");
                    }
                }
                return;
            }
            
            // Check if it's an ad
            if (isAdTweet(tweet)) {
                tweet.classList.add('twitter-ad-blocked');
                tweet.setAttribute('data-ad-processed', 'true');
                newBlockedCount++;
                stats.blockedAds++;
                stats.lastBlockedTime = new Date().toISOString();
                
                log(`Processing ad with settings: removeAdsCompletely=${removeAdsCompletely}, chillModeEnabled=${chillModeEnabled}`);
                
                if (removeAdsCompletely) {
                    // Reklamı tamamen kaldır
                    tweet.style.display = 'none';
                    tweet.setAttribute('data-ad-mode', 'removed');
                    log("Ad completely removed:", tweet);
                } else if (chillModeEnabled) {
                    // Kedi fotoğrafı göster
                    replaceWithCatImage(tweet);
                    tweet.setAttribute('data-ad-mode', 'chill');
                    log("Ad replaced with cat image:", tweet);
                } else {
                    // Eski davranış: "THIS AD HAS BEEN BLOCKED" mesajı göster
                    tweet.innerHTML = '<div style="padding: 20px; text-align: center; color: #657786; font-family: Arial, sans-serif; border: 1px solid #e1e8ed; border-radius: 15px; margin: 10px 0;">THIS AD HAS BEEN BLOCKED</div>';
                    tweet.setAttribute('data-ad-mode', 'blocked');
                    log("Ad blocked with message:", tweet);
                }
            }
        });
        
        // Ayrıca timeline dışındaki reklamları da kontrol et
        const promotedElements = document.querySelectorAll('[data-testid="promoted-badge"], [data-promoted="true"], [data-ad="true"]');
        log(`Found ${promotedElements.length} elements with promoted badges`);
        
        promotedElements.forEach(element => {
            // En yakın article veya div elementini bul
            let adContainer = element.closest('article');
            if (!adContainer) {
                adContainer = element.closest('div[data-testid="cellInnerDiv"]');
            }
            if (!adContainer) {
                adContainer = element.closest('div[role="article"]');
            }
            
            if (adContainer && !adContainer.classList.contains('twitter-ad-blocked')) {
                adContainer.classList.add('twitter-ad-blocked');
                adContainer.setAttribute('data-ad-processed', 'true');
                newBlockedCount++;
                stats.blockedAds++;
                stats.lastBlockedTime = new Date().toISOString();
                
                log(`Processing promoted element with settings: removeAdsCompletely=${removeAdsCompletely}, chillModeEnabled=${chillModeEnabled}`);
                
                if (removeAdsCompletely) {
                    // Reklamı tamamen kaldır
                    adContainer.style.display = 'none';
                    adContainer.setAttribute('data-ad-mode', 'removed');
                    log("Promoted element completely removed:", adContainer);
                } else if (chillModeEnabled) {
                    // Kedi fotoğrafı göster
                    replaceWithCatImage(adContainer);
                    adContainer.setAttribute('data-ad-mode', 'chill');
                    log("Promoted element replaced with cat image:", adContainer);
                } else {
                    // Eski davranış: "THIS AD HAS BEEN BLOCKED" mesajı göster
                    adContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #657786; font-family: Arial, sans-serif; border: 1px solid #e1e8ed; border-radius: 15px; margin: 10px 0;">THIS AD HAS BEEN BLOCKED</div>';
                    adContainer.setAttribute('data-ad-mode', 'blocked');
                    log("Promoted element blocked with message:", adContainer);
                }
            } else if (adContainer && adContainer.classList.contains('twitter-ad-blocked')) {
                // Eğer ayarlar değiştiyse, zaten engellenmiş reklamları güncelle
                if (adContainer.getAttribute('data-ad-processed') === 'true') {
                    const currentMode = adContainer.getAttribute('data-ad-mode');
                    
                    if (removeAdsCompletely && currentMode !== 'removed') {
                        // Reklamı tamamen kaldır
                        adContainer.style.display = 'none';
                        adContainer.setAttribute('data-ad-mode', 'removed');
                        log("Updated already blocked promoted element to completely remove it");
                    } else if (chillModeEnabled && currentMode !== 'chill') {
                        // Kedi fotoğrafı göster
                        replaceWithCatImage(adContainer);
                        adContainer.setAttribute('data-ad-mode', 'chill');
                        log("Updated already blocked promoted element to show cat image");
                    } else if (!removeAdsCompletely && !chillModeEnabled && currentMode !== 'blocked') {
                        // Eski davranış: "THIS AD HAS BEEN BLOCKED" mesajı göster
                        adContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #657786; font-family: Arial, sans-serif; border: 1px solid #e1e8ed; border-radius: 15px; margin: 10px 0;">THIS AD HAS BEEN BLOCKED</div>';
                        adContainer.setAttribute('data-ad-mode', 'blocked');
                        log("Updated already blocked promoted element to show blocked message");
                    }
                }
            }
        });
        
        if (newBlockedCount > 0) {
            log(`${newBlockedCount} new ads blocked, total:`, stats.blockedAds);
            updateCounter();
            saveStats();
        } else {
            log("No new ads found in this scan");
        }
    }
    
    // Reklamı kedi fotoğrafı ile değiştir
    function replaceWithCatImage(tweet) {
        try {
            log("Replacing ad with cat image");
            
            // Rastgele bir kedi fotoğrafı seç
            const randomIndex = Math.floor(Math.random() * catImages.length);
            const catImageUrl = catImages[randomIndex];
            log("Selected cat image URL:", catImageUrl);
            
            // Tweet içeriğini temizle
            tweet.innerHTML = '';
            
            // Kedi fotoğrafı içeren bir div oluştur
            const catContainer = document.createElement('div');
            catContainer.className = 'cat-image-container';
            catContainer.style.position = 'relative';
            catContainer.style.width = '100%';
            catContainer.style.height = 'auto';
            catContainer.style.overflow = 'hidden';
            catContainer.style.borderRadius = '16px';
            catContainer.style.margin = '8px 0';
            
            // Kedi fotoğrafı
            const img = document.createElement('img');
            img.src = catImageUrl;
            img.alt = 'Sevimli kedi';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '16px';
            
            // Yükleme hatası durumunda alternatif görüntü
            img.onerror = function() {
                log("Error loading cat image, using fallback");
                // Pinterest'ten yedek bir kedi fotoğrafı
                this.src = 'https://i.pinimg.com/564x/9c/6f/9c/9c6f9c87eac77a62af514085e53e3a5e.jpg';
                this.onerror = function() {
                    // İkinci bir yedek olarak başka bir kaynak
                    this.src = 'https://placekitten.com/600/400';
                    this.onerror = null; // Sonsuz döngüyü önle
                };
            };
            
            // Mesaj overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.bottom = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.padding = '8px 12px';
            overlay.style.background = 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)';
            overlay.style.borderBottomLeftRadius = '16px';
            overlay.style.borderBottomRightRadius = '16px';
            
            // Mesaj
            const message = document.createElement('p');
            message.textContent = 'Reklam yerine sevimli bir kedi 🐱';
            message.style.color = '#ffffff';
            message.style.fontFamily = 'Arial, sans-serif';
            message.style.margin = '0';
            message.style.padding = '0';
            message.style.fontSize = '14px';
            message.style.fontWeight = 'bold';
            message.style.textAlign = 'left';
            message.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            
            // Elementleri birleştir
            overlay.appendChild(message);
            catContainer.appendChild(img);
            catContainer.appendChild(overlay);
            tweet.appendChild(catContainer);
            
            // Stil düzeltmeleri
            tweet.style.minHeight = 'auto';
            tweet.style.backgroundColor = 'transparent';
            tweet.style.border = 'none';
            tweet.style.display = 'block';
            tweet.style.width = '100%';
            tweet.style.boxSizing = 'border-box';
            tweet.style.padding = '0';
            tweet.style.margin = '8px 0';
            
            // Chill mode sınıfını ekle
            tweet.classList.add('chill-mode');
            
            // Tüm display:none stillerini kaldır
            if (!document.getElementById('chill-mode-styles')) {
                const style = document.createElement('style');
                style.id = 'chill-mode-styles';
                style.textContent = `
                    .twitter-ad-blocked.chill-mode * {
                        display: initial !important;
                    }
                    .twitter-ad-blocked.chill-mode {
                        display: block !important;
                        background-color: transparent !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 8px 0 !important;
                    }
                    .twitter-ad-blocked.chill-mode img {
                        display: block !important;
                        max-width: 100% !important;
                        border-radius: 16px !important;
                    }
                    .twitter-ad-blocked.chill-mode .cat-image-container {
                        display: block !important;
                        width: 100% !important;
                        position: relative !important;
                        overflow: hidden !important;
                        border-radius: 16px !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Görüntünün yüklendiğinden emin olmak için
            img.onload = function() {
                log("Cat image loaded successfully");
                // Görüntü yüklendikten sonra tweet'in görünürlüğünü güncelle
                tweet.style.display = 'block';
            };
            
            log("Cat image replacement complete");
        } catch (error) {
            log("Error replacing ad with cat image:", error);
            // Hata durumunda basit bir mesaj göster
            try {
                tweet.innerHTML = '<div style="padding: 20px; text-align: center; color: #657786; font-family: Arial, sans-serif; border-radius: 16px; margin: 8px 0; background-color: #f8f9fa;">Kedi fotoğrafı yüklenemedi 😿</div>';
                tweet.classList.add('chill-mode');
            } catch (innerError) {
                log("Critical error in error handler:", innerError);
            }
        }
    }
    
    // Check if a tweet is an ad
    function isAdTweet(tweet) {
        // Debug için tweet içeriğini logla
        log("Checking tweet for ad content:", tweet.textContent.substring(0, 100) + "...");
        
        // Look for "Ad" label
        const spans = tweet.querySelectorAll('span');
        for (const span of spans) {
            const text = span.textContent.trim();
            if (text === 'Ad' || text === 'Reklam' || text === 'Sponsored') {
                log("Found ad label:", text);
                return true;
            }
        }
        
        // Look for "Promoted" label
        for (const span of spans) {
            const text = span.textContent.trim();
            if (text === 'Promoted' || text === 'Tanıtılan' || text === 'Öne Çıkarılan') {
                log("Found promoted label:", text);
                return true;
            }
        }
        
        // Look for divs containing ad labels
        const adDivs = tweet.querySelectorAll('div[dir="ltr"]');
        for (const div of adDivs) {
            const divSpans = div.querySelectorAll('span');
            for (const span of divSpans) {
                const text = span.textContent.trim();
                if (text === 'Ad' || text === 'Reklam' || text === 'Promoted' || text === 'Tanıtılan' || text === 'Sponsored' || text === 'Öne Çıkarılan') {
                    log("Found ad label in div[dir='ltr']:", text);
                    return true;
                }
            }
        }
        
        // Twitter'ın yeni reklam etiketleri için daha geniş arama
        const allElements = tweet.querySelectorAll('*');
        for (const element of allElements) {
            if (element.textContent) {
                const text = element.textContent.trim();
                if (text === 'Ad' || text === 'Reklam' || text === 'Promoted' || text === 'Tanıtılan' || text === 'Sponsored' || text === 'Öne Çıkarılan') {
                    log("Found ad label in element:", text);
                    return true;
                }
            }
        }
        
        // Reklam içeriğine özgü data attribute'ları kontrol et
        if (tweet.getAttribute('data-testid') === 'promoted-tweet' || 
            tweet.getAttribute('data-promoted') === 'true' || 
            tweet.getAttribute('data-ad') === 'true') {
            log("Found ad via data attribute");
            return true;
        }
        
        // Reklam içeriğine özgü class'ları kontrol et
        const tweetClasses = tweet.className;
        if (tweetClasses.includes('promoted') || tweetClasses.includes('ad')) {
            log("Found ad via class name");
            return true;
        }
        
        return false;
    }
    
    // Watch for page changes
    function observePageChanges() {
        const observer = new MutationObserver(() => {
            findAndBlockAds();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        log("Observing page changes for ads");
    }
    
    // Setup message listener for communication with popup
    function setupMessageListener() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
                log("Received message:", message);
                
                if (message.action === 'toggleAdBlocker') {
                    isEnabled = message.enabled;
                    localStorage.setItem(storageKey, isEnabled.toString());
                    log("Ad blocker toggled to:", isEnabled);
                    
                    // If enabled, immediately find and block ads
                    if (isEnabled) {
                        findAndBlockAds();
                    } else {
                        // Restore blocked ads
                        document.querySelectorAll('.twitter-ad-blocked').forEach(ad => {
                            ad.classList.remove('twitter-ad-blocked');
                            ad.classList.remove('chill-mode');
                            ad.removeAttribute('data-ad-processed');
                            ad.removeAttribute('data-ad-mode');
                            ad.style.display = ''; // Reset display style
                        });
                        log("Unblocked all ads");
                    }
                    
                    sendResponse({ success: true });
                    return true;
                }
                
                if (message.action === 'toggleAdBlockerPanel') {
                    showPanel = message.visible;
                    localStorage.setItem(panelVisibilityKey, showPanel.toString());
                    log("Panel visibility toggled to:", showPanel);
                    
                    updatePanelVisibility();
                    
                    sendResponse({ success: true });
                    return true;
                }
                
                if (message.action === 'updateAdBlockerSettings') {
                    // Tüm ayarları güncelle
                    if (message.settings) {
                        log("Received new settings:", message.settings);
                        
                        const oldEnabled = isEnabled;
                        const oldRemoveAdsCompletely = removeAdsCompletely;
                        const oldChillModeEnabled = chillModeEnabled;
                        
                        if (message.settings.adBlockerEnabled !== undefined) {
                            isEnabled = message.settings.adBlockerEnabled;
                        }
                        
                        if (message.settings.adBlockerPanelEnabled !== undefined) {
                            showPanel = message.settings.adBlockerPanelEnabled;
                            updatePanelVisibility();
                        }
                        
                        if (message.settings.removeAdsCompletely !== undefined) {
                            removeAdsCompletely = message.settings.removeAdsCompletely;
                        }
                        
                        if (message.settings.chillModeEnabled !== undefined) {
                            chillModeEnabled = message.settings.chillModeEnabled;
                        }
                        
                        log("Settings updated to:", {
                            isEnabled,
                            showPanel,
                            removeAdsCompletely,
                            chillModeEnabled
                        });
                        
                        // Ayarları kaydet
                        localStorage.setItem(storageKey, isEnabled.toString());
                        localStorage.setItem(panelVisibilityKey, showPanel.toString());
                        saveSettings();
                        
                        // Ayarlar değiştiyse reklamları güncelle
                        if (isEnabled) {
                            if (!oldEnabled || 
                                oldRemoveAdsCompletely !== removeAdsCompletely || 
                                oldChillModeEnabled !== chillModeEnabled) {
                                log("Settings changed, updating ads");
                                
                                // Hemen reklamları güncelle
                                findAndBlockAds();
                            }
                        } else if (!isEnabled && oldEnabled) {
                            // Ad blocker kapatıldıysa, tüm engellenen reklamları göster
                            document.querySelectorAll('.twitter-ad-blocked').forEach(ad => {
                                ad.classList.remove('twitter-ad-blocked');
                                ad.classList.remove('chill-mode');
                                ad.removeAttribute('data-ad-processed');
                                ad.removeAttribute('data-ad-mode');
                                ad.style.display = ''; // Reset display style
                            });
                            log("Ad blocker disabled, unblocked all ads");
                        }
                        
                        sendResponse({ 
                            success: true,
                            settings: {
                                isEnabled,
                                showPanel,
                                removeAdsCompletely,
                                chillModeEnabled
                            }
                        });
                        return true;
                    }
                }
                
                if (message.action === 'getAdBlockerStats') {
                    sendResponse({ 
                        stats: stats,
                        settings: {
                            isEnabled,
                            showPanel,
                            removeAdsCompletely,
                            chillModeEnabled
                        }
                    });
                    return true;
                }
                
                if (message.action === 'forceRefreshAds') {
                    log("Force refreshing ads");
                    
                    // Tüm engellenen reklamları temizle
                    document.querySelectorAll('.twitter-ad-blocked').forEach(ad => {
                        ad.classList.remove('twitter-ad-blocked');
                        ad.classList.remove('chill-mode');
                        ad.removeAttribute('data-ad-processed');
                        ad.removeAttribute('data-ad-mode');
                        ad.style.display = ''; // Reset display style
                    });
                    
                    // Reklamları yeniden engelle
                    if (isEnabled) {
                        findAndBlockAds();
                    }
                    
                    sendResponse({ success: true });
                    return true;
                }
                
                return false;
            });
        }
    }
    
    // Remove any existing panels
    function removeExistingPanels() {
        // Remove our tracked panel element
        if (panelElement && document.body.contains(panelElement)) {
            document.body.removeChild(panelElement);
            log("Removed tracked panel from DOM");
        }
        
        // Also remove any other panels that might exist
        const existingPanels = document.querySelectorAll('#twitter-ad-blocker-panel');
        existingPanels.forEach(panel => {
            if (panel !== panelElement && document.body.contains(panel)) {
                document.body.removeChild(panel);
                log("Removed additional panel from DOM");
            }
        });
    }
    
    // Initialization function
    function init() {
        log("Initializing ad blocker");
        
        // Remove any existing panels first
        removeExistingPanels();
        
        // Load settings
        loadSettings();
        
        // Add styles
        addStyles();
        
        // Create panel only if it should be visible
        if (showPanel) {
            createPanel();
        } else {
            log("Panel creation skipped during initialization because showPanel is false");
        }
        
        // Find and block ads
        findAndBlockAds();
        
        // Watch for page changes
        observePageChanges();
        
        // Setup message listener
        setupMessageListener();
        
        // Periodically check for ads (daha sık aralıklarla)
        setInterval(findAndBlockAds, 1000); // 1 saniyede bir kontrol et
        
        // Periodically check panel visibility
        setInterval(() => {
            // If panel should be visible but isn't in the DOM
            if (showPanel && (!panelElement || !document.body.contains(panelElement))) {
                log("Panel should be visible but isn't in the DOM, recreating");
                createPanel();
            }
            // If panel should be hidden but is in the DOM
            else if (!showPanel && panelElement && document.body.contains(panelElement)) {
                log("Panel should be hidden but is in the DOM, removing");
                document.body.removeChild(panelElement);
            }
            
            // Also check for any other panels
            const existingPanels = document.querySelectorAll('#twitter-ad-blocker-panel');
            if (existingPanels.length > 1) {
                log("Multiple panels found, cleaning up");
                existingPanels.forEach(panel => {
                    if (panel !== panelElement) {
                        if (document.body.contains(panel)) {
                            document.body.removeChild(panel);
                            log("Removed duplicate panel");
                        }
                    }
                });
            }
        }, 5000);
        
        // Send initial stats to popup after a short delay
        setTimeout(() => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'updateAdBlockerStats',
                        stats: stats
                    });
                    log("Sent initial stats to popup");
                } catch (error) {
                    log("Error sending initial stats to popup:", error);
                }
            }
        }, 2000);
        
        log("Ad blocker initialized");
        
        // Sayfa tamamen yüklendikten sonra bir kez daha kontrol et
        window.addEventListener('load', () => {
            log("Window load event fired, checking for ads again");
            setTimeout(findAndBlockAds, 1500);
        });
        
        // Scroll olayında da kontrol et
        window.addEventListener('scroll', debounce(() => {
            log("Scroll event detected, checking for ads");
            findAndBlockAds();
        }, 300));
    }
    
    // Debounce fonksiyonu - çok sık çağrıları önlemek için
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Start when page is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        log("Waiting for DOMContentLoaded");
    } else {
        init();
    }
})(); 