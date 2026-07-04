import { lookupWord } from '../dictionary';
import { createPopup } from '../popup/popup';
import { getCleanTextFromElement, getTokenMetaFromElement } from '../utils/dom';
import { popupManager } from '../popup/popupUtils';

const HOVER_DELAY_MS = 500;

export function addSelectionListener() {
    if (document.documentElement.hasAttribute('data-yomisaver-listeners-added')) {
        return;
    }

    document.documentElement.setAttribute('data-yomisaver-listeners-added', 'true');

    let hoverTimer = null;
    let activeElement = null;
    let activeLookupId = 0;

    document.addEventListener('mouseover', event => {
        const wordElement = getWordElement(event.target);

        if (!wordElement) {
            return;
        }

        if (activeElement === wordElement) {
            return;
        }

        setActiveElement(wordElement);

        const lookupId = ++activeLookupId;

        clearHoverTimer();

        hoverTimer = setTimeout(() => {
            showPopupForElement(wordElement, lookupId);
        }, HOVER_DELAY_MS);
    });

    document.addEventListener('click', event => {
        const currentPopup = popupManager.getPopup();

        if (!currentPopup) {
            return;
        }

        if (currentPopup.contains(event.target)) {
            return;
        }

        clearActiveElement();
        safeRemovePopup();
    });

    async function showPopupForElement(wordElement, lookupId) {
        try {
            if (!wordElement || !wordElement.isConnected) {
                return;
            }

            const tokenMeta = getSafeTokenMeta(wordElement);
            const surfaceText = getSafeCleanText(wordElement);
            const lookupText = tokenMeta?.surface || surfaceText;

            if (!lookupText) {
                console.warn('YomiSaver: no lookup text found for hovered word.', wordElement);
                return;
            }

            const rect = wordElement.getBoundingClientRect();

            safeRemovePopupImmediately();

            createSafePopup(
                {
                    word: lookupText,
                    surface: tokenMeta?.surface || lookupText,
                    baseForm: tokenMeta?.baseForm || lookupText,
                    reading: tokenMeta?.reading || '',
                    meanings: [],
                    jlpt: [],
                    isLoading: true,
                    statusText: 'Looking up…',
                    partOfSpeech: tokenMeta?.partOfSpeech || '',
                    partOfSpeechDetails: tokenMeta?.partOfSpeechDetails || []
                },
                rect,
                wordElement
            );

            const wordInfo = await lookupWord(lookupText, tokenMeta);

            if (lookupId !== activeLookupId) {
                return;
            }

            const latestRect = wordElement.getBoundingClientRect();

            safeRemovePopupImmediately();

            if (wordInfo) {
                createSafePopup(wordInfo, latestRect, wordElement);
                return;
            }

            createSafePopup(
                {
                    word: lookupText,
                    surface: tokenMeta?.surface || lookupText,
                    baseForm: tokenMeta?.baseForm || lookupText,
                    reading: tokenMeta?.reading || '',
                    meanings: [],
                    jlpt: [],
                    statusText: 'No dictionary result found.',
                    partOfSpeech: tokenMeta?.partOfSpeech || '',
                    partOfSpeechDetails: tokenMeta?.partOfSpeechDetails || []
                },
                latestRect,
                wordElement
            );
        } catch (error) {
            console.error('YomiSaver hover popup error:', error);

            try {
                const tokenMeta = getSafeTokenMeta(wordElement);
                const surfaceText = getSafeCleanText(wordElement);
                const lookupText = tokenMeta?.surface || surfaceText || 'Unknown word';
                const rect = wordElement.getBoundingClientRect();

                safeRemovePopupImmediately();

                createSafePopup(
                    {
                        word: lookupText,
                        surface: lookupText,
                        baseForm: tokenMeta?.baseForm || lookupText,
                        reading: tokenMeta?.reading || '',
                        meanings: [],
                        jlpt: [],
                        statusText: 'Popup error. Check console.',
                        partOfSpeech: tokenMeta?.partOfSpeech || '',
                        partOfSpeechDetails: tokenMeta?.partOfSpeechDetails || []
                    },
                    rect,
                    wordElement
                );
            } catch (fallbackError) {
                console.error('YomiSaver fallback popup also failed:', fallbackError);
            }
        }
    }

    function createSafePopup(wordInfo, rect, wordElement) {
        const popup = createPopup(wordInfo, rect, wordElement);
        popupManager.setPopup(popup);
        return popup;
    }

    function getSafeTokenMeta(wordElement) {
        try {
            return getTokenMetaFromElement(wordElement);
        } catch (error) {
            console.error('YomiSaver token metadata error:', error);
            return null;
        }
    }

    function getSafeCleanText(wordElement) {
        try {
            return getCleanTextFromElement(wordElement);
        } catch (error) {
            console.error('YomiSaver clean text error:', error);
            return wordElement?.textContent?.trim() || '';
        }
    }

    function setActiveElement(wordElement) {
        clearActiveElement();

        activeElement = wordElement;
        activeElement.classList.add('active');
    }

    function clearActiveElement() {
        if (activeElement) {
            activeElement.classList.remove('active');
            activeElement = null;
        }

        clearHoverTimer();
    }

    function clearHoverTimer() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }
}

function getWordElement(target) {
    if (!(target instanceof Element)) {
        return null;
    }

    return target.classList.contains('yomisaver-word')
        ? target
        : target.closest('.yomisaver-word');
}

function safeRemovePopupImmediately() {
    if (typeof popupManager.removeImmediately === 'function') {
        popupManager.removeImmediately();
        return;
    }

    safeRemovePopup();
}

function safeRemovePopup() {
    if (typeof popupManager.removeExistingPopup === 'function') {
        popupManager.removeExistingPopup();
    }
}