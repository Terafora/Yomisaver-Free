import kuromoji from 'kuromoji';

// Constants
const DICTIONARY_PATH = "path/to/dictionary";

// Load the dictionary and build the tokenizer
kuromoji.builder({ dicPath: DICTIONARY_PATH }).build((err, tokenizer) => {
    if (err) throw err;

    const input = "日本語の例文";
    const tokens = tokenizer.tokenize(input);
    tokens.forEach(token => {
        const { surface_form: word, reading } = token;

        if (reading) {
            // If reading exists, match characters and create furigana
            const ruby = `
                <ruby>
                    ${word}
                    <rt>${reading}</rt>
                </ruby>`;
            console.log(ruby); // Replace with DOM manipulation logic to inject into the page
        } else {
            console.log(word); // Handle tokens without readings
        }
    });
});

// Function to inject furigana into DOM
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

// Reusable function to save vocabulary
function saveVocabulary(word, sentence, reading) {
    chrome.storage.local.get({ vocabList: [] }, (data) => {
        const vocabList = data.vocabList || [];
        const newEntry = { word, sentence, reading };
        vocabList.push(newEntry);

        chrome.storage.local.set({ vocabList }, () => {
            console.log("Vocabulary saved!", newEntry);
        });
    });
}

// Example: Save a word manually
saveVocabulary("日本語", "日本語の例文", "にほんご");

// Export vocabulary function
function exportVocabulary() {
    chrome.storage.local.get('vocabList', (data) => {
        const csv = data.vocabList
            .map(item => `${item.word},${item.reading},${item.sentence}`)
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'anki_export.csv';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Attach export functionality (for popup or external UI)
document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.getElementById('export-btn');
    if (exportButton) {
        exportButton.addEventListener('click', exportVocabulary);
    }
});

chrome.contextMenus.create({
    id: "saveVocab",
    title: "Save Word to Flashcards",
    contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "saveVocab" && info.selectionText) {
        // Save selected text (implement tokenizer to extract reading)
        saveVocabulary(info.selectionText, "Example sentence", "Reading");
    }
});
