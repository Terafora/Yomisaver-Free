const VOCAB_STORAGE_KEY = 'vocabList';
const PRIVACY_ACKNOWLEDGEMENT_KEY =
    'privacyAcknowledged';
const PRIVACY_NOTICE_VERSION_KEY =
    'privacyNoticeVersion';
const PRIVACY_ACKNOWLEDGED_AT_KEY =
    'privacyAcknowledgedAt';

const CURRENT_PRIVACY_NOTICE_VERSION = '1.0';
const WELCOME_PAGE = 'welcome.html';

const JISHO_API_URL =
    'https://jisho.org/api/v1/search/words';

const LOOKUP_RETRY_COUNT = 2;

chrome.runtime.onInstalled.addListener(
    details => {
        initialiseInstalledState(details).catch(
            error => {
                console.error(
                    'YomiSaver installation setup failed:',
                    error
                );
            }
        );
    }
);

chrome.contextMenus.onClicked.addListener(
    (info, tab) => {
        handleContextMenuSave(info, tab).catch(
            error => {
                console.warn(
                    'YomiSaver context menu save failed:',
                    error
                );
            }
        );
    }
);

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        handleMessage(request, sender)
            .then(response => {
                sendResponse(response);
            })
            .catch(error => {
                console.error(
                    'YomiSaver background message failed:',
                    error
                );

                sendResponse({
                    success: false,
                    error:
                        error?.message ||
                        String(error)
                });
            });

        return true;
    }
);

async function initialiseInstalledState(
    details
) {
    const acknowledged =
        await getPrivacyAcknowledgement();

    if (acknowledged) {
        await createContextMenu();
        return;
    }

    await removeAllContextMenus();

    if (
        details?.reason === 'install' ||
        details?.reason === 'update'
    ) {
        openWelcomePage();
    }
}

async function handleContextMenuSave(
    info,
    tab
) {
    if (info.menuItemId !== 'saveToVocab') {
        return;
    }

    const acknowledged =
        await getPrivacyAcknowledgement();

    if (!acknowledged) {
        openWelcomePage();
        return;
    }

    const selectedText = cleanText(
        info.selectionText
    );

    if (!selectedText) {
        return;
    }

    const result = await lookupWord(
        selectedText
    );

    const wordInfo = normaliseJishoResult(
        result?.data?.[0],
        selectedText
    );

    await saveVocabEntry({
        wordInfo,
        surface: wordInfo.surface,
        baseForm: wordInfo.baseForm,
        reading: wordInfo.reading,
        meanings: wordInfo.meanings,
        jlptLevel: wordInfo.jlptLevel,
        sentence: '',
        pageUrl: tab?.url || '',
        pageTitle: tab?.title || '',
        source: 'context-menu'
    });

    broadcastVocabUpdated();
}

async function handleMessage(
    request,
    sender
) {
    if (!request || !request.action) {
        return {
            success: false,
            error: 'Missing action.'
        };
    }

    if (
        request.action ===
        'acknowledgePrivacy'
    ) {
        await acknowledgePrivacy(
            request.noticeVersion
        );

        await createContextMenu();

        return {
            success: true,
            acknowledged: true,
            noticeVersion:
                CURRENT_PRIVACY_NOTICE_VERSION
        };
    }

    if (
        request.action ===
        'getPrivacyStatus'
    ) {
        const acknowledged =
            await getPrivacyAcknowledgement();

        return {
            success: true,
            acknowledged,
            noticeVersion:
                CURRENT_PRIVACY_NOTICE_VERSION
        };
    }

    const acknowledged =
        await getPrivacyAcknowledgement();

    if (!acknowledged) {
        return {
            success: false,
            privacyAcknowledgementRequired:
                true,
            error:
                'YomiSaver is paused until its ' +
                'privacy notice is accepted.'
        };
    }

    if (
        request.action ===
        'lookupWord'
    ) {
        const word = cleanText(
            request.word ||
            request.query
        );

        if (!word) {
            return {
                success: false,
                error: 'Missing lookup word.'
            };
        }

        const data = await lookupWord(word);

        return {
            success: true,
            data
        };
    }

    if (
        request.action ===
        'saveVocab'
    ) {
        const savedEntry =
            await saveVocabEntry({
                ...request,
                pageUrl:
                    request.pageUrl ||
                    sender?.tab?.url ||
                    '',
                pageTitle:
                    request.pageTitle ||
                    sender?.tab?.title ||
                    ''
            });

        broadcastVocabUpdated();

        return {
            success: true,
            saved: true,
            duplicate: Boolean(
                savedEntry.duplicate
            ),
            entry: savedEntry.entry
        };
    }

    return {
        success: false,
        error:
            `Unknown action: ${request.action}`
    };
}

