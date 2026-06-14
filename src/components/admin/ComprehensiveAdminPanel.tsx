import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Shield, 
  Settings, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3,
  AlertTriangle,
  Clock,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Crown,
  Database,
  Activity,
  ShoppingBag,
  Star,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useMarketplace } from '../../contexts/MarketplaceContext';
import { useSolanaProgram } from '../../hooks/useSolanaProgram';
import { Button } from '../common/Button';
import { StatsCard } from '../dashboard/StatsCard';
import { toast } from 'react-hot-toast';

export function ComprehensiveAdminPanel() {
  const { connected } = useWallet();
  const { 
    activeChain, 
    evmConnected, 
    connectEVMWallet, 
    marketplace, 
    updateFee, 
    updateRateLimit, 
    delistNFT, 
    loading, 
    initializeMarketplace 
  } = useMarketplace();
  const { getMarketplacePDA } = useSolanaProgram();

  const isConnected = connected || evmConnected;

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'users' | 'listings' | 'analytics' | 'activity'>('overview');
  const [chainFilter, setChainFilter] = useState<'all' | 'solana' | 'evm'>('all');
  
  // Settings tab states
  const [newFee, setNewFee] = useState('');
  const [newRateLimit, setNewRateLimit] = useState('');
  const [newEvmFee, setNewEvmFee] = useState('');
  const [newEvmRateLimit, setNewEvmRateLimit] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [marketplaceName, setMarketplaceName] = useState('NFT-Nexus');
  const [marketplaceFee, setMarketplaceFee] = useState('250'); // 2.5% in basis points

  // Solana admin dashboard data states
  const [solanaStats, setSolanaStats] = useState<any>(null);
  const [solanaUsers, setSolanaUsers] = useState<any[]>([]);
  const [solanaListings, setSolanaListings] = useState<any[]>([]);
  const [solanaAnalytics, setSolanaAnalytics] = useState<any[]>([]);
  const [solanaActivity, setSolanaActivity] = useState<any[]>([]);

  // EVM admin dashboard data states
  const [evmStats, setEvmStats] = useState<any>(null);
  const [evmUsers, setEvmUsers] = useState<any[]>([]);
  const [evmListings, setEvmListings] = useState<any[]>([]);
  const [evmAnalytics, setEvmAnalytics] = useState<any[]>([]);
  const [evmActivity, setEvmActivity] = useState<any[]>([]);

  const [loadingSolana, setLoadingSolana] = useState(false);
  const [loadingEvm, setLoadingEvm] = useState(false);
  const loadingAdmin = loadingSolana || loadingEvm;

  const fetchAdminData = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    
    // 1. Fetch Solana data
    let solAddress = '';
    try {
      const [marketplacePDA] = getMarketplacePDA();
      solAddress = marketplacePDA.toBase58();
    } catch (e) {
      console.warn('Solana program not ready:', e);
    }
    
    if (solAddress) {
      setLoadingSolana(true);
      try {
        const [statsRes, usersRes, listingsRes, analyticsRes, activityRes] = await Promise.all([
          fetch(`${apiUrl}/admin/${solAddress}/stats`),
          fetch(`${apiUrl}/admin/${solAddress}/users`),
          fetch(`${apiUrl}/admin/${solAddress}/listings?limit=100`),
          fetch(`${apiUrl}/admin/${solAddress}/analytics`),
          fetch(`${apiUrl}/admin/${solAddress}/activity?limit=100`)
        ]);
        if (statsRes.ok) setSolanaStats(await statsRes.json());
        if (usersRes.ok) setSolanaUsers(await usersRes.json());
        if (listingsRes.ok) setSolanaListings(await listingsRes.json());
        if (analyticsRes.ok) setSolanaAnalytics(await analyticsRes.json());
        if (activityRes.ok) setSolanaActivity(await activityRes.json());
      } catch (err) {
        console.error('Failed to fetch Solana admin data:', err);
      } finally {
        setLoadingSolana(false);
      }
    }

    // 2. Fetch EVM data
    const evmAddress = import.meta.env.VITE_EVM_MARKETPLACE_ADDRESS;
    if (evmAddress) {
      setLoadingEvm(true);
      try {
        const targetEvm = evmAddress.toLowerCase();
        const [statsRes, usersRes, listingsRes, analyticsRes, activityRes] = await Promise.all([
          fetch(`${apiUrl}/admin/${targetEvm}/stats`),
          fetch(`${apiUrl}/admin/${targetEvm}/users`),
          fetch(`${apiUrl}/admin/${targetEvm}/listings?limit=100`),
          fetch(`${apiUrl}/admin/${targetEvm}/analytics`),
          fetch(`${apiUrl}/admin/${targetEvm}/activity?limit=100`)
        ]);
        if (statsRes.ok) setEvmStats(await statsRes.json());
        if (usersRes.ok) setEvmUsers(await usersRes.json());
        if (listingsRes.ok) setEvmListings(await listingsRes.json());
        if (analyticsRes.ok) setEvmAnalytics(await analyticsRes.json());
        if (activityRes.ok) setEvmActivity(await activityRes.json());
      } catch (err) {
        console.error('Failed to fetch EVM admin data:', err);
      } finally {
        setLoadingEvm(false);
      }
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchAdminData();
    }
  }, [connected, evmConnected]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  const handleUpdateFee = async () => {
    if (activeChain !== 'solana') {
      toast.error('Please switch active network to Solana Devnet in the header to update Solana fee.');
      return;
    }
    if (newFee) {
      await updateFee(parseFloat(newFee));
      setNewFee('');
      setTimeout(fetchAdminData, 3000);
    }
  };

  const handleUpdateRateLimit = async () => {
    if (activeChain !== 'solana') {
      toast.error('Please switch active network to Solana Devnet in the header to update Solana rate limit.');
      return;
    }
    if (newRateLimit) {
      await updateRateLimit(parseInt(newRateLimit, 10));
      setNewRateLimit('');
      setTimeout(fetchAdminData, 3000);
    }
  };

  const handleUpdateEvmFee = async () => {
    if (activeChain !== 'evm') {
      toast.error('Please switch active network to Ethereum Sepolia in the header to update EVM fee.');
      return;
    }
    if (newEvmFee) {
      await updateFee(parseFloat(newEvmFee));
      setNewEvmFee('');
      setTimeout(fetchAdminData, 3000);
    }
  };

  const handleUpdateEvmRateLimit = async () => {
    if (activeChain !== 'evm') {
      toast.error('Please switch active network to Ethereum Sepolia in the header to update EVM rate limit.');
      return;
    }
    if (newEvmRateLimit) {
      await updateRateLimit(parseInt(newEvmRateLimit, 10));
      setNewEvmRateLimit('');
      setTimeout(fetchAdminData, 3000);
    }
  };

  const handleInitializeMarketplace = async () => {
    if (activeChain !== 'solana') {
      toast.error('Marketplace initialization is only required on Solana Devnet.');
      return;
    }
    if (marketplaceName && marketplaceFee) {
      await initializeMarketplace(marketplaceName, parseInt(marketplaceFee));
      setTimeout(fetchAdminData, 3000);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      default: return 'text-primary-600 dark:text-primary-400';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30';
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30';
      default: return 'bg-gray-50 dark:bg-primary-900/10 border-gray-200 dark:border-primary-500/30';
    }
  };

  // Aggregated / Merged Admin Data Calculations
  const pendingReports = (solanaStats?.pendingReports || 0) + (evmStats?.pendingReports || 0);
  const blockedUsers = (solanaStats?.blockedUsers || 0) + (evmStats?.blockedUsers || 0);
  const systemStatus = (solanaStats?.systemStatus === 'Degraded' || evmStats?.systemStatus === 'Degraded') ? 'Degraded' : 'Operational';

  const solanaFee = activeChain === 'solana' ? (marketplace?.fee || 2.5) : 2.5;
  const evmFee = activeChain === 'evm' ? (marketplace?.fee || 2.5) : 2.5;

  const mergedActivity = [
    ...(solanaActivity || []).map(act => ({ ...act, chain: 'solana' })),
    ...(evmActivity || []).map(act => ({ ...act, chain: 'evm' }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredActivity = mergedActivity.filter(act => {
    if (chainFilter === 'all') return true;
    return act.chain === chainFilter;
  });

  const mergedUsers = [
    ...(solanaUsers || []).map(u => ({ ...u, chain: 'solana' })),
    ...(evmUsers || []).map(u => ({ ...u, chain: 'evm' }))
  ];

  const filteredUsers = mergedUsers
    .filter(u => chainFilter === 'all' || u.chain === chainFilter)
    .filter(u => filterStatus === 'all' || u.status === filterStatus)
    .filter(u => u.address.toLowerCase().includes(searchTerm.toLowerCase()));

  const mergedListings = [
    ...(solanaListings || []).map(l => ({ ...l, chain: 'solana' })),
    ...(evmListings || []).map(l => ({ ...l, chain: 'evm' }))
  ];

  const filteredListings = mergedListings
    .filter(l => chainFilter === 'all' || l.chain === chainFilter)
    .filter(l => filterStatus === 'all' || l.status === filterStatus)
    .filter(l => 
      l.nft?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.nftMint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.maker?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Merge daily sales and volume statistics by date
  const mergedAnalyticsMap: Record<string, { date: string; solanaSales: number; solanaVolume: number; evmSales: number; evmVolume: number }> = {};

  (solanaAnalytics || []).forEach(item => {
    if (!mergedAnalyticsMap[item.date]) {
      mergedAnalyticsMap[item.date] = { date: item.date, solanaSales: 0, solanaVolume: 0, evmSales: 0, evmVolume: 0 };
    }
    mergedAnalyticsMap[item.date].solanaSales = item.salesCount;
    mergedAnalyticsMap[item.date].solanaVolume = item.volume;
  });

  (evmAnalytics || []).forEach(item => {
    if (!mergedAnalyticsMap[item.date]) {
      mergedAnalyticsMap[item.date] = { date: item.date, solanaSales: 0, solanaVolume: 0, evmSales: 0, evmVolume: 0 };
    }
    mergedAnalyticsMap[item.date].evmSales = item.salesCount;
    mergedAnalyticsMap[item.date].evmVolume = item.volume;
  });

  const mergedAnalyticsList = Object.values(mergedAnalyticsMap).sort((a, b) => b.date.localeCompare(a.date));

  if (!isConnected) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Connect your Phantom (Solana) or MetaMask (EVM) wallet to access the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-550 dark:text-gray-400">Comprehensive marketplace management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
              solana: { stats: solanaStats, users: solanaUsers, listings: solanaListings, activity: solanaActivity },
              evm: { stats: evmStats, users: evmUsers, listings: evmListings, activity: evmActivity }
            }));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `marketplace-audit-${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="primary" size="sm" onClick={fetchAdminData} disabled={loadingAdmin}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingAdmin ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-red-500">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-red-600 dark:text-red-400 font-semibold">Pending Reports</p>
              <p className="text-gray-900 dark:text-white text-lg font-bold">{pendingReports}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 border-l-4 border-yellow-500">
          <div className="flex items-center space-x-3">
            <Ban className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-yellow-650 dark:text-yellow-400 font-semibold">Blocked Users</p>
              <p className="text-gray-900 dark:text-white text-lg font-bold">{blockedUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 border-l-4 border-green-500">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-green-655 dark:text-green-400 font-semibold">System Status</p>
              <p className="text-gray-900 dark:text-white text-lg font-bold">{systemStatus}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={`${(solanaStats?.totalRevenue || 0).toFixed(2)} SOL / ${(evmStats?.totalRevenue || 0).toFixed(4)} ETH`}
          change="Combined revenue stats"
          changeType="positive"
          icon={DollarSign}
        />
        <StatsCard
          title="Total Transactions"
          value={((solanaStats?.totalTransactions || 0) + (evmStats?.totalTransactions || 0)).toLocaleString()}
          change="Aggregated transactions"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="Active Users"
          value={((solanaStats?.activeUsersCount || 0) + (evmStats?.activeUsersCount || 0)).toLocaleString()}
          change="Aggregated active users"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Marketplace Fee"
          value={`SOL: ${solanaFee}% / EVM: ${evmFee}%`}
          change="On-chain fee configuration"
          icon={Settings}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="card p-0">
        <div className="border-b border-gray-200 dark:border-primary-800/30">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'listings', label: 'Listings', icon: ShoppingBag },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'activity', label: 'Activity', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loadingAdmin && !solanaStats && !evmStats && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading admin statistics from backend...</p>
            </div>
          )}

          {(!loadingAdmin || solanaStats || evmStats) && (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Recent Activity */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {mergedActivity.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className={`p-4 rounded-lg border ${getSeverityBg(activity.severity)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${getSeverityColor(activity.severity).replace('text-', 'bg-')}`} />
                                <span className={`font-medium ${getSeverityColor(activity.severity)}`}>
                                  {activity.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  activity.chain === 'solana'
                                    ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {activity.chain === 'solana' ? 'SOL' : 'EVM'}
                                </span>
                              </div>
                              <p className="text-gray-900 dark:text-white text-sm">{activity.details}</p>
                              <p className="text-gray-550 dark:text-gray-400 text-xs mt-1">
                                {activity.user ? formatAddress(activity.user) : 'System'} • {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mergedActivity.length === 0 && (
                        <p className="text-gray-550 text-center py-8">No recent activity detected.</p>
                      )}
                    </div>
                  </div>

                  {/* Top Users side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Solana Users */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-900/20 text-purple-400 border border-purple-500/30">Solana</span>
                        <span>Top Solana Users</span>
                      </h3>
                      <div className="space-y-3">
                        {(solanaStats?.topUsers || []).map((user: any, index: number) => (
                          <div key={user.id} className="card p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">#{index + 1}</span>
                                </div>
                                <div>
                                  <p className="text-gray-900 dark:text-white font-medium">{formatAddress(user.address)}</p>
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{user.reputation.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-primary-600 dark:text-primary-400 font-semibold">{user.volume.toFixed(2)} SOL</p>
                                <p className="text-gray-550 dark:text-gray-400 text-sm">{user.totalTrades} trades</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(solanaStats?.topUsers || []).length === 0 && (
                          <p className="text-gray-550 text-center py-8">No Solana trading activity yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Top EVM Users */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-900/20 text-blue-400 border border-blue-500/30">EVM</span>
                        <span>Top EVM Users</span>
                      </h3>
                      <div className="space-y-3">
                        {(evmStats?.topUsers || []).map((user: any, index: number) => (
                          <div key={user.id} className="card p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">#{index + 1}</span>
                                </div>
                                <div>
                                  <p className="text-gray-900 dark:text-white font-medium">{formatAddress(user.address)}</p>
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{user.reputation.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-primary-600 dark:text-primary-400 font-semibold">{user.volume.toFixed(4)} ETH</p>
                                <p className="text-gray-550 dark:text-gray-400 text-sm">{user.totalTrades} trades</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(evmStats?.topUsers || []).length === 0 && (
                          <p className="text-gray-550 text-center py-8">No EVM trading activity yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Solana Settings */}
                    <div className="space-y-6">
                      <div className="card p-6 border border-purple-500/20 bg-purple-950/5">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-900/20 text-purple-400 border border-purple-500/30">Solana</span>
                          Marketplace Settings
                        </h3>

                        {activeChain !== 'solana' && (
                          <div className="p-3 mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                            Please select <strong>Solana Devnet</strong> in the header to modify Solana settings.
                          </div>
                        )}

                        {!marketplace && activeChain === 'solana' && (
                          <div className="card p-4 border-2 border-primary-500/50 bg-primary-900/10 mb-6">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                                <Crown className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Initialize Solana Marketplace</h3>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Marketplace Name
                                </label>
                                <input
                                  type="text"
                                  value={marketplaceName}
                                  onChange={(e) => setMarketplaceName(e.target.value)}
                                  placeholder="Enter marketplace name"
                                  className="input-primary w-full"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Marketplace Fee (Basis Points)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="1000"
                                  value={marketplaceFee}
                                  onChange={(e) => setMarketplaceFee(e.target.value)}
                                  placeholder="250 = 2.5%"
                                  className="input-primary w-full"
                                />
                              </div>

                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-gray-550">Fee: {marketplaceFee ? (parseInt(marketplaceFee) / 100).toFixed(2) : '0'}%</span>
                                <Button
                                  onClick={handleInitializeMarketplace}
                                  loading={loading}
                                  disabled={!marketplaceName || !marketplaceFee}
                                >
                                  Initialize
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-2">
                              Current Solana Fee
                            </label>
                            <div className="p-3 bg-gray-100 dark:bg-dark-400/50 rounded-lg border border-gray-200 dark:border-primary-800/30 mb-2">
                              <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                                {activeChain === 'solana' ? (marketplace?.fee || 2.5) : 2.5}%
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={newFee}
                                onChange={(e) => setNewFee(e.target.value)}
                                placeholder="Enter new Solana fee %"
                                className="input-primary flex-1"
                                disabled={activeChain !== 'solana'}
                              />
                              <Button
                                onClick={handleUpdateFee}
                                loading={loading}
                                disabled={!newFee || activeChain !== 'solana'}
                              >
                                Update Fee
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-2">
                              Current Solana Rate Limit
                            </label>
                            <div className="p-3 bg-gray-100 dark:bg-dark-400/50 rounded-lg border border-gray-200 dark:border-primary-800/30 mb-2">
                              <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                                {activeChain === 'solana' ? (marketplace?.rateLimit || 100) : 100} tx/hour
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="number"
                                min="1"
                                value={newRateLimit}
                                onChange={(e) => setNewRateLimit(e.target.value)}
                                placeholder="Transactions per hour"
                                className="input-primary flex-1"
                                disabled={activeChain !== 'solana'}
                              />
                              <Button
                                loading={loading}
                                disabled={!newRateLimit || activeChain !== 'solana'}
                                onClick={handleUpdateRateLimit}
                              >
                                Update Limit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EVM Settings */}
                    <div className="space-y-6">
                      <div className="card p-6 border border-blue-500/20 bg-blue-950/5">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-900/20 text-blue-400 border border-blue-500/30">EVM</span>
                          Marketplace Settings
                        </h3>

                        {activeChain !== 'evm' && (
                          <div className="p-3 mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                            Please select <strong>Ethereum Sepolia</strong> in the header to modify EVM settings.
                          </div>
                        )}

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-755 dark:text-gray-300 mb-2">
                              Current EVM Fee
                            </label>
                            <div className="p-3 bg-gray-100 dark:bg-dark-400/50 rounded-lg border border-gray-200 dark:border-primary-800/30 mb-2">
                              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                {activeChain === 'evm' ? (marketplace?.fee || 2.5) : 2.5}%
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={newEvmFee}
                                onChange={(e) => setNewEvmFee(e.target.value)}
                                placeholder="Enter new EVM fee %"
                                className="input-primary flex-1"
                                disabled={activeChain !== 'evm'}
                              />
                              <Button
                                onClick={handleUpdateEvmFee}
                                loading={loading}
                                disabled={!newEvmFee || activeChain !== 'evm'}
                              >
                                Update Fee
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-755 dark:text-gray-300 mb-2">
                              Current EVM Rate Limit
                            </label>
                            <div className="p-3 bg-gray-100 dark:bg-dark-400/50 rounded-lg border border-gray-200 dark:border-primary-800/30 mb-2">
                              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                {activeChain === 'evm' ? (marketplace?.rateLimit || 100) : 100} tx/hour
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <input
                                type="number"
                                min="1"
                                value={newEvmRateLimit}
                                onChange={(e) => setNewEvmRateLimit(e.target.value)}
                                placeholder="Transactions per hour"
                                className="input-primary flex-1"
                                disabled={activeChain !== 'evm'}
                              />
                              <Button
                                loading={loading}
                                disabled={!newEvmRateLimit || activeChain !== 'evm'}
                                onClick={handleUpdateEvmRateLimit}
                              >
                                Update Limit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-primary w-full pl-10"
                      />
                    </div>
                    <select
                      value={chainFilter}
                      onChange={(e) => setChainFilter(e.target.value as any)}
                      className="input-primary"
                    >
                      <option value="all">All Chains</option>
                      <option value="solana">Solana Devnet</option>
                      <option value="evm">Ethereum Sepolia</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Users Table */}
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-dark-400/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Chain
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Join Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Trades
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Volume
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-primary-800/30">
                          {filteredUsers.map((user) => (
                            <tr key={user.address} className="hover:bg-gray-50 dark:hover:bg-dark-400/20">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {user.address.slice(0, 2)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-gray-900 dark:text-white font-medium">{formatAddress(user.address)}</p>
                                    <div className="flex items-center space-x-1">
                                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                      <span className="text-gray-500 dark:text-gray-400 text-sm">{user.reputation.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                                  user.chain === 'solana'
                                    ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {user.chain === 'solana' ? 'Solana' : 'Ethereum'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                {new Date(user.joinDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                {user.totalTrades}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-primary-600 dark:text-primary-400 font-semibold">
                                {user.volume.toFixed(user.chain === 'solana' ? 2 : 4)} {user.chain === 'solana' ? 'SOL' : 'ETH'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                  user.status === 'active' 
                                    ? 'bg-green-900/20 text-green-400' 
                                    : 'bg-red-900/20 text-red-400'
                                }`}>
                                  {user.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => {
                                      if (user.chain === 'solana') {
                                        window.open(`https://solscan.io/account/${user.address}?cluster=devnet`, '_blank');
                                      } else {
                                        window.open(`https://sepolia.etherscan.io/address/${user.address}`, '_blank');
                                      }
                                    }}
                                  >
                                    View
                                  </Button>
                                  <Button 
                                    variant={user.status === 'active' ? 'outline' : 'primary'} 
                                    size="sm"
                                    onClick={() => {
                                      if (user.chain === 'solana') {
                                        setSolanaUsers(solanaUsers.map(u => u.address === user.address ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
                                      } else {
                                        setEvmUsers(evmUsers.map(u => u.address === user.address ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
                                      }
                                    }}
                                  >
                                    {user.status === 'active' ? 'Suspend' : 'Activate'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-gray-500">
                                No user history found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Listings Tab */}
              {activeTab === 'listings' && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search listings by NFT name, mint, or seller address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-primary w-full pl-10"
                      />
                    </div>
                    <select
                      value={chainFilter}
                      onChange={(e) => setChainFilter(e.target.value as any)}
                      className="input-primary"
                    >
                      <option value="all">All Chains</option>
                      <option value="solana">Solana Devnet</option>
                      <option value="evm">Ethereum Sepolia</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="sold">Sold</option>
                      <option value="delisted">Delisted</option>
                    </select>
                  </div>

                  {/* Listings Table */}
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-dark-400/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              NFT
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Chain
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Mint Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Maker
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-primary-800/30">
                          {filteredListings.map((listing) => (
                            <tr key={listing.address} className="hover:bg-gray-50 dark:hover:bg-dark-400/20">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={listing.nft?.imageUrl || ''}
                                    alt={listing.nft?.name}
                                    className="w-10 h-10 rounded-lg object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = 'https://images.pexels.com/photos/4000000/pexels-photo-4000000.jpeg?auto=compress&cs=tinysrgb&w=800';
                                    }}
                                  />
                                  <div>
                                    <p className="text-gray-900 dark:text-white font-medium">{listing.nft?.name || 'Unnamed NFT'}</p>
                                    <p className="text-gray-550 dark:text-gray-400 text-xs">{listing.nft?.symbol || 'NFT'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                                  listing.chain === 'solana'
                                    ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {listing.chain === 'solana' ? 'Solana' : 'Ethereum'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 font-mono text-xs">
                                <div className="flex items-center space-x-1">
                                  <span>{formatAddress(listing.nftMint)}</span>
                                  <button onClick={() => copyToClipboard(listing.nftMint)}>
                                    <Copy className="h-3 w-3 text-gray-400" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 font-mono text-xs">
                                <div className="flex items-center space-x-1">
                                  <span>{formatAddress(listing.maker)}</span>
                                  <button onClick={() => copyToClipboard(listing.maker)}>
                                    <Copy className="h-3 w-3 text-gray-400" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-primary-600 dark:text-primary-400 font-semibold">
                                {listing.price} {listing.chain === 'solana' ? 'SOL' : 'ETH'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                  listing.status === 'active' 
                                    ? 'bg-green-900/20 text-green-400' 
                                    : listing.status === 'sold'
                                    ? 'bg-blue-900/20 text-blue-400'
                                    : 'bg-gray-900/20 text-gray-400'
                                }`}>
                                  {listing.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  {listing.status === 'active' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={async () => {
                                        if (listing.chain !== activeChain) {
                                          const targetChainName = listing.chain === 'solana' ? 'Solana Devnet' : 'Ethereum Sepolia';
                                          toast.error(`Please switch active network to ${targetChainName} in the header to delist this NFT.`);
                                          return;
                                        }
                                        await delistNFT(listing.address);
                                        fetchAdminData();
                                      }}
                                    >
                                      Delist
                                    </Button>
                                  )}
                                  <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={() => {
                                      if (listing.chain === 'solana') {
                                        window.open(`https://solscan.io/account/${listing.nftMint}?cluster=devnet`, '_blank');
                                      } else {
                                        if (listing.nftMint?.includes('-')) {
                                          const [contractAddress, tokenId] = listing.nftMint.split('-');
                                          window.open(`https://sepolia.etherscan.io/token/${contractAddress}?a=${tokenId}`, '_blank');
                                        } else {
                                          window.open(`https://sepolia.etherscan.io/address/${listing.nftMint}`, '_blank');
                                        }
                                      }
                                    }}
                                  >
                                    View
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredListings.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-gray-500">
                                No listings found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Volume & Sales</h3>
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-dark-400/30">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Solana Sales
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Solana Volume
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              EVM Sales
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              EVM Volume
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-primary-800/30">
                          {mergedAnalyticsList.map((item) => (
                            <tr key={item.date} className="hover:bg-gray-50 dark:hover:bg-dark-400/20">
                              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                {item.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                {item.solanaSales}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-purple-600 dark:text-purple-400 font-semibold">
                                {item.solanaVolume.toFixed(2)} SOL
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                {item.evmSales}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-blue-600 dark:text-blue-400 font-semibold">
                                {item.evmVolume.toFixed(4)} ETH
                              </td>
                            </tr>
                          ))}
                          {mergedAnalyticsList.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-gray-500">
                                No sales data recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Activity</h3>
                    <select
                      value={chainFilter}
                      onChange={(e) => setChainFilter(e.target.value as any)}
                      className="input-primary"
                    >
                      <option value="all">All Chains</option>
                      <option value="solana">Solana Devnet</option>
                      <option value="evm">Ethereum Sepolia</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    {filteredActivity.map((act) => (
                      <div key={act.id} className={`p-4 rounded-lg border ${getSeverityBg(act.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${getSeverityColor(act.severity).replace('text-', 'bg-')}`} />
                              <span className={`font-medium ${getSeverityColor(act.severity)}`}>
                                {act.type.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                act.chain === 'solana'
                                  ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {act.chain === 'solana' ? 'SOL' : 'EVM'}
                              </span>
                            </div>
                            <p className="text-gray-900 dark:text-white text-sm">{act.details}</p>
                            <p className="text-gray-550 dark:text-gray-400 text-xs mt-1">
                              {act.user ? formatAddress(act.user) : 'System'} • {act.timestamp ? new Date(act.timestamp).toLocaleString() : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredActivity.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No activity recorded yet.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}