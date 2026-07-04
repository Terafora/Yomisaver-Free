import { hasJapaneseText, isKanji, katakanaToHiragana } from '../utils/japanese';

export function normaliseToken(rawToken) {
    const surface = cleanTokenValue(rawToken?.surface_form);
    const rawBaseForm = cleanTokenValue(rawToken?.basic_form);
    const rawReading = cleanTokenValue(rawToken?.reading);

    const baseForm = rawBaseForm && rawBaseForm !== '*'
        ? rawBaseForm
        : surface;

    const reading = rawReading && rawReading !== '*'
        ? katakanaToHiragana(rawReading)
        : '';

    const partOfSpeech = cleanTokenValue(rawToken?.pos);
    const partOfSpeechDetails = [
        rawToken?.pos_detail_1,
        rawToken?.pos_detail_2,
        rawToken?.pos_detail_3
    ]
        .map(cleanTokenValue)
        .filter(detail => detail && detail !== '*');

    return {
        surface,
        baseForm,
        reading,
        rawReading,
        partOfSpeech,
        partOfSpeechDetails,
        isKanjiWord: [...surface].some(isKanji),
        isJapanese: hasJapaneseText(surface),
        isPunctuation: isPunctuationToken(surface),
        raw: rawToken
    };
}

export function tokenToDataset(token) {
    return {
        surface: token.surface || '',
        baseForm: token.baseForm || token.surface || '',
        reading: token.reading || '',
        partOfSpeech: token.partOfSpeech || '',
        partOfSpeechDetails: Array.isArray(token.partOfSpeechDetails)
            ? token.partOfSpeechDetails.join('|')
            : ''
    };
}

export function datasetToTokenMeta(dataset = {}) {
    return {
        surface: dataset.surface || '',
        baseForm: dataset.baseForm || dataset.surface || '',
        reading: dataset.reading || '',
        partOfSpeech: dataset.partOfSpeech || '',
        partOfSpeechDetails: dataset.partOfSpeechDetails
            ? dataset.partOfSpeechDetails.split('|').filter(Boolean)
            : []
    };
}

function cleanTokenValue(value) {
    return String(value || '').trim();
}

function isPunctuationToken(surface) {
    return /^[\s。、，,.!?！？「」『』（）()［］\[\]【】・…ー〜~\-]+$/.test(surface);
}