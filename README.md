# watchav

A CLI tool that monitors camera and microphone usage on macOS in real-time.

```
 📹  Video: ACTIVE     🎙️  Audio: idle

─── Devices ───

  📹  MacBook Pro Camera
  🎙️  MacBook Pro Microphone
  🎙️  ZoomAudioDevice
```

## Features

- Real-time monitoring of camera and microphone status
- Detects when apps start/stop using your camera or mic
- Lists all available audio/video capture devices
- Shows which processes are using each device (optional)
- Works on both Apple Silicon and Intel Macs
- Supports JSON output for scripting

## Installation

```bash
npm install -g watchav
```

Or run directly with npx:

```bash
npx watchav
```

## Usage

```bash
# Basic monitoring
watchav

# Show which processes are using the camera/mic
watchav --process

# JSON output for scripting
watchav --json

# Faster polling (default: 500ms)
watchav --interval 200
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--process` | `-p` | Show which process is using each device |
| `--interval` | `-i` | Microphone poll interval in ms (default: 500) |
| `--json` | `-j` | Output in JSON format |
| `--help` | `-h` | Show help message |

## How It Works

ConeDrop uses macOS system APIs to detect camera and microphone activity:

- **Apple Silicon**: Monitors kernel logs for camera streaming state changes and microphone audio events
- **Intel Macs**: Uses IORegistry polling and UVC extension logs

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

# Link for local development
npm link

# Run
watchav
```

## License

MIT
