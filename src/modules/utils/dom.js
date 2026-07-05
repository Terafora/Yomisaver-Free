export function getCleanSelectedText() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return '';
    }

    const container = document.createElement('div');

    for (let index = 0; index < selection.rangeCount; index += 1) {
        container.appendChild(selection.getRangeAt(index).cloneContents());
    }

    removeRubyReadings(container);

    return cleanText(container.textContent);
}

export function getCleanTextFromElement(element) {
    if (!element) {
        return '';
    }

    if (element.dataset?.surface) {
        return cleanText(element.dataset.surface);
    }

    const clone = element.cloneNode(true);
    removeRubyReadings(clone);

    return cleanText(clone.textContent);
}

export function getTokenMetaFromElement(element) {
    if (!element?.dataset) {
        return null;
    }

    return {
        surface: cleanText(element.dataset.surface || getCleanTextFromElement(element)),
        baseForm: cleanText(element.dataset.baseForm || element.dataset.basicForm || ''),
        reading: cleanText(element.dataset.reading || ''),
        rawReading: cleanText(element.dataset.rawReading || ''),
        partOfSpeech: cleanText(element.dataset.partOfSpeech || ''),
        partOfSpeechDetails: parseDatasetList(element.dataset.partOfSpeechDetails),
        jlptLevel: cleanText(element.dataset.jlptLevel || ''),
        properNoun: element.dataset.properNoun === 'true',
        isKanjiWord: element.dataset.isKanjiWord === 'true',
        isJapanese: element.dataset.isJapanese !== 'false',
        isPunctuation: element.dataset.isPunctuation === 'true'
    };
}

export function getSentenceContext(word = '', anchorElement = null) {
    const sourceElement = findSentenceSourceElement(anchorElement);

    if (!sourceElement) {
        return '';
    }

    const clone = sourceElement.cloneNode(true);
    removeRubyReadings(clone);

    const text = cleanText(clone.textContent);

    if (!text) {
        return '';
    }

    const cleanWord = cleanText(word);

    if (!cleanWord) {
        return text.slice(0, 240);
    }

    const sentence = findSentenceContainingWord(text, cleanWord);

    return sentence || text.slice(0, 240);
}

export function removeRubyReadings(root) {
    if (!root?.querySelectorAll) {
        return;
    }

    root.querySelectorAll('rt, rp').forEach(element => {
        element.remove();
    });
}

function findSentenceSourceElement(anchorElement) {
    if (!anchorElement) {
        return document.body;
    }

    return anchorElement.closest(
        'p, li, td, th, dd, dt, blockquote, figcaption, h1, h2, h3, h4, h5, h6'
    ) || anchorElement.parentElement || document.body;
}

function findSentenceContainingWord(text, word) {
    const sentences = text.match(/[^。！？!?]+[。！？!?]?/g) || [text];

    return cleanText(
        sentences.find(sentence => sentence.includes(word)) || ''
    );
}

function parseDatasetList(value) {
    const cleaned = cleanText(value);

    if (!cleaned) {
        return [];
    }

    try {
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed)) {
            return parsed.map(cleanText).filter(Boolean);
        }
    } catch {
        // Fall back to comma parsing below.
    }

    return cleaned
        .split(',')
        .map(cleanText)
        .filter(Boolean);
}

function cleanText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}