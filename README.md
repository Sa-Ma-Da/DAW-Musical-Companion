# Ableton Harmonic Companion

An Electron desktop app that captures live MIDI input and detects chords in real time — built for music production workflows.

## Features

- Web MIDI device enumeration and hot-swap detection
- Real-time MIDI note tracking with active note display
- MIDI message parsing (note on/off, velocity, channel)
- Timestamped event activity log (last 20 messages)
- Device selector dropdown with manual refresh
- Debug panel with one-click DevTools toggle
- Dark theme UI designed for music production environments

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.x
- npm (included with Node.js)
- A MIDI controller or virtual MIDI device (e.g., [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) on Windows, IAC Driver on macOS)

No physical MIDI hardware is required — a virtual MIDI port works for testing.

## Getting Started

```bash
git clone https://github.com/Sa-Ma-Da/ableton-harmonic-companion.git
cd ableton-harmonic-companion
npm install
npm start
```

The app opens an 800x500 window. Select a MIDI input device from the dropdown and play notes to see them tracked in real time.

## Project Structure

```
ableton-harmonic-companion/
  index.html                # Single-page UI (dark theme, device selector, note display, log)
  package.json              # Electron 40.x, CommonJS, ISC license
  src/
    main.js                 # Electron main process: window creation, MIDI permissions, IPC
    renderer.js             # UI logic: device list, note display, activity log
    midi-manager.js         # MidiManager class: MIDI access, input selection, message parsing
    note-utils.js           # midiToNoteName() — MIDI number to scientific pitch notation
  test-midi-detection.js    # Standalone MIDI device detection validation
  test.html                 # HTML shell for the detection test
```

## How It Works

**Main process** — `src/main.js` creates the BrowserWindow and enables Web MIDI via Chromium command-line switches (`--enable-features=WebMidi`). MIDI and SysEx permissions are auto-granted so the user is never prompted. An IPC channel handles DevTools toggling.

**MIDI pipeline** — `src/midi-manager.js` defines a `MidiManager` class extending Node's `EventEmitter`. It wraps the Web MIDI API to enumerate inputs, listen on a selected device, and parse raw MIDI status bytes (`command = status & 0xF0`, `channel = status & 0x0F`). It emits `note-on`, `note-off`, and `state-change` events. Active notes are tracked in a `Set` and returned sorted via `getActiveNotes()`.

**Renderer / UI** — `src/renderer.js` instantiates `MidiManager`, wires its events to DOM updates, and manages the device selector dropdown, active notes display (with cyan glow when notes are held), and a capped 20-entry activity log. The renderer runs with `nodeIntegration: true` and `contextIsolation: false` — this is a development convenience, not a production security posture.

## Status

### Phase 1: MIDI Ingestion *(in progress)*

- [x] Device enumeration and selection
- [x] Real-time note tracking and display
- [x] MIDI message parsing (note on/off, velocity, channel)
- [x] Activity logging with timestamps
- [ ] Chord detection

### Phase 2 *(planned)*

- Harmonic analysis and scale suggestion
- Ableton integration

No test suite, linter, or build tooling is configured yet. `test-midi-detection.js` is a manual validation script, not an automated test.

## License

[ISC](https://opensource.org/licenses/ISC)
