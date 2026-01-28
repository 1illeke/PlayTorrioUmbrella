/**
 * Test Multiple External Subtitles with Comments
 * 
 * This test demonstrates how to add multiple external subtitles with optional comments
 * and switch between them using the PlayTorrio IPC bridge.
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the built executable
const playerPath = path.join(__dirname, 'build', 'windows', 'x64', 'runner', 'Release', 'PlayTorrio.exe');

console.log('='.repeat(60));
console.log('PlayTorrio - Multiple External Subtitles Test');
console.log('='.repeat(60));
console.log('\nThis test demonstrates:');
console.log('  • Adding multiple external subtitles');
console.log('  • Using optional comments to describe subtitle sources');
console.log('  • Switching between subtitle tracks');
console.log('  • Retrieving player state with subtitle information\n');
console.log('='.repeat(60));

// Start the player with IPC enabled
const player = spawn(playerPath, ['--ipc', '--width', '1280', '--height', '720']);

let messageId = 0;
const pendingCommands = new Map();

/**
 * Send a command to the player
 * @param {string} type - Command type
 * @param {Object} data - Command data
 * @returns {Promise<Object>} Response data
 */
function sendCommand(type, data = {}) {
  const id = `cmd_${++messageId}`;
  const command = { type, id, data };
  
  console.log(`\n→ Sending: ${type}`);
  console.log(`  Data: ${JSON.stringify(data, null, 2)}`);
  
  return new Promise((resolve, reject) => {
    pendingCommands.set(id, { resolve, reject });
    player.stdin.write(JSON.stringify(command) + '\n');
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingCommands.has(id)) {
        pendingCommands.delete(id);
        reject(new Error(`Command timeout: ${type}`));
      }
    }, 10000);
  });
}

// Listen to stdout
player.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const message = JSON.parse(line);
      
      if (message.type === 'response' && message.id) {
        const pending = pendingCommands.get(message.id);
        if (pending) {
          console.log(`← Response: ${message.id}`);
          console.log(`  Result: ${JSON.stringify(message.data, null, 2)}`);
          pending.resolve(message.data);
          pendingCommands.delete(message.id);
        }
      } else if (message.type === 'event') {
        console.log(`← Event: ${message.event}`);
        if (message.event === 'ready') {
          console.log('  Player is ready!\n');
        }
      } else if (message.type === 'error') {
        console.error(`← Error: ${message.error}`);
        console.error(`  Message: ${message.message}`);
        
        if (message.id) {
          const pending = pendingCommands.get(message.id);
          if (pending) {
            pending.reject(new Error(message.message));
            pendingCommands.delete(message.id);
          }
        }
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  });
});

// Listen to stderr
player.stderr.on('data', (data) => {
  console.error('Player stderr:', data.toString());
});

// Handle process exit
player.on('close', (code) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Player exited with code ${code}`);
  console.log('='.repeat(60));
  process.exit(code);
});

/**
 * Run the test sequence
 */
async function runTests() {
  try {
    // Wait for player to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SEQUENCE START');
    console.log('='.repeat(60));
    
    // Test 1: Load a video
    console.log('\n[Test 1] Loading video...');
    await sendCommand('load_video', {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    });
    console.log('✓ Video loaded successfully');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Test 2: Add English subtitle with comment
    console.log('\n[Test 2] Adding English subtitle with comment...');
    const sub1 = await sendCommand('add_external_subtitle', {
      name: 'English',
      url: 'https://example.com/subtitles/en.srt',
      comment: 'OpenSubtitles - Official Release'
    });
    console.log(`✓ English subtitle added at index: ${sub1.index}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Add Spanish subtitle with comment
    console.log('\n[Test 3] Adding Spanish subtitle with comment...');
    const sub2 = await sendCommand('add_external_subtitle', {
      name: 'Spanish',
      url: 'https://example.com/subtitles/es.srt',
      comment: 'Community Contributed - High Quality'
    });
    console.log(`✓ Spanish subtitle added at index: ${sub2.index}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Add French subtitle without comment
    console.log('\n[Test 4] Adding French subtitle (no comment)...');
    const sub3 = await sendCommand('add_external_subtitle', {
      name: 'French',
      url: 'https://example.com/subtitles/fr.srt'
    });
    console.log(`✓ French subtitle added at index: ${sub3.index}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: Add Japanese subtitle with comment
    console.log('\n[Test 5] Adding Japanese subtitle with comment...');
    const sub4 = await sendCommand('add_external_subtitle', {
      name: '日本語',
      url: 'https://example.com/subtitles/ja.srt',
      comment: 'Manual Upload - Fan Translation'
    });
    console.log(`✓ Japanese subtitle added at index: ${sub4.index}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Test 6: Get state to see all external subtitles
    console.log('\n[Test 6] Getting player state...');
    const state = await sendCommand('get_state');
    console.log('✓ Player state retrieved');
    console.log('\nExternal Subtitles:');
    if (state.externalSubtitles && state.externalSubtitles.length > 0) {
      state.externalSubtitles.forEach((sub, index) => {
        console.log(`  [${index}] ${sub.name}`);
        if (sub.comment) {
          console.log(`      Comment: ${sub.comment}`);
        }
        console.log(`      URL: ${sub.url}`);
      });
    } else {
      console.log('  No external subtitles found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Test 7: Select Spanish subtitle
    console.log('\n[Test 7] Selecting Spanish subtitle (index 1)...');
    await sendCommand('select_subtitle', { index: 1 });
    console.log('✓ Spanish subtitle selected');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 8: Select Japanese subtitle
    console.log('\n[Test 8] Selecting Japanese subtitle (index 3)...');
    await sendCommand('select_subtitle', { index: 3 });
    console.log('✓ Japanese subtitle selected');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 9: Turn off subtitles
    console.log('\n[Test 9] Turning off subtitles (index -1)...');
    await sendCommand('select_subtitle', { index: -1 });
    console.log('✓ Subtitles turned off');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 10: Select English subtitle
    console.log('\n[Test 10] Selecting English subtitle (index 0)...');
    await sendCommand('select_subtitle', { index: 0 });
    console.log('✓ English subtitle selected');
    
    // Test complete
    console.log('\n' + '='.repeat(60));
    console.log('TEST SEQUENCE COMPLETE');
    console.log('='.repeat(60));
    console.log('\n✓ All tests passed successfully!');
    console.log('\nSummary:');
    console.log('  • Added 4 external subtitles (3 with comments, 1 without)');
    console.log('  • Retrieved player state showing all subtitles');
    console.log('  • Successfully switched between subtitle tracks');
    console.log('  • Turned subtitles on and off');
    console.log('\nKey Features Demonstrated:');
    console.log('  • Optional comment parameter for subtitle descriptions');
    console.log('  • Comments appear in subtitle menu for easy identification');
    console.log('  • Multiple subtitle tracks can coexist');
    console.log('  • Subtitle selection by index');
    console.log('\nPlayer is still running. Press Ctrl+C to exit.');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nStack trace:', error.stack);
    player.kill();
    process.exit(1);
  }
}

// Start tests after player is ready
runTests();

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nShutting down player...');
  player.kill();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\nUncaught exception:', error);
  player.kill();
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\nUnhandled rejection:', error);
  player.kill();
  process.exit(1);
});
