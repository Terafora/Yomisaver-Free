// Create a context menu for saving vocabulary
chrome.contextMenus.create({
    id: "saveVocab",
    title: "Save Word to Flashcards",
    contexts: ["selection"] // This only shows the menu when text is selected
});

// Add a listener for context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "saveVocab" && info.selectionText) {
        saveVocabulary(info.selectionText, "Context not provided", "Reading unavailable");
    }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "saveVocabulary") {
        saveVocabulary(message.text, "Context not provided", "Reading unavailable", message.wordInfo);
    }
});

let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Add connection recovery
chrome.runtime.onStartup.addListener(() => {
    connectionAttempts = 0;
});

// Add API proxy handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "lookupWord") {
        handleWordLookup(message, sender, sendResponse);
        return true; // Keep the message channel open for async response
    }
    // ...existing message handlers...
});

async function handleWordLookup(message, sender, sendResponse) {
    try {
        const response = await fetch(
            `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(message.word)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'YomiSaver-Extension'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data });
        connectionAttempts = 0;
    } catch (error) {
        console.error('Proxy fetch error:', error);
        
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            connectionAttempts++;
            // Retry after delay
            setTimeout(() => handleWordLookup(message, sender, sendResponse), 1000);
        } else {
            sendResponse({ success: false, error: error.message });
        }
    }
}

// Update saveVocabulary function
function saveVocabulary(word, sentence, reading, wordInfo) {
    console.log('Saving vocabulary:', { word, sentence, reading, wordInfo });
    
    chrome.storage.local.get({ vocabList: [] }, (data) => {
        const vocabList = data.vocabList || [];
        const newEntry = {
            word,
            sentence: wordInfo?.sentence || sentence,
            reading: wordInfo?.reading || reading,
            wordInfo: {
                reading: wordInfo?.reading || reading,
                meanings: wordInfo?.meanings || [],
                jlpt: wordInfo?.jlpt || [],
                sentence: wordInfo?.sentence || sentence
            },
            timestamp: Date.now()
        };

        console.log('New entry:', newEntry);
        
        const isDuplicate = vocabList.some(entry => entry.word === word);
        if (!isDuplicate) {
            vocabList.push(newEntry);
            chrome.storage.local.set({ vocabList }, () => {
                console.log('Vocabulary saved:', newEntry);
                chrome.runtime.sendMessage({ 
                    action: 'vocabUpdated',
                    entry: newEntry 
                });
            });
        }
    });
}
