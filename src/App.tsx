import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence, Reorder, useMotionValue } from 'motion/react';
import { X, Sprout, List, ArchiveRestore, Archive, Pencil, CalendarPlus, Search, GripVertical, Settings, Minus, Square } from 'lucide-react';
import { desktopBridge } from './platform/desktop.ts';
import { ALL_FLOWERS, GardenFlower } from './components/GardenFlower.tsx';

type ItemType = 'todo' | 'grass';

const dateToYMD = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Step {
  id: string;
  title: string;
  completed: boolean;
}

interface Item {
  id: string;
  title: string;
  completed: boolean;
  type: ItemType;
  importance: number;
  flowerId?: string;
  showUntilDays: number;
  isDaily: boolean;
  isLight: boolean;
  steps: Step[];
  interest: number;
  speedLevel: number;
  createdAt: number;
  updatedAt?: number;
  completedDates?: string[];
  stepsCompletedDates?: Record<string, string[]>;
  inGarden?: boolean;
  dateStr: string;
  endDate?: string;
  position: { x: number; y: number };
  order?: number;
}

const STORAGE_KEYS = {
  items: 'todays-flower_items_v7',
  maxCompletedFlowers: 'todays-flower_max_completed_flowers',
  maxUncompletedFlowers: 'todays-flower_max_uncompleted_flowers',
  backgroundColor: 'todays-flower_bg_color',
  weather: 'todays-flower_weather',
  language: 'todays-flower_language',
  flowerSelection: 'todays-flower_flower_selection',
  lastVisitDate: 'todays-flower_last_visit_date',
  notificationInterval: 'todays-flower_notification_interval',
  notificationEnabled: 'todays-flower_notification_enabled',
  notificationMinImportance: 'todays-flower_notification_min_importance',
} as const;

const LEGACY_STORAGE_KEYS = {
  items: ['jflow_items_v7'],
  maxCompletedFlowers: ['jflow_max_cb'],
  maxUncompletedFlowers: ['jflow_max_ucb'],
  backgroundColor: ['jflow_bg_color'],
  weather: ['jflow_weather'],
  language: ['jflow_lang'],
  flowerSelection: ['jflow_flower_selection'],
  lastVisitDate: ['jflow_last_visit_date'],
  notificationInterval: ['jflow_notif_interval'],
  notificationMinImportance: ['jflow_notif_min_imp'],
} as const;

const readStoredValue = (key: string, legacyKeys: readonly string[] = []) => {
  for (const candidate of [key, ...legacyKeys]) {
    const value = localStorage.getItem(candidate);

    if (value !== null) {
      if (candidate !== key) {
        localStorage.setItem(key, value);
      }

      return value;
    }
  }

  return null;
};

type DragOffset = { x: number; y: number };

const dragRegionStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragRegionStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

type TitleBarProps = {
  onOpenSettings: () => void;
  t: (en: string, zh: string) => string;
  isDarkBg: boolean;
};

const TitleBar = ({ onOpenSettings, t, isDarkBg }: TitleBarProps) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleMinimize = () => {
    void desktopBridge.minimizeMainWindow();
  };

  const handleToggleMaximize = () => {
    void desktopBridge.toggleMaximizeMainWindow();
  };

  const handleClose = () => {
    void desktopBridge.closeMainWindow();
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-4 z-[9000]"
      style={dragRegionStyle}
      onDoubleClick={handleToggleMaximize}
    >
      <div className={`text-[13px] font-medium pointer-events-none select-none tracking-wide ${isDarkBg ? 'text-white/60' : 'text-neutral-500/80'}`}>
        {timeStr}
      </div>

      <div
        className="flex items-center gap-1.5"
        style={noDragRegionStyle}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onOpenSettings}
          className={`w-[26px] h-[26px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${isDarkBg ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-neutral-400 hover:text-neutral-600'}`}
          title={t('Settings', '设置')}
          aria-label={t('Settings', '设置')}
        >
          <Settings size={14} strokeWidth={2} />
        </button>
        <button
          onClick={handleMinimize}
          className={`w-[26px] h-[26px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${isDarkBg ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-neutral-400 hover:text-neutral-600'}`}
          title={t('Minimize', '最小化')}
          aria-label={t('Minimize', '最小化')}
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <button
          onClick={handleToggleMaximize}
          className={`w-[26px] h-[26px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${isDarkBg ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-neutral-400 hover:text-neutral-600'}`}
          title={t('Maximize', '最大化')}
          aria-label={t('Maximize', '最大化')}
        >
          <Square size={12} strokeWidth={2.5} />
        </button>
        <button
          onClick={handleClose}
          className={`w-[26px] h-[26px] flex items-center justify-center rounded-full hover:bg-red-500 hover:text-white transition-colors cursor-pointer ml-1 ${isDarkBg ? 'text-white/50' : 'text-neutral-400'}`}
          title={t('Close', '关闭')}
          aria-label={t('Close', '关闭')}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

interface DraggableFlowerShellProps {
  key?: React.Key;
  item: Item;
  zIndex: number;
  onDragStart: () => void;
  onDragMove: (target: EventTarget | null, itemId: string) => void;
  onDragCommit: (id: string, offset: DragOffset) => void;
  onDragRelease: () => void;
  children: React.ReactNode;
}

function DraggableFlowerShell({
  item,
  zIndex,
  onDragStart,
  onDragMove,
  onDragCommit,
  onDragRelease,
  children,
}: DraggableFlowerShellProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={onDragStart}
      onDrag={(event) => {
        onDragMove(event.target, item.id);
      }}
      onDragEnd={(_, info) => {
        if (Math.hypot(info.offset.x, info.offset.y) >= 3) {
          flushSync(() => {
            onDragCommit(item.id, info.offset);
          });
        }

        x.set(0);
        y.set(0);
        onDragRelease();
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 outline-none cursor-grab active:cursor-grabbing"
      style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, zIndex, x, y }}
    >
      {children}
    </motion.div>
  );
}

const MinimalColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(30);
  const [l, setL] = useState(95);

  useEffect(() => {
    if (color.startsWith('hsl(')) {
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (match) {
        setH(Number(match[1]));
        setS(Number(match[2]));
        setL(Number(match[3]));
      }
    }
  }, [color]);

  const updateColor = (newH: number, newS: number, newL: number) => {
    setH(newH);
    setS(newS);
    setL(newL);
    onChange(`hsl(${newH}, ${newS}%, ${newL}%)`);
  };

  return (
    <div className="flex flex-col gap-3 p-2 w-[160px]">
      <div 
        className="w-full h-12 rounded-[10px] border border-neutral-200/60" 
        style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }} 
      />
      <div className="flex flex-col gap-2.5 mt-1">
        <input 
          type="range" min="0" max="360" value={h} 
          onChange={e => updateColor(Number(e.target.value), s, l)} 
          className="w-full h-2.5 rounded-full appearance-none outline-none minimal-color-range bg-transparent" 
          style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }} 
        />
        <input 
          type="range" min="0" max="100" value={s} 
          onChange={e => updateColor(h, Number(e.target.value), l)} 
          className="w-full h-2.5 rounded-full appearance-none outline-none minimal-color-range bg-transparent" 
          style={{ background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))` }} 
        />
        <input 
          type="range" min="0" max="100" value={l} 
          onChange={e => updateColor(h, s, Number(e.target.value))} 
          className="w-full h-2.5 rounded-full appearance-none outline-none minimal-color-range bg-transparent" 
          style={{ background: `linear-gradient(to right, #000, hsl(${h}, ${s}%, 50%), #fff)` }} 
        />
      </div>
    </div>
  );
};

const getVisibleTodoItemsForDate = (items: Item[], targetDate: Date) => {
  const targetYMD = dateToYMD(targetDate);
  const targetTime = new Date(`${targetYMD}T00:00:00`).getTime();

  return items
    .filter((item) => {
      if (item.type !== 'todo') return false;
      if (item.dateStr === targetYMD) return true;

      const itemTime = new Date(`${item.dateStr}T00:00:00`).getTime();

      if (item.isDaily && targetTime >= itemTime) {
        if (item.endDate && targetYMD >= item.endDate) return false;
        return true;
      }

      if (item.showUntilDays > 0) {
        const expireTime = itemTime + item.showUntilDays * 24 * 60 * 60 * 1000;
        return targetTime >= itemTime && targetTime <= expireTime;
      }

      return false;
    })
    .map((item) => {
      if (!item.isDaily) {
        return item;
      }

      return {
        ...item,
        completed: item.completedDates?.includes(targetYMD) || false,
        steps: item.steps.map((step) => ({
          ...step,
          completed: item.stepsCompletedDates?.[step.id]?.includes(targetYMD) || false,
        })),
      };
    });
};

const buildReminderTaskSummaries = (
  items: Item[],
  targetDate: Date,
  minImportance: number,
): ReminderTaskSummary[] => {
  const threshold = Math.min(3, Math.max(1, Math.floor(minImportance || 1)));

  return getVisibleTodoItemsForDate(items, targetDate)
    .filter((item) => item.importance >= threshold && item.title.trim())
    .sort((left, right) => {
      if (right.importance !== left.importance) {
        return right.importance - left.importance;
      }

      return (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt);
    })
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      importance: item.importance,
      flowerId: item.flowerId,
      completed: !!item.completed,
    }));
};

const getValidPosition = (existingPos: {x: number, y: number}[]) => {
  let x = 50, y = 50;
  let attempts = 0;
  while (attempts < 200) {
    x = 10 + Math.random() * 80;
    // Generate lower in the screen: 50% to 92%
    y = 50 + Math.random() * 42; 

    // Title & Calendar area 
    if (y < 42 && x > 25 && x < 75) { attempts++; continue; } 
    // Input area (push extreme bottom ones to the side to avoid the input field)
    if (y > 84 && x > 20 && x < 80) { attempts++; continue; } 
    // Left Nav
    if (y > 85 && x < 25) { attempts++; continue; } 

    let overlap = false;
    for (const pos of existingPos) {
       const dx = pos.x - x;
       // Weight Y more heavily? No, let's keep it similar
       const dy = (pos.y - y) * 1.5; 
       const dist = Math.sqrt(dx*dx + dy*dy);
       if (dist < 20) {  
          overlap = true;
          break;
       }
    }
    if (!overlap) break;
    attempts++;
  }
  return { x, y };
};

