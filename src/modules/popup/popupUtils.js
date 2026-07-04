class PopupManager {
    constructor() {
        this.popup = null;
        this.fadeTimer = null;
        this.activePopupTimer = null;
    }

    setPopup(newPopup) {
        this.popup = newPopup;
    }

    getPopup() {
        return this.popup;
    }

    removeExistingPopup() {
        if (!this.popup) {
            return;
        }

        const popupToRemove = this.popup;

        this.clearTimers();

        popupToRemove.classList.add('fade-out');

        this.fadeTimer = setTimeout(() => {
            if (popupToRemove.parentNode) {
                popupToRemove.remove();
            }

            if (this.popup === popupToRemove) {
                this.popup = null;
            }

            this.fadeTimer = null;
        }, 300);
    }

    removeImmediately() {
        if (!this.popup) {
            return;
        }

        this.clearTimers();

        if (this.popup.parentNode) {
            this.popup.remove();
        }

        this.popup = null;
    }

    clearTimers() {
        if (this.fadeTimer) {
            clearTimeout(this.fadeTimer);
            this.fadeTimer = null;
        }

        if (this.activePopupTimer) {
            clearTimeout(this.activePopupTimer);
            this.activePopupTimer = null;
        }
    }
}

export const popupManager = new PopupManager();
export const removeExistingPopup = () => popupManager.removeExistingPopup();