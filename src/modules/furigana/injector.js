import { processText } from '../tokenizer';
import { hasJapaneseText } from '../utils/japanese';
import { tokenToDataset } from '../models/token';

const SKIPPED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEXTAREA',
    'INPUT',
    'SELECT',
    'OPTION',
    'BUTTON',
    'CODE',
    'PRE',
    'KBD',
    'SAMP',
    'SVG',
    'CANVAS',
    'RT',
    'RP'
]);

const SKIPPED_ANCESTOR_SELECTOR = [
    '.yomisaver-text',
    '.yomisaver-popup',
    '.yomisaver-menu',
    'ruby',
    '[contenteditable="true"]',
    '[contenteditable=""]'
].join(',');

export function shouldSkipTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) {
        return true;
    }

    if (!node.textContent || !node.textContent.trim()) {
        return true;
    }

    if (!hasJapaneseText(node.textContent)) {
        return true;
    }

    const parent = node.parentElement;

    if (!parent) {
        return true;
    }

    if (SKIPPED_TAGS.has(parent.tagName)) {
        return true;
    }

    if (parent.isContentEditable) {
        return true;
    }

    if (parent.closest(SKIPPED_ANCESTOR_SELECTOR)) {
        return true;
    }

    return false;
}

export async function injectFurigana(node) {
    if (shouldSkipTextNode(node)) {
        return;
    }

    try {
        const tokens = await processText(node.textContent);

        if (!tokens || !tokens.length) {
            return;
        }

        const wrapper = document.createElement('span');
        wrapper.className = 'yomisaver-text';

        tokens.forEach((token, index) => {
            wrapper.appendChild(createTokenElement(token, tokens, index));
        });

        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error injecting furigana:', error);
    }
}

function createTokenElement(token, tokens, index) {
    if (!token.surface) {
        return document.createTextNode('');
    }

    if (token.isPunctuation || !token.isJapanese) {
        return document.createTextNode(token.surface);
    }

    const reading = getAdjustedReading(tokens, index);

    if (token.isKanjiWord && reading) {
        return createRubyElement(token, reading);
    }

    return createPlainWordElement(token);
}

function createRubyElement(token, reading) {
    const ruby = document.createElement('ruby');
    ruby.className = 'yomisaver-word yomisaver-ruby';

    setTokenDataset(ruby, token, reading);

    ruby.appendChild(document.createTextNode(token.surface));

    const rt = document.createElement('rt');
    rt.textContent = reading;

    ruby.appendChild(rt);

    return ruby;
}

function createPlainWordElement(token) {
    const span = document.createElement('span');
    span.className = 'yomisaver-word yomisaver-token';
    span.textContent = token.surface;

    setTokenDataset(span, token, token.reading || '');

    return span;
}

function setTokenDataset(element, token, reading) {
    const dataset = tokenToDataset({
        ...token,
        reading
    });

    Object.entries(dataset).forEach(([key, value]) => {
        element.dataset[key] = value;
    });
}

function getAdjustedReading(tokens, index) {
    const token = tokens[index];

    if (!token?.reading) {
        return '';
    }

    if (token.surface === '風' && token.reading === 'かぜ' && index > 0) {
        const previousToken = tokens[index - 1];

        if (previousToken?.partOfSpeech === '名詞') {
            return 'ふう';
        }
    }

    return token.reading;
}