const getLuminance = (hex: string) => {
  if (!hex) return 255;
  const c = hex.replace('#', '');
  if (c.length !== 6 && c.length !== 3) return 255;
  let r = 255, g = 255, b = 255;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const FLOWER_SELECTION_GROUPS = [
  { displayId: 'todo_example', ids: ['todo_example'] },
  { displayId: 'todo1', ids: ['todo1', 'todo1_pink'] },
  { displayId: 'todo3', ids: ['todo3', 'todo3_white'] },
  { displayId: 'todo4', ids: ['todo4'] },
  { displayId: 'todo5', ids: ['todo5', 'todo5_white', 'todo5_v2', 'todo5_white_v2'] },
  { displayId: 'todo6', ids: ['todo6'] },
  { displayId: 'todo7', ids: ['todo7'] },
  { displayId: 'todo8', ids: ['todo8'] },
] as const;

const DEFAULT_FLOWER_SELECTION: Record<number, string[]> = {
  1: ['todo3', 'todo3_white', 'todo4'],
  2: ['todo1', 'todo1_pink', 'todo5', 'todo5_white', 'todo5_v2', 'todo5_white_v2'],
  3: ['todo_example'],
};

const FLOWER_SELECTOR_DISPLAY_IDS = FLOWER_SELECTION_GROUPS.map((group) => group.displayId);
const FLOWER_GROUP_IDS = new Set(FLOWER_SELECTION_GROUPS.flatMap((group) => group.ids));

const getFlowerGroupIds = (flowerId: string) => {
  const group = FLOWER_SELECTION_GROUPS.find((candidate) => (candidate.ids as readonly string[]).includes(flowerId));
  return group ? [...group.ids] : [];
};

const normalizeFlowerSelection = (selection?: Record<number, string[]>) => {
  const normalized: Record<number, string[]> = {
    1: [...DEFAULT_FLOWER_SELECTION[1]],
    2: [...DEFAULT_FLOWER_SELECTION[2]],
    3: [...DEFAULT_FLOWER_SELECTION[3]],
  };

  ([1, 2, 3] as const).forEach((level) => {
    if (!Array.isArray(selection?.[level])) {
      return;
    }

    const rawIds = selection[level];
    const nextIds: string[] = [];

    FLOWER_SELECTION_GROUPS.forEach((group) => {
      if (group.ids.some((flowerId) => rawIds.includes(flowerId))) {
        nextIds.push(...group.ids);
      }
    });

    if (rawIds.includes('todo2') && !nextIds.includes('todo4')) {
      nextIds.push('todo4');
    }

    normalized[level] = nextIds;
  });

  return normalized;
};

const MiniFlower = ({ flowerId, selected }: { flowerId: string, selected: boolean }) => {
  if (flowerId === 'todo7') {
    return (
      <svg width="50" height="50" viewBox="5 5 40 40" fill="currentColor" className={`transition-colors flex-shrink-0 ${selected ? 'text-white' : 'text-[#879f3c]'}`}>
        <path d="M27.69,39.87c-2.99-19.4-6.85-2.7-9.51,5.49,0,0,5.68-11.68,5.64-13,.36-1.48,3,9.5,3.86,7.52Z"/>
        <path d="M27.3,40.5s5.09-14.12,7.1-14.72c8.78-4.93.28,1.86-7.1,14.96-1.39,1.62,7.86-48.9,6.31-26.42"/>
        <path d="M27.16,41.34c2.51-11.36-14.01-17.59-23.1-21.79,7.13-.15,28.05,11.87,23.1,21.79Z"/>
        <path d="M27.69,39.53c-.89-.72-4.56-31.67-14.6-26.28,0,0,11.58-9.31,14.6,26.28Z"/>
        <path d="M26.97,38.19c.06-1.46,6-34.92,14.76-19.7,0,0-8.26-12.28-14.76,19.7Z"/>
        <path d="M28.13,38.19c-1.08-6.97,5.64-29.18-10.99-18.76,18.56-8.15,3.75,16.85,10.99,18.76Z"/>
      </svg>
    )
  }

  if (flowerId === 'todo8') {
    return (
      <svg width="50" height="50" viewBox="5 5 40 40" className={`transition-colors flex-shrink-0 ${selected ? 'text-white' : 'text-[#879f3c]'}`}>
        <path fill="currentColor" d="M27.28,12.14s-5.93-4.65-4.41-1.85c1.63,1.66,4.48,5.58,4.41,1.85Z"/>
        <path fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth=".75px" d="M26.52,11.99c1.79,7.46-4.98,24.43-3.85,31.35"/>
        <path fill="currentColor" d="M25.97,23.47s16.08-7.82,11.11-2.59c-2.68,2.01-12.44,5.66-11.11,2.59Z"/>
        <path fill="currentColor" d="M26.71,20.09s-12.38-8.18-10.92-5.09c1.86,3.49,12.52,7.83,10.92,5.09Z"/>
        <path fill="currentColor" d="M26.83,16.58s-6.03-4.61-5.88-3.33c.62,3.38,6.72,5.57,5.88,3.33Z"/>
        <path fill="currentColor" d="M24.79,27.64s8.72-1.62,10.83-3.53c5.05,1.09-13.24,7.44-10.83,3.53Z"/>
        <path fill="currentColor" d="M23.89,31.79s10.25-4.29,8.55-2.43c-1.96,1.5-9.66,5-8.55,2.43Z"/>
        <path fill="currentColor" d="M26.16,19.74s15.4-9.51,8.81-2.52c-2.59,1.9-9.85,5.71-8.81,2.52Z"/>
        <path fill="currentColor" d="M26.42,15.38s6.66-3.53,6.44-2.63c-1.25,2.81-7.29,5.57-6.44,2.63Z"/>
        <path fill="currentColor" d="M26.49,12.3s4.86-4.41,4.34-2.37c-.89,1.74-5.47,5.45-4.34,2.37Z"/>
        <path fill="currentColor" d="M25.81,23.87s-12.62-7.54-12.75-6.7c-.74,2.05,13.4,10.9,12.75,6.7Z"/>
        <path fill="currentColor" d="M25.29,28.07s-10.31-6.97-11.05-6.51c-1.61,1.05,10.8,9,11.05,6.51Z"/>
        <path fill="currentColor" d="M24.33,31.69s-9.59-6.04-9.31-4.86c.48,2.41,8.4,7.2,9.31,4.86Z"/>
      </svg>
    )
  }

  const shapes = ALL_FLOWERS[flowerId];
  if (!shapes) return null;
  
  if (shapes.customBlossoms && shapes.customBlossoms.length > 0) {
    const blossom = shapes.customBlossoms[0];
    return (
      <svg width="50" height="50" viewBox="0 0 40 40" fill="none" className={`transition-colors flex-shrink-0 overflow-visible ${selected ? 'text-white' : 'text-neutral-400 opacity-50'}`}>
        <svg x="-5" y="-5" width="50" height="50" viewBox={blossom.viewBox || "0 0 70 70"} className="overflow-visible">
          {blossom.bloom || blossom.bud}
        </svg>
      </svg>
    );
  }
  
  const content = shapes.bloom || shapes.bud;
  
  return (
    <svg width="50" height="50" viewBox="0 0 40 40" fill="none" className={`transition-colors flex-shrink-0 overflow-visible ${selected ? 'text-white' : 'text-neutral-400 opacity-50'}`}>
      <g transform="translate(20, 20) scale(1.6) translate(-30, -30)">
         {content}
      </g>
    </svg>
  );
};
  
const YearMonthPicker = ({ 
  currentDate, 
  onApply,
  t,
  isDarkBg,
  isSettingsOpen
}: { 
  currentDate: Date, 
  onApply: (y: number, m: number) => void,
  t: (en: string, zh: string) => string,
  isDarkBg?: boolean,
  isSettingsOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [y, setY] = useState(currentDate.getFullYear());
  const [m, setM] = useState(currentDate.getMonth());
  
  const years = Array.from({length: 10}, (_, i) => currentDate.getFullYear() - 5 + i);
  const months = Array.from({length: 12}, (_, i) => i);
  
  const yearContainerRef = useRef<HTMLDivElement>(null);
  const monthContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setY(currentDate.getFullYear());
    setM(currentDate.getMonth());
  }, [currentDate, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (yearContainerRef.current) {
           const yIdx = years.indexOf(currentDate.getFullYear());
           if (yIdx !== -1) yearContainerRef.current.scrollTop = yIdx * 40;
        }
        if (monthContainerRef.current) {
           monthContainerRef.current.scrollTop = currentDate.getMonth() * 40;
        }
      }, 50);
    }
  }, [isOpen, currentDate]);

  return (
    <div className={`absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center ${isSettingsOpen ? 'z-10' : 'z-[10000]'}`} style={noDragRegionStyle}>
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className={`text-[14px] font-serif tracking-[0.1em] transition-colors ${isDarkBg ? 'text-white/60 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
       >
         {t(`${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`, `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`)}
       </button>
       
       <AnimatePresence>
       {isOpen && (
         <motion.div 
           initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
           className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-xl flex flex-col w-[240px] overflow-hidden ${isDarkBg ? 'bg-white/10' : 'bg-white/95'}`}
         >
            <div className="flex justify-between h-48">
               <div ref={yearContainerRef} className={`flex-1 overflow-y-auto hide-scrollbar text-center border-r py-2 scroll-smooth ${isDarkBg ? 'border-white/10' : 'border-neutral-100'}`}>
                 {years.map(year => (
                    <div 
                      key={year} onClick={() => setY(year)}
                      className={`h-10 flex items-center justify-center cursor-pointer transition-colors text-xs font-serif ${y === year ? (isDarkBg ? 'bg-white text-black font-medium shadow-sm rounded-md mx-2' : 'bg-neutral-900 text-white font-medium shadow-sm rounded-md mx-2') : (isDarkBg ? 'hover:bg-white/20 text-white/90 mx-2 rounded-md' : 'hover:bg-neutral-100 text-neutral-600 mx-2 rounded-md')}`}
                    >
                       {year}
                    </div>
                 ))}
               </div>
               <div ref={monthContainerRef} className="flex-1 overflow-y-auto hide-scrollbar text-center py-2 scroll-smooth">
                 {months.map(month => (
                    <div 
                      key={month} onClick={() => setM(month)}
                      className={`h-10 flex items-center justify-center cursor-pointer transition-colors text-xs font-serif tracking-widest ${m === month ? (isDarkBg ? 'bg-white text-black font-medium shadow-sm rounded-md mx-2' : 'bg-neutral-900 text-white font-medium shadow-sm rounded-md mx-2') : (isDarkBg ? 'hover:bg-white/20 text-white/90 mx-2 rounded-md' : 'hover:bg-neutral-100 text-neutral-600 mx-2 rounded-md')}`}
                    >
                       {String(month + 1).padStart(2, '0')}
                    </div>
                 ))}
               </div>
            </div>
            <button 
              onClick={() => { onApply(y, m); setIsOpen(false); }}
              className={`w-full py-4 border-t text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${isDarkBg ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900'}`}
            >
              Apply
            </button>
         </motion.div>
       )}
       </AnimatePresence>
    </div>
  );
};

