#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getArchitecture, isMacOS } from './platform.js';
import { DeviceMonitor } from './monitor.js';
import {
  formatStatus,
  printHeader,
  clearScreen,
  printError,
  printInfo,
  SYMBOLS,
} from './output.js';
import { notifyDeviceChange } from './notify.js';
import type { CLIOptions, MonitorStatus } from './types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

function showHelp(): void {
  console.log(`
watchav - Monitor camera and microphone usage on macOS

Usage: watchav [options]

Options:
  -i, --interval     Microphone poll interval in ms (default: 500)
  -j, --json         Output in JSON format
  -q, --quiet        Only output on state changes
  -n, --notify       Show desktop notifications on state changes
  -v, --version      Show version number
  -V, --verbose      Show verbose output for debugging
  -h, --help         Show this help message

Examples:
  watchav                    Monitor both camera and microphone
  watchav --json             Machine-readable output
  watchav --notify           Desktop notifications on state change
  watchav --interval 200     Faster microphone polling
`);
}

function parseCliArgs(): CLIOptions & { help: boolean; version: boolean } {
  const { values } = parseArgs({
    options: {
      interval: {
        type: 'string',
        short: 'i',
        default: '500',
      },
      json: {
        type: 'boolean',
        short: 'j',
        default: false,
      },
      quiet: {
        type: 'boolean',
        short: 'q',
        default: false,
      },
      notify: {
        type: 'boolean',
        short: 'n',
        default: false,
      },
      verbose: {
        type: 'boolean',
        short: 'V',
        default: false,
      },
      version: {
        type: 'boolean',
        short: 'v',
        default: false,
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
  });

  return {
    pollInterval: parseInt(values.interval ?? '500', 10),
    jsonOutput: values.json ?? false,
    quiet: values.quiet ?? false,
    notify: values.notify ?? false,
    verbose: values.verbose ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

async function main(): Promise<void> {
  const options = parseCliArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    console.log(`watchav v${VERSION}`);
    process.exit(0);
  }

  // Check if running on macOS
  const macOS = await isMacOS();
  if (!macOS) {
    printError('watchav only supports macOS');
    process.exit(1);
  }

  // Get architecture
  const architecture = await getArchitecture();

  if (!options.jsonOutput && !options.quiet) {
    clearScreen();
    printHeader();
    if (options.verbose) {
      printInfo(`Architecture: ${architecture}`);
      printInfo(`Microphone poll interval: ${options.pollInterval}ms`);
      printInfo(`Notifications: ${options.notify ? 'enabled' : 'disabled'}`);
    }
    console.log('');
  }

  // Create monitor
  const monitor = new DeviceMonitor(architecture, options);

  // Track output lines for refresh and state changes
  let lastOutput = '';
  let lastCameraActive: boolean | null = null;
  let lastMicrophoneActive: boolean | null = null;

  // Handle status updates
  monitor.on('status', (status: MonitorStatus) => {
    // Check for state changes and send notifications
    if (options.notify) {
      if (lastCameraActive !== null && status.camera.active !== lastCameraActive) {
        notifyDeviceChange('camera', status.camera.active, options.verbose);
      }
      if (lastMicrophoneActive !== null && status.microphone.active !== lastMicrophoneActive) {
        notifyDeviceChange('microphone', status.microphone.active, options.verbose);
      }
    }

    // Track state for next comparison
    const stateChanged =
      lastCameraActive !== status.camera.active ||
      lastMicrophoneActive !== status.microphone.active;
    lastCameraActive = status.camera.active;
    lastMicrophoneActive = status.microphone.active;

    const output = formatStatus(status, options.jsonOutput);

    if (options.jsonOutput) {
      // In JSON mode, print each update on a new line (or only on change if quiet)
      if (!options.quiet || stateChanged) {
        console.log(output);
      }
    } else if (options.quiet) {
      // In quiet mode, only output on state changes
      if (stateChanged) {
        const timestamp = new Date().toLocaleTimeString();
        const cameraStatus = status.camera.active
          ? `${SYMBOLS.video} ACTIVE`
          : `${SYMBOLS.video} idle`;
        const micStatus = status.microphone.active
          ? `${SYMBOLS.audio} ACTIVE`
          : `${SYMBOLS.audio} idle`;
        console.log(`[${timestamp}] Camera: ${cameraStatus} | Microphone: ${micStatus}`);
      }
    } else {
      // In human mode, only refresh if output changed
      if (output !== lastOutput) {
        // Clear previous output and reprint
        const lineCount = lastOutput.split('\n').length;
        if (lastOutput) {
          // Move cursor up and clear lines
          for (let i = 0; i < lineCount; i++) {
            process.stdout.write('\x1b[1A\x1b[2K');
          }
        }
        console.log(output);
        lastOutput = output;
      }
    }
  });

  // Handle errors
  monitor.on('error', (error: Error) => {
    if (!options.jsonOutput) {
      printError(error.message);
    } else {
      console.error(JSON.stringify({ error: error.message }));
    }
  });

  // Graceful shutdown
  const shutdown = (): void => {
    if (!options.jsonOutput) {
      console.log('\n');
      printInfo('Stopping monitor...');
    }
    monitor.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start monitoring
  try {
    await monitor.start();
  } catch (error) {
    printError(`Failed to start monitor: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  printError(`Fatal error: ${error}`);
  process.exit(1);
});
