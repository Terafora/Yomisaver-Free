const wordCache = new Map();

export async function lookupWord(word) {
    if (wordCache.has(word)) return wordCache.get(word);
    
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "lookupWord", word },
                response => resolve(response)
            );
        });

        if (!response?.success) return null;

        const wordInfo = {
            word: word,
            reading: response.data.data[0]?.japanese[0]?.reading || '',
            meanings: response.data.data[0]?.senses.map(sense => ({
                definitions: sense.english_definitions,
                partOfSpeech: sense.parts_of_speech,
                tags: sense.tags,
                info: sense.info
            })) || [],
            jlpt: response.data.data[0]?.jlpt || []
        };

        wordCache.set(word, wordInfo);
        return wordInfo;
    } catch (error) {
        console.error('Error looking up word:', error);
        return null;
    }
}