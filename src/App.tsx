import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence, Reorder, useMotionValue } from 'motion/react';
import { X, Sprout, List, ArchiveRestore, Archive, Pencil, CalendarPlus, Search, GripVertical, Settings, Minus, Square } from 'lucide-react';
import { desktopBridge } from './platform/desktop.ts';

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

const hashStr = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const pseudoRandom = (id: string, seed: number) => {
  const x = Math.sin(hashStr(id) + seed) * 10000;
  return x - Math.floor(x);
};

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
    .filter((item) => !item.completed && item.importance >= threshold && item.title.trim())
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

const ALL_FLOWERS: Record<string, { 
  // --- Legacy API ---
  bud?: React.ReactNode;
  bloom?: React.ReactNode;
  originX?: string | number;
  originY?: string | number;
  offsetX?: number;
  offsetY?: number;
  stemPath?: string;
  stemWidth?: number;
  stemHeight?: number;
  stemAnchorX?: number;
  stemAnchorY?: number;
  blossomWidth?: number;
  blossomHeight?: number;
  blossomViewBox?: string;
  blossoms?: Array<{
    bud: React.ReactNode;
    bloom: React.ReactNode;
    originX: string | number;
    originY: string | number;
    offsetX?: number;
    offsetY?: number;
    width?: number;
    height?: number;
    viewBox?: string;
  }>;

  // --- NEW Anchor-based API ---
  infoOffset?: number; // Custom upward/downward offset for the tooltip (e.g. grass needs it to be higher)
  customStem?: {
     svgObj: React.ReactNode;
     width: number;
     height: number;
     viewBox?: string;
     bottomAnchor: { x: number, y: number }; // Where it touches/sways from the ground
     rootOffset: { x: number, y: number }; // The point that aligns to the center of the list item
     bareSvg?: boolean; // If true, don't auto-apply stroke/fill to the container
     baseScale?: number;
  };
  customBlossoms?: Array<{
     bud: React.ReactNode;
     bloom: React.ReactNode;
     width: number;
     height: number;
     viewBox?: string;
     flowerAnchor: { x: number, y: number }; // Local connection point on this blossom SVG
     stemConnection: { x: number, y: number }; // The point on the customStem where this blossom attaches
     bareSvg?: boolean; // If true, don't auto-apply stroke/fill to the container
  }>;
}> = {
  todo_example: {
    customStem: {
      svgObj: (
        <g>
          <defs>
            <linearGradient id="bf_stem_grad" x1="13.58" y1="250.86" x2="13.58" y2="41.74" gradientTransform="translate(12.81 -28.64) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
            <linearGradient id="bf_stem_grad_2" x1="37.75" y1="27.47" x2="37.75" y2="20.5" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_3" x1="28.77" y1="24.53" x2="28.77" y2="18.01" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_4" x1="36.05" y1="45.03" x2="36.05" y2="40.27" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_5" x1="35.85" y1="46.49" x2="35.85" y2="43.87" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_6" x1="35.7" y1="43.8" x2="35.7" y2="30.84" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_7" x1="42.08" y1="92.02" x2="42.08" y2="56.44" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_8" x1="47.35" y1="79.76" x2="47.35" y2="71.03" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_9" x1="29.59" y1="82.37" x2="29.59" y2="63.57" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_10" x1="-334.52" y1="-24.68" x2="-334.52" y2="-35.95" gradientTransform="translate(-294.66 -31.71) rotate(-167.67) scale(.98 -1)" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_11" x1="40.74" y1="22.46" x2="40.74" y2="16.88" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_12" x1="26.5" y1="66.21" x2="26.5" y2="60.04" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_13" x1="25.38" y1="20.23" x2="25.38" y2="18.95" href="#bf_stem_grad" />
            <linearGradient id="bf_stem_grad_14" x1="30.93" y1="4.85" x2="30.93" y2="2.5" href="#bf_stem_grad" />
          </defs>
          <path fill="none" strokeMiterlimit="10" stroke="url(#bf_stem_grad)" d="M30.95,8.68s4.64,47.19,5.19,59.04c1.52,33.03-1.52,90-1.52,90l-1.36,42.28"/>
          <path fill="#879f3c" d="M36.14,105.47s.94-4.76,5.03-7.98c6.56-5.16,21.79-11.01,14.44-7.2-8.31,4.32-5.03,7.84-10.89,11.29l-8.58,3.88Z"/>
          <path fill="#879f3c" d="M36.57,116.67s.15-5.91-4.17-10.64c-4.68-5.11-18.53-12.36-21.54-10.27-1.91,1.32,1.83-1.74,5.06-1.4,3.61.38,4.21,10.47,10.75,15.85l9.9,6.46Z"/>
          <path fill="#879f3c" d="M36.52,97.09s.74-1.57-.93-3.93c-.63-.9-9.26-11.99-10.23-12.99-5.37-5.54-5.75-1.36-8.2-1.84-3.77-.75-5.6.31-7.16.6-1.32.24,9.29-3.95,11.01-.06,2.29,5.16,9.79,13.21,12.3,15.16l3.2,3.06Z"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_2)" d="M32.83,27.37s3.54-7.85,6.97-6.44c2.49,1.02,2.85,4.24,2.85,4.24"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_3)" d="M32.39,24.51s-.49-6.25-2.94-6.25-4.32,4.12-4.32,4.12"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_4)" d="M34.38,44.98s1.21-6.43,3.38-3.85"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_5)" d="M34.51,45.36c-.76.45,3.26-3.71,2.73,1.1"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_6)" d="M34.38,43.78s1.04-13.26,2.8-12.66"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".75px" stroke="url(#bf_stem_grad_7)" d="M36.56,91.85s5-9.43,6.09-21.6c1.76-19.59,4.95-11.98,4.95-11.98"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_8)" d="M41.17,79.63s10.07-17.08,12.33-2.4"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_9)" d="M36.39,82.21s-2.01-2.42-3.66-6.11c-2.91-6.48-2.67-17.72-9.94-9.24"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_10)" d="M32.33,4.78c.87-4.47,4.23,2.64-.65,9.45"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_11)" d="M36.14,22.29s5.88-6.57,9.27-4.88"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_12)" d="M29.48,66.09s-2.42-4.35-6.07-5.82"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_13)" d="M27.35,19.19s-3.25.98-3.95.77"/>
          <path fill="none" strokeMiterlimit="10" strokeWidth=".5px" stroke="url(#bf_stem_grad_14)" d="M32.17,4.74s-.68-1.51-2.64-2"/>
          <path fill="#879f3c" d="M36.06,103.99s-2.48-3.13-6.58-8.55c-4.1-5.41-14.1-4.09-14.1-4.09,22.96-12.04,21.02,8.25,21.02,8.25"/>
          <path fill="#879f3c" d="M36.05,127.05s2.57-3.06,6.81-8.36,14.21-3.7,14.21-3.7c-22.62-12.66-21.24,7.68-21.24,7.68"/>
        </g>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 35, y: 195 },
      rootOffset: { x: 35, y: 70 },
      bareSvg: true,
      baseScale: 4
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="11" cy="9.73" rx="4.11" ry="1.24" transform="translate(-1.03 18.16) rotate(-76.53)"/>
            <polygon fill="#879f3c" points="12.79 6.67 12.02 5.84 10.93 6.11 11.26 5.01 13.12 5.57 12.79 6.67"/>
          </g>
        ),
        bloom: (
          <g>
            <defs>
              <linearGradient id="bf_grad_1" x1="11.87" y1="48.03" x2="13.75" y2="43.26" gradientTransform="translate(3.83 -49.8) rotate(-8.06) scale(1.01 1.38) skewX(-18.53)" gradientUnits="userSpaceOnUse">
                <stop offset=".29" stopColor="#e6e7e8"/>
                <stop offset=".33" stopColor="#e2e5e6"/>
                <stop offset=".72" stopColor="#c6d2d9"/>
                <stop offset=".94" stopColor="#bcccd5"/>
              </linearGradient>
            </defs>
            <path fill="#e6e7e8" d="M8.77,16.82s-.02,0-.03-.01c-1.15-.47-2.07-2.02-2.6-2.06l-1.36-.33c-2.4-.04-1.23-3.9-1.23-3.9,0,0,3.04-.71,4.88-3.32s3.61-1.78,3.61-1.78c0,0,2.17.29,2.45,3.47s2.22,5.2,2.22,5.2c0,0-.92,3.93-3.02,2.76l-1.34-.39c-.48-.23-2.07.66-3.31.47"/>
            <path fill="url(#bf_grad_1)" d="M14.54,15.88l-5.7.46-4.12-3.38.8-2.63,3.95-1.84,1.97,3.88c.17.34.6.46.93.26l2.02-1.25,1.13,2.05-.99,2.43Z"/>
            <polygon fill="#879f3c" points="14.11 7.05 12.08 5.84 9.72 5.74 10.05 4.64 14.44 5.95 14.11 7.05"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 12.2, y: 5.5 },
        stemConnection: { x: 32.3, y: 4.8 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="10.42" cy="11.04" rx="4.11" ry="1.24" transform="translate(-3.82 16.27) rotate(-66.83)"/>
            <polygon fill="#879f3c" points="12.48 8.62 11.81 7.71 10.7 7.85 11.15 6.8 12.93 7.56 12.48 8.62"/>
          </g>
        ),
        bloom: (
          <g>
            <defs>
              <linearGradient id="bf_grad_2" x1="12.41" y1="35.42" x2="14.29" y2="30.65" gradientTransform="translate(5.44 -34.36) rotate(-6.39) scale(1.02 1.47) skewX(-23.76)" gradientUnits="userSpaceOnUse">
                <stop offset=".4" stopColor="#e6e7e8"/>
                <stop offset=".69" stopColor="#cbd5db"/>
                <stop offset=".91" stopColor="#bcccd5"/>
              </linearGradient>
            </defs>
            <path fill="#e6e7e8" d="M7.93,18.33s-.02,0-.03-.01c-1.11-.55-1.93-2.15-2.45-2.22l-1.33-.42c-2.39-.19-.97-3.97-.97-3.97,0,0,3.08-.51,5.09-2.99s3.72-1.54,3.72-1.54c0,0,2.14.43,2.21,3.62s1.87,5.34,1.87,5.34c0,0-1.18,3.86-3.19,2.55l-1.31-.48c-.46-.26-2.11.52-3.33.25"/>
            <path fill="url(#bf_grad_2)" d="M13.71,17.57l-5.74.27-3.78-3.8,1.06-2.8,4.13-1.82,1.59,4.25c.14.37.56.52.9.32l2.14-1.26.93,2.25-1.23,2.58Z"/>
            <polygon fill="#879f3c" points="14 8.82 11.81 7.57 9.29 7.41 9.62 6.31 14.33 7.72 14 8.82"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 12, y: 7.2 },
        stemConnection: { x: 25.13, y: 22.38 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="7.93" cy="8.48" rx="1.24" ry="3.55" transform="translate(-2.2 2.82) rotate(-17.73)"/>
            <polygon fill="#879f3c" points="8.21 5.61 6.96 5.45 6.09 6.37 5.7 5.3 7.82 4.53 8.21 5.61"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#e6e7e8" d="M11.62,15.9s-.02,0-.03,0c-1.17.41-2.89-.12-3.31.21l-1.23.66c-1.81,1.58-3.52-2.08-3.52-2.08,0,0,1.79-2.56,1.41-5.73-.38-3.17,1.49-3.74,1.49-3.74,0,0,1.8-1.23,4.14.95s5.13,2.39,5.13,2.39c0,0,1.94,3.54-.4,4.07l-1.26.6c-.51.15-1.1,1.87-2.14,2.56"/>
            <polygon fill="#879f3c" points="9.32 5.19 6.97 5.43 5.02 6.75 4.63 5.68 8.93 4.11 9.32 5.19"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 6.8, y: 5.1 },
        stemConnection: { x: 42.65, y: 25.17 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="8.6" cy="9.22" rx="1.45" ry="4.11" transform="translate(-3.35 5.19) rotate(-28.33)"/>
            <polygon fill="#879f3c" points="8.03 5.91 6.83 5.89 6.15 6.89 5.62 5.88 7.5 4.89 8.03 5.91"/>
          </g>
        ),
        bloom: (
          <g>
            <defs>
              <linearGradient id="bf_grad_4" x1="-49.3" y1="138.78" x2="-47.43" y2="134.01" gradientTransform="translate(-66.58 -183.4) rotate(-48.14) scale(1.01 1.38) skewX(-18.53)" gradientUnits="userSpaceOnUse">
                <stop offset=".48" stopColor="#e6e7e8"/>
                <stop offset=".5" stopColor="#e2e5e6"/>
                <stop offset=".69" stopColor="#c6d2d9"/>
                <stop offset=".81" stopColor="#bcccd5"/>
              </linearGradient>
            </defs>
            <path fill="#e6e7e8" d="M11.64,16.67s-.02,0-.03,0c-1.18.38-2.89-.21-3.31.1l-1.25.62c-1.86,1.52-3.45-2.19-3.45-2.19,0,0,1.87-2.5,1.59-5.68s1.61-3.69,1.61-3.69c0,0,1.84-1.17,4.1,1.08s5.05,2.55,5.05,2.55c0,0,1.82,3.6-.53,4.05l-1.28.56c-.51.13-1.16,1.84-2.23,2.49"/>
            <path fill="url(#bf_grad_4)" d="M15.45,12.24l-4.06,4.02-5.33.07-1.08-2.53,1.84-3.95,4.01,1.7c.35.15.76-.03.88-.4l.74-2.25,2.19.84.81,2.5Z"/>
            <polygon fill="#879f3c" points="8.96 5.53 6.79 6.02 5.15 7.53 4.62 6.51 8.43 4.52 8.96 5.53"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 6.6, y: 5.7 },
        stemConnection: { x: 37.76, y: 41.13 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="10.25" cy="9.47" rx="3.95" ry="1.42" transform="translate(-3.27 12.93) rotate(-57.09)"/>
            <polygon fill="#879f3c" points="12.72 7.51 12.32 6.43 11.18 6.24 11.91 5.35 13.45 6.62 12.72 7.51"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#e0e1e2" d="M6.36,15.91s-.02-.01-.02-.02c-.97-.78-1.42-2.52-1.92-2.7l-1.21-.7c-2.29-.71-.08-4.08-.08-4.08,0,0,3.12.17,5.62-1.82s3.96-.7,3.96-.7c0,0,2,.89,1.37,4.02s.67,5.61.67,5.61c0,0-1.99,3.51-3.67,1.8l-1.18-.75c-.39-.36-2.17.05-3.31-.47"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 12.6, y: 6.1 },
        stemConnection: { x: 37.24, y: 46.46 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="11.12" cy="7.31" rx="4.11" ry="1.24" transform="translate(-.94 12.94) rotate(-58.34)"/>
            <polygon fill="#879f3c" points="13.7 4.89 13.14 4.06 12.15 3.96 12.58 3.23 14.13 4.17 13.7 4.89"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#e6e7e8" d="M7.24,16.05s-.02,0-.03-.01c-1.06-.64-1.75-2.3-2.27-2.42l-1.29-.53c-2.37-.39-.64-4.03-.64-4.03,0,0,3.12-.26,5.31-2.57,1.04-1.1,2.33-2,3.39-2.64.98-.59,2.24.05,2.31,1.19s.12,2.56.03,4c-.19,3.19,1.43,5.47,1.43,5.47,0,0-1.49,3.75-3.39,2.28l-1.27-.58c-.44-.3-2.15.34-3.34-.02"/>
            <polygon fill="#879f3c" points="14.18 5.36 13.14 4.13 11.57 3.8 12.11 2.9 14.72 4.47 14.18 5.36"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 13.3, y: 3.8 },
        stemConnection: { x: 22.79, y: 66.86 },
        bareSvg: true
      },
      {
        bud: (
          <g>
            <ellipse fill="#dde9dd" cx="7.67" cy="7.34" rx="1.45" ry="4.11" transform="translate(-2.56 4.52) rotate(-28.33)"/>
            <polygon fill="#879f3c" points="6.91 3.78 5.81 3.94 5.06 4.76 4.71 4.1 6.57 3.13 6.91 3.78"/>
          </g>
        ),
        bloom: (
          <g>
            <defs>
              <linearGradient id="bf_grad_7" x1="-133.69" y1="101.15" x2="-131.81" y2="96.38" gradientTransform="translate(18.19 -177.82) rotate(-48.88) scale(.98 1.21) skewX(-10.52)" gradientUnits="userSpaceOnUse">
                <stop offset=".48" stopColor="#e6e7e8"/>
                <stop offset=".5" stopColor="#e2e5e6"/>
                <stop offset=".69" stopColor="#c6d2d9"/>
                <stop offset=".81" stopColor="#bcccd5"/>
              </linearGradient>
            </defs>
            <path fill="#e6e7e8" d="M11.85,15.91s-.02,0-.03.01c-1.15.46-2.89,0-3.3.33l-1.2.7c-1.75,1.65-3.59-1.94-3.59-1.94,0,0,1.69-2.63,1.19-5.78-.24-1.5-.17-3.06-.03-4.3.13-1.14,1.4-1.74,2.35-1.11s2.11,1.46,3.2,2.41c2.41,2.09,5.21,2.19,5.21,2.19,0,0,2.07,3.46-.25,4.08l-1.23.65c-.5.16-1.03,1.91-2.04,2.64"/>
            <path fill="url(#bf_grad_7)" d="M15.48,11.5l-3.91,4.02-5.18.71-1.08-2.09,1.75-3.69,3.91,1.01c.35.09.74-.12.85-.46l.7-2.07,2.14.47.81,2.09Z"/>
            <polygon fill="#879f3c" points="7.05 3.64 5.77 3.94 4.79 4.82 4.49 4.24 6.75 3.05 7.05 3.64"/>
          </g>
        ),
        width: 20, height: 20, viewBox: "0 0 20 20",
        flowerAnchor: { x: 5.7, y: 3.8 },
        stemConnection: { x: 47.6, y: 58.27 },
        bareSvg: true
      }
    ]
  },
  todo1: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_未命名的渐变_211" x1="37.55" y1="200.1" x2="37.55" y2="-1.01" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_未命名的渐变_211)" strokeMiterlimit="10" strokeWidth="3" d="M35.16-.69s4.54,20.63,5.54,54.52c.96,32.29-1.72,59.82-6.41,124.93-.42,5.83.65,21.24.65,21.24"/>
          <path fill="#87a03c" d="M39.86,104.73l-1.59-11.31s-12.05-22.82-10.61-35.62c2.42-21.45-5.3-36.41-8.75-40.94-3.03-3.97,1.73-1.83,7.03,2.93,3.87,3.48,7.07,1.99,8.09,12.86,1.29,13.7,8.25,23.33,6.66,32.97"/>
          <path fill="#87a03c" d="M39.63,105.82s5.17-14.36,8.2-22.13c3.5-8.99,5.33-5.23,6.56-26.88,1.55-27.07,1.69-22.6,1.69-22.6,0,0-2.11-.52-4.37,11.76-2.14,11.63-6.72,24.73-6.72,27.42,0,2.87-3.19,8.75-4.23,12.64-.96,3.6.24,5.33.24,5.33l-1.37,14.47Z"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 35, y: 195 }, // Where it sways from (approximated center of the root)
      rootOffset: { x: 35, y: 40 }, // Center of interaction, over the flower blossom stem
      bareSvg: true,
      baseScale: 2.5 // Correct native scale to match 240px old flowers
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <path fill="#d6e1cb" d="M37.93,67.98c-3.17.81-10.62-.14-14.74-7.67-6.7-12.25-9.05-20.74-4.97-28.88,2-3.99,3.98,0,8.42-1.3,2.17-.64,4.94.84,6.04-.11,6.03-5.19,13.45,11.42,14.24,18.96.56,5.35-.16,12.31-2.13,15.05-.94,1.31-3.22,3.03-4.82,3.43l-2.04.52Z"/>
            <rect fill="#788f3a" x="33.8" y="66.64" width="8.82" height="1.88" rx=".94" ry=".94" transform="translate(-11.33 7.8) rotate(-10.16)"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#d6e1cb" d="M39.1,51.09s-6.88-3.42-7.86-7.62.69-7.54,3.31-9.85,5.31-1.38,5.31-1.38c0,0,11.48-2.62,5.77,8.58-5.71,11.2-5.13,9.67-5.13,9.67l-1.4.6Z"/>
            <path fill="#d6e1cb" d="M37.27,54.22s-12.7,1.55-17.71,0c-6.17-1.91-4.78-4.02-6.75-6.91-1.97-2.89,6.07-5.78,6.07-5.78,0,0,1.27-1.98,12.21,4.18,8.96,5.04,6.29,6.23,6.29,6.23l-.12,2.28Z"/>
            <path fill="#d6e1cb" d="M41.75,51.45s.08-9.5,3.54-13.43c3.46-3.94,7.34-3.64,10.78-4.28,4-.75,5.29,2.15,5.29,2.15,0,0,4.99,9.04-7.54,13.62s-10.89,2.97-10.89,2.97l-1.19-1.03Z"/>
            <path fill="#d6e1cb" d="M38.96,55.07s8.08-6.59,13.3-6.12c5.22.47,9.14.41,10.09,3.78,1.34,4.77-1.73,6.68-1.73,6.68,0,0-4.79,9.89-13.96,5.59-11.84-5.55-7.98-6.74-7.98-6.74l.28-3.18Z"/>
            <path fill="#d6e1cb" d="M41.08,58.54s3.5.16,3.03,5.38c-.47,5.22-3.28,5.26-9.82,6.06-3.47.42-9.85-4.49-9.85-4.49,0,0-.5-7.08,4.55-8.53,12.57-3.61,8.28-2.74,8.28-2.74l3.82,4.32Z"/>
            <path fill="#d6e1cb" d="M36.49,56.49s-7.24,6.84-11.26,10.2-8.04,2.14-13.22-1.92c-2.75-2.16-.51-6.48-.51-6.48,0,0,2.54-4.04,7.26-4.96,12.84-2.49,18.24-.44,18.24-.44l-.51,3.61Z"/>
            <ellipse fill="#e2cc67" cx="37.21" cy="51.33" rx="8.39" ry="5.37" transform="translate(-12.11 11.5) rotate(-15.14)"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 38, y: 67 },
        stemConnection: { x: 35, y: 0.5 },
        bareSvg: true
      }
    ]
  },
  todo1_pink: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_未命名的渐变_211_pink" x1="37.55" y1="200.1" x2="37.55" y2="-1.01" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_未命名的渐变_211_pink)" strokeMiterlimit="10" strokeWidth="3" d="M35.16-.69s4.54,20.63,5.54,54.52c.96,32.29-1.72,59.82-6.41,124.93-.42,5.83.65,21.24.65,21.24"/>
          <path fill="#87a03c" d="M39.86,104.73l-1.59-11.31s-12.05-22.82-10.61-35.62c2.42-21.45-5.3-36.41-8.75-40.94-3.03-3.97,1.73-1.83,7.03,2.93,3.87,3.48,7.07,1.99,8.09,12.86,1.29,13.7,8.25,23.33,6.66,32.97"/>
          <path fill="#87a03c" d="M39.63,105.82s5.17-14.36,8.2-22.13c3.5-8.99,5.33-5.23,6.56-26.88,1.55-27.07,1.69-22.6,1.69-22.6,0,0-2.11-.52-4.37,11.76-2.14,11.63-6.72,24.73-6.72,27.42,0,2.87-3.19,8.75-4.23,12.64-.96,3.6.24,5.33.24,5.33l-1.37,14.47Z"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 35, y: 195 },
      rootOffset: { x: 35, y: 40 },
      bareSvg: true,
      baseScale: 2.5
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <path fill="#eedbdf" d="M36.45,67.99c-3.26.28-10.46-1.87-13.29-9.98-4.6-13.18-5.53-21.94-.17-29.3,2.63-3.6,3.93.65,8.52.09,2.24-.27,5.76-.8,7.01-1.56,6.79-4.13,10.37,15.92,9.92,23.48-.32,5.37-2.17,12.11-4.57,14.49-1.14,1.14-3.67,2.46-5.31,2.6l-2.1.18Z"/>
            <rect fill="#788f3a" x="32.38" y="66.7" width="8.82" height="1.88" rx=".94" ry=".94" transform="translate(-.87 .48) rotate(-.74)"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#eedbdf" d="M39.1,52.11s-6.62-3.9-7.3-8.16,1.2-8.57,3.98-10.69c2.78-2.12,5.41.09,5.41.09,0,0,11.64-1.8,5.15,8.97-6.49,10.77-5.8,9.29-5.8,9.29l-1.44.5Z"/>
            <path fill="#eedbdf" d="M38.14,53.72s-12.79-.5-17.48-2.83c-5.79-2.88-2.77-3.95-3.6-7.35-1.03-4.24,6.11-4.59,6.11-4.59,0,0,.41-2.45,10.23,5.38,8.03,6.41,5.22,7.15,5.22,7.15l-.48,2.23Z"/>
            <path fill="#eedbdf" d="M41.63,52.27s1.6-9.36,5.65-12.69c4.04-3.33,7.83-2.41,11.33-2.5,4.06-.1,4.88,2.96,4.88,2.96,0,0,3.48,9.72-9.63,12.24s-11.22,1.19-11.22,1.19l-1.01-1.2Z"/>
            <path fill="#eedbdf" d="M38.29,55.39s9.03-5.21,14.11-3.91c5.08,1.29,8.96,1.87,9.35,5.34.56,4.93-4.17,5.39-4.17,5.39,0,0-4.92,9.91-13.28,4.2-10.8-7.38-6.8-7.93-6.8-7.93l.79-3.1Z"/>
            <path fill="#eedbdf" d="M39.83,59.16s3.43.72,2.13,5.8c-1.29,5.08-4.08,4.67-10.66,4.41-3.49-.14-9.01-6.01-9.01-6.01,0,0,.64-7.07,5.85-7.69,12.99-1.55,8.61-1.38,8.61-1.38l3.08,4.88Z"/>
            <path fill="#eedbdf" d="M35.62,56.4s-8.24,5.59-12.75,8.26c-4.51,2.68-8.28.83-12.75-4.01-2.37-2.57.53-6.48.53-6.48,0,0,3.16-3.59,7.96-3.73,13.08-.4,18.08,2.48,18.08,2.48l-1.08,3.48Z"/>
            <ellipse fill="#e2d971" cx="37.16" cy="51.43" rx="8.39" ry="5.37" transform="translate(-5.12 4.11) rotate(-5.93)"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 37, y: 66 },
        stemConnection: { x: 35, y: 0.5 },
        bareSvg: true
      }
    ]
  },

  todo3: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_j1" x1="31.61" y1="60.92" x2="31.61" y2="-4.36" gradientTransform="translate(-6.25 6.8) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
            <linearGradient id="_grad_j2" x1="35.6" y1="200" x2="35.6" y2=".45" gradientTransform="matrix(1,0,0,1,0,0)" href="#_grad_j1"/>
            <linearGradient id="_grad_j3" x1="37.6" y1="45.95" x2="36.17" y2="17.8" gradientTransform="matrix(1,0,0,1,0,0)" href="#_grad_j1"/>
          </defs>
          <path fill="none" stroke="url(#_grad_j1)" strokeWidth="1.5" strokeMiterlimit="10" d="M21.53,1.55s3.29,10.03,2.72,21.88c-1.52,31.82,7.79,36.62,7.79,36.62"/>
          <path fill="none" stroke="url(#_grad_j2)" strokeWidth="2" strokeMiterlimit="10" d="M38.44.85c-3.98,9.37-5.96,45.7-5.52,72.43.28,16.88-.08,30.54-.08,30.54l.1,96.19"/>
          <path fill="none" stroke="url(#_grad_j3)" strokeWidth="1.5" strokeMiterlimit="10" d="M32.94,46.05s2.37-18.21,6.48-20.08c2.79-1.26,1.06-8.26,1.06-8.26"/>
          <path fill="#879f3c" d="M37.41,13.56c-.25-1.54.89-1.67,2.03-1.86s2.29-.45,2.55,1.11c.51,3.09-.1,5.77-1.37,5.98s-2.71-2.13-3.22-5.22Z"/>
          <path fill="#879f3c" d="M32.64,49.54s-.04-4.3,1.89-6.49,10.38-2.98,11.95-5.04-1.23,6.38-6.74,9.85c-5.51,3.47-6.86,2.69-6.86,2.69l-.24-1.01Z"/>
          <path fill="#879f3c" d="M24.4,19.31s-.89-2.92-.15-4.72,6.07.42,6.71-2.57c.36-1.71,1.83,2.63-1.35,5.61s-4.61,2.45-4.61,2.45l-.59-.77Z"/>
          <path fill="#879f3c" d="M23.76,19.99s-1.06-3.45-2.33-6.07S10.24,5.11,12.25,6.88c4.17,3.66,1.31,5.39,5.69,10.21,4.38,4.82,6.02,3.9,6.02,3.9l-.2-1Z"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 21.6, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <path fill="#8b8dc5" d="M41.2,63.2s2.2-6.9,3.4-8.6c1.3-1.8,1.5-3.7,1.3-3.9-.4-.5-2.8-5.2-11-6.6,0,0-2.4.9-2.5,1l-.3.2c-.2,0-2.8.2-2.8.2-6.6,5-6.4,10.3-6.6,11,0,.2-.4,1,1.9,1.8,3.6,1.3,8.1,6.8,8.1,6.8"/>
            <path fill="#788f3a" d="M39.8,63.1l-3.3-1.5-2.2,2.8c-.4,0-3.5-2.1-3.3-1.4l6.2,5.7c.2.7,2.5.2,2.3-.5l2.5-7.8c-.2-.7-1.7,2.5-2.1,2.6h0Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#8b8dc5" d="M41.4,63.2s1.57-.7,2.84-5.89c1.37-5.63,10.63-9.12,10.63-9.12,0,0-11.17-4.07-12.06,2.4,0,0,3.37-3.54-1.31-9.97,0,0-10.2,4.77-8.07,8.6,0,0-5.83-3.44-15.52.6,0,0,1.37.14,5.86,3.78,0,0-4.4.43-8.61,4.82,0,0,7.41-.07,10.06,1.87,2.42,1.77,5.96,5.08,6.96,4.85s8.47-1.52,8.47-1.52"/>
            <polygon fill="#e8e5cf" points="37.81 52.45 34.38 51.8 31.17 54.03 30.68 52 37.33 50.42 37.81 52.45"/>
            <path fill="#788f3a" d="M39.81,63.06l-3.28-1.45-2.25,2.84c-.42.1-3.51-2.08-3.34-1.39l6.15,5.71c.17.68,2.51.16,2.34-.53l2.45-7.82c-.17-.68-1.65,2.53-2.07,2.63Z"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 38, y: 68 },
        stemConnection: { x: 21.6, y: 2 },
        bareSvg: true
      }
    ]
  },
  todo3_white: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_j1_w" x1="31.61" y1="60.92" x2="31.61" y2="-4.36" gradientTransform="translate(-6.25 6.8) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
            <linearGradient id="_grad_j2_w" x1="35.6" y1="200" x2="35.6" y2=".45" gradientTransform="matrix(1,0,0,1,0,0)" href="#_grad_j1_w"/>
            <linearGradient id="_grad_j3_w" x1="37.6" y1="45.95" x2="36.17" y2="17.8" gradientTransform="matrix(1,0,0,1,0,0)" href="#_grad_j1_w"/>
          </defs>
          <path fill="none" stroke="url(#_grad_j1_w)" strokeWidth="1.5" strokeMiterlimit="10" d="M21.53,1.55s3.29,10.03,2.72,21.88c-1.52,31.82,7.79,36.62,7.79,36.62"/>
          <path fill="none" stroke="url(#_grad_j2_w)" strokeWidth="2" strokeMiterlimit="10" d="M38.44.85c-3.98,9.37-5.96,45.7-5.52,72.43.28,16.88-.08,30.54-.08,30.54l.1,96.19"/>
          <path fill="none" stroke="url(#_grad_j3_w)" strokeWidth="1.5" strokeMiterlimit="10" d="M32.94,46.05s2.37-18.21,6.48-20.08c2.79-1.26,1.06-8.26,1.06-8.26"/>
          <path fill="#879f3c" d="M37.41,13.56c-.25-1.54.89-1.67,2.03-1.86s2.29-.45,2.55,1.11c.51,3.09-.1,5.77-1.37,5.98s-2.71-2.13-3.22-5.22Z"/>
          <path fill="#879f3c" d="M32.64,49.54s-.04-4.3,1.89-6.49,10.38-2.98,11.95-5.04-1.23,6.38-6.74,9.85c-5.51,3.47-6.86,2.69-6.86,2.69l-.24-1.01Z"/>
          <path fill="#879f3c" d="M24.4,19.31s-.89-2.92-.15-4.72,6.07.42,6.71-2.57c.36-1.71,1.83,2.63-1.35,5.61s-4.61,2.45-4.61,2.45l-.59-.77Z"/>
          <path fill="#879f3c" d="M23.76,19.99s-1.06-3.45-2.33-6.07S10.24,5.11,12.25,6.88c4.17,3.66,1.31,5.39,5.69,10.21,4.38,4.82,6.02,3.9,6.02,3.9l-.2-1Z"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 21.6, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <path fill="#e6e7e8" d="M41.92,63.2s2.24-6.93,3.42-8.56c1.29-1.78,1.45-3.71,1.26-3.92-.44-.47-2.82-5.24-10.98-6.58,0,0-2.36.91-2.52.99l-.34.19c-.18,0-2.76.23-2.76.23-6.57,5.01-6.44,10.34-6.61,10.96-.06.23-.36.99,1.91,1.83,3.62,1.35,8.05,6.79,8.05,6.79"/>
            <path fill="#788f3a" d="M40.5,63.06l-3.28-1.45-2.25,2.84c-.42.1-3.51-2.08-3.34-1.39l6.15,5.71c.17.68,2.51.16,2.34-.53l2.45-7.82c-.17-.68-1.65,2.53-2.07,2.63Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#e6e7e8" d="M41.4,63.2s1.57-.7,2.84-5.89c1.37-5.63,10.63-9.12,10.63-9.12,0,0-11.17-4.07-12.06,2.4,0,0,3.37-3.54-1.31-9.97,0,0-10.2,4.77-8.07,8.6,0,0-5.83-3.44-15.52.6,0,0,1.37.14,5.86,3.78,0,0-4.4.43-8.61,4.82,0,0,7.41-.07,10.06,1.87,2.42,1.77,5.96,5.08,6.96,4.85s8.47-1.52,8.47-1.52"/>
            <polygon fill="#f3f4f4" points="37.81 52.45 34.38 51.8 31.17 54.03 30.68 52 37.33 50.42 37.81 52.45"/>
            <path fill="#788f3a" d="M39.81,63.06l-3.28-1.45-2.25,2.84c-.42.1-3.51-2.08-3.34-1.39l6.15,5.71c.17.68,2.51.16,2.34-.53l2.45-7.82c-.17-.68-1.65,2.53-2.07,2.63Z"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 38, y: 68 },
        stemConnection: { x: 21.6, y: 2 },
        bareSvg: true
      }
    ]
  },
  todo4: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_d1_new" x1="29.36" y1="133.17" x2="29.36" y2="20.57" gradientTransform="translate(3.35 -11.05) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
            <linearGradient id="_grad_d2_new" x1="19.95" y1="133.34" x2="19.95" y2="14.65" href="#_grad_d1_new"/>
            <linearGradient id="_grad_d3_new" x1="31.79" y1="133.08" x2="31.79" y2="42.6" href="#_grad_d1_new"/>
          </defs>
          <path fill="none" stroke="url(#_grad_d1_new)" strokeWidth=".75" strokeMiterlimit="10" d="M38.69,6.12s-5.01,10.98-5.58,22.83c-1.52,31.82.75,80.38.75,80.38"/>
          <path fill="none" stroke="url(#_grad_d2_new)" strokeWidth=".5" strokeMiterlimit="10" d="M16.95,1.73c3.56,8.67,11.31,35.03,12.14,47.55,2.04,30.92,7.41,60.05,7.41,60.05"/>
          <path fill="none" stroke="url(#_grad_d3_new)" strokeWidth=".5" strokeMiterlimit="10" d="M46.88,25.96c-8.82,1.06-15.13,83.38-15.13,83.38"/>
          <path fill="#879f3c" d="M32.53,31.72s1.37-2.37,2.99-3.16c.24-.12-.13.47.11.44.6-.09.68,0,1.09-.32.35-.28.55-1.17.82-1.59.16-.25.37.17.51-.07.64-1.08,1.05-2.75,1.25-3.41.17-.58,1.08,2.87-2.06,5.88-3.14,3.01-4.16,2.97-4.16,2.97l-.55-.74Z"/>
          <path fill="#879f3c" d="M32.57,50.89s-1.06-3.45-2.33-6.07-6.04-6.96-5.52-4.96c.35,1.34-2.69-2.65,2.93,6.95,1.57,2.69,1.31,2.06,2.54,3.14,1.18,1.03,1.88,1.88,2.37,1.87l.02-.94Z"/>
          <path fill="#879f3c" d="M30.98,70.28s-.55-2.4-1.29-4.25-3.78-5.04-3.52-3.65c.17.93-1.7-1.94,1.65,4.88.94,1.91.8,1.47,1.58,2.27.75.76,1.19,1.37,1.52,1.39l.06-.64Z"/>
          <path fill="#879f3c" d="M41.17,37.74s.33-1.43.34-2.62c0-.55-.54-1.24-.56-2.65,0-.57-1.52.87-.71,2.85.47,1.15.07.99.29,1.62.21.6.3,1.04.47,1.13l.18-.33Z"/>
          <path fill="#879f3c" d="M20.47,11.47s-.64-1.32-1.39-2.24c-.35-.43-1.2-.62-2.1-1.7-.37-.44-.64,1.63,1.24,2.66,1.09.6.68.73,1.24,1.07.54.33.88.62,1.08.58l-.07-.37Z"/>
          <path fill="#879f3c" d="M22.56,18.96s.26-1.45.72-2.54c.22-.51.99-.92,1.56-2.21.23-.52,1.06,1.4-.47,2.9-.88.87-.45.89-.9,1.37-.43.47-.68.84-.88.85l-.04-.38Z"/>
          <path fill="#879f3c" d="M33.47,104.55s-2.99-5.72-6.11-9.89-8.93-8.78-11.51-6.62c-2.48,2.06-.57,2.24,1.7,6.78.62,1.23-1.79-.85.12,1.36.88,1.02,3.9,2.48,5.64,3.09,3.84,1.35-1.12.48-.39,1.54.24.36,5.33,2.68,5.96,3.04,2.45,1.37,3.99,2.59,4.86,2.39l-.26-1.69Z"/>
          <path fill="#879f3c" d="M31.58,107.68s-1.92-3.41-3.94-5.78-5.02-6.01-6.77-4.31c-.54.52-1.95,1.14-.49,3.86.4.74-.86.51.38,1.74.57.57,1.5,1.7,2.63,1.89,2.5.41,1.99,1.12,2.46,1.74.16.21,2.33.82,2.74.98,1.59.6,2.59,1.22,3.16.97l-.16-1.09Z"/>
          <path fill="#879f3c" d="M33.56,95.7s1.55-5.45,3.42-9.67,3.11-11,5.42-9.92,2.72-.63,1.57,3.67c-.31,1.17,1.92.52.74,2.83-.55,1.07-2.65,5.16-3.93,6.12-2.82,2.11,1.42-.63,1,.43-.14.35-4.28,4.31-4.73,4.77-1.73,1.76-2.76,3.16-3.47,3.22l-.02-1.45Z"/>
          <path fill="#879f3c" d="M33.95,106.89s3.46-5.89,6.95-10.18c3.49-4.29,9.77-9.05,12.28-6.84,2.41,2.11.44,2.3-2.2,6.98-.72,1.27,1.89-.88-.21,1.39-.98,1.06-4.18,2.56-6.01,3.2-4.04,1.4,1.12.49.3,1.59-.27.37-5.66,2.77-6.34,3.14-2.61,1.42-4.27,2.67-5.16,2.47l.39-1.74Z"/>
          <ellipse fill="#879f3c" cx="16.95" cy="1.54" rx="1.85" ry="1.27" transform="translate(.56 6.15) rotate(-20.89)"/>
          <g>
            <ellipse fill="#879f3c" cx="48.04" cy="25.55" rx="1.52" ry="2.21" transform="translate(-2.81 6.19) rotate(-7.16)"/>
            <path fill="#e6e7e8" d="M49.11,25.32c.05.39.31.76.22,1.08-.16.56-.47.96-.77,1-.28.04-.02-.52-.24-.96-.15-.31-.82-.41-.87-.85-.04-.28.42-.55.44-.79.05-.68-.16-1.19.19-1.24.32-.04.74.27,1.03.8.15.27-.04.6,0,.96Z"/>
          </g>
        </>
      ),
      width: 70,
      height: 120,
      viewBox: "0 0 70 120",
      bottomAnchor: { x: 33, y: 110 },
      rootOffset: { x: 33, y: 50 },
      bareSvg: true,
      baseScale: 3
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="20.6" cy="30.3" rx="1.9" ry="2.7" transform="translate(-16 31.1) rotate(-57)"/>
            <path fill="#e6e7e8" d="M21.2,29.1c.4.3,1,.3,1.2.6.4.6.5,1.2.3,1.5-.2.3-.5-.4-1.1-.5-.4-.1-1,.5-1.5.1-.3-.2-.2-.8-.4-1-.6-.6-1.2-.8-1-1.2.2-.3.9-.5,1.6-.3.4,0,.5.5.9.8h0Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#e6e7e8" d="M22.53,28.23s3.62-1.8,5.11-1.46.22,1.71-2.12,1.93-3.1.1-3.1.1l.11-.58Z"/>
            <path fill="#e6e7e8" d="M18.33,26.88s-1.34-6.05-.48-6.51,2.53-.18,2.16,2.87-.37,3.76-.37,3.76l-1.31-.13Z"/>
            <path fill="#e6e7e8" d="M17.83,27.19s-3.19-5.98-2.56-6.73,2.24-.97,2.9,2.37.89,4.09.89,4.09l-1.23.27Z"/>
            <path fill="#e6e7e8" d="M19.31,26.71s1.04-5.73,1.96-5.8,2.29.8.85,3.3-1.71,3.1-1.71,3.1l-1.1-.61Z"/>
            <path fill="#e6e7e8" d="M20.61,27.19s1.21-4.29,2.14-4.36,2.69.4,1.41,1.95c-1.49,1.8-2.66,2.9-2.66,2.9l-.89-.49Z"/>
            <path fill="#e6e7e8" d="M21.69,27.68s2.17-3.08,3.1-3.08c1.05,0,2.36.92,1.03,1.93-1.85,1.41-3.21,1.93-3.21,1.93l-.92-.78Z"/>
            <path fill="#e6e7e8" d="M22.99,28.86s3.76-1.82,4.68-1.82c1.05,0,3.75-.11,2.42.9-1.85,1.41-6.4,2.18-6.4,2.18l-.71-1.26Z"/>
            <path fill="#e6e7e8" d="M23.67,29.99s4.04-1.27,4.96-1.27c1.05,0,2.69.94,1.82,1.42-2.04,1.12-6.67,1.27-6.67,1.27l-.12-1.42Z"/>
            <ellipse fill="#f2c517" cx="20.61" cy="29.45" rx="2.62" ry="3.58" transform="translate(-15.32 28.26) rotate(-53.12)"/>
            <path fill="#e6e7e8" d="M18.85,31.4s-1.26.15-2.36,0-.33-1.59-.33-1.59c-.99-.33-3.5-.15-3.5-.15-4.87-.99.69-1.99.69-1.99l-3.5-1.6c-2-1.88,2.12-1.02,2.12-1.02,0,0-1.11-.66-1.53-1.23s1.14-1.01,1.14-1.01c-.57-1.07,1.94-.79,1.94-.79-.42-1.2,1.85-.3,1.85-.3l2.54,5.29-.2,2.14,1.13,2.3"/>
            <path fill="#e6e7e8" d="M23.78,31.28s6.39.84,6.18,2.14-3.23.34-3.23.34c0,0,4.41,4.54.45,2.73l-1.98-1.38s-.18,1.04-.99.59c0,0-.69,1.64-2.82.11l-1.26-2.48s-4.61-.93-2.16-1.49c0,0-1.5.03-1.23-.45s2.2-.08,2.2-.08l3.28.74,1.54-.76Z"/>
          </g>
        ),
        width: 40,
        height: 40,
        viewBox: "0 0 40 40",
        flowerAnchor: { x: 20, y: 31 }, 
        stemConnection: { x: 38.7, y: 6.1 },
        bareSvg: true
      }
    ]
  },
  todo5: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_p1" data-name="未命名的渐变 211" x1="12.79" y1="271.47" x2="12.79" y2="55.44" gradientTransform="translate(22.35 -46.37) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_grad_p1)" strokeMiterlimit="10" strokeWidth="2" d="M39.93,4.41s10.85,1.05,11.43,10.59c.49,8.12.07,13.34-10.88,32.4-24.41,42.47-2.06,92.76-2.06,92.76l22.69,59.84"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 40, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="32.04" cy="50.37" rx="9.87" ry="11.52" transform="translate(-25.82 65.08) rotate(-71.81)"/>
            <path fill="#f8a151" d="M27.34,46.88c8.71,2.86,15.49,6.01,15.16,7.03s-7.67-.47-16.37-3.33c-8.71-2.86-4.18-2.11-3.85-3.13s-3.64-3.43,5.06-.57Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#f8a151" d="M32.29,47.07s-24.99-27.39,2.12-27.39c0,0,20.33-.71,15.11,12.56-5.22,13.27-9.74,14.12-9.74,14.12l-7.48.71Z"/>
            <path fill="#f8a151" d="M31.49,43.25c-.56-4.81-4.02-27.83-17.79-13.04-.8.85-1.31,1.94-1.47,3.1-.53,3.96-1.18,13.4,4.24,16.16,5,2.55,7.41,2.01,8.37,1.51.5-.26,1.02-.49,1.57-.62l.55-.12c2.23-.51,3.94-2.31,4.34-4.56l.14-.78c.1-.54.11-1.09.05-1.64Z"/>
            <path fill="#bf762a" d="M39.2,48.83c-5.74,3.31-12.18,2.89-14.39-.93-2.21-3.83.65-9.62,6.39-12.93,1.2-.69,3.59,3.12,4.81,2.75,4.6-1.39,6.5-6.88,9.58-1.82,2.3,3.78-.65,9.62-6.39,12.93Z"/>
            <path fill="#f8a151" d="M40.51,43.54c1.88-1.97,2.04-3.47,2.65-5.93,1.01-4.05,2.23-6.35,4.94-7.34,9.46-3.46,22.31,2.4,7.76,10.73-10.73,6.15-14.91,8.26-16.38,8.52-.39.07-2.35.73-2.68.52,0,0,1.63-4.32,3.71-6.49Z"/>
            <path fill="#f8a151" d="M32.2,49.9s-19.92-3.45-17.36,8.61c1.55,7.34,15.59.81,15.59.81,0,0,18.49,1.55,27.81-20.96,2.74-6.62-22.25,11.54-22.25,11.54"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 41, y: 54 },
        stemConnection: { x: 40, y: 4.5 },
        bareSvg: true
      }
    ]
  },
  todo5_white: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_p1_w" data-name="未命名的渐变 211" x1="12.79" y1="271.47" x2="12.79" y2="55.44" gradientTransform="translate(22.35 -46.37) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_grad_p1_w)" strokeMiterlimit="10" strokeWidth="2" d="M39.93,4.41s10.85,1.05,11.43,10.59c.49,8.12.07,13.34-10.88,32.4-24.41,42.47-2.06,92.76-2.06,92.76l22.69,59.84"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 40, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="32.04" cy="50.37" rx="9.87" ry="11.52" transform="translate(-25.82 65.08) rotate(-71.81)"/>
            <path fill="#dde8d3" d="M27.34,46.88c8.71,2.86,15.49,6.01,15.16,7.03s-7.67-.47-16.37-3.33c-8.71-2.86-4.18-2.11-3.85-3.13s-3.64-3.43,5.06-.57Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#dde8d3" d="M32.29,47.07s-24.99-27.39,2.12-27.39c0,0,20.33-.71,15.11,12.56-5.22,13.27-9.74,14.12-9.74,14.12l-7.48.71Z"/>
            <path fill="#dde8d3" d="M31.49,43.25c-.56-4.81-4.02-27.83-17.79-13.04-.8.85-1.31,1.94-1.47,3.1-.53,3.96-1.18,13.4,4.24,16.16,5,2.55,7.41,2.01,8.37,1.51.5-.26,1.02-.49,1.57-.62l.55-.12c2.23-.51,3.94-2.31,4.34-4.56l.14-.78c.1-.54.11-1.09.05-1.64Z"/>
            <path fill="#f2c851" d="M39.2,48.83c-5.74,3.31-12.18,2.89-14.39-.93-2.21-3.83.65-9.62,6.39-12.93,1.2-.69,3.59,3.12,4.81,2.75,4.6-1.39,6.5-6.88,9.58-1.82,2.3,3.78-.65,9.62-6.39,12.93Z"/>
            <path fill="#dde8d3" d="M40.51,43.54c1.88-1.97,2.04-3.47,2.65-5.93,1.01-4.05,2.23-6.35,4.94-7.34,9.46-3.46,22.31,2.4,7.76,10.73-10.73,6.15-14.91,8.26-16.38,8.52-.39.07-2.35.73-2.68.52,0,0,1.63-4.32,3.71-6.49Z"/>
            <path fill="#dde8d3" d="M32.2,49.9s-19.92-3.45-17.36,8.61c1.55,7.34,15.59.81,15.59.81,0,0,18.49,1.55,27.81-20.96,2.74-6.62-22.25,11.54-22.25,11.54"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 41, y: 54 },
        stemConnection: { x: 40, y: 4.5 },
        bareSvg: true
      }
    ]
  },
  todo5_v2: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_p2" data-name="未命名的渐变 211" x1="-7.49" y1="288.25" x2="-7.49" y2="74.06" gradientTransform="translate(31.77 -63.89) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_grad_p2)" strokeMiterlimit="10" strokeWidth="2" d="M33.99,5.99c-1.94-3.42-5.72,1.84-5.72,1.84,0,0-5.45,7.73-5.51,15.74-.15,22.11,9.32,12.28,10.11,56.12s.17,70.1.17,70.1l-.96,50.21"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 40, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="28.7" cy="54.43" rx="9.87" ry="11.52" transform="translate(-28.52 31.8) rotate(-40.62)"/>
            <path fill="#f8a151" d="M30.9,59.85c-5.97-6.96-10.14-13.16-9.33-13.86s6.31,4.37,12.28,11.33c5.97,6.96,2.49,3.97,1.67,4.67s1.34,4.82-4.63-2.13Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#f8a151" d="M33.68,25.14s13.49-1.47,16.19,10.29c.26,1.13,1.57,2.34,1.72,3.76,1.52,14.66-2.55,14.41-2.55,14.41,0,0-2.12,7.85-6.25,8.27s-8.69.03-8.69.03l-6.97-12.13,6.55-24.63Z"/>
            <path fill="#bf762a" d="M38.82,44.26c-.38,6.61-2.71,10.82-6.06,10.63-3.35-.19-5.76-5.71-5.38-12.33s3.41-11.82,6.76-11.63c3.35.19,5.07,6.71,4.69,13.32Z"/>
            <path fill="#f8a151" d="M20.78,41.68c-1.05,2.35-.6,5.04,1.15,6.94h0c1.42,4.78,4.6,8.84,8.9,11.36l3.3,1.94-.33-2.79s.33,2.79-.1-1-3.34-5.9-3.34-5.9c2.89-2.92-1.37-9.13-1.37-9.13l3.12-.32c3.12-.32,4.49-4.3,6.86-8.17s-1.5-10.33-9.12-9.94c-7.63.39-6.93,12.21-6.93,12.21l-2.14,4.8Z"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 21.5, y: 46 },
        stemConnection: { x: 34, y: 6 },
        bareSvg: true
      }
    ]
  },
  todo5_white_v2: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_p2_w" data-name="未命名的渐变 211" x1="-7.49" y1="288.25" x2="-7.49" y2="74.06" gradientTransform="translate(31.77 -63.89) rotate(-2.92) scale(1 .91)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_grad_p2_w)" strokeMiterlimit="10" strokeWidth="2" d="M33.99,5.99c-1.94-3.42-5.72,1.84-5.72,1.84,0,0-5.45,7.73-5.51,15.74-.15,22.11,9.32,12.28,10.11,56.12s.17,70.1.17,70.1l-.96,50.21"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 40, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="28.7" cy="54.43" rx="9.87" ry="11.52" transform="translate(-28.52 31.8) rotate(-40.62)"/>
            <path fill="#dde8d3" d="M30.9,59.85c-5.97-6.96-10.14-13.16-9.33-13.86s6.31,4.37,12.28,11.33c5.97,6.96,2.49,3.97,1.67,4.67s1.34,4.82-4.63-2.13Z"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="#dde8d3" d="M33.68,25.14s13.49-1.47,16.19,10.29c.26,1.13,1.57,2.34,1.72,3.76,1.52,14.66-2.55,14.41-2.55,14.41,0,0-2.12,7.85-6.25,8.27s-8.69.03-8.69.03l-6.97-12.13,6.55-24.63Z"/>
            <path fill="#f2c851" d="M38.82,44.26c-.38,6.61-2.71,10.82-6.06,10.63-3.35-.19-5.76-5.71-5.38-12.33s3.41-11.82,6.76-11.63c3.35.19,5.07,6.71,4.69,13.32Z"/>
            <path fill="#dde8d3" d="M20.78,41.68c-1.05,2.35-.6,5.04,1.15,6.94h0c1.42,4.78,4.6,8.84,8.9,11.36l3.3,1.94-.33-2.79s.33,2.79-.1-1-3.34-5.9-3.34-5.9c2.89-2.92-1.37-9.13-1.37-9.13l3.12-.32c3.12-.32,4.49-4.3,6.86-8.17s-1.5-10.33-9.12-9.94c-7.63.39-6.93,12.21-6.93,12.21l-2.14,4.8Z"/>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 21.5, y: 46 },
        stemConnection: { x: 34, y: 6 },
        bareSvg: true
      }
    ]
  },

