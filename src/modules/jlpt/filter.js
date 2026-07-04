import { JLPT_VOCAB } from './data/jlptVocab';

export const READING_HELP_MODE_STORAGE_KEY = 'readingHelpMode';

export const READING_HELP_MODES = {
    all: {
        label: 'Show all',
        description: 'Show furigana for all kanji words.',
        hideKnownLevelsUpTo: ''
    },
    hideN5: {
        label: 'Hide up to N5',
        description: 'Hide furigana for known N5 words.',
        hideKnownLevelsUpTo: 'n5'
    },
    hideN4AndBelow: {
        label: 'Hide up to N4',
        description: 'Hide furigana for known N5–N4 words.',
        hideKnownLevelsUpTo: 'n4'
    },
    hideN3AndBelow: {
        label: 'Hide up to N3',
        description: 'Hide furigana for known N5–N3 words.',
        hideKnownLevelsUpTo: 'n3'
    },
    hideN2AndBelow: {
        label: 'Hide up to N2',
        description: 'Hide furigana for known N5–N2 words.',
        hideKnownLevelsUpTo: 'n2'
    },
    hideN1AndBelow: {
        label: 'Hide up to N1',
        description: 'Hide furigana for all known JLPT words. Unknown words still show.',
        hideKnownLevelsUpTo: 'n1'
    },
    none: {
        label: 'Hide all',
        description: 'Hide all furigana, including unknown words and names.',
        hideAll: true,
        hideKnownLevelsUpTo: 'n1'
    }
};

export const DEFAULT_READING_HELP_MODE = 'all';

const JLPT_LEVEL_ORDER = {
    n5: 1,
    n4: 2,
    n3: 3,
    n2: 4,
    n1: 5
};

export function getReadingHelpMode(mode) {
    if (mode && READING_HELP_MODES[mode]) {
        return mode;
    }

    if (mode === 'advanced') {
        return 'hideN2AndBelow';
    }

    return DEFAULT_READING_HELP_MODE;
}

export function getJlptLevelForToken(token) {
    if (!token) {
        return '';
    }

    const reading = normaliseReading(token.reading);
    const candidates = createTokenLookupCandidates(token);

    for (const candidate of candidates) {
        const level = getJlptLevelForCandidate(candidate, reading);

        if (level) {
            return level;
        }
    }

    return '';
}

export function getJlptLevelForElement(element) {
    if (!element?.dataset) {
        return '';
    }

    const existingLevel = normaliseJlptLevel(element.dataset.jlptLevel);

    if (existingLevel) {
        return existingLevel;
    }

    const tokenLike = {
        surface: element.dataset.surface || '',
        baseForm: element.dataset.baseForm || '',
        reading: element.dataset.reading || ''
    };

    return getJlptLevelForToken(tokenLike);
}

export function shouldShowFuriganaForToken(token, mode = DEFAULT_READING_HELP_MODE) {
    const resolvedModeKey = getReadingHelpMode(mode);
    const resolvedMode = READING_HELP_MODES[resolvedModeKey];

    if (!token?.isKanjiWord || !token?.reading) {
        return false;
    }

    if (resolvedMode.hideAll) {
        return false;
    }

    const level = normaliseJlptLevel(token.jlptLevel) || getJlptLevelForToken(token);

    if (level) {
        return !isLevelHidden(level, resolvedMode.hideKnownLevelsUpTo);
    }

    return true;
}

export function shouldShowFuriganaForElement(element, mode = DEFAULT_READING_HELP_MODE) {
    if (!element) {
        return false;
    }

    const resolvedModeKey = getReadingHelpMode(mode);
    const resolvedMode = READING_HELP_MODES[resolvedModeKey];

    if (resolvedMode.hideAll) {
        return false;
    }

    const level = getJlptLevelForElement(element);

    if (level) {
        return !isLevelHidden(level, resolvedMode.hideKnownLevelsUpTo);
    }

    return true;
}

export function applyReadingHelpModeToDocument(mode = DEFAULT_READING_HELP_MODE) {
    const resolvedMode = getReadingHelpMode(mode);
    const rubyElements = document.querySelectorAll('.yomisaver-ruby');

    rubyElements.forEach(ruby => {
        const rt = ruby.querySelector('rt');

        if (!rt) {
            return;
        }

        const level = getJlptLevelForElement(ruby);

        if (level && ruby.dataset.jlptLevel !== level) {
            ruby.dataset.jlptLevel = level;
        }

        const visible = shouldShowFuriganaForElement(ruby, resolvedMode);

        rt.style.display = visible ? 'block' : 'none';
        ruby.dataset.furiganaVisible = visible ? 'true' : 'false';

        const label = [
            ruby.dataset.surface || getRubySurfaceText(ruby),
            level ? `JLPT ${level.toUpperCase()}` : 'JLPT unknown',
            `mode: ${resolvedMode}`,
            visible ? 'furigana visible' : 'furigana hidden'
        ].join(' | ');

        ruby.title = label;
    });

    document.documentElement.dataset.yomisaverReadingHelpMode = resolvedMode;
}

