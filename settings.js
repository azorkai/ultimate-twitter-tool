// DOM içeriği yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    console.log("Settings sayfası yüklendi");
    
    // DOM elementlerini tanımla
    const defaultUsernameInput = document.getElementById('defaultUsername');
    const saveDefaultUsernameBtn = document.getElementById('saveDefaultUsername');
    const defaultUsernameStatus = document.getElementById('defaultUsernameStatus');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const themeColorSelect = document.getElementById('themeColorSelect');
    const colorPreview = document.getElementById('colorPreview');
    const compactViewToggle = document.getElementById('compactViewToggle');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const soundToggle = document.getElementById('soundToggle');
    const saveHistoryToggle = document.getElementById('saveHistoryToggle');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const showTestTab = document.getElementById('showTestTab');
    const debugModeToggle = document.getElementById('debugModeToggle');
    const backButton = document.getElementById('backButton');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const settingsLayout = document.querySelector('.settings-layout');
    
    // Ayarları yükle
    loadSettings();
    
    // Bölüm değiştirme fonksiyonu - bu fonksiyonu her bir menü öğesine tıklama olayında kullanacağız
    function switchSection(sectionId) {
        // Tüm bölümleri gizle
        sections.forEach(function(section) {
            section.classList.remove('active');
        });
        
        // Seçilen bölümü göster
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
            console.log(`${sectionId} bölümü gösteriliyor`);
        } else {
            console.error(`${sectionId} ID'li bölüm bulunamadı`);
        }
    }
    
    // Sayfa ilk yüklendiğinde varsayılan bölümü göster
    function showDefaultSection() {
        // Aktif navigasyon öğesini bul
        const activeNavItem = document.querySelector('.nav-item.active');
        
        if (activeNavItem) {
            const sectionId = activeNavItem.getAttribute('data-section');
            switchSection(sectionId);
        } else if (navItems.length > 0) {
            // Aktif öğe yoksa ilk öğeyi aktif yap
            navItems[0].classList.add('active');
            const sectionId = navItems[0].getAttribute('data-section');
            switchSection(sectionId);
        }
    }
    
    // Navigation butonları için event listener ekle
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Tüm navigasyon öğelerinden active sınıfını kaldır
            navItems.forEach(function(navItem) {
                navItem.classList.remove('active');
            });
            
            // Tıklanan öğeye active sınıfını ekle
            this.classList.add('active');
            
            // Gösterilecek bölümü al
            const sectionId = this.getAttribute('data-section');
            switchSection(sectionId);
            
            // Mobilde menüyü gizle
            if (window.innerWidth <= 768) {
                settingsLayout.classList.remove('mobile-menu-visible');
            }
        });
    });
    
    // Mobile menu toggle functionality
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            settingsLayout.classList.toggle('mobile-menu-visible');
        });
    }
    
    // Geri butonu için event listener
    backButton.addEventListener('click', function() {
        // Popup sayfasına geri dön
        window.close();
    });
    
    // Tema rengini güncelle ve önizleme
    function updateColorPreview() {
        const selectedColor = themeColorSelect.value;
        let previewColor = '#1DA1F2'; // Twitter Blue (varsayılan)
        
        switch (selectedColor) {
            case 'purple':
                previewColor = '#6f42c1';
                break;
            case 'green':
                previewColor = '#28a745';
                break;
            case 'orange':
                previewColor = '#fd7e14';
                break;
            case 'pink':
                previewColor = '#e83e8c';
                break;
            default:
                previewColor = '#1DA1F2'; // Twitter Blue
        }
        
        colorPreview.style.backgroundColor = previewColor;
        document.documentElement.style.setProperty('--primary-color', previewColor);
    }
    
    // Renk seçimi değiştiğinde önizleme güncelle
    themeColorSelect.addEventListener('change', function() {
        updateColorPreview();
        saveSettings();
        showSuccessMessage("Tema rengi değiştirildi");
    });
    
    // Karanlık modu değiştir
    darkModeToggle.addEventListener('change', function() {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            showSuccessMessage("Karanlık mod aktif");
        } else {
            document.body.classList.remove('dark-mode');
            showSuccessMessage("Açık mod aktif");
        }
        saveSettings();
    });
    
    // Kompakt görünümü değiştir
    compactViewToggle.addEventListener('change', function() {
        saveSettings();
        showSuccessMessage("Kompakt görünüm ayarı kaydedildi");
    });
    
    // Font boyutunu değiştir
    fontSizeSelect.addEventListener('change', function() {
        applyFontSize(fontSizeSelect.value);
        saveSettings();
        showSuccessMessage("Font boyutu değiştirildi");
    });
    
    // Bildirim ayarlarını değiştir
    notificationsToggle.addEventListener('change', function() {
        if (notificationsToggle.checked && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        saveSettings();
        showSuccessMessage("Bildirim ayarları güncellendi");
    });
    
    // Ses ayarlarını değiştir
    soundToggle.addEventListener('change', function() {
        saveSettings();
        showSuccessMessage("Ses ayarları güncellendi");
    });
    
    // Geçmiş kaydetme ayarlarını değiştir
    saveHistoryToggle.addEventListener('change', function() {
        saveSettings();
        showSuccessMessage("Geçmiş kaydetme ayarları güncellendi");
    });
    
    // Debug modu ayarlarını değiştir
    debugModeToggle.addEventListener('change', function() {
        saveSettings();
        showSuccessMessage("Debug modu ayarları güncellendi");
    });
    
    // Varsayılan kullanıcı adını kaydet
    saveDefaultUsernameBtn.addEventListener('click', function() {
        const username = defaultUsernameInput.value.trim();
        
        if (username) {
            chrome.storage.local.set({ defaultUsername: username }, function() {
                defaultUsernameStatus.textContent = 'Kaydedildi!';
                defaultUsernameStatus.classList.add('success');
                defaultUsernameStatus.classList.remove('error');
                
                // Başarı mesajını birkaç saniye sonra temizle
                setTimeout(function() {
                    defaultUsernameStatus.textContent = '';
                }, 3000);
                
                showSuccessMessage("Kullanıcı adı kaydedildi");
            });
        } else {
            defaultUsernameStatus.textContent = 'Lütfen bir kullanıcı adı girin';
            defaultUsernameStatus.classList.add('error');
            defaultUsernameStatus.classList.remove('success');
        }
    });
    
    // Test sekmesini göster/gizle
    showTestTab.addEventListener('click', function() {
        chrome.storage.local.set({ showTestTab: true }, function() {
            showNotification('Test sekmesi artık görünür. Değişikliği görmek için lütfen eklenti popup\'ını yeniden açın.');
        });
    });
    
    // Tüm verileri temizle
    clearDataBtn.addEventListener('click', function() {
        if (confirm('Tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
            chrome.storage.local.clear(function() {
                showNotification('Tüm veriler temizlendi. Eklenti varsayılan ayarlarla yeniden yüklenecek.');
                loadSettings(); // Varsayılan ayarları yükle
            });
        }
    });
    
    // Başarı mesajı göster
    function showSuccessMessage(message) {
        const notification = createNotification(message, 'success');
        showNotification(notification);
    }
    
    // Hata mesajı göster
    function showErrorMessage(message) {
        const notification = createNotification(message, 'error');
        showNotification(notification);
    }
    
    // Bildirim oluştur
    function createNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;
        
        // CSS stili ekle
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 25px';
        notification.style.color = 'white';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        notification.style.zIndex = '9999';
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Arka plan rengini ayarla
        if (type === 'success') {
            notification.style.backgroundColor = '#17bf63';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#e0245e';
        } else {
            notification.style.backgroundColor = 'rgba(29, 161, 242, 0.9)';
        }
        
        return notification;
    }
    
    // Bildirim göster
    function showNotification(message) {
        let notification;
        
        if (typeof message === 'string') {
            notification = createNotification(message);
        } else {
            notification = message;
        }
        
        document.body.appendChild(notification);
        
        // Animasyonları etkinleştir
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Belli bir süre sonra kaldır
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            // Animasyon bittikten sonra DOM'dan kaldır
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Font boyutunu uygula
    function applyFontSize(size) {
        let fontSize;
        
        switch (size) {
            case 'small':
                fontSize = '12px';
                break;
            case 'large':
                fontSize = '16px';
                break;
            default:
                fontSize = '14px'; // medium
        }
        
        document.body.style.fontSize = fontSize;
    }
    
    // Ayarları kaydet
    function saveSettings() {
        const settings = {
            darkMode: darkModeToggle.checked,
            themeColor: themeColorSelect.value,
            compactView: compactViewToggle.checked,
            fontSize: fontSizeSelect.value,
            notifications: notificationsToggle.checked,
            sound: soundToggle.checked,
            saveHistory: saveHistoryToggle.checked,
            debugMode: debugModeToggle.checked
        };
        
        chrome.storage.local.set({ settings: settings }, function() {
            console.log('Settings saved:', settings);
        });
    }
    
    // Ayarları yükle
    function loadSettings() {
        chrome.storage.local.get(['settings', 'defaultUsername'], function(data) {
            const settings = data.settings || {};
            
            // Karanlık mod
            if (settings.darkMode) {
                darkModeToggle.checked = true;
                document.body.classList.add('dark-mode');
            } else {
                darkModeToggle.checked = false;
                document.body.classList.remove('dark-mode');
            }
            
            // Tema rengi
            if (settings.themeColor) {
                themeColorSelect.value = settings.themeColor;
            }
            updateColorPreview();
            
            // Kompakt görünüm
            compactViewToggle.checked = settings.compactView || false;
            
            // Font boyutu
            if (settings.fontSize) {
                fontSizeSelect.value = settings.fontSize;
                applyFontSize(settings.fontSize);
            }
            
            // Bildirimler
            notificationsToggle.checked = settings.notifications || false;
            
            // Ses
            soundToggle.checked = settings.sound || false;
            
            // Geçmiş kaydetme
            saveHistoryToggle.checked = settings.saveHistory !== undefined ? settings.saveHistory : true;
            
            // Debug modu
            debugModeToggle.checked = settings.debugMode || false;
            
            // Varsayılan kullanıcı adı
            if (data.defaultUsername) {
                defaultUsernameInput.value = data.defaultUsername;
            }
        });
    }
    
    // Sayfa yüklendiğinde varsayılan bölümü göster
    showDefaultSection();
});

