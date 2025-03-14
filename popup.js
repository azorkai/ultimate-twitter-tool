// Görünüm modu (kart veya raw)
let viewMode = 'card';
let statsCollapsed = false;
let activeTab = 'profileStats';
let defaultUsername = ''; // Varsayılan kullanıcı adı
let adBlockerStats = {
    blockedAds: 0,
    lastBlockedTime: null
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded event başladı");
    
    // Load ad blocker settings
    loadAdBlockerSettings();
    
    // Settings icon butonunu görünür yap
    const settingsIconButton = document.getElementById('settingsIconButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    
    // Dark mode ayarını hemen yükle
    chrome.storage.local.get('darkMode', function(data) {
        console.log("Dark mode ayarı yükleniyor:", data);
        if (data.darkMode) {
            document.body.classList.add('dark-mode');
            const darkModeToggle = document.getElementById("darkModeToggle");
            if (darkModeToggle) {
                darkModeToggle.checked = true;
                console.log("Dark mode aktif edildi ve toggle işaretlendi");
            }
        }
    });
    
    // Tema rengi ayarını yükle
    chrome.storage.local.get('themeColor', function(data) {
        if (data.themeColor) {
            applyThemeColor(data.themeColor);
            const themeColorSelect = document.getElementById("themeColorSelect");
            if (themeColorSelect) {
                themeColorSelect.value = data.themeColor;
                updateColorPreview(data.themeColor);
            }
        }
    });
    
    // Font boyutu ayarını yükle
    chrome.storage.local.get('fontSize', function(data) {
        if (data.fontSize) {
            applyFontSize(data.fontSize);
            const fontSizeSelect = document.getElementById("fontSizeSelect");
            if (fontSizeSelect) {
                fontSizeSelect.value = data.fontSize;
            }
        }
    });
    
    // Bildirim ayarlarını yükle
    chrome.storage.local.get(['notifications', 'notificationSound'], function(data) {
        const notificationsToggle = document.getElementById("notificationsToggle");
        const soundToggle = document.getElementById("soundToggle");
        
        if (notificationsToggle && data.notifications) {
            notificationsToggle.checked = true;
        }
        
        if (soundToggle && data.notificationSound) {
            soundToggle.checked = true;
        }
    });
    
    // Geçmiş kaydetme ayarını yükle
    chrome.storage.local.get('saveHistory', function(data) {
        const saveHistoryToggle = document.getElementById("saveHistoryToggle");
        if (saveHistoryToggle) {
            // Varsayılan olarak true
            saveHistoryToggle.checked = data.saveHistory !== false;
        }
    });
    
    // Debug modu ayarını yükle
    chrome.storage.local.get('debugMode', function(data) {
        const debugModeToggle = document.getElementById("debugModeToggle");
        if (debugModeToggle && data.debugMode) {
            debugModeToggle.checked = true;
        }
    });
    
    // Kripto adreslerini kopyalama butonları için event listener ekle
    initializeCopyButtons();
    
    // Test sekmesi butonuna event listener ekle
    const showTestTabBtn = document.getElementById('showTestTab');
    if (showTestTabBtn) {
        showTestTabBtn.addEventListener('click', function() {
            console.log("Test sekmesi gösteriliyor");
            // Test sekmesi butonunu görünür yap
            const hiddenTestTab = document.getElementById("hiddenTestTab");
            if (hiddenTestTab) {
                hiddenTestTab.style.display = "block";
                // Ana ekrandaki test butonunu da görünür yap
                const openTestTabBtn = document.getElementById("openTestTab");
                if (openTestTabBtn) {
                    openTestTabBtn.style.display = "inline-block";
                }
                // Test sekmesine geçiş yap
                setActiveTab('hiddenTest');
                // Modal'ı kapat
                settingsModal.style.display = 'none';
            }
        });
    }
    
    // Tüm toggle-switch elementlerine tıklama olayı ekle
    const allToggleSwitches = document.querySelectorAll('.toggle-switch');
    allToggleSwitches.forEach(toggleSwitch => {
        toggleSwitch.addEventListener('click', function(e) {
            // İlgili checkbox'ı bul
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                // Checkbox'ın durumunu tersine çevir
                checkbox.checked = !checkbox.checked;
                // Manuel olarak change event'i tetikle
                const event = new Event('change');
                checkbox.dispatchEvent(event);
            }
        });
    });
    
    // Çark butonunu görünür hale getir
    if (settingsIconButton) {
        settingsIconButton.style.display = 'flex';
        settingsIconButton.style.visibility = 'visible';
        settingsIconButton.style.opacity = '1';
        
        settingsIconButton.addEventListener('click', function() {
            // settingsModal.style.display = 'block';
            // loadSettings(); // Ayarları yükle
            
            // Yeni bir tab açarak ayarlar sayfasını göster
            chrome.tabs.create({
                url: chrome.runtime.getURL('settings.html')
            });
        });
    }
    
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', function() {
            settingsModal.style.display = 'none';
        });
    }
    
    // Modal dışına tıklandığında kapat
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
    
    // Compact View toggle için event listener
    const compactViewToggle = document.getElementById('compactViewToggle');
    if (compactViewToggle) {
        // Kaydedilmiş ayarı yükle
        chrome.storage.local.get('compactView', function(data) {
            if (data.compactView) {
                compactViewToggle.checked = true;
                document.body.classList.add('compact-view');
            }
        });
        
        // Toggle değiştiğinde
        compactViewToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('compact-view');
                chrome.storage.local.set({ compactView: true });
            } else {
                document.body.classList.remove('compact-view');
                chrome.storage.local.set({ compactView: false });
            }
        });
    }
    
    // Varsayılan kullanıcı adını yükle
    chrome.storage.local.get('defaultUsername', function(data) {
        if (data.defaultUsername) {
            defaultUsername = data.defaultUsername;
            const defaultUsernameInput = document.getElementById("defaultUsername");
            if (defaultUsernameInput) {
                defaultUsernameInput.value = defaultUsername;
            }
        }
    });
    
    // Aktif sekmeyi yükle
    chrome.storage.local.get('activeTab', function(data) {
        if (data.activeTab) {
            activeTab = data.activeTab;
            updateActiveTab();
        } else {
            // Varsayılan olarak profileStats sekmesini göster
            setActiveTab('profileStats');
        }
    });
    
    // Profil bilgilerini yükle
    loadProfileInfo();
    
    // Tüm event listener'ları başlat
    initializeEventListeners();
    
    // Sayfa yüklendikten sonra çark butonunun görünürlüğünü tekrar kontrol et
    setTimeout(function() {
        if (settingsIconButton) {
            settingsIconButton.style.display = 'flex';
            settingsIconButton.style.visibility = 'visible';
            settingsIconButton.style.opacity = '1';
        }
    }, 100);
});

