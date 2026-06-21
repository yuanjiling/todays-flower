import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { desktopBridge } from './platform/desktop.ts';
import { GardenFlower } from './components/GardenFlower.tsx';

export const NotificationWindow = () => {
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
  const uncompleted = tasks.filter(t => !t.completed).slice(0, 4);
  const completedToday = tasks.filter(t => t.completed).slice(0, 4);
  const isAllDone = tasks.length > 0 && uncompleted.length === 0;

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

          <div className={`flex flex-col mb-1 relative ${isAllDone ? 'items-center text-center mt-2' : ''}`}>
            <h3 className="font-serif text-[1.2rem] text-neutral-800 tracking-tight leading-tight mb-0.5 pointer-events-none select-none">
              {isAllDone ? t("All flowers bloomed today", "今天的花都开了") : t("Today's Flowerbed", "今日花圃")}
            </h3>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-medium opacity-80 pointer-events-none select-none flex flex-col gap-0.5">
              <span>{isAllDone ? t("Take a little break.", "休息一会儿吧。") : `${uncompleted.length} ${t('flowers waiting to bloom', '朵鲜花待绽放')}`}</span>
            </p>
          </div>

          <div className={`flex items-stretch border-t border-neutral-200/50 pt-5 mt-1 relative min-h-[100px] ${isAllDone ? 'justify-center border-none pt-2' : ''}`}>
            {!isAllDone && (
              <div className="flex-1 flex flex-col gap-3.5 justify-center pr-4 min-w-0">
                {uncompleted.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    className="flex items-center gap-3 relative min-w-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full border border-neutral-400 opacity-60 flex-shrink-0" />
                    <span className="text-[13px] leading-tight text-neutral-700 font-medium truncate max-w-[150px]">
                      {item.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            <div className={`relative self-stretch min-h-[100px] ${isAllDone ? 'w-[280px]' : 'w-[110px] border-l border-neutral-200/30'}`}>
              <div
                className={`absolute bottom-[-15px] pointer-events-none ${isAllDone ? 'w-full h-[200px] left-1/2 -translate-x-1/2 flex justify-center' : 'right-0 w-[140px] h-[200px]'}`}
                style={{
                  maskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%, black 100%)',
                }}
              >
                {(isAllDone ? completedToday : uncompleted).slice().reverse().map((item, reverseIndex, arr) => {
                  const idx = arr.length - 1 - reverseIndex;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1, type: 'spring', stiffness: 300 }}
                      className="absolute bottom-0"
                      style={isAllDone 
                        ? { left: `calc(50% - 90px + ${(idx - (arr.length - 1) / 2) * 50}px)` }
                        : { right: `${-50 + idx * 22}px` }}
                    >
                      <div style={{ transform: 'scale(0.35)', transformOrigin: 'bottom center' }}>
                        <div className="relative flex justify-center items-center w-[180px] h-[220px]">
                          <GardenFlower
                            itemId={item.id}
                            flowerId={item.flowerId}
                            type="todo"
                            level={item.importance || 1}
                            completed={isAllDone ? true : item.completed}
                            isHovered={false}
                            forceSolid={isAllDone}
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

