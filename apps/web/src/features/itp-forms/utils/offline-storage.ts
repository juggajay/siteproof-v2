import { ITPFormType } from '../types/form.types';

const DB_NAME = 'siteproof_itp_forms';
const DB_VERSION = 1;
const STORE_NAME = 'forms';

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('formType', 'formType', { unique: false });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveForm(form: ITPFormType): Promise<string> {
    if (!this.db) await this.init();
    
    const localId = form.localId || `${form.formType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const formWithLocalId = {
      ...form,
      localId,
      syncStatus: form.syncStatus || 'pending',
      createdAt: form.createdAt || new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(formWithLocalId);

      request.onsuccess = () => resolve(localId);
      request.onerror = () => reject(request.error);
    });
  }

  async getForm(localId: string): Promise<ITPFormType | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(localId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllForms(filters?: {
    formType?: string;
    projectId?: string;
    syncStatus?: string;
  }): Promise<ITPFormType[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      let request: IDBRequest;

      if (filters?.formType) {
        const index = store.index('formType');
        request = index.getAll(filters.formType);
      } else if (filters?.projectId) {
        const index = store.index('projectId');
        request = index.getAll(filters.projectId);
      } else if (filters?.syncStatus) {
        const index = store.index('syncStatus');
        request = index.getAll(filters.syncStatus);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result || [];
        
        // Apply additional filters if needed
        if (filters) {
          results = results.filter((form: any) => {
            if (filters.formType && form.formType !== filters.formType) return false;
            if (filters.projectId && form.projectId !== filters.projectId) return false;
            if (filters.syncStatus && form.syncStatus !== filters.syncStatus) return false;
            return true;
          });
        }
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncStatus(localId: string, syncStatus: 'pending' | 'synced' | 'failed', serverId?: string): Promise<void> {
    if (!this.db) await this.init();

    const form = await this.getForm(localId);
    if (!form) throw new Error('Form not found');

    const updatedForm = {
      ...form,
      syncStatus,
      id: serverId || form.id,
      updatedAt: new Date()
    };

    await this.saveForm(updatedForm);
  }

  async deleteForm(localId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(localId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedForms(): Promise<ITPFormType[]> {
    return this.getAllForms({ syncStatus: 'pending' });
  }

  // Convert file to base64 for offline storage
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert base64 back to file
  base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }
}

export const offlineStorage = new OfflineStorage();