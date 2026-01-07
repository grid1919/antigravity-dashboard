import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  LocalAccount, 
  DashboardStats, 
  UserPreferences, 
  Notification,
  PageType,
  AccountFilterType
} from '../types';

interface DashboardState {
  localAccounts: LocalAccount[];
  usageAccounts: any[];
  models: any[];
  hourlyStats: any[];
  recentCalls: any[];
  
  accountsStats: DashboardStats;
  
  wsConnected: boolean;
  lastUpdate: number;
  managerAvailable: boolean;
  managerData: any;
  
  notifications: Notification[];
  
  preferences: UserPreferences;
  
  // Navigation state
  currentPage: PageType;
  
  // Account selection for bulk actions
  selectedAccounts: string[];
  
  // Account filtering/search
  accountFilter: AccountFilterType;
  accountSearch: string;
  
  setLocalAccounts: (accounts: LocalAccount[]) => void;
  updateLocalAccount: (email: string, changes: Partial<LocalAccount>) => void;
  setUsageAccounts: (accounts: any[]) => void;
  setModels: (models: any[]) => void;
  setHourlyStats: (stats: any[]) => void;
  setRecentCalls: (calls: any[]) => void;
  
  setAccountsStats: (stats: DashboardStats) => void;
  
  setWsConnected: (connected: boolean) => void;
  setLastUpdate: (timestamp: number) => void;
  setManagerAvailable: (available: boolean) => void;
  setManagerData: (data: any) => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setActiveTab: (tab: string) => void;
  
  // Navigation actions
  setCurrentPage: (page: PageType) => void;
  
  // Selection actions
  toggleAccountSelection: (email: string) => void;
  selectAllAccounts: () => void;
  clearSelection: () => void;
  setSelectedAccounts: (emails: string[]) => void;
  
  // Filter/search actions
  setAccountFilter: (filter: AccountFilterType) => void;
  setAccountSearch: (search: string) => void;
  
  getActiveAccount: () => LocalAccount | null;
  getRateLimitedAccounts: () => LocalAccount[];
  getAvailableAccounts: () => LocalAccount[];
  getFilteredAccounts: () => LocalAccount[];
}

const defaultPreferences: UserPreferences = {
  activeTab: 'overview',
  accountsSortBy: 'lastUsed',
  accountsSortOrder: 'desc',
  accountsFilter: 'all',
  notificationsEnabled: true,
  notifyOnRateLimit: true,
  notifyOnRateLimitClear: true,
  theme: 'dark',
  refreshInterval: 15000,
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      localAccounts: [],
      usageAccounts: [],
      models: [],
      hourlyStats: [],
      recentCalls: [],
      
      accountsStats: {
        totalAccounts: 0,
        availableAccounts: 0,
        rateLimitedAccounts: 0,
        activeAccount: null,
        lastUpdate: 0,
      },
      
      wsConnected: false,
      lastUpdate: 0,
      managerAvailable: false,
      managerData: null,
      
      notifications: [],
      
      preferences: defaultPreferences,
      
      // New navigation state
      currentPage: 'dashboard' as PageType,
      
      // New selection state
      selectedAccounts: [],
      
      // New filter/search state
      accountFilter: 'all' as AccountFilterType,
      accountSearch: '',
      
      setLocalAccounts: (accounts) => set({ 
        localAccounts: accounts,
        lastUpdate: Date.now()
      }),
      
      updateLocalAccount: (email, changes) => set((state) => ({
        localAccounts: state.localAccounts.map(acc => 
          acc.email === email ? { ...acc, ...changes } : acc
        ),
        lastUpdate: Date.now()
      })),
      
      setUsageAccounts: (accounts) => set({ usageAccounts: accounts }),
      setModels: (models) => set({ models }),
      setHourlyStats: (stats) => set({ hourlyStats: stats }),
      setRecentCalls: (calls) => set({ recentCalls: calls }),
      
      setAccountsStats: (stats) => set({ accountsStats: stats }),
      
      setWsConnected: (connected) => set({ wsConnected: connected }),
      setLastUpdate: (timestamp) => set({ lastUpdate: timestamp }),
      setManagerAvailable: (available) => set({ managerAvailable: available }),
      setManagerData: (data) => set({ managerData: data }),
      
      addNotification: (notification) => {
        const state = get();
        if (!state.preferences.notificationsEnabled) return;
        
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          read: false,
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50)
        }));
      },
      
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      setPreference: (key, value) => set((state) => ({
        preferences: { ...state.preferences, [key]: value }
      })),
      
      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
      
      setActiveTab: (tab) => set((state) => ({
        preferences: { ...state.preferences, activeTab: tab }
      })),
      
      // New navigation actions
      setCurrentPage: (page) => set({ currentPage: page }),
      
      // New selection actions
      toggleAccountSelection: (email) => set((state) => ({
        selectedAccounts: state.selectedAccounts.includes(email)
          ? state.selectedAccounts.filter(e => e !== email)
          : [...state.selectedAccounts, email]
      })),
      
      selectAllAccounts: () => set((state) => ({
        selectedAccounts: state.localAccounts.map(a => a.email)
      })),
      
      clearSelection: () => set({ selectedAccounts: [] }),
      
      setSelectedAccounts: (emails) => set({ selectedAccounts: emails }),
      
      // New filter/search actions
      setAccountFilter: (filter) => set({ accountFilter: filter, selectedAccounts: [] }),
      
      setAccountSearch: (search) => set({ accountSearch: search }),
      
      getActiveAccount: () => {
        const state = get();
        return state.localAccounts.find(a => a.isActive) || null;
      },
      
      getRateLimitedAccounts: () => {
        const state = get();
        return state.localAccounts.filter(a => a.status !== 'available');
      },
      
      getAvailableAccounts: () => {
        const state = get();
        return state.localAccounts.filter(a => a.status === 'available');
      },
      
      getFilteredAccounts: () => {
        const state = get();
        let accounts = state.localAccounts;
        
        // Apply filter
        switch (state.accountFilter) {
          case 'available':
            accounts = accounts.filter(a => a.status === 'available');
            break;
          case 'low_quota':
            // Filter accounts with any model quota < 20%
            accounts = accounts.filter(a => {
              const quotas = a.modelQuotas || [];
              return quotas.some(q => q.percentage < 20);
            });
            break;
          case 'PRO':
            accounts = accounts.filter(a => a.subscriptionTier === 'PRO');
            break;
          case 'ULTRA':
            accounts = accounts.filter(a => a.subscriptionTier === 'ULTRA');
            break;
          case 'FREE':
            accounts = accounts.filter(a => a.subscriptionTier === 'FREE');
            break;
        }
        
        // Apply search
        if (state.accountSearch) {
          const search = state.accountSearch.toLowerCase();
          accounts = accounts.filter(a => 
            a.email.toLowerCase().includes(search)
          );
        }
        
        return accounts;
      },
    }),
    {
      name: 'antigravity-dashboard-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        currentPage: state.currentPage,
        accountFilter: state.accountFilter,
        notifications: state.notifications.filter(n => !n.read).slice(0, 10),
      }),
    }
  )
);
