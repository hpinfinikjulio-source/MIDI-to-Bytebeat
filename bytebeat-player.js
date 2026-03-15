export class ByteBeatPlayer {
    constructor(sampleRate = 8000) {
        this.audioCtx = null;
        this.scriptNode = null;
        this.t = 0;
        this.bytebeatFunc = null;
        this.data = null;
        this.sampleRate = sampleRate;
        this.isPlaying = false;
    }

    _initAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
        }
    }

    play(formula, data) {
        if (this.isPlaying) this.stop();

        this._initAudioContext();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // Buffer size influences latency.
        const bufferSize = 2048;
        this.scriptNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

        this.t = 0;
        this.data = data;

        try {
            // Unsafe, but standard for bytebeat. 'd' is the data array, 't' is time.
            this.bytebeatFunc = new Function('t', 'd', `return (${formula}) & 255`);
        } catch (e) {
            console.error("Error creating bytebeat function:", e);
            alert("Invalid formula.");
            return;
        }

        this.scriptNode.onaudioprocess = (audioProcessingEvent) => {
            const outputBuffer = audioProcessingEvent.outputBuffer.getChannelData(0);
            for (let i = 0; i < outputBuffer.length; i++) {
                try {
                    const value = this.bytebeatFunc(this.t++, this.data);
                    // Convert 8-bit unsigned (0-255) to float (-1.0 to 1.0)
                    outputBuffer[i] = (value / 128.0) - 1.0;
                } catch (e) {
                    // Stop on error to prevent flooding the console
                    outputBuffer[i] = 0;
                    if(this.isPlaying) this.stop();
                    console.error("Error during bytebeat execution:", e);
                }
            }
        };

        this.scriptNode.connect(this.audioCtx.destination);
        this.isPlaying = true;
    }

    stop() {
        if (this.scriptNode) {
            this.scriptNode.disconnect();
            this.scriptNode = null;
        }
        this.isPlaying = false;
    }
}