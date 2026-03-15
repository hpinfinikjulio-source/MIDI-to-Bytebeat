import { parseMidi } from './midi-parser.js';
import { generateByteBeat } from './bytebeat-generator.js';
import { ByteBeatPlayer } from './bytebeat-player.js';
import { audioBufferToWav } from './wav-exporter.js';

const fileInput = document.getElementById('midi-file-input');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const exportBtn = document.getElementById('export-btn');
const formulaText = document.getElementById('bytebeat-formula');
const statusDisplay = document.getElementById('status');
const midiInfoDisplay = document.getElementById('midi-info-display');
const fileLabel = document.querySelector('.file-label span');

const player = new ByteBeatPlayer();
let currentFormula = null;
let currentData = null;

fileInput.addEventListener('change', handleFileSelect);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileLabel.textContent = file.name;
    statusDisplay.textContent = 'Parsing MIDI file...';
    playBtn.disabled = true;
    stopBtn.disabled = true;
    exportBtn.disabled = true;
    formulaText.value = '';
    midiInfoDisplay.textContent = '';
    player.stop();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const { midiData, info } = await parseMidi(arrayBuffer);

        if (!midiData || midiData.length === 0) {
            throw new Error('No note data found in the MIDI file.');
        }

        displayMidiInfo(info);

        statusDisplay.textContent = 'Generating ByteBeat formula...';
        const { formula, data } = generateByteBeat(midiData);
        
        currentFormula = formula;
        currentData = data;
        formulaText.value = `let d=[${data.join(',')}];\n(${formula})`;

        statusDisplay.textContent = `Conversion successful! Ready to play.`;
        playBtn.disabled = false;
        exportBtn.disabled = false;

    } catch (error) {
        console.error('Error processing MIDI file:', error);
        statusDisplay.textContent = `Error: ${error.message}`;
        fileLabel.textContent = 'Select MIDI File';
    }
}

function displayMidiInfo(info) {
    let infoStr = `Name: ${info.name || 'N/A'}\n`;
    infoStr += `Tempo: ${info.tempo} BPM\n`;
    infoStr += `Time Signature: ${info.timeSignature[0]}/${info.timeSignature[1]}\n`;
    infoStr += `Tracks: ${info.trackCount}\n`;
    infoStr += `Total Notes: ${info.noteCount}`;
    midiInfoDisplay.textContent = infoStr;
}

playBtn.addEventListener('click', () => {
    if (currentFormula && currentData) {
        player.play(currentFormula, currentData);
        playBtn.disabled = true;
        stopBtn.disabled = false;
        statusDisplay.textContent = 'Playing...';
    }
});

stopBtn.addEventListener('click', () => {
    player.stop();
    playBtn.disabled = false;
    stopBtn.disabled = true;
    statusDisplay.textContent = 'Stopped. Ready to play again.';
});

exportBtn.addEventListener('click', () => {
    if (currentFormula && currentData) {
        exportWav();
    }
});

async function exportWav() {
    statusDisplay.textContent = 'Exporting WAV file... please wait.';
    exportBtn.disabled = true;
    playBtn.disabled = true;
    stopBtn.disabled = true;

    try {
        // Use a Promise to allow UI to update before blocking.
        await new Promise(resolve => setTimeout(resolve, 10));

        const sampleRate = 8000;
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(currentData.length)));
        const shift = 10;
        const totalSamples = nextPowerOfTwo * (1 << shift);

        const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
        const buffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
        const channelData = buffer.getChannelData(0);

        const bytebeatFunc = new Function('t', 'd', `return (${currentFormula}) & 255`);

        for (let t = 0; t < totalSamples; t++) {
            const value = bytebeatFunc(t, currentData);
            channelData[t] = (value / 128.0) - 1.0;
        }

        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        source.start();

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);

        const a = document.createElement('a');
        a.href = URL.createObjectURL(wavBlob);
        a.download = 'bytebeat.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        statusDisplay.textContent = 'WAV file exported successfully!';
    } catch (error) {
        console.error('Error exporting WAV:', error);
        statusDisplay.textContent = `Error: ${error.message}`;
    } finally {
        playBtn.disabled = false;
        exportBtn.disabled = false;
        // Keep stop disabled as nothing is playing
        stopBtn.disabled = true;
    }
}