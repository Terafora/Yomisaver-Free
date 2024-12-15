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
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const fullText = container.textContent;
    const wordStart = fullText.indexOf(word);
    
    if (wordStart === -1) return "";
    
    // Find sentence boundaries (。.!?！？)
    const sentenceBreaks = /[。.!?！？]/g;
    let startPos = 0;
    let endPos = fullText.length;
    
    // Find previous sentence break
    const textBefore = fullText.substring(0, wordStart);
    const lastBreak = [...textBefore.matchAll(sentenceBreaks)].pop();
    if (lastBreak) {
        startPos = lastBreak.index + 1;
    }
    
    // Find next sentence break
    const textAfter = fullText.substring(wordStart);
    const nextBreak = textAfter.match(sentenceBreaks);
    if (nextBreak) {
        endPos = wordStart + nextBreak.index + 1;
    }
    
    return fullText.substring(startPos, endPos).trim();
}