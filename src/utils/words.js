const POS_MAP = new Map([
    ['n', 'n.'],
    ['n.', 'n.'],
    ['noun', 'n.'],
    ['v', 'v.'],
    ['v.', 'v.'],
    ['verb', 'v.'],
    ['adj', 'adj.'],
    ['adj.', 'adj.'],
    ['adjective', 'adj.'],
    ['adv', 'adv.'],
    ['adv.', 'adv.'],
    ['adverb', 'adv.']
]);

export const isPhrase = (english) => /\s/.test((english || '').trim());

export const normalizePos = (pos) => {
    const raw = String(pos || '').trim().toLowerCase().replace(/\.$/, '');
    if (!raw) return '';
    return POS_MAP.get(raw) || `${raw}.`;
};
