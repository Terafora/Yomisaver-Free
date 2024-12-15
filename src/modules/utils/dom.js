export function getCleanSelectedText() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    
    container.querySelectorAll('rt').forEach(rt => rt.remove());
    container.querySelectorAll('ruby').forEach(ruby => {
        ruby.replaceWith(ruby.textContent.trim());
    });
    
    return container.textContent.trim();
}

export function getCleanTextFromElement(element) {
    const rubyElement = element.closest('ruby');
    if (rubyElement) {
        const clone = rubyElement.cloneNode(true);
        clone.querySelectorAll('rt').forEach(rt => rt.remove());
        return clone.textContent.trim();
    }
    return element.textContent.trim();
}

export function getSentenceContext(word) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return "";
    // ... rest of getSentenceContext function
}