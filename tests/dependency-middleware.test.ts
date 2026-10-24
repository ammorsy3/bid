import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import multer from 'multer';
import { gzipSync } from 'node:zlib';
import { request as httpRequest } from 'node:http';
import request from 'supertest';
import { startTestServer, stopTestServer, type TestServer } from './helpers/test-server';

const app = express();
app.use(express.json());
app.post('/json', (req, res) => res.json(req.body));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16, files: 1 } });
app.post('/upload', upload.single('file'), (req, res) => res.json({ size: req.file?.size, name: req.file?.originalname }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err instanceof multer.MulterError ? 400 : err.status || 500).json({ code: err.code, message: err.message });
});
let server: TestServer;
beforeAll(async () => { server = await startTestServer(app); });
afterAll(() => stopTestServer(server));

describe('patched request middleware', () => {
  it('accepts compressed JSON without changing the body', async () => {
    const bytes = gzipSync(Buffer.from('{"name":"BID"}'));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing test address');
    const response = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port: address.port, path: '/json', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': bytes.length } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
        res.on('error', reject);
      });
      req.setTimeout(3000, () => req.destroy(new Error('request timed out')));
      req.on('error', reject);
      req.end(bytes);
    });
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ name: 'BID' });
  });
  it('rejects malformed JSON and continues serving later requests', async () => {
    expect((await request(server).post('/json').type('json').send('{')).status).toBe(400);
    expect((await request(server).post('/json').send({ ok: true })).body).toEqual({ ok: true });
  });
  it('accepts a valid multipart file and still rejects oversized files', async () => {
    const good = await request(server).post('/upload').attach('file', Buffer.from('hello'), 'hello.txt');
    expect(good.status).toBe(200);
    expect(good.body).toEqual({ size: 5, name: 'hello.txt' });
    const bad = await request(server).post('/upload').attach('file', Buffer.alloc(32), 'large.txt');
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('LIMIT_FILE_SIZE');
  });
});
