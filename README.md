# PlayTorrio - All-in-One Media Center

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-2.5.9-green)

**PlayTorrio** is a powerful, cross-platform media center that streams movies, TV shows, anime, books, music, and games. Built with Electron, it combines multiple torrent engines, advanced transcoding, and a beautiful UI into one seamless application.

## 🚀 Core Features

### 🎬 Advanced Torrent Streaming
- **Multiple Torrent Engines** - Choose between Stremio, WebTorrent, TorrentStream, or Hybrid mode
- **Swarm Technology** - Run up to 3 engine instances simultaneously for faster downloads and better swarm participation
- **Instant Streaming** - Start watching before the entire file downloads
- **Smart Transcoding** - Hardware-accelerated encoding with automatic quality adjustment
- **Predictive Pre-warming** - Cache first segments for instant playback

### 📺 Content Discovery & Playback
- **Movies & TV Shows** - Browse catalogs with TMDB/TVDB metadata, supports stremio addons
- **Anime** - Dedicated anime section with subtitle support
- **Debrid Services** - TorBox, Real-Debrid, AllDebrid, and more for premium streaming
- **Jackett Integration** - Search across hundreds of torrent sites
- **Prowlarr Integration** - Search across 600+ Torrent indexers
- **Jellyfin Integration** - Connect multiple Jellyfin servers, browse libraries, stream content
- **Plex Integration** - Single account support, browse libraries, stream with TMDB subtitle matching

### 🎮 Media Players
- **MPV Player** - High-performance with hardware acceleration
- **VLC Integration** - Alternative player support
- **Subtitle Management** - Automatic downloading and loading

### 📚 Books & Reading
- **EPUB Reader** - Built-in reader with beautiful formatting, Apple Books features
- **Z-Library Integration** - Access millions of books online without downloading
- **Manga Support** - Read manga with optimized viewer from the biggest manga library online
- **Offline Library** - Save books locally for offline reading

### 🎵 Music & Audio
- **Music Streaming** - YT-Music client
- **Offline Downloads** - Save music for offline listening
- **Audiobooks** - Listen to audiobooks with playback controls
- **Metadata & Cover Art** - Rich library with album artwork

### 🎮 Gaming
- **Game Downloading** Download games directly on the app and by using torbox too

### 💻 System Integration
- **Discord Rich Presence** - Show what you're watching to friends
- **Auto-Updates** - Stay current with automatic updates
- **Cross-Platform** - Windows, macOS, and Linux support
- **Persistent Data** - Settings and library survive app updates
- **Custom Cache Location** - Choose where to store files
- **Dark Mode UI** - Beautiful, modern interface

## 🔧 Torrent Engine Architecture

PlayTorrio supports multiple torrent engines, each optimized for different use cases:

### Available Engines

**Stremio** (Default)
- Fastest streaming performance
- Optimized for instant playback
- Best for most users

**WebTorrent**
- Browser-based torrent protocol
- Good peer connectivity
- Lightweight

**TorrentStream**
- Traditional torrent streaming
- Reliable performance
- Good for large files
- Have up to 3 engines at the same time
**Hybrid Mode**
- Combines WebTorrent and TorrentStream
- Best of both worlds
- Maximizes swarm participation

### Multi-Instance Swarm Technology

Run up to 3 engine instances simultaneously:
- **1 Instance** - Standard mode, single torrent at a time
- **2 Instances** - Parallel downloads, better swarm participation
- **3 Instances** - Maximum performance, multiple torrents simultaneously

Each instance participates in the swarm independently, improving download speeds and network health.

### Configuration

Access engine settings in the app:
1. Settings → Torrent Engine
2. Select engine type (Stremio, WebTorrent, TorrentStream, Hybrid)
3. Choose number of instances (1-3)
4. Changes apply immediately

## 🖥️ Platform Support

### ✅ Windows 10/11
- NSIS Installer
- Bundled MPV player
- Full hardware acceleration support
- System tray integration

