import { escapeCsv } from './format.js';

export const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }

    result.push(current);
    return result;
};

export const buildCsv = (words) => {
    const header = ['English', 'PartOfSpeech', 'Meaning', 'Example', 'Date'];
    const lines = [header.join(',')];

    words.forEach((word) => {
        lines.push(
            `"${escapeCsv(word.english)}","${escapeCsv(word.pos || '')}","${escapeCsv(word.chinese || '')}",` +
            `"${escapeCsv(word.example || '')}","${new Date(word.timestamp).toISOString()}"`
        );
    });

    return `\uFEFF${lines.join('\n')}\n`;
};
