import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Architecture } from './types.js';

const execAsync = promisify(exec);

export async function getArchitecture(): Promise<Architecture> {
  const { stdout } = await execAsync('uname -m');
  return stdout.trim() === 'arm64' ? 'arm64' : 'x86_64';
}

export async function isMacOS(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('uname -s');
    return stdout.trim() === 'Darwin';
  } catch {
    return false;
  }
}