### ✅ macOS 10.15+
- Universal binary (Intel & Apple Silicon)
- DMG Installer
- Native .app support
- VideoToolbox hardware acceleration

### ✅ Linux
- AppImage & .deb packages
- Ubuntu, Debian, Fedora, Arch compatible
- VAAPI/NVENC hardware support
- Full feature parity

## 🚀 Quick Start

### Windows
1. Download `PlayTorrio-installer.exe` from [Releases](https://github.com/ayman708-UX/PlayTorrio/releases)
2. Run the installer
3. Launch from Start Menu or Desktop

### macOS
1. Download `PlayTorrio-mac-{arch}.dmg` from [Releases](https://github.com/ayman708-UX/PlayTorrio/releases)
   - `x64` for Intel Macs
   - `arm64` for Apple Silicon (M1/M2/M3)
2. Open DMG and drag PlayTorrio to Applications
3. Right-click → Open (first launch only)

### Linux
1. Download `PlayTorrio.AppImage` from [Releases](https://github.com/ayman708-UX/PlayTorrio/releases)
2. Make executable: `chmod +x PlayTorrio.AppImage`
3. Run: `./PlayTorrio.AppImage`

## 📦 Dependencies

### Media Players
PlayTorrio has a built in player with full support for every file type
PlayTorrio can use either MPV or VLC and IINA for mac for video playback:

#### Windows
- **MPV**: Bundled in the installer
- **VLC**: Download from [videolan.org](https://www.videolan.org/) (optional)

#### macOS
- **MPV**: `brew install --cask mpv` or [mpv.io](https://mpv.io/)
- **IINA**: Modern MPV frontend from [iina.io](https://iina.io/)
- **VLC**: Download from [videolan.org](https://www.videolan.org/)

#### Linux
```bash
# MPV
sudo apt install mpv        # Debian/Ubuntu
sudo dnf install mpv        # Fedora
sudo pacman -S mpv          # Arch

# VLC
sudo apt install vlc        # Debian/Ubuntu
sudo dnf install vlc        # Fedora
sudo pacman -S vlc          # Arch
```

## ⚙️ Configuration

### First Launch Setup

1. **Torrent Engine** (Optional)
   - Settings → Torrent Engine
   - Select engine: Stremio (default), WebTorrent, TorrentStream, or Hybrid
   - Choose instances: 1-3 for swarm participation

2. **Jackett Integration** (Optional)
   - Settings → Jackett
   - Enter your Jackett URL and API key for torrent search

3. **Prowlarr Integration** (Optional)
   - Settings → Prowlarr
   - Enter your Prowlarr URL and API key for advanced torrent indexing
   - Search across all configured indexers in Prowlarr

4. **Real-Debrid** (Optional)
   - Settings → Real-Debrid
   - Enter your API key for premium streaming

5. **Jellyfin Servers** (Optional)
   - Navigate to Custom Servers → Jellyfin
   - Add multiple Jellyfin servers with credentials
   - Switch between servers and browse libraries
   - Automatic TMDB subtitle matching for content

6. **Plex Account** (Optional)
   - Navigate to Custom Servers → Plex
   - Login with your Plex account (OAuth)
   - Browse all accessible servers and libraries
   - Automatic TMDB subtitle matching for content

7. **Cache Location** (Optional)
   - Settings → Cache Location
   - Select where to store temporary files

### Media Player Selection
- Click the MPV/VLC toggle in player controls
- Default: Built in player (recommended for better performance)

### Transcoding Options
- **Hardware Acceleration**: Automatically detected and enabled
  - NVIDIA: NVENC
  - Intel: QuickSync
  - AMD: AMF
  - Apple: VideoToolbox
  - Linux: VAAPI
- **Quality Boost**: Progressive quality upgrade during playback
- **Chunk Caching**: Instant seeks to previously watched sections

## 📂 File Locations

### Windows
- Settings: `%APPDATA%\PlayTorrio\`
- Cache: `%LOCALAPPDATA%\PlayTorrio\`
- Books: `%APPDATA%\PlayTorrio\epub\`

### macOS
- Settings: `~/Library/Application Support/PlayTorrio/`
- Cache: `~/Library/Caches/PlayTorrio/`
- Books: `~/Library/Application Support/PlayTorrio/epub/`

### Linux
- Settings: `~/.config/PlayTorrio/`
- Cache: `~/.cache/PlayTorrio/`
- Books: `~/.config/PlayTorrio/epub/`

## 🔌 API & Integration

### Built-in Server
- Runs on `http://localhost:6987`
- RESTful API for all features
- Supports external player integration

### Custom Server Integration
- **Jellyfin**: Multi-server support with library browsing and st
- **Plex**: Single account with OAuth authentication and library access
- Automatic TMDB metadata matching for subtitles
- Built-in subtitle fetching from Jellyfin/Plex servers

### Stremio Routes
- `/api/torrent-files` - Get files from torrent
- `/api/stream-file` - Stream torrent file
- `/api/torrent-stats` - Get download stats

### Torrent Engine Routes
- `/api/alt-torrent-files` - Alternative engine file listing
- `/api/alt-stream-file` - Alternative engine streaming
- `/api/alt-engine-status` - Engine status and stats
- `/api/alt-torrent-engine/config` - Configure engine and instances

### Music API
- YouTube Music integration
- Music downloading

## 🎯 Advanced Features

### Predictive Pre-warming
- Automatically caches first 8 seconds of video
- Enables instant playback
- Configurable cache size

### Smart Stream Reuse
- Reuses FFmpeg process for small seeks
- Reduces latency and CPU usage
- Automatic fallback for large seeks

### Chunk Caching
- Caches up to 200MB per stream
- Instant seeks to previously watched sections
- Automatic cleanup

### Hardware Acceleration
- Auto-detects best encoder for your system
- Benchmarks encoders on startup
- Falls back to software encoding if needed

## 🐛 Troubleshooting

### Playback Issues
- Ensure MPV or VLC is installed
- Check cache location has sufficient disk space
- Try switching torrent engines in settings

### Slow Downloads
- Increase engine instances (1-3) for better swarm participation
- Check your internet connection
- Try a different torrent engine

### Subtitle Problems
- Ensure subtitle download is enabled
- Check subtitle cache location
- Try manual subtitle selection

### Cache Issues
- Clear cache in Settings → Cache Management
- Check available disk space
- Verify cache location permissions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the GPL 2 License - see the LICENSE file for details.

## 🐛 Issues & Support

Found a bug? Have a feature request?
- Open an issue on [GitHub](https://github.com/ayman708-UX/PlayTorrio/issues)
- Email: aymanisthedude1@gmail.com
- Discord: [Join Community](https://discord.com/invite/bbkVHRHnRk)

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [Stremio](https://www.stremio.com/) - Torrent streaming engine
- [WebTorrent](https://webtorrent.io/) - Browser torrent client
- [MPV](https://mpv.io/) - Media player
- [VLC](https://www.videolan.org/) - Alternative media player
- [FFmpeg](https://ffmpeg.org/) - Transcoding engine
- All open-source libraries that make this possible

## 📊 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Desktop**: Electron
- **Torrent**: Stremio, WebTorrent, TorrentStream
- **Transcoding**: FFmpeg with hardware acceleration
- **Database**: Local JSON storage
- **APIs**: TMDB, TVDB, Trakt, YouTube Music

## ⭐ Star History

If you like PlayTorrio, please give it a star on GitHub!

---

**Icon Design**: Adnan Ahmed
- GitHub: [ddosintruders](https://github.com/ddosintruders)
- Portfolio: [adnan-ahmed.pages.dev](https://adnan-ahmed.pages.dev/)

**Made with ❤️ by Ayman**

[Download Latest Release](https://github.com/ayman708-UX/PlayTorrio/releases) | [Report Bug](https://github.com/ayman708-UX/PlayTorrio/issues) | [Request Feature](https://github.com/ayman708-UX/PlayTorrio/issues) | [Join Discord](https://discord.com/invite/bbkVHRHnRk)
