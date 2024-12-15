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
    chrome.storage.local.get('vocabList', (data) => {
        const vocabList = data.vocabList || [];
        const vocabContainer = document.getElementById('vocab-container');
        
        if (vocabList.length === 0) {
            vocabContainer.innerHTML = '<p class="yomisaver-coming-soon">No flashcards saved yet!</p>';
            return;
        }

        vocabList.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'yomisaver-vocab-entry';
            entryElement.innerHTML = `
                <h3>${entry.word}</h3>
                ${entry.reading ? `<p class="reading">${entry.reading}</p>` : ''}
                <p class="sentence">${entry.sentence || 'No context available'}</p>
            `;
            vocabContainer.appendChild(entryElement);
        });
    });

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

    // Load saved settings
    chrome.storage.sync.get(['popupSize', 'fontSize'], (data) => {
        if (data.popupSize) {
            popupSize.value = data.popupSize;
            updatePopupSize(data.popupSize);
        }
        if (data.fontSize) {
            fontSize.value = data.fontSize;
            updateFontSize(data.fontSize);
        }
    });
});