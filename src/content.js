import {
    initializeTokenizer
} from './modules/tokenizer';

import {
    isJapanesePage
} from './modules/utils/japanese';

import {
    injectFurigana,
    setCurrentReadingHelpMode,
    shouldSkipTextNode
} from './modules/furigana/injector';

import {
    addSelectionListener
} from './modules/events/listeners';

import {
    DEFAULT_READING_HELP_MODE,
    READING_HELP_MODE_STORAGE_KEY,
    applyReadingHelpModeToDocument,
    getReadingHelpMode,
    getJlptDatasetCoverageForDocument
} from './modules/jlpt/filter';

import {
    enrichJlptLevelsForDocument
} from './modules/jlpt/enricher';

const PRIVACY_ACKNOWLEDGEMENT_KEY =
    'privacyAcknowledged';

const PRIVACY_NOTICE_VERSION_KEY =
    'privacyNoticeVersion';

const CURRENT_PRIVACY_NOTICE_VERSION =
    '1.0';

let isInitializing = false;
let listenersInitialized = false;
let storageListenerInitialized = false;

let currentReadingHelpMode =
    DEFAULT_READING_HELP_MODE;

let furiganaVisible = true;
let jlptEnrichmentTimer = null;

async function initialize() {
    if (isInitializing) {
        return;
    }

    if (
        document.documentElement
            .hasAttribute(
                'data-yomisaver-processed'
            )
    ) {
        initializeListenersOnly();
        return;
    }

    if (!document.body) {
        return;
    }

    isInitializing = true;
    initializeStorageListenerOnly();

    try {
        const acknowledged =
            await getPrivacyAcknowledgement();

        if (!acknowledged) {
            document.documentElement
                .dataset.yomisaverStatus =
                    'paused';

            return;
        }

        delete document.documentElement
            .dataset.yomisaverStatus;

        if (!isJapanesePage()) {
            return;
        }

        const settings =
            await getSavedSettings();

        currentReadingHelpMode =
            getReadingHelpMode(
                settings[
                    READING_HELP_MODE_STORAGE_KEY
                ]
            );

        furiganaVisible =
            settings.furiganaVisible !==
            false;

        setCurrentReadingHelpMode(
            currentReadingHelpMode
        );

        await initializeTokenizer();
        await traverseDOM(
            document.body
        );

        document.documentElement
            .setAttribute(
                'data-yomisaver-processed',
                'true'
            );

        initializeListenersOnly();
        applySavedVisualSettings(
            settings
        );
    } catch (error) {
        console.error(
            'YomiSaver initialization failed:',
            error
        );
    } finally {
        isInitializing = false;
    }
}

function initializeListenersOnly() {
    if (!listenersInitialized) {
        addSelectionListener();
        listenersInitialized = true;
    }

    initializeStorageListenerOnly();
}

function initializeStorageListenerOnly() {
    if (storageListenerInitialized) {
        return;
    }

    addStorageChangeListener();
    storageListenerInitialized = true;
}

async function traverseDOM(root) {
    try {
        const walker =
            document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode(node) {
                        return shouldSkipTextNode(
                            node
                        )
                            ? NodeFilter
                                .FILTER_REJECT
                            : NodeFilter
                                .FILTER_ACCEPT;
                    }
                }
            );

        const textNodes = [];
        let node;

        while (
            (
                node =
                    walker.nextNode()
            )
        ) {
            textNodes.push(node);
        }

        for (
            const textNode of
            textNodes
        ) {
            await injectFurigana(
                textNode
            );
        }
    } catch (error) {
        console.error(
            'Error in traverseDOM:',
            error
        );
    }
}

function updatePopupSize(size) {
    document.documentElement
        .style.setProperty(
            '--yomisaver-popup-scale',
            size
        );
}

function updateFontSize(size) {
    document.documentElement
        .style.setProperty(
            '--yomisaver-font-scale',
            size
        );
}

function setAllFuriganaVisibility(
    visible
) {
    const furiganaElements =
        document.querySelectorAll(
            '.yomisaver-ruby rt'
        );

    furiganaElements.forEach(
        rt => {
            rt.style.display =
                visible
                    ? ''
                    : 'none';
        }
    );

    document.documentElement
        .dataset.yomisaverFurigana =
            visible
                ? 'visible'
                : 'hidden';
}

function applyCurrentFuriganaSettings() {
    if (
        !furiganaVisible ||
        currentReadingHelpMode ===
            'none'
    ) {
        setAllFuriganaVisibility(
            false
        );

        return;
    }

    applyReadingHelpModeToDocument(
        currentReadingHelpMode
    );
}

