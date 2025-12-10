import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DetectionPanel } from './components/DetectionPanel';
import { SimulationPanel } from './components/SimulationPanel';
import { generateEmergencyReport } from './services/geminiService';
import { 
  DrowsinessState, 
  SimulationState, 
  DetectionMetrics,
  EmergencyLog 
} from './types';
import { 
  MAX_SPEED, 
  WARNING_SPEED, 
  CRITICAL_SPEED, 
  TIME_TO_WARNING, 
  TIME_TO_CRITICAL,
  PROBATION_TIME,
  COLOR_NORMAL,
  COLOR_WARNING,
  COLOR_CRITICAL,
  HEAD_PITCH_THRESHOLD
} from './constants';

const App: React.FC = () => {
  // --- State ---
  const [drowsinessState, setDrowsinessState] = useState<DrowsinessState>(DrowsinessState.NORMAL);
  const [simState, setSimState] = useState<SimulationState>({
    speed: MAX_SPEED,
    hazardsOn: false,
    honking: false,
    distanceTraveled: 0
  });
  const [metrics, setMetrics] = useState<DetectionMetrics>({
    ear: 0,
    eyesClosedDuration: 0,
    blinkCount: 0,
    blinksPerMinute: 0,
    headPitch: 0,
    headYaw: 0,
    drowsinessScore: 0,
    fps: 0
  });
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [probationActive, setProbationActive] = useState(false);
  
  // Logic Refs
  const lastStateRef = useRef<DrowsinessState>(DrowsinessState.NORMAL);
  const probationEndTimeRef = useRef<number>(0);
  const hasCalledGeminiRef = useRef<boolean>(false);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = (message: string, type: EmergencyLog['type'] = 'info') => {
    setLogs(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
    }, ...prev.slice(0, 14)]);
  };

  // --- Strict Logic Engine ---
  const handleMetricsUpdate = useCallback((newMetrics: DetectionMetrics) => {
    setMetrics(newMetrics);

    const closedMs = newMetrics.eyesClosedDuration * 1000;
    const isProbation = Date.now() < probationEndTimeRef.current;
    setProbationActive(isProbation);

    let nextState = drowsinessState;

    // 1. Critical Trigger (Instant if > 10s OR Relapse in Probation)
    if (closedMs > TIME_TO_CRITICAL) {
        nextState = DrowsinessState.CRITICAL;
    } 
    // Relapse Logic: If in probation and eyes close for > 2s (stricter than normal 10s)
    else if (isProbation && closedMs > 3000) {
        nextState = DrowsinessState.CRITICAL;
        if (drowsinessState !== DrowsinessState.CRITICAL) {
            addLog("CRITICAL: Drowsiness relapse during probation!", "critical");
        }
    }
    // 2. Warning Trigger (2s - 10s)
    else if (closedMs > TIME_TO_WARNING) {
        // If we are already Critical, don't downgrade to Warning unless fully recovered
        if (drowsinessState !== DrowsinessState.CRITICAL) {
            nextState = DrowsinessState.WARNING;
        }
    }
    // 3. Recovery Logic (Eyes Open)
    else if (closedMs < 200) {
        // Only recover if we were not Critical (Critical requires manual reset or long timeout - simplified here to auto-recover after 5s of open eyes)
        if (drowsinessState === DrowsinessState.WARNING) {
            nextState = DrowsinessState.NORMAL;
        } else if (drowsinessState === DrowsinessState.CRITICAL) {
             // To exit Critical, eyes must be open for a while. 
             // We handle this via a separate recovery check effect or simplified here:
             // If score drops below 20, recover.
             if (newMetrics.drowsinessScore < 20) {
                nextState = DrowsinessState.NORMAL;
             }
        } else {
            nextState = DrowsinessState.NORMAL;
        }
    }

    // State Transition Handling
    if (nextState !== lastStateRef.current) {
        // Recovery Handler
        if (lastStateRef.current === DrowsinessState.CRITICAL && nextState === DrowsinessState.NORMAL) {
            probationEndTimeRef.current = Date.now() + PROBATION_TIME;
            addLog("Driver recovered. ENTERING PROBATION (5 MIN).", "alert");
            hasCalledGeminiRef.current = false; // Reset AI trigger
        }
        else if (nextState === DrowsinessState.WARNING) {
            addLog("WARNING: Eyes closed > 2s. Slowing down.", "alert");
        }
        else if (nextState === DrowsinessState.CRITICAL) {
            addLog("CRITICAL: Emergency Stop Triggered.", "critical");
        }

        setDrowsinessState(nextState);
        lastStateRef.current = nextState;
    }
  }, [drowsinessState]);

  // --- Simulation Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
        setSimState(prev => {
            let targetSpeed = MAX_SPEED;
            let hazards = false;
            let honk = false;

            if (drowsinessState === DrowsinessState.WARNING) {
                targetSpeed = WARNING_SPEED;
                hazards = true;
            } else if (drowsinessState === DrowsinessState.CRITICAL) {
                targetSpeed = CRITICAL_SPEED;
                hazards = true;
                honk = true;
            }

            // Physics: Decelerate faster in emergency
            const lerpFactor = drowsinessState === DrowsinessState.CRITICAL ? 0.1 : 0.02;
            const newSpeed = prev.speed + (targetSpeed - prev.speed) * lerpFactor;

            return {
                speed: Math.max(0, newSpeed),
                hazardsOn: hazards,
                honking: honk,
                distanceTraveled: prev.distanceTraveled + (prev.speed / 3600)
            };
        });
    }, 16); // ~60 FPS
    return () => clearInterval(interval);
  }, [drowsinessState]);

  // --- Gemini AI Emergency Report ---
  useEffect(() => {
    const triggerGemini = async () => {
        if (drowsinessState === DrowsinessState.CRITICAL && !hasCalledGeminiRef.current) {
            hasCalledGeminiRef.current = true;
            addLog("System: Contacting AI Emergency Services...", "info");
            
            // Artificial delay for realism
            setTimeout(async () => {
                 const report = await generateEmergencyReport(metrics.eyesClosedDuration);
                 addLog(`🚑 EMS DISPATCHED: "${report}"`, "ai");
            }, 2500);
        }
    };
    triggerGemini();
  }, [drowsinessState, metrics.eyesClosedDuration]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-mono overflow-hidden">
      {/* Header */}
      <header className="mb-4 flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                GUARDIAN AI
            </h1>
            <p className="text-slate-500 text-xs">Autonomous Driver Safety System</p>
        </div>
        
        {/* Probation Status */}
        {probationActive && (
             <div className="px-3 py-1 bg-purple-900/50 border border-purple-500/50 rounded text-purple-200 text-xs animate-pulse">
                PROBATION MONITORING ACTIVE
             </div>
        )}

        <div className="flex gap-4">
            <div className="text-right">
                <div className="text-xs text-slate-500">SYSTEM STATE</div>
                <div style={{ color: 
                    drowsinessState === 'NORMAL' ? COLOR_NORMAL : 
                    drowsinessState === 'WARNING' ? COLOR_WARNING : COLOR_CRITICAL 
                }} className="font-bold text-lg leading-none">
                    {drowsinessState}
                </div>
            </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        
        {/* Left Column: AI Detection (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Camera */}
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-black">
                <DetectionPanel onMetricsUpdate={handleMetricsUpdate} status={drowsinessState} />
                
                {/* Overlay Metrics */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4 pt-10">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-xs text-slate-400">DROWSINESS SCORE</div>
                            <div className={`text-3xl font-bold ${metrics.drowsinessScore > 50 ? 'text-red-500' : 'text-white'}`}>
                                {metrics.drowsinessScore.toFixed(0)}<span className="text-sm text-slate-500">/100</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-400">HEAD TILT</div>
                            <div className={`text-xl font-bold ${metrics.headPitch > HEAD_PITCH_THRESHOLD ? 'text-red-500' : 'text-green-400'}`}>
                                {metrics.headPitch > HEAD_PITCH_THRESHOLD ? 'BAD' : 'GOOD'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 flex-1 max-h-[200px]">
                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">BLINK RATE</div>
                    <div className="text-2xl font-bold text-blue-400">{metrics.blinksPerMinute} <span className="text-xs text-slate-600">bpm</span></div>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-xs text-slate-500">EYES CLOSED</div>
                    <div className={`text-2xl font-bold ${metrics.eyesClosedDuration > 2 ? 'text-red-500' : 'text-white'}`}>
                        {metrics.eyesClosedDuration.toFixed(1)}s
                    </div>
                </div>
                 <div className="bg-slate-900 p-3 rounded border border-slate-800 col-span-2">
                    <div className="text-xs text-slate-500 mb-1">EAR (Eye Openness)</div>
                    <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-200"
                            style={{ width: `${Math.min(metrics.ear * 350, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>Closed</span>
                        <span>Open</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Simulation & Logs (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
             {/* 3D Simulation */}
             <div className="flex-[3] relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                <SimulationPanel simState={simState} drowsinessState={drowsinessState} />
                
                {/* Sim HUD */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className={`flex flex-col items-center ${simState.hazardsOn ? 'opacity-100' : 'opacity-20'}`}>
                            <div className="w-8 h-8 rounded-full bg-amber-500 animate-pulse flex items-center justify-center">⚠</div>
                            <span className="text-[10px] mt-1 font-bold text-amber-500">HAZARDS</span>
                        </div>
                         <div className={`flex flex-col items-center ${simState.honking ? 'opacity-100' : 'opacity-20'}`}>
                            <div className="w-8 h-8 rounded-full bg-red-500 animate-bounce flex items-center justify-center">🔊</div>
                             <span className="text-[10px] mt-1 font-bold text-red-500">HORN</span>
                        </div>
                    </div>
                </div>
             </div>

             {/* Console Logs */}
             <div className="flex-1 bg-black rounded-xl border border-slate-800 p-4 font-mono text-sm overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Event Log</span>
                    <span className="text-[10px] text-green-500">● LIVE</span>
                </div>
                <div className="overflow-y-auto flex-1 space-y-1">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 text-xs">
                            <span className="text-slate-600 w-16 shrink-0">{log.timestamp}</span>
                            <span className={`break-all
                                ${log.type === 'critical' ? 'text-red-500 font-bold bg-red-500/10 px-1 rounded' : ''}
                                ${log.type === 'alert' ? 'text-amber-400' : ''}
                                ${log.type === 'ai' ? 'text-cyan-400 italic' : ''}
                                ${log.type === 'info' ? 'text-slate-400' : ''}
                            `}>
                                {log.type === 'ai' && '🤖 '}{log.message}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-slate-700 italic">System initialized. Waiting for sensor data...</div>}
                </div>
             </div>
        </div>

      </main>
    </div>
  );
};

export default App;