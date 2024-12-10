document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('vocabList', (data) => {
        const vocabList = data.vocabList || [];
        const vocabContainer = document.getElementById('vocab-container');

        vocabList.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'vocab-entry';
            entryElement.innerHTML = `
                <h3>${entry.word}</h3>
                <p>Sentence: ${entry.sentence}</p>
                <p>Reading: ${entry.reading}</p>
                <p>Info: ${JSON.stringify(entry.wordInfo)}</p>
            `;
            vocabContainer.appendChild(entryElement);
        });
    });
});