console.log("Renderer script started loading...");
const path = require('path');

// In Electron <script> tags, __dirname resolves to the HTML file's directory (project root),
// NOT the script file's directory (src/). Detect and adjust.
const srcDir = __dirname.endsWith('src') ? __dirname : path.join(__dirname, 'src');

const MidiManager = require(path.join(srcDir, 'midi-manager.js'));
const { detectChord } = require(path.join(srcDir, 'harmonic-analyzer.js'));
const { midiToNoteName } = require(path.join(srcDir, 'note-utils.js'));
const KeyDetector = require(path.join(srcDir, 'key-detector.js'));

console.log('[Renderer] All modules loaded.');

// ---- All DOM access and init wrapped in DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Renderer] DOM ready, initializing...');

    const ui = {
        select: document.getElementById('midiInputSelect'),
        refreshBtn: document.getElementById('refreshMidiBtn'),
        activeNotes: document.getElementById('activeNotesDisplay'),
        chordDisplay: document.getElementById('chordDisplay'),
        keyDisplay: document.getElementById('keyDisplay'),
        log: document.getElementById('midiLog'),
        debugSection: document.getElementById('debugSection'),
        toggleDebugBtn: document.getElementById('toggleDebugBtn')
    };

    const midiManager = new MidiManager();
    const keyDetector = new KeyDetector();

    // ---- Logging ----
    function logMessage(msg) {
        if (!ui.log) return;
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        entry.style.borderBottom = '1px solid #333';
        entry.style.padding = '2px 0';
        ui.log.prepend(entry);
        while (ui.log.children.length > 20) {
            ui.log.removeChild(ui.log.lastChild);
        }
    }

    // ---- MIDI Init ----
    async function initializeMidi() {
        logMessage('Requesting MIDI access...');
        const success = await midiManager.init();
        if (success) {
            logMessage('MIDI access granted. Scanning devices...');
            updateDeviceList();

            midiManager.removeAllListeners('state-change');
            midiManager.removeAllListeners('note-on');
            midiManager.removeAllListeners('note-off');

            midiManager.on('state-change', (e) => {
                logMessage(`State Change: ${e.port.name} (${e.port.state})`);
                updateDeviceList();
            });

            midiManager.on('note-on', handleNoteEvent);
            midiManager.on('note-off', handleNoteEvent);
            logMessage('MIDI listeners attached.');
        } else {
            logMessage('ERROR: MIDI access failed!');
            const option = document.createElement('option');
            option.text = "MIDI Access Failed";
            ui.select.add(option);
            ui.select.disabled = true;
        }
    }

    // ---- Device List ----
    function updateDeviceList() {
        const inputs = midiManager.getInputs();
        const currentSelection = ui.select.value;
        ui.select.innerHTML = '';

        if (inputs.length === 0) {
            const option = document.createElement('option');
            option.text = "No MIDI Devices Found";
            ui.select.add(option);
            logMessage('No MIDI devices detected. Connect a device and click Refresh.');
            return;
        }

        logMessage(`Found ${inputs.length} MIDI device(s).`);

        const defaultOption = document.createElement('option');
        defaultOption.text = "Select MIDI Device";
        defaultOption.value = "";
        ui.select.add(defaultOption);

        inputs.forEach(input => {
            const option = document.createElement('option');
            option.value = input.id;
            option.text = input.name;
            ui.select.add(option);
        });

        if (currentSelection && inputs.find(i => i.id === currentSelection)) {
            ui.select.value = currentSelection;
        }

        const debugContainer = document.getElementById('debugDeviceList');
        if (debugContainer) {
            debugContainer.textContent = inputs.map(i => `[${i.id}] ${i.name} (${i.state})`).join('\n');
        }
    }

    // ---- Device Selection ----
    ui.select.addEventListener('change', (e) => {
        if (e.target.value) {
            midiManager.setInput(e.target.value);
            logMessage(`Selected input: ${midiManager.activeInput.name}`);
            updateAnalysis();
        }
    });

    // ---- Refresh Button ----
    ui.refreshBtn.addEventListener('click', () => {
        logMessage('Refreshing MIDI devices...');
        initializeMidi();
    });

    // ---- Debug Toggle ----
    ui.toggleDebugBtn.addEventListener('click', () => {
        const isHidden = ui.debugSection.style.display === 'none';
        ui.debugSection.style.display = isHidden ? 'block' : 'none';
        ui.toggleDebugBtn.textContent = isHidden ? 'Hide Debug' : 'Show Debug';
    });

    // ---- Note Events ----
    function handleNoteEvent({ note, velocity, channel, type }) {
        console.log(`[Renderer] MIDI Event: ${type} Note: ${note}`);
        updateAnalysis();
        const name = midiToNoteName(note);
        const velStr = velocity > 0 ? ` Vel:${velocity}` : '';
        logMessage(`${type === 'note-on' ? 'Note On' : 'Note Off'}: ${name} (${note})${velStr}`);
    }

    // ---- Analysis (Debounced) ----
    let analysisTimeout = null;
    const ANALYSIS_DEBOUNCE_MS = 150;

    function updateAnalysis() {
        if (analysisTimeout) clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => {
            performAnalysis();
        }, ANALYSIS_DEBOUNCE_MS);
    }

    function performAnalysis() {
        const activeNotes = midiManager.getActiveNotes();

        if (activeNotes.length === 0) {
            ui.activeNotes.innerText = "-";
            ui.activeNotes.style.color = "#555";
            ui.chordDisplay.innerText = "-";
            ui.chordDisplay.style.color = "#555";
            ui.chordDisplay.style.textShadow = "none";
        } else {
            const noteNames = activeNotes.map(n => midiToNoteName(n)).join("  ");
            ui.activeNotes.innerText = noteNames;
            ui.activeNotes.style.color = "#4db8ff";
        }

        const chordName = detectChord(activeNotes);

        if (chordName) {
            keyDetector.addChord(chordName);
            const keys = keyDetector.detect();
            if (keys.length > 0) {
                const bestKey = keys[0];
                ui.keyDisplay.innerText = `Key: ${bestKey.root} ${bestKey.scale}`;
                ui.keyDisplay.style.color = "#aaa";
            }
            ui.chordDisplay.innerText = chordName;
            ui.chordDisplay.style.color = "#ffcc00";
            ui.chordDisplay.style.textShadow = "0 0 15px rgba(255, 204, 0, 0.5)";
        } else if (activeNotes.length > 0) {
            ui.chordDisplay.innerText = "?";
            ui.chordDisplay.style.color = "#888";
            ui.chordDisplay.style.textShadow = "none";
        }
    }

    // ---- Start ----
    logMessage('App initializing...');
    await initializeMidi();
    logMessage('Init complete.');
});
