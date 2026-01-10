const POS_MAP = new Map([
    // English/Universal
    ['n', 'n.'], ['n.', 'n.'], ['noun', 'n.'],
    ['v', 'v.'], ['v.', 'v.'], ['verb', 'v.'],
    ['adj', 'adj.'], ['adj.', 'adj.'], ['adjective', 'adj.'],
    ['adv', 'adv.'], ['adv.', 'adv.'], ['adverb', 'adv.'],
    ['pron', 'pron.'], ['pron.', 'pron.'], ['pronoun', 'pron.'],
    ['prep', 'prep.'], ['prep.', 'prep.'], ['preposition', 'prep.'],
    ['conj', 'conj.'], ['conj.', 'conj.'], ['conjunction', 'conj.'],
    
    // German specific (adding common German abbreviations)
    ['m', 'm.'], ['m.', 'm.'], // Maskulin
    ['f', 'f.'], ['f.', 'f.'], // Feminin
    ['nt', 'nt.'], ['nt.', 'nt.'], // Neutrum
    ['pl', 'pl.'], ['pl.', 'pl.'], // Plural
    ['art', 'art.'], ['artikel', 'art.'],
    ['konj', 'konj.'], ['konj.', 'konj.'],
    ['präp', 'präp.'], ['präp.', 'präp.'],
]);

export const isPhrase = (text) => /\s/.test((text || '').trim());

export const normalizePos = (pos) => {
    const raw = String(pos || '').trim().toLowerCase().replace(/\.$/, '');
    if (!raw) return '';
    return POS_MAP.get(raw) || `${raw}.`;
};
