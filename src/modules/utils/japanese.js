export function isKanji(char) {
    return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(char);
}

export function katakanaToHiragana(str = '') {
    return str.replace(/[\u30A1-\u30F6]/g, char =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

export function isJapanese(char) {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(char);
}

export function hasJapaneseText(text = '') {
    return [...text].some(isJapanese);
}

export function countJapaneseCharacters(text = '') {
    return [...text].filter(isJapanese).length;
}

export function isJapanesePage() {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();

    if (htmlLang.startsWith('ja')) {
        return true;
    }

    const bodyText = document.body?.innerText || document.body?.textContent || '';
    const sample = bodyText.replace(/\s+/g, '').slice(0, 5000);

    if (!sample) {
        return false;
    }

    const japaneseCharacterCount = countJapaneseCharacters(sample);
    const japaneseRatio = japaneseCharacterCount / sample.length;

    return japaneseCharacterCount >= 50 || japaneseRatio >= 0.05;
}