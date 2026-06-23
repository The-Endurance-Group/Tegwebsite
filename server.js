const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const LEAD_RECIPIENT = 'csullivan@theendurancegroup.com';
const LEAD_SENDER = 'Endurance Group Site <leads@theendurancegroup.com>';
const LEADS_LOG_PATH = process.env.LEADS_LOG_PATH || path.join(ROOT, 'leads.jsonl');

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitHits = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    var chunks = [];
    var size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function parseBody(raw, contentType) {
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return JSON.parse(raw || '{}');
  }
  var fields = {};
  var params = new URLSearchParams(raw || '');
  params.forEach(function (value, key) {
    fields[key] = value;
  });
  return fields;
}

function clientIp(req) {
  var forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress;
}

function isRateLimited(ip) {
  var now = Date.now();
  var hits = (rateLimitHits.get(ip) || []).filter(function (t) {
    return now - t < RATE_LIMIT_WINDOW_MS;
  });
  hits.push(now);
  rateLimitHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function logLead(fields, ip) {
  var entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: ip,
    fields: fields,
  }) + '\n';
  fs.appendFile(LEADS_LOG_PATH, entry, function (err) {
    if (err) console.error('Failed to write lead backup:', err);
  });
}

async function sendLeadEmail(fields) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  var text = [
    'New Free Automation request from theendurancegroup.com',
    '',
    'Name: ' + (fields['full-name'] || ''),
    'Email: ' + (fields['work-email'] || ''),
    'Company: ' + (fields['company'] || ''),
    'What they want automated: ' + (fields['automate-goal'] || ''),
  ].join('\n');

  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: LEAD_SENDER,
      to: [LEAD_RECIPIENT],
      reply_to: fields['work-email'] || undefined,
      subject: 'New Free Automation request: ' + (fields['company'] || fields['full-name'] || 'Unknown'),
      text: text,
    }),
  });

  if (!res.ok) {
    var detail = await res.text().catch(function () { return ''; });
    throw new Error('Resend API error ' + res.status + ': ' + detail);
  }
}

async function handleLeadSubmission(req, res) {
  var wantsJson = (req.headers['accept'] || '').indexOf('application/json') !== -1;

  function respond(success) {
    if (wantsJson) {
      res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: success }));
    } else {
      res.writeHead(302, { Location: '/free-automation.html?submitted=' + (success ? 'true' : 'error') });
      res.end();
    }
  }

  var ip = clientIp(req);

  try {
    var raw = await readBody(req);
    var fields = parseBody(raw, req.headers['content-type']);

    // Honeypot: real users never fill this in. Bots that auto-fill every
    // field do, so pretend success without sending anything.
    if (fields['website']) {
      console.log('Honeypot triggered, ignoring submission from', ip);
      respond(true);
      return;
    }

    if (isRateLimited(ip)) {
      console.error('Rate limit exceeded for', ip);
      respond(false);
      return;
    }

    if (!fields['full-name'] || !fields['work-email'] || !fields['company']) {
      respond(false);
      return;
    }

    logLead(fields, ip);
    await sendLeadEmail(fields);
    respond(true);
  } catch (err) {
    console.error('Lead submission failed:', err);
    respond(false);
  }
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/free-automation') {
    handleLeadSubmission(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Serving The Endurance Group site on port ${PORT}`);
});
