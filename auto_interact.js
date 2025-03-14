let isAutoInteractRunning = false;
let interactionInterval;
let interactionCount = 0;
let maxInteractions = 0;
let interactionDelay = 5; // In seconds
let likeEnabled = true;
let retweetEnabled = true;
let targetHashtags = [];
let targetAccounts = [];
let currentProfileImage = ""; // Store current profile image

document.addEventListener('DOMContentLoaded', function() {
    initializeAutoInteract();
    setupEventListeners();
    loadProfileImage();
});

function initializeAutoInteract() {
    console.log("Initializing Auto Interact module...");
    loadAutoInteractSettings();
}

function loadProfileImage() {
    chrome.storage.local.get("profileStats", function(data) {
        if (data.profileStats && data.profileStats.profileImage) {
            currentProfileImage = data.profileStats.profileImage;
            console.log("Loaded profile image from storage:", currentProfileImage);

            updateProfileImageInUI();
        }
    });
}

function updateProfileImageInUI() {

    const resultsHeader = document.querySelector('.auto-interact-results h4');
    if (resultsHeader && currentProfileImage) {

        if (!document.getElementById('autoInteractProfileImage')) {
            const profileImageElement = document.createElement('img');
            profileImageElement.id = 'autoInteractProfileImage';
            profileImageElement.src = currentProfileImage;
            profileImageElement.alt = 'Profile Image';
            profileImageElement.className = 'auto-interact-profile-image';
            profileImageElement.style.width = '24px';
            profileImageElement.style.height = '24px';
            profileImageElement.style.borderRadius = '50%';
            profileImageElement.style.marginRight = '8px';
            profileImageElement.style.verticalAlign = 'middle';

            resultsHeader.insertBefore(profileImageElement, resultsHeader.firstChild);
        } else {

            document.getElementById('autoInteractProfileImage').src = currentProfileImage;
        }
    }
}

function setupEventListeners() {
    const startAutoInteractBtn = document.getElementById('startAutoInteract');
    if (startAutoInteractBtn) {
        startAutoInteractBtn.addEventListener('click', startAutoInteract);
    }

    const stopAutoInteractBtn = document.getElementById('stopAutoInteract');
    if (stopAutoInteractBtn) {
        stopAutoInteractBtn.addEventListener('click', stopAutoInteract);
    }

    // YENİ: Like checkbox event listener - ID değiştirildi
    const likeCheckbox = document.getElementById('interactLikeOption');
    if (likeCheckbox) {
        likeCheckbox.addEventListener('change', function(e) {
            e.stopPropagation(); // Event yayılımını durdurma
            likeEnabled = this.checked;
            saveAutoInteractSettings();
            console.log("Like setting updated:", likeEnabled);
        });
    }

    // YENİ: Retweet checkbox event listener - ID değiştirildi
    const retweetCheckbox = document.getElementById('interactRetweetOption');
    if (retweetCheckbox) {
        retweetCheckbox.addEventListener('change', function(e) {
            e.stopPropagation(); // Event yayılımını durdurma
            retweetEnabled = this.checked;
            saveAutoInteractSettings();
            console.log("Retweet setting updated:", retweetEnabled);
        });
    }

    // Delay input event listener
    const delayInput = document.getElementById('interactionDelay');
    if (delayInput) {
        delayInput.addEventListener('change', function() {
            interactionDelay = parseInt(this.value) || 5;
            // Ensure minimum delay of 5 seconds
            if (interactionDelay < 5) {
                interactionDelay = 5;
                this.value = 5;
            }
            saveAutoInteractSettings();
            console.log("Delay setting updated:", interactionDelay);
        });
    }

    // Max interactions input event listener
    const maxInteractionsInput = document.getElementById('maxInteractions');
    if (maxInteractionsInput) {
        maxInteractionsInput.addEventListener('change', function() {
            maxInteractions = parseInt(this.value) || 0;
            saveAutoInteractSettings();
            console.log("Max interactions setting updated:", maxInteractions);
        });
    }
}

