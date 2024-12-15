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

    // Tab switching
    document.querySelectorAll('.yomisaver-tab').forEach(tab => {
        debug('Found tab: ' + tab.dataset.tab);
        tab.addEventListener('click', () => {
            debug('Tab clicked: ' + tab.dataset.tab);
            
            // Remove active class from all tabs and contents
            document.querySelectorAll('.yomisaver-tab, .yomisaver-tab-content').forEach(el => {
                el.classList.remove('active');
            });
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const content = document.getElementById(tab.dataset.tab);
            if (content) {
                content.classList.add('active');
            }
        });
    });

    // Load flashcards
    chrome.storage.local.get('vocabList', (data) => {
        const vocabList = data.vocabList || [];
        const vocabContainer = document.getElementById('vocab-container');
        
        if (vocabList.length === 0) {
            vocabContainer.innerHTML = '<div class="coming-soon"><p>No flashcards saved yet!</p></div>';
            return;
        }

        vocabList.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'vocab-entry';
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

    popupSize.addEventListener('change', (e) => {
        chrome.storage.local.set({ 'popupSize': e.target.value });
    });

    fontSize.addEventListener('change', (e) => {
        chrome.storage.local.set({ 'fontSize': e.target.value });
    });

    // Load saved settings
    chrome.storage.local.get(['popupSize', 'fontSize'], (data) => {
        if (data.popupSize) popupSize.value = data.popupSize;
        if (data.fontSize) fontSize.value = data.fontSize;
    });
});