function setReadingHelpMode(mode) {
    currentReadingHelpMode =
        getReadingHelpMode(mode);

    setCurrentReadingHelpMode(
        currentReadingHelpMode
    );

    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function setFuriganaEnabled(visible) {
    furiganaVisible =
        Boolean(visible);

    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function getPrivacyAcknowledgement() {
    return new Promise(resolve => {
        chrome.storage.local.get(
            {
                [PRIVACY_ACKNOWLEDGEMENT_KEY]:
                    false,
                [PRIVACY_NOTICE_VERSION_KEY]:
                    ''
            },
            data => {
                resolve(
                    data[
                        PRIVACY_ACKNOWLEDGEMENT_KEY
                    ] === true &&
                    data[
                        PRIVACY_NOTICE_VERSION_KEY
                    ] ===
                        CURRENT_PRIVACY_NOTICE_VERSION
                );
            }
        );
    });
}

function getSavedSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(
            {
                popupSize: '100',
                fontSize: '100',
                furiganaVisible: true,
                [READING_HELP_MODE_STORAGE_KEY]:
                    DEFAULT_READING_HELP_MODE
            },
            resolve
        );
    });
}

function applySavedVisualSettings(
    settings
) {
    if (settings.popupSize) {
        updatePopupSize(
            Number(
                settings.popupSize
            ) / 100
        );
    }

    if (settings.fontSize) {
        updateFontSize(
            Number(
                settings.fontSize
            ) / 100
        );
    }

    currentReadingHelpMode =
        getReadingHelpMode(
            settings[
                READING_HELP_MODE_STORAGE_KEY
            ]
        );

    furiganaVisible =
        settings.furiganaVisible !==
        false;

    setCurrentReadingHelpMode(
        currentReadingHelpMode
    );

    applyCurrentFuriganaSettings();
    scheduleJlptEnrichment();
}

function shouldEnrichJlptLevels() {
    return (
        furiganaVisible &&
        currentReadingHelpMode !==
            'all' &&
        currentReadingHelpMode !==
            'none'
    );
}

function scheduleJlptEnrichment() {
    if (jlptEnrichmentTimer) {
        clearTimeout(
            jlptEnrichmentTimer
        );

        jlptEnrichmentTimer = null;
    }

    if (
        !shouldEnrichJlptLevels()
    ) {
        return;
    }

    jlptEnrichmentTimer =
        setTimeout(
            () => {
                enrichJlptLevelsForDocument({
                    maxLookups: 80,
                    onUpdate: () => {
                        applyCurrentFuriganaSettings();
                    }
                }).catch(error => {
                    console.warn(
                        'YomiSaver JLPT ' +
                        'enrichment failed:',
                        error
                    );
                });
            },
            300
        );
}

function addStorageChangeListener() {
    chrome.storage.onChanged.addListener(
        (changes, areaName) => {
            if (
                areaName === 'local' &&
                changes[
                    PRIVACY_ACKNOWLEDGEMENT_KEY
                ]
            ) {
                const acknowledged =
                    changes[
                        PRIVACY_ACKNOWLEDGEMENT_KEY
                    ].newValue === true;

                if (acknowledged) {
                    setTimeout(
                        initialize,
                        50
                    );
                }

                return;
            }

            if (areaName !== 'sync') {
                return;
            }

            if (
                changes[
                    READING_HELP_MODE_STORAGE_KEY
                ]
            ) {
                setReadingHelpMode(
                    changes[
                        READING_HELP_MODE_STORAGE_KEY
                    ].newValue
                );
            }

            if (
                changes.furiganaVisible
            ) {
                setFuriganaEnabled(
                    changes
                        .furiganaVisible
                        .newValue
                );
            }

            if (changes.popupSize) {
                updatePopupSize(
                    Number(
                        changes
                            .popupSize
                            .newValue
                    ) / 100
                );
            }

            if (changes.fontSize) {
                updateFontSize(
                    Number(
                        changes
                            .fontSize
                            .newValue
                    ) / 100
                );
            }
        }
    );
}

chrome.runtime.onMessage.addListener(
    (
        message,
        sender,
        sendResponse
    ) => {
        if (
            !message ||
            !message.action
        ) {
            return false;
        }

        if (
            message.action ===
            'updatePopupSize'
        ) {
            updatePopupSize(
                message.size
            );

            return false;
        }

        if (
            message.action ===
            'updateFontSize'
        ) {
            updateFontSize(
                message.size
            );

            return false;
        }

        if (
            message.action ===
            'toggleFurigana'
        ) {
            setFuriganaEnabled(
                message.visible
            );

            return false;
        }

        if (
            message.action ===
            'updateReadingHelpMode'
        ) {
            setReadingHelpMode(
                message.mode
            );

            return false;
        }

        if (
            message.action ===
            'getJlptCoverage'
        ) {
            sendResponse({
                success: true,
                coverage:
                    getJlptDatasetCoverageForDocument(),
                mode:
                    currentReadingHelpMode,
                furiganaVisible
            });

            return true;
        }

        return false;
    }
);

if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        initialize,
        {
            once: true
        }
    );
} else {
    initialize();
}