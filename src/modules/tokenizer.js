const kuromoji = require('kuromoji');

import { normaliseToken } from './models/token';

let tokenizer = null;

export async function initializeTokenizer() {
    if (tokenizer) {
        return tokenizer;
    }

    const dicPath = chrome.runtime.getURL('dict');

    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath, debugMode: false })
            .build((err, builtTokenizer) => {
                if (err) {
                    reject(err);
                    return;
                }

                tokenizer = builtTokenizer;
                resolve(tokenizer);
            });
    });
}

export async function processText(text) {
    try {
        const activeTokenizer = await initializeTokenizer();
        const rawTokens = activeTokenizer.tokenize(text);

        return rawTokens
            .map(normaliseToken)
            .filter(token => token.surface);
    } catch (error) {
        console.error('Error processing text:', error);
        return [];
    }
}