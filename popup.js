const VOCAB_STORAGE_KEY = 'vocabList';
const READING_HELP_MODE_STORAGE_KEY = 'readingHelpMode';

const READING_HELP_MODES = {
    all: {
        label: 'Show all',
        description: 'Show furigana for all kanji words.'
    },
    hideN5: {
        label: 'Hide up to N5',
        description: 'Hide furigana for known N5 words.'
    },
    hideN4AndBelow: {
        label: 'Hide up to N4',
        description: 'Hide furigana for known N5–N4 words.'
    },
    hideN3AndBelow: {
        label: 'Hide up to N3',
        description: 'Hide furigana for known N5–N3 words.'
    },
    hideN2AndBelow: {
        label: 'Hide up to N2',
        description: 'Hide furigana for known N5–N2 words.'
    },
    hideN1AndBelow: {
        label: 'Hide up to N1',
        description: 'Hide furigana for all known JLPT words. Unknown words still show.'
    },
    none: {
        label: 'Hide all',
        description: 'Hide all furigana, including unknown words and names.'
    }
};

const DEFAULT_READING_HELP_MODE = 'all';

document.addEventListener('DOMContentLoaded', initPopup);

function initPopup() {
    initTabs();
    initSettings();
    initJlptFilter();
    initFlashcards();
    initAcknowledgements();
    initRuntimeListeners();
}

function initTabs() {
    const tabs = document.querySelectorAll('.yomisaver-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            if (!tabId) {
                return;
            }

            document.querySelectorAll('.yomisaver-tab-content').forEach(content => {
                content.classList.remove('active');
                content.classList.add('hidden');
            });

            document.querySelectorAll('.yomisaver-tab').forEach(tabButton => {
                tabButton.classList.remove('active');
            });

            const selectedContent = document.getElementById(tabId);

            if (selectedContent) {
                selectedContent.classList.remove('hidden');
                selectedContent.classList.add('active');
            }

            tab.classList.add('active');
        });
    });
}

function initSettings() {
    const popupSize = document.getElementById('popupSize');
    const fontSize = document.getElementById('fontSize');
    const toggleFuriganaButton = document.getElementById('toggleFurigana');

    if (!popupSize || !fontSize || !toggleFuriganaButton) {
        return;
    }

    popupSize.addEventListener('input', event => {
        updatePopupSize(event.target.value);
    });

    popupSize.addEventListener('change', event => {
        chrome.storage.sync.set({ popupSize: event.target.value });
    });

    fontSize.addEventListener('input', event => {
        updateFontSize(event.target.value);
    });

    fontSize.addEventListener('change', event => {
        chrome.storage.sync.set({ fontSize: event.target.value });
    });

    toggleFuriganaButton.addEventListener('click', () => {
        chrome.storage.sync.get({ furiganaVisible: true }, data => {
            const nextValue = !data.furiganaVisible;

            chrome.storage.sync.set({ furiganaVisible: nextValue }, () => {
                setFuriganaButtonText(toggleFuriganaButton, nextValue);

                sendMessageToActiveTab({
                    action: 'toggleFurigana',
                    visible: nextValue
                });
            });
        });
    });

    chrome.storage.sync.get(
        {
            popupSize: '100',
            fontSize: '100',
            furiganaVisible: true
        },
        data => {
            popupSize.value = data.popupSize;
            fontSize.value = data.fontSize;

            setFuriganaButtonText(toggleFuriganaButton, data.furiganaVisible);

            updatePopupSize(data.popupSize);
            updateFontSize(data.fontSize);

            sendMessageToActiveTab({
                action: 'toggleFurigana',
                visible: data.furiganaVisible
            });
        }
    );
}

function initJlptFilter() {
    const optionsContainer = document.getElementById('reading-help-options');

    if (!optionsContainer) {
        return;
    }

    clearElement(optionsContainer);

    Object.entries(READING_HELP_MODES).forEach(([modeKey, mode]) => {
        optionsContainer.appendChild(createReadingHelpOption(modeKey, mode));
    });

    chrome.storage.sync.get(
        {
            [READING_HELP_MODE_STORAGE_KEY]: DEFAULT_READING_HELP_MODE
        },
        data => {
            const savedMode = normaliseSavedReadingHelpMode(
                data[READING_HELP_MODE_STORAGE_KEY]
            );

            const radio = document.querySelector(
                `input[name="readingHelpMode"][value="${cssEscape(savedMode)}"]`
            );

            if (radio) {
                radio.checked = true;
            }
        }
    );
        updateJlptCoverageStatus();
}

