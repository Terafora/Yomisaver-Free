import { lookupWord } from '../dictionary';
import { createPopup } from '../popup/popup';
import { getCleanTextFromElement } from '../utils/dom';

let popup = null;

export function addSelectionListener() {
    const debouncedShowPopup = debounce(async (element, rect) => {
        try {
            const text = getCleanTextFromElement(element);
            if (!text) return;

            const wordInfo = await lookupWord(text);
            if (wordInfo) {
                popup = createPopup(wordInfo, rect);
            }
        } catch (error) {
            console.error("Error showing popup:", error);
        }
    }, 100);

    document.addEventListener("mouseover", (event) => {
        const target = event.target;
        if (target.classList.contains('yomisaver-word') || 
            target.closest('.yomisaver-word')) {
            const rect = target.getBoundingClientRect();
            debouncedShowPopup(target, rect);
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}