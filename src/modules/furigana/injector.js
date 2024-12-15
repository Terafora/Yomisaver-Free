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

        node.replaceWith(wrapper);
    } catch (error) {
        console.error('Error injecting furigana:', error);
    }
}