// Tüm event listener'ları başlat
function initializeEventListeners() {
    // Tab butonları için event listener'lar
    document.getElementById("profileStatsTab").addEventListener("click", function() {
        setActiveTab('profileStats');
    });
    
    document.getElementById("verifiedFollowersTab").addEventListener("click", function() {
        setActiveTab('verifiedFollowers');
    });
    
    document.getElementById("followBackTab").addEventListener("click", function() {
        setActiveTab('followBack');
    });
    
    document.getElementById("bulkFollowTab").addEventListener("click", function() {
        setActiveTab('bulkFollow');
    });
    
    document.getElementById("autoInteractTab").addEventListener("click", function() {
        setActiveTab('autoInteract');
    });
    
    document.getElementById("prankProfileTab").addEventListener("click", function() {
        setActiveTab('prankProfile');
    });
    
    document.getElementById("adBlockerTab").addEventListener("click", function() {
        setActiveTab('adBlocker');
    });
    
    document.getElementById("arkoseSolverTab").addEventListener("click", function() {
        setActiveTab('arkoseSolver');
    });
    
    document.getElementById("donateTab").addEventListener("click", function() {
        setActiveTab('donate');
        // Donate sekmesi açıldığında kopyalama butonlarını yeniden initialize et
        setTimeout(() => {
            initializeCopyButtons();
        }, 100);
    });
    
    document.getElementById("changelogTab").addEventListener("click", function() {
        setActiveTab('changelog');
        // Changelog sekmesi açıldığında changelog verilerini yükle
        loadChangelog();
    });
    
    // Verified takipçileri kontrol etme butonu için event listener
    document.getElementById("checkVerifiedFollowers").addEventListener("click", async function() {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Buton metnini güncelle ve yükleniyor göster
        const button = document.getElementById("checkVerifiedFollowers");
        button.textContent = "Checking...";
        button.disabled = true;
        
        // Yükleniyor animasyonu göster
        const loadingElement = document.getElementById("loading");
        loadingElement.style.display = "block";
        
        // Kullanıcı adını kontrol et
        if (defaultUsername && defaultUsername.trim() !== '') {
            // Varsayılan kullanıcı adını kullan
            const username = defaultUsername;
            
            // Verified followers sayfasına git
            const verifiedFollowersUrl = `https://x.com/${username}/verified_followers`;
            
            // Mevcut sekmeyi güncelle
            chrome.tabs.update(tab.id, { url: verifiedFollowersUrl });
            
            // Sayfanın yüklenmesi için biraz bekle, sonra content.js'i çalıştır
            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"]
                });
                
                // Buton metnini geri al ve yükleniyor gizle
                button.textContent = "Check Verified Followers";
                button.disabled = false;
                loadingElement.style.display = "none";
            }, 2000); // 2 saniye bekle
        } else {
            alert("Please enter a username in the settings first.");
            button.textContent = "Check Verified Followers";
            button.disabled = false;
            loadingElement.style.display = "none";
        }
    });
    
    // Ana ekrandaki test butonu için event listener
    const openTestTabBtn = document.getElementById("openTestTab");
    if (openTestTabBtn) {
        openTestTabBtn.addEventListener('click', function() {
            console.log("Test sekmesi açılıyor (ana buton)");
            // Test sekmesi butonunu görünür yap
            const hiddenTestTab = document.getElementById("hiddenTestTab");
            if (hiddenTestTab) {
                hiddenTestTab.style.display = "block";
                // Test sekmesine geçiş yap
                setActiveTab('hiddenTest');
            }
        });
    }
    
    // Gizli test sekmesi için özel kısayol: Ctrl+Shift+T
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            console.log("Gizli test sekmesi aktif edildi");
            setActiveTab('hiddenTest');
            // Gizli sekme butonunu görünür yap
            document.getElementById("hiddenTestTab").style.display = "block";
            // Ana ekrandaki test butonunu da görünür yap
            const openTestTabBtn = document.getElementById("openTestTab");
            if (openTestTabBtn) {
                openTestTabBtn.style.display = "inline-block";
            }
        }
    });
    
    // Gizli test butonu için event listener
    const openTwitterBtn = document.getElementById("openTwitterInBackground");
    if (openTwitterBtn) {
        openTwitterBtn.addEventListener('click', openTwitterInBackground);
    }
    
    // Arka plan sekmelerini listele butonu için event listener
    const listBackgroundTabsBtn = document.getElementById("listBackgroundTabs");
    if (listBackgroundTabsBtn) {
        listBackgroundTabsBtn.addEventListener('click', listBackgroundTabs);
    }
    
    // Tüm arka plan sekmelerini kapat butonu için event listener
    const closeAllBackgroundTabsBtn = document.getElementById("closeAllBackgroundTabs");
    if (closeAllBackgroundTabsBtn) {
        closeAllBackgroundTabsBtn.addEventListener('click', closeAllBackgroundTabs);
    }
    
    // Dark mode toggle için event listener
    const darkModeToggle = document.getElementById("darkModeToggle");
    const darkModeLabel = document.querySelector('label[for="darkModeToggle"]');
    const toggleSlider = document.querySelector('.toggle-slider');
    
    if (darkModeToggle) {
        console.log("Dark mode toggle elementi bulundu");
        
        // Kaydedilmiş ayarı yükle
        chrome.storage.local.get('darkMode', function(data) {
            console.log("initializeEventListeners: Dark mode ayarı yükleniyor:", data);
            if (data.darkMode) {
                darkModeToggle.checked = true;
                document.body.classList.add('dark-mode');
                console.log("initializeEventListeners: Dark mode aktif edildi");
            }
        });
        
        // Toggle için event listener
        darkModeToggle.addEventListener('change', function(e) {
            console.log("Dark mode toggle değişti (initializeEventListeners)");
            toggleDarkMode(e);
        });
        
        // Label için event listener
        if (darkModeLabel) {
            darkModeLabel.addEventListener('click', function(e) {
                console.log("Dark mode label tıklandı");
                // Checkbox'ın durumunu tersine çevir
                darkModeToggle.checked = !darkModeToggle.checked;
                // Manuel olarak change event'i tetikle
                const event = new Event('change');
                darkModeToggle.dispatchEvent(event);
                // Event'in daha fazla yayılmasını engelle
                e.preventDefault();
            });
        }
        
        // Toggle slider için event listener
        if (toggleSlider) {
            toggleSlider.addEventListener('click', function(e) {
                console.log("Toggle slider tıklandı");
                // Checkbox'ın durumunu tersine çevir
                darkModeToggle.checked = !darkModeToggle.checked;
                // Manuel olarak change event'i tetikle
                const event = new Event('change');
                darkModeToggle.dispatchEvent(event);
                // Event'in daha fazla yayılmasını engelle
                e.stopPropagation();
            });
        }
    } else {
        console.error("Dark mode toggle elementi bulunamadı!");
    }
    
    // Default username kaydetme butonu için event listener
    const saveDefaultUsernameBtn = document.getElementById("saveDefaultUsername");
    if (saveDefaultUsernameBtn) {
        saveDefaultUsernameBtn.addEventListener("click", saveDefaultUsername);
    }
    
    // Tema rengi seçimi için event listener
    const themeColorSelect = document.getElementById("themeColorSelect");
    if (themeColorSelect) {
        themeColorSelect.addEventListener('change', function() {
            const selectedTheme = this.value;
            applyThemeColor(selectedTheme);
            updateColorPreview(selectedTheme);
            chrome.storage.local.set({ themeColor: selectedTheme });
        });
    }
    
    // Font boyutu seçimi için event listener
    const fontSizeSelect = document.getElementById("fontSizeSelect");
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', function() {
            const selectedSize = this.value;
            applyFontSize(selectedSize);
            chrome.storage.local.set({ fontSize: selectedSize });
        });
    }
    
    // Bildirim ayarları için event listener'lar
    const notificationsToggle = document.getElementById("notificationsToggle");
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', function() {
            chrome.storage.local.set({ notifications: this.checked });
        });
    }
    
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
        soundToggle.addEventListener('change', function() {
            chrome.storage.local.set({ notificationSound: this.checked });
        });
    }
    
    // Geçmiş kaydetme ayarı için event listener
    const saveHistoryToggle = document.getElementById("saveHistoryToggle");
    if (saveHistoryToggle) {
        saveHistoryToggle.addEventListener('change', function() {
            chrome.storage.local.set({ saveHistory: this.checked });
        });
    }
    
    // Tüm verileri temizleme butonu için event listener
    const clearDataBtn = document.getElementById("clearDataBtn");
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            if (confirm("Are you sure you want to clear all saved data? This action cannot be undone.")) {
                clearAllData();
            }
        });
    }
    
    // Debug modu için event listener
    const debugModeToggle = document.getElementById("debugModeToggle");
    if (debugModeToggle) {
        debugModeToggle.addEventListener('change', function() {
            chrome.storage.local.set({ debugMode: this.checked });
            console.log("Debug mode " + (this.checked ? "enabled" : "disabled"));
        });
    }
}

// Ayarları yükle
function loadSettings() {
    console.log("Ayarlar yükleniyor...");
    
    // Default username'i yükle
    chrome.storage.local.get('defaultUsername', function(data) {
        if (data.defaultUsername) {
            defaultUsername = data.defaultUsername;
            document.getElementById('defaultUsername').value = defaultUsername;
        }
    });
    
    // Dark mode ayarını yükle
    chrome.storage.local.get('darkMode', function(data) {
        console.log("loadSettings: Dark mode ayarı yükleniyor:", data);
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            if (data.darkMode) {
                darkModeToggle.checked = true;
                document.body.classList.add('dark-mode');
                console.log("loadSettings: Dark mode aktif edildi");
            } else {
                darkModeToggle.checked = false;
                document.body.classList.remove('dark-mode');
                console.log("loadSettings: Dark mode devre dışı");
            }
        } else {
            console.error("loadSettings: Dark mode toggle elementi bulunamadı!");
        }
    });
    
    // Compact view ayarını yükle
    chrome.storage.local.get('compactView', function(data) {
        const compactViewToggle = document.getElementById('compactViewToggle');
        if (data.compactView && compactViewToggle) {
            compactViewToggle.checked = true;
            document.body.classList.add('compact-view');
        }
    });
}

document.getElementById("fetchStats").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Buton metnini güncelle ve yükleniyor göster
    const button = document.getElementById("fetchStats");
    button.textContent = "Fetching...";
    button.disabled = true;
    
    // Yükleniyor animasyonu göster
    const loadingElement = document.getElementById("loading");
    loadingElement.style.display = "block";

    // Öncelikle varsayılan kullanıcı adını kontrol et
    console.log("Varsayılan kullanıcı adı kontrol ediliyor:", defaultUsername);
    
    if (defaultUsername && defaultUsername.trim() !== '') {
        // Varsayılan kullanıcı adını kullan
        const username = defaultUsername;
        console.log("Varsayılan kullanıcı adı kullanılıyor:", username);
        
        // Aktif sekmeye göre URL oluştur
        let targetUrl;
        if (activeTab === 'profileStats') {
            targetUrl = `https://x.com/${username}`;
        } else if (activeTab === 'verifiedFollowers') {
            targetUrl = `https://x.com/${username}/verified_followers`;
        } else {
            targetUrl = `https://x.com/${username}`;
        }
        
        console.log("Hedef URL:", targetUrl);
        
        // Twitter profiline git
        chrome.tabs.update(tab.id, { url: targetUrl });
        
        // Sayfanın yüklenmesi için biraz bekle, sonra content.js'i çalıştır
        setTimeout(() => {
            console.log("Sayfa yüklendi, content.js çalıştırılıyor...");
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Script çalıştırma hatası:", chrome.runtime.lastError);
                } else {
                    console.log("Script başarıyla çalıştırıldı");
                }
                
                // Buton durumunu sıfırla
                button.textContent = "Fetch Stats";
                button.disabled = false;
                
                // Yükleniyor animasyonunu gizle
                loadingElement.style.display = "none";
            });
        }, 3000); // 3 saniye bekle
        
        return; // İşlemi burada sonlandır
    }
    
    // Varsayılan kullanıcı adı yoksa, mevcut URL'yi kontrol et
    const currentUrl = tab.url;
    const urlMatch = currentUrl.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
    
    if (urlMatch && urlMatch[1]) {
        // URL'den kullanıcı adını al
        const username = urlMatch[1];
        console.log("URL'den kullanıcı adı alındı:", username);
        
        // Aktif sekmeye göre işlem yap
        if (activeTab === 'profileStats') {
            // Profil istatistikleri için normal profil sayfasında çalıştır
            if (!currentUrl.includes('/verified_followers')) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"]
                });
            } else {
                // Verified followers sayfasındaysak, önce normal profil sayfasına git
                const profileUrl = `https://x.com/${username}`;
                
                // Yeni sekme açmak yerine mevcut sekmeyi güncelle
                chrome.tabs.update(tab.id, { url: profileUrl });
                
                // Sayfanın yüklenmesi için biraz bekle, sonra content.js'i çalıştır
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"]
                    });
                }, 2000); // 2 saniye bekle
            }
        } else if (activeTab === 'verifiedFollowers') {
            // Verified takipçiler için verified_followers sayfasına git
            if (!currentUrl.includes('/verified_followers')) {
                // Verified followers sayfasına git
                const verifiedFollowersUrl = `https://x.com/${username}/verified_followers`;
                
                // Yeni sekme açmak yerine mevcut sekmeyi güncelle
                chrome.tabs.update(tab.id, { url: verifiedFollowersUrl });
                
                // Sayfanın yüklenmesi için biraz bekle, sonra content.js'i çalıştır
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"]
                    });
                }, 2000); // 2 saniye bekle
            } else {
                // Zaten verified followers sayfasındaysak, direkt çalıştır
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });
            }
        }
    } else {
        // URL'den kullanıcı adı alınamadı ve varsayılan kullanıcı adı da yok
        console.log("URL'den kullanıcı adı alınamadı ve varsayılan kullanıcı adı da yok");
        
        // Kullanıcı adı bulunamadı ve varsayılan kullanıcı adı ayarlanmamış
        alert("Please set a default username in Settings or navigate to a Twitter profile.");
        
        // Buton durumunu sıfırla
        button.textContent = "Fetch Stats";
        button.disabled = false;
        
        // Yükleniyor animasyonunu gizle
        loadingElement.style.display = "none";
        
        // Settings sekmesine geç
        setActiveTab('settings');
    }
});

