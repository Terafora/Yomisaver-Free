import { popupManager } from './popupUtils';
import { getSentenceContext } from '../utils/dom';

export function createPopup(wordInfo, rect, anchorElement = null) {
    const popup = document.createElement('div');
    popup.className = 'yomisaver-popup fade-in';

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close dictionary popup');
    closeButton.addEventListener('click', event => {
        event.stopPropagation();
        popupManager.removeImmediately();
    });

    popup.appendChild(closeButton);
    popup.appendChild(createHeader(wordInfo));

    const body = document.createElement('div');
    body.className = 'yomisaver-popup-body';

    if (wordInfo?.isLoading) {
        body.appendChild(createStatusMessage(wordInfo.statusText || 'Looking up…'));
    } else if (wordInfo?.statusText) {
        body.appendChild(createStatusMessage(wordInfo.statusText));
    } else {
        body.appendChild(createMeaningsContainer(wordInfo));
    }

    popup.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'yomisaver-popup-footer';

    const saveButton = createSaveButton(wordInfo, anchorElement);
    footer.appendChild(saveButton);

    popup.appendChild(footer);

    document.body.appendChild(popup);
    positionPopup(popup, rect);

    return popup;
}

function createHeader(wordInfo) {
    const header = document.createElement('div');
    header.className = 'header';

    const word = document.createElement('span');
    word.className = 'word';
    word.textContent = getDisplayWord(wordInfo);

    header.appendChild(word);

    if (wordInfo?.reading) {
        const reading = document.createElement('span');
        reading.className = 'reading';
        reading.textContent = wordInfo.reading;
        header.appendChild(reading);
    }

    const jlptLevel = getJlptLevel(wordInfo);

    if (jlptLevel) {
        const jlpt = document.createElement('span');
        jlpt.className = 'jlpt';
        jlpt.textContent = formatJlptLevel(jlptLevel);
        header.appendChild(jlpt);
    }

    return header;
}

function createMeaningsContainer(wordInfo) {
    const container = document.createElement('div');
    container.className = 'meanings-container';

    const meanings = Array.isArray(wordInfo?.meanings)
        ? wordInfo.meanings
        : [];

    if (!meanings.length) {
        container.appendChild(createStatusMessage('No meanings found.'));
        return container;
    }

    meanings.forEach(meaning => {
        container.appendChild(createMeaningGroup(meaning));
    });

    return container;
}

function createMeaningGroup(meaning) {
    const group = document.createElement('div');
    group.className = 'meaning-group';

    const meta = document.createElement('div');
    meta.className = 'meaning-meta';

    const partOfSpeech = normaliseStringArray(
        meaning.partOfSpeech || meaning.partsOfSpeech
    );

    if (partOfSpeech.length) {
        const pos = document.createElement('span');
        pos.className = 'pos';
        pos.textContent = partOfSpeech.join(', ');
        meta.appendChild(pos);
    }

    const tags = normaliseStringArray(meaning.tags);

    if (tags.length) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tags';
        tagSpan.textContent = tags.join(', ');
        meta.appendChild(tagSpan);
    }

    const info = normaliseStringArray(meaning.info);

    if (info.length) {
        const infoSpan = document.createElement('span');
        infoSpan.className = 'info';
        infoSpan.textContent = info.join(', ');
        meta.appendChild(infoSpan);
    }

    if (meta.childNodes.length) {
        group.appendChild(meta);
    }

    const definitions = normaliseStringArray(meaning.definitions);

    if (definitions.length) {
        const definitionList = document.createElement('div');
        definitionList.className = 'definitions';
        definitionList.textContent = definitions.join('; ');
        group.appendChild(definitionList);
    }

    return group;
}

function createStatusMessage(message) {
    const status = document.createElement('div');
    status.className = 'yomisaver-popup-status';
    status.textContent = message;
    return status;
}

