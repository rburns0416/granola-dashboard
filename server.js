const handler = require('serve-handler');
const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  return handler(req, res, {
    public: 'build',
    rewrites: [{ source: '**', destination: '/index.html' }]
  });
});

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
