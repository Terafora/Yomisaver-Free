const kuromoji = require('kuromoji');

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

// Initialize tokenizer once and reuse
let tokenizer = null;

async function initializeTokenizer() {
    if (tokenizer) return tokenizer;
    
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: chrome.runtime.getURL('dict') })
            .build((err, _tokenizer) => {
                if (err) {
                    console.error('Tokenizer initialization error:', err);
                    reject(err);
                    return;
                }
                tokenizer = _tokenizer;
                resolve(tokenizer);
            });
    });
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

// Function to tokenize and inject furigana
async function injectFurigana(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;

    try {
        const tokens = await processText(node.textContent);
        const rubyContent = tokens.map(token => {
            if (token.reading) {
                return `<ruby>${token.surface_form}<rt>${token.reading}</rt></ruby>`;
            }
            return token.surface_form;
        }).join('');

        const wrapper = document.createElement('span');
        wrapper.innerHTML = rubyContent;
        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error in injectFurigana:', error);
    }
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

// Trigger DOM processing on page load
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded event triggered");
    try {
        await traverseDOM(document.body);
    } catch (error) {
        console.error("Error in DOMContentLoaded event:", error);
    }
});

// Update selection listener to show a popup with word info
async function addSelectionListener() {
    let popup = null;

    function removeExistingPopup() {
        if (popup) {
            popup.remove();
            popup = null;
        }
    }

    function createPopup(wordInfo, rect) {
        const popup = document.createElement('div');
        popup.className = 'yomisaver-popup';
        popup.innerHTML = `
            <div class="word">${wordInfo.word}</div>
            ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
            <div class="meanings">${wordInfo.meanings.join('; ')}</div>
        `;

        // Position popup near selection
        popup.style.position = 'fixed';
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        
        return popup;
    }

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