const HorizontalCalendar = ({ 
  selectedDate, 
  activeTab,
  onSelectDate,
  t,
  setIsFlowerSelectorOpen,
  setIsWishlistModalOpen,
  isDarkBg
}: { 
  selectedDate: Date, 
  activeTab: string,
  onSelectDate: (d: Date) => void,
  t: (en: string, zh: string) => string,
  setIsFlowerSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setIsWishlistModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  isDarkBg: boolean
}) => {
  const [anchorDate, setAnchorDate] = useState(selectedDate);
  const [slideDirection, setSlideDirection] = useState<'left'|'right'|'none'>('none');
  const wheelAccumulator = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
     if (selectedDate > anchorDate) setSlideDirection('left');
     else if (selectedDate < anchorDate) setSlideDirection('right');
     else setSlideDirection('none');
     setAnchorDate(selectedDate);
  }, [selectedDate]);

  const handleWheel = (e: React.WheelEvent) => {
     wheelAccumulator.current += (e.deltaX || e.deltaY);
     const threshold = 60;
     if (Math.abs(wheelAccumulator.current) > threshold) {
        const days = Math.trunc(wheelAccumulator.current / threshold);
        // limit days to -1, 0, 1 to prevent huge jumps, and cap accumulator
        const safeDays = Math.sign(days) * Math.min(Math.abs(days), 1);
        wheelAccumulator.current = 0; // reset to avoid accumulated fast scrolling
        setSlideDirection(safeDays > 0 ? 'left' : 'right');
        setAnchorDate(prev => {
           const nd = new Date(prev);
           nd.setDate(nd.getDate() + safeDays);
           return nd;
        });
     }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
     touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     if (touchStartX.current === null) return;
     const deltaX = touchStartX.current - e.touches[0].clientX;
     const threshold = 40;
     if (Math.abs(deltaX) > threshold) {
        const days = deltaX > 0 ? 1 : -1;
        setSlideDirection(days > 0 ? 'left' : 'right');
        setAnchorDate(prev => {
           const nd = new Date(prev);
           nd.setDate(nd.getDate() + days);
           return nd;
        });
        touchStartX.current = e.touches[0].clientX;
     }
  };

  const handleTouchEnd = () => {
     touchStartX.current = null;
  };

  const datesLeft = useMemo(() => {
    const arr = [];
    for(let i = -1; i >= -14; i--) {
       const d = new Date(anchorDate);
       d.setDate(anchorDate.getDate() + i);
       arr.push(d);
    }
    return arr;
  }, [anchorDate]);

  const datesRight = useMemo(() => {
    const arr = [];
    for(let i = 1; i <= 14; i++) {
       const d = new Date(anchorDate);
       d.setDate(anchorDate.getDate() + i);
       arr.push(d);
    }
    return arr;
  }, [anchorDate]);

  return (
      <div 
         className="absolute top-[70px] left-0 w-full h-[80px] flex items-center justify-center pointer-events-auto select-none overflow-x-clip overflow-y-visible z-40" 
         onWheel={handleWheel}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
      >
         <div className="absolute left-0 right-[calc(50%+140px)] md:right-[calc(50%+200px)] h-full flex flex-row-reverse justify-start items-center gap-[6vw] md:gap-[4vw] pr-[2vw] md:pr-[2vw] mask-fade-left overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {datesLeft.map((d) => (
                  <motion.div 
                    layout
                    key={`l-${d.getTime()}`}
                    initial={{ opacity: 0, x: slideDirection === 'left' ? 40 : (slideDirection === 'right' ? -40 : 0) }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDirection === 'left' ? -40 : (slideDirection === 'right' ? 40 : 0) }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onClick={() => onSelectDate(d)}
                    className={`cursor-pointer font-serif text-[18px] transition-colors duration-300 shrink-0 ${isHovered ? (isDarkBg ? 'text-white/60 hover:text-white' : 'text-neutral-500 hover:text-neutral-900') : (isDarkBg ? 'text-white/40 opacity-40 hover:opacity-100' : 'text-neutral-400 opacity-40 hover:opacity-100')}`}
                  >
                    {d.getDate()}
                  </motion.div>
              ))}
           </AnimatePresence>
        </div>

        <div className="flex flex-col items-center justify-center w-[280px] md:w-[400px] shrink-0 pointer-events-none relative h-full">
            <h1 className={`font-serif text-[36px] md:text-[54px] leading-tight ${isDarkBg ? 'text-white' : 'text-neutral-900'} tracking-tight mt-1 flex items-baseline justify-center whitespace-nowrap overflow-visible pointer-events-auto`} style={{ textShadow: isDarkBg ? 'none' : '0 4px 20px rgba(249, 248, 246, 0.8)' }}>
               <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(4px)' }}
                    transition={{ duration: 0.4 }}
                    className="flex items-baseline"
                  >
                    {activeTab === 'todo' ? (
                       <motion.div 
                         onClick={() => setIsFlowerSelectorOpen(true)}
                         initial="initial"
                         whileHover="hover"
                         className={`pl-6 md:pl-8 flex items-baseline cursor-pointer transition-colors duration-300 pointer-events-auto ${isDarkBg ? 'hover:text-white/80' : 'hover:text-black hover:drop-shadow-[0_0_15px_rgba(0,0,0,0.15)]'}`}
                       >
                         {"Today's Flow".split("").map((char, index) => (
                             <motion.span
                                 key={index}
                                 className="inline-block"
                                 variants={{
                                     initial: { y: 0, scale: 1 },
                                     hover: {
                                         y: -4,
                                         scale: 1.1,
                                         transition: { type: "spring", stiffness: 300, damping: 15, delay: index * 0.03 }
                                     }
                                 }}
                             >
                                 {char === " " ? "\u00A0" : char}
                             </motion.span>
                         ))}
                         <motion.span 
                            className={`font-light italic text-[24px] md:text-[36px] ml-[2px] inline-block ${isDarkBg ? 'text-white/40' : 'text-neutral-400'}`}
                            variants={{
                                initial: { y: 0, scale: 1 },
                                hover: {
                                    y: -4,
                                    scale: 1.1,
                                    transition: { type: "spring", stiffness: 300, damping: 15, delay: 12 * 0.03 }
                                }
                            }}
                         >
                            er
                         </motion.span>
                       </motion.div>
                    ) : (
                       <motion.div 
                         onClick={() => setIsWishlistModalOpen(true)}
                         initial="initial"
                         whileHover="hover"
                         className={`pl-4 md:pl-6 flex items-baseline cursor-pointer transition-colors duration-300 pointer-events-auto ${isDarkBg ? 'hover:text-white/80' : 'hover:text-black hover:drop-shadow-[0_0_15px_rgba(0,0,0,0.15)]'}`}
                       >
                         {"To Grow".split("").map((char, index) => (
                             <motion.span
                                 key={index}
                                 className="inline-block"
                                 variants={{
                                     initial: { y: 0, scale: 1 },
                                     hover: {
                                         y: -4,
                                         scale: 1.1,
                                         transition: { type: "spring", stiffness: 300, damping: 15, delay: index * 0.03 }
                                     }
                                 }}
                             >
                                 {char === " " ? "\u00A0" : char}
                             </motion.span>
                         ))}
                       </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
            </h1>
            <div className="relative flex flex-col items-center w-full mt-1">
               <div className="relative w-[60px] h-[36px] overflow-hidden flex items-center justify-center [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
                  <AnimatePresence initial={false}>
                    <motion.div 
                       key={selectedDate.getTime()}
                       initial={{ opacity: 0, x: slideDirection === 'left' ? 40 : (slideDirection === 'right' ? -40 : 0) }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: slideDirection === 'left' ? -40 : (slideDirection === 'right' ? 40 : 0) }}
                       transition={{ duration: 0.4, ease: "easeOut" }}
                       className={`absolute font-serif text-[24px] md:text-[28px] leading-none ${isDarkBg ? 'text-white' : 'text-neutral-900'}`}
                    >
                       {selectedDate.getDate()}
                    </motion.div>
                  </AnimatePresence>
               </div>
               
               {dateToYMD(selectedDate) !== dateToYMD(new Date()) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectDate(new Date()); }}
                    className={`absolute top-full mt-2 text-[10px] tracking-widest font-sans uppercase pointer-events-auto transition-colors whitespace-nowrap ${isDarkBg ? 'text-white/50 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
                  >
                    {t('Return to Today', '返回今日')}
                  </button>
               )}
            </div>
        </div>

        <div className="absolute left-[calc(50%+140px)] md:left-[calc(50%+200px)] right-0 h-full flex justify-start items-center gap-[6vw] md:gap-[4vw] pl-[2vw] md:pl-[2vw] mask-fade-right overflow-hidden">
           <AnimatePresence mode="popLayout" initial={false}>
              {datesRight.map((d) => (
                  <motion.div 
                    layout
                    key={`r-${d.getTime()}`}
                    initial={{ opacity: 0, x: slideDirection === 'left' ? 40 : (slideDirection === 'right' ? -40 : 0) }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDirection === 'left' ? -40 : (slideDirection === 'right' ? 40 : 0) }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onClick={() => onSelectDate(d)}
                    className={`cursor-pointer font-serif text-[18px] transition-colors duration-300 shrink-0 ${isHovered ? (isDarkBg ? 'text-white/60 hover:text-white' : 'text-neutral-500 hover:text-neutral-900') : (isDarkBg ? 'text-white/40 opacity-40 hover:opacity-100' : 'text-neutral-400 opacity-40 hover:opacity-100')}`}
                  >
                    {d.getDate()}
                  </motion.div>
              ))}
           </AnimatePresence>
        </div>
      </div>
  );
};

const WeatherOverlay = React.memo(({ weather }: { weather: 'sunny' | 'rainy' }) => {
  const rainDrops = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const leftValue = -10 + Math.random() * 140; 
      const left = `${leftValue}%`;
      const animationDuration = `${0.5 + Math.random() * 0.5}s`;
      const animationDelay = `-${Math.random() * 5}s`;
      const opacity = 0.3 + Math.random() * 0.4;
      return { left, opacity, animationDuration, animationDelay };
    });
  }, []);

  const waterStreaks = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const leftValue = -10 + Math.random() * 140;
      const left = `${leftValue}%`;
      const animationDuration = `${10 + Math.random() * 15}s`;
      const animationDelay = `-${Math.random() * 20}s`;
      const w = 25 + Math.random() * 40;
      const h = 200 + Math.random() * 300;
      const opacity = 0.2 + Math.random() * 0.3;
      return { left, animationDuration, animationDelay, w, h, opacity };
    });
  }, []);

  if (weather === 'sunny') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {weather === 'rainy' && rainDrops.map((drop, i) => (
        <div
          key={`r-${i}`}
          className="absolute top-[-10%] w-[3px] h-[40px] bg-neutral-400/20 backdrop-blur-[2px] rounded-full"
          style={{
            left: drop.left, opacity: drop.opacity, animationDuration: drop.animationDuration, animationDelay: drop.animationDelay,
            animation: `fall-rain ${drop.animationDuration} linear infinite ${drop.animationDelay}`
          }}
        />
      ))}
      
      {weather === 'rainy' && waterStreaks.map((streak, i) => (
        <div
          key={`streak-${i}`}
          className="absolute top-[-20%] bg-white/5 backdrop-blur-xl rounded-full"
          style={{
            left: streak.left, width: `${streak.w}px`, height: `${streak.h}px`, opacity: streak.opacity, animationDuration: streak.animationDuration, animationDelay: streak.animationDelay,
            animation: `fall-streak ${streak.animationDuration} linear infinite ${streak.animationDelay}`
          }}
        />
      ))}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fall-rain {
          0% { transform: translate(0, -10vh) rotate(15deg); }
          100% { transform: translate(-32vh, 110vh) rotate(15deg); }
        }
        @keyframes fall-snow-left {
          0% { transform: translateY(-10vh) translateX(0) scale(1); }
          50% { transform: translateY(50vh) translateX(20px) scale(1.1); }
          100% { transform: translateY(110vh) translateX(0) scale(1); }
        }
        @keyframes fall-snow-right {
          0% { transform: translateY(-10vh) translateX(0) scale(1); }
          50% { transform: translateY(50vh) translateX(-20px) scale(1.1); }
          100% { transform: translateY(110vh) translateX(0) scale(1); }
        }
        @keyframes fall-streak {
          0% { transform: translate(0, -20vh) rotate(15deg); }
          100% { transform: translate(-35vh, 120vh) rotate(15deg); }
        }
      `}} />
    </div>
  );
});