export function getJlptDatasetCoverageForDocument() {
    const rubyElements = Array.from(document.querySelectorAll('.yomisaver-ruby'));

    const total = rubyElements.length;
    const known = rubyElements.filter(element => Boolean(getJlptLevelForElement(element))).length;

    return {
        total,
        known,
        unknown: total - known,
        ratio: total ? known / total : 0
    };
}

function getJlptLevelForCandidate(candidate, reading) {
    const cleanCandidate = normaliseExpression(candidate);
    const entries = JLPT_VOCAB[cleanCandidate];

    if (!Array.isArray(entries) || !entries.length) {
        return '';
    }

    const normalisedEntries = entries
        .map(normaliseVocabEntry)
        .filter(entry => entry.level);

    if (!normalisedEntries.length) {
        return '';
    }

    if (reading) {
        const readingMatches = normalisedEntries.filter(entry =>
            entry.reading && entry.reading === reading
        );

        if (readingMatches.length) {
            return chooseEasiestLevel(readingMatches.map(entry => entry.level));
        }
    }

    return chooseEasiestLevel(normalisedEntries.map(entry => entry.level));
}

function normaliseVocabEntry(entry) {
    if (Array.isArray(entry)) {
        return {
            reading: normaliseReading(entry[0]),
            level: normaliseJlptLevel(entry[1])
        };
    }

    return {
        reading: normaliseReading(entry?.r || entry?.reading || ''),
        level: normaliseJlptLevel(entry?.l || entry?.level || '')
    };
}

function chooseEasiestLevel(levels) {
    const validLevels = levels
        .map(normaliseJlptLevel)
        .filter(Boolean);

    if (!validLevels.length) {
        return '';
    }

    return validLevels.sort((a, b) =>
        JLPT_LEVEL_ORDER[a] - JLPT_LEVEL_ORDER[b]
    )[0];
}

function isLevelHidden(level, hideKnownLevelsUpTo) {
    const normalisedLevel = normaliseJlptLevel(level);
    const threshold = normaliseJlptLevel(hideKnownLevelsUpTo);

    if (!normalisedLevel || !threshold) {
        return false;
    }

    return JLPT_LEVEL_ORDER[normalisedLevel] <= JLPT_LEVEL_ORDER[threshold];
}

function createTokenLookupCandidates(token) {
    const surface = normaliseExpression(token.surface);
    const baseForm = normaliseExpression(token.baseForm);
    const reading = normaliseReading(token.reading);

    return [
        createSurfaceReadingKey(surface, reading),
        createSurfaceReadingKey(baseForm, reading),
        surface,
        baseForm
    ]
        .map(normaliseExpression)
        .filter(Boolean)
        .filter(candidate => candidate !== '*');
}

function createSurfaceReadingKey(surface, reading) {
    const cleanSurface = normaliseExpression(surface);
    const cleanReading = normaliseReading(reading);

    if (!cleanSurface || !cleanReading) {
        return '';
    }

    return `${cleanSurface}|${cleanReading}`;
}

function normaliseJlptLevel(value) {
    const text = String(value || '').toLowerCase();
    const match = text.match(/n?[1-5]/);

    if (!match) {
        return '';
    }

    const number = match[0].replace('n', '');

    return `n${number}`;
}

function normaliseExpression(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/^=/, '')
        .replace(/[［］\[\]]/g, '')
        .replace(/[（）()]/g, '');
}

function normaliseReading(value) {
    return katakanaToHiragana(
        String(value || '')
            .trim()
            .replace(/\s+/g, '')
            .replace(/[（）()]/g, '')
            .replace(/[［］\[\]]/g, '')
    );
}

function katakanaToHiragana(value) {
    return String(value || '').replace(/[\u30A1-\u30F6]/g, char =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

function getRubySurfaceText(ruby) {
    const clone = ruby.cloneNode(true);

    clone.querySelectorAll('rt, rp').forEach(element => {
        element.remove();
    });

    return clone.textContent.trim();
}