import { initializeTokenizer } from './modules/tokenizer';
import { isJapanesePage } from './modules/utils/japanese';
import { injectFurigana, shouldSkipTextNode } from './modules/furigana/injector';
import { addSelectionListener } from './modules/events/listeners';

let isInitializing = false;
let listenersInitialized = false;

async function initialize() {
    if (isInitializing) {
        return;
    }

    if (document.documentElement.hasAttribute('data-yomisaver-processed')) {
        return;
    }

    if (!document.body) {
        return;
    }

    if (!isJapanesePage()) {
        return;
    }

    isInitializing = true;

    try {
        await initializeTokenizer();
        await traverseDOM(document.body);

        document.documentElement.setAttribute('data-yomisaver-processed', 'true');

        if (!listenersInitialized) {
            addSelectionListener();
            listenersInitialized = true;
        }

        await applySavedSettings();
    } catch (error) {
        console.error('YomiSaver initialization failed:', error);
    } finally {
        isInitializing = false;
    }
}

async function traverseDOM(root) {
    try {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    return shouldSkipTextNode(node)
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;

        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            await injectFurigana(textNode);
        }
    } catch (error) {
        console.error('Error in traverseDOM:', error);
    }
}

function updatePopupSize(size) {
    document.documentElement.style.setProperty('--popup-scale', size);
}

function updateFontSize(size) {
    document.documentElement.style.setProperty('--font-scale', size);
}

function setFuriganaVisibility(visible) {
    const furiganaElements = document.querySelectorAll('.yomisaver-ruby rt');

    furiganaElements.forEach(rt => {
        rt.style.display = visible ? 'block' : 'none';
    });

    document.documentElement.dataset.yomisaverFurigana = visible ? 'visible' : 'hidden';
}

function applySavedSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(['popupSize', 'fontSize', 'furiganaVisible'], data => {
            if (data.popupSize) {
                updatePopupSize(data.popupSize / 100);
            }

            if (data.fontSize) {
                updateFontSize(data.fontSize / 100);
            }

            if (data.furiganaVisible !== undefined) {
                setFuriganaVisibility(data.furiganaVisible);
            }

            resolve();
        });
    });
}

chrome.runtime.onMessage.addListener((message) => {
    if (!message || !message.action) {
        return;
    }

    if (message.action === 'updatePopupSize') {
        updatePopupSize(message.size);
    }

    if (message.action === 'updateFontSize') {
        updateFontSize(message.size);
    }

    if (message.action === 'toggleFurigana') {
        setFuriganaVisibility(message.visible);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}