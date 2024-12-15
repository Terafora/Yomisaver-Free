let popup = null;
let fadeTimer = null;
let activePopupTimer = null;

export function removeExistingPopup() {
    if (popup) {
        popup.classList.add('fade-out');
        setTimeout(() => {
            popup?.remove();
            popup = null;
        }, 300);
    }
}

export function clearTimers() {
    if (fadeTimer) {
        clearTimeout(fadeTimer);
        fadeTimer = null;
    }
    if (activePopupTimer) {
        clearTimeout(activePopupTimer);
        activePopupTimer = null;
    }
}

export { popup, fadeTimer, activePopupTimer };