function createSaveButton(wordInfo, anchorElement) {
    const button = document.createElement('button');
    button.className = 'save-vocab-btn';
    button.type = 'button';

    if (wordInfo?.isLoading) {
        button.textContent = 'Looking up…';
        button.disabled = true;
        return button;
    }

    button.textContent = 'Save to Flashcards';

    button.addEventListener('click', event => {
        event.stopPropagation();

        const entry = createFlashcardPayload(wordInfo, anchorElement);

        button.disabled = true;
        button.textContent = 'Saving…';

        chrome.runtime.sendMessage(
            {
                action: 'saveVocab',
                wordInfo: entry.wordInfo,
                surface: entry.surface,
                baseForm: entry.baseForm,
                reading: entry.reading,
                meanings: entry.meanings,
                jlptLevel: entry.jlptLevel,
                sentence: entry.sentence,
                pageUrl: window.location.href,
                pageTitle: document.title,
                source: 'hover-popup'
            },
            response => {
                if (chrome.runtime.lastError) {
                    button.disabled = false;
                    button.textContent = 'Save failed';
                    console.warn('YomiSaver save failed:', chrome.runtime.lastError.message);
                    return;
                }

                const savedSuccessfully =
                    response?.success === true ||
                    response?.status === 'success' ||
                    response?.saved === true ||
                    response?.ok === true;

                if (savedSuccessfully) {
                    button.textContent = response?.duplicate ? 'Already Saved' : 'Saved';
                    button.classList.add('saved');
                    return;
                }

                button.disabled = false;
                button.textContent = 'Save failed';

                console.warn('YomiSaver save returned an unsuccessful response:', response);
            }
        );
    });

    return button;
}

function createFlashcardPayload(wordInfo, anchorElement) {
    const surface = cleanText(wordInfo?.surface || wordInfo?.word || '');
    const baseForm = cleanText(wordInfo?.baseForm || wordInfo?.basicForm || surface);
    const reading = cleanText(wordInfo?.reading || '');
    const meanings = Array.isArray(wordInfo?.meanings) ? wordInfo.meanings : [];
    const jlptLevel = getJlptLevel(wordInfo);
    const sentence = cleanText(
        wordInfo?.sentence ||
        getSentenceContext(surface, anchorElement)
    );

    return {
        surface,
        baseForm,
        reading,
        meanings,
        jlptLevel,
        sentence,
        wordInfo: {
            word: surface,
            surface,
            baseForm,
            reading,
            meanings,
            jlpt: jlptLevel ? [`jlpt-${jlptLevel}`] : [],
            sentence
        }
    };
}

function positionPopup(popup, rect) {
    const gap = 8;
    const viewportPadding = 10;

    popup.style.left = '0px';
    popup.style.top = '0px';
    popup.style.maxHeight = '';
    popup.style.height = 'auto';

    const popupRect = popup.getBoundingClientRect();

    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + popupRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - popupRect.width - viewportPadding;
    }

    if (left < viewportPadding) {
        left = viewportPadding;
    }

    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;

    if (popupRect.height > spaceBelow && spaceAbove > spaceBelow) {
        top = rect.top - popupRect.height - gap;
    }

    if (top < viewportPadding) {
        top = viewportPadding;
    }

    const availableHeight = Math.max(
        160,
        window.innerHeight - top - viewportPadding
    );

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
    popup.style.maxHeight = `${Math.round(availableHeight)}px`;
}

function getDisplayWord(wordInfo) {
    return cleanText(
        wordInfo?.surface ||
        wordInfo?.word ||
        wordInfo?.baseForm ||
        ''
    );
}

function getJlptLevel(wordInfo) {
    return extractJlptLevel(wordInfo?.jlptLevel || wordInfo?.jlpt || wordInfo?.wordInfo?.jlpt);
}

function extractJlptLevel(value) {
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
        const text = String(item || '').toLowerCase();
        const match = text.match(/n[1-5]/);

        if (match) {
            return match[0];
        }
    }

    return '';
}

function formatJlptLevel(level) {
    const normalisedLevel = extractJlptLevel(level);

    if (!normalisedLevel) {
        return '';
    }

    return `JLPT ${normalisedLevel.toUpperCase()}`;
}

function normaliseStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => cleanText(item))
            .filter(Boolean);
    }

    const cleaned = cleanText(value);
    return cleaned ? [cleaned] : [];
}

function cleanText(value) {
    return String(value || '').trim();
}