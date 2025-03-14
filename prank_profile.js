/**
 * Twitter Profile Prank Feature
 * This script allows users to visually modify their Twitter profile stats
 * (followers, following, posts) and verification status.
 * 
 * Note: These changes are only visual and do not affect the actual Twitter profile.
 */

// Default settings
let prankSettings = {
    followers: null,
    following: null,
    posts: null,
    verified: 'none',
    blurUsername: false,
    isActive: false
};

// DOM Elements
let followersInput, followingInput, postsInput, verifiedSelect, blurUsernameCheckbox;
let applyButton, resetButton, captureButton;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Prank Profile: DOM loaded");
    
    // Get DOM elements
    followersInput = document.getElementById('prankFollowers');
    followingInput = document.getElementById('prankFollowing');
    postsInput = document.getElementById('prankPosts');
    verifiedSelect = document.getElementById('prankVerified');
    blurUsernameCheckbox = document.getElementById('prankBlurUsername');
    applyButton = document.getElementById('applyPrankButton');
    resetButton = document.getElementById('resetPrankButton');
    captureButton = document.getElementById('captureProfileButton');
    
    // Load saved settings
    loadPrankSettings();
    
    // Add event listeners
    if (applyButton) {
        applyButton.addEventListener('click', applyPrankSettings);
        console.log("Prank Profile: Apply button listener added");
    } else {
        console.error("Prank Profile: Apply button not found");
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetPrankSettings);
        console.log("Prank Profile: Reset button listener added");
    } else {
        console.error("Prank Profile: Reset button not found");
    }
    
    if (captureButton) {
        captureButton.addEventListener('click', captureProfileScreenshot);
        console.log("Prank Profile: Capture button listener added");
    } else {
        console.error("Prank Profile: Capture button not found");
    }
    
    // Add debug button if in development mode
    addDebugButton();
    
    // Update input fields with saved values
    updateInputFields();
    
    // Set up message listener for asynchronous responses from content script
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        console.log("Received message in popup:", message);
        
        if (message.action === 'screenshotCaptured') {
            console.log("Screenshot captured successfully");
            showCapturedScreenshot(message.imageData);
            resetCaptureButton();
        } else if (message.action === 'screenshotError') {
            console.error("Error capturing screenshot:", message.error);
            showCaptureError(message.error);
            resetCaptureButton();
        }
        
        // Return true to indicate we might respond asynchronously
        return true;
    });
});

/**
 * Add a debug button to the prank profile section
 */
function addDebugButton() {
    // Check if we're in development mode
    chrome.storage.local.get('debugMode', function(data) {
        if (data.debugMode) {
            console.log("Debug mode enabled, adding debug button");
            
            // Create debug button
            const debugButton = document.createElement('button');
            debugButton.textContent = 'Analyze Twitter Structure';
            debugButton.className = 'prank-profile-button prank-profile-button-secondary';
            debugButton.style.marginTop = '10px';
            
            // Add event listener
            debugButton.addEventListener('click', analyzeTwitterStructure);
            
            // Add to DOM
            const noteElement = document.querySelector('.prank-profile-note');
            if (noteElement) {
                noteElement.appendChild(debugButton);
            }
        }
    });
}

/**
 * Analyze Twitter's HTML structure
 */
function analyzeTwitterStructure() {
    console.log("Sending analyze request to content script");
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            console.error("No active tab found");
            return;
        }
        
        const activeTab = tabs[0];
        if (!activeTab.url || !(activeTab.url.includes('twitter.com') || activeTab.url.includes('x.com'))) {
            console.error("Active tab is not a Twitter page");
            return;
        }
        
        chrome.tabs.sendMessage(activeTab.id, {
            action: 'analyzeTwitterStructure'
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error("Error sending analyze message:", chrome.runtime.lastError.message);
            } else {
                console.log("Analysis response:", response);
            }
        });
    });
}

/**
 * Load saved prank settings from storage
 */
function loadPrankSettings() {
    chrome.storage.local.get('prankSettings', function(data) {
        if (data.prankSettings) {
            prankSettings = data.prankSettings;
            console.log("Prank Profile: Loaded settings", prankSettings);
            updateInputFields();
            
            // If prank is active, apply it to any open Twitter tabs
            if (prankSettings.isActive) {
                applyPrankToAllTabs();
            }
        }
    });
}

/**
 * Update input fields with saved values
 */
