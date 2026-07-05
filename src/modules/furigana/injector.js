import { processText } from '../tokenizer';
import { hasJapaneseText } from '../utils/japanese';
import { tokenToDataset } from '../models/token';
import {
    DEFAULT_READING_HELP_MODE,
    getJlptLevelForToken,
    shouldShowFuriganaForToken
} from '../jlpt/filter';

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

let currentReadingHelpMode = DEFAULT_READING_HELP_MODE;

export function setCurrentReadingHelpMode(mode) {
    currentReadingHelpMode = mode || DEFAULT_READING_HELP_MODE;
}

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
            const enrichedToken = enrichToken(token, tokens, index);
            wrapper.appendChild(createTokenElement(enrichedToken));
        });

        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error injecting furigana:', error);
    }
}

function enrichToken(token, tokens, index) {
    const adjustedReading = getAdjustedReading(tokens, index);
    const jlptLevel = getJlptLevelForToken({
        ...token,
        reading: adjustedReading
    });

    return {
        ...token,
        reading: adjustedReading,
        jlptLevel
    };
}

function createTokenElement(token) {
    if (!token.surface) {
        return document.createTextNode('');
    }

    if (token.isPunctuation || !token.isJapanese) {
        return document.createTextNode(token.surface);
    }

    if (token.isKanjiWord && token.reading) {
        return createRubyElement(token);
    }

    return createPlainWordElement(token);
}

function createRubyElement(token) {
    const ruby = document.createElement('ruby');
    ruby.className = 'yomisaver-word yomisaver-ruby';

    setTokenDataset(ruby, token);

    ruby.appendChild(document.createTextNode(token.surface));

    const rt = document.createElement('rt');
    rt.textContent = token.reading;

    const visible = shouldShowFuriganaForToken(token, currentReadingHelpMode);

    rt.style.display = visible ? '' : 'none';
    ruby.dataset.furiganaVisible = visible ? 'true' : 'false';

    ruby.appendChild(rt);

    return ruby;
}

function createPlainWordElement(token) {
    const span = document.createElement('span');
    span.className = 'yomisaver-word yomisaver-token';
    span.textContent = token.surface;

    setTokenDataset(span, token);

    return span;
}

function setTokenDataset(element, token) {
    const dataset = tokenToDataset(token);

    Object.entries(dataset).forEach(([key, value]) => {
        element.dataset[key] = value;
    });

    element.dataset.jlptLevel = token.jlptLevel || '';
    element.dataset.properNoun = isProperNoun(token) ? 'true' : 'false';
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

function isProperNoun(token) {
    if (token.partOfSpeech === '固有名詞') {
        return true;
    }

    return Array.isArray(token.partOfSpeechDetails) &&
        token.partOfSpeechDetails.includes('固有名詞');
}