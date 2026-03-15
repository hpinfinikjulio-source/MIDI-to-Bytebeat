import { Midi } from '@tonejs/midi';

export async function parseMidi(arrayBuffer) {
    const midi = new Midi(arrayBuffer);

    let allNotes = [];
    midi.tracks.forEach(track => {
        allNotes = allNotes.concat(track.notes);
    });

    // Sort notes by their start time
    allNotes.sort((a, b) => a.ticks - b.ticks);

    if (allNotes.length === 0) {
        return { midiData: [], info: {} };
    }

    // Quantize notes to a grid
    const ppq = midi.header.ppq; // Pulses per quarter note
    const quantizationTicks = ppq / 8; // Quantize to 32nd notes

    const quantizedNotes = allNotes.map(note => ({
        pitch: note.midi,
        // The time property is not used by the generator but might be useful for other purposes.
        time: Math.round(note.ticks / quantizationTicks)
    }));
    
    const info = {
        name: midi.header.name,
        tempo: midi.header.tempos[0]?.bpm || 120,
        timeSignature: midi.header.timeSignatures[0]?.timeSignature || [4, 4],
        trackCount: midi.tracks.length,
        noteCount: allNotes.length
    };

    return { midiData: quantizedNotes, info };
}