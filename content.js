const kuromoji = require('kuromoji');

// Constants and cache
let tokenizer = null;
let fadeTimer = null;
let isInitializing = false;

// Add processed marker check
function isPageProcessed() {
    return document.documentElement.hasAttribute('data-yomisaver-processed');
}

function markPageAsProcessed() {
    document.documentElement.setAttribute('data-yomisaver-processed', 'true');
}

// Function to check if the page language is set to Japanese
function isJapanesePage() {
    const htmlLang = document.documentElement.lang;
    return htmlLang && htmlLang.startsWith('ja');
}

// Main initialization function with guard
async function initialize() {
    if (isInitializing || document.documentElement.hasAttribute('data-yomisaver-processed')) {
        console.log("YomiSaver: Already processing or processed. Skipping.");
        return;
    }

    if (!isJapanesePage()) {
        console.log("YomiSaver: Page language is not set to Japanese. Exiting.");
        return;
    }

    isInitializing = true;

    try {
        console.log("Starting initialization...");
        await initializeTokenizer();
        console.log("Processing document body...");
        await traverseDOM(document.body);
        document.documentElement.setAttribute('data-yomisaver-processed', 'true');
        addSelectionListener();
        console.log("Initial processing complete");
    } catch (error) {
        console.error("Error in initialization:", error);
    } finally {
        isInitializing = false;
    }
}

// Keep only one initialization entry point
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}

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

// Update removeExistingPopup function
function removeExistingPopup() {
    if (popup) {
        if (fadeTimer) {
            clearTimeout(fadeTimer);
        }
        if (activePopupTimer) {
            clearTimeout(activePopupTimer);
            activePopupTimer = null;
        }
        popup.classList.add('fade-out');
        fadeTimer = setTimeout(() => {
            popup.remove();
            popup = null;
            fadeTimer = null;
        }, 300); // Faster fade out
    }
}

// Add helper function to filter tags
function filterWaniKaniTags(tags) {
    return tags.filter(tag => !tag.startsWith('wanikani'));
}

// Add helper to get sentence context
function getSentenceContext(word) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return "";

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const textNode = startNode.nodeType === Node.TEXT_NODE ? startNode : startNode.firstChild;
    
    if (!textNode) return "";

    // Get parent paragraph or similar container
    const container = textNode.parentElement?.closest('p, div, td, li') || textNode.parentElement;
    if (!container) return "";

    const text = container.textContent;
    const sentences = text.split(/[。.！!？?]/g);
    
    // Find sentence containing the word
    const sentenceWithWord = sentences.find(s => s.includes(word)) || "";
    return sentenceWithWord.trim();
}

// Modify createPopup function to include sentence context and close button
function createPopup(wordInfo, rect) {
    if (fadeTimer) {
        clearTimeout(fadeTimer);
        fadeTimer = null;
    }
    
    const popup = document.createElement('div');
    popup.className = 'yomisaver-popup fade-in';

    // Get surrounding sentence context
    const sentence = getSentenceContext(wordInfo.word);

    function cleanText(text) {
        return text.replace(/<[^>]+>/g, "");
    }

    const cleanWord = cleanText(wordInfo.word);
    
    // Format meanings with filtered tags
    const meaningsHTML = wordInfo.meanings.map(meaning => {
        const pos = meaning.partOfSpeech.length ? 
            `<span class="pos">${meaning.partOfSpeech.join(', ')}</span>` : '';
        const filteredTags = filterWaniKaniTags(meaning.tags);
        const tags = filteredTags.length ? 
            `<span class="tags">${filteredTags.join(', ')}</span>` : '';
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
        <button class="close-button" aria-label="Close">×</button>
        <div class="header">
            <div class="word">${cleanWord}</div>
            ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
            ${jlptInfo}
        </div>
        <div class="meanings-container">
            ${meaningsHTML}
            <button class="save-vocab-btn">Save to Flashcards</button>
        </div>
    `;

    // Update close button handler
    const closeButton = popup.querySelector('.close-button');
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        if (popup) {
            popup.classList.add('fade-out');
            setTimeout(() => {
                popup.remove();
                popup = null;
            }, 300);
        }
    });

    // Add save button click handler
    const saveBtn = popup.querySelector('.save-vocab-btn');
    saveBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: "saveVocabulary",
            text: cleanWord,
            sentence: sentence,
            reading: wordInfo.reading,
            wordInfo: wordInfo
        });
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
    });

    // Add mouseenter handler to clear auto-close timer
    popup.addEventListener('mouseenter', () => {
        if (activePopupTimer) {
            clearTimeout(activePopupTimer);
            activePopupTimer = null;
        }
        if (fadeTimer) {
            clearTimeout(fadeTimer);
            fadeTimer = null;
            popup.classList.remove('fade-out');
            popup.classList.add('fade-in');
        }
    });

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

    // Add mouseenter/mouseleave handlers
    popup.addEventListener('mouseenter', () => {
        if (activePopupTimer) {
            clearTimeout(activePopupTimer);
            activePopupTimer = null;
        }
    });

    popup.addEventListener('mouseleave', (event) => {
        // Check if moving to buffer zone
        const rect = popup.getBoundingClientRect();
        const buffer = 30; // Match CSS buffer zone
        if (event.clientX >= rect.left - buffer && 
            event.clientX <= rect.right + buffer &&
            event.clientY >= rect.top - buffer && 
            event.clientY <= rect.bottom + buffer) {
            return;
        }
        
        activePopupTimer = setTimeout(() => {
            removeExistingPopup();
        }, 300); // Shorter delay before fade out
    });
    
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
    // Increase debounce delay
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
                }, 5000); // Increased from 3000 to 5000ms
            }
        } catch (error) {
            console.error("Error showing popup:", error);
            removeExistingPopup();
        }
    }, 100); // Reduced from 200 to 100ms for faster response

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
        
        // Remove highlight from word
        const wordElement = target.classList.contains('yomisaver-word') ? 
            target : target.closest('.yomisaver-word');
        if (wordElement) {
            wordElement.classList.remove('highlight');
        }

        if (!popup) return;
        
        // Don't remove if moving to popup or its buffer zone
        if (relatedTarget && (
            popup.contains(relatedTarget) || 
            popup === relatedTarget ||
            (relatedTarget.closest && relatedTarget.closest('.yomisaver-popup'))
        )) {
            if (fadeTimer) {
                clearTimeout(fadeTimer);
                fadeTimer = null;
                popup.classList.remove('fade-out');
                popup.classList.add('fade-in');
            }
            return;
        }

        // Only start fade if we're actually leaving the popup area
        if (!popup.contains(target)) {
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