// AI Settings Tab Switching
document.addEventListener('DOMContentLoaded', function() {
    const ownApiTab = document.getElementById('ownApiTab');
    const premiumTab = document.getElementById('premiumTab');
    const ownApiContent = document.getElementById('ownApiContent');
    const premiumContent = document.getElementById('premiumContent');
    
    if (ownApiTab && premiumTab) {
        ownApiTab.addEventListener('click', function() {
            ownApiTab.classList.add('active');
            premiumTab.classList.remove('active');
            ownApiContent.style.display = 'block';
            premiumContent.style.display = 'none';
        });
        
        premiumTab.addEventListener('click', function() {
            premiumTab.classList.add('active');
            ownApiTab.classList.remove('active');
            premiumContent.style.display = 'block';
            ownApiContent.style.display = 'none';
        });
    }
    
    // Toggle API Key Visibility
    const toggleApiKeyVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
    const aiApiKeyInput = document.getElementById('aiApiKey');
    
    if (toggleApiKeyVisibilityBtn && aiApiKeyInput) {
        toggleApiKeyVisibilityBtn.addEventListener('click', function() {
            if (aiApiKeyInput.type === 'password') {
                aiApiKeyInput.type = 'text';
                toggleApiKeyVisibilityBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/>
                    </svg>
                `;
            } else {
                aiApiKeyInput.type = 'password';
                toggleApiKeyVisibilityBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/>
                    </svg>
                `;
            }
        });
    }
    
    // Custom CSS Toggle
    const customCssToggle = document.getElementById('customCssToggle');
    const customCssContainer = document.getElementById('customCssContainer');
    
    if (customCssToggle && customCssContainer) {
        customCssToggle.addEventListener('change', function() {
            if (customCssToggle.checked) {
                customCssContainer.style.display = 'block';
            } else {
                customCssContainer.style.display = 'none';
            }
        });
    }
    
    // Initialize AI Settings
    initializeAISettings();
    
    // Initialize Premium Plan Buttons
    initializePremiumButtons();
});

