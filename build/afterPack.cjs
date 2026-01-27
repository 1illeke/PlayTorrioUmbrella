// afterPack.cjs - Set executable permissions for Linux builds
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = async function afterPack(context) {
  console.log('[afterPack] Running for platform:', context.electronPlatformName);
  
  try {
    if (context.electronPlatformName === 'linux') {
      const appOutDir = context.appOutDir;
      const executableName = context.packager.executableName || 'playtorrio';
      const executablePath = path.join(appOutDir, executableName);
      
      // Set executable permission on main binary
      if (fs.existsSync(executablePath)) {
        fs.chmodSync(executablePath, 0o755);
        console.log('[afterPack] ✓ Set executable permission on:', executablePath);
      } else {
        console.warn('[afterPack] ⚠ Executable not found:', executablePath);
      }
      
      // Handle chrome-sandbox: either set proper permissions or remove it
      const sandboxPath = path.join(appOutDir, 'chrome-sandbox');
      if (fs.existsSync(sandboxPath)) {
        try {
          fs.chmodSync(sandboxPath, 0o4755);
          console.log('[afterPack] ✓ Set chrome-sandbox permissions (4755)');
        } catch (err) {
          // If we can't set proper permissions, remove it since we're using --no-sandbox anyway
          fs.rmSync(sandboxPath, { force: true });
          console.log('[afterPack] ✓ Removed chrome-sandbox (sandboxing disabled in app)');
        }
      }
      
      // Set executable permission on bundled yt-dlp for Linux
      try {
        // The binary is packaged inside the resources folder under linyt
        const ytBinary = path.join(context.appOutDir, 'resources', 'linyt', 'yt-dlp_linux');
        if (fs.existsSync(ytBinary)) {
          fs.chmodSync(ytBinary, 0o755);
          console.log('[afterPack] ✓ Set executable permission on:', ytBinary);
        } else {
          console.warn('[afterPack] ⚠ yt-dlp binary not found at', ytBinary);
        }
      } catch (err) {
        console.warn('[afterPack] Failed to set permissions on yt-dlp_linux:', err.message);
      }

      console.log('[afterPack] ✓ Linux build prepared');
    } else if (context.electronPlatformName === 'darwin') {
      // Set executable permission on bundled yt-dlp for macOS
      try {
        // macOS bundles extra resources inside Contents/Resources
        const ytBinaryMac = path.join(context.appOutDir, 'PlayTorrio.app', 'Contents', 'Resources', 'macyt', 'yt-dlp_macos');
        if (fs.existsSync(ytBinaryMac)) {
          fs.chmodSync(ytBinaryMac, 0o755);
          console.log('[afterPack] ✓ Set executable permission on:', ytBinaryMac);
        } else {
          console.warn('[afterPack] ⚠ yt-dlp binary for mac not found at', ytBinaryMac);
        }
      } catch (err) {
        console.warn('[afterPack] Failed to set permissions on yt-dlp_macos:', err.message);
      }

      console.log('[afterPack] ✓ macOS build prepared');
    }
  } catch (error) {
    console.error('[afterPack] Error:', error.message);
    // Don't fail the build
  }
};