function updateInputFields() {
    if (followersInput && prankSettings.followers !== null) {
        followersInput.value = prankSettings.followers;
    }
    
    if (followingInput && prankSettings.following !== null) {
        followingInput.value = prankSettings.following;
    }
    
    if (postsInput && prankSettings.posts !== null) {
        postsInput.value = prankSettings.posts;
    }
    
    if (verifiedSelect) {
        verifiedSelect.value = prankSettings.verified;
    }
    
    if (blurUsernameCheckbox) {
        blurUsernameCheckbox.checked = prankSettings.blurUsername;
    }
}

/**
 * Apply prank settings from input fields
 */
function applyPrankSettings() {
    console.log("Prank Profile: Apply button clicked");
    
    // Get values from input fields
    prankSettings.followers = followersInput.value ? parseInt(followersInput.value) : null;
    prankSettings.following = followingInput.value ? parseInt(followingInput.value) : null;
    prankSettings.posts = postsInput.value ? parseInt(postsInput.value) : null;
    prankSettings.verified = verifiedSelect.value;
    prankSettings.blurUsername = blurUsernameCheckbox ? blurUsernameCheckbox.checked : false;
    prankSettings.isActive = true;
    
    // Show loading state
    const applyButton = document.getElementById('applyPrankButton');
    if (applyButton) {
        applyButton.textContent = 'Applying...';
        applyButton.disabled = true;
    }
    
    // Save settings
    chrome.storage.local.set({ prankSettings: prankSettings }, function() {
        console.log('Prank settings saved:', prankSettings);
        
        // Apply to all Twitter tabs
        applyPrankToAllTabs();
        
        // Show success message
        setTimeout(() => {
            if (applyButton) {
                applyButton.textContent = 'Applied!';
                setTimeout(() => {
                    applyButton.textContent = 'Apply Changes';
                    applyButton.disabled = false;
                }, 2000);
            }
            
            // Show notification
            showNotification('Changes applied successfully!', 'success');
        }, 1000);
    });
}

/**
 * Show a notification to the user
 */
function showNotification(message, type = 'info') {
    // Check if notification element already exists
    let notification = document.querySelector('.prank-notification');
    
    // If not, create it
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'prank-notification';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        notification.style.zIndex = '9999';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        notification.style.opacity = '0';
        
        document.body.appendChild(notification);
    }
    
    // Set notification style based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
    } else {
        notification.style.backgroundColor = '#2196F3';
        notification.style.color = 'white';
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        
        // Remove notification after fade out
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Reset prank settings
 */
function resetPrankSettings() {
    console.log("Prank Profile: Reset button clicked");
    
    // Reset settings
    prankSettings = {
        followers: null,
        following: null,
        posts: null,
        verified: 'none',
        blurUsername: false,
        isActive: false
    };
    
    // Clear input fields
    if (followersInput) followersInput.value = '';
    if (followingInput) followingInput.value = '';
    if (postsInput) postsInput.value = '';
    if (verifiedSelect) verifiedSelect.value = 'none';
    if (blurUsernameCheckbox) blurUsernameCheckbox.checked = false;
    
    // Show loading state
    const resetButton = document.getElementById('resetPrankButton');
    if (resetButton) {
        resetButton.textContent = 'Resetting...';
        resetButton.disabled = true;
    }
    
    // Save reset settings
    chrome.storage.local.set({ prankSettings: prankSettings }, function() {
        console.log('Prank settings reset');
        
        // Reset all Twitter tabs
        resetPrankOnAllTabs();
        
        // Show success message
        setTimeout(() => {
            if (resetButton) {
                resetButton.textContent = 'Reset';
                resetButton.disabled = false;
            }
            
            // Show notification
            showNotification('Profile reset to original values', 'info');
        }, 1000);
    });
}

/**
 * Apply prank to all open Twitter tabs
 */
function applyPrankToAllTabs() {
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, function(tabs) {
        console.log("Prank Profile: Found " + tabs.length + " Twitter tabs to update");
        
        tabs.forEach(function(tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'applyPrankProfile',
                settings: prankSettings
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log("Error sending message to tab " + tab.id + ": " + chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent to tab " + tab.id, response);
                }
            });
        });
    });
}

/**
 * Reset prank on all open Twitter tabs
 */
