import kuromoji from 'kuromoji';

// Constants
const DICTIONARY_PATH = "path/to/dictionary";

// Function to tokenize and inject furigana
function injectFurigana(node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        kuromoji.builder({ dicPath: DICTIONARY_PATH }).build((err, tokenizer) => {
            if (err) throw err;

            const tokens = tokenizer.tokenize(node.textContent);
            const rubyContent = tokens.map(token => {
                if (token.reading) {
                    return `<ruby>${token.surface_form}<rt>${token.reading}</rt></ruby>`;
                }
                return token.surface_form;
            }).join("");

            // Replace text node with processed content
            const wrapper = document.createElement("span");
            wrapper.innerHTML = rubyContent;
            node.replaceWith(wrapper);
        });
    }
}

// Traverse and process the DOM
function traverseDOM(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        injectFurigana(node);
    }
}

// Trigger DOM processing on page load
document.addEventListener("DOMContentLoaded", () => {
    traverseDOM(document.body);
});

// Function to highlight and send selected text to background for saving
function addSelectionListener() {
    document.addEventListener("mouseup", () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            console.log(`Selected text: ${selectedText}`); // For debugging
            chrome.runtime.sendMessage({
                action: "saveVocabulary",
                text: selectedText
            });
        }
    });
}

// Add the selection listener
addSelectionListener();
