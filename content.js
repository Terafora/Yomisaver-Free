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

// Add this new helper function at the top level
function getCleanSelectedText() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    // Remove all rt elements (furigana readings)
    container.querySelectorAll('rt').forEach(rt => rt.remove());

    // Get text content from ruby elements
    container.querySelectorAll('ruby').forEach(ruby => {
        const text = ruby.textContent.trim();
        ruby.replaceWith(text);
    });

    // Clean any remaining HTML and get plain text
    return container.textContent.trim();
}

// Add this helper function to get clean text from elements
function getCleanTextFromElement(element) {
    // If element is or is inside a ruby element, get only the base text
    const rubyElement = element.closest('ruby');
    if (rubyElement) {
        // Clone the ruby element to avoid modifying the DOM
        const clone = rubyElement.cloneNode(true);
        // Remove all rt elements
        clone.querySelectorAll('rt').forEach(rt => rt.remove());
        return clone.textContent.trim();
    }
    
    // For non-ruby elements, just get the text content
    return element.textContent.trim();
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
let activePopupTimer = null;

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

    function cleanText(text) {
        return text.replace(/<[^>]+>/g, ""); // Strip HTML tags
    }

    const cleanWord = cleanText(wordInfo.word);
    
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

// Add a debounce helper at the top level
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update the selection listener to use hover
async function addSelectionListener() {
    // Debounced version of popup creation
    const debouncedShowPopup = debounce(async (element, rect) => {
        try {
            // Add highlight class to hovered element
            const wordElement = element.classList.contains('yomisaver-word') ? 
                element : element.closest('.yomisaver-word');
            if (wordElement) {
                wordElement.classList.add('highlight');
            }

            const text = getCleanTextFromElement(element);
            if (!text) return;

            // Clear any existing popup and timer
            if (activePopupTimer) {
                clearTimeout(activePopupTimer);
                activePopupTimer = null;
            }
            removeExistingPopup();

            const wordInfo = await lookupWord(text);
            
            if (wordInfo) {
                popup = createPopup(wordInfo, rect);
                document.body.appendChild(popup);

                const popupRect = popup.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                if (popupRect.bottom > viewportHeight) {
                    popup.style.top = `${rect.top + window.scrollY - popupRect.height - 10}px`;
                }

                // Set new timer for this popup
                activePopupTimer = setTimeout(() => {
                    removeExistingPopup();
                    activePopupTimer = null;
                }, 3000); // Popup will auto-close after 3 seconds unless mouse enters it

                chrome.runtime.sendMessage({
                    action: "saveVocabulary",
                    text: text,
                    wordInfo: wordInfo
                });
            }
        } catch (error) {
            console.error("Error showing popup:", error);
            removeExistingPopup();
        }
    }, 200); // 200ms delay

    // Add hover listener to document
    document.addEventListener("mouseover", (event) => {
        const target = event.target;
        if (target.classList.contains('yomisaver-word') || 
            target.closest('.yomisaver-word')) {
            const rect = target.getBoundingClientRect();
            debouncedShowPopup(target, rect);
        }
    });

    // Remove popup and highlight when mouse leaves word
    document.addEventListener("mouseout", (event) => {
        const target = event.target;
        const relatedTarget = event.relatedTarget;
        
        // Remove highlight from previous word
        const wordElement = target.classList.contains('yomisaver-word') ? 
            target : target.closest('.yomisaver-word');
        if (wordElement) {
            wordElement.classList.remove('highlight');
        }

        if (!popup) return;
        
        // Don't remove popup if moving to the popup itself
        if (relatedTarget && (popup.contains(relatedTarget) || popup === relatedTarget)) {
            return;
        }

        // Remove popup if leaving a yomisaver element
        if (target.classList.contains('yomisaver-word') || 
            target.closest('.yomisaver-word')) {
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
