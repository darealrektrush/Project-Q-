import http from 'node:http';

// Only expose the campaign preview from a disposable local database. This
// proxy never forwards cookies, authorization headers, or unsafe methods.
const previewPort = Number(process.env.BOND_PREVIEW_PORT || 3000);
const appPort = Number(process.env.BOND_PREVIEW_APP_PORT || 3001);

if (![previewPort, appPort].every((port) => Number.isInteger(port) && port > 0 && port < 65536)) {
  throw new Error('invalid Bond preview port');
}

http.createServer((request, response) => {
  const path = request.url || '/';
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    return response.end('This isolated preview is read-only.');
  }
  if (!path.startsWith('/campaign-app/') && path !== '/healthz') {
    response.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    return response.end('Not found');
  }
  const upstream = http.request({
    hostname: '127.0.0.1', port: appPort, path, method: request.method,
    headers: { accept: request.headers.accept || '*/*' },
  }, (result) => {
    response.writeHead(result.statusCode || 502, {
      'content-type': result.headers['content-type'] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    result.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
    response.end('Preview app unavailable');
  });
  upstream.end();
}).listen(previewPort, '127.0.0.1', () => {
  console.log(`read-only Bond preview listening on 127.0.0.1:${previewPort}`);
});
