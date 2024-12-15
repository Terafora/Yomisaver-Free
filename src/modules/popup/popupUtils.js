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
        if (!this.popup) return;
        
        console.log('Removing popup');
        this.clearTimers();
        
        this.popup.classList.add('fade-out');
        setTimeout(() => {
            if (this.popup && this.popup.parentNode) {
                this.popup.remove();
            }
            this.popup = null;
        }, 300);
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