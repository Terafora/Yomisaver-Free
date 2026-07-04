const wordCache = new Map();

export async function lookupWord(word, tokenMeta = null) {
    const queryWord = cleanText(word);
    const surface = cleanText(tokenMeta?.surface || queryWord);
    const baseForm = cleanText(tokenMeta?.baseForm || queryWord);
    const reading = cleanText(tokenMeta?.reading || '');

    const cacheKey = createCacheKey(surface, baseForm, reading);

    if (wordCache.has(cacheKey)) {
        return wordCache.get(cacheKey);
    }

    try {
        const lookupCandidates = createLookupCandidates([
            surface,
            baseForm,
            queryWord
        ]);

        let response = null;
        let matchedQuery = '';

        for (const candidate of lookupCandidates) {
            response = await sendLookupMessage(candidate);

            if (hasJishoResults(response)) {
                matchedQuery = candidate;
                break;
            }
        }

        if (!hasJishoResults(response)) {
            return null;
        }

        const wordInfo = normaliseJishoResponse(response.data, {
            queryWord,
            matchedQuery,
            surface,
            baseForm,
            tokenMeta
        });

        if (!wordInfo) {
            return null;
        }

        wordCache.set(cacheKey, wordInfo);

        return wordInfo;
    } catch (error) {
        console.error('Error looking up word:', error);

        if (error.message.includes('Extension context invalidated')) {
            window.location.reload();
        }

        return null;
    }
}

function sendLookupMessage(word) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: 'lookupWord',
                word
            },
            response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(response);
            }
        );
    });
}

function normaliseJishoResponse(data, context) {
    const firstResult = data?.data?.[0];

    if (!firstResult) {
        return null;
    }

    const firstJapaneseEntry = firstResult.japanese?.[0] || {};
    const jishoWord = firstJapaneseEntry.word || firstJapaneseEntry.reading || context.queryWord;

    const reading = cleanText(
        context.tokenMeta?.reading ||
        firstJapaneseEntry.reading ||
        ''
    );

    const meanings = Array.isArray(firstResult.senses)
        ? firstResult.senses.map(normaliseSense)
        : [];

    const jlpt = Array.isArray(firstResult.jlpt)
        ? firstResult.jlpt
        : [];

    return {
        word: context.surface || jishoWord,
        surface: context.surface || jishoWord,
        baseForm: context.baseForm || context.matchedQuery || jishoWord,
        reading,
        meanings,
        jlpt,
        partOfSpeech: context.tokenMeta?.partOfSpeech || '',
        partOfSpeechDetails: context.tokenMeta?.partOfSpeechDetails || [],
        source: 'jisho'
    };
}

function normaliseSense(sense) {
    return {
        definitions: normaliseStringArray(sense.english_definitions),
        partOfSpeech: normaliseStringArray(sense.parts_of_speech),
        tags: normaliseStringArray(sense.tags),
        info: normaliseStringArray(sense.info)
    };
}

function createLookupCandidates(candidates) {
    return [...new Set(
        candidates
            .map(cleanText)
            .filter(Boolean)
            .filter(candidate => candidate !== '*')
    )];
}

function hasJishoResults(response) {
    return response?.success &&
        Array.isArray(response.data?.data) &&
        response.data.data.length > 0;
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

function createCacheKey(surface, baseForm, reading) {
    return [
        cleanText(surface),
        cleanText(baseForm),
        cleanText(reading)
    ].join('|');
}

function cleanText(value) {
    return String(value || '').trim();
}