async function acknowledgePrivacy(
    requestedVersion
) {
    const noticeVersion =
        cleanText(requestedVersion) ||
        CURRENT_PRIVACY_NOTICE_VERSION;

    await storageLocalSet({
        [PRIVACY_ACKNOWLEDGEMENT_KEY]:
            true,
        [PRIVACY_NOTICE_VERSION_KEY]:
            noticeVersion,
        [PRIVACY_ACKNOWLEDGED_AT_KEY]:
            new Date().toISOString()
    });
}

async function getPrivacyAcknowledgement() {
    const data = await storageLocalGet({
        [PRIVACY_ACKNOWLEDGEMENT_KEY]:
            false,
        [PRIVACY_NOTICE_VERSION_KEY]:
            ''
    });

    return (
        data[
            PRIVACY_ACKNOWLEDGEMENT_KEY
        ] === true &&
        data[
            PRIVACY_NOTICE_VERSION_KEY
        ] ===
            CURRENT_PRIVACY_NOTICE_VERSION
    );
}

function openWelcomePage() {
    chrome.tabs.create(
        {
            url: chrome.runtime.getURL(
                WELCOME_PAGE
            )
        },
        () => {
            void chrome.runtime.lastError;
        }
    );
}

function createContextMenu() {
    return new Promise(resolve => {
        chrome.contextMenus.removeAll(
            () => {
                void chrome.runtime.lastError;

                chrome.contextMenus.create(
                    {
                        id: 'saveToVocab',
                        title:
                            'Save to YomiSaver',
                        contexts: [
                            'selection'
                        ]
                    },
                    () => {
                        void chrome.runtime
                            .lastError;

                        resolve();
                    }
                );
            }
        );
    });
}

function removeAllContextMenus() {
    return new Promise(resolve => {
        chrome.contextMenus.removeAll(
            () => {
                void chrome.runtime.lastError;
                resolve();
            }
        );
    });
}

async function lookupWord(word) {
    let lastError = null;

    for (
        let attempt = 0;
        attempt <= LOOKUP_RETRY_COUNT;
        attempt += 1
    ) {
        try {
            const response = await fetch(
                `${JISHO_API_URL}?keyword=` +
                encodeURIComponent(word)
            );

            if (!response.ok) {
                throw new Error(
                    'Jisho lookup failed with ' +
                    `status ${response.status}`
                );
            }

            return await response.json();
        } catch (error) {
            lastError = error;

            if (
                attempt <
                LOOKUP_RETRY_COUNT
            ) {
                await wait(
                    300 * (attempt + 1)
                );
            }
        }
    }

    throw (
        lastError ||
        new Error(
            'Jisho lookup failed.'
        )
    );
}

