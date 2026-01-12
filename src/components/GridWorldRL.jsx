import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Trophy, TrendingUp, BarChart3, X, Zap, Target, Award } from 'lucide-react';

const GridWorldRL = () => {
  // ========== CONFIGURATION ==========
  const GRID_SIZE = 8;
  const CELL_SIZE = 60;
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
  
  const LEARNING_RATE = 0.1;
  const DISCOUNT_FACTOR = 0.9;
  const EPSILON = 0.2;
  
  const REWARD_GOAL = 100;
  const REWARD_STEP = -1;
  const REWARD_WALL = -10;
  
  // ========== GAME STATE ==========
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [episode, setEpisode] = useState(1);
  const [stepCount, setStepCount] = useState(0);
  const [currentReward, setCurrentReward] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  
  const [episodeStartTime, setEpisodeStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [episodeHistory, setEpisodeHistory] = useState([]);
  const [floatingReward, setFloatingReward] = useState(null);
  
  const [agentX, setAgentX] = useState(0);
  const [agentY, setAgentY] = useState(0);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);
  
  const goalPos = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  const walls = [
    { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 },
    { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
    { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }
  ];
  
  const qTableRef = useRef({});
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // ========== LOGIC ==========
  const getStateKey = (x, y) => `${x},${y}`;
  const initQValues = (key) => { if (!qTableRef.current[key]) qTableRef.current[key] = [0, 0, 0, 0]; };
  const isWall = (x, y) => walls.some(w => w.x === x && w.y === y);
  const isValid = (x, y) => x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !isWall(x, y);

  const executeStep = (x, y) => {
    const key = getStateKey(x, y);
    initQValues(key);
    let actionIdx = Math.random() < EPSILON ? Math.floor(Math.random() * 4) : 
      qTableRef.current[key].indexOf(Math.max(...qTableRef.current[key]));
    const acts = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    const move = acts[actionIdx];
    let nX = x + move.dx;
    let nY = y + move.dy;
    let reward = REWARD_STEP;
    if (!isValid(nX, nY)) { reward = REWARD_WALL; nX = x; nY = y; }
    else if (nX === goalPos.x && nY === goalPos.y) reward = REWARD_GOAL;
    const nKey = getStateKey(nX, nY);
    initQValues(nKey);
    const oldQ = qTableRef.current[key][actionIdx];
    const maxNextQ = Math.max(...qTableRef.current[nKey]);
    qTableRef.current[key][actionIdx] = oldQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - oldQ);
    return { nX, nY, reward };
  };

  const handleTogglePlay = () => {
    if (!isRunning && !isPaused) { setEpisodeStartTime(Date.now()); setIsRunning(true); } 
    else { setIsPaused(!isPaused); }
  };

  const startNextEpisode = () => {
    setEpisode(prev => prev + 1); // Fixed Sequence
    setStepCount(0); setTotalReward(0);
    setTargetX(0); setTargetY(0);
    setAgentX(0); setAgentY(0);
    setEpisodeStartTime(Date.now());
    setIsRunning(true); setIsPaused(false);
  };

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const delays = [800, 500, 300, 150, 50];
    const loop = setInterval(() => {
      const { nX, nY, reward } = executeStep(targetX, targetY);
      setTargetX(nX); setTargetY(nY);
      setStepCount(prev => prev + 1); // Sequential counting
      setCurrentReward(reward);
      setTotalReward(t => t + reward);
      setFloatingReward({ x: nX, y: nY, value: reward, timestamp: Date.now() });

      if (nX === goalPos.x && nY === goalPos.y) {
        setIsRunning(false);
        const time = (Date.now() - episodeStartTime) / 1000;
        const currentEp = episode;
        setEpisodeHistory(prev => [...prev, { ep: currentEp, steps: stepCount + 1, time, reward: totalReward + reward }]);
        setShowWinPopup(true);
        setCountdown(5);
      }
    }, delays[speed - 1]);
    return () => clearInterval(loop);
  }, [isRunning, isPaused, speed, targetX, targetY, episode, stepCount, totalReward]);

  useEffect(() => {
    if (showWinPopup) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { setShowWinPopup(false); startNextEpisode(); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimerRef.current);
  }, [showWinPopup]);

  useEffect(() => {
    const animate = () => {
      setAgentX(p => p + (targetX - p) * 0.2);
      setAgentY(p => p + (targetY - p) * 0.2);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [targetX, targetY]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE);
    ctx.strokeStyle = '#eef2f6';
    for(let i=0; i<=GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i*CELL_SIZE,0); ctx.lineTo(i*CELL_SIZE,CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*CELL_SIZE); ctx.lineTo(CANVAS_SIZE,i*CELL_SIZE); ctx.stroke();
    }
    ctx.fillStyle = '#334155';
    walls.forEach(w => ctx.fillRect(w.x*CELL_SIZE+4, w.y*CELL_SIZE+4, CELL_SIZE-8, CELL_SIZE-8));
    ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚪', goalPos.x*CELL_SIZE+30, goalPos.y*CELL_SIZE+30);
    ctx.fillText('🚶', agentX*CELL_SIZE+30, agentY*CELL_SIZE+30);
    if (floatingReward && Date.now() - floatingReward.timestamp < 1000) {
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = floatingReward.value > 0 ? '#10b981' : (floatingReward.value < -1 ? '#ef4444' : '#64748b');
      ctx.fillText(floatingReward.value > 0 ? `+${floatingReward.value}` : floatingReward.value, 
                  floatingReward.x*CELL_SIZE+30, floatingReward.y*CELL_SIZE-10);
    }
  }, [agentX, agentY, floatingReward]);

  const avgSteps = episodeHistory.length ? (episodeHistory.reduce((acc, h) => acc + h.steps, 0) / episodeHistory.length).toFixed(1) : 0;
  const bestReward = episodeHistory.length ? Math.max(...episodeHistory.map(h => h.reward)).toFixed(0) : 0;
  const readiness = episodeHistory.length > 3 ? Math.min(99, Math.round((episodeHistory.length * 5) + 50)) : 0;

  return (
    <div className="flex h-screen w-screen bg-gradient-to-b from-sky-100 to-blue-200 overflow-hidden p-6 gap-6 font-sans text-slate-700">
      
      {/* LEFT: GAME BOARD */}
      <div className="flex-none flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black flex items-center justify-center gap-2">🎓 Q-Learning Grid World</h1>
          <p className="text-slate-400 text-sm">Watch the agent learn and improve over episodes</p>
        </div>

        <div className="relative border-[12px] border-slate-50 rounded-3xl shadow-inner overflow-hidden">
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          
          {/* ICON BADGE RE-ADDED: Total Reward Badge */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-xl shadow-md border border-slate-100 min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1 bg-amber-100 rounded-md text-amber-600"><Target size={12}/></div>
               <p className="text-[10px] font-bold text-slate-400 uppercase">Episode Reward</p>
            </div>
            <p className={`text-xl font-black ${totalReward >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalReward.toFixed(0)}</p>
            <p className="text-[10px] text-slate-400">Last: <span className="font-bold text-slate-600">{bestReward}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 w-full">
          <div className="bg-[#f0f7ff] p-4 rounded-2xl text-center"><p className="text-[10px] font-bold text-blue-400 uppercase">Episode</p><p className="text-2xl font-black text-blue-600">{episode}</p></div>
          <div className="bg-[#f5f3ff] p-4 rounded-2xl text-center"><p className="text-[10px] font-bold text-purple-400 uppercase">Steps</p><p className="text-2xl font-black text-purple-600">{stepCount}</p></div>
          <div className="bg-[#fff7ed] p-4 rounded-2xl text-center"><p className="text-[10px] font-bold text-orange-400 uppercase">Time (s)</p><p className="text-2xl font-black text-orange-600">{(stepCount * 0.1).toFixed(1)}</p></div>
        </div>
      </div>

      {/* MIDDLE: SMART CONTROLS */}
      <div className="flex-none w-56 flex flex-col justify-center gap-4">
        <button onClick={handleTogglePlay} className={`h-20 rounded-3xl font-black text-xl shadow-lg flex items-center justify-center gap-3 ${!isRunning || isPaused ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
          {(!isRunning && !isPaused) ? <><Play fill="currentColor"/> START</> : isPaused ? <><Play fill="currentColor"/> RESUME</> : <><Pause fill="currentColor"/> PAUSE</>}
        </button>
        <button onClick={() => window.location.reload()} className="h-16 bg-rose-500 text-white rounded-2xl font-bold shadow-md flex items-center justify-center gap-2"><RotateCcw size={20}/> RESET GAME</button>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-300 uppercase text-center mb-3">Speed</p>
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2">
            <button onClick={()=>setSpeed(s=>Math.max(1,s-1))}><ChevronDown/></button>
            <span className="font-black text-slate-600">{speed}/5</span>
            <button onClick={()=>setSpeed(s=>Math.min(5,s+1))}><ChevronUp/></button>
          </div>
        </div>
      </div>

      {/* RIGHT: LEARNING PROGRESS */}
      <div className="flex-1 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3"><TrendingUp className="text-indigo-500" /><h2 className="font-bold text-lg">Learning Progress</h2></div>
        
        <div className="flex-1 overflow-y-auto px-6">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-400 text-xs sticky top-0 bg-white py-4"><tr className="border-b border-slate-50"><th>Ep</th><th>Steps</th><th className="text-center">Time(s)</th><th className="text-right">Reward</th><th className="text-center">✓</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {episodeHistory.slice().reverse().map((h, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 font-bold text-blue-600">{h.ep}</td>
                  <td className="py-4 text-slate-500">{h.steps}</td>
                  <td className="py-4 text-center text-slate-500">{h.time.toFixed(1)}</td>
                  <td className={`py-4 text-right font-bold ${h.reward < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{h.reward.toFixed(0)}</td>
                  <td className="py-4 text-center"><Trophy size={16} className="text-amber-400 inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY STATS RE-ADDED: Total Ep, Success, Best Reward */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Summary</p>
          <div className="grid grid-cols-2 gap-y-3 text-xs">
             <div className="flex justify-between pr-4 border-r border-slate-200">
                <span className="text-slate-500">Total Episodes:</span>
                <span className="font-black text-slate-700">{episodeHistory.length}</span>
             </div>
             <div className="flex justify-between pl-4">
                <span className="text-slate-500">Success Rate:</span>
                <span className="font-black text-emerald-500">100%</span>
             </div>
             <div className="flex justify-between pr-4 border-r border-slate-200">
                <span className="text-slate-500">Avg Steps:</span>
                <span className="font-black text-slate-700">{avgSteps}</span>
             </div>
             <div className="flex justify-between pl-4">
                <span className="text-slate-500">Best Reward:</span>
                <span className="font-black text-emerald-500">{bestReward}</span>
             </div>
          </div>
        </div>
      </div>

      {/* POPUPS REMAIN THE SAME */}
      {showWinPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-b-[12px] border-emerald-500 animate-in zoom-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Goal Reached!</h2>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={() => { setShowWinPopup(false); startNextEpisode(); }} className="relative w-full py-4 bg-emerald-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 overflow-hidden">
                <div className="relative w-6 h-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="transparent" />
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="transparent" strokeDasharray="62.8"
                      style={{ strokeDashoffset: 62.8 - (62.8 * countdown) / 5, transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                </div>
                <span>CONTINUE NOW ({countdown}s)</span>
              </button>
              <button onClick={()=>{setShowWinPopup(false); setIsRunning(false); setShowFinalResults(true);}} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">STOP TRAINING</button>
            </div>
          </div>
        </div>
      )}

      {showFinalResults && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
            {/* <button onClick={()=>setShowFinalResults(false)} className="absolute top-8 right-8 text-slate-300"><X size={32}/></button> */}
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-indigo-100 text-indigo-600 rounded-3xl"><BarChart3 size={40}/></div>
              <div><h2 className="text-4xl font-black text-slate-800">Training Complete</h2><p className="text-slate-400 font-bold uppercase text-sm">Deployment Readiness: {readiness}%</p></div>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-10">
               <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100"><p className="text-slate-400 font-bold text-xs uppercase">Episodes</p><p className="text-4xl font-black">{episodeHistory.length}</p></div>
               <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100"><p className="text-slate-400 font-bold text-xs uppercase">Best Path Reward</p><p className="text-4xl font-black text-emerald-500">{bestReward}</p></div>
               <div className="p-6 bg-indigo-600 text-white rounded-[2rem] flex flex-col justify-center items-center shadow-lg">
                  <Zap className="mb-1" size={24}/>
                  <p className="font-black text-2xl">{readiness}% Ready</p>
                  <p className="text-[10px] uppercase font-bold opacity-80">Autonomous Score</p>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto mb-8 space-y-2">
              {episodeHistory.map((h, i) => (
                <div key={i} className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-indigo-600">Episode #{h.ep}</span>
                  <span className="text-slate-400">{h.steps} steps</span>
                  <span className={`font-black ${h.reward < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Reward: {h.reward.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>window.location.reload()} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl">START NEW SESSION</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GridWorldRL;