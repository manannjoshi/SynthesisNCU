// Tiny local server: static files + /api/analyze. Run: node dev-server.js
const http = require('http'), fs = require('fs'), path = require('path');
try { fs.readFileSync('.env', 'utf8').split('\n').forEach(l => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }); } catch (e) {}
const handler = require('./api/analyze.js');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/api/analyze') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      try { req.body = b ? JSON.parse(b) : {}; } catch (e) { req.body = {}; }
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      handler(req, res);
    });
    return;
  }
  const file = path.join(__dirname, url === '/' ? 'index.html' : url);
  const allowed = ['index.html', 'styles.css', 'app.js', 'match.js', 'data'];
  const rel = path.relative(__dirname, file);
  if (!allowed.includes(rel.split(path.sep)[0]) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'text/plain'); fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('SynthesisNCU on http://localhost:' + PORT));
