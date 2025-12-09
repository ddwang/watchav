import { exec, spawn, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface, Interface } from 'node:readline';
import { EventEmitter } from 'node:events';
import type { Architecture, DeviceStatus } from '../types.js';

const execAsync = promisify(exec);

export class MicrophoneDetector extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null;
  private logProcess: ChildProcess | null = null;
  private readline: Interface | null = null;
  private currentState: boolean = false;
  private intervalMs: number;
  private architecture: Architecture;

  constructor(intervalMs: number = 500, architecture: Architecture = 'arm64') {
    super();
    this.intervalMs = intervalMs;
    this.architecture = architecture;
  }

  private async checkAppleSilicon(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        'ioreg -r -d1 -c AppleExternalSecondaryAudio 2>/dev/null | grep -A30 "Digital Mic" | grep "is running"',
        { timeout: 5000 }
      );
      return stdout.includes('= Yes');
    } catch {
      return false;
    }
  }

  private async checkIntel(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        'ioreg -c AppleHDAEngineInput -k IOAudioEngineState 2>/dev/null | grep IOAudioEngineState',
        { timeout: 5000 }
      );
      const match = stdout.match(/IOAudioEngineState\s*=\s*(\d+)/);
      return match ? parseInt(match[1], 10) === 1 : false;
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.architecture === 'arm64') {
      this.currentState = await this.checkAppleSilicon();
      this.startLogStream();
    } else {
      await this.poll();
      this.pollInterval = setInterval(() => this.poll(), this.intervalMs);
    }

    this.emitStatus();
  }

  private startLogStream(): void {
    const predicate = 'process == "kernel" AND eventMessage CONTAINS "Digital Mic"';

    this.logProcess = spawn('/usr/bin/log', ['stream', '--predicate', predicate], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!this.logProcess.stdout) {
      this.fallbackToPolling();
      return;
    }

    this.readline = createInterface({
      input: this.logProcess.stdout,
      crlfDelay: Infinity,
    });

    this.readline.on('line', (line: string) => this.handleLogLine(line));

    this.logProcess.stderr?.on('data', () => {
      // Ignore stderr (e.g., "Filtering the log data...")
    });

    this.logProcess.on('error', (err: Error) => {
      this.emit('error', err);
      this.fallbackToPolling();
    });

    this.logProcess.on('close', (code: number | null) => {
      if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Log stream exited with code ${code}`));
      }
    });
  }

  private fallbackToPolling(): void {
    if (!this.pollInterval) {
      this.poll();
      this.pollInterval = setInterval(() => this.poll(), this.intervalMs);
    }
  }

  private handleLogLine(line: string): void {
    if (line.includes('Filtering the log data')) {
      return;
    }

    let newState: boolean | null = null;

    if (line.includes('Digital Mic: streaming audio')) {
      newState = true;
    } else if (line.includes('Digital Mic: off')) {
      newState = false;
    }

    if (newState !== null && newState !== this.currentState) {
      this.currentState = newState;
      this.emitStatus();
    }
  }

  private async poll(): Promise<void> {
    try {
      const isActive =
        this.architecture === 'arm64' ? await this.checkAppleSilicon() : await this.checkIntel();

      if (isActive !== this.currentState) {
        this.currentState = isActive;
        this.emitStatus();
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private emitStatus(): void {
    this.emit('change', {
      active: this.currentState,
      timestamp: new Date(),
    } as DeviceStatus);
  }

  getStatus(): DeviceStatus {
    return {
      active: this.currentState,
      timestamp: new Date(),
    };
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }

    if (this.logProcess) {
      this.logProcess.kill('SIGTERM');
      this.logProcess = null;
    }
  }
}