async function saveVocabEntry(payload) {
    const entry =
        createFlashcardEntry(payload);

    if (!entry.surface) {
        throw new Error(
            'Cannot save flashcard ' +
            'without a word.'
        );
    }

    const data = await storageLocalGet({
        [VOCAB_STORAGE_KEY]: []
    });

    const currentList = Array.isArray(
        data[VOCAB_STORAGE_KEY]
    )
        ? data[VOCAB_STORAGE_KEY]
            .map(
                normaliseStoredFlashcardEntry
            )
            .filter(
                item => item.surface
            )
        : [];

    const duplicateIndex =
        currentList.findIndex(
            existing =>
                isSameFlashcard(
                    existing,
                    entry
                )
        );

    if (duplicateIndex >= 0) {
        const existing =
            currentList[duplicateIndex];

        currentList[duplicateIndex] = {
            ...existing,
            ...entry,
            id: existing.id,
            savedAt:
                existing.savedAt ||
                entry.savedAt,
            updatedAt: Date.now()
        };

        await storageLocalSet({
            [VOCAB_STORAGE_KEY]:
                currentList
        });

        return {
            duplicate: true,
            entry:
                currentList[
                    duplicateIndex
                ]
        };
    }

    const nextList = [
        ...currentList,
        entry
    ];

    await storageLocalSet({
        [VOCAB_STORAGE_KEY]:
            nextList
    });

    return {
        duplicate: false,
        entry
    };
}

function createFlashcardEntry(payload) {
    const wordInfo =
        payload.wordInfo || {};

    const surface = cleanText(
        payload.surface ||
        wordInfo.surface ||
        wordInfo.word ||
        payload.word ||
        ''
    );

    const baseForm = cleanText(
        payload.baseForm ||
        wordInfo.baseForm ||
        wordInfo.basicForm ||
        surface
    );

    const reading = cleanText(
        payload.reading ||
        wordInfo.reading ||
        ''
    );

    const meanings = normaliseMeanings(
        payload.meanings ||
        wordInfo.meanings ||
        []
    );

    const jlptLevel = extractJlptLevel(
        payload.jlptLevel ||
        wordInfo.jlptLevel ||
        wordInfo.jlpt ||
        []
    );

    const sentence = cleanText(
        payload.sentence ||
        wordInfo.sentence ||
        ''
    );

    const savedAt = Date.now();

    const entry = {
        id: createFlashcardId({
            surface,
            baseForm,
            reading,
            savedAt
        }),
        surface,
        word: surface,
        baseForm,
        reading,
        meanings,
        jlptLevel,
        sentence,
        pageUrl:
            payload.pageUrl || '',
        pageTitle:
            payload.pageTitle || '',
        source:
            payload.source || 'unknown',
        savedAt,
        updatedAt: savedAt
    };

    entry.wordInfo = {
        word: entry.surface,
        surface: entry.surface,
        baseForm: entry.baseForm,
        reading: entry.reading,
        meanings: entry.meanings,
        jlpt: entry.jlptLevel
            ? [
                `jlpt-${entry.jlptLevel}`
            ]
            : [],
        sentence: entry.sentence
    };

    return entry;
}

function normaliseStoredFlashcardEntry(
    entry
) {
    const surface = cleanText(
        entry.surface ||
        entry.word ||
        entry.text ||
        ''
    );

    const reading = cleanText(
        entry.reading ||
        entry.wordInfo?.reading ||
        ''
    );

    const savedAt = Number(
        entry.savedAt ||
        entry.timestamp ||
        Date.now()
    );

    const updatedAt = Number(
        entry.updatedAt ||
        savedAt
    );

    const meanings = normaliseMeanings(
        entry.meanings ||
        entry.wordInfo?.meanings ||
        []
    );

    const jlptLevel =
        extractJlptLevel(
            entry.jlptLevel ||
            entry.jlpt ||
            entry.wordInfo?.jlpt ||
            []
        );

    const normalised = {
        id:
            entry.id ||
            createFlashcardId({
                surface,
                baseForm:
                    entry.baseForm ||
                    entry.basicForm ||
                    surface,
                reading,
                savedAt
            }),
        surface,
        word: surface,
        baseForm: cleanText(
            entry.baseForm ||
            entry.basicForm ||
            surface
        ),
        reading,
        meanings,
        jlptLevel,
        sentence: cleanText(
            entry.sentence ||
            entry.wordInfo?.sentence ||
            ''
        ),
        pageUrl:
            entry.pageUrl || '',
        pageTitle:
            entry.pageTitle || '',
        source:
            entry.source || 'legacy',
        savedAt,
        updatedAt
    };

    normalised.wordInfo = {
        word: normalised.surface,
        surface: normalised.surface,
        baseForm:
            normalised.baseForm,
        reading:
            normalised.reading,
        meanings:
            normalised.meanings,
        jlpt:
            normalised.jlptLevel
                ? [
                    `jlpt-${normalised.jlptLevel}`
                ]
                : [],
        sentence:
            normalised.sentence
    };

    return normalised;
}

