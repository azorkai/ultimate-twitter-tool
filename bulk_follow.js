// BULK Follow işlevselliği
(function() {
    // Değişkenler
    let isFollowing = false;
    let usernames = [];
    let currentIndex = 0;
    let followDelay = 5; // Saniye cinsinden
    let followResults = [];
    let stopRequested = false;
    
    // DOM elementleri
    const startButton = document.getElementById('startBulkFollow');
    const stopButton = document.getElementById('stopBulkFollow');
    const inputArea = document.getElementById('bulkFollowInput');
    const delayInput = document.getElementById('delayInput');
    const progressContainer = document.querySelector('.bulk-follow-progress');
    const progressCounter = document.getElementById('progressCounter');
    const progressBar = document.getElementById('progressBar');
    const resultsList = document.getElementById('bulkFollowResults');
    
    // Event listener'ları ekle
    document.addEventListener('DOMContentLoaded', () => {
        startButton.addEventListener('click', startBulkFollow);
        stopButton.addEventListener('click', stopBulkFollow);
        delayInput.addEventListener('change', updateDelay);
        
        // Kaydedilmiş sonuçları yükle
        loadResults();
    });
    
    // Gecikme süresini güncelle
    function updateDelay() {
        const value = parseInt(delayInput.value);
        if (value >= 1 && value <= 30) {
            followDelay = value;
        } else {
            delayInput.value = 5;
            followDelay = 5;
        }
    }
    
    // BULK Follow işlemini başlat
    function startBulkFollow() {
        if (isFollowing) return;
        
        // Kullanıcı adlarını al
        const input = inputArea.value.trim();
        if (!input) {
            showError('Please enter at least one username');
            return;
        }
        
        // Kullanıcı adlarını işle
        usernames = input.split('\n')
            .map(username => username.trim())
            .filter(username => username)
            .map(username => {
                // URL formatını temizle
                if (username.includes('twitter.com/') || username.includes('x.com/')) {
                    // URL'den kullanıcı adını çıkar
                    const match = username.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
                
                // @ işaretini kaldır
                if (username.startsWith('@')) {
                    return username.substring(1);
                }
                
                return username;
            });
        
        if (usernames.length === 0) {
            showError('No valid usernames found');
            return;
        }
        
        // Takip işlemini başlat
        isFollowing = true;
        currentIndex = 0;
        stopRequested = false;
        followResults = [];
        
        // UI'ı güncelle
        startButton.disabled = true;
        stopButton.disabled = false;
        inputArea.disabled = true;
        delayInput.disabled = true;
        
        // İlerleme çubuğunu göster
        progressContainer.style.display = 'block';
        progressCounter.textContent = `0/${usernames.length}`;
        progressBar.style.width = '0%';
        
        // Sonuç listesini temizle
        resultsList.innerHTML = '';
        
        // İlk kullanıcıyı takip et
        followNextUser();
    }
    
    // Takip işlemini durdur
    function stopBulkFollow() {
        if (!isFollowing) return;
        
        stopRequested = true;
        stopButton.disabled = true;
        stopButton.textContent = 'Stopping...';
    }
    
    // Sıradaki kullanıcıyı takip et
    function followNextUser() {
        if (stopRequested || currentIndex >= usernames.length) {
            finishBulkFollow();
            return;
        }
        
        let username = usernames[currentIndex];
        
        // URL'den kullanıcı adını çıkar
        if (username.includes('twitter.com/') || username.includes('x.com/')) {
            const match = username.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
            if (match && match[1]) {
                username = match[1];
            }
        }
        
        // @ işaretini kaldır
        if (username.startsWith('@')) {
            username = username.substring(1);
        }
        
        // Kullanıcı adının geçerli olduğundan emin ol
        if (!username || username.trim() === '') {
            // Geçersiz kullanıcı adı, sonraki kullanıcıya geç
            console.log(`Geçersiz kullanıcı adı: ${username}, atlanıyor...`);
            
            // Sonuç listesine ekle
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <span class="result-username">@${username}</span>
                <span class="result-status status-error">Invalid</span>
            `;
            resultsList.prepend(resultItem);
            
            // Sonucu kaydet
            followResults.push({
                username: username,
                success: false,
                error: 'Invalid username',
                timestamp: new Date().toISOString()
            });
            
            // Sıradaki kullanıcıya geç
            currentIndex++;
            setTimeout(followNextUser, 100); // Hemen sıradaki kullanıcıya geç
            return;
        }
        
        // Sonuç listesine ekle
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <span class="result-username">@${username}</span>
            <span class="result-status status-pending">Pending</span>
        `;
        resultsList.prepend(resultItem);
        
        // İlerleme çubuğunu güncelle
        progressCounter.textContent = `${currentIndex + 1}/${usernames.length}`;
        const progress = ((currentIndex + 1) / usernames.length) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Twitter profiline git ve takip et
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            
            // Twitter profiline git
            chrome.tabs.update(tab.id, { url: `https://x.com/${username}` });
            
            // Sayfanın yüklenmesi için daha uzun süre bekle
            const pageLoadDelay = 8000; // 8 saniye
            setTimeout(() => {
                console.log(`${username} profiline gidildi, takip butonu aranıyor...`);
                
                // Takip butonunu bul ve tıkla
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: followUser
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        console.error("Script çalıştırma hatası:", chrome.runtime.lastError);
                        const statusElement = resultItem.querySelector('.result-status');
                        statusElement.textContent = 'Failed';
                        statusElement.className = 'result-status status-error';
                        
                        // Sonucu kaydet
                        followResults.push({
                            username: username,
                            success: false,
                            error: chrome.runtime.lastError.message || 'Script execution error',
                            timestamp: new Date().toISOString()
                        });
                        
                        // Sıradaki kullanıcıya geç
                        currentIndex++;
                        setTimeout(() => followNextUser(), followDelay * 1000);
                        return;
                    }
                    
                    if (!results || results.length === 0) {
                        console.error("Script çalıştırma hatası: Sonuç alınamadı");
                        const statusElement = resultItem.querySelector('.result-status');
                        statusElement.textContent = 'Failed';
                        statusElement.className = 'result-status status-error';
                        
                        // Sonucu kaydet
                        followResults.push({
                            username: username,
                            success: false,
                            error: 'Script execution failed - No results',
                            timestamp: new Date().toISOString()
                        });
                        
                        // Sıradaki kullanıcıya geç
                        currentIndex++;
                        setTimeout(() => followNextUser(), followDelay * 1000);
                        return;
                    }
                    
                    const result = results[0].result;
                    console.log(`${username} takip sonucu:`, result);
                    
                    // Sonucu güncelle
                    const statusElement = resultItem.querySelector('.result-status');
                    if (result.success) {
                        if (result.alreadyFollowing) {
                            statusElement.textContent = 'Already Following';
                        } else {
                            statusElement.textContent = 'Followed';
                        }
                        statusElement.className = 'result-status status-success';
                    } else {
                        statusElement.textContent = 'Failed';
                        statusElement.className = 'result-status status-error';
                    }
                    
                    // Sonucu kaydet
                    followResults.push({
                        username: username,
                        success: result.success,
                        error: result.error,
                        alreadyFollowing: result.alreadyFollowing,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Sıradaki kullanıcıya geç
                    currentIndex++;
                    
                    // Gecikme ile sıradaki kullanıcıyı takip et
                    setTimeout(followNextUser, followDelay * 1000);
                });
            }, pageLoadDelay); // Sayfanın yüklenmesi için 8 saniye bekle
        });
    }
    
    // Takip işlemini bitir
    function finishBulkFollow() {
        isFollowing = false;
        
        // UI'ı güncelle
        startButton.disabled = false;
        stopButton.disabled = true;
        inputArea.disabled = false;
        delayInput.disabled = false;
        stopButton.textContent = 'Stop';
        
        // Sonuçları kaydet
        saveResults();
        
        // Kullanıcıya bilgi ver
        const successCount = followResults.filter(r => r.success).length;
        alert(`Bulk follow completed. ${successCount} out of ${usernames.length} users were followed successfully.`);
    }
    
    // Takip butonuna tıkla (content script olarak çalışacak)
    function followUser() {
        try {
            console.log("Takip butonu aranıyor...");
            
            // Sayfanın tamamen yüklendiğinden emin ol
            if (document.readyState !== 'complete') {
                console.log("Sayfa henüz tamamen yüklenmedi, bekleniyor...");
                return { success: false, error: 'Page not fully loaded' };
            }
            
            // Farklı olası takip buton seçicileri
            const followButtonSelectors = [
                '[data-testid="follow"]',
                '[aria-label*="Follow"]',
                '[aria-label*="follow"]',
                '[role="button"][tabindex="0"]:not([data-testid="unfollow"])',
                'div[role="button"]:not([data-testid="unfollow"])'
            ];
            
            let followButton = null;
            
            // Tüm olası seçicileri dene
            for (const selector of followButtonSelectors) {
                const buttons = document.querySelectorAll(selector);
                console.log(`Seçici "${selector}" ile ${buttons.length} buton bulundu`);
                
                for (const btn of buttons) {
                    // İçeriğinde "Follow" veya "Takip et" geçen butonları kontrol et
                    const buttonText = btn.textContent.toLowerCase();
                    if (buttonText.includes("follow") || 
                        buttonText.includes("takip et") || 
                        buttonText.includes("takip") ||
                        buttonText.includes("izle")) {
                        followButton = btn;
                        console.log(`Takip butonu bulundu: "${buttonText}"`);
                        break;
                    }
                }
                
                if (followButton) break;
            }
            
            // Eğer yukarıdaki yöntemlerle bulunamadıysa, tüm butonları kontrol et
            if (!followButton) {
                console.log("Standart seçicilerle buton bulunamadı, tüm butonlar kontrol ediliyor...");
                const allButtons = document.querySelectorAll('div[role="button"]');
                
                for (const btn of allButtons) {
                    const buttonText = btn.textContent.toLowerCase();
                    if (buttonText.includes("follow") || 
                        buttonText.includes("takip et") || 
                        buttonText.includes("takip") ||
                        buttonText.includes("izle")) {
                        followButton = btn;
                        console.log(`Alternatif yöntemle takip butonu bulundu: "${buttonText}"`);
                        break;
                    }
                }
            }
            
            if (followButton) {
                console.log("Takip butonu bulundu, tıklanıyor...");
                followButton.click();
                
                // Başarılı tıklamayı doğrulamak için kısa bir bekleme
                return { success: true };
            } else {
                // Zaten takip ediliyor olabilir
                const followingSelectors = [
                    '[data-testid="unfollow"]',
                    '[aria-label*="Unfollow"]',
                    '[aria-label*="Following"]'
                ];
                
                for (const selector of followingSelectors) {
                    const followingButton = document.querySelector(selector);
                    if (followingButton) {
                        console.log("Kullanıcı zaten takip ediliyor.");
                        return { success: true, alreadyFollowing: true };
                    }
                }
                
                // Profil sayfasında olduğumuzu kontrol et
                const profileHeader = document.querySelector('[data-testid="UserName"], [data-testid="UserCell"]');
                if (!profileHeader) {
                    console.log("Profil sayfasında değiliz veya sayfa doğru yüklenmedi.");
                    return { success: false, error: 'Not on profile page or page not loaded correctly' };
                }
                
                console.log("Takip butonu bulunamadı.");
                return { success: false, error: 'Follow button not found' };
            }
        } catch (error) {
            console.error("Takip etme hatası:", error);
            return { success: false, error: error.message };
        }
    }
    
    // Sonuçları kaydet
    function saveResults() {
        chrome.storage.local.get('bulkFollowHistory', (data) => {
            const history = data.bulkFollowHistory || [];
            const updatedHistory = [...history, ...followResults];
            
            // Son 1000 sonucu sakla
            const limitedHistory = updatedHistory.slice(-1000);
            
            chrome.storage.local.set({ bulkFollowHistory: limitedHistory });
        });
    }
    
    // Kaydedilmiş sonuçları yükle
    function loadResults() {
        chrome.storage.local.get('bulkFollowHistory', (data) => {
            if (data.bulkFollowHistory && data.bulkFollowHistory.length > 0) {
                const history = data.bulkFollowHistory;
                
                // Son 20 sonucu göster
                const recentResults = history.slice(-20).reverse();
                
                resultsList.innerHTML = '';
                recentResults.forEach(result => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.innerHTML = `
                        <span class="result-username">@${result.username}</span>
                        <span class="result-status ${result.success ? 'status-success' : 'status-error'}">
                            ${result.success ? 'Followed' : 'Failed'}
                        </span>
                    `;
                    resultsList.appendChild(resultItem);
                });
            }
        });
    }
    
    // Hata mesajı göster
    function showError(message) {
        alert(message);
    }
})(); 