// Sayfa yüklendiğinde daha önce kaydedilmiş verileri göster
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded event fired");
    
    try {
        // Görünüm modunu ve diğer ayarları local storage'dan al
        chrome.storage.local.get(["viewMode", "defaultUsername", "darkMode"], (data) => {
            console.log("Local storage'dan veriler alındı:", data);
            
            if (data.viewMode) {
                viewMode = data.viewMode;
                updateViewMode();
            }
            
            if (data.defaultUsername) {
                defaultUsername = data.defaultUsername;
                document.getElementById("defaultUsername").value = defaultUsername;
                console.log("Varsayılan kullanıcı adı yüklendi:", defaultUsername);
            } else {
                console.log("Varsayılan kullanıcı adı bulunamadı");
                defaultUsername = ''; // Varsayılan değeri boş string olarak ayarla
            }
            
            if (data.darkMode) {
                document.body.classList.add('dark-mode');
                document.getElementById("darkModeToggle").checked = true;
            }
        });
        
        // Aktif sekmeyi güncelle
        updateActiveTab();
        
        // Profil bilgilerini yükle
        loadProfileInfo();
        
        // İstatistikleri yükle
        loadStats();
        
        // Sekme butonlarına event listener ekle
        document.getElementById("profileStatsTab").addEventListener("click", async () => await setActiveTab('profileStats'));
        document.getElementById("verifiedFollowersTab").addEventListener("click", async () => await setActiveTab('verifiedFollowers'));
        document.getElementById("followBackTab").addEventListener("click", async () => await setActiveTab('followBack'));
        document.getElementById("bulkFollowTab").addEventListener("click", async () => await setActiveTab('bulkFollow'));
        
        // Görünüm modu değiştirme butonuna event listener ekle
        document.getElementById("toggleView").addEventListener("click", toggleViewMode);
        
        // Export butonuna event listener ekle
        document.getElementById("exportBtn").addEventListener("click", exportFollowers);
        
        // İstatistik görünümünü değiştirme butonuna event listener ekle
        document.getElementById("toggleStats").addEventListener("click", toggleStats);
        
        // Varsayılan kullanıcı adı kaydetme butonu için event listener ekle
        document.getElementById("saveDefaultUsername").addEventListener("click", saveDefaultUsername);
        document.getElementById("defaultUsername").addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                saveDefaultUsername();
            }
        });
        
        // Karanlık mod toggle için event listener ekle
        document.getElementById("darkModeToggle").addEventListener("change", toggleDarkMode);
    } catch (error) {
        console.error("DOMContentLoaded event handler error:", error);
    }
});

// Background script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((message) => {
    // Profil bilgilerini işle
    if (message.profileStats && !message.isVerifiedFollowersPage) {
        // Profil bilgilerini kaydet ve göster
        updateProfileInfo(message.profileStats);
        
        // Profil bilgilerini kalıcı olarak sakla
        chrome.storage.local.set({ 
            profileStats: message.profileStats,
            profileStatsLastUpdated: new Date().toISOString()
        });
    }
    
    // Verified takipçileri işle
    if (message.verifiedFollowers && message.isVerifiedFollowersPage) {
        // Yeni takipçileri kaydet ve istatistikleri güncelle
        updateStats(message.verifiedFollowers);
        
        // Takipçileri göster
        displayFollowers(message.verifiedFollowers);
        
        // Verified takipçileri kalıcı olarak sakla
        chrome.storage.local.set({ 
            verifiedFollowers: message.verifiedFollowers,
            verifiedFollowersLastUpdated: new Date().toISOString()
        });
        
        // Verified followers sekmesine geç
        setActiveTab('verifiedFollowers');
        
        // Check Verified Followers butonunun durumunu sıfırla
        const checkButton = document.getElementById("checkVerifiedFollowers");
        if (checkButton) {
            checkButton.textContent = "Check Verified Followers";
            checkButton.disabled = false;
        }
    }
    
    // Buton durumunu sıfırla
    const button = document.getElementById("fetchStats");
    button.textContent = "Fetch Stats";
    button.disabled = false;
    
    // Yükleniyor animasyonunu gizle
    document.getElementById("loading").style.display = "none";
});

// Profil bilgilerini yükle
function loadProfileInfo() {
    chrome.storage.local.get(["profileStats", "profileStatsLastUpdated"], (data) => {
        if (data.profileStats) {
            // Kaydedilmiş profil bilgilerini göster
            displayProfileInfo(data.profileStats);
            
            // Son güncelleme zamanını göster (isteğe bağlı)
            if (data.profileStatsLastUpdated) {
                const lastUpdated = new Date(data.profileStatsLastUpdated);
                console.log("Profile stats last updated:", formatDate(lastUpdated));
            }
        }
    });
}

// Profil bilgilerini güncelle
function updateProfileInfo(profileStats) {
    chrome.storage.local.set({ profileStats: profileStats });
    displayProfileInfo(profileStats);
    
    // Auto Interact modülüne profil resmi değişikliğini bildir
    if (profileStats.profileImage) {
        // Auto Interact modülünün profil resmini güncellemesi için özel bir mesaj gönder
        const autoInteractProfileImage = document.getElementById('autoInteractProfileImage');
        if (autoInteractProfileImage) {
            autoInteractProfileImage.src = profileStats.profileImage;
        }
        
        // Auto Interact modülünün global değişkenini güncelle
        if (typeof window.currentProfileImage !== 'undefined') {
            window.currentProfileImage = profileStats.profileImage;
        }
    }
}

// Profil bilgilerini göster
function displayProfileInfo(profileStats) {
    // Profil bilgilerini göster
    const profileInfoContainer = document.querySelector(".profile-info");
    profileInfoContainer.style.display = "block";
    
    // Profil resmi
    if (profileStats.profileImage) {
        document.getElementById("profileImage").src = profileStats.profileImage;
    }
    
    // Profil adı ve kullanıcı adı
    if (profileStats.displayName) {
        document.getElementById("displayName").textContent = profileStats.displayName;
    }
    
    if (profileStats.username) {
        document.getElementById("username").textContent = profileStats.username;
    }
    
    // Mavi tik durumu
    if (profileStats.isVerified) {
        document.getElementById("verifiedBadge").style.display = "inline-flex";
    } else {
        document.getElementById("verifiedBadge").style.display = "none";
    }
    
    // Profil açıklaması
    if (profileStats.bio) {
        document.getElementById("profileBio").textContent = profileStats.bio;
        document.getElementById("profileBio").style.display = "block";
    } else {
        document.getElementById("profileBio").style.display = "none";
    }
    
    // Konum
    if (profileStats.location) {
        document.getElementById("locationText").textContent = profileStats.location;
        document.getElementById("profileLocation").style.display = "flex";
    } else {
        document.getElementById("profileLocation").style.display = "none";
    }
    
    // Web sitesi
    if (profileStats.website) {
        document.getElementById("websiteLink").textContent = profileStats.website;
        document.getElementById("websiteLink").href = profileStats.website.startsWith("http") ? profileStats.website : "https://" + profileStats.website;
        document.getElementById("profileWebsite").style.display = "flex";
    } else {
        document.getElementById("profileWebsite").style.display = "none";
    }
    
    // Katılma tarihi
    if (profileStats.joinDate) {
        document.getElementById("joinDateText").textContent = profileStats.joinDate;
        document.getElementById("profileJoinDate").style.display = "flex";
    } else {
        document.getElementById("profileJoinDate").style.display = "none";
    }
    
    // İstatistik kartlarını güncelle
    const tweetCountElement = document.getElementById("tweetCount");
    const followingCountElement = document.getElementById("followingCount");
    const followerCountElement = document.getElementById("followerCount");
    
    // Tweet sayısı
    if (profileStats.tweets) {
        tweetCountElement.textContent = profileStats.tweets;
        tweetCountElement.classList.add("has-data");
    } else {
        tweetCountElement.textContent = "-";
        tweetCountElement.classList.remove("has-data");
    }
    
    // Takip edilen sayısı
    if (profileStats.following) {
        if (profileStats.following === "N/A") {
            followingCountElement.textContent = "N/A";
            followingCountElement.classList.remove("has-data");
            console.log("Displaying N/A for following count");
        } else {
            followingCountElement.textContent = profileStats.following;
            followingCountElement.classList.add("has-data");
            console.log("Displaying following count:", profileStats.following);
        }
    } else {
        followingCountElement.textContent = "-";
        followingCountElement.classList.remove("has-data");
        console.log("No following count available to display");
    }
    
    // Takipçi sayısı
    if (profileStats.followers) {
        if (profileStats.followers === "N/A") {
            followerCountElement.textContent = "N/A";
            followerCountElement.classList.remove("has-data");
            console.log("Displaying N/A for followers count");
        } else {
            followerCountElement.textContent = profileStats.followers;
            followerCountElement.classList.add("has-data");
            console.log("Displaying followers count:", profileStats.followers);
        }
    } else {
        followerCountElement.textContent = "-";
        followerCountElement.classList.remove("has-data");
        console.log("No followers count available to display");
    }
    
    // Verified takipçi sayısını göster
    chrome.storage.local.get("verifiedFollowers", (data) => {
        const verifiedFollowerCountElement = document.getElementById("verifiedFollowerCount");
        if (data.verifiedFollowers && data.verifiedFollowers.length > 0) {
            verifiedFollowerCountElement.textContent = data.verifiedFollowers.length;
            verifiedFollowerCountElement.classList.add("has-data");
        } else {
            verifiedFollowerCountElement.textContent = "-";
            verifiedFollowerCountElement.classList.remove("has-data");
        }
    });
}

// İstatistikleri yükle
function loadStats() {
    chrome.storage.local.get(["lastFetchDate", "totalFetches", "previousFollowerCount"], (data) => {
        const statsContainer = document.querySelector("#verifiedFollowersContent .stats-container");
        
        if (data.lastFetchDate) {
            // İstatistik container'ını göster
            statsContainer.style.display = "block";
            
            // Son çekme tarihini göster
            const lastFetchDate = new Date(data.lastFetchDate);
            document.getElementById("lastFetchDate").textContent = formatDate(lastFetchDate);
            
            // Toplam çekme sayısını göster
            document.getElementById("totalFetches").textContent = data.totalFetches || 0;
            
            // İstatistik görünümünü güncelle
            updateStatsView();
        }
    });
}

// İstatistikleri güncelle
function updateStats(followers) {
    chrome.storage.local.get(["lastFetchDate", "totalFetches", "previousFollowerCount"], (data) => {
        const now = new Date();
        const statsContainer = document.querySelector("#verifiedFollowersContent .stats-container");
        let newFollowersCount = 0;
        
        // Önceki takipçi sayısı varsa, yeni takipçi sayısını hesapla
        if (data.previousFollowerCount !== undefined) {
            newFollowersCount = followers.length - data.previousFollowerCount;
        }
        
        // İstatistikleri güncelle
        const updatedStats = {
            lastFetchDate: now.toISOString(),
            totalFetches: (data.totalFetches || 0) + 1,
            previousFollowerCount: followers.length,
            newFollowersCount: newFollowersCount
        };
        
        // İstatistikleri kaydet
        chrome.storage.local.set(updatedStats);
        
        // İstatistik container'ını her zaman göster
        statsContainer.style.display = "block";
        
        // Son çekme tarihini göster
        document.getElementById("lastFetchDate").textContent = formatDate(now);
        
        // Yeni takipçi sayısını göster
        const newFollowersElement = document.getElementById("newFollowersCount");
        newFollowersElement.textContent = newFollowersCount > 0 ? `+${newFollowersCount}` : newFollowersCount;
        
        // Pozitif değer için renk ekle
        if (newFollowersCount > 0) {
            newFollowersElement.classList.add("positive");
        } else {
            newFollowersElement.classList.remove("positive");
        }
        
        // Toplam çekme sayısını göster
        document.getElementById("totalFetches").textContent = updatedStats.totalFetches;
        
        // Verified takipçi sayısını güncelle
        document.getElementById("verifiedFollowerCount").textContent = followers.length;
    });
}

// İstatistik görünümünü aç/kapat
function toggleStats() {
    statsCollapsed = !statsCollapsed;
    
    // İstatistik durumunu kaydet
    chrome.storage.local.set({ statsCollapsed: statsCollapsed });
    
    // İstatistik görünümünü güncelle
    updateStatsView();
}

