import { useMemo, useState } from 'react';
import { migrationData, months } from './data';

type Metric = '총전입' | '총전출' | '순이동';

const format = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
const short = (value: number) =>
  Math.abs(value) >= 10000 ? `${(value / 10000).toFixed(1)}만` : format(value);

function Icon({ name }: { name: 'search' | 'trend' | 'rank' | 'spark' | 'arrow' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    trend: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-5 3 3 5-7" /></>,
    rank: <><path d="M5 20V10h4v10" /><path d="M11 20V4h4v16" /><path d="M17 20v-7h4v7" /></>,
    spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Z" /><path d="m5 16 .7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16Z" /></>,
    arrow: <><path d="m5 12 5 5L20 7" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function TrendChart({
  region,
  metric,
}: {
  region: (typeof migrationData)[number];
  metric: Metric;
}) {
  const values = region.values.map((item) => item[metric] ?? 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = 42 + (index * 548) / (values.length - 1);
    const y = 24 + ((max - value) / span) * 154;
    return { x, y, value };
  });
  const zeroY = 24 + ((max - 0) / span) * 154;

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 630 220" className="chart" role="img" aria-label={`${region.region} ${metric} 추이`}>
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="42" x2="590" y1={24 + line * 51.3} y2={24 + line * 51.3} className="grid-line" />
        ))}
        {min < 0 && <line x1="42" x2="590" y1={zeroY} y2={zeroY} className="zero-line" />}
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6f5c" stopOpacity=".2" />
            <stop offset="100%" stopColor="#1f6f5c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L 590 178 L 42 178 Z`} fill="url(#area)" />
        <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} className="trend-line" />
        {points.map((point, index) => (
          <g key={months[index]}>
            <circle cx={point.x} cy={point.y} r="4" className="trend-point">
              <title>{`${months[index]} · ${format(point.value)}명`}</title>
            </circle>
            <text x={point.x} y="205" textAnchor="middle" className="axis-label">{months[index].slice(5)}월</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function NormalizedChart({ regions }: { regions: typeof migrationData }) {
  const colors = ['#1f6f5c', '#e17152', '#637b95'];
  const series = regions.map((region) => {
    const values = region.values.map((item) => item['순이동'] ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((value) => (max === min ? 0.5 : (value - min) / (max - min)));
  });

  return (
    <>
      <div className="legend">
        {regions.map((region, index) => (
          <span key={region.region}><i style={{ background: colors[index] }} />{region.region}</span>
        ))}
      </div>
      <svg viewBox="0 0 630 170" className="chart normalized" role="img" aria-label="지역별 정규화 순이동 비교">
        {[0, .5, 1].map((tick) => (
          <g key={tick}>
            <line x1="42" x2="590" y1={145 - tick * 120} y2={145 - tick * 120} className="grid-line" />
            <text x="31" y={149 - tick * 120} textAnchor="end" className="axis-label">{tick}</text>
          </g>
        ))}
        {series.map((values, seriesIndex) => {
          const points = values.map((value, index) => `${42 + (index * 548) / (values.length - 1)},${145 - value * 120}`).join(' ');
          return <polyline key={regions[seriesIndex].region} points={points} fill="none" stroke={colors[seriesIndex]} strokeWidth="2.5" strokeLinejoin="round" />;
        })}
        {months.map((month, index) => (
          <text key={month} x={42 + (index * 548) / (months.length - 1)} y="164" textAnchor="middle" className="axis-label">{month.slice(5)}</text>
        ))}
      </svg>
    </>
  );
}

export default function App() {
  const regions = migrationData.filter((item) => item.region !== '전국');
  const [selectedRegion, setSelectedRegion] = useState('서울특별시');
  const [monthIndex, setMonthIndex] = useState(months.length - 1);
  const [metric, setMetric] = useState<Metric>('순이동');
  const [query, setQuery] = useState('');
  const region = migrationData.find((item) => item.region === selectedRegion) ?? migrationData[1];
  const current = region.values[monthIndex];
  const previous = region.values[Math.max(0, monthIndex - 1)];

  const ranking = useMemo(() => [...regions]
    .filter((item) => item.values[monthIndex]['순이동'] !== null)
    .sort((a, b) => (b.values[monthIndex]['순이동'] ?? 0) - (a.values[monthIndex]['순이동'] ?? 0))
    .slice(0, 6), [monthIndex]);
  const rankMax = Math.max(...ranking.map((item) => Math.abs(item.values[monthIndex]['순이동'] ?? 0)), 1);
  const suggestions = query
    ? regions.filter((item) => item.region.includes(query)).slice(0, 5)
    : [];
  const compareRegions = [
    region,
    ...ranking.filter((item) => item.region !== region.region).slice(0, 2),
  ];
  const netChange = (current['순이동'] ?? 0) - (previous['순이동'] ?? 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>MO</span><strong>이동의 모양</strong></div>
        <nav>
          <a className="active" href="#overview"><Icon name="trend" />대시보드</a>
          <a href="#ranking"><Icon name="rank" />지역 순위</a>
          <a href="#compare"><Icon name="spark" />정규화 비교</a>
        </nav>
        <div className="side-note">
          <Icon name="spark" />
          <strong>데이터 한눈에</strong>
          <p>통계청 국내인구이동통계를 더 쉽고 선명하게 탐색해 보세요.</p>
        </div>
        <p className="source">출처 · 통계청 KOSIS<br />단위 · 명</p>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">KOREA MIGRATION EXPLORER</p>
            <h1>사람들은 어디로<br /><em>움직이고 있을까?</em></h1>
          </div>
          <div className="update"><span /> 2026.08 업데이트</div>
        </header>

        <section className="control-bar" id="overview">
          <div className="search-box">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="지역을 검색하세요"
              aria-label="지역 검색"
            />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button key={item.region} onClick={() => { setSelectedRegion(item.region); setQuery(''); }}>
                    {item.region}<span>선택</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label>
            기준 월
            <select value={monthIndex} onChange={(event) => setMonthIndex(Number(event.target.value))}>
              {months.map((month, index) => <option key={month} value={index}>{month.replace('.', '년 ')}월</option>)}
            </select>
          </label>
        </section>

        <section className="section-head">
          <div><p className="section-kicker">REGION SNAPSHOT</p><h2>{selectedRegion}</h2></div>
          <p>{months[monthIndex].replace('.', '년 ')}월 기준</p>
        </section>

        <section className="kpi-grid">
          {(['총전입', '총전출', '순이동'] as Metric[]).map((item) => {
            const value = current[item] ?? 0;
            const diff = value - (previous[item] ?? 0);
            return (
              <article className={`kpi-card ${item === '순이동' ? 'featured' : ''}`} key={item}>
                <div className="kpi-top"><span>{item}</span><small>{item === '총전입' ? 'IN' : item === '총전출' ? 'OUT' : 'NET'}</small></div>
                <strong>{value > 0 && item === '순이동' ? '+' : ''}{format(value)}<small>명</small></strong>
                <p className={diff >= 0 ? 'up' : 'down'}>{diff >= 0 ? '↑' : '↓'} 전월 대비 {format(Math.abs(diff))}명</p>
              </article>
            );
          })}
        </section>

        <section className="dashboard-grid">
          <article className="panel trend-panel">
            <div className="panel-head">
              <div><p className="section-kicker">MONTHLY FLOW</p><h3>월별 이동 추이</h3></div>
              <div className="segmented">
                {(['순이동', '총전입', '총전출'] as Metric[]).map((item) => (
                  <button className={metric === item ? 'active' : ''} onClick={() => setMetric(item)} key={item}>{item}</button>
                ))}
              </div>
            </div>
            <TrendChart region={region} metric={metric} />
          </article>

          <article className="panel insight">
            <div className="insight-icon"><Icon name="spark" /></div>
            <p className="section-kicker">DATA STORY</p>
            <h3>{netChange >= 0 ? '이동 흐름이 개선됐어요' : '순유출 폭이 커졌어요'}</h3>
            <p>
              {selectedRegion}의 8월 순이동은 <strong>{format(Math.abs(current['순이동'] ?? 0))}명</strong>으로,
              전월보다 {format(Math.abs(netChange))}명 {netChange >= 0 ? '상승' : '하락'}했습니다.
            </p>
            <div className="insight-stat">
              <span>전입 대비 전출 비율</span>
              <strong>{current['총전입'] ? ((current['총전출'] ?? 0) / current['총전입'] * 100).toFixed(1) : '0'}%</strong>
            </div>
          </article>
        </section>

        <section className="lower-grid">
          <article className="panel ranking" id="ranking">
            <div className="panel-head">
              <div><p className="section-kicker">TOP REGIONS</p><h3>순이동 상위 지역</h3></div>
              <span className="badge">{months[monthIndex].slice(5)}월</span>
            </div>
            <div className="rank-list">
              {ranking.map((item, index) => {
                const value = item.values[monthIndex]['순이동'] ?? 0;
                return (
                  <button key={item.region} onClick={() => setSelectedRegion(item.region)}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{item.region}</span>
                    <i><em style={{ width: `${Math.abs(value) / rankMax * 100}%` }} /></i>
                    <strong>{value > 0 ? '+' : ''}{short(value)}</strong>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel compare" id="compare">
            <div className="panel-head">
              <div><p className="section-kicker">NORMALIZED VIEW</p><h3>지역 흐름 비교</h3></div>
              <span className="badge soft">MIN 0 · MAX 1</span>
            </div>
            <p className="panel-copy">각 지역의 최솟값을 0, 최댓값을 1로 환산해 흐름의 모양을 비교합니다.</p>
            <NormalizedChart regions={compareRegions} />
          </article>
        </section>
        <footer><span>Migration Observatory</span><p>숫자 너머, 사람의 움직임을 읽습니다.</p></footer>
      </main>
    </div>
  );
}
