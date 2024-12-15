import { popupManager, removeExistingPopup } from './popupUtils';
import { getSentenceContext } from '../utils/dom';

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

export function createPopup(wordInfo, rect) {
    const popup = document.createElement('div');
    popup.className = 'yomisaver-popup fade-in';

    const sentence = getSentenceContext(wordInfo.word);
    const cleanWord = wordInfo.word.replace(/<[^>]+>/g, "");
    
    const meaningsHTML = formatMeanings(wordInfo);
    const jlptInfo = wordInfo.jlpt.length ? 
        `<div class="jlpt">${wordInfo.jlpt.join(', ').toUpperCase()}</div>` : '';

    // Structured popup content
    popup.innerHTML = `
        <div class="header">
            <button class="close-button" aria-label="Close">×</button>
            <div class="word">${cleanWord}</div>
            ${wordInfo.reading ? `<div class="reading">${wordInfo.reading}</div>` : ''}
            ${jlptInfo}
        </div>
        <div class="meanings-container">
            ${meaningsHTML}
            <button class="save-vocab-btn">Save to Flashcards</button>
        </div>
    `;

    // Add to DOM first for measurements
    document.body.appendChild(popup);

    // Position popup
    const popupRect = popup.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.top + window.scrollY - popupRect.height - 10;
    let left = rect.left + window.scrollX;
    
    // Adjust if would go off screen
    if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 10;
    }
    if (left + popupRect.width > viewportWidth) {
        left = viewportWidth - popupRect.width - 10;
    }
    left = Math.max(10, left);
    
    // Apply position
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    // Add event listeners
    const closeButton = popup.querySelector('.close-button');
    closeButton?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeExistingPopup();
    });

    // Set in manager
    popupManager.setPopup(popup);
    return popup;
}