function createReadingHelpOption(modeKey, mode) {
    const label = createElement('label', 'yomisaver-radio-option');

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'readingHelpMode';
    input.value = modeKey;

    const textContainer = createElement('span', 'yomisaver-radio-text');

    const title = createElement('strong', '', mode.label);
    const description = createElement('span', 'yomisaver-radio-description', mode.description);

    textContainer.appendChild(title);
    textContainer.appendChild(description);

    label.appendChild(input);
    label.appendChild(textContainer);

    input.addEventListener('change', () => {
        if (!input.checked) {
            return;
        }

        chrome.storage.sync.set(
            {
                [READING_HELP_MODE_STORAGE_KEY]: modeKey,
                furiganaVisible: modeKey !== 'none'
            },
            () => {
                const toggleButton = document.getElementById('toggleFurigana');

                if (toggleButton) {
                    setFuriganaButtonText(toggleButton, modeKey !== 'none');
                }

                sendMessageToActiveTab({
                    action: 'updateReadingHelpMode',
                    mode: modeKey
                });

                sendMessageToActiveTab({
                    action: 'toggleFurigana',
                    visible: modeKey !== 'none'
                });
                
                setTimeout(updateJlptCoverageStatus, 500);
            }
        );
    });

    return label;
}

function normaliseSavedReadingHelpMode(mode) {
    if (mode === 'advanced') {
        return 'hideN2AndBelow';
    }

    if (mode && READING_HELP_MODES[mode]) {
        return mode;
    }

    return DEFAULT_READING_HELP_MODE;
}

function updatePopupSize(value) {
    const size = Number(value) / 100;

    sendMessageToActiveTab({
        action: 'updatePopupSize',
        size
    });
}

function updateFontSize(value) {
    const size = Number(value) / 100;

    sendMessageToActiveTab({
        action: 'updateFontSize',
        size
    });
}

function setFuriganaButtonText(button, furiganaVisible) {
    button.textContent = furiganaVisible ? 'Hide Furigana' : 'Show Furigana';
}

function initFlashcards() {
    const exportButton = document.getElementById('export-flashcards');
    const selectAllButton = document.getElementById('select-all-flashcards');
    const clearSelectedButton = document.getElementById('clear-selected-flashcards');

    if (exportButton) {
        exportButton.addEventListener('click', exportFlashcards);
    }

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            setAllFlashcardSelection(true);
        });
    }

    if (clearSelectedButton) {
        clearSelectedButton.addEventListener('click', () => {
            setAllFlashcardSelection(false);
        });
    }

    document.addEventListener('change', event => {
        if (event.target?.classList?.contains('select-flashcard')) {
            updateSelectedFlashcardCount();
        }
    });

    loadFlashcards();
}

async function loadFlashcards() {
    const vocabContainer = document.getElementById('vocab-container');

    if (!vocabContainer) {
        return;
    }

    const vocabList = await getMigratedVocabList();

    clearElement(vocabContainer);

    if (!vocabList.length) {
        const emptyMessage = createElement('p', 'yomisaver', 'No flashcards saved yet!');
        vocabContainer.appendChild(emptyMessage);
        updateSelectedFlashcardCount();
        return;
    }

    const displayList = [...vocabList].sort((a, b) => b.savedAt - a.savedAt);

    displayList.forEach(entry => {
        vocabContainer.appendChild(createFlashcardElement(entry));
    });
    updateSelectedFlashcardCount();
}

