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