todo6: {
    customStem: {
      svgObj: (
        <>
          <defs>
            <linearGradient id="_grad_a1" data-name="未命名的渐变 211" x1="-16.44" y1="307.85" x2="-16.44" y2="93.31" gradientTransform="translate(41.41 -85.82) rotate(-2.92) scale(1 .93)" gradientUnits="userSpaceOnUse">
              <stop offset=".66" stopColor="#87a03c"/>
              <stop offset=".82" stopColor="#859f3b"/>
              <stop offset=".88" stopColor="#7e9c3b"/>
              <stop offset=".92" stopColor="#72973a"/>
              <stop offset=".95" stopColor="#619039"/>
              <stop offset=".98" stopColor="#4b8738"/>
              <stop offset="1" stopColor="#377f37"/>
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#_grad_a1)" strokeMiterlimit="10" strokeWidth="3" d="M33.86,1.16s1.32,18.27,2.14,62.68c.83,44.75.22,71.02.22,71.02l-1.23,65.15"/>
        </>
      ),
      width: 70,
      height: 200,
      viewBox: "0 0 70 200",
      bottomAnchor: { x: 38, y: 196 },
      rootOffset: { x: 40, y: 40 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <ellipse fill="#879f3c" cx="35" cy="34.14" rx="12.68" ry="12.3" transform="translate(-6 7.5) rotate(-11.27)"/>
  <path fill="#e6e7e8" d="M35.23,22.32c-4.4.01-6.9,1.92-5.89,5.1,1.59,4.99,5.49,13.57,5.49,13.57,0,0,7.36-12.92,6.63-15.58-.19-.7-.58-3.11-6.23-3.09Z"/>
          </g>
        ),
        bloom: (
          <g>
            <ellipse fill="#e6e7e8" cx="20.29" cy="43.23" rx="12.62" ry="11"/>
  <ellipse fill="#e6e7e8" cx="28.16" cy="27.97" rx="18.47" ry="12.68"/>
  <ellipse fill="#e6e7e8" cx="41.44" cy="27.27" rx="18.47" ry="12.68"/>
  <path fill="#879f3c" d="M44.24,37.71c.2,12.88-20.64,12.88-20.44,0-.2-12.88,20.64-12.88,20.44,0Z"/>
  <g>
    <path fill="#e6e7e8" d="M20.6,8.09c.03,4.76-2.52,4.76-2.49,0-.03-4.76,2.52-4.76,2.49,0Z"/>
    <path fill="#e6e7e8" d="M22.69,10.53c-3.72,2.69-5.15.45-1.39-2.18,3.72-2.69,5.15-.45,1.39,2.18Z"/>
    <path fill="#e6e7e8" d="M22.14,13.04c-4.4-1.06-3.81-3.68.57-2.56,4.4,1.06,3.81,3.68-.57,2.56Z"/>
    <path fill="#e6e7e8" d="M19.48,14.74c-1.97-4.28.33-5.44,2.25-1.13,1.97,4.28-.33,5.44-2.25,1.13Z"/>
    <path fill="#e6e7e8" d="M17.38,13.32c1.36-4.54,3.79-3.7,2.37.81-1.36,4.54-3.79,3.7-2.37-.81Z"/>
    <path fill="#e6e7e8" d="M16,9.98c4.33-1.34,5.03,1.25.69,2.53-4.33,1.34-5.03-1.25-.69-2.53Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M28.79,7.4c-1.7,4.41-4.06,3.38-2.3-1.01,1.7-4.41,4.06-3.38,2.3,1.01Z"/>
    <path fill="#e6e7e8" d="M29.84,10.5c-4.41.98-4.92-1.66-.5-2.58,4.41-.98,4.92,1.66.5,2.58Z"/>
    <path fill="#e6e7e8" d="M28.42,12.6c-3.68-2.75-2.19-4.94,1.46-2.14,3.68,2.75,2.19,4.94-1.46,2.14Z"/>
    <path fill="#e6e7e8" d="M25.34,13.09c-.27-4.75,2.28-4.9,2.49-.14.27,4.75-2.28,4.9-2.49.14Z"/>
    <path fill="#e6e7e8" d="M23.92,10.93c2.9-3.64,4.85-1.89,1.9,1.71-2.9,3.64-4.85,1.89-1.9-1.71Z"/>
    <path fill="#e6e7e8" d="M23.85,7.3c4.48.5,4.2,3.18-.28,2.61-4.48-.5-4.2-3.18.28-2.61Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M36.36,6.66c-1.77,3.98-4.15,3.04-2.27-1.03,1.77-3.98,4.15-3.04,2.27,1.03Z"/>
    <path fill="#e6e7e8" d="M37.32,9.58c-4.37.73-4.93-1.74-.43-2.42,4.37-.73,4.93,1.74.43,2.42Z"/>
    <path fill="#e6e7e8" d="M35.85,11.48c-3.67-2.79-1.97-4.65,1.51-1.93,3.67,2.79,1.97,4.65-1.51,1.93Z"/>
    <path fill="#e6e7e8" d="M32.77,11.8c-.14-4.47,2.41-4.43,2.49-.02.14,4.47-2.41,4.43-2.49.02Z"/>
    <path fill="#e6e7e8" d="M31.4,9.73c2.9-3.2,4.94-1.65,1.85,1.67-2.9,3.2-4.94,1.65-1.85-1.67Z"/>
    <path fill="#e6e7e8" d="M31.43,6.35c4.47.66,4.1,3.14-.35,2.42-4.47-.66-4.1-3.14.35-2.42Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M45.48,8.39c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M44.64,11.56c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M42.33,12.41c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M39.55,10.94c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M39.56,8.31c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M41.5,5.3c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M48.79,17.62c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M47.96,20.79c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M45.65,21.64c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M42.87,20.18c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M42.88,17.54c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M44.82,14.53c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M36.98,14.83c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M36.14,18c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M33.84,18.85c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M31.06,17.38c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M31.07,14.75c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M33,11.74c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M23.27,19.19c-4.34,3.01-5.81.31-1.51-2.59,4.34-3.01,5.81-.31,1.51,2.59Z"/>
    <path fill="#e6e7e8" d="M22.32,22.88c-4.66-2.17-3.56-5.08,1.14-2.8,4.66,2.17,3.56,5.07-1.14,2.8Z"/>
    <path fill="#e6e7e8" d="M19.71,23.87c-1.7-5.19,1.02-6.28,2.67-1,1.7,5.19-1.02,6.28-2.67,1Z"/>
    <path fill="#e6e7e8" d="M16.56,22.16c2.72-4.75,5.12-3,2.39,1.63-2.72,4.75-5.12,3-2.39-1.63Z"/>
    <path fill="#e6e7e8" d="M16.57,19.09c4.97-1.41,5.64,1.65.7,2.97-4.97,1.41-5.64-1.65-.7-2.97Z"/>
    <path fill="#e6e7e8" d="M18.77,15.59c3.81,3.61,1.96,6.03-1.88,2.29-3.81-3.61-1.96-6.03,1.88-2.29Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M16.14,26.52c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M15.3,29.69c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M12.99,30.54c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M10.21,29.07c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M10.23,26.44c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M12.16,23.43c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M9.64,33.79c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M8.81,36.96c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M6.5,37.81c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M3.72,36.34c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M3.73,33.71c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M5.67,30.7c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M10.2,24.98c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M9.36,28.14c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M7.06,28.99c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M4.27,27.53c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M4.29,24.89c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M6.22,21.88c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M12.58,16.98c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M11.75,20.14c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M9.44,20.99c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M6.66,19.53c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M6.67,16.89c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M8.61,13.88c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M8.98,45.77c-3.98-2.23-2.77-4.6,1.18-2.32,3.98,2.23,2.77,4.6-1.18,2.32Z"/>
    <path fill="#e6e7e8" d="M5.95,46.55c-.47-4.73,2.07-5,2.48-.26.47,4.73-2.07,5-2.48.26Z"/>
    <path fill="#e6e7e8" d="M4.12,44.85c2.97-3.58,4.88-1.79,1.86,1.75-2.97,3.58-4.88,1.79-1.86-1.75Z"/>
    <path fill="#e6e7e8" d="M3.97,41.57c4.51.2,4.38,2.89-.12,2.63-4.51-.2-4.38-2.89.12-2.63Z"/>
    <path fill="#e6e7e8" d="M6.15,40.29c3.14,3.42,1.29,5.28-1.8,1.82-3.14-3.42-1.29-5.28,1.8-1.82Z"/>
    <path fill="#e6e7e8" d="M9.58,40.59c-.93,4.66-3.43,4.08-2.43-.56.93-4.66,3.43-4.08,2.43.56Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M13.39,48.93c-3.44,2.2-4.85.32-1.24-1.93,3.44-2.2,4.85-.32,1.24,1.93Z"/>
    <path fill="#e6e7e8" d="M12.62,51.68c-3.9-1.68-2.82-3.77.93-2.09,3.9,1.68,2.82,3.77-.93,2.09Z"/>
    <path fill="#e6e7e8" d="M10.48,52.42c-1.4-3.96.88-4.61,2.19-.75,1.4,3.96-.88,4.61-2.19.75Z"/>
    <path fill="#e6e7e8" d="M7.89,51.14c2.14-3.45,4.24-2.36,1.96,1.22-2.14,3.45-4.24,2.36-1.96-1.22Z"/>
    <path fill="#e6e7e8" d="M7.91,48.85c4-1.05,4.68,1.2.57,2.21-4,1.05-4.68-1.2-.57-2.21Z"/>
    <path fill="#e6e7e8" d="M9.7,46.24c3.2,2.81,1.48,4.43-1.54,1.71-3.2-2.81-1.48-4.43,1.54-1.71Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M21.51,55c-1.68.9-3.34,1.22-3.72.71-.55-3.01,11.18-5.57,3.72-.71Z"/>
    <path fill="#e6e7e8" d="M20.64,57.65c-8.25-3.87,3.87-2.79,3.8.23-.29.55-1.99.45-3.8-.23Z"/>
    <path fill="#e6e7e8" d="M18.26,58.36c-2.32-7.75,5.03.47,2.39,2.54-.67.2-1.74-.94-2.39-2.54Z"/>
    <path fill="#e6e7e8" d="M15.39,57.13c1.05-1.43,2.4-2.33,3-2.01,2,2.56-7.29,9.1-3,2.01Z"/>
    <path fill="#e6e7e8" d="M15.41,54.93c4.35-1.01,5.28,1.12.64,2.13-4.35,1.01-5.28-1.12-.64-2.13Z"/>
    <path fill="#e6e7e8" d="M17.4,52.42c6.43,5.81-4.63,1.7-3.54-1.22.47-.45,2.06.09,3.54,1.22Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M31.94,58.82c-3.63,2.22-5.28.37-1.33-1.97,3.63-2.22,5.28-.37,1.33,1.97Z"/>
    <path fill="#e6e7e8" d="M31.11,61.63c-4.25-1.74-2.98-3.83,1-2.13,4.25,1.74,2.98,3.83-1,2.13Z"/>
    <path fill="#e6e7e8" d="M28.8,62.38c-1.52-4.1.98-4.65,2.36-.76,1.52,4.1-.98,4.65-2.36.76Z"/>
    <path fill="#e6e7e8" d="M26.02,61.08c2.25-3.46,4.6-2.48,2.11,1.24-2.25,3.46-4.6,2.48-2.11-1.24Z"/>
    <path fill="#e6e7e8" d="M26.03,58.75c4.27-1.07,5.07,1.21.62,2.26-4.27,1.07-5.07-1.21-.62-2.26Z"/>
    <path fill="#e6e7e8" d="M27.97,56.08c3.5,2.93,1.52,4.48-1.66,1.74-3.5-2.93-1.52-4.48,1.66-1.74Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M27.59,50.93c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M26.76,54.09c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M24.45,54.95c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M21.67,53.48c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M21.68,50.84c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M23.62,47.84c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M20.96,46.41c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M20.12,49.58c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M17.81,50.43c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M15.03,48.96c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M15.04,46.33c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M16.98,43.32c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M19.23,38.87c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M18.4,42.04c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M16.09,42.89c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M13.31,41.42c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M13.32,38.78c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M15.26,35.78c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M26.33,38.78c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M25.49,41.95c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M23.18,42.8c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M20.4,41.33c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M20.42,38.69c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M22.35,35.69c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M24.19,27.96c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M23.36,31.13c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M21.05,31.98c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M18.27,30.51c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M18.28,27.88c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M20.22,24.87c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M28.42,21.69c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M27.59,24.86c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M25.28,25.71c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M22.5,24.24c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M22.51,21.61c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M24.45,18.6c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M37.07,22.31c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M36.23,25.47c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M33.92,26.32c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M31.14,24.86c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M31.16,22.22c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M33.09,19.21c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M46.46,25.15c-3.72,2.4-5.22.33-1.33-2.1,3.72-2.4,5.22-.33,1.33,2.1Z"/>
    <path fill="#e6e7e8" d="M45.62,28.14c-4.19-1.82-3.05-4.1,1-2.28,4.19,1.82,3.05,4.1-1,2.28Z"/>
    <path fill="#e6e7e8" d="M43.32,28.94c-1.51-4.3.94-5.02,2.36-.81,1.51,4.3-.94,5.02-2.36.81Z"/>
    <path fill="#e6e7e8" d="M40.54,27.56c2.31-3.77,4.56-2.55,2.11,1.32-2.31,3.77-4.56,2.55-2.11-1.32Z"/>
    <path fill="#e6e7e8" d="M40.55,25.07c4.32-1.14,5.03,1.31.62,2.41-4.32,1.14-5.03-1.31-.62-2.41Z"/>
    <path fill="#e6e7e8" d="M42.48,22.22c3.44,3.04,1.61,4.83-1.66,1.86-3.44-3.04-1.61-4.83,1.66-1.86Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M39.81,56.88c.32,4.23-2.22,4.34-2.49.15-.32-4.23,2.22-4.34,2.49-.15Z"/>
    <path fill="#e6e7e8" d="M42.05,58.9c-3.38,2.53-5.23.85-1.53-1.84,3.37-2.53,5.23-.85,1.53,1.84Z"/>
    <path fill="#e6e7e8" d="M41.65,61.16c-4.51-.68-3.97-3.02.41-2.3,4.51.68,3.97,3.02-.41,2.3Z"/>
    <path fill="#e6e7e8" d="M39.11,62.82c-2.29-3.82.1-4.71,2.17-1.14,2.29,3.82-.1,4.71-2.17,1.14Z"/>
    <path fill="#e6e7e8" d="M36.92,61.7c1.03-4.01,3.55-3.6,2.42.57-1.03,4.01-3.55,3.6-2.42-.57Z"/>
    <path fill="#e6e7e8" d="M35.34,58.83c4.11-1.44,5.2.73.84,2.19-4.11,1.44-5.2-.73-.84-2.19Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M50.87,57.54c-3.61,2.17-5.3.38-1.33-1.93,3.6-2.17,5.3-.38,1.33,1.93Z"/>
    <path fill="#e6e7e8" d="M50.04,60.28c-4.27-1.72-2.96-3.75,1-2.09,4.27,1.72,2.96,3.75-1,2.09Z"/>
    <path fill="#e6e7e8" d="M47.73,61.02c-1.52-4.03.99-4.54,2.36-.75,1.52,4.03-.99,4.54-2.36.75Z"/>
    <path fill="#e6e7e8" d="M44.95,59.75c1.02-1.49,2.32-2.43,2.91-2.09,1.97,2.6-7.07,9.49-2.91,2.09Z"/>
    <path fill="#e6e7e8" d="M44.96,57.46c4.26-1.05,5.08,1.18.62,2.21-4.26,1.05-5.08-1.18-.62-2.21Z"/>
    <path fill="#e6e7e8" d="M46.9,54.85c6.25,6.06-4.54,1.72-3.43-1.27.46-.47,1.99.1,3.43,1.27Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M58.05,53.75c-3.47,2.19-4.94.33-1.26-1.92,3.47-2.19,4.94-.33,1.26,1.92Z"/>
    <path fill="#e6e7e8" d="M57.26,56.49c-3.98-1.68-2.84-3.75.94-2.08,3.98,1.68,2.84,3.75-.94,2.08Z"/>
    <path fill="#e6e7e8" d="M55.08,57.22c-1.42-3.96.9-4.58,2.22-.74,1.42,3.96-.9,4.58-2.22.74Z"/>
    <path fill="#e6e7e8" d="M52.46,55.95c2.15-3.42,4.31-2.37,1.99,1.21-2.15,3.42-4.31,2.37-1.99-1.21Z"/>
    <path fill="#e6e7e8" d="M52.48,53.67c4.05-1.05,4.76,1.19.58,2.2-4.05,1.05-4.76-1.19-.58-2.2Z"/>
    <path fill="#e6e7e8" d="M54.3,51.07c3.27,2.82,1.48,4.4-1.56,1.7-3.27-2.82-1.48-4.4,1.56-1.7Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M62.42,46.93c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M61.59,50.1c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M59.28,50.95c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M56.5,49.48c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M56.51,46.84c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M58.45,43.84c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M64.82,38.85c-2.58,3.91-4.67,2.35-2.03-1.52,2.58-3.91,4.67-2.35,2.03,1.52Z"/>
    <path fill="#e6e7e8" d="M65.2,42.11c-4.51-.07-4.45-2.77.06-2.63,4.51.07,4.45,2.77-.06,2.63Z"/>
    <path fill="#e6e7e8" d="M63.37,43.83c-3.01-3.54-1.1-5.33,1.87-1.74,3.01,3.54,1.1,5.33-1.87,1.74Z"/>
    <path fill="#e6e7e8" d="M60.27,43.59c.73-4.7,3.25-4.24,2.46.44-.73,4.7-3.25,4.24-2.46-.44Z"/>
    <path fill="#e6e7e8" d="M59.33,41.15c3.6-2.87,5.12-.71,1.49,2.11-3.6,2.87-5.12.71-1.49-2.11Z"/>
    <path fill="#e6e7e8" d="M60.03,37.59c4.27,1.54,3.42,4.09-.82,2.48-4.27-1.54-3.42-4.09.82-2.48Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M65.05,30.98c-1.63,4.4-4.22,3.58-2.48-.93,1.63-4.4,4.22-3.58,2.48.93Z"/>
    <path fill="#e6e7e8" d="M66.26,34.04c-4.61,1.12-5.32-1.49-.61-2.56,4.61-1.12,5.32,1.49.61,2.56Z"/>
    <path fill="#e6e7e8" d="M64.81,36.19c-4.06-2.7-2.38-4.84,1.48-2.18,4.06,2.7,2.38,4.84-1.48,2.18Z"/>
    <path fill="#e6e7e8" d="M61.56,36.78c-.43-4.76,2.28-4.95,2.64-.22.43,4.76-2.28,4.95-2.64.22Z"/>
    <path fill="#e6e7e8" d="M59.97,34.66c2.9-3.67,5.14-2.14,2.07,1.65-2.9,3.67-5.14,2.14-2.07-1.65Z"/>
    <path fill="#e6e7e8" d="M59.8,31.03c4.8.37,4.54,3.05-.22,2.62-4.8-.37-4.54-3.05.22-2.62Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M63.51,23.68c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M62.67,26.85c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M60.36,27.7c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M57.58,26.23c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M57.6,23.6c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M59.53,20.59c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M60.25,18.14c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M59.41,21.3c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M57.1,22.15c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M54.32,20.69c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M54.34,18.05c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M56.27,15.04c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M57.01,15.34c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M56.18,18.51c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M53.87,19.36c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M51.09,17.89c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M51.1,15.25c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M53.04,12.25c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M51.7,10.74c-3.79,2.57-5.16.29-1.33-2.22,3.79-2.57,5.16-.29,1.33,2.22Z"/>
    <path fill="#e6e7e8" d="M50.87,13.91c-4.14-1.88-3.11-4.35,1-2.41,4.14,1.88,3.11,4.35-1,2.41Z"/>
    <path fill="#e6e7e8" d="M48.56,14.76c-1.5-4.49.91-5.37,2.36-.86,1.5,4.49-.91,5.37-2.36.86Z"/>
    <path fill="#e6e7e8" d="M45.78,13.29c2.37-4.05,4.54-2.61,2.11,1.4-2.37,4.05-4.54,2.61-2.11-1.4Z"/>
    <path fill="#e6e7e8" d="M45.79,10.66c4.36-1.21,4.99,1.4.62,2.55-4.36,1.21-4.99-1.4-.62-2.55Z"/>
    <path fill="#e6e7e8" d="M47.73,7.65c3.39,3.14,1.69,5.16-1.66,1.96-3.39-3.14-1.69-5.16,1.66-1.96Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M16.16,13.08c-3.4,3.13-5.06,1.09-1.63-1.99,3.39-3.13,5.06-1.09,1.63,1.99Z"/>
    <path fill="#e6e7e8" d="M15.78,16.34c-4.36-1.22-3.69-3.82.66-2.54,4.36,1.22,3.69,3.82-.66,2.54Z"/>
    <path fill="#e6e7e8" d="M13.61,17.54c-2.11-4.21.15-5.45,2.21-1.22,2.11,4.21-.15,5.45-2.21,1.22Z"/>
    <path fill="#e6e7e8" d="M10.66,16.52c1.78-4.37,4.12-3.29,2.28,1.06-1.78,4.37-4.12,3.29-2.28-1.06Z"/>
    <path fill="#e6e7e8" d="M10.31,13.91c4.15-1.87,5.14.61.96,2.43-4.15,1.87-5.14-.61-.96-2.43Z"/>
    <path fill="#e6e7e8" d="M11.8,10.64c3.79,2.58,2.39,4.84-1.37,2.2-3.79-2.58-2.39-4.84,1.37-2.2Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M29.45,28.12c-1.44,4.73-4.01,3.86-2.51-.85,1.44-4.73,4.01-3.86,2.51.85Z"/>
    <path fill="#e6e7e8" d="M30.8,31.24c-4.58,1.4-5.32-1.3-.73-2.64,4.58-1.4,5.32,1.3.73,2.64Z"/>
    <path fill="#e6e7e8" d="M29.47,33.55c-4.1-2.54-2.69-4.95,1.37-2.34,4.1,2.54,2.69,4.95-1.37,2.34Z"/>
    <path fill="#e6e7e8" d="M26.26,34.32c-.66-4.91,2.02-5.28,2.61-.36.66,4.91-2.02,5.28-2.61.36Z"/>
    <path fill="#e6e7e8" d="M24.59,32.2c2.78-4.03,4.96-2.38,2.13,1.61-2.78,4.03-4.96,2.38-2.13-1.61Z"/>
    <path fill="#e6e7e8" d="M24.24,28.43c4.77.14,4.67,2.95-.09,2.74-4.77-.14-4.67-2.95.09-2.74Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M38.37,35.64c-5.24,1.82-6.15-1.09-.89-2.83,5.24-1.82,6.15,1.09.89,2.83Z"/>
    <path fill="#e6e7e8" d="M36.43,38.93c-4.29-3.22-2.33-5.68,1.91-2.4,4.29,3.22,2.33,5.68-1.91,2.4Z"/>
    <path fill="#e6e7e8" d="M33.46,39.24c-.4-5.39,2.7-5.71,3.03-.31.4,5.39-2.7,5.71-3.03.31Z"/>
    <path fill="#e6e7e8" d="M30.64,36.85c4.02-3.84,6.12-1.66,2.05,2.13-4.02,3.84-6.12,1.66-2.05-2.13Z"/>
    <path fill="#e6e7e8" d="M31.46,33.93c5.49-.15,5.44,2.92-.05,3-5.49.15-5.44-2.92.05-3Z"/>
    <path fill="#e6e7e8" d="M34.65,31.12c3.02,4.41.42,6.18-2.54,1.73-3.02-4.41-.42-6.18,2.54-1.73Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M43.87,35.74c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M45.15,38.74c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M43.89,40.95c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M40.86,41.7c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M39.27,39.66c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M38.94,36.04c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M52.42,38.77c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M53.69,41.77c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M52.43,43.98c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M49.4,44.73c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M47.82,42.69c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M47.49,39.07c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M46.88,48.04c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M48.16,51.04c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M46.89,53.26c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M43.87,54c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M42.28,51.96c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M41.95,48.34c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M40.51,43.14c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M41.78,46.14c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M40.52,48.35c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M37.5,49.09c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M35.91,47.05c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M35.58,43.44c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M32.86,49.55c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M34.13,52.55c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M32.87,54.77c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M29.85,55.51c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M28.26,53.47c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M27.93,49.85c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M40.74,50.05c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M42.02,53.05c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M40.76,55.26c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M37.73,56.01c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M36.14,53.97c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M35.81,50.35c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M51.56,30.49c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M52.83,33.49c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M51.57,35.7c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M48.55,36.44c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M46.96,34.4c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M46.63,30.79c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M55.84,25.3c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M57.12,28.3c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M55.86,30.51c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M52.83,31.26c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M51.24,29.22c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M50.91,25.6c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M41.45,27.4c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M42.72,30.4c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M41.46,32.61c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M38.44,33.36c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M36.85,31.32c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M36.52,27.7c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
  <g>
    <path fill="#e6e7e8" d="M34.37,41.8c-1.36,4.54-3.79,3.7-2.37-.81,1.36-4.54,3.79-3.7,2.37.81Z"/>
    <path fill="#e6e7e8" d="M35.65,44.8c-4.33,1.34-5.03-1.25-.69-2.53,4.33-1.34,5.03,1.25.69,2.53Z"/>
    <path fill="#e6e7e8" d="M34.39,47.01c-3.87-2.44-2.55-4.75,1.29-2.25,3.87,2.44,2.55,4.75-1.29,2.25Z"/>
    <path fill="#e6e7e8" d="M31.36,47.76c-.62-4.71,1.91-5.07,2.47-.35.62,4.71-1.91,5.07-2.47.35Z"/>
    <path fill="#e6e7e8" d="M29.77,45.72c2.62-3.87,4.69-2.29,2.02,1.55-2.62,3.87-4.69,2.29-2.02-1.55Z"/>
    <path fill="#e6e7e8" d="M29.44,42.1c4.51.13,4.42,2.83-.09,2.63-4.51-.13-4.42-2.83.09-2.63Z"/>
  </g>
          </g>
        ),
        width: 70,
        height: 70,
        viewBox: "0 0 70 70",
        flowerAnchor: { x: 34.5, y: 46 },
        stemConnection: { x: 33.9, y: 1.2 },
        bareSvg: true
      }
    ]
  },
