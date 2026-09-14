import { AsyncLocalStorage } from 'node:async_hooks';

export const storeContext = new AsyncLocalStorage<{ storeId: string }>();

export function getTenantId(): string {
  const store = storeContext.getStore();
  
  if (!store || !store.storeId) {
     // Failsafe: Prevent catastrophic data bleed to default store if context is lost
     // Only allow local dev bypass (tests), otherwise strictly enforce
     if (process.env.NODE_ENV === 'development') {
         return 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
     }
     console.error('[CRITICAL] AsyncLocalStorage lost context! Tenant ID cannot be resolved.');
     throw new Error('Tenant context lost. Query aborted to prevent data leak.');
  }

  return store.storeId;
}
