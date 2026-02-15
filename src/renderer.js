console.log("Renderer script started loading...");
const path = require('path');
const MidiManager = require(path.join(__dirname, 'src', 'midi-manager.js'));
const { midiToNoteName } = require(path.join(__dirname, 'src', 'note-utils.js'));

const midiManager = new MidiManager();

const ui = {
    select: document.getElementById('midiInputSelect'),
    refreshBtn: document.getElementById('refreshMidiBtn'),
    activeNotes: document.getElementById('activeNotesDisplay'),
    log: document.getElementById('midiLog')
};

// Initialize MIDI
async function init() {
    await initializeMidi();
}

async function initializeMidi() {
    const success = await midiManager.init();
    if (success) {
        updateDeviceList();

        // Listen for new devices connecting/disconnecting
        // (Ensure we don't duplicate listeners if re-initializing)
        midiManager.removeAllListeners('state-change');
        midiManager.removeAllListeners('note-on');
        midiManager.removeAllListeners('note-off');

        midiManager.on('state-change', (e) => {
            logMessage(`State Change: ${e.port.name} (${e.port.state})`);
            updateDeviceList();
        });

        // Listen for Note Events
        midiManager.on('note-on', handleNoteOn);
        midiManager.on('note-off', handleNoteOff);
    } else {
        const option = document.createElement('option');
        option.text = "MIDI Access Failed";
        ui.select.add(option);
        ui.select.disabled = true;
    }
}

ui.refreshBtn.addEventListener('click', () => {
    logMessage('Refreshing MIDI devices...');
    initializeMidi();
});

function updateDeviceList() {
    const inputs = midiManager.getInputs();
    const currentSelection = ui.select.value;

    // Save current selection if valid, or try to keep it
    // Clear list
    ui.select.innerHTML = '';

    if (inputs.length === 0) {
        const option = document.createElement('option');
        option.text = "No MIDI Devices Found";
        ui.select.add(option);
        // Don't disable, creating a virtual port might make it appear
        return;
    }

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

    // Re-select if the previously selected device is still available
    if (currentSelection && inputs.find(i => i.id === currentSelection)) {
        ui.select.value = currentSelection;
    }

    // Update Debug List
    const debugContainer = document.getElementById('debugDeviceList');
    if (debugContainer) {
        if (inputs.length === 0) {
            debugContainer.textContent = "MidiManager reports 0 inputs.";
        } else {
            debugContainer.textContent = inputs.map(i => `[${i.id}] ${i.name} (${i.state})`).join('\n');
        }
    }
}

// Handle Device Selection
ui.select.addEventListener('change', (e) => {
    if (e.target.value) {
        midiManager.setInput(e.target.value);
        logMessage(`Selected input: ${midiManager.activeInput.name}`);
        ui.activeNotes.innerText = "-"; // Reset display on change
    }
});

function handleNoteOn({ note, velocity, channel }) {
    updateActiveNotesDisplay();
    // Optional visual flair: could add a class to container
    logMessage(`Note On:  ${midiToNoteName(note).padEnd(3)} (${note}) Vel:${velocity}`);
}

function handleNoteOff({ note, velocity, channel }) {
    updateActiveNotesDisplay();
    logMessage(`Note Off: ${midiToNoteName(note).padEnd(3)} (${note})`);
}

function updateActiveNotesDisplay() {
    const activeNotes = midiManager.getActiveNotes();

    if (activeNotes.length === 0) {
        ui.activeNotes.innerText = "-";
        ui.activeNotes.style.color = "#555";
        ui.activeNotes.style.textShadow = "none";
    } else {
        const noteNames = activeNotes.map(n => midiToNoteName(n)).join("  ");
        ui.activeNotes.innerText = noteNames;
        ui.activeNotes.style.color = "#4db8ff";
        ui.activeNotes.style.textShadow = "0 0 10px rgba(77, 184, 255, 0.5)";
    }
}

function logMessage(msg) {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    entry.style.borderBottom = '1px solid #333';
    entry.style.padding = '2px 0';

    ui.log.prepend(entry);

    // Keep active log size manageable
    while (ui.log.children.length > 20) {
        ui.log.removeChild(ui.log.lastChild);
    }
}

init();
