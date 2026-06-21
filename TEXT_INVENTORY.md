# Current Text Inventory

Scope: current user-visible and product-facing text in the active `todays-flower` codebase.

Included sources:
- `src/App.tsx`
- `electron/main.cjs`
- `index.html`
- `package.json`

Excluded:
- `node_modules`, `dist`, `release`
- SVG ids, path data, CSS class names
- IPC channel names, import paths, internal enum values
- Compatibility-only storage keys such as legacy `jflow_*`

## Naming Split

This project now uses two naming layers on purpose:

- Technical/internal name: `todays-flower`
- User-facing display name: `Today's Flower`

Current product identity fields:

| Source | Value | Usage |
|---|---|---|
| `package.json:2` | `todays-flower` | Package/internal project name |
| `package.json:5` | `Desktop-first personal todo app for Today's Flower.` | Package description |
| `package.json:49` | `com.aia.todaysflower` | Electron app/system id |
| `package.json:50` | `Today's Flower` | Packaged app product name |
| `index.html:6` | `Today's Flower` | Browser/document title |
| `electron/main.cjs:6` | `Today's Flower` | Electron fallback window/notification title |
| `electron/main.cjs:11` | `todays-flower` | Fixed Electron userData directory |

## Active Bilingual UI Text

| Source | English | Chinese | Current usage |
|---|---|---|---|
| `src/App.tsx:2252` | Return to Today | 返回今日 | Date navigation |
| `src/App.tsx:2455`, `src/App.tsx:2456` | Close notification | 关闭通知 | Reminder window action / aria label |
| `src/App.tsx:2468` | flowers waiting to bloom | 朵鲜花待绽放 | Reminder window subtitle suffix |
| `src/App.tsx:2714` | Essential | 很重要 | Importance label |
| `src/App.tsx:2715` | Important | 重要 | Importance label |
| `src/App.tsx:2716` | Normal | 普通 | Importance label |
| `src/App.tsx:2719` | Quick | 很快 | Estimated time label |
| `src/App.tsx:2720` | Some Time | 要一段时间 | Estimated time label |
| `src/App.tsx:2721` | Long | 比较久 | Estimated time label |
| `src/App.tsx:2724` | Maybe | 有点种草 | Interest label |
| `src/App.tsx:2725` | Interested | 种草 | Interest label |
| `src/App.tsx:2726` | Really Want | 很想拔草 | Interest label |
| `src/App.tsx:3163` | Daily Tasks | 今日任务 | Main tab |
| `src/App.tsx:3169` | Wishlist Garden | 种草花园 | Main tab |
| `src/App.tsx:3174`, `src/App.tsx:3176`, `src/App.tsx:3696` | Settings | 设置 | Settings button / modal title |
| `src/App.tsx:3283`, `src/App.tsx:3439` | Daily | 每日重复 | Task type |
| `src/App.tsx:3285`, `src/App.tsx:3445` | Light | 轻量任务 | Task type |
| `src/App.tsx:3348` | Edit | 编辑 | Item action |
| `src/App.tsx:3355` | Delete | 删除 | Item action |
| `src/App.tsx:3388` | Importance | 重要性 | Composer field |
| `src/App.tsx:3400` | Show Until | 持续几天 | Composer field |
| `src/App.tsx:3415` | more | 更多 | Composer expander |
| `src/App.tsx:3433` | Type | 类型 | Composer field |
| `src/App.tsx:3455` | Interest | 心动程度 | Grass composer field |
| `src/App.tsx:3466` | Estimated Time | 预计耗时 | Grass composer field |
| `src/App.tsx:3520` | Main Task / Step 1 / Step 2 / ... | 主任务 / 步骤 1 / ?? 2 / ... | Multiline placeholder |
| `src/App.tsx:3530` | Add | 添加 | Composer submit button |
| `src/App.tsx:3558` | Wishlist List | 种草清单 | Wishlist modal title |
| `src/App.tsx:3580` | Search wishlist... | 搜索种草清单... | Wishlist search placeholder |
| `src/App.tsx:3589` | Your flower garden is empty. Plant something for later. | 花园空空如也...先种下一件以后想做的事吧。 | Wishlist empty state |
| `src/App.tsx:3704` | Appearance | 外观 | Settings section |
| `src/App.tsx:3707` | Background Color | 背景颜色 | Settings field |
| `src/App.tsx:3724` | Weather | 天气 | Settings field |
| `src/App.tsx:3738` | Language | 语言 | Settings field |
| `src/App.tsx:3755` | Wishlist Display | 种草页显示 | Settings section |
| `src/App.tsx:3758` | Max Completed Flowers | 最大已完成数量 | Settings field |
| `src/App.tsx:3767` | Max Uncompleted Flowers | 最大未完成数量 | Settings field |
| `src/App.tsx:3779` | System Notification Reminder | 系统通知提醒 | Settings section |
| `src/App.tsx:3782` | Reminder Interval (minutes, 0 to disable) | 间隔多久提示一次 (分钟，0为关闭) | Settings field |
| `src/App.tsx:3791` | Minimum Reminder | 最低提醒 | Settings field |
| `src/App.tsx:3812` | System | 系统 | Settings section |
| `src/App.tsx:3815` | Launch on Startup | 开机自启动 | Settings field |
| `src/App.tsx:3836` | Failed to update startup setting. | 更新开机自启动设置失败。 | Startup setting error |
| `src/App.tsx:3843` | Data | 数据 | Settings section |
| `src/App.tsx:3855` | Export Data | 导出数据 | Data action |
| `src/App.tsx:3858` | Import Data | 导入数据 | Data action |
| `src/App.tsx:3877` | Are you sure you want to delete all data? | 确定要删除所有数据吗？ | Reset confirmation |
| `src/App.tsx:3881` | Reset App | 重置应用 | Data action |
| `src/App.tsx:3911` | What shall we plant today? | 今天想种点什么？ | Flower selector title |
| `src/App.tsx:3912` | Choose which flowers your tasks grow into. | 选择任务会长成哪种花。 | Flower selector subtitle |