const GuideBubble = ({
  id,
  visible,
  onDismiss,
  positionClasses,
  text,
  pointerSvg,
}: {
  id: string;
  visible: boolean;
  onDismiss: (id: string) => void;
  positionClasses: string;
  text: string;
  pointerSvg?: React.ReactNode;
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`absolute z-[9999] pointer-events-auto flex items-start gap-3 bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-2xl p-4 text-[12px] font-medium text-neutral-700 tracking-wide max-w-[280px] min-w-[200px] leading-relaxed ${positionClasses}`}
        >
          {pointerSvg && (
            <div className="absolute inset-0 pointer-events-none z-[-1]">
              {pointerSvg}
            </div>
          )}
          <span className="flex-1 break-words">{text}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDismiss(id);
            }}
            className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-neutral-500 transition-colors cursor-pointer"
            aria-label="Dismiss guide"
            title="Dismiss guide"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const today = new Date();
  const [items, setItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<ItemType>('todo');
  const [inputValue, setInputValue] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<Record<string, {x: string, y: number}>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [anchorDate, setAnchorDate] = useState<Date>(today);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistSearchQuery, setWishlistSearchQuery] = useState('');
  const [isWishlistSearchVisible, setIsWishlistSearchVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isBgColorPickerOpen, setIsBgColorPickerOpen] = useState(false);
  const [visibleGuides, setVisibleGuides] = useState<string[]>([]);
  const [bgColor, setBgColor] = useState('#F9F8F6');
  const isDarkBg = getLuminance(bgColor) < 128;
  const [weather, setWeather] = useState<'sunny' | 'rainy'>('sunny');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [maxCompletedFlowers, setMaxCompletedFlowers] = useState(6);
  const [maxUncompletedFlowers, setMaxUncompletedFlowers] = useState(8);
  const [notificationInterval, setNotificationInterval] = useState(60);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = useState(false);
  const [notificationMinImportance, setNotificationMinImportance] = useState(1);
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [launchAtLoginStatus, setLaunchAtLoginStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [isFlowerSelectorOpen, setIsFlowerSelectorOpen] = useState(false);
  const [activeFlowerTab, setActiveFlowerTab] = useState<number>(1);
  const [flowerSelection, setFlowerSelection] = useState<Record<number, string[]>>(() => normalizeFlowerSelection());
  const [reminderDateKey, setReminderDateKey] = useState(() => dateToYMD(new Date()));
  const isDraggingRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const dismissGuide = (guideId: string) => {
    setVisibleGuides((prev) => prev.filter((id) => id !== guideId));
  };

  // Load preferences
  useEffect(() => {
    const mc = readStoredValue(
      STORAGE_KEYS.maxCompletedFlowers,
      LEGACY_STORAGE_KEYS.maxCompletedFlowers,
    );
    if (mc) setMaxCompletedFlowers(parseInt(mc, 10));
    const mu = readStoredValue(
      STORAGE_KEYS.maxUncompletedFlowers,
      LEGACY_STORAGE_KEYS.maxUncompletedFlowers,
    );
    if (mu) setMaxUncompletedFlowers(parseInt(mu, 10));
    const bg = readStoredValue(STORAGE_KEYS.backgroundColor, LEGACY_STORAGE_KEYS.backgroundColor);
    if (bg) setBgColor(bg);
    const w = readStoredValue(STORAGE_KEYS.weather, LEGACY_STORAGE_KEYS.weather);
    if (w === 'rainy' || w === 'sunny') setWeather(w);
    const l = readStoredValue(STORAGE_KEYS.language, LEGACY_STORAGE_KEYS.language);
    if (l === 'en' || l === 'zh') setLanguage(l);

    const fs = readStoredValue(STORAGE_KEYS.flowerSelection, LEGACY_STORAGE_KEYS.flowerSelection);
    if (fs) {
      try { 
        const parsed = JSON.parse(fs) as Record<number, string[]>;
        const normalized = normalizeFlowerSelection(parsed);
        setFlowerSelection(normalized);
        localStorage.setItem(STORAGE_KEYS.flowerSelection, JSON.stringify(normalized));
      } catch (e) {}
    }
    
    // Automatically open modal on daily first startup
    const visitDate = readStoredValue(STORAGE_KEYS.lastVisitDate, LEGACY_STORAGE_KEYS.lastVisitDate);
    const todayStr = dateToYMD(today);
    if (visitDate !== todayStr) {
      setIsFlowerSelectorOpen(true);
      localStorage.setItem(STORAGE_KEYS.lastVisitDate, todayStr);
    }
    
    const ni = readStoredValue(
      STORAGE_KEYS.notificationInterval,
      LEGACY_STORAGE_KEYS.notificationInterval,
    );
    if (ni) setNotificationInterval(parseInt(ni, 10));
    
    const ne = readStoredValue(STORAGE_KEYS.notificationEnabled);
    if (ne === 'false') setIsNotificationEnabled(false);
    const nmi = readStoredValue(
      STORAGE_KEYS.notificationMinImportance,
      LEGACY_STORAGE_KEYS.notificationMinImportance,
    );
    if (nmi) setNotificationMinImportance(parseInt(nmi, 10));
  }, []);

  useEffect(() => {
    if (!desktopBridge.isElectron) {
      return;
    }

    let isCurrent = true;

    void desktopBridge
      .getLaunchAtLogin()
      .then((settings) => {
        if (!isCurrent) {
          return;
        }

        setLaunchAtLogin(settings.openAtLogin);
        setLaunchAtLoginStatus('idle');
      })
      .catch(() => {
        if (isCurrent) {
          setLaunchAtLoginStatus('error');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const saveMaxCompleted = (v: number) => {
    setMaxCompletedFlowers(v);
    localStorage.setItem(STORAGE_KEYS.maxCompletedFlowers, v.toString());
  };

  const saveMaxUncompleted = (v: number) => {
    setMaxUncompletedFlowers(v);
    localStorage.setItem(STORAGE_KEYS.maxUncompletedFlowers, v.toString());
  };
  
  const saveNotificationInterval = (v: number) => {
    setNotificationInterval(v);
    localStorage.setItem(STORAGE_KEYS.notificationInterval, v.toString());
  };

  const saveNotificationEnabled = (enabled: boolean) => {
    setIsNotificationEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.notificationEnabled, enabled.toString());
  };

  const saveNotificationMinImportance = (v: number) => {
    setNotificationMinImportance(v);
    localStorage.setItem(STORAGE_KEYS.notificationMinImportance, v.toString());
  };

  const saveLaunchAtLogin = async (enabled: boolean) => {
    if (!desktopBridge.isElectron) {
      return;
    }

    setLaunchAtLogin(enabled);
    setLaunchAtLoginStatus('saving');

    try {
      const settings = await desktopBridge.setLaunchAtLogin({ openAtLogin: enabled });
      setLaunchAtLogin(settings.openAtLogin);
      setLaunchAtLoginStatus('idle');
    } catch (error) {
      setLaunchAtLogin(!enabled);
      setLaunchAtLoginStatus('error');
    }
  };
  const saveBgColor = (c: string) => {
    setBgColor(c);
    localStorage.setItem(STORAGE_KEYS.backgroundColor, c);
  };

  const saveWeather = (w: 'sunny' | 'rainy') => {
    setWeather(w);
    localStorage.setItem(STORAGE_KEYS.weather, w);
  };

  const saveLanguage = (l: 'en' | 'zh') => {
    setLanguage(l);
    localStorage.setItem(STORAGE_KEYS.language, l);
  };

  const t = (en: string, zh: string) => language === 'en' ? en : zh;
  const getImportanceLabel = (value: number) => {
    if (value >= 3) return t('Essential', '很重要');
    if (value === 2) return t('Important', '重要');
    return t('Normal', '普通');
  };
  const getEstimatedTimeLabel = (value?: number) => {
    if ((value || 2) <= 1) return t('Quick', '很快');
    if ((value || 2) === 2) return t('Some Time', '要一段时间');
    return t('Long', '比较久');
  };
  const getInterestLabel = (value?: number) => {
    if ((value || 2) <= 1) return t('Maybe', '有点种草');
    if ((value || 2) === 2) return t('Interested', '种草');
    return t('Really Want', '很想拔草');
  };

  // Spices state
  const [importance, setImportance] = useState(2);
  const [showUntilDays, setShowUntilDays] = useState(0); 
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [interest, setInterest] = useState(2);
  const [speedLevel, setSpeedLevel] = useState(2);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readStoredValue(STORAGE_KEYS.items, LEGACY_STORAGE_KEYS.items);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {}
    } else {
      setItems([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  useEffect(() => {
    const refreshReminderDateKey = () => {
      setReminderDateKey(dateToYMD(new Date()));
    };

    refreshReminderDateKey();
    const intervalId = window.setInterval(refreshReminderDateKey, 60 * 1000);
    window.addEventListener('focus', refreshReminderDateKey);
    document.addEventListener('visibilitychange', refreshReminderDateKey);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshReminderDateKey);
      document.removeEventListener('visibilitychange', refreshReminderDateKey);
    };
  }, []);

  const reminderTasks = useMemo(() => {
    const reminderDate = new Date(`${reminderDateKey}T00:00:00`);
    return buildReminderTaskSummaries(items, reminderDate, notificationMinImportance);
  }, [items, reminderDateKey, notificationMinImportance]);

  useEffect(() => {
    if (!isLoaded || !desktopBridge.isElectron) {
      return;
    }

    void desktopBridge.updateReminderState({
      intervalMinutes: isNotificationEnabled ? notificationInterval : 0,
      language,
      tasks: reminderTasks,
    });
    
    void desktopBridge.updateTrayMenu({
      lang: language,
      isNotificationEnabled,
      notificationInterval,
    });
  }, [isLoaded, language, notificationInterval, isNotificationEnabled, reminderTasks]);

  useEffect(() => {
    if (!desktopBridge.isElectron) return;

    return desktopBridge.onTraySettingsChanged((payload) => {
      setIsNotificationEnabled(payload.isNotificationEnabled);
      localStorage.setItem(STORAGE_KEYS.notificationEnabled, String(payload.isNotificationEnabled));
      
      setNotificationInterval(payload.notificationInterval);
      localStorage.setItem(STORAGE_KEYS.notificationInterval, String(payload.notificationInterval));
    });
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const lines = inputValue.split('\n').map(l => l.trim()).filter(Boolean);
    const mainTitle = lines.length > 0 ? lines[0] : '';
    const parsedSteps = lines.slice(1).map((line, idx) => ({
      id: Math.random().toString(36).substring(2, 9) + idx,
      title: line.replace(/^[-\d.]+\s*/, ''),
      completed: false
    }));

    if (editingItemId) {
      setItems((prev) => prev.map(item => {
        if (item.id === editingItemId) {
           return {
             ...item,
             title: mainTitle,
             steps: parsedSteps.map(ps => {
                // try to preserve completion state if title matches? Too complex, just use new step states or preserve if same index
                const existing = item.steps?.find(s => s.title === ps.title);
                return existing ? { ...ps, id: existing.id, completed: existing.completed } : ps;
             }),
             importance,
             showUntilDays,
             isDaily,
             isLight,
             interest,
             speedLevel,
             updatedAt: Date.now()
           };
        }
        return item;
      }));
      setEditingItemId(null);
    } else {
      let randomFlowerId: string | undefined;
      if (activeTab === 'todo') {
        const available = (flowerSelection[importance] || DEFAULT_FLOWER_SELECTION[importance] || [])
          .filter((flowerId) => Boolean(ALL_FLOWERS[flowerId]));
        if (available && available.length > 0) {
           randomFlowerId = available[Math.floor(Math.random() * available.length)];
        } else {
           randomFlowerId = DEFAULT_FLOWER_SELECTION[importance]?.[0] || 'todo4';
        }
      } else {
        const grassChoices = ['todo_example', 'todo3', 'todo3_white', 'todo5', 'todo5_white', 'todo5_v2', 'todo5_white_v2'];
        randomFlowerId = grassChoices[Math.floor(Math.random() * grassChoices.length)];
      }
      
      const newItem: Item = {
        id: Math.random().toString(36).substring(2, 9),
        title: mainTitle,
        completed: false,
        type: activeTab,
        importance,
        flowerId: randomFlowerId,
        showUntilDays,
        isDaily,
        isLight,
        steps: parsedSteps,
        interest,
        speedLevel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inGarden: true,
        dateStr: dateToYMD(selectedDate),
        position: getValidPosition(items.map(i => i.position))
      };
      setItems((prev) => [...prev, newItem]);
    }
    
    setInputValue('');
    setIsMultiline(false);
    inputRef.current?.blur();
  };

  const commitItemDragPosition = (id: string, offset: DragOffset) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    if (!canvasRect || canvasRect.width <= 0 || canvasRect.height <= 0) {
      return;
    }

    setItems((prev) => prev.map((item) => (
      item.id === id
        ? {
            ...item,
            position: {
              x: Math.min(95, Math.max(5, item.position.x + (offset.x / canvasRect.width) * 100)),
              y: Math.min(95, Math.max(5, item.position.y + (offset.y / canvasRect.height) * 100)),
            },
            updatedAt: Date.now(),
          }
        : item
    )));
  };

  const releaseItemDrag = () => {
    window.setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleItemClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    const currentYMD = dateToYMD(selectedDate);
    
    setItems((prev) => prev.map(item => {
      if (item.id === id) {
        if (item.isDaily) {
          const wasCompleted = item.completedDates?.includes(currentYMD);
          const isAllCompleted = !wasCompleted;
          
          let newCompletedDates = [...(item.completedDates || [])];
          if (isAllCompleted && !newCompletedDates.includes(currentYMD)) {
             newCompletedDates.push(currentYMD);
          } else if (!isAllCompleted) {
             newCompletedDates = newCompletedDates.filter(d => d !== currentYMD);
          }
          
          const newStepsCompletedDates = { ...(item.stepsCompletedDates || {}) };
          if (item.steps && item.steps.length > 0) {
             item.steps.forEach(s => {
                let dates = newStepsCompletedDates[s.id] || [];
                if (isAllCompleted && !dates.includes(currentYMD)) {
                   newStepsCompletedDates[s.id] = [...dates, currentYMD];
                } else if (!isAllCompleted) {
                   newStepsCompletedDates[s.id] = dates.filter(d => d !== currentYMD);
                }
             })
          }
          return { ...item, completedDates: newCompletedDates, stepsCompletedDates: newStepsCompletedDates, updatedAt: Date.now() };
        } else {
          if (item.steps && item.steps.length > 0) {
             const isAllCompleted = !item.completed;
             const newSteps = item.steps.map(s => ({ ...s, completed: isAllCompleted }));
             return { ...item, steps: newSteps, completed: isAllCompleted, updatedAt: Date.now() };
          }
          return { ...item, completed: !item.completed, updatedAt: Date.now() };
        }
      }
      return item;
    }));
  };

  const toggleStep = (itemId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    const currentYMD = dateToYMD(selectedDate);
    
    setItems((prev) => prev.map(item => {
      if (item.id === itemId && item.steps) {
        if (item.isDaily) {
           const stepsDates = { ...(item.stepsCompletedDates || {}) };
           let dates = stepsDates[stepId] || [];
           const wasCompleted = dates.includes(currentYMD);
           if (!wasCompleted) {
              stepsDates[stepId] = [...dates, currentYMD];
           } else {
              stepsDates[stepId] = dates.filter(d => d !== currentYMD);
           }
           
           const allCompleted = item.steps.every(s => (stepsDates[s.id] || []).includes(currentYMD));
           let newCompletedDates = [...(item.completedDates || [])];
           if (allCompleted && !newCompletedDates.includes(currentYMD)) {
              newCompletedDates.push(currentYMD);
           } else if (!allCompleted) {
              newCompletedDates = newCompletedDates.filter(d => d !== currentYMD);
           }
           
           return { ...item, stepsCompletedDates: stepsDates, completedDates: newCompletedDates, updatedAt: Date.now() };
        } else {
          const newSteps = item.steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
          const allCompleted = newSteps.length > 0 && newSteps.every(s => s.completed);
          return { ...item, steps: newSteps, completed: allCompleted, updatedAt: Date.now() };
        }
      }
      return item;
    }));
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    setItems((prev) => prev.map(item => {
      if (item.id === id) {
         if (item.isDaily) {
            return { ...item, endDate: dateToYMD(selectedDate) };
         }
      }
      return item;
    }).filter(item => {
      if (item.id === id && !item.isDaily) return false;
      if (item.id === id && item.isDaily && dateToYMD(new Date(item.createdAt)) === dateToYMD(selectedDate)) return false;
      return true;
    }));
  };

  const handleEditClick = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    
    setIsMultiline(item.steps && item.steps.length > 0 ? true : false);
    
    let text = item.title;
    if (item.steps && item.steps.length > 0) {
      text += '\n' + item.steps.map(s => `- ${s.title}`).join('\n');
    }
    setInputValue(text);
    if (item.type === 'todo') {
      setActiveTab('todo');
    } else {
      setActiveTab('grass');
    }
    setImportance(item.importance);
    setShowUntilDays(item.showUntilDays);
    setIsCustomDateOpen(![0,1,3,7].includes(item.showUntilDays));
    setIsDaily(item.isDaily);
    setIsLight(item.isLight);
    setInterest(item.interest);
    setSpeedLevel(item.speedLevel);
    setEditingItemId(item.id);
    
    // focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const transplantItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    setItems((prev) => prev.map(item => item.id === id ? { ...item, type: 'grass', inGarden: true, updatedAt: Date.now() } : item));
  };

  const toggleGardenState = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItems((prev) => prev.map(item => item.id === id ? { ...item, inGarden: !item.inGarden, updatedAt: Date.now() } : item));
  };

  const addToTodayTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    const currentYMD = dateToYMD(new Date());
    setItems((prev) => prev.map(item => item.id === id ? { ...item, type: 'todo', inGarden: false, dateStr: currentYMD, updatedAt: Date.now() } : item));
  };

  const activeItems = useMemo(() => {
    const selectedYMD = dateToYMD(selectedDate);
    const selectedTime = new Date(`${selectedYMD}T00:00:00`).getTime();

    const rawItems = items.filter(i => {
      if (i.type !== activeTab) return false;
      if (activeTab === 'todo') {
         if (i.dateStr === selectedYMD) return true;
         
         const itemTime = new Date(`${i.dateStr}T00:00:00`).getTime();
         if (i.isDaily && selectedTime >= itemTime) {
            if (i.endDate && selectedYMD >= i.endDate) return false;
            return true;
         }
         
         if (i.showUntilDays > 0) {
            const expireTime = itemTime + i.showUntilDays * 24 * 60 * 60 * 1000;
            if (selectedTime >= itemTime && selectedTime <= expireTime) return true;
         }
         return false;
      }
      return true; 
    });

    if (activeTab === 'grass') {
      const grasses = rawItems;
      const sortFn = (a: Item, b: Item) => {
         if (a.inGarden && !b.inGarden) return -1;
         if (!a.inGarden && b.inGarden) return 1;
         return (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt);
      };
      const uncompleted = grasses.filter(i => !i.completed);
      const completed = grasses.filter(i => i.completed);

      const topUncompletedIds = new Set(uncompleted.sort(sortFn).slice(0, maxUncompletedFlowers).map(i => i.id));
      const topCompletedIds = new Set(completed.sort(sortFn).slice(0, maxCompletedFlowers).map(i => i.id));

      return grasses.filter(i => topUncompletedIds.has(i.id) || topCompletedIds.has(i.id));
    }
    
    // Map items to dynamically compute completed statuses if they are daily
    return rawItems.map(item => {
      if (activeTab === 'todo' && item.isDaily) {
         return {
           ...item,
           completed: item.completedDates?.includes(selectedYMD) || false,
           steps: item.steps ? item.steps.map(s => ({ ...s, completed: item.stepsCompletedDates?.[s.id]?.includes(selectedYMD) || false })) : []
         };
      }
      return item;
    });
  }, [items, activeTab, selectedDate, maxCompletedFlowers, maxUncompletedFlowers]);

  if (!isLoaded) return null;

  return (
    <div 
      className="fixed inset-0 overflow-hidden font-sans selection:bg-black/10 transition-colors duration-500"
      style={{ backgroundColor: bgColor }}
      onClick={() => inputRef.current?.blur()}
    >
      <TitleBar t={t} onOpenSettings={() => setIsSettingsOpen(true)} isDarkBg={isDarkBg} />
      <WeatherOverlay weather={weather} />
      <YearMonthPicker 
        isSettingsOpen={isSettingsOpen}
        t={t}
        currentDate={selectedDate} 
        onApply={(y, m) => {
           const nextD = new Date(selectedDate);
           nextD.setFullYear(y);
           nextD.setMonth(m);
           setSelectedDate(nextD);
           setAnchorDate(nextD);
        }} 
        isDarkBg={isDarkBg}
      />

      <HorizontalCalendar 
        t={t}
        selectedDate={selectedDate} 
        activeTab={activeTab}
        setIsFlowerSelectorOpen={setIsFlowerSelectorOpen}
        setIsWishlistModalOpen={setIsWishlistModalOpen}
        onSelectDate={(d) => {
           setSelectedDate(d);
        }} 
        isDarkBg={isDarkBg}
      />

      <GuideBubble
        id="monthPicker"
        visible={visibleGuides.includes('monthPicker') && !isSettingsOpen && !isWishlistModalOpen}
        onDismiss={dismissGuide}
        positionClasses="top-[25px] left-1/2 ml-[80px] md:ml-[110px]"
        text={t('Click here to jump to a specific month or year.', '点击此处可以选择指定的年月。')}
        pointerSvg={
          <svg className="absolute top-4 -left-[60px] w-[60px] h-10 overflow-visible text-neutral-400/80" stroke="currentColor" fill="none" strokeWidth="1.5">
            <path d="M 60 10 Q 30 10 0 0" strokeDasharray="4 4" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        }
      />
      <GuideBubble
        id={activeTab === 'todo' ? 'todo-title' : 'grass-title'}
        visible={visibleGuides.includes(activeTab === 'todo' ? 'todo-title' : 'grass-title') && !isSettingsOpen && !isWishlistModalOpen}
        onDismiss={dismissGuide}
        positionClasses="top-[205px] left-1/2 -translate-x-[260px] md:-translate-x-[330px]"
        text={activeTab === 'todo'
          ? t('Click the title to choose the flower for today.', '点击标题，可更换今日各项任务要种的花种。')
          : t('Welcome to the garden. Click the title to view the full wishlist.', '欢迎来到种草花园，点击标题即可查看完整的种草清单。')}
        pointerSvg={
          <svg className="absolute -top-[76px] right-[-110px] w-[110px] h-[86px] overflow-visible text-neutral-400/80" stroke="currentColor" fill="none" strokeWidth="1.5">
            <path d="M 0 76 Q 44 34 110 0" strokeDasharray="4 4" strokeLinecap="round" />
            <circle cx="110" cy="0" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        }
      />
      <GuideBubble
        id="timeline"
        visible={visibleGuides.includes('timeline') && !isSettingsOpen && !isWishlistModalOpen}
        onDismiss={dismissGuide}
        positionClasses="top-[150px] left-1/2 ml-[160px] md:ml-[240px]"
        text={t('Scroll or drag horizontally to switch dates.', '滚动鼠标滚轮或左右滑动，来切换查看不同日期。')}
        pointerSvg={
          <svg className="absolute -top-[58px] left-1/2 -translate-x-1/2 w-[40px] h-[58px] overflow-visible text-neutral-400/80" stroke="currentColor" fill="none" strokeWidth="1.5">
            <path d="M 20 58 Q 20 28 20 0" strokeDasharray="4 4" strokeLinecap="round" />
            <circle cx="20" cy="0" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        }
      />
      <GuideBubble
        id={activeTab === 'todo' ? 'todo-input' : 'grass-input'}
        visible={visibleGuides.includes(activeTab === 'todo' ? 'todo-input' : 'grass-input') && !isSettingsOpen && !isWishlistModalOpen}
        onDismiss={dismissGuide}
        positionClasses="bottom-[100px] md:bottom-[110px] left-1/2 ml-[10%] md:ml-[20%]"
        text={activeTab === 'todo'
          ? t('Enter your task here. Click the left icon to break it into steps.', '在此输入任务。点击输入框左侧图标，可将任务拆分为分步任务。')
          : t('Enter your wishlist idea here.', '在此输入你的种草事项。')}
        pointerSvg={
          <svg className="absolute -bottom-[40px] -left-[40px] w-[40px] h-[40px] overflow-visible text-neutral-400/80" stroke="currentColor" fill="none" strokeWidth="1.5">
            <path d="M 40 0 Q 20 20 0 40" strokeDasharray="4 4" strokeLinecap="round" />
            <circle cx="0" cy="40" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        }
      />
      {/* Nav */}
      <div className={`absolute bottom-12 left-6 md:left-14 flex flex-col gap-6 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-medium z-40 ${isDarkBg ? 'text-white/60' : 'text-neutral-400 mix-blend-multiply'}`}>
        <button 
          onClick={() => { setActiveTab('todo'); setIsWishlistModalOpen(false); }} 
          className={`text-left transition-all duration-500 origin-left ${activeTab === 'todo' && !isWishlistModalOpen ? (isDarkBg ? 'text-white scale-100 opacity-100' : 'text-neutral-900 scale-100 opacity-100') : (isDarkBg ? 'hover:text-white/90 scale-90 opacity-60' : 'hover:text-neutral-600 scale-90 opacity-60')}`}
        >
          {t('Daily Tasks', '今日任务')}
        </button>
        <button 
          onClick={() => { setActiveTab('grass'); setIsWishlistModalOpen(false); }} 
          className={`text-left transition-all duration-500 origin-left ${activeTab === 'grass' && !isWishlistModalOpen ? (isDarkBg ? 'text-white scale-100 opacity-100' : 'text-neutral-900 scale-100 opacity-100') : (isDarkBg ? 'hover:text-white/90 scale-90 opacity-60' : 'hover:text-neutral-600 scale-90 opacity-60')}`}
        >
          {t('Wishlist Garden', '种草花园')}
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)} 
          className={`text-left transition-all duration-500 origin-left scale-90 opacity-60 ${isDarkBg ? 'hover:text-white/90' : 'hover:text-neutral-600'}`}
          title={t('Settings', '设置')}
        >
          {t('Settings', '设置')}
        </button>
      </div>

      {/* Canvas Elements */}
      <div ref={canvasRef} className="absolute inset-0 z-30 pointer-events-none">
        <AnimatePresence>
          {activeItems.map((item) => {
            const levelValue = item.type === 'todo' ? item.importance : item.interest;

            const winW = typeof window !== 'undefined' ? window.innerWidth : 400;
            const winH = typeof window !== 'undefined' ? window.innerHeight : 800;

            const updateTooltipPosition = (rect: DOMRect) => {
               const cx = rect.left + rect.width / 2;
               const cy = rect.top + rect.height / 2;

               // Tooltip is max 200px wide, so it needs 100px clearance on each side from the window edge.
               const minShift = 110 - cx; 
               const maxShift = (winW - 110) - cx;
               let shiftX = 0;
               if (shiftX < minShift) shiftX = minShift;
               if (shiftX > maxShift) shiftX = maxShift;

               let ty = 0;
               const io = ALL_FLOWERS[item.flowerId]?.infoOffset ?? 0;
               const topThreshold = 200 - io;
               const bottomThreshold = winH - 180 - io;
               if (cy < topThreshold) ty = Math.max(0, topThreshold - cy);
               else if (cy > bottomThreshold) ty = Math.min(0, bottomThreshold - cy);

               setTooltipPos(prev => {
                  const p = prev[item.id];
                  // use Math.round to avoid tiny fractional re-renders 
                  const rTx = Math.round(shiftX);
                  const rTy = Math.round(ty);
                  if (p?.x === rTx && p?.y === rTy) return prev;
                  // Store shiftX in x (pixels)
                  return {...prev, [item.id]: {x: rTx, y: rTy}};
               });
            };

            return (
              <DraggableFlowerShell
                key={item.id}
                item={item}
                zIndex={hoveredItemId === item.id ? 50 : (item.completed ? 1 : 10)}
                onDragStart={() => { isDraggingRef.current = true; }}
                onDragMove={(target) => {
                   const targetNode = target as HTMLElement;
                   const node = targetNode?.closest ? (targetNode.closest('.group') || targetNode) : targetNode;
                   if (node && node.getBoundingClientRect) {
                      updateTooltipPosition((node as HTMLElement).getBoundingClientRect());
                   }
                }}
                onDragCommit={commitItemDragPosition}
                onDragRelease={releaseItemDrag}
              >
                <div 
                  className="flex flex-col items-center justify-center relative hover:z-10 group"
                  onMouseEnter={(e) => {
                     setHoveredItemId(item.id);
                     updateTooltipPosition(e.currentTarget.getBoundingClientRect());
                  }}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <div 
                    className="relative flex justify-center items-center pointer-events-auto w-[180px] h-[220px] cursor-pointer"
                    onClick={(e) => handleItemClick(item.id, e)}
                  >
                    <GardenFlower itemId={item.id} flowerId={item.flowerId} type={item.type} level={levelValue} completed={item.completed} isHovered={hoveredItemId === item.id} />
                  </div>

                  <motion.div 
                    initial={false}
                    animate={{ 
                       x: `calc(-50% + ${tooltipPos[item.id]?.x ?? 0}px)`,
                       y: tooltipPos[item.id]?.y ?? 0,
                       scale: hoveredItemId === item.id && !item.completed ? 1.05 : 1
                    }}
                    style={{ marginTop: `${(ALL_FLOWERS[item.flowerId]?.infoOffset ?? 0) + 8}px` }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`absolute top-[60px] left-1/2 text-center w-max max-w-[200px] flex flex-col items-center z-20 pointer-events-auto`}
                  >
                    <div className="absolute inset-0 -m-4 bg-transparent -z-10" />
                    <p 
                      onClick={(e) => handleItemClick(item.id, e)}
                      className={`font-serif ${levelValue === 3 ? 'text-[14px] md:text-[15px]' : levelValue === 1 ? 'text-[10px] md:text-[11px]' : 'text-[11px] md:text-[12px]'} whitespace-pre-wrap transition-all duration-300 px-4 py-1.5 cursor-pointer rounded-full ${hoveredItemId === item.id && !item.completed ? (isDarkBg ? 'bg-white text-neutral-900 shadow-xl font-medium' : 'bg-neutral-900 text-white shadow-xl font-medium') : (item.completed ? (isDarkBg ? 'text-white/40' : 'text-neutral-300') : (isDarkBg ? 'text-white/80' : 'text-neutral-600'))}`}
                      style={{ backgroundColor: hoveredItemId === item.id && !item.completed ? undefined : bgColor }}
                    >
                      {item.title}
                    </p>
                    
                    {!item.completed && (
                      <>
                        <div 
                          className={`flex flex-wrap gap-2 justify-center mt-2 px-3 py-1 text-[8px] uppercase tracking-[0.2em] font-medium transition-all duration-300 rounded-full ${hoveredItemId === item.id ? (isDarkBg ? 'bg-white/10 backdrop-blur-sm text-white/80 shadow-sm border border-white/20' : 'bg-white/90 backdrop-blur-sm text-neutral-500 shadow-sm border border-neutral-200/50') : (isDarkBg ? 'text-white/50' : 'text-neutral-400')}`}
                          style={{ backgroundColor: hoveredItemId === item.id ? undefined : bgColor }}
                        >
                          {item.type === 'todo' ? (
                            <>
                              {item.showUntilDays > 0 && (() => {
                              const itemTime = new Date(`${item.dateStr}T00:00:00`).getTime();
                              const selectedTime = new Date(`${dateToYMD(selectedDate)}T00:00:00`).getTime();
                              const passedDays = Math.floor((selectedTime - itemTime) / (1000 * 60 * 60 * 24));
                              const remainingDays = Math.max(0, item.showUntilDays - passedDays);
                              return <span>{remainingDays}d</span>;
                            })()}
                              {item.showUntilDays > 0 && <span className="opacity-40">•</span>}
                              <span>{getImportanceLabel(item.importance || 2)}</span>
                              {(item.isDaily || item.isLight) && <span className="opacity-40">•</span>}
                              {item.isDaily && <span>{t('Daily', '每日重复')}</span>}
                              {item.isDaily && item.isLight && <span className="opacity-40">•</span>}
                              {item.isLight ? <span>{t('Light', '轻量任务')}</span> : null}
                            </>
                          ) : (
                            <>
                              <span>{getInterestLabel(item.interest)}</span>
                              <span className="opacity-40">•</span>
                              <span>{getEstimatedTimeLabel(item.speedLevel)}</span>
                            </>
                          )}
                        </div>

                        {item.steps && item.steps.length > 0 && (
                          <div className={`flex flex-col gap-1.5 mt-2 transition-opacity duration-300 ${hoveredItemId === item.id ? 'opacity-100 pointer-events-auto' : 'opacity-60 pointer-events-none'}`}>
                            {item.steps.map((step) => (
                              <div 
                                key={step.id} 
                                onClick={(e) => toggleStep(item.id, step.id, e)}
                                className={`flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-sm border rounded-full text-[10px] cursor-pointer transition-all ${step.completed ? 'text-neutral-400 border-transparent line-through' : 'text-neutral-700 border-neutral-200 hover:border-neutral-400'}`}
                              >
                                {step.completed ? (
                                  <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-neutral-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                     <path d="M3 7.5L5.5 10L11 4.5" />
                                  </svg>
                                ) : (
                                  <div className="w-3 h-3 border border-neutral-400 rounded-sm" />
                                )}
                                <span>{step.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className={`flex gap-3 justify-center mt-3 transition-opacity duration-300 ${hoveredItemId === item.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                          {item.type === 'todo' && (
                            <div 
                              className="w-6 h-6 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full text-neutral-400 hover:text-green-600 hover:border-green-200 shadow-sm cursor-pointer"
                              title={t("Plant in Garden", "移植到种草花园")}
                              onClick={(e) => transplantItem(item.id, e)}
                            >
                              <Sprout size={12} strokeWidth={2.5}/>
                            </div>
                          )}
                          {item.type === 'grass' && !item.completed && (
                            <div 
                              className="w-6 h-6 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full text-neutral-400 hover:text-indigo-500 hover:border-indigo-200 shadow-sm cursor-pointer"
                              title={t("Add to Today's Task", "移植到今日任务")}
                              onClick={(e) => addToTodayTask(item.id, e)}
                            >
                              <CalendarPlus size={12} strokeWidth={2.5}/>
                            </div>
                          )}
                          {item.type === 'grass' && item.inGarden && (
                            <div 
                              className="w-6 h-6 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 shadow-sm cursor-pointer"
                              title={t("Send to List View", "移至列表视图")}
                              onClick={(e) => toggleGardenState(item.id, e)}
                            >
                              <Archive size={12} strokeWidth={2.5}/>
                            </div>
                          )}
                          <div 
                            className="w-6 h-6 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full text-neutral-400 hover:text-blue-500 hover:border-blue-200 shadow-sm cursor-pointer"
                            onClick={(e) => handleEditClick(item as Item, e)}
                            title={t('Edit', '编辑')}
                          >
                            <Pencil size={11} strokeWidth={2.5}/>
                          </div>
                          <div 
                            className="w-6 h-6 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-full text-neutral-400 hover:text-red-500 hover:border-red-200 shadow-sm cursor-pointer"
                            onClick={(e) => deleteItem(item.id, e)}
                            title={t('Delete', '删除')}
                          >
                            <X size={12} strokeWidth={2.5}/>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>
              </DraggableFlowerShell>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleAddItem}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[55vw] sm:w-[65vw] md:w-[85%] max-w-[540px] z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence>
          {isFocused && (
              <motion.div 
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute bottom-full mb-6 left-1/2 -translate-x-1/2 w-max max-w-[90vw] flex flex-wrap justify-center gap-x-10 gap-y-5 text-[9px] uppercase font-medium tracking-[0.2em] px-8 py-6 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.06)] bg-white/40 border border-white/60 ${isDarkBg ? 'text-white/90' : 'text-neutral-500'}`}
            >
              {activeTab === 'todo' && (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[8px] opacity-70">{t('Importance', '重要性')}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(v => (
                        <button 
                          key={v} type="button" onClick={() => setImportance(v)}
                          className={`w-4 h-4 rounded-full border transition-all duration-300 ${importance >= v ? (isDarkBg ? 'bg-white border-white scale-110' : 'bg-neutral-800 border-neutral-800 scale-110') : (isDarkBg ? 'bg-transparent border-white/30 hover:border-white/60' : 'bg-transparent border-neutral-300 hover:border-neutral-400')}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[8px] opacity-70">{t('Show Until', '持续几天')}</span>
                    <div className="flex gap-3 items-center">
                      {[{ l: '0d', v: 0 }, { l: '1d', v: 1 }, { l: '3d', v: 3 }, { l: '7d', v: 7 }].map(({l, v}) => (
                        <button 
                          key={v} type="button" onClick={() => { setShowUntilDays(v); setIsCustomDateOpen(false); }}
                          className={`transition-all duration-300 pb-1 border-b ${showUntilDays === v && !isCustomDateOpen ? (isDarkBg ? 'text-white border-white' : 'text-neutral-900 border-neutral-900') : (isDarkBg ? 'hover:text-white/80 border-transparent text-white/50' : 'hover:text-neutral-600 border-transparent')}`}
                        >
                          {l}
                        </button>
                      ))}
                      {!isCustomDateOpen ? (
                        <button 
                          type="button" onClick={() => setIsCustomDateOpen(true)}
                          className={`transition-all duration-300 pb-1 border-b border-transparent ${isDarkBg ? 'hover:text-white/80 text-white/50' : 'hover:text-neutral-600 text-neutral-500'}`}
                        >
                          {t('more', '更多')}
                        </button>
                      ) : (
                        <div className={`flex items-center border-b pb-1 ${isDarkBg ? 'border-white' : 'border-neutral-900'}`}>
                          <input 
                            type="number" min="0" max="365" 
                            style={{ width: `${Math.max(22, showUntilDays.toString().length * 10 + 12)}px` }}
                            value={showUntilDays} 
                            onChange={(e) => setShowUntilDays(parseInt(e.target.value) || 0)}
                            className={`bg-transparent text-center outline-none appearance-none ${isDarkBg ? 'text-white' : 'text-neutral-900'}`}
                          />
                          <span className={isDarkBg ? 'text-white' : 'text-neutral-900'}>d</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[8px] opacity-70">{t('Type', '类型')}</span>
                    <div className="flex gap-3">
                      <button 
                        type="button" onClick={() => setIsDaily(!isDaily)}
                        className={`transition-all duration-300 pb-1 border-b ${isDaily ? (isDarkBg ? 'text-white border-white' : 'text-neutral-900 border-neutral-900') : (isDarkBg ? 'text-white/50 hover:text-white/80 border-transparent' : 'text-neutral-400 hover:text-neutral-600 border-transparent')}`}
                      >
                        {t('Daily', '每日重复')}
                      </button>
                      <button 
                        type="button" onClick={() => setIsLight(!isLight)}
                        className={`transition-all duration-300 pb-1 border-b ${isLight ? (isDarkBg ? 'text-white border-white' : 'text-neutral-900 border-neutral-900') : (isDarkBg ? 'text-white/50 hover:text-white/80 border-transparent' : 'text-neutral-400 hover:text-neutral-600 border-transparent')}`}
                      >
                        {t('Light', '轻量任务')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'grass' && (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[8px] opacity-70">{t('Interest', '心动程度')}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(v => (
                        <button 
                          key={v} type="button" onClick={() => setInterest(v)}
                          className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${interest >= v ? (isDarkBg ? 'bg-white border-white scale-110' : 'bg-neutral-800 border-neutral-800 scale-110') : (isDarkBg ? 'bg-transparent border border-white/30 hover:border-white/60' : 'bg-transparent border border-neutral-300 hover:border-neutral-400')}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[8px] opacity-70">{t('Estimated Time', '预计耗时')}</span>
                    <div className="flex gap-3 items-center">
                      {[1, 2, 3].map(v => (
                        <button 
                          key={`speed-${v}`} type="button" onClick={() => setSpeedLevel(v)}
                          className={`transition-all duration-300 pb-1 border-b text-[9px] whitespace-nowrap ${speedLevel === v ? (isDarkBg ? 'text-white border-white' : 'text-neutral-900 border-neutral-900') : (isDarkBg ? 'text-white/50 hover:text-white/80 border-transparent' : 'text-neutral-500 hover:text-neutral-700 border-transparent')}`} 
                        >
                          {getEstimatedTimeLabel(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative w-full">
          {activeTab === 'todo' && (
            <button
              type="button"
              onClick={() => setIsMultiline(!isMultiline)}
              className={`absolute left-3 top-3 md:top-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-10 ${isMultiline ? (isDarkBg ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white') : (isDarkBg ? 'bg-transparent text-white/50 hover:text-white hover:bg-white/10' : 'bg-transparent text-neutral-400 hover:text-neutral-600 hover:bg-black/5')}`}
              title={t("Break Down (Steps)", "分步拆解")}
            >
              <List size={16} strokeWidth={2} />
            </button>
          )}

          <textarea
            ref={inputRef as any}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
               setTimeout(() => {
                  if (!document.activeElement?.closest('form')) setIsFocused(false);
               }, 150);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (isMultiline) {
                   if (e.metaKey || e.ctrlKey) {
                      e.preventDefault();
                      handleAddItem(e as any);
                   }
                } else if (!e.shiftKey) {
                   e.preventDefault();
                   handleAddItem(e as any);
                }
              }
            }}
            rows={isMultiline ? 4 : 1}
            placeholder={activeTab === 'todo' ? (isMultiline ? t('Main Task\n- Step 1\n- Step 2\n...', '主任务\n- 步骤 1\n- 步骤 2\n...') : 'Let your tasks flower...') : 'Let this idea take root'}
            className={`w-full text-center bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl ${activeTab === 'todo' ? 'px-14' : 'px-8'} py-4 md:py-5 font-serif text-base md:text-lg outline-none transition-all duration-500 font-light resize-none hide-scrollbar ${isDarkBg ? 'text-white placeholder:text-white/40 bg-white/10 border-white/20 focus:bg-white/20 focus:border-white/40' : 'text-neutral-900 placeholder:text-neutral-400 focus:bg-white/60 focus:border-white'}`}
            style={{ minHeight: isMultiline ? '120px' : '60px' }}
          />

          {isMultiline && (
            <button
              type="submit"
              className={`absolute right-3 top-3 md:top-4 px-4 h-8 flex items-center justify-center rounded-full transition-opacity z-10 text-xs tracking-widest uppercase font-medium ${isDarkBg ? 'bg-white text-neutral-900 hover:bg-white/90' : 'bg-neutral-800 text-white hover:bg-neutral-900'}`}
            >
              {t('Add', '添加')}
            </button>
          )}
        </div>
      </form>

      {/* List View Button removed */}

      {/* Wishlist List Modal */}
      <AnimatePresence>
        {isWishlistModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
            style={{ backgroundColor: `${bgColor}CC` }}
            onClick={() => setIsWishlistModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-neutral-200 shadow-2xl rounded-[2rem] w-[90vw] md:w-full max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 pb-4 border-b border-neutral-200/50 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-serif text-2xl text-neutral-800">{t('Wishlist List', '种草清单')}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsWishlistSearchVisible(!isWishlistSearchVisible)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isWishlistSearchVisible ? 'bg-neutral-800 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'}`}>
                      <Search size={14} />
                    </button>
                    <button onClick={() => setIsWishlistModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {isWishlistSearchVisible && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="text"
                        value={wishlistSearchQuery}
                        onChange={(e) => setWishlistSearchQuery(e.target.value)}
                        placeholder={t('Search wishlist...', '搜索种草清单...')}
                        className="w-full bg-white/50 border border-neutral-200 rounded-xl px-4 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-400 focus:bg-white transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="overflow-y-auto p-4 flex-1 slim-black-scrollbar">
                {items.filter(i => i.type === 'grass').length === 0 ? (
                  <p className="text-center text-neutral-400 py-10 font-serif">{t('Your garden is empty. Plant something for later.', '花园空空如也...先种下一件以后想做的事吧。')}</p>
                ) : (
                    <Reorder.Group axis="y" values={items.filter(i => i.type === 'grass').filter(i => wishlistSearchQuery === '' || (i.title && i.title.toLowerCase().includes(wishlistSearchQuery.toLowerCase()))).sort((a,b) => {
                      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                      if (orderA !== orderB) return orderA - orderB;
                      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
                    })} onReorder={(newOrder) => {
                      setItems(prevItems => {
                        const updatedItems = [...prevItems];
                        newOrder.forEach((item, index) => {
                          const idx = updatedItems.findIndex(i => i.id === item.id);
                          if (idx !== -1) {
                            updatedItems[idx] = { ...updatedItems[idx], order: index };
                          }
                        });
                        return updatedItems;
                      });
                    }} className="space-y-2">
                      {items
                        .filter(i => i.type === 'grass')
                        .filter(i => wishlistSearchQuery === '' || (i.title && i.title.toLowerCase().includes(wishlistSearchQuery.toLowerCase())))
                        .sort((a,b) => {
                          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                          if (orderA !== orderB) return orderA - orderB;
                          return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
                        }).map(item => (
                        <Reorder.Item key={item.id} value={item} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors cursor-grab active:cursor-grabbing ${item.inGarden ? 'bg-white border-neutral-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                        <div className="flex items-center gap-4 flex-1">
                          <button className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing">
                             <GripVertical size={16} />
                          </button>
                          <button 
                            onClick={() => handleItemClick(item.id, { stopPropagation: () => {} } as unknown as React.MouseEvent)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${item.completed ? 'bg-neutral-800 border-neutral-800 text-white' : 'border-neutral-300 hover:border-neutral-500 text-transparent'}`}
                          >
                            <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 current-color" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               {item.completed && <path d="M3 7.5L5.5 10L11 4.5" />}
                            </svg>
                          </button>
                          <div className="flex-1 min-w-0">
                            <input
                              className={`w-full bg-transparent text-sm outline-none transition-colors ${item.completed ? 'text-neutral-400 line-through' : 'text-neutral-800'} font-medium focus:border-b focus:border-neutral-300 pb-[1px]`}
                              value={item.title}
                              onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: e.target.value } : i))}
                            />
                            <div className="flex gap-2 text-[10px] uppercase tracking-wider text-neutral-500 mt-1">
                              <span>{getInterestLabel(item.interest)}</span>
                              <span className="opacity-40">•</span>
                              <span>{getEstimatedTimeLabel(item.speedLevel)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-4">
                          {!item.completed && (
                            <button 
                              onClick={(e) => addToTodayTask(item.id, e)}
                              className="p-2 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors"
                              title={t("Add to Today's Task", "移植到今日任务")}
                            >
                              <CalendarPlus size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => toggleGardenState(item.id)}
                            className={`p-2 rounded-full transition-colors ${item.inGarden ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                            title={item.inGarden ? t("Unpin from Garden", "取消展示") : t("Plant in Garden", "种回主花园")}
                          >
                            {item.inGarden ? <ArchiveRestore size={16} /> : <Sprout size={16} />}
                          </button>
                          <button 
                            onClick={(e) => deleteItem(item.id, e)}
                            className="p-2 rounded-full bg-neutral-100 text-neutral-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        </Reorder.Item>
                    ))}
                    </Reorder.Group>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
            style={{ backgroundColor: `${bgColor}CC` }}
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-neutral-200 shadow-2xl rounded-[2rem] w-[90vw] md:w-full max-w-[400px] max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 pb-4 md:p-8 md:pb-4 border-b border-neutral-200/50 shrink-0">
                <h2 className="font-serif text-2xl text-neutral-800">{t('Settings', '设置')}</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 slim-black-scrollbar space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">{t('System', '系统')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-700">{t('Launch on Startup', '开机自启动')}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={launchAtLogin}
                        disabled={!desktopBridge.isElectron || launchAtLoginStatus === 'saving'}
                        onClick={() => {
                          void saveLaunchAtLogin(!launchAtLogin);
                        }}
                        className={`w-10 h-6 flex items-center rounded-full transition-colors p-1 disabled:cursor-not-allowed disabled:opacity-50 ${launchAtLogin ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: launchAtLogin ? 16 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                    {launchAtLoginStatus === 'error' && (
                      <p className="text-[11px] leading-5 text-red-500">
                        {t('Failed to update startup setting.', '更新开机自启动设置失败。')}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-700">{t('User Guide', '使用指南')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setVisibleGuides([
                            'monthPicker',
                            'timeline',
                            'todo-title',
                            'grass-title',
                            'todo-input',
                            'grass-input',
                          ]);
                        }}
                        className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-medium rounded-full transition-colors cursor-pointer"
                      >
                        {t('Show Guide', '显示指南')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-neutral-200/50">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">{t('Appearance', '外观')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-4 relative">
                      <span className="text-sm text-neutral-700">{t('Background Color', '背景颜色')}</span>
                      <div className="flex items-center gap-3">
                        {['#F9F8F6', '#fad6df', '#1f3c6b'].map(preset => (
                          <button
                            key={preset}
                            onClick={() => saveBgColor(preset)}
                            className={`w-5 h-5 rounded-full transition-all duration-300 ease-out shadow-sm ${bgColor.toLowerCase() === preset.toLowerCase() ? 'ring-1 ring-offset-0 ring-neutral-400 scale-110' : 'ring-0 ring-offset-0 ring-transparent'}`}
                            style={{ backgroundColor: preset }}
                            title={preset}
                            aria-label={`Select preset color ${preset}`}
                          />
                        ))}
                        <div className="w-px h-3 bg-neutral-200 mx-0.5" />
                        <div className="relative">
                          <button 
                            onClick={() => setIsBgColorPickerOpen(!isBgColorPickerOpen)}
                            className={`w-5 h-5 rounded-full transition-all duration-300 ease-out flex items-center justify-center shadow-sm ${!['#f9f8f6', '#fad6df', '#1f3c6b'].includes(bgColor.toLowerCase()) ? 'ring-1 ring-offset-0 ring-neutral-400 scale-110' : 'ring-0 ring-offset-0 ring-transparent'}`}
                            style={{ 
                              background: !['#f9f8f6', '#fad6df', '#1f3c6b'].includes(bgColor.toLowerCase()) 
                                ? bgColor 
                                : '#f3f4f6'
                            }}
                            title={t('Custom Color', '自定义颜色')}
                          >
                            {['#f9f8f6', '#fad6df', '#1f3c6b'].includes(bgColor.toLowerCase()) && (
                               <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-neutral-400" stroke="currentColor" strokeWidth="2.5">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                               </svg>
                            )}
                          </button>
                          
                          {/* Mini Custom Palette Popover */}
                          <AnimatePresence>
                            {isBgColorPickerOpen && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBgColorPickerOpen(false);
                                  }} 
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-8 bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[1.25rem] z-50 overflow-hidden"
                                >
                                  <MinimalColorPicker color={bgColor} onChange={saveBgColor} />
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-700">{t('Weather', '天气')}</span>
                      <div className="flex bg-neutral-100 rounded-lg p-1">
                         {(['sunny', 'rainy'] as const).map(w => (
                            <button
                               key={w}
                               onClick={() => saveWeather(w)}
                               className={`px-3 py-1 text-xs capitalize rounded-md transition-all ${weather === w ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                               {t(w, w === 'sunny' ? '晴天' : '下雨')}
                            </button>
                         ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-700">{t('Language', '语言')}</span>
                      <div className="flex bg-neutral-100 rounded-lg p-1">
                         {(['en', 'zh'] as const).map(l => (
                            <button
                               key={l}
                               onClick={() => saveLanguage(l)}
                               className={`px-3 py-1 text-xs rounded-md transition-all ${language === l ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                               {l === 'en' ? 'English' : '中文'}
                            </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-neutral-200/50">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">{t('Wishlist Display', '种草页显示')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-700">{t('Max Completed Flowers', '最大已完成数量')}</span>
                      <input 
                        type="number" min="0" max="100"
                        value={maxCompletedFlowers}
                        onChange={(e) => saveMaxCompleted(parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent border-b border-neutral-300 text-center text-sm outline-none pb-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-700">{t('Max Uncompleted Flowers', '最大未完成数量')}</span>
                      <input 
                        type="number" min="0" max="100"
                        value={maxUncompletedFlowers}
                        onChange={(e) => saveMaxUncompleted(parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent border-b border-neutral-300 text-center text-sm outline-none pb-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs uppercase tracking-widest text-neutral-500">{t('System Notification Reminder', '系统通知提醒')}</h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isNotificationEnabled}
                      onClick={() => saveNotificationEnabled(!isNotificationEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full transition-colors p-1 ${isNotificationEnabled ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: isNotificationEnabled ? 16 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                  <div className={`space-y-4 transition-opacity duration-300 ${isNotificationEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-700">{t('Reminder Interval (minutes)', '提醒间隔 (分钟)')}</span>
                      <div className="relative flex items-center">
                        <input 
                          type="number" min="1" max="1440"
                          value={notificationInterval}
                          onChange={(e) => saveNotificationInterval(parseInt(e.target.value) || 60)}
                          className="w-16 bg-transparent border-b border-neutral-300 text-center text-sm outline-none pb-1"
                        />
                        <button 
                          onClick={() => setIsIntervalDropdownOpen(!isIntervalDropdownOpen)}
                          className="ml-1 p-1 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                          </svg>
                        </button>

                        <AnimatePresence>
                          {isIntervalDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsIntervalDropdownOpen(false);
                                }} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-8 bg-white/90 backdrop-blur-xl border border-neutral-200 shadow-xl rounded-xl z-50 overflow-hidden w-28 py-1"
                              >
                                {[
                                  { value: 30, label: '30m' },
                                  { value: 60, label: '1h (60m)' },
                                  { value: 120, label: '2h (120m)' },
                                  { value: 180, label: '3h (180m)' }
                                ].map(preset => (
                                  <button
                                    key={preset.value}
                                    onClick={() => {
                                      saveNotificationInterval(preset.value);
                                      setIsIntervalDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs transition-colors ${notificationInterval === preset.value ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-700">{t('Minimum Reminder', '最低提醒')}</span>
                      <div className="flex bg-neutral-100 rounded-lg p-1">
                         {[
                           { value: 1, zhLabel: '普通' },
                           { value: 2, zhLabel: '重要' },
                           { value: 3, zhLabel: '很重要' },
                         ].map(({ value, zhLabel }) => (
                            <button
                               key={value}
                               onClick={() => saveNotificationMinImportance(value)}
                               className={`px-3 py-1 text-xs rounded-md transition-all ${notificationMinImportance === value ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                               {getImportanceLabel(value)}
                            </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200/50">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">{t('Data', '数据')}</h3>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items));
                        const a = document.createElement('a'); 
                        a.href = dataUrl; 
                        a.download = "Today's Flower Backup.json"; 
                        a.click();
                      }}
                      className="text-left text-sm text-neutral-700 hover:text-black py-2"
                    >
                      {t('Export Data', '导出数据')}
                    </button>
                    <label className="text-left text-sm text-neutral-700 hover:text-black py-2 cursor-pointer">
                      {t('Import Data', '导入数据')}
                      <input 
                        type="file" accept=".json" className="hidden"
                        onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             try {
                               const obj = JSON.parse(event.target?.result as string);
                               if (Array.isArray(obj)) { setItems(obj); }
                             } catch (err) {}
                           };
                           reader.readAsText(file);
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="text-left text-sm text-red-500 hover:text-red-600 transition-colors py-2 mt-2"
                    >
                      {t('Reset App', '重置应用')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flower Selection Modal */}
      <AnimatePresence>
        {isFlowerSelectorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
            style={{ backgroundColor: `${bgColor}CC` }}
            onClick={() => setIsFlowerSelectorOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-neutral-200 shadow-2xl rounded-[2rem] w-[90vw] md:w-full max-w-[500px] overflow-hidden flex flex-col p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                   <h2 className="font-serif text-[22px] md:text-[24px] text-neutral-800 tracking-tight leading-tight mb-1">{t('What shall we plant today?', '今天想种点什么？')}</h2>
                   <p className="text-xs text-neutral-400 font-sans tracking-wide">{t('Choose which flowers your tasks grow into.', '选择任务会长成哪种花。')}</p>
                </div>
                <button onClick={() => setIsFlowerSelectorOpen(false)} className="w-8 h-8 flex shrink-0 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors ml-4">
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                 {[1, 2, 3].map(imp => (
                    <button 
                      key={imp}
                      onClick={() => setActiveFlowerTab(imp)}
                      className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${activeFlowerTab === imp ? 'bg-neutral-800 text-white shadow-md' : 'bg-neutral-100/50 text-neutral-500 hover:bg-neutral-200/50'}`}
                    >
                       {getImportanceLabel(imp)}
                    </button>
                 ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto slim-black-scrollbar px-2 -mx-2">
                 {FLOWER_SELECTOR_DISPLAY_IDS.map(fid => {
                    const groupIds = getFlowerGroupIds(fid);
                    const isSelected = groupIds.some(gId => flowerSelection[activeFlowerTab]?.includes(gId));
                    return (
                      <div 
                        key={fid} 
                        onClick={() => {
                           setFlowerSelection(prev => {
                              const curr = prev[activeFlowerTab] || [];
                              const updated = isSelected
                                ? curr.filter(x => !groupIds.includes(x))
                                : [...curr, ...groupIds.filter(gId => !curr.includes(gId))];
                              const nextMap = { ...prev, [activeFlowerTab]: updated };
                              localStorage.setItem(STORAGE_KEYS.flowerSelection, JSON.stringify(nextMap));
                              return nextMap;
                           });
                        }}
                        className={`flex flex-col items-center border rounded-[1.5rem] p-3 backdrop-blur-sm transition-all cursor-pointer ${isSelected ? 'bg-neutral-800 border-neutral-800 shadow-md text-white' : 'bg-white/50 border-neutral-200/50 hover:bg-neutral-50/80 text-neutral-800'}`}
                      >
                         <div className="flex justify-center items-center w-[60px] h-[70px]">
                             <MiniFlower flowerId={fid} selected={isSelected} />
                         </div>
                      </div>
                    )
                 })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-[2px] bg-black/10"
            onClick={() => setIsResetConfirmOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xl border border-neutral-200/60 shadow-[0_16px_40px_rgba(0,0,0,0.1)] rounded-[1.5rem] w-[85vw] max-w-[320px] p-5 md:p-6 flex flex-col items-center text-center"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="font-serif text-[18px] md:text-[20px] text-neutral-900 tracking-tight mb-1.5">
                {t('Reset App', '重置应用')}
              </h3>
              <p className="text-[12px] text-neutral-500 leading-relaxed mb-5">
                {t('Are you sure you want to delete all data? This action cannot be undone.', '确定要删除所有数据吗？此操作无法撤销。')}
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[11px] font-medium tracking-wider uppercase transition-colors"
                >
                  {t('Cancel', '取消')}
                </button>
                <button 
                  onClick={() => {
                    const defaultFlowerSelection = normalizeFlowerSelection();
                    setItems([]);
                    setFlowerSelection(defaultFlowerSelection);
                    saveBgColor('#F9F8F6');
                    saveWeather('sunny');
                    saveLanguage('en');
                    saveMaxCompleted(6);
                    saveMaxUncompleted(8);
                    saveNotificationInterval(60);
                    saveNotificationEnabled(true);
                    saveNotificationMinImportance(1);
                    localStorage.setItem(STORAGE_KEYS.flowerSelection, JSON.stringify(defaultFlowerSelection));
                    setIsResetConfirmOpen(false);
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium tracking-wider uppercase transition-colors shadow-sm shadow-red-500/20"
                >
                  {t('Delete', '确认删除')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
