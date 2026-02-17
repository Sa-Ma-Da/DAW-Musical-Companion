/**
 * @jest-environment jsdom
 */

/**
 * PERSISTENT FUNCTIONAL CONTRACT
 * ===============================
 * This test suite defines the 9 core capabilities that MUST ALWAYS PASS.
 * Any code change that causes a regression in this suite blocks the build.
 *
 * Contract Items:
 * 1. Renderer process loads without error
 * 2. UI event listeners attach
 * 3. MIDI input device list populates
 * 4. MIDI device can be selected from dropdown
 * 5. Note On/Off events update active note display
 * 6. Active chord display updates from note state
 * 7. Key detection display updates from chord history
 * 8. Debug log reflects MIDI events
 * 9. Refresh MIDI devices button functions
 */

const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------

let mockInput;
let mockAccess;

function createMocks() {
    mockInput = {
        id: 'contract-input-1',
        name: 'Contract Test MIDI Device',
        state: 'connected',
        onmidimessage: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    mockAccess = {
        inputs: new Map([['contract-input-1', mockInput]]),
        onstatechange: null
    };
}

// Load HTML template once
const htmlPath = path.resolve(__dirname, '../index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// ---------------------------------------------------------------------------
// Contract Suite
// ---------------------------------------------------------------------------
describe('FUNCTIONAL CONTRACT: Core Capabilities', () => {

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = htmlContent;

        // Reset MIDI mocks
        createMocks();

        // Mock navigator.requestMIDIAccess (JSDOM doesn't have it)
        Object.defineProperty(global.navigator, 'requestMIDIAccess', {
            value: jest.fn().mockResolvedValue(mockAccess),
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // CONTRACT 1: Renderer loads without error
    // -----------------------------------------------------------------------
    test('CONTRACT-1: Renderer modules load without error', () => {
        // These are the core modules that renderer.js imports
        expect(() => require('../src/midi-manager')).not.toThrow();
        expect(() => require('../src/harmonic-analyzer')).not.toThrow();
        expect(() => require('../src/note-utils')).not.toThrow();
        expect(() => require('../src/key-detector')).not.toThrow();
        expect(() => require('../src/chord-dictionary')).not.toThrow();
        expect(() => require('../src/scale-dictionary')).not.toThrow();
    });

    // -----------------------------------------------------------------------
    // CONTRACT 2: UI elements exist for listener attachment
    // -----------------------------------------------------------------------
    test('CONTRACT-2: All required UI elements exist in index.html', () => {
        expect(document.getElementById('midiInputSelect')).not.toBeNull();
        expect(document.getElementById('refreshMidiBtn')).not.toBeNull();
        expect(document.getElementById('activeNotesDisplay')).not.toBeNull();
        expect(document.getElementById('chordDisplay')).not.toBeNull();
        expect(document.getElementById('keyDisplay')).not.toBeNull();
        expect(document.getElementById('midiLog')).not.toBeNull();
        expect(document.getElementById('debugSection')).not.toBeNull();
        expect(document.getElementById('toggleDebugBtn')).not.toBeNull();
    });

    // -----------------------------------------------------------------------
    // CONTRACT 3: MIDI input list populates
    // -----------------------------------------------------------------------
    test('CONTRACT-3: MIDI input device list populates after init', async () => {
        const MidiManager = require('../src/midi-manager');
        const manager = new MidiManager();
        const success = await manager.init();
        expect(success).toBe(true);

        const inputs = manager.getInputs();
        expect(inputs.length).toBeGreaterThan(0);
        expect(inputs[0].name).toBe('Contract Test MIDI Device');

        // Simulate what renderer does: populate the select
        const select = document.getElementById('midiInputSelect');
        select.innerHTML = '';
        inputs.forEach(input => {
            const option = document.createElement('option');
            option.value = input.id;
            option.text = input.name;
            select.add(option);
        });

        expect(select.options.length).toBe(1);
        expect(select.options[0].text).toBe('Contract Test MIDI Device');
    });

    // -----------------------------------------------------------------------
    // CONTRACT 4: MIDI device selection
    // -----------------------------------------------------------------------
    test('CONTRACT-4: MIDI device can be selected and input set', async () => {
        const MidiManager = require('../src/midi-manager');
        const manager = new MidiManager();
        await manager.init();

        manager.setInput('contract-input-1');
        expect(manager.activeInput).not.toBeNull();
        expect(manager.activeInput.name).toBe('Contract Test MIDI Device');
        expect(manager.activeInput.onmidimessage).not.toBeNull();
    });

    // -----------------------------------------------------------------------
    // CONTRACT 5: Note On/Off events update state
    // -----------------------------------------------------------------------
    test('CONTRACT-5: Note On/Off events update active note state', async () => {
        const MidiManager = require('../src/midi-manager');
        const manager = new MidiManager();
        await manager.init();
        manager.setInput('contract-input-1');

        const noteOnSpy = jest.fn();
        const noteOffSpy = jest.fn();
        manager.on('note-on', noteOnSpy);
        manager.on('note-off', noteOffSpy);

        // Note On: C4 (60)
        mockInput.onmidimessage({ data: [144, 60, 100] });
        expect(manager.getActiveNotes()).toEqual([60]);
        expect(noteOnSpy).toHaveBeenCalledWith(expect.objectContaining({ note: 60 }));

        // Note On: E4 (64)
        mockInput.onmidimessage({ data: [144, 64, 100] });
        expect(manager.getActiveNotes()).toEqual([60, 64]);

        // Note Off: C4 (60)
        mockInput.onmidimessage({ data: [128, 60, 0] });
        expect(manager.getActiveNotes()).toEqual([64]);
        expect(noteOffSpy).toHaveBeenCalledWith(expect.objectContaining({ note: 60 }));

        // Note On with velocity 0 (alt Note Off): E4 (64)
        mockInput.onmidimessage({ data: [144, 64, 0] });
        expect(manager.getActiveNotes()).toEqual([]);
    });

    // -----------------------------------------------------------------------
    // CONTRACT 6: Chord display updates
    // -----------------------------------------------------------------------
    test('CONTRACT-6: Chord detection works for standard triads and 7ths', () => {
        const { detectChord } = require('../src/harmonic-analyzer');

        // C Major Triad (C4, E4, G4)
        expect(detectChord([60, 64, 67])).toBe('C Major');

        // A Minor Triad (A3, C4, E4)
        expect(detectChord([57, 60, 64])).toBe('A Minor');

        // G Dom7 (G3, B3, D4, F4)
        expect(detectChord([55, 59, 62, 65])).toBe('G Dom7');

        // No chord for < 3 notes
        expect(detectChord([60])).toBeNull();
        expect(detectChord([])).toBeNull();
    });

    // -----------------------------------------------------------------------
    // CONTRACT 7: Key detection updates
    // -----------------------------------------------------------------------
    test('CONTRACT-7: Key detection infers key from chord history', () => {
        const KeyDetector = require('../src/key-detector');
        const detector = new KeyDetector();

        // Feed a ii-V-I in C Major: Dm -> G -> C
        detector.addChord('D Minor');
        detector.addChord('G Major');
        detector.addChord('C Major');

        const keys = detector.detect();
        expect(keys.length).toBeGreaterThan(0);
        expect(keys[0].root).toBe('C');
        expect(keys[0].scale).toBe('Major');
    });

    // -----------------------------------------------------------------------
    // CONTRACT 8: Debug log receives messages (MidiManager emits events)
    // -----------------------------------------------------------------------
    test('CONTRACT-8: MidiManager emits events for MIDI messages', async () => {
        const MidiManager = require('../src/midi-manager');
        const manager = new MidiManager();
        await manager.init();
        manager.setInput('contract-input-1');

        const events = [];
        manager.on('note-on', (e) => events.push({ type: 'note-on', ...e }));
        manager.on('note-off', (e) => events.push({ type: 'note-off', ...e }));

        // Play C Major chord
        mockInput.onmidimessage({ data: [144, 60, 100] }); // C4
        mockInput.onmidimessage({ data: [144, 64, 80] });  // E4
        mockInput.onmidimessage({ data: [144, 67, 90] });  // G4

        expect(events).toHaveLength(3);
        expect(events[0]).toMatchObject({ type: 'note-on', note: 60, velocity: 100 });
        expect(events[1]).toMatchObject({ type: 'note-on', note: 64, velocity: 80 });
        expect(events[2]).toMatchObject({ type: 'note-on', note: 67, velocity: 90 });

        // Release all
        mockInput.onmidimessage({ data: [128, 60, 0] });
        mockInput.onmidimessage({ data: [128, 64, 0] });
        mockInput.onmidimessage({ data: [128, 67, 0] });

        expect(events).toHaveLength(6);
        expect(manager.getActiveNotes()).toEqual([]);
    });

    // -----------------------------------------------------------------------
    // CONTRACT 9: Refresh re-invokes MIDI init
    // -----------------------------------------------------------------------
    test('CONTRACT-9: MidiManager can re-initialize (refresh behavior)', async () => {
        const MidiManager = require('../src/midi-manager');
        const manager = new MidiManager();

        // First init
        const success1 = await manager.init();
        expect(success1).toBe(true);
        expect(manager.getInputs().length).toBe(1);

        // Simulate refresh: re-init
        const success2 = await manager.init();
        expect(success2).toBe(true);
        expect(manager.getInputs().length).toBe(1);

        // Verify requestMIDIAccess was called twice
        expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(2);
    });

    // -----------------------------------------------------------------------
    // PIPELINE: Full analysis loop (integration)
    // -----------------------------------------------------------------------
    test('PIPELINE: MIDI → Notes → Chord → Key (full loop)', async () => {
        const MidiManager = require('../src/midi-manager');
        const { detectChord } = require('../src/harmonic-analyzer');
        const KeyDetector = require('../src/key-detector');

        const manager = new MidiManager();
        await manager.init();
        manager.setInput('contract-input-1');
        const keyDetector = new KeyDetector();

        // Play Dm chord: D3(50), F3(53), A3(57)
        mockInput.onmidimessage({ data: [144, 50, 100] });
        mockInput.onmidimessage({ data: [144, 53, 100] });
        mockInput.onmidimessage({ data: [144, 57, 100] });

        let chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('D Minor');
        keyDetector.addChord(chord);

        // Release all
        mockInput.onmidimessage({ data: [128, 50, 0] });
        mockInput.onmidimessage({ data: [128, 53, 0] });
        mockInput.onmidimessage({ data: [128, 57, 0] });

        // Play G chord: G3(55), B3(59), D4(62)
        mockInput.onmidimessage({ data: [144, 55, 100] });
        mockInput.onmidimessage({ data: [144, 59, 100] });
        mockInput.onmidimessage({ data: [144, 62, 100] });

        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('G Major');
        keyDetector.addChord(chord);

        // Release all
        mockInput.onmidimessage({ data: [128, 55, 0] });
        mockInput.onmidimessage({ data: [128, 59, 0] });
        mockInput.onmidimessage({ data: [128, 62, 0] });

        // Play C chord: C4(60), E4(64), G4(67)
        mockInput.onmidimessage({ data: [144, 60, 100] });
        mockInput.onmidimessage({ data: [144, 64, 100] });
        mockInput.onmidimessage({ data: [144, 67, 100] });

        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('C Major');
        keyDetector.addChord(chord);

        // Verify key detection
        const keys = keyDetector.detect();
        expect(keys[0].root).toBe('C');
        expect(keys[0].scale).toBe('Major');
    });
});
