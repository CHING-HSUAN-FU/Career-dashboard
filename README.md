# 學涯＆職涯履歷儀表板

「生成式AI的人文導論」期末專案。以個人在「數位 × 教育 × 國文」領域的工作經歷為素材，打造一個視覺化＋AI互動的履歷儀表板，包含三大區塊：

1. **能力版圖**：六項核心能力雷達圖，點擊任一能力可展開對應的具體成果清單。純資料驅動，不呼叫API。
2. **全台教育推廣足跡**：以台灣縣市熱區圖呈現102場對外數位研習的地理分布與主題分類，並列出對內教育訓練統計。純資料驅動，不呼叫API。
3. **與我的數位分身對話**（`/api/chat`）：輸入口語化問題，Gemini 以「專業穩重型」人格、第一人稱回答，並引用具體經歷佐證。

## 專案結構

```
dashboard-project/
├── data/
│   ├── experiences.json    # 經歷資料庫（核心能力、痛點、策略、敘事、反思）
│   └── workshops.json       # 全台研習場次資料（縣市、主題、對內訓練統計）
├── scripts/
│   └── build-workshops.js   # 由原始盤點紀錄產生 workshops.json 的腳本
├── public/                   # 前端靜態檔案（可整包部署到純靜態空間）
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── tw-county.topojson    # 台灣22縣市地圖資料
│   └── data/                 # experiences.json / workshops.json 的副本，供前端直接讀取
├── server.js                  # Express 後端，僅 /api/chat 需要呼叫 Gemini
├── .env                        # 存放 API Key（不會上傳 git）
└── .env.example
```

## 本機執行

```bash
npm install
# 編輯 .env，填入 GEMINI_API_KEY
npm start
```

開啟 http://localhost:3000

## 擴充資料

### 經歷資料庫 `data/experiences.json`（同步更新 `public/data/experiences.json`）

每筆經歷格式：

```json
{
  "id": "唯一代號",
  "title": "標題",
  "period": "時間",
  "type": "類型",
  "abilities": ["須為 core_abilities 中的項目"],
  "pain_points": ["..."],
  "strategies": ["..."],
  "narrative": "具體做法描述",
  "reflection": "反思心得"
}
```

- `core_abilities` 是雷達圖的六個軸；新增/調整能力時記得同步更新 `ability_levels`（1-10分）。
- `pain_points` / `strategies` 目前僅作為資料標記，供未來擴充使用。

### 研習場次資料 `data/workshops.json`

由 `scripts/build-workshops.js` 產生。若要新增場次紀錄，編輯該腳本中的 `raw` 陣列（格式：`[學期, 日期, 縣市, 學校, 主題分類]`），主題分類可選 `general`/`ai`/`tool`/`creative`/`other`，然後重新執行：

```bash
node scripts/build-workshops.js
cp data/workshops.json public/data/workshops.json
```

## 部署：Vercel（前端 + API 一起部署，推薦）

專案已內建 `api/chat.js`（Vercel serverless function 格式）與 `vercel.json`（指定靜態根目錄為 `public/`），可一次部署整個網站，前端與 `/api/chat` 共用同一個網域，`app.js` 不需修改。

1. 將整個專案推到 GitHub（一個新的 repo）：
   ```bash
   git init
   git add .
   git commit -m "Career dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-account>/<repo-name>.git
   git push -u origin main
   ```
2. 到 [vercel.com](https://vercel.com) 用 GitHub 帳號登入，點選 **Add New → Project**，選擇剛剛的 repo。
3. Framework Preset 選 **Other**（保持預設即可，`vercel.json` 已設定輸出目錄）。
4. 在 **Environment Variables** 新增：
   - `GEMINI_API_KEY`：你的 Gemini API 金鑰
   - `GEMINI_MODEL`：`gemini-2.5-flash`（可省略，程式有預設值）
5. 點 **Deploy**，完成後會得到一個公開網址，例如 `https://your-app.vercel.app`。

> 即使 API 額度用盡或尚未部署，前兩個區塊（能力版圖、研習地圖）仍能正常瀏覽，只有「數位分身對話」會顯示錯誤訊息——這是刻意的架構設計，降低對外部服務的依賴。

## 部署：純靜態空間（企業雲端空間，無 API）

企業雲端空間若只能放靜態檔案，把 `public/` 整個資料夾內容（含 `data/`、`tw-county.topojson`）上傳即可。地圖與能力版圖完全是靜態資料，無需後端也能正常運作；「數位分身對話」會顯示錯誤訊息（可在報告中說明這是架構上刻意的降級設計）。

## Week16 待辦

- [ ] 錄製 demo 影片，展示三個區塊的互動過程
- [ ] 撰寫專案報告：資料盤點過程、視覺設計理念、人格prompt設計理由、遇到的挑戰、學到什麼
- [ ] 視覺細節優化（例如地圖加入時間軸滑桿，看場次隨學期演進的分布變化）
