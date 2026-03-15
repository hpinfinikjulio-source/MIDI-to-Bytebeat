// Converts an array of MIDI notes into a ByteBeat formula and data array.
function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export function generateByteBeat(midiData) {
    if (!midiData || midiData.length === 0) {
        return { formula: '0', data: [] };
    }

    // Convert MIDI pitch to frequency.
    const freqData = midiData.map(note => Math.round(midiToFreq(note.pitch)));

    // The data array will contain frequencies.
    const data = freqData;

    // The formula will determine how to step through the data array over time.
    // A simple formula is `data[t >> shift & mask]`.
    // 'shift' controls the speed. A higher value means slower playback.
    // 'mask' controls how much of the data array is used (mask = data.length - 1).

    // Let's determine a good shift value. A shift of 10 is reasonable for 8000Hz.
    const shift = 10;

    // The mask should be a power of 2 minus 1 to loop correctly.
    // Find the next power of two for the data length.
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(data.length)));
    const mask = nextPowerOfTwo - 1;

    // Pad the data array to the next power of two so the masking works cleanly
    while(data.length < nextPowerOfTwo) {
        data.push(0); // Pad with silence
    }

    // This formula generates a sawtooth wave.
    // `d[(t >> shift) & mask]` gets the frequency for the current time step.
    // `t * freq` creates the wave.
    // It's divided by 31.25 (which is 8000 / 256) to scale it correctly for an 8-bit, 8000Hz signal.
    const formula = `t * d[(t >> ${shift}) & ${mask}] / 31.25`;

    return { formula, data };
}