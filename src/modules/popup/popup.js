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

function positionPopup(popup, rect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupRect = popup.getBoundingClientRect();
    const mouseX = rect.left + window.scrollX;
    const mouseY = rect.top + window.scrollY;

    // Define viewport center points
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    let top, left;

    // Position based on viewport quadrant
    if (mouseX <= centerX && mouseY <= centerY) {
        // Top-left quadrant -> Position bottom-right of mouse
        top = mouseY + 10;
        left = mouseX + 10;
    } else if (mouseX > centerX && mouseY <= centerY) {
        // Top-right quadrant -> Position bottom-left of mouse
        top = mouseY + 10;
        left = mouseX - popupRect.width - 10;
    } else if (mouseX <= centerX && mouseY > centerY) {
        // Bottom-left quadrant -> Position top-right of mouse
        top = mouseY - popupRect.height - 10;
        left = mouseX + 10;
    } else {
        // Bottom-right quadrant -> Position top-left of mouse
        top = mouseY - popupRect.height - 10;
        left = mouseX - popupRect.width - 10;
    }

    // Ensure popup stays within viewport bounds
    left = Math.max(10, Math.min(left, viewportWidth - popupRect.width - 10));
    top = Math.max(10, Math.min(top, viewportHeight - popupRect.height - 10));

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
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

    // Position popup using new logic
    positionPopup(popup, rect);

    // Add event listeners
    const closeButton = popup.querySelector('.close-button');
    closeButton?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeExistingPopup();
    });

    // Update save button handler with complete info
    popup.querySelector('.save-vocab-btn').addEventListener('click', (e) => {
        const button = e.target;
        const context = getSentenceContext(wordInfo.word);
        
        chrome.runtime.sendMessage({
            action: 'saveVocabulary',
            text: wordInfo.word,
            sentence: context,
            reading: wordInfo.reading,
            wordInfo: {
                reading: wordInfo.reading,
                meanings: wordInfo.meanings,
                jlpt: wordInfo.jlpt,
                sentence: context
            }
        });

        button.textContent = 'Saved!';
        button.disabled = true;
        button.classList.add('saved');
    });

    // Set in manager
    popupManager.setPopup(popup);
    return popup;
}