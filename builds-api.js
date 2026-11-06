// /api/builds: lets the weekly n8n workflow add new skills, plugins and
// automations to the "Browse what's possible" section of
// book-value-assessment.html.
//
// GET  /api/builds  -> what the page already has (Drive file IDs, titles, categories)
// POST /api/builds  -> { builds: [...] } adds cards and commits the page to GitHub;
//                      Railway redeploys from main on its own.
//
// Both require "Authorization: Bearer <N8N_BUILDS_SECRET>".
// The page itself is the record: each card added here carries
// data-build-id="<Drive file ID>", and files judged duplicates of existing
// cards are listed in a <!-- builds-skipped: ... --> comment, so no file is
// processed twice.

const crypto = require('crypto');

const PAGE_PATH = 'book-value-assessment.html';
const CATEGORIES = [
  'Apps & Products',
  'Sales & Prospecting',
  'Real Estate',
  'Franchise & Multi-Location',
  'Documents & Proposals',
  'Research & Intelligence',
  'Operations & Productivity',
];
const TYPES = { App: 'app', Automation: 'automation' };
const SKIPPED_RE = /<!-- builds-skipped: ([^>]*?) -->/;
const BUILD_ID_RE = /data-build-id="([A-Za-z0-9_-]+)"/g;
const ID_OK = /^[A-Za-z0-9_-]{10,128}$/;

