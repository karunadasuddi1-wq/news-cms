const http = require('http');

function startSplitByteServer(testString, splitPoint) {
  const buf = Buffer.from(testString, 'utf8');
  const chunk1 = buf.slice(0, splitPoint);
  const chunk2 = buf.slice(splitPoint);

  return new Promise((resolveServer) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200);
      res.write(chunk1);
      setImmediate(() => res.end(chunk2));
    });
    server.listen(0, () => resolveServer(server));
  });
}

function fetchBuggy(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}`, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function fetchFixed(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}`, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

describe('UTF-8 chunk-boundary corruption (Kannada SEO text bug)', () => {
  const testString = 'ಹಗರಣ ಇಂದಿ — ಸಿಎಂ ಫಡ್ನವಿಸ್';
  const splitPoint = 7;

  it('reproduces the corruption with the old buggy pattern (confirms the diagnosis)', async () => {
    const server = await startSplitByteServer(testString, splitPoint);
    const port = server.address().port;
    const result = await fetchBuggy(port);
    server.close();

    expect(result).toContain('\ufffd');
    expect(result).not.toBe(testString);
  });

  it('correctly reassembles the character with the fixed Buffer.concat pattern', async () => {
    const server = await startSplitByteServer(testString, splitPoint);
    const port = server.address().port;
    const result = await fetchFixed(port);
    server.close();

    expect(result).not.toContain('\ufffd');
    expect(result).toBe(testString);
  });
});
