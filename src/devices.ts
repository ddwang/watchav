import { execSync } from 'node:child_process';

export interface AudioDevice {
  id: string;
  name: string;
}

export interface VideoDevice {
  id: string;
  name: string;
}

export interface DeviceList {
  audioInputs: AudioDevice[];
  videoDevices: VideoDevice[];
}

export function discoverDevices(): DeviceList {
  return {
    audioInputs: discoverAudioInputs(),
    videoDevices: discoverVideoDevices(),
  };
}

function discoverAudioInputs(): AudioDevice[] {
  try {
    const output = execSync('system_profiler SPAudioDataType -json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const data = JSON.parse(output);
    const audioData = data.SPAudioDataType?.[0]?._items || [];
    const devices: AudioDevice[] = [];

    for (const device of audioData) {
      const name = device._name;
      const hasInput = device['coreaudio_input_source'] || device['coreaudio_default_audio_input_device'];

      if (name && hasInput) {
        devices.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
        });
      }
    }

    return devices.length > 0 ? devices : [{ id: 'built-in-microphone', name: 'Built-in Microphone' }];
  } catch {
    return [{ id: 'built-in-microphone', name: 'Built-in Microphone' }];
  }
}

function discoverVideoDevices(): VideoDevice[] {
  try {
    const output = execSync('system_profiler SPCameraDataType -json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const data = JSON.parse(output);
    const cameraData = data.SPCameraDataType || [];
    const devices: VideoDevice[] = [];

    for (const device of cameraData) {
      const name = device._name;
      const modelId = device['spcamera_model-id'] || name;

      if (name) {
        devices.push({
          id: modelId.toLowerCase().replace(/\s+/g, '-'),
          name,
        });
      }
    }

    return devices.length > 0 ? devices : [{ id: 'built-in-camera', name: 'Built-in Camera' }];
  } catch {
    return [{ id: 'built-in-camera', name: 'Built-in Camera' }];
  }
}
