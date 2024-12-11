const kuromoji = require('kuromoji');

// Constants for jsDelivr CDN
const JMDICT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/jmdict-util@latest/build';
let jmdictCache = new Map();

// Modified dictionary lookup function
async function lookupWord(word) {
    try {
        // Check cache first
        if (jmdictCache.has(word)) {
            return jmdictCache.get(word);
        }

        // Calculate which file to fetch based on first character
        const firstChar = word.charAt(0);
        const fileName = `words_${encodeURIComponent(firstChar)}.json`;
        const response = await fetch(`${JMDICT_CDN_BASE}/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const wordList = await response.json();
        
        // Cache all words from this file
        for (const entry of wordList) {
            jmdictCache.set(entry.word, entry);
        }
        
        // Return the requested word if found
        return jmdictCache.get(word) || null;
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

// Update selection listener to use new lookup
async function addSelectionListener() {
    document.addEventListener("mouseup", async () => {
        try {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                const wordInfo = await lookupWord(selectedText);
                if (wordInfo) {
                    chrome.runtime.sendMessage({
                        action: "saveVocabulary",
                        text: selectedText,
                        wordInfo: wordInfo
                    });
                }
            }
        } catch (error) {
            console.error("Error in addSelectionListener:", error);
        }
    });
}

// Add the selection listener
try {
    addSelectionListener();
} catch (error) {
    console.error("Error in addSelectionListener initialization:", error);
}
