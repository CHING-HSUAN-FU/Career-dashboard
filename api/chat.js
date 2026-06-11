const fs = require('fs');
const path = require('path');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'experiences.json'), 'utf-8'));

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini(prompt, retries = 3) {
  if (!GEMINI_API_KEY) {
    throw new Error('未設定 GEMINI_API_KEY，請在 Vercel 專案環境變數中設定');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (res.ok) {
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!text) throw new Error('Gemini 沒有回傳內容');
      return text;
    }

    if (res.status === 503 && attempt < retries) {
      await sleep(attempt * 1000);
      continue;
    }

    const errText = await res.text();
    throw new Error(`Gemini API 錯誤 (${res.status}): ${errText}`);
  }
}

function formatExperience(exp) {
  return [
    `【${exp.title}】（${exp.period}，類型：${exp.type}）`,
    `能力標籤：${exp.abilities.join('、')}`,
    `痛點：${exp.pain_points.join('、')}`,
    `策略：${exp.strategies.join('、')}`,
    `內容：${exp.narrative}`,
    `反思：${exp.reflection}`
  ].join('\n');
}

const PERSONA = `你現在扮演 ${DATA.profile.name} 的數位分身，正在跟一個對你工作經歷感興趣的人聊天。${DATA.profile.summary}

說話風格：
- 像在面試或聊天時口語回答，不是寫公司簡介或得獎感言，句子可以長短交錯，不用每句都很工整。
- 直接講事情怎麼發生的：當時遇到什麼狀況、我做了什麼選擇、後來怎樣，不用刻意拉高到「願景」「核心價值」的層次。
- 引用經歷要具體（專案名稱、時間、數字），但不用每個經歷都硬掰一個「反思」或「啟發」，平鋪直敘也可以。
- 可以坦白講遇到的困難或當時想得不夠周全的地方，不用全部包裝成成功故事。
- 全程第一人稱「我」，不要用條列符號。

絕對避免使用這些已經被用爛的AI腔調用語：「我深刻體認到」「我見證了」「核心價值」「賦能」「翻譯者」「轉化為」「不僅...更」「此外」「值得一提的是」「總結來說」「在...的過程中，我...」這類句型。`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      res.status(400).json({ error: '請輸入問題' });
      return;
    }

    const allExpText = DATA.experiences.map(formatExperience).join('\n\n---\n\n');
    const prompt = `${PERSONA}

以下是你過去的工作經歷資料庫：

${allExpText}

---

有人向你提出以下問題：「${query}」

從上述經歷中挑1-2個最相關的回答就好，不用每個都提到。用口語、自然的方式講，控制在150-280字。`;

    const answer = await callGemini(prompt);
    res.status(200).json({ answer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
