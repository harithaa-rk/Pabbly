const http = require('http');

const server = http.createServer((req, res) => {
  const targetUrl = `http://localhost:3000${req.url}`;
  res.writeHead(307, { Location: targetUrl });
  res.end(`Redirecting to ${targetUrl}`);
});

server.listen(3001, () => {
  console.log('Redirect server listening on port 3001 -> port 3000');
});
