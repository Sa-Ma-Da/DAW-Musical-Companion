/**
 * @jest-environment jsdom
 */

/**
 * BEHAVIORAL REGRESSION TESTS
 * ============================
 * End-to-end integration tests simulating general application use.
 * Tests verify the full lifecycle from launch through harmonic analysis.
 *
 * Test Cases:
 *  1. Application launch (module loading)
 *  2. MIDI device enumeration
 *  3. MIDI device selection
 *  4. Simulated NoteOn message
 *  5. Simulated NoteOff message
 *  6. Active note display update
 *  7. Chord classification update
 *  8. Key detection update
 *  9. Debug log update (event emission)
 * 10. MIDI device refresh interaction
 *
 * These tests serve as baseline behavioral regression tests for all future development.
 */

const path = require('path');
const fs = require('fs');

// Load HTML
const htmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// ---- Shared State ----
let mockInput;
let mockAccess;
let MidiManager;
let manager;
let detectChord;
let KeyDetector;
let keyDetector;
let midiToNoteName;

function setupMocks() {
    mockInput = {
        id: 'behav-input-1',
        name: 'Behavioral Test Keyboard',
        state: 'connected',
        onmidimessage: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };

    mockAccess = {
        inputs: new Map([['behav-input-1', mockInput]]),
        onstatechange: null
    };

    Object.defineProperty(global.navigator, 'requestMIDIAccess', {
        value: jest.fn().mockResolvedValue(mockAccess),
        writable: true,
        configurable: true
    });
}

// Helper: send MIDI message through the mock input
function sendMidi(status, note, velocity) {
    if (!mockInput.onmidimessage) {
        throw new Error('No MIDI message handler attached — device not selected?');
    }
    mockInput.onmidimessage({ data: [status, note, velocity] });
}
function noteOn(note, velocity = 100) { sendMidi(144, note, velocity); }
function noteOff(note) { sendMidi(128, note, 0); }

// Helper: play a chord (send multiple NoteOn)
function playChord(notes, velocity = 100) {
    notes.forEach(n => noteOn(n, velocity));
}
function releaseAll(notes) {
    notes.forEach(n => noteOff(n));
}

