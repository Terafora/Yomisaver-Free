const CONTEXT_MENU_ID = 'saveVocab';
const VOCAB_STORAGE_KEY = 'vocabList';
const MAX_LOOKUP_ATTEMPTS = 3;

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: 'Save Word to Flashcards',
            contexts: ['selection']
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) {
        return;
    }

    saveVocabulary({
        text: info.selectionText,
        sentence: 'Context not provided',
        reading: '',
        wordInfo: null,
        sender: { tab }
    }).catch(error => {
        console.error('Failed to save vocabulary from context menu:', error);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) {
        return;
    }

    if (message.action === 'lookupWord') {
        handleWordLookup(message.word)
            .then(data => {
                sendResponse({ success: true, data });
            })
            .catch(error => {
                console.error('Lookup error:', error);
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }

    if (message.action === 'saveVocabulary') {
        saveVocabulary({
            text: message.text,
            sentence: message.sentence || 'Context not provided',
            reading: message.reading || 'Reading unavailable',
            wordInfo: message.wordInfo || null,
            sender
        })
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                console.error('Save vocabulary error:', error);
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }
});

async function handleWordLookup(word) {
    if (!word || !word.trim()) {
        throw new Error('No word provided for lookup.');
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_LOOKUP_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(
                `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Jisho request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            lastError = error;

            if (attempt < MAX_LOOKUP_ATTEMPTS) {
                await delay(400 * attempt);
            }
        }
    }

    throw lastError || new Error('Lookup failed.');
}

async function saveVocabulary({ text, sentence, reading, wordInfo, sender }) {
    const surface = cleanText(wordInfo?.surface || text);

    if (!surface) {
        return { success: false, error: 'No vocabulary text provided.' };
    }

    const storedData = await storageGet({ [VOCAB_STORAGE_KEY]: [] });
    const existingList = Array.isArray(storedData[VOCAB_STORAGE_KEY])
        ? storedData[VOCAB_STORAGE_KEY]
        : [];

    const normalisedExistingList = existingList.map(normaliseFlashcardEntry);

    const newEntry = createFlashcardEntry({
        surface,
        reading,
        sentence,
        wordInfo,
        sender
    });

    const existingIndex = normalisedExistingList.findIndex(entry =>
        isSameVocabulary(entry, newEntry)
    );

    let savedEntry = newEntry;
    let wasDuplicate = false;

    if (existingIndex >= 0) {
        savedEntry = mergeFlashcardEntries(normalisedExistingList[existingIndex], newEntry);
        normalisedExistingList[existingIndex] = savedEntry;
        wasDuplicate = true;
    } else {
        normalisedExistingList.push(newEntry);
    }

    await storageSet({ [VOCAB_STORAGE_KEY]: normalisedExistingList });

    broadcastVocabUpdated(savedEntry);

    return {
        success: true,
        duplicate: wasDuplicate,
        entry: savedEntry
    };
}

function createFlashcardEntry({ surface, reading, sentence, wordInfo, sender }) {
    const now = Date.now();
    const meanings = normaliseMeanings(wordInfo?.meanings || []);
    const jlptLevel = extractJlptLevel(wordInfo?.jlpt || []);
    const baseForm = cleanText(wordInfo?.baseForm || surface);

    const resolvedReading = cleanText(wordInfo?.reading || reading || '');
    const resolvedSentence = cleanText(wordInfo?.sentence || sentence || '');

    const pageUrl = sender?.tab?.url || '';
    const pageTitle = sender?.tab?.title || '';

    const entry = {
        id: createFlashcardId({
            surface,
            reading: resolvedReading,
            savedAt: now
        }),
        surface,
        word: surface,
        baseForm,
        reading: resolvedReading,
        meanings,
        jlptLevel,
        sentence: resolvedSentence,
        pageUrl,
        pageTitle,
        source: wordInfo ? 'jisho' : 'manual',
        savedAt: now,
        updatedAt: now
    };

    entry.wordInfo = createLegacyWordInfo(entry);

    return entry;
}

function normaliseFlashcardEntry(entry) {
    const surface = cleanText(entry.surface || entry.word || entry.text || '');
    const reading = cleanText(entry.reading || entry.wordInfo?.reading || '');
    const savedAt = Number(entry.savedAt || entry.timestamp || Date.now());
    const updatedAt = Number(entry.updatedAt || savedAt);

    const meanings = normaliseMeanings(entry.meanings || entry.wordInfo?.meanings || []);
    const jlptLevel = extractJlptLevel(
        entry.jlptLevel || entry.jlpt || entry.wordInfo?.jlpt || []
    );

    const baseForm = cleanText(entry.baseForm || entry.basicForm || entry.wordInfo?.baseForm || surface);

    const normalisedEntry = {
        id: entry.id || createFlashcardId({ surface, reading, savedAt }),
        surface,
        word: surface,
        baseForm,
        reading,
        meanings,
        jlptLevel,
        sentence: cleanText(entry.sentence || entry.wordInfo?.sentence || ''),
        pageUrl: entry.pageUrl || '',
        pageTitle: entry.pageTitle || '',
        source: entry.source || 'legacy',
        savedAt,
        updatedAt
    };

    normalisedEntry.wordInfo = createLegacyWordInfo(normalisedEntry);

    return normalisedEntry;
}

function mergeFlashcardEntries(existingEntry, newEntry) {
    const merged = {
        ...existingEntry,
        baseForm: existingEntry.baseForm || newEntry.baseForm,
        reading: existingEntry.reading || newEntry.reading,
        meanings: existingEntry.meanings?.length ? existingEntry.meanings : newEntry.meanings,
        jlptLevel: existingEntry.jlptLevel || newEntry.jlptLevel,
        sentence: existingEntry.sentence || newEntry.sentence,
        pageUrl: existingEntry.pageUrl || newEntry.pageUrl,
        pageTitle: existingEntry.pageTitle || newEntry.pageTitle,
        source: existingEntry.source === 'legacy' ? newEntry.source : existingEntry.source,
        updatedAt: Date.now()
    };

    merged.wordInfo = createLegacyWordInfo(merged);

    return merged;
}

function isSameVocabulary(a, b) {
    const sameSurface = cleanText(a.surface) === cleanText(b.surface);
    const sameBaseForm = cleanText(a.baseForm) === cleanText(b.baseForm);
    const aReading = cleanText(a.reading);
    const bReading = cleanText(b.reading);

    if (!sameSurface && !sameBaseForm) {
        return false;
    }

    if (!aReading || !bReading) {
        return true;
    }

    return aReading === bReading;
}

function createLegacyWordInfo(entry) {
    return {
        surface: entry.surface || '',
        baseForm: entry.baseForm || entry.surface || '',
        reading: entry.reading || '',
        meanings: normaliseMeanings(entry.meanings || []),
        jlpt: entry.jlptLevel ? [`jlpt-${entry.jlptLevel}`] : [],
        sentence: entry.sentence || ''
    };
}

function normaliseMeanings(meanings) {
    if (!Array.isArray(meanings)) {
        return [];
    }

    return meanings.map(meaning => ({
        definitions: normaliseStringArray(meaning.definitions),
        partOfSpeech: normaliseStringArray(meaning.partOfSpeech || meaning.partsOfSpeech),
        tags: normaliseStringArray(meaning.tags),
        info: normaliseStringArray(meaning.info)
    }));
}

function normaliseStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => cleanText(item))
            .filter(Boolean);
    }

    const cleaned = cleanText(value);
    return cleaned ? [cleaned] : [];
}

function extractJlptLevel(value) {
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
        const text = String(item || '').toLowerCase();
        const match = text.match(/n[1-5]/);

        if (match) {
            return match[0];
        }
    }

    return '';
}

function createFlashcardId({ surface, reading, savedAt }) {
    return [
        cleanText(surface),
        cleanText(reading),
        Number(savedAt) || Date.now()
    ].join('|');
}

function cleanText(value) {
    return String(value || '').trim();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function storageGet(defaults) {
    return new Promise(resolve => {
        chrome.storage.local.get(defaults, resolve);
    });
}

function storageSet(data) {
    return new Promise(resolve => {
        chrome.storage.local.set(data, resolve);
    });
}

function broadcastVocabUpdated(entry) {
    chrome.runtime.sendMessage(
        {
            action: 'vocabUpdated',
            entry
        },
        () => {
            void chrome.runtime.lastError;
        }
    );
}