(async function() {
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    let verifiedUsers = new Set();
    let profileStats = {};
    const isVerifiedFollowersPage = window.location.href.includes('/verified_followers');

    // Profil istatistiklerini çek
    function extractProfileStats() {
        try {
            // Eğer verified_followers sayfasındaysak, ana profil sayfasına git ve oradan bilgileri çek
            if (isVerifiedFollowersPage) {
                // Profil URL'sini al
                const currentUrl = window.location.href;
                const username = currentUrl.split('/verified_followers')[0].split('/').pop();
                
                // Profil bilgilerini varsayılan olarak ayarla
                profileStats.username = '@' + username;
                profileStats.displayName = username;
            } else {
                // Normal profil sayfasındaysak, bilgileri direkt çek
                // Profil adı ve kullanıcı adını al
                const profileHeader = document.querySelector('[data-testid="UserName"]');
                if (profileHeader) {
                    const displayName = profileHeader.querySelector('span');
                    const username = profileHeader.querySelector('div[dir="ltr"]');
                    
                    if (displayName && username) {
                        profileStats.displayName = displayName.textContent.trim();
                        profileStats.username = username.textContent.trim();
                    }
                }
                
                // Profil resmini al
                const profileImageElement = document.querySelector('[data-testid="UserAvatar-Container"] img');
                if (profileImageElement) {
                    profileStats.profileImage = profileImageElement.src;
                    console.log("Profile image found:", profileStats.profileImage);
                } else {
                    // Alternatif yöntem
                    const allImages = document.querySelectorAll('img');
                    for (const img of allImages) {
                        // Profil resmi genellikle büyük ve alt metni kullanıcı adını içerir
                        if (img.alt && (img.alt.includes('profile photo') || img.alt.includes('profile image') || 
                            img.alt.includes(profileStats.displayName))) {
                            if (img.width >= 48 && img.height >= 48) {
                                profileStats.profileImage = img.src;
                                console.log("Profile image found (alternative method):", profileStats.profileImage);
                                break;
                            }
                        }
                    }
                }
                
                // Profil açıklamasını al
                const bioElement = document.querySelector('[data-testid="UserDescription"]');
                if (bioElement) {
                    profileStats.bio = bioElement.textContent.trim();
                }
                
                // Takipçi, takip edilen ve tweet sayılarını al - Geliştirilmiş yöntem
                try {
                    // Tüm metin içeren elementleri tara
                    const allTextElements = document.querySelectorAll('*');
                    
                    // Tweet sayısını bul - Başlık içindeki sayıyı ara
                    const titleElements = document.querySelectorAll('[data-testid="titleContainer"] span, [data-testid="primaryColumn"] span');
                    titleElements.forEach(element => {
                        const text = element.textContent.trim();
                        // Sayı içeren span'ı kontrol et (rakam veya K, M gibi kısaltmalar içerebilir)
                        if (/^[0-9,.]+[KkMmBb]?$/.test(text) || /^[0-9,.]+$/.test(text)) {
                            profileStats.tweets = text;
                            console.log("Tweets found:", text);
                        }
                    });
                    
                    // Takipçi ve takip edilen sayılarını bul - Çok daha spesifik yöntem
                    // Tüm bağlantıları kontrol et ve tam URL'yi al
                    const allLinks = document.querySelectorAll('a');
                    let followersLink = null;
                    let followingLink = null;
                    
                    // Önce doğru bağlantıları bul
                    allLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        
                        // Tam URL'yi kontrol et
                        if (href.endsWith('/followers')) {
                            followersLink = link;
                            console.log("Found followers link:", href);
                        } else if (href.endsWith('/following')) {
                            followingLink = link;
                            console.log("Found following link:", href);
                        }
                    });
                    
                    // Şimdi bağlantıların içindeki sayıları bul
                    if (followersLink) {
                        // Tüm metin içeriğini al ve sayıları çıkar
                        const allText = followersLink.textContent.trim();
                        const numberMatch = allText.match(/([0-9,.]+[KkMmBb]?)/);
                        if (numberMatch && numberMatch[1]) {
                            profileStats.followers = numberMatch[1];
                            console.log("Followers count found:", numberMatch[1]);
                        }
                    }
                    
                    if (followingLink) {
                        // Tüm metin içeriğini al ve sayıları çıkar
                        const allText = followingLink.textContent.trim();
                        const numberMatch = allText.match(/([0-9,.]+[KkMmBb]?)/);
                        if (numberMatch && numberMatch[1]) {
                            profileStats.following = numberMatch[1];
                            console.log("Following count found:", numberMatch[1]);
                        }
                    }
                    
                    // Eğer hala bulunamadıysa, daha agresif bir yöntem dene
                    if (!profileStats.followers || !profileStats.following) {
                        console.log("Using aggressive method to find follower counts");
                        
                        // Tüm metinleri kontrol et ve içeriğe göre sınıflandır
                        const textNodes = [];
                        const walkTree = (node) => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent.trim();
                                if (text && /^[0-9,.]+[KkMmBb]?$/.test(text)) {
                                    textNodes.push({
                                        node: node,
                                        text: text,
                                        parent: node.parentElement
                                    });
                                }
                            } else {
                                for (let i = 0; i < node.childNodes.length; i++) {
                                    walkTree(node.childNodes[i]);
                                }
                            }
                        };
                        
                        walkTree(document.body);
                        
                        // Şimdi bu metin düğümlerini kontrol et
                        textNodes.forEach(item => {
                            // Ebeveyn elementlerin HTML'sini kontrol et
                            let currentNode = item.parent;
                            let depth = 0;
                            const maxDepth = 10;
                            
                            while (currentNode && depth < maxDepth) {
                                const html = currentNode.outerHTML;
                                
                                // Takipçiler için kontrol et
                                if ((html.includes('follower') || html.includes('Follower')) && !profileStats.followers) {
                                    // Takip edilen sayısı ile karıştırmamak için following içermediğinden emin ol
                                    if (!html.includes('following') && !html.includes('Following')) {
                                        profileStats.followers = item.text;
                                        console.log("Followers found (aggressive):", item.text);
                                        break;
                                    }
                                }
                                
                                // Takip edilenler için kontrol et
                                if ((html.includes('following') || html.includes('Following')) && !profileStats.following) {
                                    profileStats.following = item.text;
                                    console.log("Following found (aggressive):", item.text);
                                    break;
                                }
                                
                                currentNode = currentNode.parentElement;
                                depth++;
                            }
                        });
                    }
                    
                    // Son çare: Sayfa içeriğini analiz et ve konuma göre tahmin et
                    if (!profileStats.followers || !profileStats.following) {
                        console.log("Using position-based method to find follower counts");
                        
                        // Sayı içeren tüm elementleri bul ve konumlarına göre sırala
                        const numberElements = [];
                        document.querySelectorAll('*').forEach(el => {
                            if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                                const text = el.textContent.trim();
                                if (/^[0-9,.]+[KkMmBb]?$/.test(text)) {
                                    const rect = el.getBoundingClientRect();
                                    numberElements.push({
                                        element: el,
                                        text: text,
                                        x: rect.left,
                                        y: rect.top
                                    });
                                }
                            }
                        });
                        
                        // Yatay olarak sırala (soldan sağa)
                        numberElements.sort((a, b) => a.x - b.x);
                        
                        // Eğer iki sayı yan yana ise, ilki muhtemelen takipçi, ikincisi takip edilen
                        if (numberElements.length >= 2) {
                            // İlk iki sayıyı al
                            if (!profileStats.followers) {
                                profileStats.followers = numberElements[0].text;
                                console.log("Followers found (position):", numberElements[0].text);
                            }
                            
                            if (!profileStats.following) {
                                profileStats.following = numberElements[1].text;
                                console.log("Following found (position):", numberElements[1].text);
                            }
                        }
                    }
                    
                    // Eğer hala bulunamadıysa, sayfadaki tüm sayıları kontrol et
                    if (!profileStats.followers || !profileStats.following) {
                        console.log("Using all numbers method as last resort");
                        
                        const allNumbers = [];
                        const textWalker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            { acceptNode: node => /\d/.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
                        );
                        
                        while (textWalker.nextNode()) {
                            const text = textWalker.currentNode.textContent.trim();
                            const matches = text.match(/([0-9,.]+[KkMmBb]?)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    allNumbers.push(match);
                                });
                            }
                        }
                        
                        // Eğer en az iki sayı bulduysa, ilki muhtemelen takipçi, ikincisi takip edilen
                        if (allNumbers.length >= 2 && !profileStats.followers) {
                            profileStats.followers = allNumbers[0];
                            console.log("Followers found (last resort):", allNumbers[0]);
                            
                            if (!profileStats.following) {
                                profileStats.following = allNumbers[1];
                                console.log("Following found (last resort):", allNumbers[1]);
                            }
                        }
                    }
                    
                    // Eğer takipçi sayısı hala bulunamadıysa, takip edilen sayısından farklı bir değer ata
                    if (!profileStats.followers && profileStats.following) {
                        profileStats.followers = "N/A";
                        console.log("Could not find followers count, setting to N/A");
                    }
                    
                    // Eğer takip edilen sayısı hala bulunamadıysa, takipçi sayısından farklı bir değer ata
                    if (!profileStats.following && profileStats.followers) {
                        profileStats.following = "N/A";
                        console.log("Could not find following count, setting to N/A");
                    }
                    
                } catch (error) {
                    console.error("İstatistikleri çekerken hata oluştu:", error);
                }
                
                // Konum, web sitesi ve katılma tarihini al
                const locationElement = document.querySelector('[data-testid="UserProfileHeader_Items"] span[data-testid="UserLocation"]');
                if (locationElement) {
                    profileStats.location = locationElement.textContent.trim();
                }
                
                const websiteElement = document.querySelector('[data-testid="UserProfileHeader_Items"] a[data-testid="UserUrl"]');
                if (websiteElement) {
                    profileStats.website = websiteElement.textContent.trim();
                }
                
                const joinDateElement = document.querySelector('[data-testid="UserProfileHeader_Items"] span[data-testid="UserJoinDate"]');
                if (joinDateElement) {
                    profileStats.joinDate = joinDateElement.textContent.trim();
                }
                
                // Mavi tik durumunu kontrol et
                const verifiedBadge = document.querySelector('[data-testid="UserName"] svg[aria-label="Verified account"]');
                profileStats.isVerified = !!verifiedBadge;
            }
            
            console.log("Profil istatistikleri çekildi:", profileStats);
        } catch (error) {
            console.error("Profil istatistikleri çekilirken hata oluştu:", error);
        }
    }

    // Verified takipçileri çek
    function extractVerifiedFollowers() {
        document.querySelectorAll('[data-testid="UserCell"]').forEach(user => {
            let verifiedBadge = user.querySelector('svg[aria-label="Verified account"]');
            if (verifiedBadge) {
                let link = user.querySelector('a[href^="/"]').href;
                verifiedUsers.add(link);
            }
        });
    }

    // Hangi sayfada olduğumuza göre ilgili verileri çek
    if (isVerifiedFollowersPage) {
        // Verified followers sayfasındaysak, sadece verified takipçileri çek
    extractVerifiedFollowers(); // Mevcut takipçileri çek

    async function scrollToEnd() {
        let lastHeight = 0;
            let scrollCount = 0;
            const maxScrolls = 20; // Maksimum kaydırma sayısı (isteğe bağlı olarak ayarlanabilir)
            
            while (scrollCount < maxScrolls) {
            window.scrollTo(0, document.body.scrollHeight);
            await delay(2500);

            let newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) break;
            lastHeight = newHeight;

            extractVerifiedFollowers();
                scrollCount++;
            }
    }

    await scrollToEnd();

        // Sadece verified takipçileri gönder
        chrome.runtime.sendMessage({ 
            verifiedFollowers: Array.from(verifiedUsers),
            isVerifiedFollowersPage: true
        });
    } else {
        // Normal profil sayfasındaysak, sadece profil istatistiklerini çek
        extractProfileStats();
        
        // Sadece profil istatistiklerini gönder
        chrome.runtime.sendMessage({ 
            profileStats: profileStats,
            isVerifiedFollowersPage: false
        });
    }
})();
