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

// Add these helper functions
function isKanji(char) {
    return /[\u4e00-\u9faf]/.test(char);
}

function katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
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
        wrapper.className = 'yomisaver-text';  // Add class for selection handling
        wrapper.innerHTML = tokens.map(token => {
            if (token.reading && [...token.surface_form].some(isKanji)) {
                const hiraganaReading = katakanaToHiragana(token.reading);
                return `<ruby class="yomisaver-word">${token.surface_form}<rt>${hiraganaReading}</rt></ruby>`;
            }
            return `<span class="yomisaver-word">${token.surface_form}</span>`;
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
        if (wordCache.has(word)) {
            return wordCache.get(word);
        }

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: "lookupWord", word },
                response => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.error('Error:', chrome.runtime.lastError || response?.error || 'Unknown error');
                        resolve(null);
                        return;
                    }

                    if (response.data.data && response.data.data.length > 0) {
                        const data = response.data.data[0];
                        const wordInfo = {
                            word: word,
                            reading: data.japanese[0].reading || '',
                            meanings: data.senses.map(sense => ({
                                definitions: sense.english_definitions,
                                partOfSpeech: sense.parts_of_speech,
                                tags: sense.tags,
                                info: sense.info || []
                            })),
                            jlpt: data.jlpt || [],
                            tags: data.tags || []
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
    
    const cleanWord = wordInfo.word.replace(/<[^>]+>/g, '');
    
    // Format meanings with their grammatical info
    const meaningsHTML = wordInfo.meanings.map(meaning => {
        const pos = meaning.partOfSpeech.length ? 
            `<span class="pos">${meaning.partOfSpeech.join(', ')}</span>` : '';
        const tags = meaning.tags.length ? 
            `<span class="tags">${meaning.tags.join(', ')}</span>` : '';
        const info = meaning.info.length ? 
            `<span class="info">${meaning.info.join(', ')}</span>` : '';
        return `
            <div class="meaning-group">
                ${pos}${tags}${info}
                <div class="definitions">${meaning.definitions.join('; ')}</div>
            </div>
        `;
    }).join('');

    // Add JLPT level if available
    const jlptInfo = wordInfo.jlpt.length ? 
        `<div class="jlpt">${wordInfo.jlpt.join(', ').toUpperCase()}</div>` : '';

    popup.innerHTML = `
        <div class="header">
            <div class="word">${cleanWord}</div>
            ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
            ${jlptInfo}
        </div>
        <div class="meanings-container">${meaningsHTML}</div>
    `;

    // Add to document first so we can measure it
    document.body.appendChild(popup);
    
    // Calculate position
    const popupRect = popup.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default position above the selection
    let top = rect.top + window.scrollY - popupRect.height - 10;
    let left = rect.left + window.scrollX;
    
    // If popup would go off top, position it below
    if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 10;
    }
    
    // If popup would go off right, align it to right edge
    if (left + popupRect.width > viewportWidth) {
        left = viewportWidth - popupRect.width - 10;
    }
    
    // Ensure minimum left position
    left = Math.max(10, left);
    
    // Apply position
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    
    return popup;
}

// Update selection listener with better word detection
async function addSelectionListener() {
    document.addEventListener("mouseup", async () => {
        try {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            removeExistingPopup();

            if (!selectedText || !selection.rangeCount) return;

            // Get the range and its bounding rectangle
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Try to get word info regardless of element class
            const wordInfo = await lookupWord(selectedText);
            if (wordInfo) {
                popup = createPopup(wordInfo, rect);
                document.body.appendChild(popup);

                // Adjust popup position if needed
                const popupRect = popup.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                if (popupRect.bottom > viewportHeight) {
                    // If popup would go below viewport, position it above selection
                    popup.style.top = `${rect.top + window.scrollY - popupRect.height - 10}px`;
                }

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

    // Remove popup when clicking outside or on escape key
    document.addEventListener("mousedown", (event) => {
        if (popup && !popup.contains(event.target)) {
            removeExistingPopup();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
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
