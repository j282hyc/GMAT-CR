# CR 筆記 — GMAT Critical Reasoning 拆解工具

在 iPhone 上一次處理一題 CR：複製題目文字貼上 → 填分析格子（Premise / Argument / 因果表格 / 選項…）→ 匯出 PDF（真正的文字 PDF，可選取、搜尋、複製）。

網址：<https://j282hyc.github.io/GMAT-CR/>

## 本工具不儲存資料

- 所有內容只存在頁面記憶體（React state）裡，**重新整理或關閉頁面就消失**。
- 不使用 localStorage、sessionStorage、IndexedDB、Cookie 或 Cache API 存放任何使用者內容。
- 不傳送任何資料到伺服器，沒有任何分析 / 追蹤程式。
- 備用截圖只以 `blob:` URL 顯示，移除或按「新題目」時立即釋放。
- Service worker 只預先快取 App 本身的程式檔（讓它能離線開啟），不快取使用者內容。
- 唯一留下來的東西是你自己匯出的 PDF。

> ⚠️ iPhone 在記憶體不夠時，切到別的 App（相簿、截圖）再回來，Safari 可能會重新載入頁面，填到一半的內容就會不見。
> **完成後請立即匯出 PDF。** 頂部會一直顯示「未匯出 / 已匯出 ✓」。

## 在 iPhone 加入主畫面

1. 用 **Safari** 開啟 <https://j282hyc.github.io/GMAT-CR/>
2. 點下方「分享」按鈕 → 「加入主畫面」
3. 之後從主畫面開啟就是全螢幕、沒有網址列；開過一次後，飛航模式下也能使用

## 使用方式

- **題目文字**：複製題目（題幹＋選項）→ 在「題目文字」框長按 → 貼上，或按「從剪貼簿貼上」。
  選項 (A)–(E) 會自動拆到下方「選項」裡（支援 `(A) …`、`A. …`、`A) …`、全形 `（A）…`，每行一個或同一行都可以）。
- **截圖（備用）**：題目無法複製文字時（例如有圖表），展開「題目截圖」，長按貼上截圖或「從相簿選擇」（HEIC 會自動轉成 JPEG）。
- **箭頭**：任何文字框聚焦時，右上角會浮出 ⬆️ ⬇️ ➡️ ⬅️，點了會插入到游標位置，鍵盤不會收起。
- **因果 / 判斷**：切換時兩邊的內容都保留。
- **匯出 PDF**：iPhone 會出現分享選單，可「儲存到檔案」或傳給 LINE；電腦上會直接下載。
  PDF 是真正的文字（內嵌 Noto Sans TC 子集字型），可以選取、搜尋、複製；檔案通常只有幾十 KB。
  沒填的欄位不會出現在 PDF 裡；內容長時自動分頁，不會把表格列或段落從中間切斷，表頭會在新頁重複。
  ⬆️⬇️➡️⬅️ 會印成單色箭頭；字型裡沒有的符號（例如其他 emoji）會印成 □。
- **用系統列印**（「匯出 PDF」旁的 ▾ 選單）：備案，用瀏覽器自己的列印功能輸出。
- **新題目**：有未匯出的內容時要按兩次才會清空。

## 本機開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev        # http://localhost:5173/GMAT-CR/
npm run build      # 型別檢查 + 產生 dist/
npm run preview    # 預覽正式版（含 service worker）
```

開發模式下，「匯出 PDF」旁的 ▾ 選單有「載入範例」，會用同一個解析器載入一題範例，正式版不會出現。

要在 iPhone 上測開發版：`npm run dev -- --host`，用同一個 Wi‑Fi 開 `http://<電腦 IP>:5173/GMAT-CR/`。
（注意：非 HTTPS 下 service worker 與部分分享功能不會啟用，完整行為請用 GitHub Pages 版測。）

圖示由 `npm run icons` 產生（`scripts/make-icons.mjs`，不需額外套件）。

## 部署（GitHub Pages）

推送到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並部署。

第一次需要在 GitHub 開啟 Pages：Repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
之後每次 push 都會自動更新。

已安裝到主畫面的 App 會在背景下載新版，**完全關閉 App（從多工畫面滑掉）再開**才會換成新版。
（故意不在使用中強制更新：那會讓填到一半的內容消失。）

## 技術

React + TypeScript + Vite、`vite-plugin-pwa`、`pdf-lib`、HarfBuzz（`harfbuzzjs` 的 hb-subset WebAssembly）做字型子集化。

| 檔案 | 用途 |
|---|---|
| `src/sheet.ts` | `Sheet` 型別、初始值、reducer |
| `src/components/` | TopBar、QuestionInput、ImagePaste、ChainTable、ChoiceList、ArrowAccessory、Field |
| `src/question.ts` | 把貼上的題目拆成題幹＋選項 A–E |
| `src/export/pdf.ts` | 文字 PDF 版面、換行、分頁、分享 / 下載 |
| `src/export/subset.ts` | 用 HarfBuzz 產生只含用到字元的字型子集 |
| `src/export/PrintSheet.tsx` | 「用系統列印」的版面 |
| `public/fonts/` | Noto Sans TC（SIL Open Font License，見 `OFL.txt`） |
| `src/images.ts` | 備用截圖轉檔（HEIC / 大圖 → JPEG，最長邊 2000px） |
| `src/sample.ts` | 開發用範例資料 |
