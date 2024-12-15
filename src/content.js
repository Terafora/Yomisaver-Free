import { initializeTokenizer } from './modules/tokenizer';
import { isJapanesePage } from './modules/utils/japanese';
import { createPopup } from './modules/popup/popup';
import { injectFurigana } from './modules/furigana/injector';
import { addSelectionListener } from './modules/events/listeners';
import { lookupWord } from './modules/dictionary'; // Add this import

let isInitializing = false;

async function initialize() {
    if (isInitializing || document.documentElement.hasAttribute('data-yomisaver-processed')) return;
    if (!isJapanesePage()) return;

    isInitializing = true;
    try {
        await initializeTokenizer();
        await traverseDOM(document.body);
        document.documentElement.setAttribute('data-yomisaver-processed', 'true');
        addSelectionListener();
    } finally {
        isInitializing = false;
    }
}

async function traverseDOM(root) {
    try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        const promises = [];
        let node;
        while ((node = walker.nextNode())) {
            promises.push(injectFurigana(node));
        }
        await Promise.all(promises.filter(Boolean));
    } catch (error) {
        console.error("Error in traverseDOM:", error);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}
