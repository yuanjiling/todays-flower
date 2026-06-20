# Current App Text Inventory

Scope: current reachable app text after removing the unused `AppShell` / `HomePage` / `TodoModePanel` / template-form chain.

Included sources:
- `src/App.tsx`
- `electron/main.cjs`
- `index.html`
- `package.json`
- `metadata.json`

Excluded:
- `node_modules`, `dist`, `release`
- SVG ids/data names and path data
- CSS class names, localStorage keys, IPC channel names, import paths, enum/internal values

## Removed Unused Files

These files were not mounted by `src/main.tsx` and depended on missing modules such as `@/db`, `@/types`, `@/components/ui/Icons`, `react-router-dom`, and `@dnd-kit/*`.

| Removed file | Reason |
|---|---|
| `src/app/shell/AppShell.tsx` | Unused shell/router layer |
| `src/pages/HomePage.tsx` | Unused page that referenced the removed shell/forms |
| `src/features/todo/TodoModePanel.tsx` | Unused Todo panel implementation |
| `src/features/templates/CreateTaskTemplateForm.tsx` | Unused grass form container |
| `src/features/templates/TemplateFormFields.tsx` | Unused grass form fields |

## Active Bilingual Text

| Source | English | Chinese | Current usage |
|---|---|---|---|
| `src/App.tsx:1918` | `${Month} ${Year}` | `${Year}年 ${Month}月` | Month picker label |
| `src/App.tsx:2177` | Return to Today | 返回今日 | Date navigation |
| `src/App.tsx:2923` | Daily Tasks | 今日任务 | Main tab |
| `src/App.tsx:2929` | Wishlist Garden | 种草花园 | Main tab |
| `src/App.tsx:2898`, `src/App.tsx:2900`, `src/App.tsx:3418` | Settings | 设置 | Settings button/modal title |
| `src/App.tsx:3041` | Normal / Important / Essential | 普通 / 重要 / 很重要 | Todo metadata tag |
| `src/App.tsx:3148` | Importance | 重要性 | Todo composer field |
| `src/App.tsx:3043`, `src/App.tsx:3199` | Daily | 每日重复 | Todo type |
| `src/App.tsx:3045`, `src/App.tsx:3205` | Light | 轻量任务 | Todo type |
| `src/App.tsx:3049`, `src/App.tsx:3215`, `src/App.tsx:3395` | Interest | 心动程度 | Grass metadata / composer field |
| `src/App.tsx:3051`, `src/App.tsx:3226`, `src/App.tsx:3397` | Speed | 预计速度 | Grass metadata / composer field |
| `src/App.tsx:3081` | Plant in Garden | 移植到种草花园 | Todo action title |
| `src/App.tsx:3090`, `src/App.tsx:3406` | Add to Today's Task | 移植到今日任务 | Grass action title |
| `src/App.tsx:3099` | Send to List View | 移至列表视图 | Todo action title |
| `src/App.tsx:3108` | Edit | 编辑 | Item action title |
| `src/App.tsx:3115` | Delete | 删除 | Item action title |
| `src/App.tsx:3160` | Show Until | 持续几天 | Composer field |
| `src/App.tsx:3175` | more | 更多 | Composer expander |
| `src/App.tsx:3193` | Type | 类型 | Composer field |
| `src/App.tsx:3248` | Break Down (Steps) | 分步拆解 | Composer action title |
| `src/App.tsx:3278` | Main Task / Step 1 / Step 2 | 主任务 / 步骤 1 / 步骤 2 | Multiline placeholder |
| `src/App.tsx:3288` | Add | 添加 | Composer submit button |
| `src/App.tsx:3316` | Flowerbeds | 分类花圃 | Wishlist modal title |
| `src/App.tsx:3338` | Search wishlist... | 搜索种草清单... | Wishlist search placeholder |
| `src/App.tsx:3347` | Your flowerbed is empty. Plant something for later. | 花圃还是空的。先种下一件以后想做的事吧。 | Wishlist empty state |
| `src/App.tsx:3414` | Unpin from Garden | 取消展示 | Grass action title |
| `src/App.tsx:3414` | Plant in Garden | 种回主花园 | Grass action title |
| `src/App.tsx:3454` | Appearance | 外观 | Settings section |
| `src/App.tsx:3457` | Background Color | 背景颜色 | Settings field |
| `src/App.tsx:3474` | Weather | 天气 | Settings field |
| `src/App.tsx:3482` | sunny / rainy / snowy | 晴天 / 下雨 / 下雪 | Weather options |
| `src/App.tsx:3488` | Language | 语言 | Settings field |
| `src/App.tsx:3496` | English / Chinese | English / 中文 | Language options |
| `src/App.tsx:3505` | Wishlist Display | 草单主页显示 | Settings section |
| `src/App.tsx:3508` | Max Completed Flowers | 最大已完成数量 | Settings field |
| `src/App.tsx:3517` | Max Uncompleted Flowers | 最大未完成数量 | Settings field |
| `src/App.tsx:3529` | System Notification Reminder | 系统通知提醒 | Settings section |
| `src/App.tsx:3532` | Reminder Interval (minutes, 0 to disable) | 间隔多久提示一次 (分钟，0为关闭) | Settings field |
| `src/App.tsx:3541` | Minimum Reminder Level | 最低提醒级别 | Settings field |
| `src/App.tsx:3558` | System | 系统 | Settings section |
| `src/App.tsx:3561` | Launch on Startup | 开机自启动 | Settings field |
| `src/App.tsx:3582` | Failed to update startup setting. | 更新开机自启动设置失败。 | Startup setting error |
| `src/App.tsx:3589` | Data | 数据 | Settings section |
| `src/App.tsx:3601` | Export Data | 导出数据 | Data action |
| `src/App.tsx:3604` | Import Data | 导入数据 | Data action |
| `src/App.tsx:3623` | Are you sure you want to delete all data? | 确定要删除所有数据吗？ | Reset confirmation |
| `src/App.tsx:3627` | Reset App | 重置应用 | Data action |
| `src/App.tsx:3665` | What shall we plant today? | 今天想种点什么？ | Flower selector title |
| `src/App.tsx:3666` | Choose which flowers your tasks grow into. | 选择任务会长成哪种花。 | Flower selector subtitle |
| `src/App.tsx:3561`, `src/App.tsx:3684` | Normal / Important / Essential | 普通 / 重要 / 很重要 | Settings options / flower selector tab |

