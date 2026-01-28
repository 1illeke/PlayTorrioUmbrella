/**
 * Electron Integration Example for PlayTorrio Flutter Player
 * 
 * This example shows how to launch and control the Flutter player from Electron
 */

const { spawn } = require('child_process');
const path = require('path');

class PlayTorrioBridge {
  constructor(playerExecutablePath) {
    this.playerPath = playerExecutablePath;
    this.process = null;
    this.messageId = 0;
    this.pendingResponses = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Launch the Flutter player
   * @param {Object} options - Launch options
   * @param {string} options.url - Initial video URL (optional)
   * @param {number} options.width - Window width (optional, default: 1280)
   * @param {number} options.height - Window height (optional, default: 720)
   * @returns {Promise<void>}
   */
  async launch(options = {}) {
    const args = ['--ipc'];
    
    if (options.url) {
      args.push('--url', options.url);
    }
    if (options.width) {
      args.push('--width', options.width.toString());
    }
    if (options.height) {
      args.push('--height', options.height.toString());
    }

    this.process = spawn(this.playerPath, args);

    // Handle stdout (responses and events from Flutter)
    this.process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this._handleMessage(message);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        }
      }
    });

    // Handle stderr (errors and debug logs)
    this.process.stderr.on('data', (data) => {
      console.error('Player stderr:', data.toString());
    });

    // Handle process exit
    this.process.on('close', (code) => {
      console.log('Player process exited with code:', code);
      this.process = null;
    });

    // Wait for ready event
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Player launch timeout'));
      }, 10000);

      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Send a command to the Flutter player
   * @param {string} type - Command type
   * @param {Object} data - Command data
   * @returns {Promise<Object>} Response data
   */
  async sendCommand(type, data = {}) {
    if (!this.process) {
      throw new Error('Player not launched');
    }

    const id = `cmd_${this.messageId++}`;
    const command = {
      type,
      id,
      data,
    };

    return new Promise((resolve, reject) => {
      this.pendingResponses.set(id, { resolve, reject });
      
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(id);
        reject(new Error('Command timeout'));
      }, 5000);

      this.pendingResponses.get(id).timeout = timeout;

      this.process.stdin.write(JSON.stringify(command) + '\n');
    });
  }

  /**
   * Load a video URL
   * @param {string} url - Video URL
   * @param {number} startTime - Start time in milliseconds (optional)
   */
  async loadVideo(url, startTime = 0) {
    return this.sendCommand('load_video', { url, startTime });
  }

  /**
   * Play the video
   */
  async play() {
    return this.sendCommand('play');
  }

  /**
   * Pause the video
   */
  async pause() {
    return this.sendCommand('pause');
  }

  /**
   * Seek to a position
   * @param {number} position - Position in milliseconds
   */
  async seek(position) {
    return this.sendCommand('seek', { position });
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0.0 to 1.0)
   */
  async setVolume(volume) {
    return this.sendCommand('set_volume', { volume });
  }

  /**
   * Add an external subtitle
   * @param {string} name - Subtitle name (e.g., "English", "Spanish")
   * @param {string} url - Subtitle URL
   * @param {string} comment - Optional comment/description (e.g., "OpenSubtitles", "Manual Upload")
   * @returns {Promise<{success: boolean, index: number}>}
   */
  async addExternalSubtitle(name, url, comment = '') {
    const data = { name, url };
    if (comment) data.comment = comment;
    return this.sendCommand('add_external_subtitle', data);
  }

  /**
   * Select a subtitle track
   * @param {number} index - Subtitle index (-1 for off, 0+ for external/built-in)
   */
  async selectSubtitle(index) {
    return this.sendCommand('select_subtitle', { index });
  }

  /**
   * Set window size
   * @param {number} width - Window width
   * @param {number} height - Window height
   */
  async setWindowSize(width, height) {
    return this.sendCommand('set_window_size', { width, height });
  }

  /**
   * Get current player state
   * @returns {Promise<Object>} Player state
   */
  async getState() {
    return this.sendCommand('get_state');
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen() {
    return this.sendCommand('toggle_fullscreen');
  }

  /**
   * Listen to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Listen to an event once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  once(event, handler) {
    const wrappedHandler = (...args) => {
      this.off(event, wrappedHandler);
      handler(...args);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Close the player
   */
  close() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  _handleMessage(message) {
    const { type, id, event, data, code, message: errorMessage } = message;

    if (type === 'response') {
      const pending = this.pendingResponses.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(id);
        pending.resolve(data);
      }
    } else if (type === 'event') {
      this._emitEvent(event, data);
    } else if (type === 'error') {
      console.error('Player error:', code, errorMessage);
      // If there's a pending command, reject it
      if (id) {
        const pending = this.pendingResponses.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(id);
          pending.reject(new Error(`${code}: ${errorMessage}`));
        }
      }
    }
  }

  _emitEvent(event, data) {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)) {
        try {
          handler(data);
        } catch (e) {
          console.error('Event handler error:', e);
        }
      }
    }
  }
}

// Example usage
async function example() {
  // Path to the Flutter player executable
  const playerPath = path.join(__dirname, 'build', 'windows', 'x64', 'runner', 'Release', 'PlayTorrio.exe');
  
  const player = new PlayTorrioBridge(playerPath);

  try {
    // Launch player with custom size
    await player.launch({
      width: 1920,
      height: 1080,
    });
    console.log('Player launched!');

    // Listen to state changes
    player.on('state_changed', (state) => {
      console.log('Player state:', state);
    });

    // Load a video
    await player.loadVideo('https://example.com/video.mp4');
    console.log('Video loaded!');

    // Add multiple external subtitles with comments
    const sub1 = await player.addExternalSubtitle('English', 'https://example.com/en.srt', 'OpenSubtitles - Official');
    console.log('English subtitle added at index:', sub1.index);
    
    const sub2 = await player.addExternalSubtitle('Spanish', 'https://example.com/es.srt', 'Community Contributed');
    console.log('Spanish subtitle added at index:', sub2.index);
    
    const sub3 = await player.addExternalSubtitle('French', 'https://example.com/fr.srt', 'Manual Upload');
    console.log('French subtitle added at index:', sub3.index);

    // Select the Spanish subtitle (index 1)
    await player.selectSubtitle(sub2.index);
    console.log('Spanish subtitle selected!');

    // Play the video
    await player.play();
    console.log('Playing!');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Pause
    await player.pause();
    console.log('Paused!');

    // Get current state
    const state = await player.getState();
    console.log('Current state:', state);
    console.log('External subtitles:', state.externalSubtitles);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Export the class
module.exports = PlayTorrioBridge;

// Run example if executed directly
if (require.main === module) {
  example();
}
