const COUNTY_NAME_FIX = {
  '桃園縣': '桃園市'
};

let EXPERIENCES;
let WORKSHOPS;

async function init() {
  [EXPERIENCES, WORKSHOPS] = await Promise.all([
    fetchJSON('data/experiences.json'),
    fetchJSON('data/workshops.json')
  ]);

  initRadar();
  initMap();
  initChat();
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '發生錯誤');
  return json;
}

/* ---------------- 區塊一：能力雷達圖 ---------------- */
function initRadar() {
  const abilities = EXPERIENCES.core_abilities;
  const levels = abilities.map(a => EXPERIENCES.ability_levels[a]);

  const ctx = document.getElementById('radar-chart');
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: abilities,
      datasets: [{
        label: '能力發展程度',
        data: levels,
        backgroundColor: 'rgba(79, 70, 229, 0.18)',
        borderColor: '#4f46e5',
        pointBackgroundColor: '#4f46e5',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: { stepSize: 2, showLabelBackdrop: false },
          pointLabels: { font: { size: 11 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  const container = document.getElementById('ability-buttons');
  abilities.forEach((ability, i) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span>${ability}</span><span class="level">${levels[i]}/10</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ability-buttons button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAchievements(ability);
    });
    container.appendChild(btn);
  });

  // 預設顯示第一項
  container.querySelector('button').classList.add('active');
  renderAchievements(abilities[0]);
}

function renderAchievements(ability) {
  const list = document.getElementById('achievement-list');
  list.innerHTML = '';
  const matched = EXPERIENCES.experiences.filter(e => e.abilities.includes(ability));

  matched.forEach(exp => {
    const card = document.createElement('div');
    card.className = 'achievement-card';
    card.innerHTML = `
      <h4>${exp.title}</h4>
      <div class="period">${exp.period}｜${exp.type}</div>
      <p>${exp.narrative}</p>
    `;
    list.appendChild(card);
  });

  if (matched.length === 0) {
    list.innerHTML = '<p class="hint">目前尚無相關紀錄。</p>';
  }
}

/* ---------------- 區塊二：全台研習地圖 ---------------- */
async function initMap() {
  const topo = await fetchJSON('tw-county.topojson');
  const objectName = Object.keys(topo.objects)[0];
  const geojson = topojson.feature(topo, topo.objects[objectName]);

  const counts = WORKSHOPS.summary.by_county;
  const maxCount = Math.max(...Object.values(counts));
  const colorScale = d3.scaleSequentialSqrt(['#dde3fb', '#4f46e5']).domain([0, maxCount]);

  const svg = d3.select('#tw-map');
  const width = 580, height = 800;
  const margin = 16;
  const projection = d3.geoMercator().fitExtent(
    [[margin, margin], [width - margin, height - margin]],
    geojson
  );
  const path = d3.geoPath().projection(projection);

  svg.selectAll('path')
    .data(geojson.features)
    .join('path')
    .attr('d', path)
    .attr('fill', d => {
      const name = COUNTY_NAME_FIX[d.properties.COUNTYNAME] || d.properties.COUNTYNAME;
      const count = counts[name] || 0;
      return count === 0 ? '#eef0fb' : colorScale(count);
    })
    .on('click', (event, d) => {
      svg.selectAll('path').classed('selected', false);
      d3.select(event.currentTarget).classed('selected', true);
      const name = COUNTY_NAME_FIX[d.properties.COUNTYNAME] || d.properties.COUNTYNAME;
      showCountyDetail(name);
    })
    .append('title')
    .text(d => {
      const name = COUNTY_NAME_FIX[d.properties.COUNTYNAME] || d.properties.COUNTYNAME;
      return `${name}：${counts[name] || 0} 場`;
    });

  // 圖例
  const legend = document.getElementById('map-legend');
  const steps = 5;
  let gradient = '';
  for (let i = 0; i <= steps; i++) {
    gradient += colorScale(maxCount * i / steps) + (i < steps ? ',' : '');
  }
  legend.innerHTML = `
    <span>0</span>
    <div class="scale" style="background: linear-gradient(to right, ${gradient})"></div>
    <span>${maxCount} 場</span>
  `;

  // 總覽統計
  const summary = document.getElementById('map-summary');
  const topicEntries = Object.entries(WORKSHOPS.summary.by_topic);
  const aiCount = topicEntries.find(([k]) => k.includes('AI'))?.[1] || 0;
  summary.innerHTML = `
    <div class="stat-pill"><span class="num">${WORKSHOPS.summary.total}</span><span class="label">對外研習場次</span></div>
    <div class="stat-pill"><span class="num">${WORKSHOPS.summary.counties_covered}</span><span class="label">縣市覆蓋</span></div>
    <div class="stat-pill"><span class="num">${aiCount}</span><span class="label">AI主題場次</span></div>
  `;

  // 對內教育訓練
  renderInternalTrainings();

  // 頁籤切換
  initMapTabs();
}

function renderInternalTrainings() {
  const internal = document.getElementById('internal-trainings');
  internal.innerHTML = WORKSHOPS.internal_trainings.map(t => `
    <div class="training-card">
      <div class="category">${t.category}</div>
      <div class="count">${t.items.length}<span>項</span></div>
    </div>
  `).join('');
}

function initMapTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${target}`));
    });
  });
}

function showCountyDetail(countyName) {
  const detail = document.getElementById('county-detail');
  const records = WORKSHOPS.records.filter(r => r.county === countyName);

  if (records.length === 0) {
    detail.innerHTML = `<strong>${countyName}</strong>：目前尚無研習紀錄。`;
    return;
  }

  const topicCounts = {};
  records.forEach(r => { topicCounts[r.topicLabel] = (topicCounts[r.topicLabel] || 0) + 1; });

  const recentList = records.slice(-6).reverse().map(r =>
    `<li>${r.period}｜${r.school}（${r.topicLabel}）</li>`
  ).join('');

  detail.innerHTML = `
    <strong>${countyName}</strong>　共 ${records.length} 場
    <div style="margin: 8px 0;">
      ${Object.entries(topicCounts).map(([topic, n]) => `<span class="topic-tag">${topic} ×${n}</span>`).join('')}
    </div>
    <ul style="margin: 8px 0 0; padding-left: 18px;">${recentList}</ul>
  `;
}

/* ---------------- 區塊三：數位分身對話 ---------------- */
const SUGGESTED_QUESTIONS = [
  '你有沒有處理過專案時程delay的經驗？',
  '你在數位教材上做過最創新的功能是什麼？',
  '你怎麼說服老師接受新的AI工具？',
  '在AI快速發展的環境下，你怎麼持續學習？',
  '可以分享一個讓你印象深刻的研習經驗嗎？'
];

function initChat() {
  const btn = document.getElementById('chat-btn');
  const input = document.getElementById('chat-input');
  const result = document.getElementById('chat-result');
  const suggestions = document.getElementById('suggested-questions');

  SUGGESTED_QUESTIONS.forEach(q => {
    const chip = document.createElement('button');
    chip.textContent = q;
    chip.addEventListener('click', () => {
      input.value = q;
      btn.click();
    });
    suggestions.appendChild(chip);
  });

  btn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;

    setResult(result, '思考中...', 'loading');
    try {
      const data = await fetchJSON('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      setResult(result, data.answer);
    } catch (e) {
      setResult(result, `錯誤：${e.message}`, 'error');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

function setResult(el, text, mode) {
  el.textContent = text;
  el.classList.remove('loading', 'error');
  if (mode) el.classList.add(mode);
}

init().catch(e => console.error('初始化失敗', e));
