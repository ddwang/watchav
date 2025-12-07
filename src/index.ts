#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { getArchitecture, isMacOS } from './platform.js';
import { DeviceMonitor } from './monitor.js';
import { formatStatus, printHeader, clearScreen, printError, printInfo } from './output.js';
import type { CLIOptions, MonitorStatus } from './types.js';

function showHelp(): void {
  console.log(`
watchav - Monitor camera and microphone usage on macOS

Usage: watchav [options]

Options:
  -p, --process      Show which process is using each device
  -i, --interval     Microphone poll interval in ms (default: 500)
  -j, --json         Output in JSON format
  -h, --help         Show this help message

Examples:
  watchav                    Monitor both camera and microphone
  watchav --process          Also show process names
  watchav --json             Machine-readable output
  watchav --interval 200     Faster microphone polling
`);
}

function parseCliArgs(): CLIOptions & { help: boolean } {
  const { values } = parseArgs({
    options: {
      process: {
        type: 'boolean',
        short: 'p',
        default: false,
      },
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
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
    },
  });

  return {
    showProcess: values.process ?? false,
    pollInterval: parseInt(values.interval ?? '500', 10),
    jsonOutput: values.json ?? false,
    help: values.help ?? false,
  };
}

async function main(): Promise<void> {
  const options = parseCliArgs();

  if (options.help) {
    showHelp();
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

  if (!options.jsonOutput) {
    clearScreen();
    printHeader();
    printInfo(`Architecture: ${architecture}`);
    printInfo(`Microphone poll interval: ${options.pollInterval}ms`);
    console.log('');
  }

  // Create monitor
  const monitor = new DeviceMonitor(architecture, options);

  // Track output lines for refresh
  let lastOutput = '';

  // Handle status updates
  monitor.on('status', (status: MonitorStatus) => {
    const output = formatStatus(status, options.jsonOutput);

    if (options.jsonOutput) {
      // In JSON mode, print each update on a new line
      console.log(output);
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
