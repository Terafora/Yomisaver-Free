import { getJlptLevelForElement } from './filter';

const JLPT_LEVEL_CACHE_KEY = 'jlptLevelCache';
const UNKNOWN_LEVEL = '__unknown';
const MAX_CACHE_ENTRIES = 5000;

let activeRunId = 0;

export async function enrichJlptLevelsForDocument({
    maxLookups = 80,
    onUpdate = null
} = {}) {
    const runId = ++activeRunId;
    const entries = collectRubyEntries();

    if (!entries.length) {
        return {
            lookups: 0,
            entries: 0
        };
    }

    const cache = await loadJlptCache();

    const appliedFromCache = applyCachedLevels(entries, cache);

    if (appliedFromCache) {
        callSafely(onUpdate);
    }

    const pendingQueries = getPendingLookupQueries(entries, cache).slice(0, maxLookups);

    let lookupCount = 0;

    for (const query of pendingQueries) {
        if (runId !== activeRunId) {
            return {
                lookups: lookupCount,
                entries: entries.length,
                cancelled: true
            };
        }

        const level = await lookupJlptLevel(query);
        cache[query] = level || UNKNOWN_LEVEL;
        lookupCount += 1;

        const changed = applyCachedLevels(entries, cache);

        if (changed) {
            callSafely(onUpdate);
        }

        if (lookupCount % 10 === 0) {
            await saveJlptCache(cache);
        }
    }

    await saveJlptCache(pruneCache(cache));

    return {
        lookups: lookupCount,
        entries: entries.length
    };
}

function collectRubyEntries() {
    const rubyElements = Array.from(document.querySelectorAll('.yomisaver-ruby'));

    return rubyElements
        .map(element => {
            const surface = cleanText(element.dataset.surface || getRubySurfaceText(element));
            const baseForm = cleanText(element.dataset.baseForm || surface);
            const reading = cleanText(element.dataset.reading || '');

            const cacheKeys = unique([
                createSurfaceReadingKey(surface, reading),
                createSurfaceReadingKey(baseForm, reading),
                surface,
                baseForm,
                reading
            ]);

            const lookupQueries = unique([
                baseForm,
                surface
            ]).filter(isUsefulLookupQuery);

            return {
                element,
                surface,
                baseForm,
                reading,
                cacheKeys,
                lookupQueries
            };
        })
        .filter(entry => entry.surface || entry.baseForm);
}

function applyCachedLevels(entries, cache) {
    let changed = false;

    entries.forEach(entry => {
        const existingLevel = getJlptLevelForElement(entry.element);

        if (existingLevel) {
            if (entry.element.dataset.jlptLevel !== existingLevel) {
                entry.element.dataset.jlptLevel = existingLevel;
                changed = true;
            }

            return;
        }

        const cachedLevel = getCachedLevelForEntry(entry, cache);

        if (!cachedLevel) {
            return;
        }

        if (entry.element.dataset.jlptLevel !== cachedLevel) {
            entry.element.dataset.jlptLevel = cachedLevel;
            changed = true;
        }
    });

    return changed;
}

function getCachedLevelForEntry(entry, cache) {
    for (const key of entry.cacheKeys) {
        const cachedValue = normaliseCachedLevel(cache[key]);

        if (cachedValue) {
            return cachedValue;
        }
    }

    return '';
}

function getPendingLookupQueries(entries, cache) {
    const queries = [];

    entries.forEach(entry => {
        const knownLevel = getJlptLevelForElement(entry.element) ||
            getCachedLevelForEntry(entry, cache);

        if (knownLevel) {
            return;
        }

        entry.lookupQueries.forEach(query => {
            if (cache[query] === undefined) {
                queries.push(query);
            }
        });
    });

    return unique(queries);
}

async function lookupJlptLevel(query) {
    try {
        const response = await sendLookupMessage(query);

        if (!response?.success) {
            return '';
        }

        const results = Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        for (const result of results) {
            const level = extractJlptLevel(result.jlpt);

            if (level) {
                return level;
            }
        }

        return '';
    } catch (error) {
        console.warn('YomiSaver JLPT enrichment lookup failed:', query, error);
        return '';
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

function normaliseCachedLevel(value) {
    if (!value || value === UNKNOWN_LEVEL) {
        return '';
    }

    return extractJlptLevel(value);
}

function createSurfaceReadingKey(surface, reading) {
    const cleanSurface = cleanText(surface);
    const cleanReading = cleanText(reading);

    if (!cleanSurface || !cleanReading) {
        return '';
    }

    return `${cleanSurface}|${cleanReading}`;
}

function getRubySurfaceText(ruby) {
    const clone = ruby.cloneNode(true);

    clone.querySelectorAll('rt, rp').forEach(element => {
        element.remove();
    });

    return clone.textContent || '';
}

function isUsefulLookupQuery(query) {
    const cleaned = cleanText(query);

    if (!cleaned || cleaned === '*') {
        return false;
    }

    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleaned);
}

function unique(values) {
    return [...new Set(
        values
            .map(cleanText)
            .filter(Boolean)
    )];
}

function cleanText(value) {
    return String(value || '').trim();
}

function callSafely(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    try {
        callback();
    } catch (error) {
        console.warn('YomiSaver JLPT enrichment update callback failed:', error);
    }
}

function loadJlptCache() {
    return new Promise(resolve => {
        chrome.storage.local.get({ [JLPT_LEVEL_CACHE_KEY]: {} }, data => {
            const cache = data[JLPT_LEVEL_CACHE_KEY];

            resolve(cache && typeof cache === 'object' ? cache : {});
        });
    });
}

function saveJlptCache(cache) {
    return new Promise(resolve => {
        chrome.storage.local.set(
            {
                [JLPT_LEVEL_CACHE_KEY]: cache
            },
            resolve
        );
    });
}

function pruneCache(cache) {
    const entries = Object.entries(cache);

    if (entries.length <= MAX_CACHE_ENTRIES) {
        return cache;
    }

    return Object.fromEntries(entries.slice(entries.length - MAX_CACHE_ENTRIES));
}