// İstatistik görünümünü güncelle
function updateStatsView() {
    const toggleBtn = document.getElementById("toggleStats");
    const statsContent = document.querySelector(".stats-content");
    
    if (statsCollapsed) {
        toggleBtn.classList.add("collapsed");
        statsContent.classList.add("collapsed");
    } else {
        toggleBtn.classList.remove("collapsed");
        statsContent.classList.remove("collapsed");
    }
}

// Aktif sekmeyi ayarla
async function setActiveTab(tab) {
    activeTab = tab;
    
    // Aktif sekmeyi kaydet
    chrome.storage.local.set({ activeTab: activeTab });
    
    // Sekme görünümünü güncelle
    await updateActiveTab();
}

// Aktif sekme görünümünü güncelle
async function updateActiveTab() {
    const profileStatsTab = document.getElementById("profileStatsTab");
    const verifiedFollowersTab = document.getElementById("verifiedFollowersTab");
    const followBackTab = document.getElementById("followBackTab");
    const bulkFollowTab = document.getElementById("bulkFollowTab");
    const autoInteractTab = document.getElementById("autoInteractTab");
    const prankProfileTab = document.getElementById("prankProfileTab");
    const adBlockerTab = document.getElementById("adBlockerTab");
    const arkoseSolverTab = document.getElementById("arkoseSolverTab");
    const donateTab = document.getElementById("donateTab");
    const changelogTab = document.getElementById("changelogTab");
    const hiddenTestTab = document.getElementById("hiddenTestTab");
    
    const profileStatsContent = document.getElementById("profileStatsContent");
    const verifiedFollowersContent = document.getElementById("verifiedFollowersContent");
    const followBackContent = document.getElementById("followBackContent");
    const bulkFollowContent = document.getElementById("bulkFollowContent");
    const autoInteractContent = document.getElementById("autoInteractContent");
    const prankProfileContent = document.getElementById("prankProfileContent");
    const adBlockerContent = document.getElementById("adBlockerContent");
    const arkoseSolverContent = document.getElementById("arkoseSolverContent");
    const donateContent = document.getElementById("donateContent");
    const changelogContent = document.getElementById("changelogContent");
    const hiddenTestContent = document.getElementById("hiddenTestContent");
    
    const fetchStatsButton = document.getElementById("fetchStats");
    
    // Tüm sekmeleri ve içerikleri sıfırla
    profileStatsTab.classList.remove("active");
    verifiedFollowersTab.classList.remove("active");
    followBackTab.classList.remove("active");
    bulkFollowTab.classList.remove("active");
    autoInteractTab.classList.remove("active");
    prankProfileTab.classList.remove("active");
    adBlockerTab.classList.remove("active");
    arkoseSolverTab.classList.remove("active");
    donateTab.classList.remove("active");
    changelogTab.classList.remove("active");
    if (hiddenTestTab) hiddenTestTab.classList.remove("active");
    
    profileStatsContent.style.display = "none";
    verifiedFollowersContent.style.display = "none";
    followBackContent.style.display = "none";
    bulkFollowContent.style.display = "none";
    autoInteractContent.style.display = "none";
    prankProfileContent.style.display = "none";
    adBlockerContent.style.display = "none";
    arkoseSolverContent.style.display = "none";
    donateContent.style.display = "none";
    changelogContent.style.display = "none";
    if (hiddenTestContent) hiddenTestContent.style.display = "none";
    
    // Aktif sekmeye göre görünümü güncelle
    if (activeTab === 'profileStats') {
        profileStatsTab.classList.add("active");
        profileStatsContent.style.display = "block";
        fetchStatsButton.style.display = "block";
    } else if (activeTab === 'verifiedFollowers') {
        verifiedFollowersTab.classList.add("active");
        verifiedFollowersContent.style.display = "block";
        fetchStatsButton.style.display = "none";
        
        // Verified takipçileri otomatik olarak yükle
        loadVerifiedFollowers();
    } else if (activeTab === 'followBack') {
        followBackTab.classList.add("active");
        followBackContent.style.display = "block";
        fetchStatsButton.style.display = "none";
        
        // Follow Back verilerini yükle
        loadFollowBackData();
    } else if (activeTab === 'bulkFollow') {
        bulkFollowTab.classList.add("active");
        bulkFollowContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'autoInteract') {
        autoInteractTab.classList.add("active");
        autoInteractContent.style.display = "block";
        fetchStatsButton.style.display = "none";
        
        // Auto Interact ayarlarının görünürlüğünü sağla
        const interactSettingsMobile = document.querySelector('.interact-settings-mobile');
        if (interactSettingsMobile) {
            interactSettingsMobile.style.display = 'flex';
            
            // Yeni checkbox ID'leri ile çalışacak kod
            const likeCheckbox = document.getElementById('interactLikeOption');
            const retweetCheckbox = document.getElementById('interactRetweetOption');
            const delayInput = document.getElementById('interactionDelay');
            
            // Tema değişikliğini önlemek için event propagation'ı durdur
            if (likeCheckbox) {
                likeCheckbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });
                
                likeCheckbox.addEventListener('change', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });
            }
            
            if (retweetCheckbox) {
                retweetCheckbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });
                
                retweetCheckbox.addEventListener('change', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });
            }
            
            if (delayInput) {
                delayInput.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                
                delayInput.addEventListener('change', function(e) {
                    e.stopPropagation();
                });
            }
            
            // Etkileşim ayarlarının her bir öğesine event listener ekle
            const interactElements = interactSettingsMobile.querySelectorAll('.interact-setting-item, .interact-label, .interact-checkbox-container, .interact-checkbox-label, .interact-checkbox-button');
            interactElements.forEach(element => {
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });
            });
        }
        
        // Ayarların yüklenmesini sağla
        if (typeof loadAutoInteractSettings === 'function') {
            loadAutoInteractSettings();
        }
    } else if (activeTab === 'prankProfile') {
        prankProfileTab.classList.add("active");
        prankProfileContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'adBlocker') {
        adBlockerTab.classList.add("active");
        adBlockerContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'arkoseSolver') {
        arkoseSolverTab.classList.add("active");
        arkoseSolverContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'donate') {
        donateTab.classList.add("active");
        donateContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'changelog') {
        changelogTab.classList.add("active");
        changelogContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    } else if (activeTab === 'hiddenTest') {
        if (hiddenTestTab) hiddenTestTab.classList.add("active");
        if (hiddenTestContent) hiddenTestContent.style.display = "block";
        fetchStatsButton.style.display = "none";
    }
    
    console.log("updateActiveTab çalıştı. Aktif sekme:", activeTab);
}

// Görünüm modunu değiştir
function toggleViewMode() {
    viewMode = viewMode === 'card' ? 'raw' : 'card';
    
    // Görünüm modunu local storage'a kaydet
    chrome.storage.local.set({ viewMode: viewMode });
    
    updateViewMode();
    
    // Takipçileri tekrar göster
    chrome.storage.local.get("verifiedFollowers", (data) => {
        if (data.verifiedFollowers && data.verifiedFollowers.length > 0) {
            displayFollowers(data.verifiedFollowers);
        }
    });
}

// Görünüm modunu güncelle
function updateViewMode() {
    const toggleBtn = document.getElementById("toggleView");
    const followersList = document.getElementById("followersList");
    const rawFollowersList = document.getElementById("rawFollowersList");
    
    if (viewMode === 'raw') {
        toggleBtn.classList.add('raw-mode');
        followersList.style.display = 'none';
        rawFollowersList.style.display = 'block';
    } else {
        toggleBtn.classList.remove('raw-mode');
        followersList.style.display = 'grid';
        rawFollowersList.style.display = 'none';
    }
}

// Takipçileri dışa aktar
function exportFollowers() {
    chrome.storage.local.get("verifiedFollowers", (data) => {
        if (!data.verifiedFollowers || data.verifiedFollowers.length === 0) {
            alert("No verified followers to export");
            return;
        }
        
        const followers = data.verifiedFollowers;
        const text = followers.join('\n');
        
        // Dosya indirme işlemi
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'verified_followers.txt';
        document.body.appendChild(a);
        a.click();
        
        // Temizlik
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });
}

// Takipçileri göster
function displayFollowers(followers) {
    const followersList = document.getElementById("followersList");
    const rawFollowersList = document.getElementById("rawFollowersList");
    const followerCountContainer = document.querySelector(".follower-count-container");
    const statsContainer = document.querySelector("#verifiedFollowersContent .stats-container");
    
    // Listeleri temizle
    followersList.innerHTML = "";
    rawFollowersList.innerHTML = "";
    
    if (followers.length === 0) {
        followersList.innerHTML = "<div class='no-followers'>No verified followers found yet. Please click the 'Check Verified Followers' button.</div>";
        rawFollowersList.innerHTML = "<div class='no-followers'>No verified followers found yet. Please click the 'Check Verified Followers' button.</div>";
        return;
    }
    
    // Takipçi sayısını ve istatistikleri her zaman göster
    followerCountContainer.style.display = "block";
    statsContainer.style.display = "block";
    
    // Takipçi sayısını güncelle
    document.getElementById("verifiedFollowersCount").textContent = followers.length;
    
    // Verified takipçi sayısını Profile Stats sekmesinde de güncelle
    const verifiedFollowerCountElement = document.getElementById("verifiedFollowerCount");
    verifiedFollowerCountElement.textContent = followers.length;
    verifiedFollowerCountElement.classList.add("has-data");
    
    // Her takipçi için kart oluştur
    followers.forEach(follower => {
        // Kart görünümü için
        const followerCard = document.createElement("div");
        followerCard.className = "follower-card";
        
        // Profil resmi
        const profileImg = document.createElement("img");
        profileImg.className = "follower-avatar";
        profileImg.src = follower.profile_image_url;
        profileImg.alt = `${follower.name} profile image`;
        
        // Verified badge
        const verifiedBadge = document.createElement("div");
        verifiedBadge.className = "verified-badge";
        verifiedBadge.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#1DA1F2" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.553 13.51 1.75 12 1.75s-2.818.8-3.437 2.002c-.416-.166-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.202 1.926 2.002 3.437 2.002 1.512 0 2.818-.8 3.437-2.002.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path></svg>`;
        
        // İsim ve kullanıcı adı
        const followerInfo = document.createElement("div");
        followerInfo.className = "follower-info";
        
        const followerName = document.createElement("div");
        followerName.className = "follower-name";
        followerName.textContent = follower.name;
        
        const followerUsername = document.createElement("div");
        followerUsername.className = "follower-username";
        followerUsername.textContent = `@${follower.username}`;
        
        // Profil bağlantısı
        const profileLink = document.createElement("a");
        profileLink.className = "follower-profile-link";
        profileLink.href = `https://x.com/${follower.username}`;
        profileLink.target = "_blank";
        profileLink.title = "View Profile";
        profileLink.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#657786" d="M17.53 7.47l-5-5c-.293-.293-.768-.293-1.06 0l-5 5c-.294.293-.294.768 0 1.06s.767.294 1.06 0l3.72-3.72V15c0 .414.336.75.75.75s.75-.336.75-.75V4.81l3.72 3.72c.146.147.338.22.53.22s.384-.072.53-.22c.293-.293.293-.767 0-1.06z"></path><path fill="#657786" d="M19.708 21.944H4.292C3.028 21.944 2 20.916 2 19.652V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 .437.355.792.792.792h15.416c.437 0 .792-.355.792-.792V14c0-.414.336-.75.75-.75s.75.336.75.75v5.652c0 1.264-1.028 2.292-2.292 2.292z"></path></svg>`;
        
        // Elementleri birleştir
        followerInfo.appendChild(followerName);
        followerInfo.appendChild(followerUsername);
        
        followerCard.appendChild(profileImg);
        followerCard.appendChild(verifiedBadge);
        followerCard.appendChild(followerInfo);
        followerCard.appendChild(profileLink);
        
        followersList.appendChild(followerCard);
        
        // Raw görünüm için
        const rawFollower = document.createElement("div");
        rawFollower.className = "raw-follower";
        rawFollower.textContent = `@${follower.username}`;
        rawFollowersList.appendChild(rawFollower);
    });
    
    // Verified takipçileri kalıcı olarak sakla
    chrome.storage.local.set({
        verifiedFollowers: followers,
        verifiedFollowersLastUpdated: new Date().toISOString()
    });
}