## Active English-Only Text

| Source | English | Suggested Chinese | Current usage |
|---|---|---|---|
| `index.html:6` | Today's Flower | 今日之花 | Browser/document title |
| `src/App.tsx:1953` | Apply | 应用 | Month picker confirm button |
| `src/App.tsx:2130` | Today's Flow | 今日之花 | Animated main heading prefix |
| `src/App.tsx:2157` | er | 花 | Animated suffix that completes `Today's Flower` |
| `src/App.tsx:2167` | To Grow | 待生长 | Wishlist page center heading |
| `src/App.tsx:3278` | Let your tasks flower... | 让任务开花... | Single-line todo placeholder |
| `src/App.tsx:3278` | Let this idea take root | 让这个想法扎根 | Grass placeholder |
| `electron/main.cjs:5` | J-Flow | J-Flow | Electron window/app title fallback |
| `electron/main.cjs:190` | Today's Flowerbed ꕤ ${count} Waiting to Bloom${groupSuffix} | 今日花圃 ꕤ 待绽放 ${count} 株${groupSuffix} | English reminder notification title |
| `package.json:description` | Desktop-first personal todo app shell for J-Flow. | J-Flow 桌面优先个人待办应用外壳。 | Package metadata |
| `package.json:build.productName` | Todo Desktop | Todo Desktop | Packaged app product name |

## Active Chinese-Only Text

Current reachable source has very little Chinese-only UI copy. Most Chinese UI copy in the old `TemplateFormFields` and `TodoModePanel` chain was removed with those files.

| Source | Chinese | English counterpart | Current usage |
|---|---|---|---|
| `electron/main.cjs:189` | 今日花圃 ꕤ 待绽放 ${count} 株${groupSuffix} | Today's Flowerbed ꕤ ${count} Waiting to Bloom${groupSuffix} | Chinese reminder notification title |

## Review Notes

| Issue | Source | Current text | Suggested action |
|---|---|---|---|
| Heading construction | `src/App.tsx:2130`, `src/App.tsx:2157` | `Today's Flow` + `er` | Replace with one complete localized string if language switching should affect the hero title |
| Product metadata mismatch | `package.json` | `react-example`, `Todo Desktop` | Consider aligning package name and productName with `J-Flow` |
