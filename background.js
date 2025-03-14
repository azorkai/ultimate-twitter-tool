// Extension yüklendiğinde çalışacak kod
chrome.runtime.onInstalled.addListener(() => {
    // Varsayılan görünüm modunu ayarla
    chrome.storage.local.get("viewMode", (data) => {
        if (!data.viewMode) {
            chrome.storage.local.set({ viewMode: 'card' });
        }
    });
    
    // Reklam engelleyici için varsayılan ayarları ayarla
    chrome.storage.local.get("adBlockerEnabled", (data) => {
        if (data.adBlockerEnabled === undefined) {
            chrome.storage.local.set({ adBlockerEnabled: true });
        }
    });
    
    // Reklam engelleyici istatistikleri için varsayılan değerleri ayarla
    chrome.storage.local.get("adBlockerStats", (data) => {
        if (!data.adBlockerStats) {
            chrome.storage.local.set({ 
                adBlockerStats: {
                    blockedAds: 0,
                    lastBlockedTime: null
                }
            });
        }
    });
});

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.verifiedFollowers) {
        // Takipçileri local storage'a kaydet
        chrome.storage.local.set({ verifiedFollowers: message.verifiedFollowers });
        
        // Popup'a mesaj gönder (eğer açıksa)
        chrome.runtime.sendMessage({ verifiedFollowers: message.verifiedFollowers });
        
        // Takipçi sayısını badge olarak göster
        const count = message.verifiedFollowers.length;
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#1DA1F2' });
    }
    
    // Reklam engelleyici istatistiklerini güncelle
    if (message.action === 'updateAdBlockerStats') {
        chrome.storage.local.set({ adBlockerStats: message.stats });
        
        // Popup'a mesaj gönder (eğer açıksa)
        chrome.runtime.sendMessage({ 
            action: 'updateAdBlockerStats',
            stats: message.stats 
        });
    }
});

// Sekme değiştiğinde veya güncellendiğinde çalışacak kod
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Sadece Twitter/X sayfalarında çalış
    if (tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com')) && changeInfo.status === 'complete') {
        // Reklam engelleyici ayarlarını kontrol et ve content script'e gönder
        chrome.storage.local.get('adBlockerEnabled', (data) => {
            const isEnabled = data.adBlockerEnabled !== undefined ? data.adBlockerEnabled : true;
            
            // Content script'e mesaj gönder
            chrome.tabs.sendMessage(tabId, { 
                action: 'toggleAdBlocker', 
                enabled: isEnabled 
            });
        });
    }
});