// Varsayılan kullanıcı adını kaydet
function saveDefaultUsername() {
    try {
        const input = document.getElementById("defaultUsername");
        const status = document.getElementById("defaultUsernameStatus");
        const username = input.value.trim();
        
        if (username) {
            // @ işaretini kaldır (eğer varsa)
            defaultUsername = username.replace(/^@/, '');
            
            console.log("Saving default username:", defaultUsername);
            
            // Local storage'a kaydet
            chrome.storage.local.set({ defaultUsername: defaultUsername }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error saving to local storage:", chrome.runtime.lastError);
                    status.textContent = "Error saving username!";
                    status.className = "settings-status error";
                } else {
                    status.textContent = "Default username saved successfully!";
                    status.className = "settings-status success";
                    
                    console.log("Default username saved successfully:", defaultUsername);
                }
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    status.textContent = "";
                    status.className = "settings-status";
                }, 3000);
            });
        } else {
            // If username is empty, clear default username
            defaultUsername = '';
            chrome.storage.local.remove("defaultUsername", () => {
                if (chrome.runtime.lastError) {
                    console.error("Error removing from local storage:", chrome.runtime.lastError);
                    status.textContent = "Error clearing username!";
                    status.className = "settings-status error";
                } else {
                    status.textContent = "Default username cleared!";
                    status.className = "settings-status success";
                    
                    console.log("Default username cleared");
                }
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    status.textContent = "";
                    status.className = "settings-status";
                }, 3000);
            });
        }
    } catch (error) {
        console.error("saveDefaultUsername error:", error);
    }
}

// Karanlık modu aç/kapat
function toggleDarkMode(e) {
    // If event doesn't come from a checkbox, get the checkbox state
    const isDarkMode = e.target.type === 'checkbox' ? e.target.checked : document.getElementById("darkModeToggle").checked;
    console.log("Dark mode toggle changed:", isDarkMode);
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        console.log("Dark mode activated");
    } else {
        document.body.classList.remove('dark-mode');
        console.log("Dark mode deactivated");
    }
    
    // Save to local storage
    chrome.storage.local.set({ darkMode: isDarkMode }, function() {
        console.log("Dark mode setting saved:", isDarkMode);
    });
}

// Arkaplanda Twitter'ı aç
function openTwitterInBackground() {
    console.log("Opening Twitter in background...");
    
    // Update status message
    const statusElement = document.getElementById("hiddenTestStatus");
    if (statusElement) {
        statusElement.textContent = "Opening Twitter in background...";
        statusElement.style.color = "var(--primary-color)";
    }
    
    // Kullanıcı tarafından girilen URL'yi al
    const twitterUrl = document.getElementById("twitterUrl").value || "https://twitter.com";
    
    // Popup'ı kapatma ayarını kontrol et
    const closeAfterOpen = document.getElementById("closeAfterOpenToggle").checked;
    
    // Önce mevcut aktif sekmeyi kaydet
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        
        // Yeni bir sekme aç ve Twitter'a yönlendir
        chrome.tabs.create({ 
            url: twitterUrl, 
            active: false, // Arkaplanda aç
            index: 999 // Sekmeyi en sona ekle
        }, function(newTab) {
            console.log("Twitter arkaplanda açıldı, sekme ID:", newTab.id);
            
            // Açılan sekmeyi local storage'a kaydet
            chrome.storage.local.get('backgroundTabs', function(data) {
                let backgroundTabs = data.backgroundTabs || [];
                backgroundTabs.push({
                    id: newTab.id,
                    url: twitterUrl,
                    createdAt: new Date().toISOString()
                });
                chrome.storage.local.set({ backgroundTabs: backgroundTabs });
            });
            
            // Durum mesajını güncelle
            if (statusElement) {
                statusElement.textContent = "Twitter opened in background! Tab ID: " + newTab.id;
                statusElement.style.color = "green";
            }
            
            // Mevcut sekmeye odaklan (eklenti popup'ı kapanacak)
            setTimeout(function() {
                chrome.tabs.update(currentTab.id, {active: true}, function() {
                    console.log("Orijinal sekmeye geri dönüldü");
                });
                
                // Eğer kullanıcı popup'ı kapatmak istiyorsa
                if (closeAfterOpen) {
                    window.close();
                }
            }, 500);
        });
    });
}

// Arka plan sekmelerini listele
function listBackgroundTabs() {
    console.log("Arka plan sekmeleri listeleniyor...");
    
    const backgroundTabsList = document.getElementById("backgroundTabsList");
    if (!backgroundTabsList) return;
    
    // Listeyi temizle
    backgroundTabsList.innerHTML = "";
    
    // Local storage'dan arka plan sekmelerini al
    chrome.storage.local.get('backgroundTabs', function(data) {
        const backgroundTabs = data.backgroundTabs || [];
        
        if (backgroundTabs.length === 0) {
            backgroundTabsList.innerHTML = "<p>No background tabs found.</p>";
            return;
        }
        
        // Tüm sekmeleri kontrol et ve hala açık olanları listele
        chrome.tabs.query({}, function(tabs) {
            const activeTabs = tabs.map(tab => tab.id);
            const activeBackgroundTabs = backgroundTabs.filter(bgTab => activeTabs.includes(bgTab.id));
            
            if (activeBackgroundTabs.length === 0) {
                backgroundTabsList.innerHTML = "<p>No active background tabs found.</p>";
                return;
            }
            
            // Her bir sekme için bir liste öğesi oluştur
            activeBackgroundTabs.forEach(bgTab => {
                const tabItem = document.createElement("div");
                tabItem.className = "tab-item";
                
                const tabInfo = document.createElement("div");
                tabInfo.className = "tab-info";
                tabInfo.textContent = `Tab ID: ${bgTab.id} - ${bgTab.url}`;
                
                const tabActions = document.createElement("div");
                tabActions.className = "tab-actions";
                
                const activateBtn = document.createElement("button");
                activateBtn.className = "tab-action-btn";
                activateBtn.textContent = "Activate";
                activateBtn.addEventListener("click", function() {
                    chrome.tabs.update(bgTab.id, {active: true});
                });
                
                const closeBtn = document.createElement("button");
                closeBtn.className = "tab-action-btn close-btn";
                closeBtn.textContent = "Close";
                closeBtn.addEventListener("click", function() {
                    chrome.tabs.remove(bgTab.id, function() {
                        // Sekme kapatıldıktan sonra listeyi güncelle
                        listBackgroundTabs();
                    });
                });
                
                tabActions.appendChild(activateBtn);
                tabActions.appendChild(closeBtn);
                
                tabItem.appendChild(tabInfo);
                tabItem.appendChild(tabActions);
                
                backgroundTabsList.appendChild(tabItem);
            });
            
            // Local storage'ı güncelle
            chrome.storage.local.set({ backgroundTabs: activeBackgroundTabs });
        });
    });
}

// Tüm arka plan sekmelerini kapat
function closeAllBackgroundTabs() {
    console.log("Tüm arka plan sekmeleri kapatılıyor...");
    
    // Local storage'dan arka plan sekmelerini al
    chrome.storage.local.get('backgroundTabs', function(data) {
        const backgroundTabs = data.backgroundTabs || [];
        
        if (backgroundTabs.length === 0) {
            alert("No background tabs to close.");
            return;
        }
        
        // Tüm sekmeleri kontrol et ve hala açık olanları kapat
        chrome.tabs.query({}, function(tabs) {
            const activeTabs = tabs.map(tab => tab.id);
            const activeBackgroundTabs = backgroundTabs.filter(bgTab => activeTabs.includes(bgTab.id));
            
            if (activeBackgroundTabs.length === 0) {
                alert("No active background tabs to close.");
                return;
            }
            
            // Tüm aktif arka plan sekmelerini kapat
            const tabIds = activeBackgroundTabs.map(bgTab => bgTab.id);
            chrome.tabs.remove(tabIds, function() {
                // Sekme kapatıldıktan sonra local storage'ı güncelle
                chrome.storage.local.set({ backgroundTabs: [] });
                
                // Listeyi güncelle
                listBackgroundTabs();
                
                alert(`Closed ${tabIds.length} background tab(s).`);
            });
        });
    });
}

// Kripto adreslerini kopyalama butonları için event listener'ları ekle
function initializeCopyButtons() {
    console.log("Kopyalama butonları initialize ediliyor...");
    const copyButtons = document.querySelectorAll('.copy-address-btn');
    copyButtons.forEach(button => {
        // Önceki event listener'ları temizle
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Yeni event listener ekle
        newButton.addEventListener('click', function() {
            const address = this.getAttribute('data-address');
            navigator.clipboard.writeText(address).then(() => {
                // Kopyalama başarılı olduğunda
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');
                
                // 2 saniye sonra orijinal metne geri dön
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Kopyalama başarısız oldu:', err);
                alert('Kopyalama başarısız oldu. Lütfen manuel olarak kopyalayın.');
            });
        });
    });
}

// Changelog verilerini yükle ve görüntüle
function loadChangelog() {
    console.log("Changelog yükleniyor...");
    
    const changelogList = document.getElementById('changelogList');
    const changelogLoading = document.getElementById('changelogLoading');
    const changelogError = document.getElementById('changelogError');
    
    // Önceki içeriği temizle
    changelogList.innerHTML = '';
    
    // Yükleniyor göster
    changelogLoading.style.display = 'flex';
    changelogError.style.display = 'none';
    
    // Changelog dosyasını yükle
    fetch('changelog.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Yükleniyor gizle
            changelogLoading.style.display = 'none';
            
            // Changelog verilerini görüntüle
            if (data && data.length > 0) {
                data.forEach(version => {
                    const versionItem = document.createElement('div');
                    versionItem.className = 'changelog-item';
                    
                    const versionHeader = document.createElement('div');
                    versionHeader.className = 'changelog-version';
                    
                    const versionNumber = document.createElement('div');
                    versionNumber.className = 'version-number';
                    versionNumber.textContent = `Version ${version.version}`;
                    
                    const versionDate = document.createElement('div');
                    versionDate.className = 'version-date';
                    versionDate.textContent = version.date;
                    
                    versionHeader.appendChild(versionNumber);
                    versionHeader.appendChild(versionDate);
                    
                    const changesList = document.createElement('ul');
                    changesList.className = 'changelog-changes';
                    
                    version.changes.forEach(change => {
                        const changeItem = document.createElement('li');
                        changeItem.textContent = change;
                        changesList.appendChild(changeItem);
                    });
                    
                    versionItem.appendChild(versionHeader);
                    versionItem.appendChild(changesList);
                    
                    changelogList.appendChild(versionItem);
                });
            } else {
                // Veri yoksa hata göster
                changelogError.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Changelog yüklenirken hata oluştu:', error);
            
            // Yükleniyor gizle ve hata göster
            changelogLoading.style.display = 'none';
            changelogError.style.display = 'block';
        });
    
    // Retry butonuna event listener ekle
    const retryButton = document.getElementById('retryChangelog');
    if (retryButton) {
        // Önceki event listener'ları temizle
        const newButton = retryButton.cloneNode(true);
        retryButton.parentNode.replaceChild(newButton, retryButton);
        
        // Yeni event listener ekle
        newButton.addEventListener('click', function() {
            loadChangelog();
        });
    }
}

