const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const LEAD_RECIPIENT = 'csullivan@theendurancegroup.com';

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
      from: 'Endurance Group Site <onboarding@resend.dev>',
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

  try {
    var raw = await readBody(req);
    var fields = parseBody(raw, req.headers['content-type']);

    if (!fields['full-name'] || !fields['work-email'] || !fields['company']) {
      respond(false);
      return;
    }

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