// Initialize AI Settings
function initializeAISettings() {
    const aiProviderSelect = document.getElementById('aiProvider');
    const aiModelSelect = document.getElementById('aiModelSelect');
    const testAiConnectionBtn = document.getElementById('testAiConnection');
    const saveAiSettingsBtn = document.getElementById('saveAiSettings');
    const aiApiKeyInput = document.getElementById('aiApiKey');
    const aiConnectionStatus = document.getElementById('aiConnectionStatus');
    
    // Update AI models when provider changes
    if (aiProviderSelect && aiModelSelect) {
        aiProviderSelect.addEventListener('change', function() {
            updateAIModelOptions(aiProviderSelect.value);
        });
        
        // Initial update of model options
        updateAIModelOptions(aiProviderSelect.value);
    }
    
    // Test AI Connection
    if (testAiConnectionBtn && aiConnectionStatus && aiApiKeyInput) {
        testAiConnectionBtn.addEventListener('click', function() {
            const apiKey = aiApiKeyInput.value.trim();
            
            if (!apiKey) {
                aiConnectionStatus.textContent = 'Please enter an API key';
                aiConnectionStatus.className = 'settings-status error';
                return;
            }
            
            // Show loading state
            testAiConnectionBtn.disabled = true;
            testAiConnectionBtn.textContent = 'Testing...';
            aiConnectionStatus.textContent = 'Testing connection...';
            aiConnectionStatus.className = 'settings-status';
            
            // Simulate API testing
            setTimeout(function() {
                testAiConnectionBtn.disabled = false;
                testAiConnectionBtn.textContent = 'Test Connection';
                
                // Randomize success or failure for demo
                if (Math.random() > 0.3) {
                    aiConnectionStatus.textContent = 'Connection successful! Your API key is valid.';
                    aiConnectionStatus.className = 'settings-status success';
                } else {
                    aiConnectionStatus.textContent = 'Connection failed. Please check your API key and try again.';
                    aiConnectionStatus.className = 'settings-status error';
                }
            }, 1500);
        });
    }
    
    // Save AI Settings
    if (saveAiSettingsBtn && aiApiKeyInput && aiProviderSelect && aiModelSelect && aiConnectionStatus) {
        saveAiSettingsBtn.addEventListener('click', function() {
            const apiKey = aiApiKeyInput.value.trim();
            const provider = aiProviderSelect.value;
            const model = aiModelSelect.value;
            
            if (!apiKey) {
                aiConnectionStatus.textContent = 'Please enter an API key';
                aiConnectionStatus.className = 'settings-status error';
                return;
            }
            
            // Save AI settings to storage
            chrome.storage.local.set({
                aiSettings: {
                    apiKey: apiKey,
                    provider: provider,
                    model: model
                }
            }, function() {
                aiConnectionStatus.textContent = 'Settings saved successfully!';
                aiConnectionStatus.className = 'settings-status success';
                
                setTimeout(function() {
                    aiConnectionStatus.textContent = '';
                    aiConnectionStatus.className = 'settings-status';
                }, 3000);
            });
        });
    }
    
    // Load saved AI settings
    chrome.storage.local.get('aiSettings', function(data) {
        if (data.aiSettings) {
            if (aiApiKeyInput && data.aiSettings.apiKey) {
                aiApiKeyInput.value = data.aiSettings.apiKey;
            }
            
            if (aiProviderSelect && data.aiSettings.provider) {
                aiProviderSelect.value = data.aiSettings.provider;
                updateAIModelOptions(data.aiSettings.provider);
            }
            
            if (aiModelSelect && data.aiSettings.model) {
                // Wait briefly for model options to update
                setTimeout(function() {
                    aiModelSelect.value = data.aiSettings.model;
                }, 100);
            }
        }
    });
}