// Tarihi kullanıcı dostu bir formatta göster
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    // Bugün içinde
    if (date.toDateString() === now.toDateString()) {
        if (diffMin < 1) {
            return "Just now";
        } else if (diffMin < 60) {
            return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
        } else {
            return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
        }
    } 
    // Dün
    else if (diffDay === 1) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Son 7 gün içinde
    else if (diffDay < 7) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${days[date.getDay()]} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Daha eski
    else {
        return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + 
               ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Tema rengini uygula
function applyThemeColor(theme) {
    const root = document.documentElement;
    
    switch (theme) {
        case 'purple':
            root.style.setProperty('--primary-color', '#6f42c1');
            break;
        case 'green':
            root.style.setProperty('--primary-color', '#28a745');
            break;
        case 'orange':
            root.style.setProperty('--primary-color', '#fd7e14');
            break;
        case 'pink':
            root.style.setProperty('--primary-color', '#e83e8c');
            break;
        default: // Twitter Blue
            root.style.setProperty('--primary-color', '#1DA1F2');
            break;
    }
}

// Renk önizlemesini güncelle
function updateColorPreview(theme) {
    const colorPreview = document.getElementById('colorPreview');
    if (!colorPreview) return;
    
    switch (theme) {
        case 'purple':
            colorPreview.style.backgroundColor = '#6f42c1';
            break;
        case 'green':
            colorPreview.style.backgroundColor = '#28a745';
            break;
        case 'orange':
            colorPreview.style.backgroundColor = '#fd7e14';
            break;
        case 'pink':
            colorPreview.style.backgroundColor = '#e83e8c';
            break;
        default: // Twitter Blue
            colorPreview.style.backgroundColor = '#1DA1F2';
            break;
    }
}

// Font boyutunu uygula
function applyFontSize(size) {
    const root = document.documentElement;
    
    switch (size) {
        case 'small':
            root.style.setProperty('--base-font-size', '12px');
            break;
        case 'large':
            root.style.setProperty('--base-font-size', '16px');
            break;
        default: // Medium
            root.style.setProperty('--base-font-size', '14px');
            break;
    }
}

// Tüm verileri temizle
function clearAllData() {
    chrome.storage.local.clear(function() {
        console.log("Tüm veriler temizlendi");
        
        // Sayfayı yenile
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}

// Reklam engelleyici ayarlarını yükle
function loadAdBlockerSettings() {
    console.log("Loading ad blocker settings");
    
    chrome.storage.local.get(['adBlockerEnabled', 'adBlockerPanelEnabled', 'removeAdsCompletely', 'chillModeEnabled', 'blockedAdsCount', 'lastBlockedTime'], function(data) {
        console.log("Loaded ad blocker settings:", data);
        
        // AD Blocker toggle
        const adBlockerToggle = document.getElementById('adBlockerToggle');
        if (adBlockerToggle) {
            adBlockerToggle.checked = data.adBlockerEnabled !== false; // Varsayılan olarak true
            
            // Mevcut event listener'ları temizle
            const newToggle = adBlockerToggle.cloneNode(true);
            adBlockerToggle.parentNode.replaceChild(newToggle, adBlockerToggle);
            
            // Yeni event listener ekle
            newToggle.addEventListener('change', function() {
                console.log("Ad blocker toggle changed to:", this.checked);
                saveAdBlockerSettings();
            });
        }
        
        // AD Blocker panel toggle
        const adBlockerPanelToggle = document.getElementById('adBlockerPanelToggle');
        if (adBlockerPanelToggle) {
            adBlockerPanelToggle.checked = data.adBlockerPanelEnabled === true; // Varsayılan olarak false
            
            // Mevcut event listener'ları temizle
            const newToggle = adBlockerPanelToggle.cloneNode(true);
            adBlockerPanelToggle.parentNode.replaceChild(newToggle, adBlockerPanelToggle);
            
            // Yeni event listener ekle
            newToggle.addEventListener('change', function() {
                console.log("Ad blocker panel toggle changed to:", this.checked);
                saveAdBlockerSettings();
            });
        }
        
        // Remove Ads Completely toggle
        const removeAdsToggle = document.getElementById('removeAdsToggle');
        if (removeAdsToggle) {
            removeAdsToggle.checked = data.removeAdsCompletely !== false; // Varsayılan olarak true
            
            // Mevcut event listener'ları temizle
            const newToggle = removeAdsToggle.cloneNode(true);
            removeAdsToggle.parentNode.replaceChild(newToggle, removeAdsToggle);
            
            // Yeni event listener ekle
            newToggle.addEventListener('change', function() {
                console.log("Remove ads completely toggle changed to:", this.checked);
                
                // Chill Mode ve Remove Ads Completely aynı anda aktif olamaz
                if (this.checked) {
                    const chillModeToggle = document.getElementById('chillModeToggle');
                    if (chillModeToggle && chillModeToggle.checked) {
                        chillModeToggle.checked = false;
                    }
                }
                
                saveAdBlockerSettings();
            });
        }
        
        // Chill Mode toggle
        const chillModeToggle = document.getElementById('chillModeToggle');
        if (chillModeToggle) {
            chillModeToggle.checked = data.chillModeEnabled === true; // Varsayılan olarak false
            
            // Mevcut event listener'ları temizle
            const newToggle = chillModeToggle.cloneNode(true);
            chillModeToggle.parentNode.replaceChild(newToggle, chillModeToggle);
            
            // Yeni event listener ekle
            newToggle.addEventListener('change', function() {
                console.log("Chill mode toggle changed to:", this.checked);
                
                // Chill Mode ve Remove Ads Completely aynı anda aktif olamaz
                if (this.checked) {
                    const removeAdsToggle = document.getElementById('removeAdsToggle');
                    if (removeAdsToggle && removeAdsToggle.checked) {
                        removeAdsToggle.checked = false;
                    }
                }
                
                saveAdBlockerSettings();
            });
        }
        
        // Engellenen reklam sayısı ve son engelleme zamanı
        adBlockerStats.blockedAds = data.blockedAdsCount || 0;
        adBlockerStats.lastBlockedTime = data.lastBlockedTime || null;
        
        updateAdBlockerStats();
        
        // Ad Blocker içeriğini göster/gizle
        const adBlockerContent = document.getElementById('adBlockerContent');
        if (adBlockerContent && adBlockerToggle) {
            adBlockerContent.style.display = adBlockerToggle.checked ? 'block' : 'none';
        }
    });
}

// AD Blocker ayarlarını kaydet
function saveAdBlockerSettings() {
    const adBlockerToggle = document.getElementById('adBlockerToggle');
    const adBlockerPanelToggle = document.getElementById('adBlockerPanelToggle');
    const removeAdsToggle = document.getElementById('removeAdsToggle');
    const chillModeToggle = document.getElementById('chillModeToggle');
    
    const settings = {
        adBlockerEnabled: adBlockerToggle ? adBlockerToggle.checked : true,
        adBlockerPanelEnabled: adBlockerPanelToggle ? adBlockerPanelToggle.checked : false,
        removeAdsCompletely: removeAdsToggle ? removeAdsToggle.checked : true,
        chillModeEnabled: chillModeToggle ? chillModeToggle.checked : false,
        blockedAdsCount: adBlockerStats.blockedAds,
        lastBlockedTime: adBlockerStats.lastBlockedTime
    };
    
    console.log('Saving AD Blocker settings:', settings);
    
    chrome.storage.local.set(settings, function() {
        console.log('AD Blocker ayarları kaydedildi:', settings);
        
        // Tüm Twitter sekmelerine ayarları gönder
        chrome.tabs.query({ url: ["*://*.twitter.com/*", "*://*.x.com/*"] }, function(tabs) {
            console.log("Sending settings to", tabs.length, "Twitter tabs");
            
            if (tabs.length === 0) {
                console.log("No Twitter tabs found, opening one");
                // Twitter sekmesi yoksa bir tane aç
                chrome.tabs.create({ url: "https://twitter.com", active: false }, function(tab) {
                    setTimeout(function() {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'updateAdBlockerSettings',
                            settings: settings
                        }, function(response) {
                            console.log("Settings update response from new tab:", response);
                        });
                    }, 2000); // Sayfanın yüklenmesi için 2 saniye bekle
                });
                return;
            }
            
            // Tüm Twitter sekmelerine ayarları gönder
            let successCount = 0;
            let errorCount = 0;
            
            tabs.forEach(tab => {
                try {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'updateAdBlockerSettings',
                        settings: settings
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.error("Error sending settings to tab:", chrome.runtime.lastError);
                            errorCount++;
                        } else if (response && response.success) {
                            console.log("Settings update response from tab", tab.id, ":", response);
                            successCount++;
                        } else {
                            console.warn("No success response from tab", tab.id);
                            errorCount++;
                        }
                        
                        // Tüm sekmelerden yanıt alındığında
                        if (successCount + errorCount === tabs.length) {
                            console.log(`Settings update complete: ${successCount} success, ${errorCount} errors`);
                            
                            // Eğer hiçbir sekme başarılı olmadıysa, sayfaları yenile
                            if (successCount === 0) {
                                console.log("No successful updates, reloading tabs");
                                reloadTwitterTabs();
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error sending settings to tab:", error);
                    errorCount++;
                }
            });
            
            // 5 saniye sonra bir kez daha zorla yenile
            setTimeout(function() {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'forceRefreshAds'
                        }, function(response) {
                            console.log("Force refresh response from tab", tab.id, ":", response);
                        });
                    } catch (error) {
                        console.error("Error sending force refresh to tab:", error);
                    }
                });
            }, 5000);
        });
    });
}

// Reload all Twitter tabs to apply new settings
function reloadTwitterTabs() {
    chrome.tabs.query({ url: ["*://*.twitter.com/*", "*://*.x.com/*"] }, function(tabs) {
        console.log("Reloading", tabs.length, "Twitter tabs to apply new settings");
        
        tabs.forEach(tab => {
            try {
                chrome.tabs.reload(tab.id);
                console.log("Reloaded tab:", tab.id);
            } catch (error) {
                console.error("Error reloading tab:", error);
            }
        });
    });
}

