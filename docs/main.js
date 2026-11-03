const $ = (selector) => document.querySelector(selector);
const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
const validUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
const youtubeId = (value) => { const safe = validUrl(value); if (!safe) return ''; const url = new URL(safe); const host = url.hostname.toLowerCase(); let id = ''; if (host === 'youtu.be') id = url.pathname.slice(1); else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) id = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || url.searchParams.get('v') || ''; return /^[\w-]{11}$/.test(id) ? id : ''; };
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const monthLabel = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value.replace('-', '.') : '';
const categories = ['AI·컴퓨터 비전', '3D·가상융합', '멀티모달 AI', '미디어·공간 인터랙션'];
const selection = { year: 'ALL', category: 'ALL' };

function link(label, url) { const a = el('a', '', label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function videoButton(url) { const id = youtubeId(url); if (!id) return null; const button = el('button', 'video-action', '영상 바로 보기 ▶'); button.type = 'button'; button.addEventListener('click', () => openVideo(id)); return button; }
let lastFocus = null;
function openVideo(id) { lastFocus = document.activeElement; const frame = el('iframe'); frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`; frame.title = '청룡토크 발표 영상'; frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share'; frame.allowFullscreen = true; $('#video-frame').replaceChildren(frame); $('#video-modal').hidden = false; $('#video-close').focus(); document.body.style.overflow = 'hidden'; }
function closeVideo() { $('#video-modal').hidden = true; $('#video-frame').replaceChildren(); document.body.style.overflow = ''; lastFocus?.focus?.(); }
$('#video-close').addEventListener('click', closeVideo);
$('#video-modal').addEventListener('click', (event) => { if (event.target === $('#video-modal')) closeVideo(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#video-modal').hidden) closeVideo(); });

function detail(label, value) { const row = el('div', 'talk-detail'); row.append(el('dt', '', label), el('dd', '', text(value, 200))); return row; }

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function eventDay(talk) {
  const raw = text(talk.eventDate || talk.date, 120);
  const match = raw.match(/^\s*(\d{4})[-.]\s*(\d{1,2})[-.]\s*(\d{1,2})/);
  if (!match) return '';
  const candidate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : '';
}

function eventTime(talk) {
  if (talk.time) return text(talk.time, 120);
  return text(talk.date, 120).match(/\d{1,2}:\d{2}(?:\s*[~–-]\s*\d{1,2}:\d{2})?/)?.[0] || '';
}

const upcomingPlaceholder = $('#upcoming-content').firstElementChild.cloneNode(true);
const latestPlaceholder = $('#latest-content').firstElementChild.cloneNode(true);

function renderUpcoming(talks) {
  const groups = new Map();
  for (const talk of talks) {
    const date = eventDay(talk), time = eventTime(talk), location = text(talk.location, 200);
    const key = JSON.stringify([date, time, location]);
    if (!groups.has(key)) groups.set(key, { date, time, location, talks: [] });
    groups.get(key).talks.push(talk);
  }
  const scheduled = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  if (!scheduled.length) { $('#upcoming-content').replaceChildren(upcomingPlaceholder.cloneNode(true)); return; }
  const cards = scheduled.map((event, index) => {
    const article = el('article', 'upcoming-event');
    const when = el('div', 'upcoming-when');
    when.append(el('span', 'upcoming-overline', index === 0 ? 'NEXT CHEONGRYONG TALK' : 'UPCOMING CHEONGRYONG TALK'));
    const [year, month, day] = event.date.split('-');
    when.append(el('strong', 'upcoming-date', `${month}.${day}`), el('span', 'upcoming-year', `${year}년`));
    const facts = el('dl', 'upcoming-facts');
    if (event.time) facts.append(detail('시간', event.time));
    if (event.location) facts.append(detail('장소', event.location));
    when.append(facts);
    const body = el('div', 'upcoming-talks');
    const presentations = event.talks.sort((a, b) => (a.id || 0) - (b.id || 0));
    body.append(el('p', 'eyebrow', `${presentations.length}개의 발표`));
    for (const talk of presentations) {
      const item = el('div', 'upcoming-talk');
      const tags = el('div', 'archive-tags');
      if (talk.category) tags.append(el('span', 'category-tag', text(talk.category, 80)));
      if (talk.venue) tags.append(el('span', 'venue-tag', text(talk.venue, 100)));
      if (tags.childNodes.length) item.append(tags);
      item.append(el('span', 'upcoming-talk-label', '발표 주제'), el('h3', '', text(talk.title, 240)));
      const speaker = [talk.speaker || '발표자 추후 안내', talk.affiliation].filter(Boolean).join(' · ');
      item.append(el('p', 'upcoming-speaker', text(speaker, 240)));
      if (validUrl(talk.noticeUrl)) item.append(link('발표 공지 보기 ↗', validUrl(talk.noticeUrl)));
      body.append(item);
    }
    article.append(when, body); return article;
  });
  $('#upcoming-content').replaceChildren(...cards);
}

function renderLatest(talks) {
  if (!talks.length) { $('#latest-content').replaceChildren(latestPlaceholder.cloneNode(true)); return; }
  const recent = talks.filter(talk => talk.month === talks[0].month);
  const wrap = el('div', 'recent-wrap');
  const heading = el('div', 'recent-month');
  heading.append(el('span', '', `${monthLabel(recent[0].month)} / RECENT EDITION`), el('strong', '', `${recent.length}개의 발표`));
  wrap.append(heading);
  const grid = el('div', 'recent-grid');
  for (const talk of recent) {
    const card = el('article', 'recent-card');
    const top = el('div', 'recent-card-top');
    top.append(el('span', 'category-tag', text(talk.category || '청룡토크', 80)));
    if (talk.venue) top.append(el('span', 'venue-tag', text(talk.venue, 100)));
    card.append(top, el('h3', '', text(talk.title, 240)));
    const details = el('dl', 'recent-details');
    for (const [label, value] of [['발표', [talk.speaker, talk.affiliation].filter(Boolean).join(' · ')], ['일시', talk.date], ['장소', talk.location]]) if (value) details.append(detail(label, value));
    card.append(details);
    if (talk.summary) card.append(el('p', 'recent-summary', text(talk.summary, 500)));
    const actions = el('div', 'recent-actions');
    if (validUrl(talk.noticeUrl)) actions.append(link('공지 보기 ↗', validUrl(talk.noticeUrl)));
    const video = videoButton(talk.videoUrl); if (video) actions.append(video);
    if (actions.childNodes.length) card.append(actions);
    grid.append(card);
  }
  wrap.append(grid); $('#latest-content').replaceChildren(wrap);
}

function renderArchive(talks) {
  const filtered = talks.filter(talk => (selection.year === 'ALL' || talk.month.startsWith(selection.year)) && (selection.category === 'ALL' || talk.category === selection.category));
  $('#archive-count').textContent = `${String(filtered.length).padStart(2, '0')} TALKS`;
  const list = $('#archive-list');
  if (!filtered.length) {
    const empty = el('div', 'archive-empty');
    empty.append(el('span', '', 'NO TALKS FOUND'), el('h3', '', '선택한 분야의 발표가 아직 없습니다.'), el('p', '', '다른 분야나 연도를 선택해 주세요.'));
    list.replaceChildren(empty); return;
  }
  list.replaceChildren(...filtered.map(talk => {
    const article = el('article', 'archive-item');
    article.append(el('div', 'archive-month', monthLabel(talk.month)));
    const body = el('div', 'archive-body');
    const tags = el('div', 'archive-tags');
    if (talk.category) tags.append(el('span', 'category-tag', text(talk.category, 80)));
    if (talk.venue) tags.append(el('span', 'venue-tag', text(talk.venue, 100)));
    if (tags.childNodes.length) body.append(tags);
    body.append(el('h3', '', text(talk.title, 240)));
    const details = [talk.speaker, talk.affiliation, talk.date, talk.location].filter(Boolean).join(' · ');
    if (details) body.append(el('p', '', text(details, 500)));
    if (talk.summary) body.append(el('p', 'archive-summary', text(talk.summary, 500)));
    article.append(body);
    const actions = el('div', 'archive-actions');
    if (validUrl(talk.noticeUrl)) actions.append(link('공지 ↗', validUrl(talk.noticeUrl)));
    const video = videoButton(talk.videoUrl);
    if (video) actions.append(video); else actions.append(el('span', 'pending', '영상 미등록'));
    article.append(actions);
    return article;
  }));
}

function renderFilters(talks) {
  const years = [...new Set(talks.map(talk => talk.month.slice(0, 4)))].sort().reverse();
  const filters = [
    { host: $('#category-filters'), field: 'category', values: ['ALL', ...categories] },
    { host: $('#year-filters'), field: 'year', values: ['ALL', ...years] },
  ];
  for (const { host, field, values } of filters) {
    host.replaceChildren(...values.map(value => {
      const active = value === selection[field];
      const button = el('button', active ? 'active' : '', value === 'ALL' ? '전체' : value);
      button.type = 'button'; button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => { selection[field] = value; syncFilters(); renderArchive(talks); });
      button.dataset.value = value; return button;
    }));
  }
  function syncFilters() {
    for (const { host, field } of filters) for (const button of host.querySelectorAll('button')) {
      const active = button.dataset.value === selection[field];
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    }
  }
  for (const card of document.querySelectorAll('.theme-card')) card.onclick = () => {
    selection.category = card.dataset.category; selection.year = 'ALL';
    syncFilters(); renderArchive(talks);
  };
  const counts = { 'AI·컴퓨터 비전': '#count-ai', '3D·가상융합': '#count-xr', '멀티모달 AI': '#count-multi', '미디어·공간 인터랙션': '#count-media' };
  for (const category of categories) $(counts[category]).textContent = `${talks.filter(talk => talk.category === category).length}건`;
}

async function loadData() {
  try {
    const [talksResponse, siteResponse] = await Promise.all([fetch('./data/talks.json', { cache: 'no-store' }), fetch('./data/site.json', { cache: 'no-store' })]);
    if (!talksResponse.ok || !siteResponse.ok) throw new Error('data unavailable');
    const payload = await talksResponse.json(); const site = await siteResponse.json();
    const talks = Array.isArray(payload.talks) ? payload.talks.filter(t => /^\d{4}-(0[1-9]|1[0-2])$/.test(t.month) && t.title && t.published !== false).sort((a, b) => b.month.localeCompare(a.month) || (b.id || 0) - (a.id || 0)) : [];
    let renderedDay = '';
    function refreshTalkSections() {
      const today = todayInSeoul();
      const upcoming = talks.filter(talk => eventDay(talk) >= today);
      const past = talks.filter(talk => !eventDay(talk) || eventDay(talk) < today);
      renderUpcoming(upcoming); renderLatest(past); renderArchive(past); renderFilters(past);
      renderedDay = today;
    }
    refreshTalkSections();
    setInterval(() => { if (todayInSeoul() !== renderedDay) refreshTalkSections(); }, 60_000);
    const formUrl = validUrl(site.mailingFormUrl);
    if (formUrl) { const a = $('#mailing-link'); a.href = formUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.classList.remove('is-disabled'); a.removeAttribute('aria-disabled'); a.firstChild.textContent = '메일링리스트 신청 '; a.parentElement.querySelector('small').textContent = '신청 내역은 비공개 명단으로 관리됩니다.'; }
    const repo = validUrl(site.repositoryUrl);
    if (repo && new URL(repo).hostname === 'github.com') {
      const base = repo.replace(/\/$/, '');
      const admin = $('#admin-link'); admin.href = `${base}/issues/new?template=seminar.yml`; admin.hidden = false;
    }
  } catch (error) { console.error('청룡토크 게시 자료를 불러오지 못했습니다.', error); }
}
$('.menu-toggle').addEventListener('click', () => { const open = $('#nav').classList.toggle('open'); $('.menu-toggle').setAttribute('aria-expanded', String(open)); });
$('#nav').addEventListener('click', (event) => { if (event.target.closest('a')) { $('#nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); } });
loadData();
