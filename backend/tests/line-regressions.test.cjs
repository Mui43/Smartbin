// Run after npm run build: node --test tests/line-regressions.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { Device } = require('../dist/models/device.js');
const { Bin } = require('../dist/models/bin.js');
const line = require('../dist/services/line.js');
const { deliverLineResult } = require('../dist/line/commandResults.js');
const router = require('../dist/routes/line.js').default;

for (const attempts of [undefined, 0, 3, 4, 5]) {
  test(`failed result delivery with ${attempts ?? 'no'} previous attempts`, async t => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(Date, 'now', () => 1_000_000);
    const send = t.mock.method(line, 'sendLineMessageTo', async () => { throw new Error('undeliverable'); });
    const update = t.mock.method(Device, 'updateOne', async () => ({}));
    const device = new Device({ deviceId: 'servo-test', lineCommand: {
      to: 'test-user', action: 'lock', binName: 'Test', phase: 'result', resultText: 'Done',
      requestedAt: new Date(0), deadlineAt: new Date(0), retryKey: 'test-key', deliveryAttempts: attempts,
    } });
    await deliverLineResult(device);
    assert.equal(send.mock.callCount(), 1);
    assert.deepEqual(send.mock.calls[0].arguments, ['test-user', 'Done', 'test-key']);
    assert.equal(update.mock.callCount(), 1);
    const [filter, change] = update.mock.calls[0].arguments;
    assert.deepEqual(filter, { _id: device._id, 'lineCommand.phase': 'result', 'lineCommand.requestedAt': new Date(0) });
    assert.deepEqual(change, (attempts ?? 0) >= 4 ? { $unset: { lineCommand: '' } } : {
      $inc: { 'lineCommand.deliveryAttempts': 1 },
      $set: { 'lineCommand.nextDeliveryAt': new Date(1_000_000 + 60_000 * 2 ** (attempts ?? 0)) },
    });
  });
}

test('successful delivery clears the result; future retries do not send', async t => {
  const send = t.mock.method(line, 'sendLineMessageTo', async () => true);
  const update = t.mock.method(Device, 'updateOne', async () => ({}));
  const device = new Device({ deviceId: 'servo-test', lineCommand: {
    to: 'test-user', action: 'lock', binName: 'Test', phase: 'result', resultText: 'Done',
    requestedAt: new Date(0), deadlineAt: new Date(0), retryKey: 'test-key',
    nextDeliveryAt: new Date(Date.now() + 60_000),
  } });
  await deliverLineResult(device);
  assert.equal(send.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
  device.lineCommand.nextDeliveryAt = new Date(0);
  await deliverLineResult(device);
  assert.equal(send.mock.callCount(), 1);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $unset: { lineCommand: '' } });
});

const webhook = router.stack.find(layer => layer.route?.path === '/webhook').route.stack.at(-1).handle;
for (const [allowlist, userId, allowed] of [
  [undefined, 'user-a', false], ['', 'user-a', false], [' ,  , ', 'user-a', false],
  ['user-b', 'user-a', false], ['user-a', undefined, false],
  [' user-a , user-b ', 'user-a', true], [' * ', 'user-a', true], ['user-b,*', 'user-a', true],
]) {
  test(`command authorization: ${JSON.stringify(allowlist)} / ${userId}`, async t => {
    const original = process.env.ALLOWED_USER_IDS;
    t.after(() => {
      if (original === undefined) delete process.env.ALLOWED_USER_IDS;
      else process.env.ALLOWED_USER_IDS = original;
    });
    if (allowlist === undefined) delete process.env.ALLOWED_USER_IDS;
    else process.env.ALLOWED_USER_IDS = allowlist;
    const reply = t.mock.method(line, 'replyLineMessage', async () => true);
    const deviceLookup = t.mock.method(Device, 'findOne', async () => null);
    const binLookup = t.mock.method(Bin, 'findOne', () => ({ lean: async () => null }));
    const events = [
      ...['on', 'off', 'clear'].map(text => ({ type: 'message', message: { type: 'text', text } })),
      ...['lock_bin', 'unlock_bin', 'restart_bin'].map(action => ({ type: 'postback', postback: { data: `action=${action}&binId=test-bin` } })),
    ].map(event => ({ ...event, replyToken: 'test-reply', source: { type: 'user', userId } }));
    let response;
    await webhook({ body: { events } }, { json: value => { response = value; } });
    assert.deepEqual(response, { success: true });
    assert.equal(deviceLookup.mock.callCount(), allowed ? 3 : 0);
    assert.equal(binLookup.mock.callCount(), allowed ? 3 : 0);
    assert.equal(reply.mock.callCount(), 6);
    for (const call of reply.mock.calls) assert.equal(call.arguments[1].startsWith('⛔'), !allowed);
  });
}

