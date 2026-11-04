/** Fork-only access shaping and history-based pinned membership proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SlackAdapter } from '../src/slack-adapter.js';

const blocks = [
  { type: 'section', text: { type: 'mrkdwn', text: '*Header*' } },
  { type: 'section', text: { type: 'mrkdwn', text: 'Body <@U2>' } },
  { type: 'context', elements: [{ type: 'mrkdwn', text: 'Context' }] },
];
for (const nested of [false, true]) {
  test(`pinned fallback history, thread and backscroll retain ${nested ? 'absent-text nested' : 'Notification'} blocks and file references`, async () => {
    const payload = nested ? { attachments: [{ color: '#36a64f', blocks }] } : { text: 'Notification', blocks };
    const row = { ts: '100.000001', bot_id: 'BOTHER', ...payload,
      files: [{ id: 'F123', name: 'report.txt', mimetype: 'text/plain' }] };
    const calls: string[] = [];
    const adapter = new SlackAdapter({
      users: { info: async ({ user }: any) => ({ user: { name: user === 'U2' ? 'alice' : user } }) },
      conversations: {
        history: async () => { calls.push('history'); return { ok: true, messages: [row] }; },
        replies: async () => { calls.push('replies'); return { ok: true, messages: [row] }; },
        info: async () => { throw new Error('pinned fallback must not need metadata scopes'); },
      },
    } as any, { on() {} } as any, 'UBOT', 'example', undefined, undefined, false, undefined,
    ['channels:history', 'users:read']);
    adapter.configureAccessPolicy({ writeChannels: ['CPINNED'], dmUsers: [], readJoinedChannels: true,
      historyMembershipFallbackChannels: ['CPINNED'] });
    const backscroll = await adapter.fetchHistory('CPINNED');
    const reads = [
      await adapter.readHistory('CPINNED', {}),
      await adapter.readThread('CPINNED', row.ts, {}),
      backscroll,
    ];
    const expected = (nested ? '' : 'Notification\n') + '*Header*\nBody @alice (uid:U2)\nContext';
    for (const read of reads) {
      assert.equal(read.messages[0].content, expected);
      assert.equal(read.messages[0].authorBotId, 'BOTHER');
      assert.ok(JSON.stringify(read.messages[0].attachments).includes('F123'), 'file reference survives every read');
    }
    assert.equal(backscroll.messages[0].attachments[0].fileId, 'F123');
    assert.ok(calls.filter(c => c === 'history').length >= 5, 'fresh membership proof for each read');
    assert.ok(calls.includes('replies'));
  });
}

// Spy at the routing boundary: runs on Node 22 without the optional Node 24
// SQLite ledger, while exercising real admission and incoming-event shaping.
test('attachment-only bot mention is display-only, including recipient-routing input', async () => {
  let handler: any;
  const adapter = new SlackAdapter({
    users: { info: async ({ user }: any) => ({ user: { name: user.toLowerCase(), is_bot: false } }) },
    conversations: { info: async () => ({ ok: true, channel: { id: 'C1', is_channel: true, is_im: false, is_mpim: false, is_private: false, is_member: true } }) },
  } as any, { on: (_: string, h: any) => { handler = h; } } as any, 'UBOT', 'example', undefined, undefined, false, undefined, ['channels:read', 'channels:history', 'users:read']);
  adapter.configureAccessPolicy({ writeChannels: ['C1'], dmUsers: [], readJoinedChannels: true });
  const inputs: any[] = [];
  Object.defineProperty(adapter, 'routing', { value: { receive(input: any) { inputs.push(input); return undefined; } } });
  const received: any[] = [];
  adapter.onMessage(m => { received.push(m); });
  for (const [index, text] of ['Notification', '<@U2>'].entries()) {
    handler({ event: { type: 'message', channel: 'C1', user: 'U1', ts: String(inputs.length + 1),
      text, attachments: [{ text: '<@UBOT>' }] }, ack: async () => {} });
    for (let tries = 0; received.length <= index; tries++) {
      assert.ok(tries < 100, 'delivery completes');
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  assert.equal(received.length, 2);
  for (const [i, message] of received.entries()) {
    assert.ok(message.cleanContent.includes('@ubot (uid:UBOT)'));
    assert.equal(message.mentionsBot, false);
    assert.deepEqual(message.mentionIds, i === 0 ? [] : ['U2']);
    assert.deepEqual(inputs[i].mentions, i === 0 ? [] : ['U2']);
    assert.equal(message.rawContent, i === 0 ? 'Notification' : '<@U2>');
  }
});
