import { Spec } from './spec-contract';

export type PlatformType = 'browser' | 'tauri' | 'node' | 'mobile';

export interface PlatformAdapter {
  platform: PlatformType;
  render(spec: Spec): void;
  destroy(): void;
  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<void>;
  showNotification(title: string, body: string): Promise<void>;
  onReady(callback: () => void): void;
  onDestroy(callback: () => void): void;
}

export class BrowserPlatformAdapter implements PlatformAdapter {
  platform: PlatformType = 'browser';
  private container: Element;
  private renderCallback?: (spec: Spec) => void;

  constructor(container: Element) {
    this.container = container;
  }

  render(spec: Spec): void {
    this.renderCallback?.(spec);
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  async readClipboard(): Promise<string> {
    return navigator.clipboard.readText();
  }

  async writeClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  onReady(callback: () => void): void {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback);
    }
  }

  onDestroy(callback: () => void): void {
    window.addEventListener('unload', callback);
  }

  setRenderCallback(callback: (spec: Spec) => void): void {
    this.renderCallback = callback;
  }
}

export function createPlatformAdapter(container: Element | string, platform?: PlatformType): PlatformAdapter {
  const el = typeof container === 'string' ? document.querySelector(container)! : container;
  if (platform) {
    switch (platform) {
      case 'tauri':
        break;
      case 'node':
        break;
    }
  }
  return new BrowserPlatformAdapter(el);
}