function createFlashcardElement(entry) {
    const entryElement = createElement('div', 'yomisaver-vocab-entry');
    entryElement.dataset.id = entry.id;

    const header = createElement('div', 'vocab-header');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'select-flashcard';
    checkbox.dataset.id = entry.id;
    checkbox.setAttribute('aria-label', `Select ${entry.surface}`);

    const wordInfo = createElement('div', 'word-info');

    const wordTitle = createElement('h3', '', entry.surface);
    wordInfo.appendChild(wordTitle);

    if (entry.reading) {
        wordInfo.appendChild(createElement('p', 'reading', entry.reading));
    }

    const deleteButton = createElement('button', 'delete-vocab', 'Delete');
    deleteButton.type = 'button';
    deleteButton.title = 'Delete flashcard';

    deleteButton.addEventListener('click', () => {
        deleteFlashcard(entry.id);
    });

    header.appendChild(checkbox);
    header.appendChild(wordInfo);
    header.appendChild(deleteButton);

    entryElement.appendChild(header);

    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];

    meanings.forEach(meaning => {
        const definitions = Array.isArray(meaning.definitions)
            ? meaning.definitions.filter(Boolean)
            : [];

        if (definitions.length) {
            entryElement.appendChild(
                createElement('div', 'meaning', definitions.join('; '))
            );
        }
    });

    if (entry.jlptLevel) {
        entryElement.appendChild(
            createElement('div', 'jlpt', formatJlptLevel(entry.jlptLevel))
        );
    }

    return entryElement;
}

async function deleteFlashcard(id) {
    const vocabList = await getMigratedVocabList();
    const updatedList = vocabList.filter(entry => entry.id !== id);

    await storageSet({ [VOCAB_STORAGE_KEY]: updatedList });

    const entryElement = document.querySelector(`.yomisaver-vocab-entry[data-id="${cssEscape(id)}"]`);

    if (entryElement) {
        entryElement.remove();
    }

    const vocabContainer = document.getElementById('vocab-container');

    if (vocabContainer && updatedList.length === 0) {
        clearElement(vocabContainer);
        vocabContainer.appendChild(
            createElement('p', 'yomisaver-coming-soon', 'No flashcards saved yet!')
        );
        updateSelectedFlashcardCount();
    }
}

async function exportFlashcards() {
    const vocabList = await getMigratedVocabList();
    const selectedIds = Array.from(document.querySelectorAll('.select-flashcard:checked'))
        .map(checkbox => checkbox.dataset.id)
        .filter(Boolean);

    if (!selectedIds.length) {
        alert('No flashcards selected for export.');
        return;
    }

    const vocabById = new Map(vocabList.map(entry => [entry.id, entry]));
    const selectedFlashcards = selectedIds
        .map(id => vocabById.get(id))
        .filter(Boolean);

    if (!selectedFlashcards.length) {
        alert('No valid flashcards selected for export.');
        return;
    }

    const ankiData = selectedFlashcards
        .map(createAnkiExportRow)
        .join('\n');

    const blob = new Blob([ankiData], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = url;
    downloadLink.download = 'yomisaver-flashcards.txt';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
}

function setAllFlashcardSelection(selected) {
    const checkboxes = document.querySelectorAll('.select-flashcard');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selected;
    });

    updateSelectedFlashcardCount();
}

function updateSelectedFlashcardCount() {
    const countElement = document.getElementById('selected-flashcard-count');

    if (!countElement) {
        return;
    }

    const selectedCount = document.querySelectorAll('.select-flashcard:checked').length;

    countElement.textContent = selectedCount === 1
        ? '1 selected'
        : `${selectedCount} selected`;
}

function createAnkiExportRow(entry) {
    const front = cleanTsvField(entry.surface);

    const backParts = [];

    if (entry.reading) {
        backParts.push(`<div>Reading: ${escapeHtml(entry.reading)}</div>`);
    }

    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];

    meanings.forEach(meaning => {
        const definitions = Array.isArray(meaning.definitions)
            ? meaning.definitions.filter(Boolean)
            : [];

        if (definitions.length) {
            backParts.push(`<div>Definition: ${escapeHtml(definitions.join('; '))}</div>`);
        }
    });

    if (entry.jlptLevel) {
        backParts.push(`<div>JLPT: ${escapeHtml(formatJlptLevel(entry.jlptLevel))}</div>`);
    }

    if (entry.sentence) {
        backParts.push(`<div>Sentence: ${escapeHtml(entry.sentence)}</div>`);
    }

    const back = cleanTsvField(backParts.join(' '));
    const tags = cleanTsvField(entry.jlptLevel ? `jlpt-${entry.jlptLevel}` : '');

    return `${front}\t${back}\t${tags}`;
}

