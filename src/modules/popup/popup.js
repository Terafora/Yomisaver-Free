import { removeExistingPopup, clearTimers, popup, fadeTimer, activePopupTimer } from './popupUtils';
import { getSentenceContext } from '../utils/dom';

export function createPopup(wordInfo, rect) {
    if (fadeTimer) {
        clearTimeout(fadeTimer);
    }
    
    removeExistingPopup();
    
    const popup = document.createElement('div');
    popup.className = 'yomisaver-popup fade-in';

    const sentence = getSentenceContext(wordInfo.word);
    const cleanWord = wordInfo.word.replace(/<[^>]+>/g, "");
    
    // Format meanings
    const meaningsHTML = formatMeanings(wordInfo);
    const jlptInfo = wordInfo.jlpt.length ? 
        `<div class="jlpt">${wordInfo.jlpt.join(', ').toUpperCase()}</div>` : '';

    popup.innerHTML = `
        <button class="close-button" aria-label="Close">×</button>
        <div class="header">
            <div class="word">${cleanWord}</div>
            ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
            ${jlptInfo}
        </div>
        <div class="meanings-container">
            ${meaningsHTML}
            <button class="save-vocab-btn">Save to Flashcards</button>
        </div>
    `;

    setupPopupEventListeners(popup, wordInfo, sentence);
    positionPopup(popup, rect);
    
    document.body.appendChild(popup);
    return popup;
}

function formatMeanings(wordInfo) {
    return wordInfo.meanings.map(meaning => {
        const pos = meaning.partOfSpeech.length ? 
            `<span class="pos">${meaning.partOfSpeech.join(', ')}</span>` : '';
        const tags = meaning.tags.length ? 
            `<span class="tags">${meaning.tags.join(', ')}</span>` : '';
        const info = meaning.info.length ? 
            `<span class="info">${meaning.info.join(', ')}</span>` : '';
        return `
            <div class="meaning-group">
                ${pos}${tags}${info}
                <div class="definitions">${meaning.definitions.join('; ')}</div>
            </div>
        `;
    }).join('');
}

function setupPopupEventListeners(popup, wordInfo, sentence) {
    const closeButton = popup.querySelector('.close-button');
    closeButton.addEventListener('click', removeExistingPopup);

    const saveBtn = popup.querySelector('.save-vocab-btn');
    saveBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: "saveVocabulary",
            text: wordInfo.word,
            sentence: sentence,
            reading: wordInfo.reading,
            wordInfo: wordInfo
        });
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
    });

    popup.addEventListener('mouseenter', () => {
        if (activePopupTimer) {
            clearTimeout(activePopupTimer);
            activePopupTimer = null;
        }
    });

    popup.addEventListener('mouseleave', () => {
        activePopupTimer = setTimeout(removeExistingPopup, 300);
    });
}

function positionPopup(popup, rect) {
    const popupRect = popup.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.top + window.scrollY - popupRect.height - 10;
    let left = rect.left + window.scrollX;
    
    if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 10;
    }
    
    if (left + popupRect.width > viewportWidth) {
        left = viewportWidth - popupRect.width - 10;
    }
    
    left = Math.max(10, left);
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
}