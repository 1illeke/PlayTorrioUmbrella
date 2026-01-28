/**
 * Simple test for subtitle comments feature
 */

const { spawn } = require('child_process');
const path = require('path');

const playerPath = path.join(__dirname, 'build', 'windows', 'x64', 'runner', 'Release', 'PlayTorrio.exe');

console.log('Starting PlayTorrio with IPC...\n');

const player = spawn(playerPath, ['--ipc']);

let messageId = 0;

function sendCommand(type, data = {}) {
  const id = `cmd_${++messageId}`;
  const command = JSON.stringify({ type, id, data });
  console.log('→', command);
  player.stdin.write(command + '\n');
}

player.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const message = JSON.parse(line);
      console.log('←', JSON.stringify(message));
    } catch (e) {
      // Ignore non-JSON
    }
  });
});

player.stderr.on('data', (data) => {
  // Ignore stderr
});

player.on('close', (code) => {
  console.log(`\nPlayer exited: ${code}`);
  process.exit(code);
});

// Wait 2 seconds then send commands
setTimeout(() => {
  console.log('\n--- Adding subtitles with comments ---\n');
  
  // Add subtitle with comment
  sendCommand('add_external_subtitle', {
    name: 'English',
    url: 'https://example.com/en.srt',
    comment: 'OpenSubtitles - Official'
  });
  
  setTimeout(() => {
    // Add subtitle without comment
    sendCommand('add_external_subtitle', {
      name: 'Spanish',
      url: 'https://example.com/es.srt'
    });
    
    setTimeout(() => {
      // Get state
      sendCommand('get_state');
      
      setTimeout(() => {
        console.log('\n--- Test complete! Check the subtitle menu in the player. ---');
        console.log('Press Ctrl+C to exit.\n');
      }, 1000);
    }, 1000);
  }, 1000);
}, 2000);

process.on('SIGINT', () => {
  player.kill();
  process.exit(0);
});
