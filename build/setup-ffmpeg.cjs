const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const platform = process.argv[2]; // win, mac, linux
if (!platform) {
    console.error('Usage: node setup-ffmpeg.cjs <win|mac|linux>');
    process.exit(1);
}

const ffmpegRoot = path.join(__dirname, '..', 'ffmpeg');
const zipName = `ffmpeg${platform}.zip`;
const zipPath = path.join(ffmpegRoot, zipName);
const targetFolder = path.join(ffmpegRoot, `ffmpeg${platform}`);

async function setup() {
    console.log(`[FFmpeg Setup] Processing ${platform}...`);

    if (!fs.existsSync(zipPath)) {
        console.warn(`[FFmpeg Setup] Archive ${zipName} not found in ${ffmpegRoot}. Skipping extraction.`);
        verify();
        return;
    }

    // Ensure target folder exists and is empty
    if (fs.existsSync(targetFolder)) {
        fs.rmSync(targetFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(targetFolder, { recursive: true });

    console.log(`[FFmpeg Setup] Extracting ${zipName}...`);
    try {
        if (process.platform === 'win32') {
            // Use PowerShell for extraction on Windows
            execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetFolder}' -Force"`);
        } else {
            // Use unzip on Unix
            execSync(`unzip -o "${zipPath}" -d "${targetFolder}"`);
        }
    } catch (err) {
        console.error(`[FFmpeg Setup] Extraction failed: ${err.message}`);
        process.exit(1);
    }

    // Flatten logic: Check if files are nested inside another folder of the same name
    // e.g., ffmpeg/ffmpegwin/ffmpegwin/ffmpeg.exe -> ffmpeg/ffmpegwin/ffmpeg.exe
    let currentDir = targetFolder;
    const contents = fs.readdirSync(currentDir);
    
    if (contents.length === 1 && fs.statSync(path.join(currentDir, contents[0])).isDirectory()) {
        const nestedDir = path.join(currentDir, contents[0]);
        console.log(`[FFmpeg Setup] Detected nested directory ${contents[0]}, flattening...`);
        
        const nestedContents = fs.readdirSync(nestedDir);
        nestedContents.forEach(file => {
            fs.renameSync(path.join(nestedDir, file), path.join(currentDir, file));
        });
        fs.rmdirSync(nestedDir);
    }

    // Remove the zip file
    console.log(`[FFmpeg Setup] Removing ${zipName}...`);
    fs.unlinkSync(zipPath);

    verify();
}

function verify() {
    const exeExt = platform === 'win' ? '.exe' : '';
    const ffmpegPath = path.join(targetFolder, `ffmpeg${exeExt}`);
    const ffprobePath = path.join(targetFolder, `ffprobe${exeExt}`);

    console.log(`[FFmpeg Setup] Verifying binaries in ${targetFolder}...`);
    
    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);

    if (ffmpegExists && ffprobeExists) {
        console.log(`[FFmpeg Setup] ✅ SUCCESS: ffmpeg and ffprobe found.`);
        console.log(`[FFmpeg Setup] These will work in the build version.`);
        
        // Ensure permissions on Unix
        if (process.platform !== 'win32') {
            try {
                fs.chmodSync(ffmpegPath, 0o755);
                fs.chmodSync(ffprobePath, 0o755);
            } catch (e) {}
        }
    } else {
        console.error(`[FFmpeg Setup] ❌ ERROR: Binaries missing!`);
        if (!ffmpegExists) console.error(`  - Missing: ${ffmpegPath}`);
        if (!ffprobeExists) console.error(`  - Missing: ${ffprobePath}`);
        process.exit(1);
    }
}

setup().catch(err => {
    console.error(err);
    process.exit(1);
});
