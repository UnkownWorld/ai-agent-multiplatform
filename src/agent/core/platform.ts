/**
 * Platform Adapters
 * 平台适配器 - 为Web、桌面、移动端提供统一的接口
 */

import {
  PlatformAdapter,
  StorageAdapter,
  ClipboardAdapter,
  NotificationAdapter,
  FileSystemAdapter,
} from '../core/types';

// ============ 安全检查 ============

const isBrowser = typeof window !== 'undefined';
const isServer = !isBrowser;

// ============ Web平台适配器 ============

class WebStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'agent_') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    if (isServer) return null;
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (isServer) return;
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    if (isServer) return;
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  async clear(): Promise<void> {
    if (isServer) return;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
}

class WebClipboardAdapter implements ClipboardAdapter {
  async read(): Promise<string> {
    if (isServer) return '';
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  }

  async write(text: string): Promise<void> {
    if (isServer) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级方案
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (error) {
        console.error('Clipboard write error:', error);
      }
    }
  }
}

class WebNotificationAdapter implements NotificationAdapter {
  async show(title: string, body: string): Promise<void> {
    if (isServer) return;
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }
}

export function createWebAdapter(): PlatformAdapter {
  return {
    platform: 'web',
    storage: new WebStorageAdapter(),
    clipboard: new WebClipboardAdapter(),
    notification: new WebNotificationAdapter(),
  };
}

// ============ 桌面平台适配器 (Tauri) ============

class TauriStorageAdapter implements StorageAdapter {
  private prefix: string;
  private cache: Map<string, unknown> = new Map();

  constructor(prefix: string = 'agent_') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(this.prefix + key);
    if (cached !== undefined) {
      return cached as T;
    }

    if (isServer) return null;

