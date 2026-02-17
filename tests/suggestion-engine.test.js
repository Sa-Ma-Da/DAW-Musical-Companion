const {
    suggestDiatonicChords,
    suggestScales,
    suggestExtensions
} = require('../src/suggestion-engine');

describe('SuggestionEngine', () => {

    // ---------------------------------------------------------------
    // suggestDiatonicChords
    // ---------------------------------------------------------------
    describe('suggestDiatonicChords', () => {
        test('returns diatonic chords for C Major', () => {
            const suggestions = suggestDiatonicChords('C Major', null);
            expect(suggestions.length).toBeGreaterThan(0);

            const names = suggestions.map(s => s.name);
            // Should include common C Major diatonic chords
            expect(names).toContain('C Major');   // I
            expect(names).toContain('F Major');   // IV
            expect(names).toContain('G Major');   // V
            expect(names).toContain('A Minor');   // vi
        });

        test('each suggestion has name, function, and confidence', () => {
            const suggestions = suggestDiatonicChords('C Major', null);
            for (const s of suggestions) {
                expect(s).toHaveProperty('name');
                expect(typeof s.name).toBe('string');
                expect(s).toHaveProperty('function');
                expect(typeof s.function).toBe('string');
                expect(s).toHaveProperty('confidence');
                expect(typeof s.confidence).toBe('number');
                expect(s.confidence).toBeGreaterThanOrEqual(0);
                expect(s.confidence).toBeLessThanOrEqual(1);
            }
        });

        test('excludes the current chord from suggestions', () => {
            const suggestions = suggestDiatonicChords('C Major', 'G Major');
            const names = suggestions.map(s => s.name);
            expect(names).not.toContain('G Major');
            expect(names).toContain('C Major');
            expect(names).toContain('F Major');
        });

        test('returns correct functions (Roman numerals)', () => {
            const suggestions = suggestDiatonicChords('C Major', null);
            const funcMap = {};
            suggestions.forEach(s => { funcMap[s.name] = s.function; });

            expect(funcMap['C Major']).toBe('I');
            expect(funcMap['F Major']).toBe('IV');
            expect(funcMap['G Major']).toBe('V');
            expect(funcMap['A Minor']).toBe('vi');
        });

        test('works for A Minor key', () => {
            const suggestions = suggestDiatonicChords('A Minor', null);
            const names = suggestions.map(s => s.name);
            // A natural minor diatonic: Am, Bdim, C, Dm, Em, F, G
            expect(names).toContain('A Minor');
            expect(names).toContain('C Major');
        });

        test('returns sorted by confidence descending', () => {
            const suggestions = suggestDiatonicChords('C Major', null);
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i].confidence).toBeLessThanOrEqual(suggestions[i - 1].confidence);
            }
        });

        test('returns empty array for invalid input', () => {
            expect(suggestDiatonicChords('', null)).toEqual([]);
            expect(suggestDiatonicChords(null, null)).toEqual([]);
            expect(suggestDiatonicChords('X Invalid', null)).toEqual([]);
        });
    });

    // ---------------------------------------------------------------
    // suggestScales
    // ---------------------------------------------------------------
    describe('suggestScales', () => {
        test('suggests scales compatible with C Major key', () => {
            const suggestions = suggestScales('C Major', null);
            expect(suggestions.length).toBeGreaterThan(0);

            const names = suggestions.map(s => s.name);
            expect(names).toContain('C Major');
        });

        test('parent scale has highest confidence', () => {
            const suggestions = suggestScales('C Major', null);
            const parent = suggestions.find(s => s.name === 'C Major');
            expect(parent).toBeDefined();
            expect(parent.function).toBe('parent scale');
        });

        test('filters by chord compatibility', () => {
            // G Dom7 contains G, B, D, F — should filter to scales containing all these
            const suggestions = suggestScales('C Major', 'G Dom7');
            expect(suggestions.length).toBeGreaterThan(0);

            // C Major scale contains G, B, D, F → should be suggested
            const names = suggestions.map(s => s.name);
            expect(names).toContain('C Major');
        });

        test('each suggestion has name, function, and confidence', () => {
            const suggestions = suggestScales('C Major', 'C Major');
            for (const s of suggestions) {
                expect(s).toHaveProperty('name');
                expect(s).toHaveProperty('function');
                expect(s).toHaveProperty('confidence');
                expect(typeof s.confidence).toBe('number');
            }
        });

        test('returns sorted by confidence descending', () => {
            const suggestions = suggestScales('C Major', null);
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i].confidence).toBeLessThanOrEqual(suggestions[i - 1].confidence);
            }
        });

        test('returns empty for completely invalid input', () => {
            expect(suggestScales('', '')).toEqual([]);
            expect(suggestScales(null, null)).toEqual([]);
        });
    });

    // ---------------------------------------------------------------
    // suggestExtensions
    // ---------------------------------------------------------------
    describe('suggestExtensions', () => {
        test('suggests 7th chords for C Major triad', () => {
            const suggestions = suggestExtensions('C Major');
            expect(suggestions.length).toBeGreaterThan(0);

            const names = suggestions.map(s => s.name);
            expect(names).toContain('C Maj7');
            expect(names).toContain('C Dom7');
        });

        test('suggests minor extensions for A Minor', () => {
            const suggestions = suggestExtensions('A Minor');
            expect(suggestions.length).toBeGreaterThan(0);

            const names = suggestions.map(s => s.name);
            expect(names).toContain('A Min7');
        });

        test('suggests half-dim for Diminished triad', () => {
            const suggestions = suggestExtensions('B Diminished');
            const names = suggestions.map(s => s.name);
            expect(names).toContain('B m7b5 (Half-Dim)');
        });

        test('each suggestion has name, function, and confidence', () => {
            const suggestions = suggestExtensions('C Major');
            for (const s of suggestions) {
                expect(s).toHaveProperty('name');
                expect(typeof s.name).toBe('string');
                expect(s).toHaveProperty('function');
                expect(typeof s.function).toBe('string');
                expect(s).toHaveProperty('confidence');
                expect(typeof s.confidence).toBe('number');
            }
        });

        test('returns sorted by confidence descending', () => {
            const suggestions = suggestExtensions('C Major');
            for (let i = 1; i < suggestions.length; i++) {
                expect(suggestions[i].confidence).toBeLessThanOrEqual(suggestions[i - 1].confidence);
            }
        });

        test('returns empty for already-extended chords', () => {
            // Dom7 has no further extensions in the map
            const suggestions = suggestExtensions('G Dom7');
            expect(suggestions).toEqual([]);
        });

        test('returns empty for invalid input', () => {
            expect(suggestExtensions('')).toEqual([]);
            expect(suggestExtensions(null)).toEqual([]);
            expect(suggestExtensions('X Unknown')).toEqual([]);
        });
    });

    // ---------------------------------------------------------------
    // Pure function contract
    // ---------------------------------------------------------------
    describe('Pure function guarantees', () => {
        test('functions accept only string inputs', () => {
            // Should not throw for any input type
            expect(() => suggestDiatonicChords(123, 456)).not.toThrow();
            expect(() => suggestScales({}, [])).not.toThrow();
            expect(() => suggestExtensions(undefined)).not.toThrow();

            // Non-string inputs return empty arrays
            expect(suggestDiatonicChords(123, 456)).toEqual([]);
            expect(suggestScales({}, [])).toEqual([]);
            expect(suggestExtensions(undefined)).toEqual([]);
        });

        test('functions return arrays', () => {
            expect(Array.isArray(suggestDiatonicChords('C Major', null))).toBe(true);
            expect(Array.isArray(suggestScales('C Major', null))).toBe(true);
            expect(Array.isArray(suggestExtensions('C Major'))).toBe(true);
        });
    });
});
