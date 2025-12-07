import { spawn, ChildProcess, execSync } from 'node:child_process';
import { createInterface, Interface } from 'node:readline';
import { EventEmitter } from 'node:events';
import type { Architecture, DeviceStatus } from '../types.js';

export class CameraDetector extends EventEmitter {
  private logProcess: ChildProcess | null = null;
  private readline: Interface | null = null;
  private currentState: boolean = false;
  private architecture: Architecture;
  private cameraDriverName: string = '';

  constructor(architecture: Architecture) {
    super();
    this.architecture = architecture;
    if (architecture === 'arm64') {
      this.cameraDriverName = this.detectCameraDriver();
    }
  }

  private detectCameraDriver(): string {
    try {
      const output = execSync('ioreg -l 2>/dev/null | grep -o "AppleH[0-9]*CamIn" | head -1', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      return output || 'AppleH13CamIn';
    } catch {
      return 'AppleH13CamIn';
    }
  }

  private checkInitialState(): boolean {
    if (this.architecture !== 'arm64') {
      return false;
    }

    try {
      const output = execSync(`ioreg -r -c ${this.cameraDriverName} 2>/dev/null | grep "FrontCameraStreaming"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return output.includes('= Yes');
    } catch {
      return false;
    }
  }

  start(): void {
    this.currentState = this.checkInitialState();

    const predicate = this.architecture === 'arm64'
      ? `process == "kernel" AND eventMessage CONTAINS "${this.cameraDriverName}" AND eventMessage CONTAINS "Streaming"`
      : 'subsystem CONTAINS "com.apple.UVCExtension" AND composedMessage CONTAINS "Post PowerLog"';

    this.logProcess = spawn('/usr/bin/log', ['stream', '--predicate', predicate], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!this.logProcess.stdout) {
      this.emit('error', new Error('Failed to capture stdout from log stream'));
      return;
    }

    this.readline = createInterface({
      input: this.logProcess.stdout,
      crlfDelay: Infinity,
    });

    this.readline.on('line', (line: string) => this.handleLogLine(line));

    this.logProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message && !message.includes('Filtering the log data')) {
        this.emit('error', new Error(`Log stream error: ${message}`));
      }
    });

    this.logProcess.on('error', (err: Error) => this.emit('error', err));

    this.logProcess.on('close', (code: number | null) => {
      if (code !== 0 && code !== null) {
        this.emit('error', new Error(`Log stream exited with code ${code}`));
      }
    });

    this.emitStatus();
  }

  private handleLogLine(line: string): void {
    if (line.includes('Filtering the log data')) {
      return;
    }

    let newState: boolean | null = null;

    if (this.architecture === 'arm64') {
      const match = line.match(/name:\s*Streaming,\s*state:\s*(\d+)/);
      if (match) {
        newState = match[1] === '1';
      }
    } else {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('post powerlog')) {
        if (lowerLine.includes('on') || lowerLine.includes('start')) {
          newState = true;
        } else if (lowerLine.includes('off') || lowerLine.includes('stop')) {
          newState = false;
        }
      }
    }

    if (newState !== null && newState !== this.currentState) {
      this.currentState = newState;
      this.emitStatus();
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
