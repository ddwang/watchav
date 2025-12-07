export type Architecture = 'arm64' | 'x86_64';

export interface DeviceStatus {
  active: boolean;
  timestamp: Date;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'audio' | 'video';
  active: boolean;
  timestamp: Date;
}

export interface ProcessInfo {
  pid: number;
  name: string;
}

export interface MonitorStatus {
  camera: DeviceStatus;
  microphone: DeviceStatus;
  devices: DeviceInfo[];
  processes?: {
    camera: ProcessInfo[];
    microphone: ProcessInfo[];
  };
}

export interface CLIOptions {
  showProcess: boolean;
  pollInterval: number;
  jsonOutput: boolean;
}
