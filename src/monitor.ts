import { EventEmitter } from 'node:events';
import { CameraDetector } from './detectors/camera.js';
import { MicrophoneDetector } from './detectors/microphone.js';
import { ProcessDetector } from './detectors/process.js';
import { discoverDevices, type AudioDevice, type VideoDevice } from './devices.js';
import type { Architecture, DeviceStatus, DeviceInfo, MonitorStatus, CLIOptions } from './types.js';

export class DeviceMonitor extends EventEmitter {
  private cameraDetector: CameraDetector;
  private microphoneDetector: MicrophoneDetector;
  private processDetector: ProcessDetector;
  private options: CLIOptions;

  private cameraStatus: DeviceStatus = { active: false, timestamp: new Date() };
  private microphoneStatus: DeviceStatus = { active: false, timestamp: new Date() };

  private audioDevices: AudioDevice[] = [];
  private videoDevices: VideoDevice[] = [];
  private deviceRefreshInterval: NodeJS.Timeout | null = null;

  constructor(architecture: Architecture, options: CLIOptions) {
    super();
    this.options = options;
    this.cameraDetector = new CameraDetector(architecture);
    this.microphoneDetector = new MicrophoneDetector(options.pollInterval, architecture);
    this.processDetector = new ProcessDetector();

    const devices = discoverDevices();
    this.audioDevices = devices.audioInputs;
    this.videoDevices = devices.videoDevices;
  }

  async start(): Promise<void> {
    this.cameraDetector.on('change', async (status: DeviceStatus) => {
      this.cameraStatus = status;
      await this.emitStatus();
    });

    this.cameraDetector.on('error', (error: Error) => {
      this.emit('error', error);
    });

    this.microphoneDetector.on('change', async (status: DeviceStatus) => {
      this.microphoneStatus = status;
      await this.emitStatus();
    });

    this.microphoneDetector.on('error', (error: Error) => {
      this.emit('error', error);
    });

    this.cameraDetector.start();
    this.microphoneDetector.start();

    setTimeout(() => this.emitStatus(), 100);

    // Refresh device list every 5 seconds
    this.deviceRefreshInterval = setInterval(() => this.refreshDevices(), 5000);
  }

  private refreshDevices(): void {
    const devices = discoverDevices();
    const devicesChanged =
      JSON.stringify(this.audioDevices) !== JSON.stringify(devices.audioInputs) ||
      JSON.stringify(this.videoDevices) !== JSON.stringify(devices.videoDevices);

    if (devicesChanged) {
      this.audioDevices = devices.audioInputs;
      this.videoDevices = devices.videoDevices;
      this.emitStatus();
    }
  }

  private buildDeviceList(): DeviceInfo[] {
    const devices: DeviceInfo[] = [];

    for (const video of this.videoDevices) {
      devices.push({
        id: video.id,
        name: video.name,
        type: 'video',
        active: this.cameraStatus.active,
        timestamp: this.cameraStatus.timestamp,
      });
    }

    for (const audio of this.audioDevices) {
      devices.push({
        id: audio.id,
        name: audio.name,
        type: 'audio',
        active: this.microphoneStatus.active,
        timestamp: this.microphoneStatus.timestamp,
      });
    }

    return devices;
  }

  private async emitStatus(): Promise<void> {
    const status: MonitorStatus = {
      camera: this.cameraStatus,
      microphone: this.microphoneStatus,
      devices: this.buildDeviceList(),
    };

    if (this.options.showProcess) {
      const [cameraProcesses, microphoneProcesses] = await Promise.all([
        this.cameraStatus.active
          ? this.processDetector.getCameraProcesses()
          : Promise.resolve([]),
        this.microphoneStatus.active
          ? this.processDetector.getMicrophoneProcesses()
          : Promise.resolve([]),
      ]);

      status.processes = {
        camera: cameraProcesses,
        microphone: microphoneProcesses,
      };
    }

    this.emit('status', status);
  }

  stop(): void {
    if (this.deviceRefreshInterval) {
      clearInterval(this.deviceRefreshInterval);
      this.deviceRefreshInterval = null;
    }
    this.cameraDetector.stop();
    this.microphoneDetector.stop();
  }
}
