import { lookupWord } from '../dictionary';
import { createPopup } from '../popup/popup';
import { getCleanTextFromElement } from '../utils/dom';
import { popupManager, removeExistingPopup } from '../popup/popupUtils';

export function addSelectionListener() {
    let hoverTimer = null;
    let activeElement = null;

    function clearHoverState() {
        if (activeElement) {
            activeElement.classList.remove('active');
            activeElement = null;
        }
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }

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

    // Mouse leave handler
    document.addEventListener("mouseout", (event) => {
        const target = event.target;
        if (target.classList.contains('yomisaver-word') || 
            target.closest('.yomisaver-word')) {
            clearHoverState();
        }
    });

    // Hover handler with delay
    document.addEventListener("mouseover", (event) => {
        const target = event.target;
        const wordElement = target.classList.contains('yomisaver-word') ? 
            target : target.closest('.yomisaver-word');

        if (wordElement) {
            clearHoverState();
            activeElement = wordElement;
            wordElement.classList.add('active');
            
            hoverTimer = setTimeout(() => {
                const rect = wordElement.getBoundingClientRect();
                debouncedShowPopup(wordElement, rect);
            }, 500); // 0.5 second delay
        }
    });

    // Global click handler for outside clicks
    document.addEventListener('click', (e) => {
        const currentPopup = popupManager.getPopup();
        if (currentPopup && !currentPopup.contains(e.target)) {
            clearHoverState();
            popupManager.removeExistingPopup();
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