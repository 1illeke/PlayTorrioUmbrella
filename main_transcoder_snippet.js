// Start Transcoder Server
let transcoderProc = null;
const transcoderPort = 3005;

function startTranscoder() {
    if (transcoderProc) return;
    
    console.log('[Transcoder] Starting...');
    
    const scriptPath = path.join(__dirname, 'transcoder', 'server.js');
    if (!fs.existsSync(scriptPath)) {
        console.warn('[Transcoder] Server script not found at:', scriptPath);
        return;
    }

    // Resolve ffmpeg path
    let ffmpegBin = '';
    try {
        // Try to get from ffmpeg-static package if available
        const ffmpegStatic = require('ffmpeg-static');
        ffmpegBin = ffmpegStatic;
    } catch (e) {
        console.warn('[Transcoder] ffmpeg-static require failed:', e.message);
    }

    // If not found, try common locations or let transcoder find it
    if (!ffmpegBin) {
        // ... (optional fallback logic)
    }

    const env = { 
        ...process.env, 
        PORT: String(transcoderPort),
        ELECTRON_RUN_AS_NODE: '1'
    };
    
    if (ffmpegBin) {
        env.FFMPEG_PATH = ffmpegBin;
        console.log('[Transcoder] Using custom ffmpeg:', ffmpegBin);
    }

    transcoderProc = spawn(process.execPath, [scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
        cwd: path.dirname(scriptPath)
    });

    transcoderProc.stdout.on('data', (d) => {
        // Less verbose logging
        const msg = d.toString().trim();
        if (msg.includes('Starting') || msg.includes('Error')) console.log('[Transcoder]', msg);
    });
    transcoderProc.stderr.on('data', (d) => console.error('[Transcoder]', d.toString().trim()));
    
    transcoderProc.on('exit', (code) => {
        console.log('[Transcoder] Exited with code', code);
        transcoderProc = null;
        if (!app.isQuitting) {
            setTimeout(startTranscoder, 5000);
        }
    });
}