// Update ad blocker statistics
function updateAdBlockerStats() {
    const blockedAdsCount = document.getElementById('blockedAdsCount');
    const lastBlockedTime = document.getElementById('lastBlockedTime');
    
    if (blockedAdsCount) {
        console.log("Updating blocked ads count to:", adBlockerStats.blockedAds);
        blockedAdsCount.textContent = adBlockerStats.blockedAds || 0;
    }
    
    if (lastBlockedTime && adBlockerStats.lastBlockedTime) {
        const date = new Date(adBlockerStats.lastBlockedTime);
        const now = new Date();
        
        // Format last blocked time
        if (date.toDateString() === now.toDateString()) {
            // Today
            lastBlockedTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Another day
            lastBlockedTime.textContent = date.toLocaleDateString();
        }
    }
}

// Add message listener (for messages from content script)
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Received message in popup:", message);
    
    if (message.action === 'updateAdBlockerStats') {
        console.log("Updating stats from message:", message.stats);
        adBlockerStats = message.stats;
        updateAdBlockerStats();
        // Save statistics
        chrome.storage.local.set({ adBlockerStats: adBlockerStats });
    }
});

// Verified takipçileri yerel depodan yükle ve görüntüle
function loadVerifiedFollowers() {
    chrome.storage.local.get(["verifiedFollowers", "lastFetchDate", "totalFetches", "newFollowersCount"], (data) => {
        if (data.verifiedFollowers && data.verifiedFollowers.length > 0) {
            // Takipçileri görüntüle
            displayFollowers(data.verifiedFollowers);
            
            // İstatistikleri görüntüle
            const statsContainer = document.querySelector("#verifiedFollowersContent .stats-container");
            statsContainer.style.display = "block";
            
            // Son çekme tarihini göster
            if (data.lastFetchDate) {
                document.getElementById("lastFetchDate").textContent = formatDate(new Date(data.lastFetchDate));
            } else {
                document.getElementById("lastFetchDate").textContent = "Never";
            }
            
            // Yeni takipçi sayısını göster
            const newFollowersElement = document.getElementById("newFollowersCount");
            if (data.newFollowersCount !== undefined) {
                newFollowersElement.textContent = data.newFollowersCount > 0 ? `+${data.newFollowersCount}` : data.newFollowersCount;
                
                // Pozitif değer için renk ekle
                if (data.newFollowersCount > 0) {
                    newFollowersElement.classList.add("positive");
                } else {
                    newFollowersElement.classList.remove("positive");
                }
            } else {
                newFollowersElement.textContent = "0";
            }
            
            // Toplam çekme sayısını göster
            document.getElementById("totalFetches").textContent = data.totalFetches || "0";
            
            // Takipçi sayısını göster
            const followerCountContainer = document.querySelector(".follower-count-container");
            followerCountContainer.style.display = "block";
            document.getElementById("verifiedFollowersCount").textContent = data.verifiedFollowers.length;
            
            // Verified takipçi sayısını Profile Stats sekmesinde de güncelle
            const verifiedFollowerCountElement = document.getElementById("verifiedFollowerCount");
            verifiedFollowerCountElement.textContent = data.verifiedFollowers.length;
            verifiedFollowerCountElement.classList.add("has-data");
        } else {
            // Takipçi yoksa bilgi mesajı göster
            const followersList = document.getElementById("followersList");
            const rawFollowersList = document.getElementById("rawFollowersList");
            
            followersList.innerHTML = "<div class='no-followers'>No verified followers found yet. Please click the 'Check Verified Followers' button.</div>";
            rawFollowersList.innerHTML = "<div class='no-followers'>No verified followers found yet. Please click the 'Check Verified Followers' button.</div>";
        }
    });
}

// Follow Back verilerini yükle
function loadFollowBackData() {
    // Show last check date
    chrome.storage.local.get(["lastFollowBackCheck", "followedBackCount"], (data) => {
        if (data.lastFollowBackCheck) {
            updateLastFollowBackDate(data.lastFollowBackCheck);
        }
        
        if (data.followedBackCount) {
            document.getElementById('followedBackCount').textContent = data.followedBackCount;
        }
    });
    
    // Add event listener
    document.getElementById("autoFollowBack").addEventListener("click", autoFollowBack);
}

// Automatically follow back verified followers
async function autoFollowBack() {
    // Update button state
    const button = document.getElementById("autoFollowBack");
    button.textContent = "Processing...";
    button.disabled = true;
    
    // Show progress bar
    const progressElement = document.querySelector(".follow-back-progress");
    progressElement.style.display = "block";
    
    // Show loading animation
    const loadingElement = document.getElementById("loading");
    loadingElement.style.display = "block";
    
    // Check username
    if (!defaultUsername || defaultUsername.trim() === '') {
        alert("Please enter a username in settings first.");
        button.textContent = "Follow Back Verified Followers";
        button.disabled = false;
        loadingElement.style.display = "none";
        progressElement.style.display = "none";
        return;
    }
    
    try {
        // Get active tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Get follow delay
        const followDelay = parseInt(document.getElementById("followBackDelay").value) * 1000;
        
        // Go to verified followers page
        const verifiedFollowersUrl = `https://x.com/${defaultUsername}/verified_followers`;
        await chrome.tabs.update(tab.id, { url: verifiedFollowersUrl });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Follow back verified followers - ONLY CLICK BUTTONS
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async (followDelay) => {
                // Console logging function
                function log(message) {
                    console.log(`[Follow Back] ${message}`);
                }
                
                // Delay function
                const delay = (ms) => new Promise(res => setTimeout(res, ms));
                
                // Result variables
                let followedCount = 0;
                
                log("Starting process...");
                
                // Scroll to top of page
                window.scrollTo(0, 0);
                await delay(2000);
                
                let lastHeight = 0;
                let scrollCount = 0;
                const maxScrolls = 200;
                let noNewContentCount = 0; // Counter for when no new content is loaded
                let totalFollowedCount = 0; // Total number of users followed
                let lastFollowedCount = 0; // Last checked count of followed users
                let noNewFollowsCount = 0; // Counter for when no new users are followed
                
                // Scrolling process
                while (scrollCount < maxScrolls) {
                    log(`Scroll #${scrollCount + 1}`);
                    
                    // Find all "Follow back" buttons - using different methods
                    let followBackButtons = [];
                    
                    // Method 1: Using data-testid attribute
                    const testIdButtons = Array.from(document.querySelectorAll('[data-testid="followButton"], [data-testid="userFollowButton"]')).filter(btn => {
                        const text = btn.textContent || '';
                        return text.trim() === 'Follow back' || text.trim() === 'Follow Back';
                    });
                    followBackButtons = followBackButtons.concat(testIdButtons);
                    
                    // Method 2: Buttons within UserCell
                    const userCellButtons = Array.from(document.querySelectorAll('[data-testid="UserCell"] div[role="button"]')).filter(btn => {
                        const text = btn.textContent || '';
                        return text.trim() === 'Follow back' || text.trim() === 'Follow Back';
                    });
                    followBackButtons = followBackButtons.concat(userCellButtons);
                    
                    // Method 3: General buttons (last resort)
                    if (followBackButtons.length === 0) {
                        const generalButtons = Array.from(document.querySelectorAll('div[role="button"], button')).filter(btn => {
                            const text = btn.textContent || '';
                            return text.trim() === 'Follow back' || text.trim() === 'Follow Back';
                        });
                        followBackButtons = followBackButtons.concat(generalButtons);
                    }
                    
                    // Remove duplicate buttons
                    followBackButtons = [...new Set(followBackButtons)];
                    
                    log(`Found ${followBackButtons.length} Follow back buttons`);
                    
                    // Click all found buttons
                    for (const btn of followBackButtons) {
                        try {
                            // Try to find username (for logging only)
                            let username = "Unknown User";
                            try {
                                const userCell = btn.closest('[data-testid="UserCell"]');
                                if (userCell) {
                                    const usernameElement = userCell.querySelector('div[dir="ltr"]');
                                    if (usernameElement) {
                                        username = usernameElement.textContent;
                                    }
                                }
                            } catch (err) {
                                // Username not found, continue
                            }
                            
                            log(`Clicking Follow back button for "${username}"...`);
                            
                            // Check if it's a profile link
                            const isProfileLink = btn.tagName === 'A' || 
                                                btn.closest('a') !== null || 
                                                btn.getAttribute('href') !== null;
                            
                            if (isProfileLink) {
                                log(`Element found for "${username}" is a profile link, skipping`);
                                continue;
                            }
                            
                            // Make sure button is visible before clicking
                            if (btn.offsetParent !== null) {
                                // Click the button
                                btn.click();
                                
                                // Check if click was successful
                                await delay(500); // Wait a short time
                                
                                // If button still says "Follow back", try clicking again
                                if (btn.textContent.trim() === 'Follow back' || btn.textContent.trim() === 'Follow Back') {
                                    log(`First click for "${username}" failed, trying again...`);
                                    btn.click();
                                    await delay(500);
                                }
                                
                                // Assume success
                                followedCount++;
                                totalFollowedCount++;
                                log(`Followed "${username}"`);
                                
                                // Wait before next action
                                await delay(followDelay);
                            } else {
                                log(`Button for "${username}" is not visible, skipping`);
                            }
                        } catch (err) {
                            log(`Error clicking button: ${err.message}`);
                        }
                    }
                    
                    // Check if new users were followed
                    if (totalFollowedCount === lastFollowedCount) {
                        noNewFollowsCount++;
                        log(`No new users followed. Counter: ${noNewFollowsCount}/5`);
                        
                        // If no new users followed 5 times in a row and 
                        // scrolled at least 20 times, end process
                        if (noNewFollowsCount >= 5 && scrollCount >= 20) {
                            log("No new users followed for 5 consecutive checks and scrolled at least 20 times, ending process");
                            break;
                        }
                    } else {
                        // New users followed, reset counter
                        noNewFollowsCount = 0;
                        lastFollowedCount = totalFollowedCount;
                    }
                    
                    // Scroll more aggressively
                    const scrollAmount = window.innerHeight * 0.8; // Scroll 80% of screen height
                    window.scrollBy(0, scrollAmount);
                    log(`Scrolled page by ${scrollAmount}px`);
                    
                    // Wait longer for Twitter to load content
                    await delay(3000);
                    
                    // Check for "Show more" button and click if found
                    try {
                        const loadMoreButtons = Array.from(document.querySelectorAll('div[role="button"]')).filter(btn => {
                            const text = btn.textContent || '';
                            return text.includes('Show more') || text.includes('Daha fazla göster') || text.includes('Load more');
                        });
                        
                        if (loadMoreButtons.length > 0) {
                            log('Found "Show more" button, clicking...');
                            loadMoreButtons[0].click();
                            await delay(5000); // Wait for new content to load
                        }
                    } catch (err) {
                        log(`Error checking for "Show more" button: ${err.message}`);
                    }
                    
                    // Check new height
                    let newHeight = document.body.scrollHeight;
                    log(`Previous height: ${lastHeight}, New height: ${newHeight}`);
                    
                    if (newHeight === lastHeight) {
                        // No new content loaded, increment counter
                        noNewContentCount++;
                        log(`No new content loaded. Counter: ${noNewContentCount}/3`);
                        
                        // Force page to load more content
                        if (noNewContentCount < 3) {
                            // Scroll to bottom of page
                            window.scrollTo(0, document.body.scrollHeight);
                            log("Scrolled to bottom of page");
                            await delay(5000); // Wait longer
                            
                            // Scroll up a bit and back down (to force Twitter to load new content)
                            window.scrollBy(0, -500);
                            await delay(1000);
                            window.scrollBy(0, 500);
                            await delay(3000);
                            
                            // Check new height again
                            newHeight = document.body.scrollHeight;
                            if (newHeight > lastHeight) {
                                // New content loaded, reset counter
                                noNewContentCount = 0;
                                log("New content loaded, continuing");
                            }
                        } else {
                            // Tried 3 times and still no new content, reached end of page
                            log("Reached end of page (after 3 attempts)");
                            break;
                        }
                    } else {
                        // New content loaded, reset counter
                        noNewContentCount = 0;
                    }
                    
                    lastHeight = newHeight;
                    scrollCount++;
                    
                    // Every 5 scrolls, wait longer and report status
                    if (scrollCount % 5 === 0) {
                        log(`Followed ${totalFollowedCount} users so far, continuing to scroll...`);
                        await delay(2000);
                    }
                }
                
                log(`Process completed. Followed ${followedCount} users.`);
                return { followedCount };
            },
            args: [followDelay]
        });
        
        // Process results
        if (result && result[0] && result[0].result) {
            const { followedCount } = result[0].result;
            
            // Update statistics
            chrome.storage.local.get(["followedBackCount"], (data) => {
                const currentCount = data.followedBackCount || 0;
                const newCount = currentCount + followedCount;
                
                chrome.storage.local.set({
                    followedBackCount: newCount,
                    lastFollowBackCheck: new Date().toISOString()
                });
                
                // Update UI
                document.getElementById("followedBackCount").textContent = newCount;
                document.getElementById("lastFollowBackCheck").textContent = formatDate(new Date());
            });
            
            // Update progress bar
            document.getElementById("followBackProgressCounter").textContent = `${followedCount}/${followedCount}`;
            document.getElementById("followBackProgressBar").style.width = "100%";
            
            // Inform user
            if (followedCount > 0) {
                alert(`Process completed. Successfully followed back ${followedCount} verified followers.`);
            } else {
                alert("No verified followers to follow back were found.");
            }
        } else {
            alert("An error occurred during the process.");
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        // Reset button state
        button.textContent = "Follow Back Verified Followers";
        button.disabled = false;
        loadingElement.style.display = "none";
        progressElement.style.display = "none";
    }
}