function loadAutoInteractSettings() {
    chrome.storage.local.get([
        'likeEnabled',
        'retweetEnabled',
        'interactionDelay',
        'maxInteractions'
    ], function(data) {
        likeEnabled = data.likeEnabled !== undefined ? data.likeEnabled : true;
        retweetEnabled = data.retweetEnabled !== undefined ? data.retweetEnabled : true;
        interactionDelay = data.interactionDelay !== undefined ? data.interactionDelay : 5;
        maxInteractions = data.maxInteractions !== undefined ? data.maxInteractions : 0;

        console.log("Loaded Auto Interact settings:", {
            likeEnabled,
            retweetEnabled,
            interactionDelay,
            maxInteractions
        });

        updateAutoInteractUI();
    });
}

function saveAutoInteractSettings() {
    chrome.storage.local.set({
        likeEnabled: likeEnabled,
        retweetEnabled: retweetEnabled,
        interactionDelay: interactionDelay,
        maxInteractions: maxInteractions
    }, function() {
        console.log("Auto Interact settings saved:", {
            likeEnabled,
            retweetEnabled,
            interactionDelay,
            maxInteractions
        });
    });
}

function updateAutoInteractUI() {
    // Update like checkbox - ID değiştirildi
    const likeCheckbox = document.getElementById('interactLikeOption');
    if (likeCheckbox) {
        likeCheckbox.checked = likeEnabled;
    }
    
    // Update retweet checkbox - ID değiştirildi
    const retweetCheckbox = document.getElementById('interactRetweetOption');
    if (retweetCheckbox) {
        retweetCheckbox.checked = retweetEnabled;
    }

    // Update delay input
    const delayInput = document.getElementById('interactionDelay');
    if (delayInput) {
        delayInput.value = interactionDelay;
    }
    
    // Update max interactions input
    const maxInteractionsInput = document.getElementById('maxInteractions');
    if (maxInteractionsInput) {
        maxInteractionsInput.value = maxInteractions;
    }

    // Hashtag ve account listelerini güncelleme işlemlerini kaldırdık
    // Basitleştirilmiş mobil görünüm için
}

function startAutoInteract() {
    if (isAutoInteractRunning) return;
    
    isAutoInteractRunning = true;
    interactionCount = 0;
    
    resetProgressBar();
    clearInteractionResults();
    
    addInteractionResult('info', 'Starting auto interaction...');
    
    // Validate settings before starting
    if (!likeEnabled && !retweetEnabled) {
        addInteractionResult('error', 'Please enable at least one interaction type (like or retweet)');
        isAutoInteractRunning = false;
        updateRunningState(false);
        return;
    }
    
    // Log current settings
    console.log("Starting auto interaction with settings:", {
        likeEnabled,
        retweetEnabled,
        interactionDelay,
        maxInteractions
    });
    
    // Add settings info to results
    let settingsInfo = `Settings: `;
    settingsInfo += likeEnabled ? "Like ✓ " : "Like ✗ ";
    settingsInfo += retweetEnabled ? "Retweet ✓ " : "Retweet ✗ ";
    settingsInfo += `Delay: ${interactionDelay}s `;
    settingsInfo += maxInteractions > 0 ? `Max: ${maxInteractions}` : "No limit";
    addInteractionResult('info', settingsInfo);
    
    // Navigate to Twitter home page first
    navigateToTwitterHome(function() {
        // First interaction after a short delay
        setTimeout(() => {
            performInteraction();
            
            // Schedule subsequent interactions
            interactionInterval = setInterval(performInteraction, interactionDelay * 1000);
        }, 2000);
        
        updateRunningState(true);
    });
}