function repo() { return process.env.GITHUB_REPO || 'The-Endurance-Group/Tegwebsite'; }
function branch() { return process.env.GITHUB_BRANCH || 'main'; }

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  var secret = process.env.N8N_BUILDS_SECRET;
  if (!secret) return false;
  var header = req.headers['authorization'] || '';
  var given = header.replace(/^Bearer\s+/i, '');
  var a = crypto.createHash('sha256').update(given).digest();
  var b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtml(s) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normTitle(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function github(method, url, body) {
  var token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  var res = await fetch('https://api.github.com/repos/' + repo() + url, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'TEG-Website-Builds',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    var err = new Error('GitHub ' + method + ' ' + url + ' failed: ' + res.status + ' ' + (data.message || ''));
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loadPage() {
  var data = await github('GET', '/contents/' + PAGE_PATH + '?ref=' + encodeURIComponent(branch()));
  return { html: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
}

function parsePage(html) {
  var ids = [];
  var m;
  BUILD_ID_RE.lastIndex = 0;
  while ((m = BUILD_ID_RE.exec(html))) ids.push(m[1]);
  var skippedMatch = html.match(SKIPPED_RE);
  var skipped = skippedMatch && skippedMatch[1].trim() ? skippedMatch[1].trim().split(/\s*,\s*/) : [];
  var cards = [];
  var cardRe = /<h3 class="portfolio-card-title">([\s\S]*?)<\/h3>/g;
  while ((m = cardRe.exec(html))) {
    var before = html.lastIndexOf('portfolio-category-name">', m.index);
    var catEnd = html.indexOf('</span>', before);
    var category = before >= 0 ? decodeHtml(html.slice(before + 'portfolio-category-name">'.length, catEnd)) : '';
    cards.push({ title: decodeHtml(m[1]), category: category });
  }
  return { ids: ids, skipped: skipped, cards: cards };
}

function cardHtml(b) {
  var typeClass = TYPES[b.type];
  return '\n                <div class="portfolio-card" data-build-id="' + b.id + '">\n' +
    '                  <span class="portfolio-card-type portfolio-card-type--' + typeClass + '">' + b.type + '</span>\n' +
    '                  <h3 class="portfolio-card-title">' + escapeHtml(b.title) + '</h3>\n' +
    '                  <p class="portfolio-card-stat">' + escapeHtml(b.stat) + '</p>\n' +
    '                  <p class="portfolio-card-desc">' + escapeHtml(b.description) + '</p>\n' +
    '                  <p class="portfolio-card-bestfor"><strong>Built for:</strong> ' + escapeHtml(b.bestFor) + '</p>\n' +
    '                  <a class="btn btn-secondary portfolio-card-link" href="#assessment">Assess this opportunity</a>\n' +
    '                </div>\n';
}

// Adds the card at the top of its category (newest first) and bumps the count.
function insertCard(html, b) {
  var nameTag = '<span class="portfolio-category-name">' + escapeHtml(b.category) + '</span>';
  var at = html.indexOf(nameTag);
  if (at < 0) throw new Error('Category not found on page: ' + b.category);
  var countRe = /(<span class="portfolio-category-count">)(\d+)(<\/span>)/y;
  var countAt = html.indexOf('<span class="portfolio-category-count">', at);
  countRe.lastIndex = countAt;
  var cm = countRe.exec(html);
  if (!cm) throw new Error('Count not found for: ' + b.category);
  html = html.slice(0, countAt) + cm[1] + (parseInt(cm[2], 10) + 1) + cm[3] + html.slice(countAt + cm[0].length);
  var gridTag = '<div class="portfolio-browse-grid">';
  var gridAt = html.indexOf(gridTag, at);
  if (gridAt < 0) throw new Error('Grid not found for: ' + b.category);
  var insertAt = gridAt + gridTag.length;
  return html.slice(0, insertAt) + cardHtml(b) + html.slice(insertAt);
}

function writeSkipped(html, skipped) {
  var comment = '<!-- builds-skipped: ' + skipped.join(',') + ' -->';
  if (SKIPPED_RE.test(html)) return html.replace(SKIPPED_RE, comment);
  return html.replace('</body>', comment + '\n</body>');
}

async function handleGet(res) {
  var page = await loadPage();
  var parsed = parsePage(page.html);
  sendJson(res, 200, {
    ids: parsed.ids.concat(parsed.skipped),
    titles: parsed.cards.map(function (c) { return c.title; }),
    cards: parsed.cards,
    categories: CATEGORIES,
  });
}

async function handlePost(req, res, readBody) {
  var body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
  }
  var builds = Array.isArray(body && body.builds) ? body.builds : null;
  if (!builds || builds.length === 0) return sendJson(res, 400, { ok: false, error: 'builds must be a non-empty array' });
  if (builds.length > 100) return sendJson(res, 400, { ok: false, error: 'At most 100 builds per request' });

  var page = await loadPage();
  var html = page.html;
  var parsed = parsePage(html);
  var known = new Set(parsed.ids.concat(parsed.skipped));
  var titles = new Set(parsed.cards.map(function (c) { return normTitle(c.title); }));
  var skipped = parsed.skipped.slice();
  var added = [], skippedNow = [], rejected = [];

  builds.forEach(function (raw) {
    var id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!ID_OK.test(id)) { rejected.push({ id: id, reason: 'invalid id' }); return; }
    if (known.has(id)) { rejected.push({ id: id, reason: 'already processed' }); return; }
    var b = {
      id: id,
      category: cleanText(raw.category, 60),
      type: cleanText(raw.type, 20),
      title: cleanText(raw.title, 80),
      stat: cleanText(raw.stat, 160),
      description: cleanText(raw.description, 600),
      bestFor: cleanText(raw.bestFor, 200),
    };
    var duplicateOf = cleanText(raw.duplicateOf, 120);
    if (duplicateOf || raw.include === false || titles.has(normTitle(b.title))) {
      skipped.push(id);
      known.add(id);
      skippedNow.push({ id: id, title: b.title, reason: duplicateOf ? 'duplicate of ' + duplicateOf : (raw.include === false ? 'not suitable for the site' : 'same title already on page') });
      return;
    }
    if (CATEGORIES.indexOf(b.category) < 0) { rejected.push({ id: id, reason: 'unknown category: ' + b.category }); return; }
    if (!TYPES[b.type]) { rejected.push({ id: id, reason: 'type must be App or Automation' }); return; }
    if (!b.title || !b.stat || !b.description || !b.bestFor) { rejected.push({ id: id, reason: 'missing title, stat, description or bestFor' }); return; }
    html = insertCard(html, b);
    known.add(id);
    titles.add(normTitle(b.title));
    added.push({ id: id, title: b.title, category: b.category });
  });

  if (added.length === 0 && skippedNow.length === 0) {
    return sendJson(res, 200, { ok: true, committed: false, added: added, skipped: skippedNow, rejected: rejected });
  }
  if (skippedNow.length) html = writeSkipped(html, skipped);

  var message = added.length
    ? 'Book Value Assessment: add ' + added.length + ' build' + (added.length === 1 ? '' : 's') + ' from weekly n8n sync\n\n' +
      added.map(function (a) { return '- ' + a.title + ' (' + a.category + ')'; }).join('\n')
    : 'Book Value Assessment: record ' + skippedNow.length + ' skipped Drive file(s) from weekly n8n sync';
  var commit = await github('PUT', '/contents/' + PAGE_PATH, {
    message: message,
    content: Buffer.from(html, 'utf8').toString('base64'),
    sha: page.sha,
    branch: branch(),
  });
  sendJson(res, 200, {
    ok: true,
    committed: true,
    commit: commit.commit && commit.commit.html_url,
    added: added,
    skipped: skippedNow,
    rejected: rejected,
  });
}

async function handleBuilds(req, res, readBody) {
  if (!process.env.N8N_BUILDS_SECRET) return sendJson(res, 503, { ok: false, error: 'Builds sync is not configured' });
  if (!authorized(req)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  try {
    if (req.method === 'GET') return await handleGet(res);
    if (req.method === 'POST') return await handlePost(req, res, readBody);
    res.writeHead(405, { Allow: 'GET, POST' });
    res.end();
  } catch (err) {
    console.error('[BUILDS]', err.message);
    sendJson(res, err.status === 409 ? 409 : 502, { ok: false, error: err.message });
  }
}

module.exports = { handleBuilds, parsePage, insertCard, writeSkipped, CATEGORIES };