// Initialize Premium Plan Buttons
function initializePremiumButtons() {
    const planButtons = document.querySelectorAll('button[style*="background-color: var(--primary-color)"]');
    
    if (planButtons.length > 0) {
        planButtons.forEach(button => {
            button.addEventListener('click', function() {
                const planName = this.parentElement.querySelector('div:first-child').textContent;
                
                // Show a simple notification
                showNotification(`You selected the ${planName} plan. In a real implementation, this would redirect to a payment page.`);
            });
        });
    }
}

// Update AI model options based on provider
function updateAIModelOptions(provider) {
    const aiModelSelect = document.getElementById('aiModelSelect');
    
    if (!aiModelSelect) return;
    
    // Clear existing options
    aiModelSelect.innerHTML = '';
    
    // Add options based on provider
    if (provider === 'openai') {
        addOption(aiModelSelect, 'gpt-3.5-turbo', 'GPT-3.5 Turbo');
        addOption(aiModelSelect, 'gpt-4', 'GPT-4');
        addOption(aiModelSelect, 'gpt-4-turbo', 'GPT-4 Turbo');
    } else if (provider === 'anthropic') {
        addOption(aiModelSelect, 'claude-3-opus', 'Claude 3 Opus');
        addOption(aiModelSelect, 'claude-3-sonnet', 'Claude 3 Sonnet');
        addOption(aiModelSelect, 'claude-3-haiku', 'Claude 3 Haiku');
    } else if (provider === 'google') {
        addOption(aiModelSelect, 'gemini-pro', 'Gemini Pro');
        addOption(aiModelSelect, 'gemini-ultra', 'Gemini Ultra');
    }
}

