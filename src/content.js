import { initializeTokenizer } from './modules/tokenizer';
import { isJapanesePage } from './modules/utils/japanese';
import {
    injectFurigana,
    setCurrentReadingHelpMode,
    shouldSkipTextNode
} from './modules/furigana/injector';
import { addSelectionListener } from './modules/events/listeners';
import {
    DEFAULT_READING_HELP_MODE,
    READING_HELP_MODE_STORAGE_KEY,
    applyReadingHelpModeToDocument,
    getReadingHelpMode
} from './modules/jlpt/filter';
import { enrichJlptLevelsForDocument } from './modules/jlpt/enricher';

let isInitializing = false;
let listenersInitialized = false;
let storageListenerInitialized = false;
let currentReadingHelpMode = DEFAULT_READING_HELP_MODE;
let furiganaVisible = true;
let jlptEnrichmentTimer = null;

async function initialize() {
    if (isInitializing) {
        return;
    }

    if (document.documentElement.hasAttribute('data-yomisaver-processed')) {
        initializeListenersOnly();
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
        const settings = await getSavedSettings();

        currentReadingHelpMode = getReadingHelpMode(settings[READING_HELP_MODE_STORAGE_KEY]);
        furiganaVisible = settings.furiganaVisible !== false;

        setCurrentReadingHelpMode(currentReadingHelpMode);

        await initializeTokenizer();
        await traverseDOM(document.body);

        document.documentElement.setAttribute('data-yomisaver-processed', 'true');

        initializeListenersOnly();
        applySavedVisualSettings(settings);
    } catch (error) {
        console.error('YomiSaver initialization failed:', error);
    } finally {
        isInitializing = false;
    }
}

function initializeListenersOnly() {
    if (!listenersInitialized) {
        addSelectionListener();
        listenersInitialized = true;
    }

    if (!storageListenerInitialized) {
        addStorageChangeListener();
        storageListenerInitialized = true;
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

function setAllFuriganaVisibility(visible) {
    const furiganaElements = document.querySelectorAll('.yomisaver-ruby rt');

    furiganaElements.forEach(rt => {
        rt.style.display = visible ? 'block' : 'none';
    });

    document.documentElement.dataset.yomisaverFurigana = visible ? 'visible' : 'hidden';
}

function applyCurrentFuriganaSettings() {
    if (!furiganaVisible || currentReadingHelpMode === 'none') {
        setAllFuriganaVisibility(false);
        return;
    }

    applyReadingHelpModeToDocument(currentReadingHelpMode);
}

function setReadingHelpMode(mode) {
    currentReadingHelpMode = getReadingHelpMode(mode);
    setCurrentReadingHelpMode(currentReadingHelpMode);

    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function setFuriganaEnabled(visible) {
    furiganaVisible = Boolean(visible);

    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function getSavedSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(
            {
                popupSize: '100',
                fontSize: '100',
                furiganaVisible: true,
                [READING_HELP_MODE_STORAGE_KEY]: DEFAULT_READING_HELP_MODE
            },
            resolve
        );
    });
}

function applySavedVisualSettings(settings) {
    if (settings.popupSize) {
        updatePopupSize(Number(settings.popupSize) / 100);
    }

    if (settings.fontSize) {
        updateFontSize(Number(settings.fontSize) / 100);
    }

    currentReadingHelpMode = getReadingHelpMode(settings[READING_HELP_MODE_STORAGE_KEY]);
    furiganaVisible = settings.furiganaVisible !== false;

    setCurrentReadingHelpMode(currentReadingHelpMode);
    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function shouldEnrichJlptLevels() {
    return furiganaVisible &&
        currentReadingHelpMode !== 'all' &&
        currentReadingHelpMode !== 'none';
}

function scheduleJlptEnrichment() {
    if (jlptEnrichmentTimer) {
        clearTimeout(jlptEnrichmentTimer);
        jlptEnrichmentTimer = null;
    }

    if (!shouldEnrichJlptLevels()) {
        return;
    }

    jlptEnrichmentTimer = setTimeout(() => {
        enrichJlptLevelsForDocument({
            maxLookups: 80,
            onUpdate: () => {
                applyCurrentFuriganaSettings();
            }
        }).catch(error => {
            console.warn('YomiSaver JLPT enrichment failed:', error);
        });
    }, 300);
}

function addStorageChangeListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') {
            return;
        }

        if (changes[READING_HELP_MODE_STORAGE_KEY]) {
            setReadingHelpMode(changes[READING_HELP_MODE_STORAGE_KEY].newValue);
        }

        if (changes.furiganaVisible) {
            setFuriganaEnabled(changes.furiganaVisible.newValue);
        }

        if (changes.popupSize) {
            updatePopupSize(Number(changes.popupSize.newValue) / 100);
        }

        if (changes.fontSize) {
            updateFontSize(Number(changes.fontSize.newValue) / 100);
        }
    });
}

chrome.runtime.onMessage.addListener(message => {
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
        setFuriganaEnabled(message.visible);
    }

    if (message.action === 'updateReadingHelpMode') {
        setReadingHelpMode(message.mode);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}