function initAcknowledgements() {
    const showButton = document.getElementById('showAcknowledgements');
    const backButton = document.getElementById('backToSettings');
    const settingsSection = document.getElementById('settings');
    const acknowledgementsSection = document.getElementById('acknowledgements');

    if (!showButton || !backButton || !settingsSection || !acknowledgementsSection) {
        return;
    }

    showButton.addEventListener('click', event => {
        event.stopPropagation();

        settingsSection.classList.add('hidden');
        settingsSection.classList.remove('active');

        acknowledgementsSection.classList.remove('hidden');
        acknowledgementsSection.classList.add('active');
    });

    backButton.addEventListener('click', event => {
        event.stopPropagation();

        acknowledgementsSection.classList.add('hidden');
        acknowledgementsSection.classList.remove('active');

        settingsSection.classList.remove('hidden');
        settingsSection.classList.add('active');
    });
}

function initRuntimeListeners() {
    chrome.runtime.onMessage.addListener(message => {
        if (message?.action === 'vocabUpdated') {
            loadFlashcards();
        }
    });
}

async function getMigratedVocabList() {
    const data = await storageGet({ [VOCAB_STORAGE_KEY]: [] });
    const rawList = Array.isArray(data[VOCAB_STORAGE_KEY])
        ? data[VOCAB_STORAGE_KEY]
        : [];

    const migratedList = rawList
        .map(normaliseFlashcardEntry)
        .filter(entry => entry.surface);

    const changed = JSON.stringify(rawList) !== JSON.stringify(migratedList);

    if (changed) {
        await storageSet({ [VOCAB_STORAGE_KEY]: migratedList });
    }

    return migratedList;
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

    const normalisedEntry = {
        id: entry.id || createFlashcardId({ surface, reading, savedAt }),
        surface,
        word: surface,
        baseForm: cleanText(entry.baseForm || entry.basicForm || surface),
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

    normalisedEntry.wordInfo = {
        reading: normalisedEntry.reading,
        meanings: normalisedEntry.meanings,
        jlpt: normalisedEntry.jlptLevel ? [`jlpt-${normalisedEntry.jlptLevel}`] : [],
        sentence: normalisedEntry.sentence
    };

    return normalisedEntry;
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

function formatJlptLevel(level) {
    const normalised = extractJlptLevel(level);

    if (!normalised) {
        return '';
    }

    return `JLPT ${normalised.toUpperCase()}`;
}

function createFlashcardId({ surface, reading, savedAt }) {
    return [
        cleanText(surface),
        cleanText(reading),
        Number(savedAt) || Date.now()
    ].join('|');
}

function createElement(tagName, className = '', textContent = '') {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textContent !== '') {
        element.textContent = textContent;
    }

    return element;
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function cleanText(value) {
    return String(value || '').trim();
}

function cleanTsvField(value) {
    return String(value || '')
        .replace(/\t/g, ' ')
        .replace(/\r?\n/g, ' ')
        .trim();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
    }

    return String(value).replace(/["\\]/g, '\\$&');
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

function updateJlptCoverageStatus() {
    const coverageElement = document.getElementById('jlpt-coverage');

    if (!coverageElement) {
        return;
    }

    coverageElement.textContent = 'Checking JLPT coverage for this page…';

    sendMessageToActiveTabWithResponse(
        {
            action: 'getJlptCoverage'
        },
        response => {
            if (!response?.success || !response.coverage) {
                coverageElement.textContent = 'JLPT coverage is available after YomiSaver processes a Japanese page.';
                return;
            }

            const coverage = response.coverage;
            const percentage = coverage.total
                ? Math.round(coverage.ratio * 100)
                : 0;

            if (!coverage.total) {
                coverageElement.textContent = 'No YomiSaver furigana words detected on this page yet.';
                return;
            }

            coverageElement.textContent =
                `JLPT coverage on this page: ${coverage.known} / ${coverage.total} words recognised (${percentage}%).`;
        }
    );
}

function sendMessageToActiveTabWithResponse(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs[0];

        if (!activeTab?.id) {
            callback(null);
            return;
        }

        chrome.tabs.sendMessage(activeTab.id, message, response => {
            if (chrome.runtime.lastError) {
                callback(null);
                return;
            }

            callback(response);
        });
    });
}

function sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const activeTab = tabs[0];

        if (!activeTab?.id) {
            return;
        }

        chrome.tabs.sendMessage(activeTab.id, message, () => {
            void chrome.runtime.lastError;
        });
    });
}