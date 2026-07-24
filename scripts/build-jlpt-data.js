const fs = require('fs/promises');
const https = require('https');
const path = require('path');

const SOURCE_COMMIT =
    '4358f932937ad0232194a36e9f4f875094910c6b';

const SOURCE_URL = [
    'https://raw.githubusercontent.com',
    'Bluskyo',
    'JLPT_Vocabulary',
    SOURCE_COMMIT,
    'data/vocab/results/JLPT_vocab_ALL.json'
].join('/');

const OUTPUT_FILE = path.resolve(
    __dirname,
    '../src/modules/jlpt/data/jlptVocab.json'
);

// These checks prevent a sample or broken download from replacing
// the complete release dataset.
const MINIMUM_KEY_COUNT = 5000;
const MINIMUM_ENTRY_COUNT = 5000;

async function main() {
    console.log('Downloading JLPT vocabulary data...');
    console.log(`Source commit: ${SOURCE_COMMIT}`);

    const sourceData = await downloadJson(SOURCE_URL);

    console.log('Converting JLPT vocabulary data...');

    const convertedData = convertJlptData(sourceData);
    const statistics = getDatasetStatistics(convertedData);

    validateDataset(statistics);

    await fs.mkdir(
        path.dirname(OUTPUT_FILE),
        { recursive: true }
    );

    await fs.writeFile(
        OUTPUT_FILE,
        `${JSON.stringify(convertedData)}\n`,
        'utf8'
    );

    console.log(`Wrote ${OUTPUT_FILE}`);
    console.log(
        `Created ${statistics.keyCount} lookup keys ` +
        `with ${statistics.entryCount} entries.`
    );
}

function convertJlptData(sourceData) {
    const output = {};

    Object.entries(sourceData || {}).forEach(
        ([expression, entries]) => {
            const cleanExpression =
                normaliseExpression(expression);

            if (
                !cleanExpression ||
                !Array.isArray(entries)
            ) {
                return;
            }

            entries.forEach(entry => {
                const reading = normaliseReading(
                    entry?.reading || ''
                );

                const level = normaliseLevel(
                    entry?.level
                );

                if (!level) {
                    return;
                }

                addEntry(
                    output,
                    cleanExpression,
                    reading,
                    level
                );

                if (reading) {
                    addEntry(
                        output,
                        `${cleanExpression}|${reading}`,
                        reading,
                        level
                    );
                }
            });
        }
    );

    return sortObject(output);
}

function addEntry(output, key, reading, level) {
    const cleanKey = normaliseExpression(key);

    if (!cleanKey || !level) {
        return;
    }

    if (!output[cleanKey]) {
        output[cleanKey] = [];
    }

    const candidate = {
        r: reading || '',
        l: level
    };

    const duplicate = output[cleanKey].some(
        existing =>
            existing.r === candidate.r &&
            existing.l === candidate.l
    );

    if (!duplicate) {
        output[cleanKey].push(candidate);
    }

    output[cleanKey].sort((a, b) => {
        if (a.r !== b.r) {
            return a.r.localeCompare(b.r, 'ja');
        }

        return (
            getLevelRank(a.l) -
            getLevelRank(b.l)
        );
    });
}

function sortObject(object) {
    return Object.fromEntries(
        Object.entries(object).sort(
            ([a], [b]) =>
                a.localeCompare(b, 'ja')
        )
    );
}

function getDatasetStatistics(dataset) {
    const keyCount = Object.keys(dataset).length;

    const entryCount = Object.values(dataset).reduce(
        (total, entries) => {
            if (!Array.isArray(entries)) {
                return total;
            }

            return total + entries.length;
        },
        0
    );

    return {
        keyCount,
        entryCount
    };
}

function validateDataset({
    keyCount,
    entryCount
}) {
    if (keyCount < MINIMUM_KEY_COUNT) {
        throw new Error(
            'JLPT dataset validation failed: ' +
            `expected at least ${MINIMUM_KEY_COUNT} keys, ` +
            `but received ${keyCount}.`
        );
    }

    if (entryCount < MINIMUM_ENTRY_COUNT) {
        throw new Error(
            'JLPT dataset validation failed: ' +
            `expected at least ${MINIMUM_ENTRY_COUNT} entries, ` +
            `but received ${entryCount}.`
        );
    }
}

function normaliseExpression(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/^=/, '')
        .replace(/[［］\[\]]/g, '')
        .replace(/[（）()]/g, '');
}

function normaliseReading(value) {
    return katakanaToHiragana(
        String(value || '')
            .trim()
            .replace(/\s+/g, '')
            .replace(/[（）()]/g, '')
            .replace(/[［］\[\]]/g, '')
    );
}

function normaliseLevel(value) {
    const text = String(value || '')
        .toLowerCase();

    const match = text.match(/[1-5]/);

    if (!match) {
        return '';
    }

    return `n${match[0]}`;
}

function getLevelRank(level) {
    const ranks = {
        n5: 1,
        n4: 2,
        n3: 3,
        n2: 4,
        n1: 5
    };

    return ranks[level] || 999;
}

function katakanaToHiragana(value) {
    return String(value || '').replace(
        /[\u30A1-\u30F6]/g,
        character =>
            String.fromCharCode(
                character.charCodeAt(0) - 0x60
            )
    );
}

function downloadJson(url) {
    return downloadText(url).then(text => {
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(
                `Failed to parse JSON from ${url}: ` +
                error.message
            );
        }
    });
}

function downloadText(
    url,
    redirectCount = 0
) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            reject(
                new Error(
                    'Too many redirects while ' +
                    'downloading JLPT data.'
                )
            );

            return;
        }

        const request = https.get(
            url,
            {
                headers: {
                    'User-Agent':
                        'YomiSaver-JLPT-Data-Builder'
                }
            },
            response => {
                const statusCode =
                    response.statusCode || 0;

                if (
                    [301, 302, 303, 307, 308]
                        .includes(statusCode)
                ) {
                    const location =
                        response.headers.location;

                    if (!location) {
                        reject(
                            new Error(
                                `Redirect from ${url} ` +
                                'had no location header.'
                            )
                        );

                        return;
                    }

                    const nextUrl = new URL(
                        location,
                        url
                    ).toString();

                    resolve(
                        downloadText(
                            nextUrl,
                            redirectCount + 1
                        )
                    );

                    return;
                }

                if (
                    statusCode < 200 ||
                    statusCode >= 300
                ) {
                    reject(
                        new Error(
                            'Download failed with status ' +
                            `${statusCode}: ${url}`
                        )
                    );

                    return;
                }

                let body = '';

                response.setEncoding('utf8');

                response.on(
                    'data',
                    chunk => {
                        body += chunk;
                    }
                );

                response.on(
                    'end',
                    () => {
                        resolve(body);
                    }
                );
            }
        );

        request.on('error', reject);

        request.setTimeout(
            30000,
            () => {
                request.destroy(
                    new Error(
                        'Download timed out while ' +
                        'fetching JLPT data.'
                    )
                );
            }
        );
    });
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});