function resetPrankOnAllTabs() {
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, function(tabs) {
        console.log("Prank Profile: Found " + tabs.length + " Twitter tabs to reset");
        
        tabs.forEach(function(tab) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'resetPrankProfile'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log("Error sending message to tab " + tab.id + ": " + chrome.runtime.lastError.message);
                } else {
                    console.log("Reset message sent to tab " + tab.id, response);
                }
            });
        });
    });
}

/**
 * Capture Twitter profile screenshot
 */
function captureProfileScreenshot() {
    console.log("Capture Profile button clicked");
    
    // Show loading in button
    if (captureButton) {
        captureButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" class="spinner"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg> Capturing...';
        captureButton.disabled = true;
    }
    
    // Check if we're on a Twitter tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length === 0) {
            console.error("No active tab found");
            showCaptureError("No active tab found");
            resetCaptureButton();
            return;
        }
        
        const activeTab = tabs[0];
        if (!activeTab.url || !(activeTab.url.includes('twitter.com') || activeTab.url.includes('x.com'))) {
            console.error("Active tab is not a Twitter page");
            showCaptureError("Please navigate to a Twitter profile page first");
            resetCaptureButton();
            return;
        }

        // First, check if content script is already injected by sending a ping
        chrome.tabs.sendMessage(activeTab.id, { action: 'ping' }, function(response) {
            if (chrome.runtime.lastError || !response) {
                console.log("Content script not found or not responding, injecting it now");
                
                // Inject content script manually
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['prank_profile_content.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error("Failed to inject content script:", chrome.runtime.lastError);
                        showCaptureError("Failed to initialize screen capture. Please refresh the Twitter page.");
                        resetCaptureButton();
                    } else {
                        // Wait a moment for the script to initialize
                        setTimeout(() => {
                            triggerScreenCapture(activeTab.id);
                        }, 1000);
                    }
                });
            } else {
                // Content script is active, send capture command
                triggerScreenCapture(activeTab.id);
            }
        });
    });
}

/**
 * Trigger the actual screen capture after ensuring content script is active
 */
function triggerScreenCapture(tabId) {
    // Send message to content script to capture the profile area
    chrome.tabs.sendMessage(tabId, {
        action: 'captureProfileScreenshot'
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError.message);
            showCaptureError("Failed to capture screenshot: " + chrome.runtime.lastError.message);
        } else if (response && response.error) {
            console.error("Error from content script:", response.error);
            showCaptureError(response.error);
        } else if (response && response.imageData) {
            console.log("Screenshot captured successfully");
            showCapturedScreenshot(response.imageData);
        } else {
            console.error("Unknown error capturing screenshot");
            showCaptureError("Failed to capture screenshot. Please try again.");
        }
        
        resetCaptureButton();
    });
}

/**
 * Reset capture button to its original state
 */
function resetCaptureButton() {
    if (captureButton) {
        captureButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg> Capture Profile Screenshot';
        captureButton.disabled = false;
    }
}

/**
 * Show error message when screenshot capture fails
 */
function showCaptureError(errorMessage) {
    showNotification(errorMessage, 'error');
}

/**
 * Display the captured screenshot in a modal
 */
function showCapturedScreenshot(imageData) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-overlay';
    
    // Create image container
    const container = document.createElement('div');
    container.className = 'screenshot-container';
    
    // Create image element
    const image = document.createElement('img');
    image.src = imageData;
    image.style.maxWidth = '100%';
    image.style.display = 'block';
    container.appendChild(image);
    
    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'screenshot-actions';
    
    // Create save button
    const saveButton = document.createElement('button');
    saveButton.className = 'screenshot-btn screenshot-save-btn';
    saveButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" fill="currentColor"/></svg> Save Image';
    saveButton.addEventListener('click', function() {
        saveScreenshot(imageData);
    });
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'screenshot-btn screenshot-close-btn';
    closeButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/></svg> Close';
    closeButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    // Add buttons to actions
    actions.appendChild(saveButton);
    actions.appendChild(closeButton);
    
    // Add all elements to the overlay
    overlay.appendChild(container);
    overlay.appendChild(actions);
    
    // Add overlay to body
    document.body.appendChild(overlay);
}

/**
 * Save screenshot to user's device
 */
function saveScreenshot(imageData) {
    // Create link element
    const link = document.createElement('a');
    
    // Set link properties
    link.href = imageData;
    
    // Generate filename with date
    const date = new Date();
    const dateString = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    link.download = `twitter-profile-${dateString}.png`;
    
    // Simulate click to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success notification
    showNotification('Screenshot saved successfully!', 'success');
} 