const http = require('http');

const server = http.createServer((req, res) => {
  const targetUrl = `http://localhost:3000${req.url}`;
  res.writeHead(307, {
    'Location': targetUrl,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(`Redirecting to ${targetUrl}`);
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Port 3001 redirect helper active -> http://localhost:3000');
});

