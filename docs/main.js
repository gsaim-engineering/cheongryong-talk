const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const validUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
const youtubeId = (value) => { const safe = validUrl(value); if (!safe) return ''; const url = new URL(safe); const host = url.hostname.toLowerCase(); let id = ''; if (host === 'youtu.be') id = url.pathname.slice(1); else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(host)) id = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || url.searchParams.get('v') || ''; return /^[\w-]{11}$/.test(id) ? id : ''; };
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const monthLabel = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value.replace('-', '.') : '';

function link(label, url, className = '') { const a = el('a', className, label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function videoButton(url) { const id = youtubeId(url); if (!id) return null; const button = el('button', 'video-action', '영상 바로 보기 ▶'); button.type = 'button'; button.addEventListener('click', () => openVideo(id)); return button; }
let lastFocus = null;
function openVideo(id) { lastFocus = document.activeElement; const frame = el('iframe'); frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`; frame.title = '청룡토크 발표 영상'; frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share'; frame.allowFullscreen = true; $('#video-frame').replaceChildren(frame); $('#video-modal').hidden = false; $('#video-close').focus(); document.body.style.overflow = 'hidden'; }
function closeVideo() { $('#video-modal').hidden = true; $('#video-frame').replaceChildren(); document.body.style.overflow = ''; lastFocus?.focus?.(); }
$('#video-close').addEventListener('click', closeVideo);
$('#video-modal').addEventListener('click', (event) => { if (event.target === $('#video-modal')) closeVideo(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#video-modal').hidden) closeVideo(); });

function renderLatest(talk) {
  if (!talk) return;
  const outer = el('article', 'featured');
  const copy = el('div', 'featured-copy');
  const top = el('div', 'featured-top'); top.append(el('span', '', 'LATEST TALK'), el('b', '', monthLabel(talk.month))); copy.append(top);
  copy.append(el('h3', '', text(talk.title, 240)));
  const meta = el('div', 'featured-meta');
  for (const [name, value] of [['발표', [talk.speaker, talk.affiliation].filter(Boolean).join(' · ')], ['일시', talk.date], ['장소', talk.location]]) { if (!value) continue; const item = el('span'); item.append(el('strong', '', name), document.createTextNode(text(value, 200))); meta.append(item); }
  if (meta.childNodes.length) copy.append(meta);
  if (talk.summary) copy.append(el('p', 'featured-summary', text(talk.summary)));
  const actions = el('div', 'featured-actions');
  if (validUrl(talk.noticeUrl)) actions.append(link('발표 공지 보기 ↗', validUrl(talk.noticeUrl), 'button button-dark'));
  const video = videoButton(talk.videoUrl); if (video) actions.append(video);
  if (actions.childNodes.length) copy.append(actions);
  const visual = el('div', 'featured-visual');
  if (validUrl(talk.posterUrl)) { const image = el('img'); image.src = validUrl(talk.posterUrl); image.alt = `${text(talk.title, 100)} 발표 포스터`; image.loading = 'lazy'; visual.append(image); }
  else visual.append(el('div', 'abstract-poster', '靑'));
  visual.append(el('span', '', 'CHEONGRYONG TALK · MONTHLY SEMINAR'));
  outer.append(copy, visual); $('#latest-content').replaceChildren(outer);
}

function renderArchive(talks, year = 'ALL') {
  const list = $('#archive-list'); const filtered = year === 'ALL' ? talks : talks.filter(talk => talk.month.startsWith(year));
  if (!filtered.length) { const empty = el('div', 'archive-empty'); empty.append(el('span', '', 'NO TALKS YET'), el('h3', '', year === 'ALL' ? '청룡토크의 기록이 이곳에 쌓입니다.' : `${year}년 발표 기록이 없습니다.`), el('p', '', '새로운 발표 공지가 게시되면 이곳에서 확인할 수 있습니다.')); list.replaceChildren(empty); return; }
  list.replaceChildren(...filtered.map(talk => { const article = el('article', 'archive-item'); article.append(el('div', 'archive-month', monthLabel(talk.month))); const body = el('div'); body.append(el('h3', '', text(talk.title, 240))); const details = [talk.speaker, talk.affiliation, talk.date, talk.location].filter(Boolean).join(' · '); if (details) body.append(el('p', '', text(details, 500))); if (talk.summary) body.append(el('p', 'archive-summary', text(talk.summary, 500))); article.append(body); const actions = el('div', 'archive-actions'); if (validUrl(talk.noticeUrl)) actions.append(link('공지 ↗', validUrl(talk.noticeUrl))); const video = videoButton(talk.videoUrl); if (video) actions.append(video); else actions.append(el('span', 'pending', '영상 추후 공개')); article.append(actions); return article; }));
}
function renderFilters(talks) { const years = [...new Set(talks.map(talk => talk.month.slice(0,4)))].sort().reverse(); const filters = $('#year-filters'); if (!years.length) return; for (const year of ['ALL', ...years]) { const button = el('button', year === 'ALL' ? 'active' : '', year === 'ALL' ? '전체' : year); button.type = 'button'; button.addEventListener('click', () => { filters.querySelectorAll('button').forEach(b => b.classList.remove('active')); button.classList.add('active'); renderArchive(talks, year); }); filters.append(button); } }

async function loadData() {
  try {
    const [talksResponse, siteResponse] = await Promise.all([fetch('./data/talks.json', {cache:'no-store'}), fetch('./data/site.json', {cache:'no-store'})]);
    if (!talksResponse.ok || !siteResponse.ok) throw new Error('data unavailable');
    const payload = await talksResponse.json(); const site = await siteResponse.json();
    const talks = Array.isArray(payload.talks) ? payload.talks.filter(t => /^\d{4}-(0[1-9]|1[0-2])$/.test(t.month) && t.title && t.published !== false).sort((a,b) => b.month.localeCompare(a.month) || (b.id || 0) - (a.id || 0)) : [];
    renderLatest(talks[0]); renderArchive(talks); renderFilters(talks); $('#archive-count').textContent = `${String(talks.length).padStart(2,'0')} TALKS`;
    const formUrl = validUrl(site.mailingFormUrl); if (formUrl) { const a = $('#mailing-link'); a.href = formUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.classList.remove('is-disabled'); a.removeAttribute('aria-disabled'); a.firstChild.textContent = '메일링리스트 신청 '; a.parentElement.querySelector('small').textContent = '신청 내역은 비공개 명단으로 관리됩니다.'; }
    const repo = validUrl(site.repositoryUrl); if (repo && new URL(repo).hostname === 'github.com') { const admin = $('#admin-link'); admin.href = `${repo.replace(/\/$/,'')}/issues/new?template=seminar.yml`; admin.hidden = false; }
  } catch (error) { console.error('청룡토크 게시 자료를 불러오지 못했습니다.', error); }
}
$('.menu-toggle').addEventListener('click', () => { const open = $('#nav').classList.toggle('open'); $('.menu-toggle').setAttribute('aria-expanded', String(open)); });
$('#nav').addEventListener('click', (event) => { if (event.target.closest('a')) { $('#nav').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); } });
loadData();
