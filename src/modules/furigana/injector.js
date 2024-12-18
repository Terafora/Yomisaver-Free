import { processText } from '../tokenizer';
import { isKanji, katakanaToHiragana } from '../utils/japanese';

export async function injectFurigana(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
    
    const parentTag = node.parentElement?.tagName;
    if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || 
        parentTag === 'RT' || parentTag === 'RP') {
        return;
    }

    try {
        const tokens = await processText(node.textContent);
        if (!tokens || !tokens.length) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'yomisaver-text';
        wrapper.innerHTML = tokens.map(token => {
            if (token.reading && [...token.surface_form].some(isKanji)) {
                const hiraganaReading = katakanaToHiragana(token.reading);
                return `<ruby class="yomisaver-word">${token.surface_form}<rt>${hiraganaReading}</rt></ruby>`;
            }
            return `<span class="yomisaver-word">${token.surface_form}</span>`;
        }).join('');

        // Post-processing to refine furigana
        refineFurigana(wrapper, tokens);

        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error injecting furigana:', error);
    }
}

function refineFurigana(wrapper, tokens) {
    // Implement additional rules or context-based adjustments here
    // Example: Handle special cases or ambiguous readings
    const rubyElements = wrapper.querySelectorAll('ruby');
    rubyElements.forEach((ruby, index) => {
        const rt = ruby.querySelector('rt');
        if (rt) {
            // Example rule: Adjust reading based on context
            const adjustedReading = adjustReadingBasedOnContext(tokens, index, rt.textContent);
            rt.textContent = adjustedReading;
        }
    });
}

function adjustReadingBasedOnContext(tokens, index, reading) {
    // Implement context-based adjustments here
    // Example: If the surface form is a specific kanji, adjust the reading
    const surfaceForm = tokens[index].surface_form;

    if (surfaceForm === '行く' && reading === 'いく') {
        return 'ゆく'; // Adjust reading based on context
    }
    // New rule: If "風" is attached to a preceding noun, read as "ふう"
    if (surfaceForm === '風' && reading === 'かぜ' && index > 0) {
        const precedingToken = tokens[index - 1];
        if (precedingToken.pos === '名詞' || precedingToken.pos === '固有名詞') {
            return 'ふう';
        }
    }
    return reading;
}