function navigateToTwitterHome(callback) {

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            addInteractionResult('error', 'No active tab found!');
            stopAutoInteract();
            return;
        }
        
        const tab = tabs[0];
        const twitterHomeUrl = "https://x.com/home";

        if (tab.url === twitterHomeUrl || tab.url === "https://twitter.com/home") {
            addInteractionResult('info', 'Already on Twitter home page, starting interaction...');
            callback();
            return;
        }

        addInteractionResult('info', 'Redirecting to Twitter home page...');
        
        chrome.tabs.update(tab.id, { url: twitterHomeUrl }, function(updatedTab) {

            const checkLoaded = function(tabId, changeInfo, tab) {
                if (tabId === updatedTab.id && changeInfo.status === 'complete') {

                    chrome.tabs.onUpdated.removeListener(checkLoaded);

                    setTimeout(function() {
                        addInteractionResult('success', 'Twitter home page loaded, starting interaction...');
                        callback();
                    }, 2000);
                }
            };

            chrome.tabs.onUpdated.addListener(checkLoaded);
        });
    });
}

function stopAutoInteract() {
    if (!isAutoInteractRunning) return;
    
    isAutoInteractRunning = false;

    if (interactionInterval) {
        clearInterval(interactionInterval);
        interactionInterval = null;
    }

    updateRunningState(false);
    
    console.log("Auto interaction stopped");
    addInteractionResult('info', 'Auto interaction stopped');
}

function performInteraction() {
    if (maxInteractions > 0 && interactionCount >= maxInteractions) {
        stopAutoInteract();
        addInteractionResult('info', 'Maximum interaction count reached');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) return;
        
        const tab = tabs[0];

        if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
            addInteractionResult('error', 'Not on Twitter page!');

            navigateToTwitterHome(function() {
                performInteraction();
            });
            return;
        }

        if (!tab.url.includes('/home')) {
            addInteractionResult('info', 'Redirecting to Twitter home page...');

            navigateToTwitterHome(function() {
                performInteraction();
            });
            return;
        }

        // Pass the current settings to the content script
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: interactWithPosts,
            args: [likeEnabled, retweetEnabled]
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error("Script execution error:", chrome.runtime.lastError);
                addInteractionResult('error', 'Interaction error: ' + chrome.runtime.lastError.message);
            } else if (results && results[0]) {
                const result = results[0].result;
                
                if (result.success) {
                    interactionCount++;

                    updateProgressBar();

                    if (result.liked && result.retweeted) {
                        addInteractionResult('success', `@${result.username} - Liked and Retweeted`);
                    } else if (result.liked) {
                        addInteractionResult('success', `@${result.username} - Liked`);
                    } else if (result.retweeted) {
                        addInteractionResult('success', `@${result.username} - Retweeted`);
                    } else {
                        addInteractionResult('info', `@${result.username} - No interaction performed`);
                    }
                } else {
                    addInteractionResult('error', result.error || 'Unknown error occurred');
                }
            }
        });
    });
}

