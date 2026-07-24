# YomiSaver Chrome Web Store Listing

Prepared for YomiSaver version 1.0.0.

## Product details

### Extension name

YomiSaver

### Summary

Add configurable furigana to Japanese web pages, look up words, save vocabulary with context, and export cards for Anki.

### Detailed description

YomiSaver takes a lot of the friction and time consuming parts out learning Japanese by helping you read real web Japanese content with configurable furigana, built-in word lookups, and a personal vocabulary collection and exportable flashcards.

Read Japanese content at your own level:

- Add furigana to Japanese words on ordinary web pages.
- Show all readings or hide furigana for words up to a selected JLPT level.
- Hover over Japanese words to view readings, definitions, grammatical information, and available JLPT information.
- Adjust the size of reading aids and definition popups.
- Hide furigana entirely whenever you want to practise unaided reading.

Build vocabulary while you read:

- Save useful words with their readings and meanings.
- Keep sentence context and source-page details with saved cards.
- Save selected text through YomiSaver's right-click context menu.
- Search and delete saved vocabulary through the extension popup.
- Back up and restore your vocabulary collection.
- Export selected vocabulary as Anki-compatible cards.

Privacy at a glance:

YomiSaver processes page text locally in your browser. When a dictionary lookup is requested, only the relevant word or short phrase is sent to Jisho.org over HTTPS.

Saved vocabulary and sentence context remain in Chrome's local extension storage. Preferences may be synchronised through Chrome Sync. YomiSaver does not contain advertising, analytics, behavioural tracking, or profiling, and it does not sell user data.

YomiSaver remains paused until you acknowledge its privacy notice.

Dictionary results are provided using the Jisho.org API and underlying JMdict/EDICT dictionary data.

### Category

Education

### Language

English

### Homepage URL

https://github.com/Terafora/Yomisaver-Free

### Support URL

https://github.com/Terafora/Yomisaver-Free/issues

## Privacy practices

### Single-purpose description

YomiSaver provides Japanese reading and vocabulary-learning assistance on web pages by adding configurable furigana, retrieving dictionary information for Japanese words, and allowing users to save and export vocabulary with context.

## Permission justifications

### contextMenus

YomiSaver adds a right-click menu item that allows the user to save selected Japanese text to their local vocabulary collection. The context-menu item is created only after the user acknowledges YomiSaver's privacy notice.

### storage

YomiSaver uses Chrome extension storage to save vocabulary, sentence context, source-page details, local dictionary and JLPT cache data, privacy acknowledgement records, and extension preferences.

Vocabulary and context are stored with `chrome.storage.local`. Preference values such as reading-help mode, furigana visibility, popup size, and font size may be stored with `chrome.storage.sync`.

### activeTab

When the user opens YomiSaver or selects its context-menu action, YomiSaver needs temporary access to the active tab so it can apply the user's display settings, report JLPT coverage, and associate explicitly saved vocabulary with the current source page.

YomiSaver does not use this permission to construct a general browsing history.

### Host permission: https://jisho.org/*

YomiSaver uses the Jisho.org API to retrieve dictionary definitions, readings, grammatical information, and available JLPT information for Japanese words requested through its lookup and vocabulary-saving features.

Only the relevant lookup word or short phrase is sent to Jisho.org. Complete pages, saved vocabulary lists, source-page URLs, and surrounding sentences are not included in dictionary requests.

### Website access: http://*/* and https://*/*

YomiSaver is designed to provide Japanese reading assistance on ordinary web pages. It needs access to HTTP and HTTPS pages so it can detect visible Japanese text, tokenize it locally, add configurable furigana, show word information, and capture context when the user saves vocabulary.

Page processing remains paused until the user acknowledges YomiSaver's privacy notice.

## Remote code declaration

Select:

**No, I am not using remote code.**

Explanation if requested:

YomiSaver does not download or execute remotely hosted JavaScript or WebAssembly. All executable extension code and tokenizer resources are packaged inside the extension.

The Jisho.org API returns dictionary data in JSON format. That response is treated only as data and is never executed as code.

## User-data disclosures

Select the following data types:

- Website content
- Web history

### Website content explanation

YomiSaver processes visible Japanese page text locally to add furigana and identify words for dictionary lookup.

When the user saves vocabulary, YomiSaver may store the selected word, surrounding sentence, and associated dictionary information locally in Chrome extension storage.

Only a requested lookup word or short phrase is transmitted to Jisho.org. Complete page contents are not transmitted.

### Web history explanation

When the user explicitly saves vocabulary, YomiSaver may store the current page URL and title with that vocabulary entry so the user can retain and export its source context.

YomiSaver does not construct, transmit, analyse, or monetise a general record of websites visited. Source-page information is retained only for vocabulary entries the user chooses to save.

### Data types not collected

Do not select:

- Personally identifiable information
- Health information
- Financial and payment information
- Authentication information
- Personal communications
- Location
- User activity

YomiSaver does not intentionally collect these data categories.

## Data-use certifications

Confirm all applicable certification statements:

- YomiSaver does not sell user data to third parties.
- YomiSaver does not use or transfer user data for purposes unrelated to its single purpose.
- YomiSaver does not use or transfer user data to determine creditworthiness or for lending purposes.
- YomiSaver does not allow humans to read user data except where permitted by the Chrome Web Store User Data Policy.
- YomiSaver's use of user data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Privacy-policy URL

Use this URL after the release branch has been merged into `main`:

https://github.com/Terafora/Yomisaver-Free/blob/main/PRIVACY.md

Before submission, open this URL in a private/incognito window and confirm that it is publicly accessible.

## Distribution

### Visibility

Public

### Regions

All regions

### Pricing

Free

### In-app purchases

No

## Test instructions for reviewers

No account, payment, or special credentials are required.

1. Install YomiSaver.
2. Confirm that the welcome and privacy notice opens.
3. Before accepting the notice, open a Japanese web page and confirm that YomiSaver does not process it.
4. Select “Enable YomiSaver” on the welcome page.
5. Open or reload a Japanese-language web page.
6. Confirm that furigana is added to Japanese text.
7. Hover over a Japanese word and confirm that dictionary information appears.
8. Open the YomiSaver popup and change the reading-help mode.
9. Confirm that the visible furigana changes according to the selected setting.
10. Save a word from its lookup popup or through the right-click context menu.
11. Open the Cards section and confirm that the saved entry appears.
12. Export the saved entry and confirm that an Anki-compatible TSV file is downloaded.

Suggested test page:

https://www3.nhk.or.jp/news/easy/