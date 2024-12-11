const kuromoji = require('kuromoji');

// Constants and cache
let tokenizer = null;

// Simplified initialization function
async function initializeTokenizer() {
    if (tokenizer) return tokenizer;
    
    const dicPath = chrome.runtime.getURL('dict');
    console.log("Dictionary path:", dicPath);

    return new Promise((resolve, reject) => {
        console.log("Building tokenizer...");
        kuromoji.builder({ 
            dicPath: dicPath,
            debugMode: true  // Add this for better error messages
        })
        .build((err, _tokenizer) => {
            if (err) {
                console.error('Tokenizer initialization error:', err);
                console.error('Dictionary path used:', dicPath);
                reject(err);
                return;
            }
            console.log('Tokenizer built successfully');
            tokenizer = _tokenizer;
            resolve(tokenizer);
        });
    });
}

// Simplified furigana injection
async function injectFurigana(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
    
    // Skip if parent is already processed or is a special element
    const parentTag = node.parentElement?.tagName;
    if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || 
        parentTag === 'RT' || parentTag === 'RP') {
        return;
    }

    try {
        const tokens = await processText(node.textContent);
        if (!tokens || !tokens.length) return;

        const wrapper = document.createElement('span');
        wrapper.innerHTML = tokens.map(token => {
            if (token.reading && token.reading !== token.surface_form) {
                return `<ruby>${token.surface_form}<rt>${token.reading}</rt></ruby>`;
            }
            return token.surface_form;
        }).join('');

        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error injecting furigana:', error);
    }
}

// Initialize and process
async function initAndProcess() {
    try {
        console.log("Starting initialization...");
        await initializeTokenizer();
        console.log("Processing document body...");
        await traverseDOM(document.body);
        console.log("Initial processing complete");
    } catch (error) {
        console.error("Error in initialization:", error);
    }
}

// Start processing when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAndProcess);
} else {
    initAndProcess();
}

// Constants
const JISHO_API_URL = 'https://jisho.org/api/v1/search/words';
let wordCache = new Map();

// Modified dictionary lookup function
async function lookupWord(word) {
    try {
        // Check cache first
        if (wordCache.has(word)) {
            return wordCache.get(word);
        }

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: "lookupWord", word },
                response => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        resolve(null);
                        return;
                    }

                    if (!response || !response.success) {
                        console.error('API error:', response?.error || 'Unknown error');
                        resolve(null);
                        return;
                    }

                    if (response.data.data && response.data.data.length > 0) {
                        const wordInfo = {
                            word: word,
                            reading: response.data.data[0].japanese[0].reading || '',
                            meanings: response.data.data[0].senses.map(sense => 
                                sense.english_definitions).flat(),
                            tags: response.data.data[0].tags || []
                        };
                        wordCache.set(word, wordInfo);
                        resolve(wordInfo);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error looking up word:', error);
        return null;
    }
}

async function processText(text) {
    try {
        const _tokenizer = await initializeTokenizer();
        return _tokenizer.tokenize(text);
    } catch (error) {
        console.error('Error processing text:', error);
        return [];
    }
}

// Function to check if a character is Japanese
function isJapanese(char) {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(char);
}

// Traverse and process the DOM
async function traverseDOM(root) {
    console.log("traverseDOM called");
    try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const promises = [];
        while ((node = walker.nextNode())) {
            promises.push(injectFurigana(node));
        }
        await Promise.all(promises.filter(p => p)); // Filter out undefined promises
    } catch (error) {
        console.error("Error in traverseDOM:", error);
    }
}

// Update selection listener to show a popup with word info
let popup = null;

function removeExistingPopup() {
    if (popup) {
        popup.remove();
        popup = null;
    }
}

// Move createPopup to the top level so it can be shared
function createPopup(wordInfo, rect) {
    const popup = document.createElement('div');
    popup.className = 'yomisaver-popup';
    popup.innerHTML = `
        <div class="word">${wordInfo.word}</div>
        ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
        <div class="meanings">${wordInfo.meanings.join('; ')}</div>
    `;

    // Position popup near word or selection
    popup.style.position = 'fixed';
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    
    return popup;
}

// Update the selection listener to use shared popup management
async function addSelectionListener() {
    document.addEventListener("mouseup", async () => {
        try {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            // Remove existing popup
            removeExistingPopup();

            // Check if there's valid selected text
            if (!selectedText) {
                return;
            }

            // Verify selection has valid ranges
            if (!selection.rangeCount) {
                console.warn('No valid selection range found');
                return;
            }

            const wordInfo = await lookupWord(selectedText);
            if (wordInfo) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Create and show popup
                popup = createPopup(wordInfo, rect);
                document.body.appendChild(popup);

                // Send to background for saving
                chrome.runtime.sendMessage({
                    action: "saveVocabulary",
                    text: selectedText,
                    wordInfo: wordInfo
                });
            }
        } catch (error) {
            console.error("Error in addSelectionListener:", error);
            removeExistingPopup();
        }
    });

    // Remove popup when clicking outside
    document.addEventListener("mousedown", (event) => {
        if (popup && !popup.contains(event.target)) {
            removeExistingPopup();
        }
    });
}

// Add the selection listener
try {
    addSelectionListener();
} catch (error) {
    console.error("Error in addSelectionListener initialization:", error);
}
