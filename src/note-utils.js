/**
 * Converts a MIDI note number (0-127) to a scientific pitch notation string (e.g., "C4").
 * Middle C (MIDI 60) is C4.
 * @param {number} midiNumber - The MIDI note number.
 * @returns {string} The note name in scientific pitch notation.
 */
function midiToNoteName(midiNumber) {
    if (midiNumber < 0 || midiNumber > 127) return "Invalid";

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midiNumber / 12) - 1; // MIDI 0 is C-1
    const noteIndex = midiNumber % 12;

    return `${noteNames[noteIndex]}${octave}`;
}

module.exports = { midiToNoteName };
