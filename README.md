# YomiSaver

YomiSaver is a Chrome extension designed to help you learn Japanese effortlessly by adding furigana (reading aids) to web pages, building vocabulary lists, and exporting Anki-compatible flashcards.

## Features

- **Furigana Injection**: Automatically adds furigana to Japanese text on web pages using the Kuromoji tokenizer.
- **Vocabulary Saving**: Save selected words to a vocabulary list via context menu or text selection.
- **Anki Export**: Export your saved vocabulary list to Anki-compatible flashcards.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing this project.

## Usage

1. **Inject Furigana**: The extension will automatically process the DOM and inject furigana when the page loads.
2. **Save Vocabulary**: 
   - Right-click on selected text and choose "Save Word to Flashcards" from the context menu.
   - Or, select text and it will be automatically sent to the background script for saving.
3. **View Saved Vocabulary**: Open the extension popup to view your saved vocabulary list.

## Project Structure

- `background.js`: Handles context menu creation, message listening, and vocabulary saving.
- `content.js`: Injects furigana into the DOM and listens for text selection.
- `manifest.json`: Defines the extension's permissions, background script, and content scripts.
- `styles.css`: Styles for the furigana elements.
- `popup.html`: The HTML for the extension's popup interface.
- `README.md`: This file.

## Dependencies

- [kuromoji](https://www.npmjs.com/package/kuromoji): A Japanese tokenizer used for furigana injection.

## Current Progress

![YomiSaverProgress003](https://github.com/user-attachments/assets/039a9e1e-3d65-44a8-ae77-ac0114be4697)

Currently the application successfully injects furigana into the webpage and displays popups with the readings and definitions.
   - Need to clean the input so that the kanji displays without unnecessary furigana next to it.
   - Need to make the information from the dictionary pass over to the flash casrd creator correctly.
   - Need to add export support for app.
   - Need to add options menu for user customizations.
   - Need to implement a way to gate premium features once they're implemented