// Helper to add options to select
function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    // Styling
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 25px';
    notification.style.color = 'white';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '9999';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    if (type === 'success') {
        notification.style.backgroundColor = '#17bf63';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e0245e';
    } else {
        notification.style.backgroundColor = 'rgba(29, 161, 242, 0.9)';
    }
    
    document.body.appendChild(notification);
    
    // Show animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// AI Settings Functions
document.addEventListener('DOMContentLoaded', function() {
    // AI Settings Elements
    const aiProvider = document.getElementById('aiProvider');
    const aiModelSelect = document.getElementById('aiModelSelect');
    const aiApiKey = document.getElementById('aiApiKey');
    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    const testAiConnection = document.getElementById('testAiConnection');
    const saveAiSettings = document.getElementById('saveAiSettings');
    const aiConnectionStatus = document.getElementById('aiConnectionStatus');
    const enableAllAI = document.getElementById('enableAllAI');
    const aiFeatureToggles = document.querySelectorAll('.ai-feature-card .switch input[type="checkbox"]');
    const currentProvider = document.getElementById('currentProvider');
    const currentModel = document.getElementById('currentModel');
    const lastUsed = document.getElementById('lastUsed');
    
    // Update current time for last used display
    if (lastUsed) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        lastUsed.textContent = `Today at ${timeString}`;
    }
    
    // Toggle API Key Visibility
    if (toggleApiKeyVisibility && aiApiKey) {
        toggleApiKeyVisibility.addEventListener('click', function() {
            const type = aiApiKey.type === 'password' ? 'text' : 'password';
            aiApiKey.type = type;
            
            // Update icon
            if (type === 'text') {
                toggleApiKeyVisibility.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/>
                </svg>`;
            } else {
                toggleApiKeyVisibility.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/>
                </svg>`;
            }
        });
    }
    
    // Update AI Models based on provider
    if (aiProvider && aiModelSelect) {
        aiProvider.addEventListener('change', function() {
            updateAIModels(aiProvider.value, aiModelSelect);
            
            // Update current provider display
            if (currentProvider) {
                currentProvider.textContent = aiProvider.options[aiProvider.selectedIndex].text;
            }
        });
    }
    
    // Test AI Connection
    if (testAiConnection && aiConnectionStatus) {
        testAiConnection.addEventListener('click', function() {
            // Validate API key
            if (!aiApiKey || !aiApiKey.value.trim()) {
                if (aiConnectionStatus) {
                    aiConnectionStatus.textContent = 'Please enter an API key';
                    aiConnectionStatus.style.color = '#e0245e';
                }
                return;
            }
            
            // Show loading state
            testAiConnection.disabled = true;
            if (aiConnectionStatus) {
                aiConnectionStatus.textContent = 'Testing connection...';
                aiConnectionStatus.style.color = 'var(--primary-color)';
            }
            
            // Simulate API test (random success/fail for demo)
            setTimeout(function() {
                testAiConnection.disabled = false;
                
                const success = Math.random() > 0.3; // 70% success rate for demo
                
                if (aiConnectionStatus) {
                    if (success) {
                        aiConnectionStatus.textContent = 'Connection successful! Your API key is valid.';
                        aiConnectionStatus.style.color = '#17bf63';
                    } else {
                        aiConnectionStatus.textContent = 'Connection failed. Please check your API key and try again.';
                        aiConnectionStatus.style.color = '#e0245e';
                    }
                }
            }, 1500);
        });
    }
    
    // Save AI Settings
    if (saveAiSettings && aiApiKey && aiProvider && aiModelSelect) {
        saveAiSettings.addEventListener('click', function() {
            // Validate input
            if (!aiApiKey.value.trim()) {
                if (aiConnectionStatus) {
                    aiConnectionStatus.textContent = 'Please enter an API key';
                    aiConnectionStatus.style.color = '#e0245e';
                }
                return;
            }
            
            // Gather AI settings
            const settings = {
                provider: aiProvider.value,
                providerText: aiProvider.options[aiProvider.selectedIndex].text,
                model: aiModelSelect.value,
                modelText: aiModelSelect.options[aiModelSelect.selectedIndex].text,
                apiKey: aiApiKey.value,
                lastUsed: new Date().toISOString(),
                features: {}
            };
            
            // Gather feature toggle states
            aiFeatureToggles.forEach(toggle => {
                const featureCard = toggle.closest('.ai-feature-card');
                const featureTitle = featureCard.querySelector('.ai-feature-title').textContent;
                settings.features[featureTitle] = toggle.checked;
            });
            
            // Save to storage
            chrome.storage.local.set({
                aiSettings: settings
            }, function() {
                // Update status message
                if (aiConnectionStatus) {
                    aiConnectionStatus.textContent = 'Settings saved successfully!';
                    aiConnectionStatus.style.color = '#17bf63';
                }
                
                // Update displayed values
                if (currentProvider) currentProvider.textContent = settings.providerText;
                if (currentModel) currentModel.textContent = settings.modelText;
                
                // Clear status message after delay
                setTimeout(function() {
                    if (aiConnectionStatus) {
                        aiConnectionStatus.textContent = '';
                    }
                }, 3000);
                
                // Show success toast
                showNotification('AI settings saved successfully!', 'success');
            });
        });
    }
    
    // Toggle All AI Features
    if (enableAllAI && aiFeatureToggles.length > 0) {
        enableAllAI.addEventListener('change', function() {
            const enableAll = enableAllAI.checked;
            
            aiFeatureToggles.forEach(toggle => {
                toggle.checked = enableAll;
            });
        });
    }
    
    // Plan Subscription Buttons
    const planButtons = document.querySelectorAll('.ai-plan-button');
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planCard = button.closest('.ai-plan-card');
            const planName = planCard.querySelector('h5').textContent;
            
            // Show subscription confirmation
            showNotification(`You are about to subscribe to the ${planName} plan. This would normally redirect to a payment page.`, 'info');
        });
    });
    
    // Load saved AI settings
    loadAISettings();
    
    // Helper function to update AI models based on provider
    function updateAIModels(provider, modelSelect) {
        if (!modelSelect) return;
        
        // Save current selection if possible
        const currentSelection = modelSelect.value;
        
        // Clear existing options
        modelSelect.innerHTML = '';
        
        // Add options based on provider
        if (provider === 'openai') {
            addOption(modelSelect, 'gpt-4', 'GPT-4');
            addOption(modelSelect, 'gpt-4o', 'GPT-4o');
            addOption(modelSelect, 'gpt-3.5-turbo', 'GPT-3.5 Turbo');
        } else if (provider === 'anthropic') {
            addOption(modelSelect, 'claude-3-opus', 'Claude 3 Opus');
            addOption(modelSelect, 'claude-3-sonnet', 'Claude 3 Sonnet');
            addOption(modelSelect, 'claude-3-haiku', 'Claude 3 Haiku');
        } else if (provider === 'google') {
            addOption(modelSelect, 'gemini-pro', 'Gemini Pro');
            addOption(modelSelect, 'gemini-ultra', 'Gemini Ultra');
        }
        
        // Try to restore selection if it exists in new options
        try {
            modelSelect.value = currentSelection;
        } catch (e) {
            // If previous selection doesn't exist, select first option
            if (modelSelect.options.length > 0) {
                modelSelect.selectedIndex = 0;
            }
        }
        
        // Update current model display
        if (currentModel && modelSelect.options.length > 0) {
            currentModel.textContent = modelSelect.options[modelSelect.selectedIndex].text;
        }
    }
    
    // Helper function to add option to select
    function addOption(select, value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    
    // Load AI settings from storage
    function loadAISettings() {
        chrome.storage.local.get('aiSettings', function(data) {
            if (!data.aiSettings) return;
            
            const settings = data.aiSettings;
            
            // Set values from storage
            if (aiProvider && settings.provider) {
                aiProvider.value = settings.provider;
                
                // Update model options based on provider
                if (aiModelSelect) {
                    updateAIModels(settings.provider, aiModelSelect);
                    
                    // Set saved model
                    if (settings.model) {
                        setTimeout(() => {
                            try {
                                aiModelSelect.value = settings.model;
                            } catch (e) {
                                console.log('Saved model not available in current provider options');
                            }
                        }, 0);
                    }
                }
            }
            
            // Set API key
            if (aiApiKey && settings.apiKey) {
                aiApiKey.value = settings.apiKey;
            }
            
            // Update current provider and model display
            if (currentProvider && settings.providerText) {
                currentProvider.textContent = settings.providerText;
            } else if (currentProvider && aiProvider) {
                currentProvider.textContent = aiProvider.options[aiProvider.selectedIndex].text;
            }
            
            if (currentModel && settings.modelText) {
                currentModel.textContent = settings.modelText;
            } else if (currentModel && aiModelSelect) {
                currentModel.textContent = aiModelSelect.options[aiModelSelect.selectedIndex].text;
            }
            
            // Set feature toggles
            if (settings.features && aiFeatureToggles.length > 0) {
                aiFeatureToggles.forEach(toggle => {
                    const featureCard = toggle.closest('.ai-feature-card');
                    const featureTitle = featureCard.querySelector('.ai-feature-title').textContent;
                    
                    if (settings.features[featureTitle] !== undefined) {
                        toggle.checked = settings.features[featureTitle];
                    }
                });
                
                // Check if all features are enabled
                const allEnabled = Array.from(aiFeatureToggles).every(toggle => toggle.checked);
                if (enableAllAI) {
                    enableAllAI.checked = allEnabled;
                }
            }
            
            // Set last used date and time
            if (lastUsed && settings.lastUsed) {
                const lastUsedDate = new Date(settings.lastUsed);
                const now = new Date();
                
                if (lastUsedDate.toDateString() === now.toDateString()) {
                    // If today, show time
                    lastUsed.textContent = `Today at ${lastUsedDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
                } else {
                    // Otherwise show date
                    lastUsed.textContent = lastUsedDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
        });
    }
}); 