todo7: {
    infoOffset: -40,
    customStem: {
      svgObj: (
        <>
          <path fill="#879f3c" d="M48.55,100.49s-2.31-17.99-4.29-19.34-4.61-.45-4.61-.45c0,0-7.88,29.01-8.58,32.27,0,0,10.44-26.56,10.37-29.55s6.08,17.9,6.08,17.9l1.02-.81Z"/>
          <path fill="#879f3c" d="M48.79,112.96s.95-2.15-1.03-3.51-3.52-.84-3.52-.84c0,0-4.78,1.5-9.12,7.85,0,0,12.9-5.77,12.83-8.77s-.2,5.85-.2,5.85l1.03-.59Z"/>
          <path fill="#879f3c" d="M49,112.59c.15-2.71-.93-4.1-.93-4.1,0,0-3.26-4.4-9.99-6.19,0,0,10.77,13,10.91,10.3Z"/>
          <path fill="#879f3c" d="M47.76,101.93s6.85-32.09,9.55-33.44,5.28,0,5.28,0c0,0,2.17,30.42,1.25,34.62-.19.88.46,9.34.46,9.34l.02-9.51s-2.11-29.93-3.93-30.92-12.63,30.46-12.63,30.46c0,0,4.27-66.32,8.28-74.5,3.25-6.63,5.63-19.4,5.63-19.4,2.65-31.7-5.66,34.78-5.43,33.86"/>
          <path fill="#879f3c" d="M47.57,103.83s-1.62-28.65-13.24-33.67c-4.69-2.03-16.57-6.83-19.59-8.98l-9.65-6.88s30.52,10.67,33.94,16.93c3.42,6.27,10.33,27.54,10.33,27.54l-1.79,5.06Z"/>
          <path fill="#879f3c" d="M48.55,99.73s-8.74-49.82-15.84-57.9c-4.48-5.1-11.01-1.81-11.01-1.81,0,0,21.3-21.17,26.85,59.71Z"/>
          <path fill="#879f3c" d="M47.23,96.68s6.79-53.95,17.3-52.56,9.85,7.79,9.85,7.79c0,0-15.19-27.92-27.15,44.76Z"/>
          <path fill="#879f3c" d="M49.36,96.68s1.61-46.05-1.61-48.4-18.61,5.76-18.61,5.76l17.44-3.41-.66,39.99,1.83,8.09,1.61-2.03Z"/>
          <rect fill="#879f3c" x="46.55" y="79.07" width="2.82" height="34.68"/>
        </>
      ),
      width: 80,
      height: 120,
      viewBox: "0 0 80 120",
      bottomAnchor: { x: 48, y: 110 },
      rootOffset: { x: 48, y: 50 },
      bareSvg: true,
      baseScale: 3.5
    },
    customBlossoms: [
      {
        bud: <g></g>,
        bloom: (
          <g>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M47.57,103.83s3.05-52.62,7.36-63.84"/>
            <ellipse fill="#e2d971" cx="52.86" cy="49.23" rx=".78" ry=".3" transform="translate(-15.7 71.96) rotate(-61.31)"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M47.4,85.72s-15.35-58.21-22.74-23.9"/>
            <g>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M45.4,108.89c1.8.02,40.99-121.97-18.05-105.83"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M46.54,109.94c.74,0,1.16-50.24,8.51-77.54,5.99-22.27-8.71-29.28-27.36-20.75"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M47.69,111c.37,0-11.3-53.85,2.85-76.78,15.33-24.83-7.77-24.86-22.49-13.97"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M48.83,112.05s-22.87-56.2-2.81-76.02c26.12-25.81-6.83-20.44-17.63-7.18"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M49.13,112.05s-17.56-45.54-4.79-66.69c17.59-29.13-12.88-19.34-22.58-11.87"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M49.42,112.05s-12.57-35.24-6.76-57.37c8.64-32.91-18.93-18.25-27.52-16.56"/>
              <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M49.71,112.05s-8.07-24.94-8.74-48.04c-1.06-36.7-24.98-17.16-32.46-21.25"/>
            </g>
            <ellipse fill="#e2d971" cx="27.55" cy="2.97" rx=".78" ry=".26" transform="translate(-.03 5.66) rotate(-11.73)"/>
            <ellipse fill="#e2d971" cx="27.35" cy="11.72" rx=".78" ry=".26" transform="translate(-2.35 9.82) rotate(-19.52)"/>
            <ellipse fill="#e2d971" cx="28.09" cy="20.22" rx=".78" ry=".26" transform="translate(-6.35 16.75) rotate(-30)"/>
            <ellipse fill="#e2d971" cx="31.33" cy="18.35" rx=".78" ry=".26" transform="translate(-4.28 25.44) rotate(-41.61)"/>
            <ellipse fill="#e2d971" cx="32.63" cy="10.09" rx=".78" ry=".26" transform="translate(-.68 17.67) rotate(-30)"/>
            <ellipse fill="#e2d971" cx="36.33" cy="1.77" rx=".78" ry=".26" transform="translate(.4 7.42) rotate(-11.73)"/>
            <ellipse fill="#e2d971" cx="28.22" cy="28.97" rx=".78" ry=".26" transform="translate(-12.12 26.05) rotate(-41.61)"/>
            <ellipse fill="#e2d971" cx="21.56" cy="33.64" rx=".78" ry=".26" transform="translate(-15.5 18.71) rotate(-35.4)"/>
            <ellipse fill="#e2d971" cx="24.66" cy="61.93" rx=".78" ry=".26" transform="translate(-41.58 69.38) rotate(-74.71)"/>
            <ellipse fill="#e2d971" cx="14.79" cy="38.22" rx=".78" ry=".26" transform="translate(-6.1 2.96) rotate(-9.49)"/>
            <ellipse fill="#e2d971" cx="8.38" cy="42.65" rx=".26" ry=".78" transform="translate(-33.74 31.91) rotate(-64.57)"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M48.66,74.78s6.29-39.74,22.17-35.08"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M52.08,69.67s4.18-39.74,14.75-35.08"/>
            <ellipse fill="#e2d971" cx="67.05" cy="34.63" rx=".26" ry=".78" transform="translate(17.31 91.39) rotate(-76.09)"/>
            <ellipse fill="#e2d971" cx="70.83" cy="39.76" rx=".26" ry=".78" transform="translate(15.2 98.95) rotate(-76.09)"/>
            <ellipse fill="#e2d971" cx="66.83" cy="39.76" rx=".26" ry=".78" transform="translate(12.16 95.07) rotate(-76.09)"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M43.22,68.63c-3.27-3.31-6.71-11.58-11.84-8.61-5.78,3.34-9.72,10.03-9.72,10.03"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M44,69.54s-17.66.29-19.75,2.62"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M43.22,67.82h0c-3.1-1.08-6.55-.16-8.7,2.33l-2.62,3.03"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M42,66.52s-5.73,6.62-6.16,11.28"/>
            <path fill="none" stroke="#e2d971" strokeMiterlimit="10" strokeWidth=".25px" d="M39.33,81.09c.42-4.66,2.68-13.27,2.68-13.27"/>
            <ellipse fill="#e2d971" cx="21.66" cy="70.14" rx=".78" ry=".26" transform="translate(-49.92 53.83) rotate(-60)"/>
            <ellipse fill="#e2d971" cx="24.47" cy="72.08" rx=".78" ry=".26" transform="translate(-38.04 28.63) rotate(-36.45)"/>
            <ellipse fill="#e2d971" cx="23.91" cy="67.19" rx=".61" ry=".26" transform="translate(-44.06 45.6) rotate(-52.79)"/>
            <ellipse fill="#e2d971" cx="31.9" cy="73.18" rx=".78" ry=".26" transform="translate(-37.23 33.26) rotate(-36.45)"/>
            <ellipse fill="#e2d971" cx="35.73" cy="78.07" rx=".78" ry=".26" transform="translate(-47.72 98.26) rotate(-79.01)"/>
            <ellipse fill="#e2d971" cx="39.33" cy="81.12" rx=".78" ry=".26" transform="translate(-47.8 104.27) rotate(-79.01)"/>
          </g>
        ),
        width: 80,
        height: 120,
        viewBox: "0 0 80 120",
        flowerAnchor: { x: 48, y: 113.7 },
        stemConnection: { x: 48, y: 113.7 },
        bareSvg: true
      }
    ]
  },