// ---- Test Suite ----
describe('BEHAVIORAL REGRESSION: Full Application Lifecycle', () => {

    beforeAll(() => {
        // Load modules once (they are stateless or we create new instances)
        MidiManager = require('../src/midi-manager');
        const analyzer = require('../src/harmonic-analyzer');
        detectChord = analyzer.detectChord;
        KeyDetector = require('../src/key-detector');
        const noteUtils = require('../src/note-utils');
        midiToNoteName = noteUtils.midiToNoteName;
    });

    beforeEach(() => {
        document.body.innerHTML = htmlContent;
        setupMocks();
        manager = new MidiManager();
        keyDetector = new KeyDetector();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ==================================================================
    // TEST 1: Application Launch
    // ==================================================================
    test('1. Application launch — all modules load and UI elements exist', () => {
        // Verify core modules loaded
        expect(MidiManager).toBeDefined();
        expect(detectChord).toBeDefined();
        expect(KeyDetector).toBeDefined();
        expect(midiToNoteName).toBeDefined();

        // Verify all UI elements exist
        const requiredIds = [
            'midiInputSelect', 'refreshMidiBtn', 'activeNotesDisplay',
            'chordDisplay', 'keyDisplay', 'midiLog',
            'debugSection', 'toggleDebugBtn'
        ];
        for (const id of requiredIds) {
            expect(document.getElementById(id)).not.toBeNull();
        }
    });

    // ==================================================================
    // TEST 2: MIDI Device Enumeration
    // ==================================================================
    test('2. MIDI device enumeration — devices discovered after init', async () => {
        const success = await manager.init();
        expect(success).toBe(true);

        const inputs = manager.getInputs();
        expect(inputs.length).toBe(1);
        expect(inputs[0].id).toBe('behav-input-1');
        expect(inputs[0].name).toBe('Behavioral Test Keyboard');
        expect(inputs[0].state).toBe('connected');
    });

    // ==================================================================
    // TEST 3: MIDI Device Selection
    // ==================================================================
    test('3. MIDI device selection — input is attached and ready', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        expect(manager.activeInput).toBeDefined();
        expect(manager.activeInput.id).toBe('behav-input-1');
        expect(typeof mockInput.onmidimessage).toBe('function');
    });

    // ==================================================================
    // TEST 4: Simulated NoteOn Message
    // ==================================================================
    test('4. NoteOn message — note is added to active state', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        const spy = jest.fn();
        manager.on('note-on', spy);

        noteOn(60, 100); // C4

        expect(manager.getActiveNotes()).toContain(60);
        expect(spy).toHaveBeenCalledWith(
            expect.objectContaining({ note: 60, velocity: 100 })
        );
    });

    // ==================================================================
    // TEST 5: Simulated NoteOff Message
    // ==================================================================
    test('5. NoteOff message — note is removed from active state', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        const spy = jest.fn();
        manager.on('note-off', spy);

        noteOn(60);
        expect(manager.getActiveNotes()).toContain(60);

        noteOff(60);
        expect(manager.getActiveNotes()).not.toContain(60);
        expect(spy).toHaveBeenCalledWith(
            expect.objectContaining({ note: 60 })
        );

        // Also test velocity-0 NoteOn (common MIDI convention for NoteOff)
        noteOn(64);
        expect(manager.getActiveNotes()).toContain(64);
        sendMidi(144, 64, 0); // NoteOn with velocity 0 = NoteOff
        expect(manager.getActiveNotes()).not.toContain(64);
    });

    // ==================================================================
    // TEST 6: Active Note Display Update
    // ==================================================================
    test('6. Active note display — correct note names from active state', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        // Play C4, E4, G4
        noteOn(60);
        noteOn(64);
        noteOn(67);

        const activeNotes = manager.getActiveNotes();
        const noteNames = activeNotes.map(n => midiToNoteName(n));

        expect(noteNames).toEqual(['C4', 'E4', 'G4']);

        // Simulate what renderer does: update display
        const display = document.getElementById('activeNotesDisplay');
        display.innerText = noteNames.join('  ');
        expect(display.innerText).toBe('C4  E4  G4');

        // Release E4
        noteOff(64);
        const updated = manager.getActiveNotes().map(n => midiToNoteName(n));
        display.innerText = updated.join('  ');
        expect(display.innerText).toBe('C4  G4');
    });

    // ==================================================================
    // TEST 7: Chord Classification Update
    // ==================================================================
    test('7. Chord classification — detects chords from active notes', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        const chordDisplay = document.getElementById('chordDisplay');

        // Play C Major: C4(60), E4(64), G4(67)
        playChord([60, 64, 67]);
        let chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('C Major');
        chordDisplay.innerText = chord;
        expect(chordDisplay.innerText).toBe('C Major');

        // Add B4(71) → C Maj7
        noteOn(71);
        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('C Maj7');
        chordDisplay.innerText = chord;
        expect(chordDisplay.innerText).toBe('C Maj7');

        // Release all, play A Minor: A3(57), C4(60), E4(64)
        releaseAll([60, 64, 67, 71]);
        playChord([57, 60, 64]);
        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('A Minor');
        chordDisplay.innerText = chord;
        expect(chordDisplay.innerText).toBe('A Minor');
    });

    // ==================================================================
    // TEST 8: Key Detection Update
    // ==================================================================
    test('8. Key detection — infers key from chord progression', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        const keyDisplay = document.getElementById('keyDisplay');

        // Simulate a ii-V-I in C Major
        // Dm: D3(50), F3(53), A3(57)
        playChord([50, 53, 57]);
        let chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('D Minor');
        keyDetector.addChord(chord);
        releaseAll([50, 53, 57]);

        // G: G3(55), B3(59), D4(62)
        playChord([55, 59, 62]);
        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('G Major');
        keyDetector.addChord(chord);
        releaseAll([55, 59, 62]);

        // C: C4(60), E4(64), G4(67)
        playChord([60, 64, 67]);
        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('C Major');
        keyDetector.addChord(chord);

        // Check key detection
        const keys = keyDetector.detect();
        expect(keys.length).toBeGreaterThan(0);
        expect(keys[0].root).toBe('C');
        expect(keys[0].scale).toBe('Major');

        // Simulate renderer update
        keyDisplay.innerText = `Key: ${keys[0].root} ${keys[0].scale}`;
        expect(keyDisplay.innerText).toBe('Key: C Major');

        releaseAll([60, 64, 67]);
    });

    // ==================================================================
    // TEST 9: Debug Log / Event Emission
    // ==================================================================
    test('9. Debug log — events emitted for every MIDI message', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        const events = [];
        manager.on('note-on', e => events.push(e));
        manager.on('note-off', e => events.push(e));

        // Play and release a chord
        playChord([60, 64, 67]); // 3 NoteOn
        releaseAll([60, 64, 67]); // 3 NoteOff

        expect(events).toHaveLength(6);

        // Simulate renderer log update
        const log = document.getElementById('midiLog');
        events.forEach(e => {
            const entry = document.createElement('div');
            const name = midiToNoteName(e.note);
            entry.textContent = `${e.type}: ${name} (${e.note})`;
            log.prepend(entry);
        });

        expect(log.children.length).toBe(6);
        // Most recent event should be first (prepend)
        expect(log.children[0].textContent).toContain('G4');
    });

    // ==================================================================
    // TEST 10: MIDI Device Refresh
    // ==================================================================
    test('10. Refresh — re-enumerates devices without losing state', async () => {
        await manager.init();
        manager.setInput('behav-input-1');

        // Play a note
        noteOn(60);
        expect(manager.getActiveNotes()).toEqual([60]);

        // Simulate refresh (re-init)
        const success = await manager.init();
        expect(success).toBe(true);
        expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(2);

        // After refresh, inputs should still be available
        const inputs = manager.getInputs();
        expect(inputs.length).toBe(1);
        expect(inputs[0].name).toBe('Behavioral Test Keyboard');

        // Re-select device
        manager.setInput('behav-input-1');
        expect(manager.activeInput).toBeDefined();

        // Previous active notes persist (Set is not cleared on re-init)
        // This matches real behavior: notes held during refresh stay active
        expect(manager.getActiveNotes()).toEqual([60]);
    });

    // ==================================================================
    // LIFECYCLE: Complete Session Simulation
    // ==================================================================
    test('LIFECYCLE: Launch → Enumerate → Select → Play → Analyze → Refresh → Replay', async () => {
        // ---- LAUNCH ----
        expect(document.getElementById('midiInputSelect')).not.toBeNull();

        // ---- ENUMERATE ----
        await manager.init();
        const inputs = manager.getInputs();
        expect(inputs.length).toBeGreaterThan(0);

        // Populate dropdown (simulating renderer)
        const select = document.getElementById('midiInputSelect');
        select.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.text = 'Select MIDI Device';
        defaultOpt.value = '';
        select.add(defaultOpt);
        inputs.forEach(inp => {
            const opt = document.createElement('option');
            opt.value = inp.id;
            opt.text = inp.name;
            select.add(opt);
        });
        expect(select.options.length).toBe(2);

        // ---- SELECT ----
        manager.setInput('behav-input-1');
        expect(manager.activeInput).not.toBeNull();

        // ---- PLAY: ii-V-I Progression ----
        const chordDisplay = document.getElementById('chordDisplay');
        const keyDisplay = document.getElementById('keyDisplay');
        const activeDisplay = document.getElementById('activeNotesDisplay');

        // Dm
        playChord([50, 53, 57]);
        let notes = manager.getActiveNotes();
        activeDisplay.innerText = notes.map(n => midiToNoteName(n)).join('  ');
        let chord = detectChord(notes);
        expect(chord).toBe('D Minor');
        chordDisplay.innerText = chord;
        keyDetector.addChord(chord);
        releaseAll([50, 53, 57]);

        // G
        playChord([55, 59, 62]);
        notes = manager.getActiveNotes();
        activeDisplay.innerText = notes.map(n => midiToNoteName(n)).join('  ');
        chord = detectChord(notes);
        expect(chord).toBe('G Major');
        chordDisplay.innerText = chord;
        keyDetector.addChord(chord);
        releaseAll([55, 59, 62]);

        // C
        playChord([60, 64, 67]);
        notes = manager.getActiveNotes();
        activeDisplay.innerText = notes.map(n => midiToNoteName(n)).join('  ');
        chord = detectChord(notes);
        expect(chord).toBe('C Major');
        chordDisplay.innerText = chord;
        keyDetector.addChord(chord);

        // ---- ANALYZE ----
        const keys = keyDetector.detect();
        expect(keys[0].root).toBe('C');
        expect(keys[0].scale).toBe('Major');
        keyDisplay.innerText = `Key: ${keys[0].root} ${keys[0].scale}`;

        // Verify final UI state
        expect(chordDisplay.innerText).toBe('C Major');
        expect(keyDisplay.innerText).toBe('Key: C Major');
        expect(activeDisplay.innerText).toBe('C4  E4  G4');

        releaseAll([60, 64, 67]);

        // ---- REFRESH ----
        await manager.init();
        const refreshedInputs = manager.getInputs();
        expect(refreshedInputs.length).toBe(1);

        // ---- REPLAY (post-refresh) ----
        manager.setInput('behav-input-1');
        playChord([57, 60, 64]); // A Minor
        chord = detectChord(manager.getActiveNotes());
        expect(chord).toBe('A Minor');
        keyDetector.addChord(chord);

        // Key should now shift (A minor is relative minor of C major)
        const updatedKeys = keyDetector.detect();
        expect(updatedKeys.length).toBeGreaterThan(0);
        // Still mostly C Major or shifts to A Minor — either is valid
        expect(['C', 'A']).toContain(updatedKeys[0].root);
    });
});
