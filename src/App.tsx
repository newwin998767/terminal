import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Server, Database, Terminal as TerminalIcon, LayoutDashboard } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TerminalComponent from './components/TerminalComponent';

interface StaticInfo {
  cpu: any;
  osInfo: any;
  diskLayout: any[];
  fsSize: any[];
}

interface StreamData {
  mem: any;
  currentLoad: any;
  time: any;
}

interface ChartData {
  time: string;
  cpu: number;
  memory: number;
}

export default function App() {
  const [staticInfo, setStaticInfo] = useState<StaticInfo | null>(null);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [history, setHistory] = useState<ChartData[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'terminal'>('dashboard');

  useEffect(() => {
    fetch('/api/sysinfo/static')
      .then((res) => res.json())
      .then((data) => setStaticInfo(data))
      .catch(console.error);

    const eventSource = new EventSource('/api/sysinfo/stream');
    eventSource.onmessage = (event) => {
      const data: StreamData = JSON.parse(event.data);
      setStreamData(data);
      
      setHistory((prev) => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        const newPoint = {
          time: timeStr,
          cpu: data.currentLoad?.currentLoad != null ? Math.round(data.currentLoad.currentLoad) : 0,
          memory: data.mem?.active != null && data.mem?.total != null && data.mem.total > 0
            ? Math.round((data.mem.active / data.mem.total) * 100)
            : 0,
        };
        
        const newHistory = [...prev, newPoint];
        if (newHistory.length > 60) {
          newHistory.shift();
        }
        return newHistory;
      });
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (!staticInfo || !streamData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 animate-pulse text-emerald-500" />
          <p className="text-zinc-400 font-mono text-sm">Initializing Telemetry...</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes == null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const memUsedPercent = streamData.mem?.active != null && streamData.mem?.total != null && streamData.mem.total > 0
    ? ((streamData.mem.active / streamData.mem.total) * 100).toFixed(1)
    : '0.0';
  const cpuLoadPercent = streamData.currentLoad?.currentLoad != null
    ? streamData.currentLoad.currentLoad.toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Server className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">System Monitor</h1>
              <p className="text-sm text-zinc-500 font-mono">{staticInfo.osInfo?.hostname || 'Unknown Host'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'terminal' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TerminalIcon className="w-4 h-4" />
                Terminal
              </button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Cpu className="w-5 h-5" />
                  <h2 className="text-sm font-medium uppercase tracking-wider">CPU Usage</h2>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-light tracking-tight">{cpuLoadPercent}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-auto">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${cpuLoadPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500 font-mono truncate" title={staticInfo.cpu?.brand}>
                  {staticInfo.cpu?.brand || 'Unknown CPU'}
                </p>
              </div>

              {/* Memory Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Database className="w-5 h-5" />
                  <h2 className="text-sm font-medium uppercase tracking-wider">Memory</h2>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-light tracking-tight">{memUsedPercent}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-auto">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${memUsedPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  {formatBytes(streamData.mem?.active)} / {formatBytes(streamData.mem?.total)}
                </p>
              </div>

              {/* OS Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Activity className="w-5 h-5" />
                  <h2 className="text-sm font-medium uppercase tracking-wider">System</h2>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-lg font-medium">{staticInfo.osInfo?.distro || 'Unknown OS'}</span>
                  <span className="text-sm text-zinc-400">{staticInfo.osInfo?.release || ''} ({staticInfo.osInfo?.arch || 'unknown arch'})</span>
                </div>
                <div className="mt-auto pt-4 border-t border-zinc-800/50">
                  <p className="text-xs text-zinc-500 font-mono">
                    Uptime: {Math.floor((streamData.time?.uptime || 0) / 3600)}h {Math.floor(((streamData.time?.uptime || 0) % 3600) / 60)}m
                  </p>
                </div>
              </div>

              {/* Disk Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-zinc-400">
                  <HardDrive className="w-5 h-5" />
                  <h2 className="text-sm font-medium uppercase tracking-wider">Storage</h2>
                </div>
                <div className="flex flex-col gap-3 mt-2 overflow-y-auto max-h-24 pr-2 custom-scrollbar">
                  {staticInfo.fsSize && staticInfo.fsSize.length > 0 ? staticInfo.fsSize.map((disk, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-300 truncate max-w-[120px]" title={disk?.fs}>{disk?.fs || 'Unknown'}</span>
                        <span className="text-zinc-400 font-mono">{formatBytes(disk?.size)}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1">
                        <div 
                          className="bg-zinc-500 h-1 rounded-full" 
                          style={{ width: `${disk?.use || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <span className="text-sm text-zinc-500">No disk info available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-6">Resource History (60s)</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#52525b" 
                      fontSize={12} 
                      tickMargin={10}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#52525b" 
                      fontSize={12} 
                      tickFormatter={(val) => `${val}%`} 
                      domain={[0, 100]}
                      tickCount={6}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '14px' }}
                      labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      name="CPU"
                      dataKey="cpu" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      name="Memory"
                      dataKey="memory" 
                      stroke="#6366f1" 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col h-[600px]">
            <div className="flex items-center gap-3 text-zinc-400 p-4 border-b border-zinc-800">
              <TerminalIcon className="w-5 h-5" />
              <h2 className="text-sm font-medium uppercase tracking-wider">Interactive Terminal</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <TerminalComponent />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