function normaliseJishoResult(
    result,
    fallbackWord = ''
) {
    if (!result) {
        const surface =
            cleanText(fallbackWord);

        return {
            word: surface,
            surface,
            baseForm: surface,
            reading: '',
            meanings: [],
            jlpt: [],
            jlptLevel: ''
        };
    }

    const japanese = Array.isArray(
        result.japanese
    )
        ? result.japanese
        : [];

    const primaryJapanese =
        japanese[0] || {};

    const surface = cleanText(
        primaryJapanese.word ||
        primaryJapanese.reading ||
        fallbackWord
    );

    const reading = cleanText(
        primaryJapanese.reading ||
        ''
    );

    const meanings = Array.isArray(
        result.senses
    )
        ? result.senses.map(
            sense => ({
                definitions:
                    normaliseStringArray(
                        sense
                            .english_definitions
                    ),
                partOfSpeech:
                    normaliseStringArray(
                        sense
                            .parts_of_speech
                    ),
                tags:
                    normaliseStringArray(
                        sense.tags
                    ),
                info:
                    normaliseStringArray(
                        sense.info
                    )
            })
        )
        : [];

    const jlpt = normaliseStringArray(
        result.jlpt
    );

    const jlptLevel =
        extractJlptLevel(jlpt);

    return {
        word: surface,
        surface,
        baseForm: surface,
        reading,
        meanings,
        jlpt,
        jlptLevel
    };
}

function normaliseMeanings(meanings) {
    if (!Array.isArray(meanings)) {
        return [];
    }

    return meanings.map(
        meaning => ({
            definitions:
                normaliseStringArray(
                    meaning.definitions ||
                    meaning
                        .english_definitions
                ),
            partOfSpeech:
                normaliseStringArray(
                    meaning.partOfSpeech ||
                    meaning.partsOfSpeech ||
                    meaning
                        .parts_of_speech
                ),
            tags:
                normaliseStringArray(
                    meaning.tags
                ),
            info:
                normaliseStringArray(
                    meaning.info
                )
        })
    );
}

function normaliseStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map(cleanText)
            .filter(Boolean);
    }

    const cleaned = cleanText(value);

    return cleaned
        ? [cleaned]
        : [];
}

function isSameFlashcard(a, b) {
    return (
        cleanText(a.surface) ===
            cleanText(b.surface) &&
        cleanText(a.reading) ===
            cleanText(b.reading)
    );
}

function createFlashcardId({
    surface,
    baseForm,
    reading,
    savedAt
}) {
    return [
        cleanText(surface),
        cleanText(baseForm),
        cleanText(reading),
        Number(savedAt) ||
            Date.now()
    ].join('|');
}

function extractJlptLevel(value) {
    const values = Array.isArray(
        value
    )
        ? value
        : [value];

    for (const item of values) {
        const text = String(
            item || ''
        ).toLowerCase();

        const match =
            text.match(/n[1-5]/);

        if (match) {
            return match[0];
        }
    }

    return '';
}

function broadcastVocabUpdated() {
    chrome.runtime.sendMessage(
        {
            action: 'vocabUpdated'
        },
        () => {
            void chrome.runtime.lastError;
        }
    );
}

function storageLocalGet(defaults) {
    return new Promise(resolve => {
        chrome.storage.local.get(
            defaults,
            resolve
        );
    });
}

function storageLocalSet(data) {
    return new Promise(resolve => {
        chrome.storage.local.set(
            data,
            resolve
        );
    });
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function cleanText(value) {
    return String(value || '').trim();
}