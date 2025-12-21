// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mpv', {
  // Commands
  loadFile: (url) => ipcRenderer.invoke('load-file', url),
  playPause: () => ipcRenderer.invoke('play-pause'),
  seek: (seconds) => ipcRenderer.invoke('seek', seconds),
  seekRelative: (seconds) => ipcRenderer.invoke('seek-relative', seconds),
  setVolume: (volume) => ipcRenderer.invoke('set-volume', volume),
  setSubtitle: (id) => ipcRenderer.invoke('set-subtitle', id),
  setAudio: (id) => ipcRenderer.invoke('set-audio', id),
  stop: () => ipcRenderer.invoke('stop'),
  
  // Generic command
  command: (cmd, ...args) => ipcRenderer.invoke('mpv-command', cmd, ...args),
  
  // Events
  onTimeUpdate: (callback) => {
    ipcRenderer.on('time-update', (event, time) => callback(time));
  },
  onDurationUpdate: (callback) => {
    ipcRenderer.on('duration-update', (event, duration) => callback(duration));
  },
  onPauseState: (callback) => {
    ipcRenderer.on('pause-state', (event, isPaused) => callback(isPaused));
  },
  onVolumeUpdate: (callback) => {
    ipcRenderer.on('volume-update', (event, volume) => callback(volume));
  },
  onTrackListUpdate: (callback) => {
    ipcRenderer.on('track-list-update', (event, tracks) => callback(tracks));
  },
  onWyzieSubtitles: (callback) => {
    ipcRenderer.on('wyzie-subtitles', (event, subs) => callback(subs));
  },
  onFullscreenChange: (callback) => {
    ipcRenderer.on('fullscreen-change', (event, isFullscreen) => callback(isFullscreen));
  },
  
  // Window Controls
  minimize: () => ipcRenderer.send('player-window-minimize'),
  maximize: () => ipcRenderer.send('player-window-maximize'),
  setFullscreen: (state) => ipcRenderer.send('player-window-toggle-fullscreen', state),
  toggleFullscreen: () => ipcRenderer.send('player-window-toggle-fullscreen'),
  close: () => ipcRenderer.send('player-window-close')
});