    try {
      // Tauri文件存储
      const { readTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
      const content = await readTextFile(`${this.prefix}${key}.json`, {
        dir: BaseDirectory.AppData,
      });
      const data = JSON.parse(content);
      this.cache.set(this.prefix + key, data);
      return data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(this.prefix + key, value);
    
    if (isServer) return;
    
    try {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/api/fs');
      await writeTextFile(`${this.prefix}${key}.json`, JSON.stringify(value), {
        dir: BaseDirectory.AppData,
      });
    } catch (error) {
      console.error('Tauri storage set error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(this.prefix + key);
    
    if (isServer) return;
    
    try {
      const { removeFile, BaseDirectory } = await import('@tauri-apps/api/fs');
      await removeFile(`${this.prefix}${key}.json`, {
        dir: BaseDirectory.AppData,
      });
    } catch (error) {
      console.error('Tauri storage remove error:', error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

class TauriClipboardAdapter implements ClipboardAdapter {
  async read(): Promise<string> {
    if (isServer) return '';
    try {
      const { readText } = await import('@tauri-apps/api/clipboard');
      return await readText();
    } catch {
      return '';
    }
  }

  async write(text: string): Promise<void> {
    if (isServer) return;
    try {
      const { writeText } = await import('@tauri-apps/api/clipboard');
      await writeText(text);
    } catch (error) {
      console.error('Tauri clipboard write error:', error);
    }
  }
}

class TauriNotificationAdapter implements NotificationAdapter {
  async show(title: string, body: string): Promise<void> {
    if (isServer) return;
    try {
      const { sendNotification } = await import('@tauri-apps/api/notification');
      await sendNotification({ title, body });
    } catch (error) {
      console.error('Tauri notification error:', error);
    }
  }
}

class TauriFileSystemAdapter implements FileSystemAdapter {
  async readFile(path: string): Promise<string> {
    if (isServer) throw new Error('Not available on server');
    const { readTextFile } = await import('@tauri-apps/api/fs');
    return await readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (isServer) throw new Error('Not available on server');
    const { writeTextFile } = await import('@tauri-apps/api/fs');
    await writeTextFile(path, content);
  }

  async pickFile(): Promise<string | null> {
    if (isServer) return null;
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        multiple: false,
      });
      return selected as string | null;
    } catch {
      return null;
    }
  }

  async pickDirectory(): Promise<string | null> {
    if (isServer) return null;
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        directory: true,
      });
      return selected as string | null;
    } catch {
      return null;
    }
  }
}

export async function createDesktopAdapter(): Promise<PlatformAdapter> {
  // 检查是否在Tauri环境中
  if (isBrowser && window.__TAURI__) {
    return {
      platform: 'desktop',
      storage: new TauriStorageAdapter(),
      clipboard: new TauriClipboardAdapter(),
      notification: new TauriNotificationAdapter(),
      fileSystem: new TauriFileSystemAdapter(),
    };
  }
  
  // 降级到Web适配器
  return createWebAdapter();
}

// ============ 移动平台适配器 (React Native) ============

class ReactNativeStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'agent_') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    if (isServer) return null;
    try {
      // @ts-ignore - React Native AsyncStorage
      const AsyncStorage = window.AsyncStorage;
      if (AsyncStorage) {
        const item = await AsyncStorage.getItem(this.prefix + key);
        return item ? JSON.parse(item) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (isServer) return;
    try {
      // @ts-ignore - React Native AsyncStorage
      const AsyncStorage = window.AsyncStorage;
      if (AsyncStorage) {
        await AsyncStorage.setItem(this.prefix + key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('RN storage set error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    if (isServer) return;
    try {
      // @ts-ignore - React Native AsyncStorage
      const AsyncStorage = window.AsyncStorage;
      if (AsyncStorage) {
        await AsyncStorage.removeItem(this.prefix + key);
      }
    } catch (error) {
      console.error('RN storage remove error:', error);
    }
  }

  async clear(): Promise<void> {
    if (isServer) return;
    try {
      // @ts-ignore - React Native AsyncStorage
      const AsyncStorage = window.AsyncStorage;
      if (AsyncStorage) {
        const keys = await AsyncStorage.getAllKeys();
        const agentKeys = keys.filter((k: string) => k.startsWith(this.prefix));
        await AsyncStorage.multiRemove(agentKeys);
      }
    } catch (error) {
      console.error('RN storage clear error:', error);
    }
  }
}

class ReactNativeClipboardAdapter implements ClipboardAdapter {
  async read(): Promise<string> {
    if (isServer) return '';
    try {
      // @ts-ignore - React Native Clipboard
      const Clipboard = window.Clipboard;
      if (Clipboard) {
        return await Clipboard.getString();
      }
      return '';
    } catch {
      return '';
    }
  }

  async write(text: string): Promise<void> {
    if (isServer) return;
    try {
      // @ts-ignore - React Native Clipboard
      const Clipboard = window.Clipboard;
      if (Clipboard) {
        await Clipboard.setString(text);
      }
    } catch (error) {
      console.error('RN clipboard write error:', error);
    }
  }
}

class ReactNativeNotificationAdapter implements NotificationAdapter {
  async show(title: string, body: string): Promise<void> {
    if (isServer) return;
    try {
      // @ts-ignore - React Native PushNotification
      const PushNotification = window.PushNotification;
      if (PushNotification) {
        PushNotification.localNotification({
          title,
          message: body,
        });
      }
    } catch (error) {
      console.error('RN notification error:', error);
    }
  }
}

export function createMobileAdapter(): PlatformAdapter {
  return {
    platform: 'mobile',
    storage: new ReactNativeStorageAdapter(),
    clipboard: new ReactNativeClipboardAdapter(),
    notification: new ReactNativeNotificationAdapter(),
  };
}

// ============ 自动检测并创建适配器 ============

export async function createPlatformAdapter(): Promise<PlatformAdapter> {
  if (isServer) {
    // 服务端环境 - 返回空实现
    return createWebAdapter();
  }

  // 检测Tauri桌面环境
  if (window.__TAURI__) {
    return await createDesktopAdapter();
  }

  // 检测React Native环境
  // @ts-ignore
  if (window.AsyncStorage || window.ReactNative) {
    return createMobileAdapter();
  }

  // 默认Web环境
  return createWebAdapter();
}

export default createPlatformAdapter;
