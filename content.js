import kuromoji from 'kuromoji';

// Load the dictionary and build the tokenizer
kuromoji.builder({ dicPath: "path/to/dictionary" }).build((err, tokenizer) => {
  if (err) throw err;

  const input = "日本語の例文";
  const tokens = tokenizer.tokenize(input);
  tokens.forEach(token => {
    console.log(token.surface_form, token.reading); // Add furigana logic here
  });
});

// Save the vocabulary list
chrome.storage.local.get({ vocabList: [] }, (data) => {
    const vocabList = data.vocabList || [];
    const newEntry = { word: "日本語", sentence: "日本語の例文", reading: "にほんご" };
    vocabList.push(newEntry);
  
    chrome.storage.local.set({ vocabList }, () => {
      console.log("Vocabulary saved!");
    });
  });
  
// Export the vocabulary list
  document.getElementById('export-btn').addEventListener('click', () => {
    chrome.storage.local.get('vocabList', (data) => {
      const csv = data.vocabList
        .map(item => `${item.word},${item.reading},${item.sentence}`)
        .join('\n');
  
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = url;
      a.download = 'anki_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  