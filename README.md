# CR 筆記 — GMAT Critical Reasoning 拆解工具

在 iPhone 上一次處理一題 CR：貼上題目截圖 → 填分析格子（Premise / Argument / 因果表格 / 選項…）→ 匯出 PDF。

網址：<https://j282hyc.github.io/GMAT-CR/>

## 本工具不儲存資料

- 所有內容只存在頁面記憶體（React state）裡，**重新整理或關閉頁面就消失**。
- 不使用 localStorage、sessionStorage、IndexedDB、Cookie 或 Cache API 存放任何使用者內容。
- 不傳送任何資料到伺服器，沒有任何分析 / 追蹤程式。
- 截圖只以 `blob:` URL 顯示，移除或按「新題目」時立即釋放。
- Service worker 只預先快取 App 本身的程式檔（讓它能離線開啟），不快取使用者內容。
- 唯一留下來的東西是你自己匯出的 PDF。

> ⚠️ iPhone 在記憶體不夠時，切到別的 App（相簿、截圖）再回來，Safari 可能會重新載入頁面，填到一半的內容就會不見。
> **完成後請立即匯出 PDF。** 頂部會一直顯示「未匯出 / 已匯出 ✓」。

## 在 iPhone 加入主畫面

1. 用 **Safari** 開啟 <https://j282hyc.github.io/GMAT-CR/>
2. 點下方「分享」按鈕 → 「加入主畫面」
3. 之後從主畫面開啟就是全螢幕、沒有網址列；開過一次後，飛航模式下也能使用

## 使用方式

- **截圖**：截圖後在「長按這裡 → 貼上題目截圖」的框長按 → 貼上；或按「從相簿選擇」（可多選，HEIC 會自動轉成 JPEG）。點截圖可全螢幕放大。
- **箭頭**：任何文字框聚焦時，右上角會浮出 ⬆️ ⬇️ ➡️ ⬅️，點了會插入到游標位置，鍵盤不會收起。
- **因果 / 判斷**：切換時兩邊的內容都保留。
- **匯出 PDF**：iPhone 會出現分享選單，可「儲存到檔案」或傳給 LINE；電腦上會直接下載。
  沒填的欄位不會出現在 PDF 裡；內容長時自動分頁，不會把表格列或截圖從中間切斷。
- **用系統列印**（「匯出 PDF」旁的 ▾ 選單）：備案。iPhone 列印畫面可再分享成 PDF，文字可選取。
- **新題目**：有未匯出的內容時要按兩次才會清空。

## 本機開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev        # http://localhost:5173/GMAT-CR/
npm run build      # 型別檢查 + 產生 dist/
npm run preview    # 預覽正式版（含 service worker）
```

開發模式下，「匯出 PDF」旁的 ▾ 選單有「載入範例」，會載入一題範例（含用 canvas 畫出來的假截圖），正式版不會出現。

要在 iPhone 上測開發版：`npm run dev -- --host`，用同一個 Wi‑Fi 開 `http://<電腦 IP>:5173/GMAT-CR/`。
（注意：非 HTTPS 下 service worker 與部分分享功能不會啟用，完整行為請用 GitHub Pages 版測。）

圖示由 `npm run icons` 產生（`scripts/make-icons.mjs`，不需額外套件）。

## 部署（GitHub Pages）

推送到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並部署。

第一次需要在 GitHub 開啟 Pages：Repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
之後每次 push 都會自動更新。

## 技術

React + TypeScript + Vite、`vite-plugin-pwa`、`html2canvas` + `jsPDF`。

| 檔案 | 用途 |
|---|---|
| `src/sheet.ts` | `Sheet` 型別、初始值、reducer |
| `src/components/` | TopBar、ImagePaste、ChainTable、ChoiceList、ArrowAccessory、Field |
| `src/export/PrintSheet.tsx` | PDF / 列印專用版面 |
| `src/export/pdf.tsx` | html2canvas + jsPDF、分頁、分享 / 下載 |
| `src/images.ts` | 截圖轉檔（HEIC / 大圖 → JPEG，最長邊 2000px） |
| `src/sample.ts` | 開發用範例資料 |
