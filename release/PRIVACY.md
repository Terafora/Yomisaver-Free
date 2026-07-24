# YomiSaver Privacy Policy

**Effective date:** 24 July 2026  
**Last updated:** 24 July 2026

YomiSaver is a Chrome extension that helps people read and study Japanese by adding furigana to Japanese web pages, showing dictionary information, saving vocabulary with context, and exporting vocabulary for use with tools such as Anki.

This policy explains what information YomiSaver handles, why it is needed, where it is stored, and when it is shared.

## Summary

YomiSaver:

- processes Japanese text from web pages locally in your browser;
- sends only a word or short phrase being looked up to the Jisho.org dictionary API;
- stores vocabulary, sentence context, source-page details, preferences, and consent records using Chrome extension storage;
- does not use advertising, analytics, tracking, or profiling;
- does not sell user data; and
- does not send saved vocabulary or browsing history to the developer.

YomiSaver remains paused until you acknowledge its in-extension privacy notice.

## YomiSaver's single purpose

YomiSaver's single purpose is to provide Japanese reading and vocabulary-learning assistance on web pages. Information is handled only when it is necessary to provide features connected to that purpose.

## Information YomiSaver handles

### Website content

When YomiSaver is enabled, its content script can read visible text on web pages you visit in order to:

- detect Japanese text;
- tokenize Japanese words locally;
- add furigana and reading assistance;
- identify the word associated with a hover or selection; and
- capture sentence context when you choose to save vocabulary.

This page analysis is performed locally in your browser. YomiSaver does not send complete web pages, general browsing history, form contents, passwords, or page screenshots to the developer or to Jisho.org.

### Dictionary lookup terms

When you hover over a Japanese word to request its definition, use a YomiSaver lookup feature, or save selected text through the context menu, YomiSaver sends the relevant word or short phrase to the Jisho.org API over HTTPS. This is necessary to retrieve dictionary definitions, readings, grammatical information, and available JLPT information.

YomiSaver does not include the source page's URL, title, surrounding sentence, or your saved vocabulary list in the Jisho.org lookup request.

Jisho.org is an independent third-party service. Its handling of requests is governed by its own practices. You can learn more at [Jisho.org](https://jisho.org/).

### Saved vocabulary and context

When you save vocabulary, YomiSaver may store:

- the displayed word and dictionary/base form;
- its reading, meanings, grammatical information, and JLPT level;
- the surrounding sentence or context;
- the source page URL and title;
- when the entry was saved or updated; and
- internal identifiers used to organise entries and prevent duplicates.

This information is stored in `chrome.storage.local` on your device. It is used to display, manage, and export your vocabulary. It is not transmitted to the developer.

### Preferences and consent records

YomiSaver stores extension preferences, such as furigana visibility, reading-help mode, text size, and popup size, using `chrome.storage.sync`. Chrome may sync these preferences between browsers where you are signed in and have Chrome Sync enabled. That synchronisation is operated by Google and is governed by your Google and Chrome settings.

YomiSaver stores your privacy acknowledgement, its policy version, and the acknowledgement time in `chrome.storage.local`. These records are used only to determine whether YomiSaver may activate its page-processing and lookup features.

YomiSaver may also store a local dictionary or JLPT lookup cache to reduce unnecessary repeated requests.

## How information is used

YomiSaver uses the information described above only to:

- add and control Japanese reading assistance;
- retrieve and display dictionary results;
- save, organise, and export vocabulary;
- preserve your chosen extension settings;
- remember your privacy acknowledgement; and
- maintain reliable operation of these features.

YomiSaver does not use this information for advertising, analytics, credit decisions, profiling, or unrelated purposes.

## Sharing and disclosure

YomiSaver shares information only in the following limited circumstances:

- **Jisho.org:** receives the word or short phrase required for a dictionary lookup.
- **Google Chrome Sync:** may receive extension preference values when Chrome Sync is enabled in your browser. Saved vocabulary and sentence context are not intentionally placed in `chrome.storage.sync`.
- **Legal or security requirements:** information may be disclosed if required by applicable law or when necessary to protect users from malware, fraud, abuse, or a security threat. Because YomiSaver does not operate a server that receives your saved extension data, the developer generally does not possess that data to disclose.

YomiSaver does not sell, rent, or transfer user data to advertising platforms, data brokers, or other information resellers.

## Data retention and deletion

Locally saved vocabulary, context, caches, and consent records remain in Chrome extension storage until you delete them, clear the extension's storage, or uninstall YomiSaver.

You can delete individual saved vocabulary entries through YomiSaver. You can remove YomiSaver's locally stored information by clearing its extension data or uninstalling the extension through Chrome. Synced preference data is managed through Chrome and your Google account's sync settings.

YomiSaver does not maintain a developer-operated account or server containing a copy of your saved vocabulary.

## Security

Dictionary requests are sent to Jisho.org using HTTPS. YomiSaver does not download or execute remote code. Extension code is packaged with the installed extension and is subject to Chrome's extension security model.

No method of storage or transmission is completely risk-free, but YomiSaver limits processing and transmission to what is needed for its stated reading and vocabulary-learning purpose.

## Chrome Web Store Limited Use compliance

YomiSaver's use and transfer of user data complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including its Limited Use requirements.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes to this policy

This policy may be updated when YomiSaver's features or data practices change. The effective date and last-updated date at the top of this document will be revised when material changes are made.

If a change requires new consent, YomiSaver will present an updated notice before enabling the affected features.

## Contact

For privacy questions, deletion guidance, or security reports, open an issue in the [YomiSaver GitHub repository](https://github.com/Terafora/Yomisaver-Free/issues).

Do not include private, sensitive, or personal information in a public issue.