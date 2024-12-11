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

// Add API proxy handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "lookupWord") {
        fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(message.word)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'YomiSaver-Extension'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => sendResponse({ success: true, data }))
        .catch(error => {
            console.error('Proxy fetch error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep the message channel open for async response
    }
    // ...existing message handlers...
});

// Function to save vocabulary
function saveVocabulary(word, sentence, reading, wordInfo) {
    chrome.storage.local.get({ vocabList: [] }, (data) => {
        const vocabList = data.vocabList || [];
        const newEntry = { word, sentence, reading, wordInfo };

        // Check for duplicates
        if (!vocabList.some(entry => entry.word === word && entry.sentence === sentence)) {
            vocabList.push(newEntry);

            chrome.storage.local.set({ vocabList }, () => {
                console.log("Vocabulary saved:", newEntry);
            });
        } else {
            console.log("Duplicate entry skipped:", newEntry);
        }
    });
}