todo8: {
    infoOffset: -45,
    customStem: {
      svgObj: <></>,
      width: 80,
      height: 180,
      viewBox: "0 0 80 180",
      bottomAnchor: { x: 42, y: 160 },
      rootOffset: { x: 42, y: 100 },
      bareSvg: true,
      baseScale: 2.8
    },
    customBlossoms: [
      {
        bud: (
          <g>
            <circle fill="#879f3c" cx="47.81" cy="52.24" r="6"/>
              <path fill="none" stroke="#505c2e" strokeMiterlimit="10" d="M50.52,50.8s3.61,4.71-1.46,6.83c-3.1,1.3-8.37-2.17-6.92-7.09,1.66-5.65,11.24-5.44,11.86,1.52.32,3.6-4.33,5.73-7.33,13.31-5.95,15.06-6.65,95.94-6.65,95.94l-.03,18.7"/>
              <circle fill="#505c2e" cx="47.96" cy="52.24" r="3.41"/>
          </g>
        ),
        bloom: (
          <g>
            <path fill="none" stroke="#879f3c" strokeMiterlimit="10" d="M48.24,2.01s1.9,44.23-1.57,63.36c-2.89,15.94-6.65,95.94-6.65,95.94l-.03,18.7"/>
              <path fill="#879f3c" d="M47.2,59.01s17.54-1.99,29.14-12.9c3.77-3.55,4.53,2.76-2.66,7.13-6.43,3.91-26.03,8.81-26.25,8.58s-.23-2.81-.23-2.81Z"/>
              <path fill="#879f3c" d="M47.85,51.6s-35.32-21.81-24.1-9.46c4.9,5.39,23.88,12.57,24.11,12.38s-.01-2.92-.01-2.92Z"/>
              <path fill="#879f3c" d="M48.28,43.42s-26.62-17.17-25.33-12.36c1.79,6.67,24.84,15.61,25.11,15.42s.21-3.07.21-3.07Z"/>
              <path fill="#879f3c" d="M48.31,36.37s-25.82-17.06-22.77-10.61c3.73,7.9,22.71,12.92,22.95,12.7s-.17-2.09-.17-2.09Z"/>
              <path fill="#879f3c" d="M48.46,27.03s-18.14-14.26-16.88-9.07c2.2,9.05,16.55,11.97,16.76,11.76s.12-2.68.12-2.68Z"/>
              <path fill="#879f3c" d="M48.64,18.68s-12.58-9.61-12.26-6.95c.84,7.05,11.87,9.16,12.05,8.93s.22-1.98.22-1.98Z"/>
              <path fill="#879f3c" d="M48.53,11.77s-1-.02-3.19-1.89c-2.3-1.97-5.25-5.3-5.49-3.84-.77,4.73,8.31,7.47,8.45,7.28s.23-1.56.23-1.56Z"/>
              <path fill="#879f3c" d="M46.04,69.57s19.32-3.39,23.99-7.36c2.78-2.37,3.21,2.86-2.84,5.68-5.41,2.52-21.13,4.29-21.27,4.08s.13-2.39.13-2.39Z"/>
              <path fill="#879f3c" d="M45.23,76.88s23.62-6.93,19.44-3.41c-3.89,3.27-19.42,5.74-19.54,5.55s.1-2.14.1-2.14Z"/>
              <path fill="#879f3c" d="M48.16,51.86s25.35-7.02,28.83-13.59c2.42-4.58,4.6,2.65-2.49,7.19-6.34,4.06-25.81,9.43-26.04,9.2s-.3-2.8-.3-2.8Z"/>
              <path fill="#879f3c" d="M48.16,43.8s29.15-12.63,27.75-9.88c-4.65,9.12-27.22,12.91-27.43,12.69s-.31-2.8-.31-2.8Z"/>
              <path fill="#879f3c" d="M48.51,36.48s34.11-19.84,19.51-5.26c-4.29,4.28-18.99,8.29-19.17,8.06s-.34-2.8-.34-2.8Z"/>
              <path fill="#879f3c" d="M48.48,26.83s20.42-12.02,16.53-4.77c-4.43,8.27-16.01,7.79-16.17,7.56s-.36-2.8-.36-2.8Z"/>
              <path fill="#879f3c" d="M48.44,18.39s12.82-7.36,12.38-5.49c-1.32,5.65-11.87,8.52-11.99,8.28s-.39-2.79-.39-2.79Z"/>
              <path fill="#879f3c" d="M48.57,11.48s9.35-9.2,8.35-4.94c-.78,3.31-8.35,7.83-8.45,7.62s.11-2.69.11-2.69Z"/>
              <path fill="#879f3c" d="M48.77,6.79s6.53-5.8,5.28-3.29c-1.12,2.24-5.17,5.46-5.24,5.3s-.03-2.01-.03-2.01Z"/>
              <path fill="#879f3c" d="M48.47,3.67s4.54-5.4,3.74-2.99c-.71,2.16-3.55,5.14-3.61,4.98s-.13-1.99-.13-1.99Z"/>
              <path fill="#879f3c" d="M48.64,4.38s-4.9-4.11-3.78-1.46c.44,1.05,3.11,3.33,3.23,3.22s.56-1.76.56-1.76Z"/>
              <path fill="#879f3c" d="M48.43,7.13s-8.07-5.99-5.81-2.62c.9,1.34,5.29,4.64,5.43,4.54s.38-1.92.38-1.92Z"/>
              <path fill="#879f3c" d="M46.97,3.49s1.68-5.15,2.13-2.81c.4,2.09-1,3.82-1.12,3.81s-1.01-.99-1.01-.99Z"/>
              <path fill="#879f3c" d="M47.52,58.73s-12.7-2.53-20.58-10.17c-3.69-3.58-5.73-5.57-5.99-3.81-.76,5.08,22.63,18.15,26.33,16.3,1.14-.57.25-2.32.25-2.32Z"/>
              <path fill="#879f3c" d="M46.44,63.62s16.52-.24,28.63-9.69c3.53-2.75,3.26,1.78-3.46,5.93-6.01,3.71-24.83,6.96-25.03,6.71s-.14-2.95-.14-2.95Z"/>
              <path fill="#879f3c" d="M46.39,63.7s-11.66-2.28-18.88-9.18c-3.39-3.24-5.26-5.03-5.5-3.44-.7,4.59,20.76,16.39,24.16,14.72,1.05-.51.23-2.1.23-2.1Z"/>
              <path fill="#879f3c" d="M46.43,70.65s-11.44-1.94-17.82-9.14c-3.05-3.44-3.69-5.4-5.21-4.44-3.73,2.33,21.12,16.59,22.11,14.7.51-.98.92-1.11.92-1.11Z"/>
              <path fill="#879f3c" d="M45.23,76.88s-20-12.6-19.41-10.14c1.38,5.73,14.29,11.65,18.5,11.67,1.04,0,.91-1.53.91-1.53Z"/>
          </g>
        ),
        width: 80,
        height: 180,
        viewBox: "0 0 80 180",
        flowerAnchor: { x: 42, y: 100 },
        stemConnection: { x: 42, y: 100 },
        bareSvg: true
      }
    ]
  },
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
  1: ['todo1', 'todo1_pink'],
  2: ['todo4'],
  3: ['todo3', 'todo3_white'],
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
      <svg width="50" height="50" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors flex-shrink-0 ${selected ? 'text-white' : 'text-neutral-400 opacity-50'}`}>
        <path d="M 12 35 Q 6 20 20 5 Q 34 20 28 35" strokeDasharray="1 3" />
        <circle cx="12" cy="22" r="6" fill="currentColor" fillOpacity="0.2" stroke="none" />
        <circle cx="26" cy="20" r="7" fill="currentColor" fillOpacity="0.2" stroke="none" />
        <circle cx="18" cy="28" r="6" fill="currentColor" fillOpacity="0.2" stroke="none" />
      </svg>
    )
  }

  if (flowerId === 'todo8') {
    return (
      <svg width="50" height="50" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors flex-shrink-0 ${selected ? 'text-white' : 'text-neutral-400 opacity-50'}`}>
        <path d="M 20 35 Q 16 20 28 5" />
        <path d="M 17 25 Q 6 22 4 18" />
        <path d="M 21 21 Q 32 16 35 12" />
        <path d="M 19 16 Q 8 13 6 9" />
        <path d="M 23 12 Q 30 7 32 4" />
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
  
