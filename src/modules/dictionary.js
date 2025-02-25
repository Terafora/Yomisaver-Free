const wordCache = new Map();

export async function lookupWord(word, language = 'en') {
    const cacheKey = `${word}-${language}`;
    if (wordCache.has(cacheKey)) return wordCache.get(cacheKey);
    
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { 
                    action: "lookupWord", 
                    word,
                    language 
                },
                response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                }
            );
        });

        if (!response?.success) return null;

        const wordInfo = {
            word: word,
            reading: response.data.data[0]?.japanese[0]?.reading || '',
            meanings: response.data.data[0]?.senses.map(sense => ({
                definitions: language === 'fr' ? 
                    (sense.french_definitions || []) : 
                    (sense.english_definitions || []),
                partOfSpeech: sense.parts_of_speech,
                tags: sense.tags,
                info: sense.info
            })) || [],
            jlpt: response.data.data[0]?.jlpt || []
        };

        wordCache.set(cacheKey, wordInfo);
        return wordInfo;
    } catch (error) {
        console.error('Error looking up word:', error);
        if (error.message.includes('Extension context invalidated')) {
            window.location.reload();
        }
        return null;
    }
}