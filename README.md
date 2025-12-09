# watchav

A CLI tool that monitors camera and microphone usage on macOS in real-time.

```
 📹  Video: ACTIVE     🎙️  Audio: idle

─── Devices ───

  📹  MacBook Pro Camera
  🎙️  MacBook Pro Microphone
  🎙️  ZoomAudioDevice

─── History ───

  10:23:45  📹  ACTIVE
  10:23:40  🎙️  stopped
  10:22:15  🎙️  ACTIVE
```

## Features

- Real-time monitoring of camera and microphone status
- Detects when apps start/stop using your camera or mic
- Lists all available audio/video capture devices
- Event history showing the last 10 state changes in the UI
- Persistent event logging to `~/.watchav/events.log`
- Supports USB webcams and external audio devices
- Desktop notifications when camera/mic state changes (optional)
- Works on both Apple Silicon and Intel Macs
- Supports JSON output for scripting

## Installation

```bash
npm install -g @ddwang/watchav
```

Or run directly with npx:

```bash
npx @ddwang/watchav
```

## Usage

```bash
# Basic monitoring
watchav

# Desktop notifications when state changes
watchav --notify

# Only output when state changes (no continuous display)
watchav --quiet

# JSON output for scripting
watchav --json

# Faster polling (default: 500ms)
watchav --interval 200

# Verbose output for debugging
watchav --verbose
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--interval` | `-i` | Microphone poll interval in ms (default: 500) |
| `--json` | `-j` | Output in JSON format |
| `--quiet` | `-q` | Only output on state changes |
| `--notify` | `-n` | Show desktop notifications on state changes |
| `--verbose` | `-V` | Show verbose output for debugging |
| `--version` | `-v` | Show version number |
| `--help` | `-h` | Show help message |

## Event Log

All camera and microphone state changes are logged to `~/.watchav/events.log`:

```
[2025-01-15T10:23:45.123Z] CAMERA ACTIVE
[2025-01-15T10:23:40.456Z] MICROPHONE STOPPED
[2025-01-15T10:22:15.789Z] MICROPHONE ACTIVE
```

## How It Works

watchav uses macOS system APIs to detect camera and microphone activity:

- **Apple Silicon**: Monitors kernel logs for camera streaming state changes and microphone audio events
- **Intel Macs**: Uses IORegistry polling and UVC extension logs
- **USB Webcams**: Detects USB Video Class (UVC) devices and monitors their streaming state via IORegistry

The tool detects the initial state on startup (so it works even if recording is already in progress) and then monitors for changes in real-time.

## Requirements

- macOS 11.0 (Big Sur) or later
- Node.js 18 or later

## Development

```bash
# Clone the repo
git clone https://github.com/ddwang/watchav.git
cd watchav

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format

# Link for local development
npm link

# Run
watchav
```

## License

MIT
