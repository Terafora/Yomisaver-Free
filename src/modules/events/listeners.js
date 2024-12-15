import { lookupWord } from '../dictionary';
import { createPopup } from '../popup/popup';
import { getCleanTextFromElement } from '../utils/dom';
import { popupManager, removeExistingPopup } from '../popup/popupUtils';

export function addSelectionListener() {
    const debouncedShowPopup = debounce(async (element, rect) => {
        try {
            const text = getCleanTextFromElement(element);
            if (!text) return;

            const wordInfo = await lookupWord(text);
            if (wordInfo) {
                if (popupManager.getPopup()) {
                    popupManager.removeExistingPopup();
                }
                const newPopup = createPopup(wordInfo, rect);
                popupManager.setPopup(newPopup);
            }
        } catch (error) {
            console.error("Error showing popup:", error);
        }
    }, 100);

    // Global click handler for outside clicks
    document.addEventListener('click', (e) => {
        const currentPopup = popupManager.getPopup();
        if (currentPopup && !currentPopup.contains(e.target)) {
            console.log('Outside click detected');
            popupManager.removeExistingPopup();
        }
    });

    // Hover handler
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