const syncSource = readFileSync(require.resolve('../dist/scripts/sync-line-webhook.js'), 'utf8');
async function sync({ addresses, port, active = true, currentEndpoint, currentOk = true, publicUrl = 'https://test.example' }) {
  const calls = [], logs = [], errors = [];
  const processStub = { env: { LINE_CHANNEL_ACCESS_TOKEN: 'synthetic-token', ...(port === undefined ? {} : { PORT: port }) } };
  const endpoint = `${publicUrl}/api/line/webhook`;
  runInNewContext(syncSource, {
    exports: {}, require: () => ({}), URL, AbortSignal, process: processStub,
    console: { log: message => logs.push(message), error: error => errors.push(String(error)) },
    fetch: async (url, options = {}) => {
      calls.push({ url, ...options });
      if (url.endsWith('/api/tunnels')) return { ok: true, json: async () => ({ tunnels: addresses.map(addr => ({ public_url: publicUrl, config: { addr } })) }) };
      if (url.endsWith('/test')) return { ok: true, json: async () => ({ success: true }) };
      if (options.method === 'PUT') return { ok: true };
      return { ok: currentOk, json: async () => ({ endpoint: currentEndpoint ?? endpoint, active }) };
    },
  });
  // Let the script's async main and error handler finish without altering its entry point.
  await new Promise(resolve => setImmediate(resolve));
  return { calls, logs, errors, exitCode: processStub.exitCode };
}

for (const address of ['http://localhost:4000', 'localhost:4000', '4000', 'http://[::1]:4000']) {
  test(`accept exact tunnel port: ${address}`, async () => {
    const result = await sync({ addresses: [address] });
    assert.equal(result.errors.length, 0);
    assert.match(result.logs[0], /webhook is current/);
    assert.equal(result.calls.length, 3);
  });
}
for (const address of ['http://localhost:14000', 'localhost:40000', 'http://4000.example:9000', 'http://localhost:9000/4000', 'http://[invalid', undefined]) {
  test(`reject tunnel address: ${address}`, async () => {
    const result = await sync({ addresses: [address] });
    assert.equal(result.exitCode, 1);
    assert.match(result.errors[0], /port 4000/);
    assert.equal(result.calls.length, 1);
  });
}
test('tunnel selection honors PORT, defaults, malformed entries, and HTTPS', async () => {
  for (const [port, address] of [['5000', 'localhost:5000'], ['0', 'localhost:4000'], ['invalid', '4000'], ['80', 'http://localhost'], ['443', 'https://localhost']]) {
    const result = await sync({ port, addresses: ['http://[invalid', address] });
    assert.equal(result.errors.length, 0);
    assert.match(result.logs[0], /webhook is current/);
  }
  const result = await sync({ addresses: ['4000'], publicUrl: 'http://test.example' });
  assert.equal(result.exitCode, 1);
  assert.equal(result.calls.length, 1);
});
test('matching inactive webhook requires enabling usage and never PUTs', async () => {
  const result = await sync({ addresses: ['4000'], active: false });
  assert.equal(result.exitCode, 1);
  assert.match(result.errors[0], /inactive; enable Use webhook/);
  assert.equal(result.logs.length, 0);
  assert.equal(result.calls.some(call => call.method === 'PUT'), false);
});
test('different endpoint is updated and active matching endpoint remains current', async () => {
  const result = await sync({ addresses: ['4000'], currentEndpoint: 'https://old.example/api/line/webhook' });
  assert.equal(result.errors.length, 0);
  assert.match(result.logs[0], /webhook updated/);
  const puts = result.calls.filter(call => call.method === 'PUT');
  assert.equal(puts.length, 1);
  assert.deepEqual(JSON.parse(puts[0].body), { endpoint: 'https://test.example/api/line/webhook' });
});
