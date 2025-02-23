# YomiSaver

![YomiSaverProgress003](https://github.com/user-attachments/assets/039a9e1e-3d65-44a8-ae77-ac0114be4697)

YomiSaver is a Chrome extension designed to help you learn Japanese effortlessly by adding furigana (reading aids) to web pages, building vocabulary lists, and exporting Anki-compatible flashcards.

## Features

- **Furigana Injection**: Automatically adds furigana to Japanese text on web pages using the Kuromoji tokenizer
- **Interactive Popups**: 
  - Hover over Japanese text to see definitions
  - Auto-positioning to stay within viewport
  - Auto-closes after 3 seconds unless hovered
  - Shows JLPT level when available
  - Displays word readings and meanings
- **Vocabulary Saving**: 
  - Save words via context menu
  - Automatic saving when viewing definitions
  - Prevents duplicate entries
- **Clean Display**:
  - Removes furigana from popup displays
  - Properly formats meanings with parts of speech
  - Shows grammatical tags and additional info

## Installation/ Tutorial

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing this project and delect the dist folder

**and if you're forking this repo to develop**
   
5. Run `npm install` to install dependencies
6. Run `npm run build` to build the extension

[**Visual tutorial available on my website. Click here!**](https://project-exit-velocity-blog.vercel.app/blog/67b86df0da979dbcf283e404)

## Usage

1. **View Word Definitions**: 
   - Hover over any Japanese text to see its definition
   - Popups position themselves intelligently to stay visible
   - Move mouse to popup to keep it open
   - Press ESC to dismiss popup

2. **Save Vocabulary**: 
   - Right-click on text and choose "Save Word to Flashcards"
   - Words are automatically saved when viewing definitions
   - View saved words in extension popup

## Project Structure

- `background.js`: Handles API requests and vocabulary storage
- `content.js`: Manages furigana injection and popup interactions
- `manifest.json`: Extension configuration
- `styles.css`: Popup and furigana styling
- `popup.html/js`: Vocabulary list viewer
- `webpack.config.js`: Build configuration

## Dependencies

- [kuromoji](https://www.npmjs.com/package/kuromoji): Japanese text tokenizer
- Webpack for building
- Chrome Extension APIs

## Current Progress

- [x] Furigana injection working
- [x] Hover popups implemented
- [x] Smart popup positioning
- [x] Auto-close behavior
- [x] Clean text display
- [x] Anki export support
- [x] Options menu

## Known Issues

## Data Attribution

The Japanese dictionary data is provided by [Jisho.org](https://jisho.org)'s API. Jisho.org is a powerful Japanese-English dictionary that provides word definitions, readings, and JLPT levels. It uses the [EDICT/JMdict](https://www.edrdg.org/jmdict/edict.html) dictionary files from the Electronic Dictionary Research and Development Group under the Creative Commons Attribution-ShareAlike License (CC BY-SA 3.0).
