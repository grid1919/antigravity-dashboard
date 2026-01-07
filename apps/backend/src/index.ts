export { UsageMonitor, getMonitor } from './monitor';
export { AntigravityInterceptor, getInterceptor, patchAntigravityPlugin, setWsManager } from './interceptor';
export { app, server, monitor, accountsService, wsManager } from './server';

export type { ApiCall, AccountStats, ModelStats } from './types';
export type { RequestMetadata } from './interceptor';

if (require.main === module) {
  console.log('Starting Antigravity Dashboard Server...');
  require('./server');
}
