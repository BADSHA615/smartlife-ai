const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/update-api-key') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { apiKey } = JSON.parse(body);
                if (!apiKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'API key required' }));
                    return;
                }

                // Update app.js
                const appJsPath = path.join(__dirname, 'app.js');
                let appJsContent = fs.readFileSync(appJsPath, 'utf8');
                const oldKeyMatch = appJsContent.match(/const API_KEY = '[^']*';/);
                if (oldKeyMatch) {
                    appJsContent = appJsContent.replace(oldKeyMatch[0], `const API_KEY = '${apiKey}';`);
                    fs.writeFileSync(appJsPath, appJsContent);

                    // Commit and push
                    exec('git add . && git commit -m "Update API key" && git push origin main', (error, stdout, stderr) => {
                        if (error) {
                            console.error('Git error:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to push to GitHub', details: stderr }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'API key updated and pushed to GitHub' }));
                    });
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Could not find API_KEY in app.js' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    let filePath = '.' + req.url;
    if (filePath == './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found', 'utf-8');
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

}).listen(port, '0.0.0.0', () => {
    console.log(`✅ SmartLife AI Server running on port ${port}`);
    console.log(`🌐 Local: http://localhost:${port}`);
    console.log(`📡 Network: http://0.0.0.0:${port}`);
});
