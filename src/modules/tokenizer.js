const kuromoji = require('kuromoji');

let tokenizer = null;

export async function initializeTokenizer() {
    if (tokenizer) return tokenizer;
    const dicPath = chrome.runtime.getURL('dict');
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath, debugMode: true })
            .build((err, _tokenizer) => {
                if (err) {
                    reject(err);
                    return;
                }
                tokenizer = _tokenizer;
                resolve(tokenizer);
            });
    });
}

export async function processText(text) {
    try {
        const _tokenizer = await initializeTokenizer();
        return _tokenizer.tokenize(text);
    } catch (error) {
        console.error('Error processing text:', error);
        return [];
    }
}