const GardenFlower = ({ itemId, flowerId, type, level, completed, isHovered }: { itemId: string, flowerId?: string, type: 'todo' | 'grass', level: number, completed: boolean, isHovered: boolean }) => {
  const swayParams = useMemo(() => ({
    rotateZ: pseudoRandom(itemId, 1) > 0.5 ? [-0.8, 0.8] : [0.8, -0.8],
    duration: 8 + pseudoRandom(itemId, 2) * 4,
    delay: pseudoRandom(itemId, 3) * 2
  }), [itemId]);

  const stemPath = useMemo(() => {
    const variations = [
      "M 100 100 Q 100 800, 100 2000",
      "M 100 100 C 120 600, 80 1200, 100 2000",
      "M 100 100 C 80 600, 120 1200, 100 2000",
      "M 100 100 Q 130 1000, 100 2000",
      "M 100 100 Q 70 1000, 100 2000",
      "M 100 100 C 140 800, 60 1400, 100 2000",
      "M 100 100 C 60 800, 140 1400, 100 2000"
    ];
    return variations[Math.floor(pseudoRandom(itemId, 4) * variations.length)];
  }, [itemId]);

  const scale = level === 1 ? 0.92 : 1.2;
  
  // @ts-ignore
  const shapes = flowerId && ALL_FLOWERS[flowerId] ? ALL_FLOWERS[flowerId] : ALL_FLOWERS['todo_example'];

  // Variables for dynamic customization
  const customStem = shapes.stemPath ?? stemPath;
  const pivotX = shapes.originX ?? "120px";
  const pivotY = shapes.originY ?? "160px";
  const offX = shapes.offsetX ?? -20;
  const offY = shapes.offsetY ?? -60;

  const stemW = shapes.stemWidth ?? 200;
  const stemH = shapes.stemHeight ?? 2000;
  const anchorX = shapes.stemAnchorX ?? 100;
  const anchorY = shapes.stemAnchorY ?? 100;

  const blossW = shapes.blossomWidth ?? 240;
  const blossH = shapes.blossomHeight ?? 240;
  const blossVB = shapes.blossomViewBox ?? "0 0 60 60";
  
  const extractVBWidth = (vb: string) => {
    const parts = vb.split(' ');
    if (parts.length === 4) return parseFloat(parts[2]);
    return 60;
  };

  const customSwayTransition = useMemo(() => ({
    rotateZ: {
      repeat: Infinity,
      duration: swayParams.duration * 1.8,
      delay: swayParams.delay,
      ease: "easeInOut" as const,
      repeatType: 'reverse' as const,
    },
  }), [swayParams.duration, swayParams.delay]);

  const mainTransition = useMemo(() => ({
    rotateZ: {
      repeat: Infinity,
      duration: swayParams.duration,
      delay: swayParams.delay,
      ease: "easeInOut" as const,
      repeatType: 'reverse' as const,
    },
  }), [swayParams.duration, swayParams.delay]);

  if (shapes.customStem && shapes.customBlossoms) {
     const stem = shapes.customStem;
     const baseScale = stem.baseScale || 1;
     
     // Calculate pivot positioning mathematically to ensure accurate rotation
     const actualScale = scale * baseScale;
     // The anchor points map to the outer div, so we must compensate for the inner div's scale
     const pivotX = stem.rootOffset.x + (stem.bottomAnchor.x - stem.rootOffset.x) * actualScale;
     const pivotY = stem.rootOffset.y + (stem.bottomAnchor.y - stem.rootOffset.y) * actualScale;
     
     // Dynamic sway to emulate a 2000px stem visual travel
     // Calculate pixel vertical distance from hit area to pivot for proper arc measurement
     const visualDistanceToPivot = Math.max(100, Math.abs(pivotY - stem.rootOffset.y));
     const swayMultiplier = (1900 / visualDistanceToPivot) * 1.0;
     const swayAmplitude = swayParams.rotateZ.map(r => r * swayMultiplier);

     return (
       <motion.div
         className={`absolute left-1/2 top-[50%] pointer-events-none transition-colors duration-1000 ${completed ? 'text-neutral-400' : 'text-neutral-800'}`}
         style={{
           width: stem.width,
           height: stem.height,
           marginLeft: -stem.rootOffset.x,
           marginTop: -stem.rootOffset.y,
           originX: `${pivotX}px`,
           originY: `${pivotY}px`
         }}
         animate={{ rotateZ: swayAmplitude }}
         transition={customSwayTransition}
       >
         <motion.div
           className="w-full h-full"
           style={{ originX: `${stem.rootOffset.x}px`, originY: `${stem.rootOffset.y}px` }}
           animate={{ 
             scale: isHovered ? actualScale * 1.05 : actualScale,
             opacity: completed ? 0.35 : (isHovered ? 1 : 0.8)
           }}
           transition={{
             scale: { duration: 0.4, ease: "easeOut" },
             opacity: { duration: 1.2, delay: completed ? 0.3 : 0 }
           }}
         >
           <svg width={stem.width} height={stem.height} viewBox={stem.viewBox ?? `0 0 ${stem.width} ${stem.height}`} className="overflow-visible absolute top-0 left-0" {...(stem.bareSvg ? {} : {fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round"})}>
             {stem.svgObj}
           </svg>
           {shapes.customBlossoms.map((blossom, index) => {
             const vbw = extractVBWidth(blossom.viewBox || "0 0 60 60");
             // The flower anchor point should visually land on the stem connection point.
             // We position the top-left of the blossom container using left/top.
             const left = blossom.stemConnection.x - blossom.flowerAnchor.x;
             const top = blossom.stemConnection.y - blossom.flowerAnchor.y;
             
             return (
               <React.Fragment key={index}>
                  <motion.div
                    className="absolute pointer-events-none"
                    initial={false}
                    animate={{ scale: completed ? 1.2 : 1, opacity: completed ? 0 : 1 }}
                    transition={{ duration: 1.2 }}
                    style={{ left, top, width: blossom.width, height: blossom.height, originX: `${blossom.flowerAnchor.x}px`, originY: `${blossom.flowerAnchor.y}px` }}
                  >
                    <svg viewBox={blossom.viewBox || "0 0 60 60"} className="w-full h-full overflow-visible" {...(blossom.bareSvg ? {} : {fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round"})}>
                      <g strokeWidth={blossom.bareSvg ? undefined : 1.5 / (blossom.width / vbw)}>
                        {blossom.bud}
                      </g>
                    </svg>
                  </motion.div>
                  
                  <motion.div
                    className="absolute pointer-events-none text-current"
                    initial={false}
                    animate={{ scale: completed ? 1 : 0.5, opacity: completed ? 1 : 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ left, top, width: blossom.width, height: blossom.height, originX: `${blossom.flowerAnchor.x}px`, originY: `${blossom.flowerAnchor.y}px` }}
                  >
                    <svg viewBox={blossom.viewBox || "0 0 60 60"} className="w-full h-full overflow-visible" {...(blossom.bareSvg ? {} : {fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round"})}>
                      <g strokeWidth={blossom.bareSvg ? undefined : 1.5 / (blossom.width / vbw)}>
                        {blossom.bloom}
                      </g>
                    </svg>
                  </motion.div>
               </React.Fragment>
             );
           })}
         </motion.div>
       </motion.div>
     );
  }

  return (
    <motion.div
      className={`absolute left-1/2 top-[50%] pointer-events-none transition-colors duration-1000 ${completed ? 'text-neutral-400' : 'text-neutral-800'}`}
      style={{ width: stemW, height: stemH, marginLeft: -anchorX, marginTop: -anchorY, originX: `${anchorX}px`, originY: `${stemH}px` }}
      animate={{ rotateZ: swayParams.rotateZ }}
      transition={mainTransition}
    >
      <motion.div
        className="w-full h-full"
        style={{ originX: `${anchorX}px`, originY: `${anchorY}px` }}
        animate={{ 
          scale: isHovered ? scale * 1.05 : scale,
          opacity: completed ? 0.35 : (isHovered ? 1 : 0.8)
        }}
        transition={{
          scale: { duration: 0.4, ease: "easeOut" },
          opacity: { duration: 1.2, delay: completed ? 0.3 : 0 }
        }}
      >
        <svg width={stemW} height={stemH} viewBox={`0 0 ${stemW} ${stemH}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="overflow-visible absolute top-0 left-0">
          <path d={customStem} />
        </svg>

        {shapes.blossoms ? (
           shapes.blossoms.map((blossom, index) => {
             const bw = blossom.width ?? blossW;
             const bh = blossom.height ?? blossH;
             const bvb = blossom.viewBox ?? blossVB;
             const vbw = extractVBWidth(bvb);
             return (
               <React.Fragment key={index}>
                  <motion.div
                    className="absolute pointer-events-none"
                    initial={false}
                    animate={{ scale: completed ? 1.2 : 1, opacity: completed ? 0 : 1 }}
                    transition={{ duration: 1.2 }}
                    style={{ left: blossom.offsetX ?? offX, top: blossom.offsetY ?? offY, width: bw, height: bh, originX: blossom.originX, originY: blossom.originY }}
                  >
                    <svg viewBox={bvb} className="w-full h-full overflow-visible" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <g strokeWidth={1.5 / (bw / vbw)}>
                        {blossom.bud}
                      </g>
                    </svg>
                  </motion.div>

                  <motion.div
                    className="absolute pointer-events-none text-current"
                    initial={false}
                    animate={{ scale: completed ? 1 : 0.5, opacity: completed ? 1 : 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ left: blossom.offsetX ?? offX, top: blossom.offsetY ?? offY, width: bw, height: bh, originX: blossom.originX, originY: blossom.originY }}
                  >
                    <svg viewBox={bvb} className="w-full h-full overflow-visible" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <g strokeWidth={1.5 / (bw / vbw)}>
                        {blossom.bloom}
                      </g>
                    </svg>
                  </motion.div>
               </React.Fragment>
             );
           })
        ) : (
          <>
            <motion.div
              className="absolute pointer-events-none"
              initial={false}
              animate={{ scale: completed ? 1.2 : 1, opacity: completed ? 0 : 1 }}
              transition={{ duration: 1.2 }}
              style={{ left: offX, top: offY, width: blossW, height: blossH, originX: pivotX, originY: pivotY }}
            >
              <svg viewBox={blossVB} className="w-full h-full overflow-visible" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <g strokeWidth={1.5 / (blossW / extractVBWidth(blossVB))}>
                  {shapes.bud}
                </g>
              </svg>
            </motion.div>

            <motion.div
              className="absolute pointer-events-none text-current"
              initial={false}
              animate={{ scale: completed ? 1 : 0.5, opacity: completed ? 1 : 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ left: offX, top: offY, width: blossW, height: blossH, originX: pivotX, originY: pivotY }}
            >
              <svg viewBox={blossVB} className="w-full h-full overflow-visible" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <g strokeWidth={1.5 / (blossW / extractVBWidth(blossVB))}>
                  {shapes.bloom}
                </g>
              </svg>
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
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

const WeatherOverlay = React.memo(({ weather }: { weather: 'sunny' | 'rainy' | 'snowy' }) => {
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

  const snowDrops = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const leftValue = -10 + Math.random() * 140; 
      const left = `${leftValue}%`;
      const animationDuration = `${3 + Math.random() * 5}s`;
      const animationDelay = `-${Math.random() * 5}s`;
      const opacity = 0.3 + Math.random() * 0.6;
      const width = `${2 + Math.random() * 4}px`;
      const height = `${2 + Math.random() * 4}px`;
      const translateX = Math.random() > 0.5 ? '20px' : '-20px';
      return { left, opacity, animationDuration, animationDelay, width, height, translateX };
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

      {weather === 'snowy' && snowDrops.map((drop, i) => (
        <div
          key={`s-${i}`}
          className="absolute top-[-10%] bg-white rounded-full blur-[1px]"
          style={{
            left: drop.left, opacity: drop.opacity, animationDuration: drop.animationDuration, animationDelay: drop.animationDelay,
            width: drop.width, height: drop.height,
            animation: `fall-snow-${drop.translateX === '20px' ? 'left' : 'right'} ${drop.animationDuration} linear infinite ${drop.animationDelay}`
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

const NotificationWindow = () => {
  const [payload, setPayload] = useState<DesktopReminderStatePayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';

    return desktopBridge.onReminderWindowPayload((nextPayload) => {
      setPayload(nextPayload);
    });
  }, []);

  useEffect(() => {
    if (!payload || payload.tasks.length === 0) {
      return;
    }

    const enterFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const closeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.clearTimeout(closeTimer);
    };
  }, [payload]);

  const language = payload?.language === 'zh' ? 'zh' : 'en';
  const t = (en: string, zh: string) => language === 'en' ? en : zh;
  const tasks = payload?.tasks ?? [];
  const totalTaskCount = payload?.totalTaskCount ?? tasks.length;

  const requestClose = () => {
    setIsVisible(false);
  };

  const handleBoxClick = () => {
    void desktopBridge.showMainWindow();
    requestClose();
  };

  if (tasks.length === 0) {
    return <div className="fixed inset-0 bg-transparent" />;
  }

  return (
    <div className="fixed inset-0 bg-transparent pt-12 pr-8 pb-6 pl-12 font-sans selection:bg-black/10 overflow-hidden flex items-end justify-end">
      <AnimatePresence
        onExitComplete={() => {
          void desktopBridge.closeReminderWindow();
        }}
      >
        {isVisible ? (
          <motion.div
            initial={{ x: 48, y: 8, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={{ x: 72, y: 8, opacity: 0, scale: 0.96 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.75, opacity: { duration: 0.2 } }}
            onClick={handleBoxClick}
            className="relative w-[340px] pointer-events-auto bg-white/95 backdrop-blur-xl border border-white/95 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] p-6 flex flex-col gap-4 group overflow-hidden cursor-pointer"
          >
          <button
            onClick={(event) => {
              event.stopPropagation();
              requestClose();
            }}
            className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
            aria-label={t('Close notification', '关闭通知')}
            title={t('Close notification', '关闭通知')}
          >
            <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3L11 11M11 3L3 11" />
            </svg>
          </button>

          <div className="flex flex-col mb-1 relative">
            <h3 className="font-serif text-[1.2rem] text-neutral-800 tracking-tight leading-tight mb-0.5 pointer-events-none select-none">
              {t("Today's Flowerbed", '今日花圃')}
            </h3>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-medium opacity-80 pointer-events-none select-none flex flex-col gap-0.5">
              <span>{totalTaskCount} {t('flowers waiting to bloom', '朵鲜花待绽放')}</span>
            </p>
          </div>

          <div className="flex items-stretch border-t border-neutral-200/50 pt-5 mt-1 relative min-h-[100px]">
            <div className="flex-1 flex flex-col gap-3.5 justify-center pr-4 min-w-0">
              {tasks.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex items-center gap-3 relative min-w-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full border border-neutral-400 opacity-60 flex-shrink-0" />
                  <span className="text-[13px] leading-tight text-neutral-700 font-medium truncate max-w-[150px]">
                    {item.title}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="w-[110px] relative border-l border-neutral-200/30 self-stretch min-h-[100px]">
              <div
                className="absolute bottom-[-15px] right-0 w-[140px] h-[200px] pointer-events-none"
                style={{
                  maskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)',
                }}
              >
                {[...tasks].reverse().map((item, reverseIndex) => {
                  const index = tasks.length - 1 - reverseIndex;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 300 }}
                      className="absolute bottom-0"
                      style={{ right: `${-50 + index * 22}px` }}
                    >
                      <div style={{ transform: 'scale(0.35)', transformOrigin: 'bottom center' }}>
                        <div className="relative flex justify-center items-center w-[180px] h-[220px]">
                          <GardenFlower
                            itemId={item.id}
                            flowerId={item.flowerId}
                            type="todo"
                            level={item.importance || 1}
                            completed={false}
                            isHovered={false}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const isNotificationWindow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('notification') === '1';

  if (isNotificationWindow) {
    return <NotificationWindow />;
  }

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
  const [visibleGuides, setVisibleGuides] = useState<string[]>([]);
  const [bgColor, setBgColor] = useState('#F9F8F6');
  const isDarkBg = getLuminance(bgColor) < 128;
  const [weather, setWeather] = useState<'sunny' | 'rainy' | 'snowy'>('sunny');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [maxCompletedFlowers, setMaxCompletedFlowers] = useState(10);
  const [maxUncompletedFlowers, setMaxUncompletedFlowers] = useState(10);
  const [notificationInterval, setNotificationInterval] = useState(60);
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
    if (w === 'rainy' || w === 'snowy' || w === 'sunny') setWeather(w);
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

  const saveWeather = (w: 'sunny' | 'rainy' | 'snowy') => {
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
      const initialItems: Item[] = [];
      const positions: {x: number, y: number}[] = [];
      const currentYMD = dateToYMD(today);
      
      const seedData = [
        { title: 'Compile minimalist inspiration board', type: 'todo', importance: 3, showUntilDays: 1, isDaily: false, isLight: false, int: 3, speed: 2, steps: [{ id: '1', title: 'Gather references', completed: false }] },
        { title: 'Prepare tea ritual', type: 'todo', importance: 1, showUntilDays: 0, isDaily: true, isLight: true, int: 2, speed: 1, steps: [] },
        { title: 'Archive weekend photos', type: 'todo', importance: 2, showUntilDays: 3, isDaily: false, isLight: false, int: 2, speed: 2, steps: [] },
        { title: 'Isamu Noguchi Akari Lamp', type: 'grass', importance: 3, showUntilDays: 0, isDaily: false, isLight: false, int: 3, speed: 3, steps: [] },
      ] as const;

      seedData.forEach((data, i) => {
         const pos = getValidPosition(positions);
         positions.push(pos);
         initialItems.push({
           id: (i+1).toString(),
           title: data.title,
           completed: false,
           type: data.type as ItemType,
           importance: data.importance,
           showUntilDays: data.showUntilDays,
           isDaily: data.isDaily,
           isLight: data.isLight,
           steps: [...data.steps],
           interest: data.int,
           speedLevel: data.speed,
           createdAt: Date.now() - (4000 - i * 1000),
           dateStr: currentYMD,
           position: pos
         });
      });
      setItems(initialItems);
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
      intervalMinutes: notificationInterval,
      language,
      tasks: reminderTasks,
    });
  }, [isLoaded, language, notificationInterval, reminderTasks]);

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
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-sm text-neutral-700">{t('Background Color', '背景颜色')}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={bgColor}
                          onChange={(e) => saveBgColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 p-0 overflow-hidden"
                        />
                        <input 
                          type="text"
                          value={bgColor}
                          onChange={(e) => saveBgColor(e.target.value)}
                          className="w-20 bg-transparent border-b border-neutral-300 text-center text-sm outline-none pb-1 uppercase"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm text-neutral-700">{t('Weather', '天气')}</span>
                      <div className="flex bg-neutral-100 rounded-lg p-1">
                         {(['sunny', 'rainy', 'snowy'] as const).map(w => (
                            <button
                               key={w}
                               onClick={() => saveWeather(w)}
                               className={`px-3 py-1 text-xs capitalize rounded-md transition-all ${weather === w ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'}`}
                            >
                               {t(w, w === 'sunny' ? '晴天' : w === 'rainy' ? '下雨' : '下雪')}
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
                  <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">{t('System Notification Reminder', '系统通知提醒')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-700">{t('Reminder Interval (minutes, 0 to disable)', '多久提示一次 (分钟，0为关闭)')}</span>
                      <input 
                        type="number" min="0" max="1440"
                        value={notificationInterval}
                        onChange={(e) => saveNotificationInterval(parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent border-b border-neutral-300 text-center text-sm outline-none pb-1"
                      />
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
                   <p className="text-xs text-neutral-400 font-sans tracking-wide">{t('Choose which flowers your tasks grow into.', '选择任务会长成...')}</p>
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
                    setItems([]);
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