## Active English-Only Text

| Source | English | Current usage |
|---|---|---|
| `src/App.tsx:2028` | Apply | Month picker confirm button |
| `src/App.tsx:2173` | Today's Flow | Animated hero heading prefix |
| `src/App.tsx:2210` | To Grow | Wishlist center heading |
| `src/App.tsx:2465` | Today's Flowerbed | Reminder window title |
| `src/App.tsx:3520` | Let your tasks flower... | Single-line todo placeholder |
| `src/App.tsx:3520` | Let this idea take root | Single-line wishlist placeholder |
| `electron/main.cjs:265` | Today's Flower Garden ? ${tasks.length} Waiting to Bloom${groupSuffix} | English reminder notification title |
| `src/App.tsx:3850` | Today's Flower Backup.json | Exported backup filename |

## Active Chinese-Only / Chinese-Preferred Text

| Source | Chinese | English counterpart | Current usage |
|---|---|---|---|
| `electron/main.cjs:264` | ???? ? ??? ${tasks.length} ?${groupSuffix} | Today's Flower Garden ? ${tasks.length} Waiting to Bloom${groupSuffix} | Chinese reminder notification title |
| `src/App.tsx:3738` weather option labels | ?? / ?? / ?? | sunny / rainy / snowy | Chinese weather options when language is zh |
| `src/App.tsx:3744` language option label | ?? | Chinese | Language toggle label |

## Text Still Worth Review

| Issue | Source | Current text | Why it may need a final decision |
|---|---|---|---|
| Hero title construction | `src/App.tsx:2173` plus suffix logic nearby | `Today's Flow` + suffix animation | It is stylistic, but the product name is now `Today's Flower`, so this split title may still feel transitional. |
| Flowerbed vs Garden wording | `src/App.tsx:2465`, `electron/main.cjs:264-265` | `Today's Flowerbed` / `Today's Flower Garden` | Two nearby reminder surfaces use slightly different nouns. |
| Technical vs display naming | `package.json`, `electron/main.cjs` | `todays-flower` vs `Today's Flower` | This is intentional now, but worth one final product check. |

## Compatibility Notes

These are intentionally not part of the final user-facing naming, but still exist for migration safety:

- Legacy Electron profile names: `react-example`, `j-flow`, `Today's Flower`
- Legacy bridge alias: `window.jflowDesktop`
- Legacy localStorage keys: `jflow_*`

They are kept so old desktop data and settings continue to load after the rename.