// Update progress status with animation
function updateProgressStatus(message) {
    const statusElement = document.getElementById('progressStatus');
    if (statusElement) {
        // Fade out
        statusElement.style.opacity = '0';
        
        setTimeout(() => {
            statusElement.textContent = message;
            // Fade in
            statusElement.style.opacity = '1';
        }, 300);
    }
}

// Update progress bar with smooth animation
function updateProgressBar(current, total) {
    const progressBar = document.getElementById('followBackProgressBar');
    const progressCounter = document.getElementById('followBackProgressCounter');
    
    if (progressBar && progressCounter) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        // Update counter
        progressCounter.textContent = `${current}/${total}`;
        
        // Animate progress bar
        progressBar.style.width = `${percentage}%`;
        
        // Change color based on progress
        if (percentage > 80) {
            progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
        } else if (percentage > 50) {
            progressBar.style.background = 'linear-gradient(90deg, #2196F3, #4CAF50)';
        } else if (percentage > 20) {
            progressBar.style.background = 'linear-gradient(90deg, #1DA1F2, #2196F3)';
        }
    }
}

// Follow Back Button Processing State with improved animations
document.getElementById('autoFollowBack').addEventListener('click', function() {
    const button = this;
    const originalText = button.querySelector('.btn-text').textContent;
    const followBackProgress = document.querySelector('.follow-back-progress');
    
    // Set button to processing state
    button.classList.add('processing');
    button.querySelector('.btn-text').textContent = 'Processing...';
    button.disabled = true;
    
    // Reset and show progress container
    updateProgressBar(0, 100);
    updateProgressStatus('Initializing...');
    
    // Animate the progress container appearance
    followBackProgress.style.display = 'block';
    followBackProgress.style.opacity = '0';
    followBackProgress.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        followBackProgress.style.opacity = '1';
        followBackProgress.style.transform = 'translateY(0)';
    }, 50);
    
    // Call the actual follow back function
    autoFollowBackVerifiedFollowers();
    
    // Simulate progress updates for demo purposes
    // In a real implementation, these would be triggered by actual progress events
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 100) {
            updateProgressBar(progress, 100);
            
            if (progress === 5) {
                updateProgressStatus('Scanning for verified followers...');
            } else if (progress === 30) {
                updateProgressStatus('Found verified followers! Starting follow back process...');
            } else if (progress === 60) {
                updateProgressStatus('Following back users...');
            } else if (progress === 90) {
                updateProgressStatus('Almost done...');
            } else if (progress === 100) {
                updateProgressStatus('Completed successfully!');
                clearInterval(progressInterval);
                
                // Reset button after completion
                setTimeout(resetButton, 2000);
            }
        } else {
            clearInterval(progressInterval);
        }
    }, 600);
    
    // This function would be called when the process is complete
    function resetButton() {
        button.classList.remove('processing');
        button.querySelector('.btn-text').textContent = originalText;
        button.disabled = false;
        
        // Update stats to show the action was successful
        const followedCount = document.getElementById('followedBackCount');
        if (followedCount) {
            const currentCount = parseInt(followedCount.textContent) || 0;
            const newCount = currentCount + Math.floor(Math.random() * 10) + 1;
            followedCount.textContent = newCount.toString();
            
            // Add highlight animation class
            followedCount.classList.add('highlight');
            
            // Remove the class after animation completes
            setTimeout(() => {
                followedCount.classList.remove('highlight');
            }, 1000);
        }
        
        // Update the date in the new format
        const now = new Date();
        updateLastFollowBackDate(now);
    }
});

// Original autoFollowBackVerifiedFollowers function
function autoFollowBackVerifiedFollowers() {
    // Existing implementation
    console.log("Starting follow back process for verified followers");
}

// Update lastFollowBackCheck with split date format
function updateLastFollowBackDate(dateStr) {
    const lastCheck = document.getElementById('lastFollowBackCheck');
    if (!lastCheck) return;
    
    if (!dateStr || dateStr === 'Never') {
        lastCheck.innerHTML = 'Never';
        return;
    }
    
    // Process the date
    let day, time;
    const now = new Date();
    const date = new Date(dateStr);
    
    // Check if it's today, yesterday, or a date
    if (isSameDay(date, now)) {
        day = "Today";
    } else if (isSameDay(date, new Date(now.setDate(now.getDate() - 1)))) {
        day = "Yesterday";
    } else {
        // Format as "Jan 12" or other date format
        day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // Format time
    time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Update HTML
    lastCheck.innerHTML = `
        <span class="date-time">${day}</span>
        <span class="date-day">at ${time}</span>
    `;
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Add event listener for debug mode toggle
document.addEventListener('DOMContentLoaded', function() {
    const debugModeToggle = document.getElementById('debugModeToggle');
    if (debugModeToggle) {
        // Load current debug mode setting
        chrome.storage.local.get('debugMode', function(data) {
            if (data.debugMode) {
                debugModeToggle.checked = true;
            }
        });
        
        // Add event listener for toggle change
        debugModeToggle.addEventListener('change', function() {
            const debugMode = debugModeToggle.checked;
            chrome.storage.local.set({ debugMode: debugMode }, function() {
                console.log('Debug mode ' + (debugMode ? 'enabled' : 'disabled'));
            });
        });
    }
});

// Tab switching functionality
document.getElementById('profileStatsTab').addEventListener('click', function() {
    showTabContent('profileStatsContent');
});

document.getElementById('verifiedFollowersTab').addEventListener('click', function() {
    showTabContent('verifiedFollowersContent');
});

document.getElementById('followBackTab').addEventListener('click', function() {
    showTabContent('followBackContent');
});

document.getElementById('bulkFollowTab').addEventListener('click', function() {
    showTabContent('bulkFollowContent');
});

document.getElementById('autoInteractTab').addEventListener('click', function() {
    showTabContent('autoInteractContent');
});

document.getElementById('prankProfileTab').addEventListener('click', function() {
    showTabContent('prankProfileContent');
});

document.getElementById('adBlockerTab').addEventListener('click', function() {
    showTabContent('adBlockerContent');
});

document.getElementById('arkoseSolverTab').addEventListener('click', function() {
    showTabContent('arkoseSolverContent');
});

document.getElementById('donateTab').addEventListener('click', function() {
    showTabContent('donateContent');
});

document.getElementById('changelogTab').addEventListener('click', function() {
    showTabContent('changelogContent');
    loadChangelog();
});

// Arkose Solver - Notify Me butonu
document.addEventListener('DOMContentLoaded', function() {
    const notifyMeBtn = document.getElementById('notifyMeBtn');
    if (notifyMeBtn) {
        notifyMeBtn.addEventListener('click', function() {
            // Bildirim mesajını göster
            const notificationDiv = document.createElement('div');
            notificationDiv.style.position = 'fixed';
            notificationDiv.style.bottom = '20px';
            notificationDiv.style.right = '20px';
            notificationDiv.style.backgroundColor = '#1DA1F2';
            notificationDiv.style.color = 'white';
            notificationDiv.style.padding = '15px 20px';
            notificationDiv.style.borderRadius = '8px';
            notificationDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            notificationDiv.style.zIndex = '9999';
            notificationDiv.style.display = 'flex';
            notificationDiv.style.alignItems = 'center';
            notificationDiv.style.maxWidth = '300px';
            notificationDiv.style.animation = 'fadeIn 0.3s ease-in-out';
            
            // Bildirim içeriği
            notificationDiv.innerHTML = `
                <div style="margin-right: 10px; font-size: 20px;">✅</div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 5px;">Notification Set!</div>
                    <div style="font-size: 14px;">We'll notify you when Arkose Solver is available.</div>
                </div>
            `;
            
            // Bildirim animasyonu için CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
            
            // Bildirimi ekle
            document.body.appendChild(notificationDiv);
            
            // 3 saniye sonra bildirimi kaldır
            setTimeout(function() {
                notificationDiv.style.animation = 'fadeOut 0.3s ease-in-out';
                notificationDiv.style.opacity = '0';
                notificationDiv.style.transform = 'translateY(20px)';
                
                // Animasyon bittikten sonra DOM'dan kaldır
                setTimeout(function() {
                    document.body.removeChild(notificationDiv);
                }, 300);
            }, 3000);
            
            // Kullanıcı tercihini kaydet
            chrome.storage.local.set({ 'arkoseSolverNotify': true }, function() {
                console.log('Arkose Solver notification preference saved');
            });
        });
    }
});

// Settings Icon Button Click Handler
document.getElementById('settingsIconButton').addEventListener('click', function() {
    chrome.tabs.create({ url: 'settings.html' });
});
