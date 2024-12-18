document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup script loaded');

    // Debug helper
    function debug(msg) {
        console.log(msg);
        const debugDiv = document.getElementById('debug');
        if (debugDiv) {
            debugDiv.textContent += msg + '\n';
        }
    }

    // Hide all tabs except flashcards initially
    document.querySelectorAll('.yomisaver-tab-content:not(#flashcards)').forEach(content => {
        content.classList.add('hidden');
    });

    // Tab switching
    document.querySelectorAll('.yomisaver-tab').forEach(tab => {
        debug('Found tab: ' + tab.dataset.tab);
        tab.addEventListener('click', () => {
            debug('Tab clicked: ' + tab.dataset.tab);
            
            // Remove active and hidden classes from all tabs
            document.querySelectorAll('.yomisaver-tab-content').forEach(content => {
                content.classList.remove('active');
                content.classList.add('hidden');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.yomisaver-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Show selected content and activate tab
            const tabId = tab.dataset.tab;
            const content = document.getElementById(tabId);
            content.classList.remove('hidden');
            content.classList.add('active');
            tab.classList.add('active');
        });
    });

    // Load flashcards
    loadFlashcards();

    // Settings handlers
    const popupSize = document.getElementById('popupSize');
    const fontSize = document.getElementById('fontSize');

    // Update size functions
    function updatePopupSize(value) {
        const size = value / 100;
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updatePopupSize',
                size: size
            });
        });
    }

    function updateFontSize(value) {
        const size = value / 100;
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateFontSize',
                size: size
            });
        });
    }

    // Add input handlers for real-time updates
    popupSize.addEventListener('input', (e) => {
        updatePopupSize(e.target.value);
    });

    fontSize.addEventListener('input', (e) => {
        updateFontSize(e.target.value);
    });

    // Save settings on change
    popupSize.addEventListener('change', (e) => {
        chrome.storage.sync.set({ 'popupSize': e.target.value });
    });

    fontSize.addEventListener('change', (e) => {
        chrome.storage.sync.set({ 'fontSize': e.target.value });
    });

    // Add event listener for toggle furigana button
    const toggleFuriganaButton = document.getElementById('toggleFurigana');
    toggleFuriganaButton.addEventListener('click', () => {
        chrome.storage.sync.get('furiganaVisible', (data) => {
            const furiganaVisible = !data.furiganaVisible;
            chrome.storage.sync.set({ 'furiganaVisible': furiganaVisible }, () => {
                toggleFuriganaButton.textContent = furiganaVisible ? 'Hide Furigana' : 'Show Furigana';
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleFurigana',
                        visible: furiganaVisible
                    });
                });
            });
        });
    });

    // Load saved settings
    chrome.storage.sync.get(['popupSize', 'fontSize', 'furiganaVisible'], (data) => {
        if (data.popupSize) {
            popupSize.value = data.popupSize;
            updatePopupSize(data.popupSize);
        }
        if (data.fontSize) {
            fontSize.value = data.fontSize;
            updateFontSize(data.fontSize);
        }
        if (data.furiganaVisible !== undefined) {
            toggleFuriganaButton.textContent = data.furiganaVisible ? 'Hide Furigana' : 'Show Furigana';
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleFurigana',
                    visible: data.furiganaVisible
                });
            });
        }
    });

    // Attach export functionality to button
    document.getElementById('export-flashcards').addEventListener('click', exportFlashcards);

    // Add event listener for acknowledgements button
    document.getElementById('showAcknowledgements').addEventListener('click', () => {
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('acknowledgements').classList.remove('hidden');
    });

    // Add event listener for back button in acknowledgements
    document.getElementById('backToSettings').addEventListener('click', () => {
        document.getElementById('acknowledgements').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
    });
});

function loadFlashcards() {
    console.log('Loading flashcards...');
    chrome.storage.local.get('vocabList', (data) => {
        console.log('Vocab data:', data);
        const vocabList = data.vocabList || [];
        const vocabContainer = document.getElementById('vocab-container');
        
        if (!vocabContainer) return;

        if (vocabList.length === 0) {
            vocabContainer.innerHTML = '<p class="yomisaver-coming-soon">No flashcards saved yet!</p>';
            return;
        }

        vocabContainer.innerHTML = '';
        vocabList.reverse().forEach((entry, index) => {
            console.log('Processing flashcard entry:', entry);

            const entryElement = document.createElement('div');
            entryElement.className = 'yomisaver-vocab-entry';
            entryElement.innerHTML = `
                <div class="vocab-header">
                    <input type="checkbox" class="select-flashcard" data-index="${index}">
                    <div class="word-info">
                        <h3>${entry.word}</h3>
                        ${entry.reading ? `<p class="reading">${entry.reading}</p>` : ''}
                    </div>
                    <button class="delete-vocab" title="Delete flashcard">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
                ${entry.wordInfo?.meanings?.map(m => 
                    `<div class="meaning">${m.definitions.join('; ')}</div>`
                ).join('') || ''}
                ${entry.wordInfo?.jlpt?.length ? 
                    `<div class="jlpt">${entry.wordInfo.jlpt.join(', ').toUpperCase()}</div>` : ''}
            `;

            // Add delete handler directly to the button
            const deleteBtn = entryElement.querySelector('.delete-vocab');
            deleteBtn.addEventListener('click', () => {
                chrome.storage.local.get('vocabList', (data) => {
                    const newList = data.vocabList.filter((_, i) => i !== index);
                    chrome.storage.local.set({ vocabList: newList }, () => {
                        entryElement.remove();
                        if (newList.length === 0) {
                            vocabContainer.innerHTML = '<p class="yomisaver-coming-soon">No flashcards saved yet!</p>';
                        }
                    });
                });
            });

            vocabContainer.appendChild(entryElement);
        });
    });
}

function exportFlashcards() {
    chrome.storage.local.get('vocabList', (data) => {
        const vocabList = data.vocabList || [];
        const selectedIndexes = Array.from(document.querySelectorAll('.select-flashcard:checked')).map(cb => parseInt(cb.dataset.index));
        const selectedFlashcards = selectedIndexes.map(index => vocabList[index]);

        if (selectedFlashcards.length === 0) {
            alert('No flashcards selected for export.');
            return;
        }

        const ankiData = selectedFlashcards.map(entry => {
            const front = entry.word;
            const back = `
                ${entry.reading ? `<div>Reading: ${entry.reading}</div>` : ''}
                ${entry.wordInfo?.meanings?.map(m => `<div>Definition: ${m.definitions.join('; ')}</div>`).join('') || ''}
                ${entry.wordInfo?.jlpt?.length ? `<div>JLPT: ${entry.wordInfo.jlpt.join(', ').toUpperCase()}</div>` : ''}
            `.trim().replace(/\n\s+/g, ' '); // Remove extra whitespace
            const tags = entry.wordInfo?.jlpt?.join(' ') || '';
            return `${front}\t${back}\t${tags}`;
        }).join('\n');

        const blob = new Blob([ankiData], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flashcards.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Listen for vocab updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'vocabUpdated') {
        loadFlashcards();
    }
});

// Add message listener for furigana toggle
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggleFurigana') {
        const furiganaElements = document.querySelectorAll('rt');
        furiganaElements.forEach(rt => {
            rt.style.display = message.visible ? 'block' : 'none';
        });
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFlashcards();
    // Add event listeners for acknowledgements and back button
    document.getElementById('showAcknowledgements').addEventListener('click', () => {
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('acknowledgements').classList.remove('hidden');
    });

    document.getElementById('backToSettings').addEventListener('click', () => {
        document.getElementById('acknowledgements').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
    });
});