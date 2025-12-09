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

export interface DiscoverOptions {
  verbose?: boolean;
}

export function discoverDevices(options: DiscoverOptions = {}): DeviceList {
  return {
    audioInputs: discoverAudioInputs(options),
    videoDevices: discoverVideoDevices(options),
  };
}

function discoverAudioInputs(options: DiscoverOptions): AudioDevice[] {
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
      const hasInput =
        device['coreaudio_input_source'] || device['coreaudio_default_audio_input_device'];

      if (name && hasInput) {
        devices.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
        });
      }
    }

    if (devices.length === 0 && options.verbose) {
      console.error('[verbose] No audio input devices found, using fallback');
    }

    return devices.length > 0
      ? devices
      : [{ id: 'built-in-microphone', name: 'Built-in Microphone' }];
  } catch (error) {
    if (options.verbose) {
      console.error(
        '[verbose] Failed to discover audio devices:',
        error instanceof Error ? error.message : error
      );
    }
    return [{ id: 'built-in-microphone', name: 'Built-in Microphone' }];
  }
}

function discoverVideoDevices(options: DiscoverOptions): VideoDevice[] {
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

    if (devices.length === 0 && options.verbose) {
      console.error('[verbose] No video devices found, using fallback');
    }

    return devices.length > 0 ? devices : [{ id: 'built-in-camera', name: 'Built-in Camera' }];
  } catch (error) {
    if (options.verbose) {
      console.error(
        '[verbose] Failed to discover video devices:',
        error instanceof Error ? error.message : error
      );
    }
    return [{ id: 'built-in-camera', name: 'Built-in Camera' }];
  }
}
