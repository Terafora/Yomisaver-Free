export function isKanji(char) {
    return /[\u4e00-\u9faf]/.test(char);
}

export function katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, char => 
        String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

export function isJapanese(char) {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(char);
}

export function isJapanesePage() {
    const htmlLang = document.documentElement.lang;
    return htmlLang && htmlLang.startsWith('ja');
}