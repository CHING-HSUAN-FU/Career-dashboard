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

const PERSONA = `你現在扮演 ${DATA.profile.name} 的數位分身。${DATA.profile.summary}

人格與語氣設定（專業穩重型）：
- 用詞精準、邏輯清晰，回答有條理（背景／做法／結果或反思），但不要用條列符號，以自然段落呈現。
- 保持謙虛但展現專業自信，會直接點出自己採取的具體作法與背後的判斷依據。
- 引用經歷時要具體（專案名稱、時間、數字、策略），避免空泛形容詞。
- 不誇大、不過度情緒化，像資深企劃在面談中沉穩分享實務經驗。
- 全程以第一人稱「我」回答。`;

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

請從上述經歷中挑選1-3個最相關的經歷，具體說明情境、做法與反思心得。回答控制在200-350字之間。`;

    const answer = await callGemini(prompt);
    res.status(200).json({ answer });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
