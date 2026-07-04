import { popupManager } from './popupUtils';
import { getSentenceContext } from '../utils/dom';

function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textContent !== undefined && textContent !== null) {
        element.textContent = textContent;
    }

    return element;
}

function normaliseArray(value) {
    return Array.isArray(value) ? value : [];
}

function createMeaningGroup(meaning) {
    const group = createElement('div', 'meaning-group');

    const partOfSpeech = normaliseArray(meaning.partOfSpeech);
    const tags = normaliseArray(meaning.tags);
    const info = normaliseArray(meaning.info);
    const definitions = normaliseArray(meaning.definitions);

    const metaContainer = createElement('div', 'meaning-meta');

    if (partOfSpeech.length) {
        metaContainer.appendChild(createElement('span', 'pos', partOfSpeech.join(', ')));
    }

    if (tags.length) {
        metaContainer.appendChild(createElement('span', 'tags', tags.join(', ')));
    }

    if (info.length) {
        metaContainer.appendChild(createElement('span', 'info', info.join(', ')));
    }

    if (metaContainer.childNodes.length) {
        group.appendChild(metaContainer);
    }

    const definitionsElement = createElement(
        'div',
        'definitions',
        definitions.length ? definitions.join('; ') : 'No definition available.'
    );

    group.appendChild(definitionsElement);

    return group;
}

function positionPopup(popup, rect) {
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupRect = popup.getBoundingClientRect();

    let left = rect.left;
    let top = rect.bottom + gap;

    const wouldOverflowBottom = top + popupRect.height > viewportHeight - gap;

    if (wouldOverflowBottom) {
        top = rect.top - popupRect.height - gap;
    }

    if (left + popupRect.width > viewportWidth - gap) {
        left = viewportWidth - popupRect.width - gap;
    }

    if (left < gap) {
        left = gap;
    }

    if (top < gap) {
        top = gap;
    }

    if (top + popupRect.height > viewportHeight - gap) {
        top = Math.max(gap, viewportHeight - popupRect.height - gap);
    }

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
}

export function createPopup(wordInfo, rect, anchorElement = null) {
    const popup = createElement('div', 'yomisaver-popup fade-in');

    const cleanWord = String(wordInfo.surface || wordInfo.word || '').replace(/<[^>]+>/g, '');
    const baseForm = wordInfo.baseForm || cleanWord;
    const reading = wordInfo.reading || '';
    const meanings = normaliseArray(wordInfo.meanings);
    const jlpt = normaliseArray(wordInfo.jlpt);
    const sentence = wordInfo.sentence || getSentenceContext(cleanWord, anchorElement);
    const isLoading = Boolean(wordInfo.isLoading);
    const statusText = wordInfo.statusText || '';

    const header = createElement('div', 'header');

    const closeButton = createElement('button', 'close-button', '×');
    closeButton.setAttribute('aria-label', 'Close');

    const wordElement = createElement('div', 'word', cleanWord);

    header.appendChild(closeButton);
    header.appendChild(wordElement);

    if (reading) {
        header.appendChild(createElement('div', 'reading', reading));
    }

    if (baseForm && baseForm !== cleanWord) {
        header.appendChild(createElement('div', 'reading', `Dictionary form: ${baseForm}`));
    }

    if (jlpt.length) {
        header.appendChild(createElement('div', 'jlpt', jlpt.join(', ').toUpperCase()));
    }

    const meaningsContainer = createElement('div', 'meanings-container');

    if (isLoading) {
        meaningsContainer.appendChild(
            createElement('div', 'meaning-group', statusText || 'Looking up…')
        );
    } else if (meanings.length) {
        meanings.forEach(meaning => {
            meaningsContainer.appendChild(createMeaningGroup(meaning));
        });
    } else {
        meaningsContainer.appendChild(
            createElement('div', 'meaning-group', statusText || 'No definitions found.')
        );
    }

    const saveButton = createElement('button', 'save-vocab-btn', 'Save to Flashcards');

    if (isLoading) {
        saveButton.disabled = true;
        saveButton.textContent = 'Looking up…';
    }

    meaningsContainer.appendChild(saveButton);

    popup.appendChild(header);
    popup.appendChild(meaningsContainer);

    document.body.appendChild(popup);

    positionPopup(popup, rect);

    closeButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        popupManager.removeExistingPopup();
    });

    saveButton.addEventListener('click', event => {
        if (isLoading) {
            return;
        }

        const button = event.currentTarget;

        chrome.runtime.sendMessage({
            action: 'saveVocabulary',
            text: cleanWord,
            reading,
            wordInfo: {
                surface: cleanWord,
                baseForm,
                reading,
                meanings,
                jlpt,
                sentence,
                partOfSpeech: wordInfo.partOfSpeech || '',
                partOfSpeechDetails: wordInfo.partOfSpeechDetails || []
            }
        });

        button.textContent = 'Saved!';
        button.disabled = true;
        button.classList.add('saved');
    });

    popupManager.setPopup(popup);

    return popup;
}