function interactWithPosts(likeEnabled, retweetEnabled) {
    try {
        console.log("Interact settings received:", { likeEnabled, retweetEnabled });

        // Scroll to load more tweets and make sure the page is active
        setTimeout(() => {
            window.scrollBy(0, 500);
            setTimeout(() => {
                window.scrollBy(0, -300);
            }, 500);
        }, 1000);

        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        
        if (tweets.length === 0) {
            return { 
                success: false, 
                error: 'No tweets found on the page' 
            };
        }
        
        console.log(`${tweets.length} tweets found`);

        const randomIndex = Math.floor(Math.random() * tweets.length);
        const selectedTweet = tweets[randomIndex];

        let username = 'unknown';
        const usernameElement = selectedTweet.querySelector('a[role="link"] span');
        if (usernameElement) {
            username = usernameElement.textContent.trim();
        } else {
            const userLink = selectedTweet.querySelector('a[role="link"][href*="/"]');
            if (userLink) {
                const href = userLink.getAttribute('href');
                if (href && href.startsWith('/')) {
                    username = href.split('/')[1];
                }
            }
        }
        
        let liked = false;
        let retweeted = false;

        // Handle like action if enabled
        if (likeEnabled) {
            try {
                const likeButton = selectedTweet.querySelector('[data-testid="like"]');
                if (likeButton) {
                    // Check if already liked
                    const isAlreadyLiked = likeButton.getAttribute('aria-pressed') === 'true';
                    if (!isAlreadyLiked) {
                        likeButton.click();
                        liked = true;
                        console.log(`Tweet liked: @${username}`);
                    } else {
                        console.log(`Tweet already liked: @${username}`);
                        liked = true; // Consider it a success even if already liked
                    }
                } else {
                    console.log('Like button not found');
                }
            } catch (likeError) {
                console.error('Error while liking tweet:', likeError);
            }
        }

        // Handle retweet action if enabled
        if (retweetEnabled) {
            try {
                const retweetButton = selectedTweet.querySelector('[data-testid="retweet"]');
                if (retweetButton) {
                    // Check if already retweeted
                    const isAlreadyRetweeted = retweetButton.getAttribute('aria-pressed') === 'true';
                    if (!isAlreadyRetweeted) {
                        retweetButton.click();
                        
                        // Wait for retweet confirmation dialog
                        setTimeout(() => {
                            try {
                                const confirmButton = document.querySelector('[data-testid="retweetConfirm"]');
                                if (confirmButton) {
                                    confirmButton.click();
                                    retweeted = true;
                                    console.log(`Tweet retweeted: @${username}`);
                                } else {
                                    console.log('Retweet confirmation button not found');
                                }
                            } catch (confirmError) {
                                console.error('Error while confirming retweet:', confirmError);
                            }
                        }, 1000); // Increased timeout for retweet confirmation
                    } else {
                        console.log(`Tweet already retweeted: @${username}`);
                        retweeted = true; // Consider it a success even if already retweeted
                    }
                } else {
                    console.log('Retweet button not found');
                }
            } catch (retweetError) {
                console.error('Error while retweeting:', retweetError);
            }
        }
        
        return {
            success: true,
            username: username,
            liked: liked,
            retweeted: retweeted
        };
    } catch (error) {
        console.error('Interaction error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function updateRunningState(isRunning) {
    const startBtn = document.getElementById('startAutoInteract');
    const stopBtn = document.getElementById('stopAutoInteract');
    const progressContainer = document.getElementById('interactionProgress');
    
    if (startBtn) {
        startBtn.disabled = isRunning;
    }
    
    if (stopBtn) {
        stopBtn.disabled = !isRunning;
    }
    
    if (progressContainer) {
        progressContainer.style.display = isRunning ? 'block' : 'none';
    }
}

function resetProgressBar() {
    const progressBar = document.getElementById('interactionProgressBar');
    const progressCounter = document.getElementById('interactionCounter');
    
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    
    if (progressCounter) {
        progressCounter.textContent = maxInteractions > 0 ? `0/${maxInteractions}` : '0';
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('interactionProgressBar');
    const progressCounter = document.getElementById('interactionCounter');
    
    if (progressBar && maxInteractions > 0) {
        const percentage = (interactionCount / maxInteractions) * 100;
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
    }
    
    if (progressCounter) {
        progressCounter.textContent = maxInteractions > 0 ? `${interactionCount}/${maxInteractions}` : interactionCount.toString();
    }
}

function clearInteractionResults() {
    const resultsList = document.getElementById('interactionResults');
    if (resultsList) {
        resultsList.innerHTML = '';
    }
}

function addInteractionResult(type, message) {
    const resultsList = document.getElementById('interactionResults');
    if (resultsList) {
        const resultItem = document.createElement('div');
        resultItem.className = `interaction-result ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();

        let resultContent = '';
        if (currentProfileImage && type === 'success') {
            resultContent = `
                <img src="${currentProfileImage}" alt="Profile" class="result-profile-image">
                <div class="result-content">
                    <span class="result-time">${timestamp}</span>
                    <span class="result-message">${message}</span>
                </div>
            `;
            resultItem.classList.add('with-profile-image');
        } else {
            resultContent = `
                <span class="result-time">${timestamp}</span>
                <span class="result-message">${message}</span>
            `;
        }
        
        resultItem.innerHTML = resultContent;
        
        resultsList.insertBefore(resultItem, resultsList.firstChild);

        if (resultsList.children.length > 100) {
            resultsList.removeChild(resultsList.lastChild);
        }
    }
}