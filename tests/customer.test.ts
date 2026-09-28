import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findCustomerId, customerReply} from '../agent/support-agent/domain/customer.ts';
import {initialState} from '../agent/support-agent/state.ts';
import {createAgent} from '../agent/agent.ts';
import {createTools} from '../agent/tools.ts';
import type {AgentContext} from '../agent/contract.ts';
import {readCustomer, verifyAndReadCustomer} from '../agent/support-agent/adapters/customer-api.ts';

test('retail verification searches first and rejects mismatched IDs without reading details', async () => {
  const ctx = context(), calls: string[] = [];
  ctx.clientApi.request = async (_method, path) => {
    calls.push(path);
    return {status_code: 200, body: path.endsWith('/search') ? {customer_id: 'customer_a'} : {email: 'a@example.test'}, headers: {}, raiseForStatus() {}};
  };
  assert.deepEqual(await verifyAndReadCustomer(ctx.clientApi, 'customer_a', 'a@example.test'), {email: 'a@example.test'});
  assert.deepEqual(calls, ['/v1/customers/search', '/v1/customers/customer_a']);
  calls.length = 0;
  await assert.rejects(verifyAndReadCustomer(ctx.clientApi, 'customer_b', 'a@example.test'), /verification failed/);
  assert.deepEqual(calls, ['/v1/customers/search']);
  calls.length = 0;
  await assert.rejects(verifyAndReadCustomer(ctx.clientApi, 'customer_a', ''), /Provide email/);
  assert.deepEqual(calls, []);
});

function context(): AgentContext {
  return {
    tools: [], modelGateway: {availableModels: [], async generate() {throw Error('No model in unit tests');}},
    clientApi: {context: null, async request(_method, _path) {
      return {status_code: 200, body: _path.endsWith('/search') ? {customer_id: 'developer_traveler_9001'} : {email: 'sample@example.test'}, headers: {}, raiseForStatus() {}};
    }},
  };
}
test('recognizes airline/retail IDs without inventing identity', () => {
  for (const id of ['developer_traveler_9001', 'developer_pending_9001', 'customer_example'])
    assert.equal(findCustomerId('Find ' + id), id);
  assert.equal(findCustomerId('Please cancel my booking'), null);
});
test('reports malformed, missing, and failed responses truthfully', () => {
  assert.match(customerReply('{"email":"sample@example.test"}'), /sample@example.test/);
  for (const body of ['null', '[]', 'not-json']) assert.match(customerReply(body), /invalid response/);
  assert.match(customerReply('{}'), /no email/);
  assert.match(customerReply('{}', true), /could not find/);
});
test('state is isolated and input state remains unchanged', async () => {
  const agent = createAgent(context()), state = initialState();
  const first = await agent.generateNextMessage({role: 'user', content: 'developer_traveler_9001 sample@example.test'}, state);
  assert.equal(state.pendingCallId, null);
  assert.equal(first.state.pendingCallId, 'lookup-1');
  assert.equal(initialState().customerId, null);
});
test('entry points perform full lookup and correlate tool results', async () => {
  const ctx = context(), agent = createAgent(ctx);
  const first = await agent.generateNextMessage({role: 'user', content: 'developer_traveler_9001 sample@example.test'}, agent.getInitState());
  const data = await createTools(ctx)[0].execute({customer_id: 'developer_traveler_9001', email: 'sample@example.test'});
  const second = await agent.generateNextMessage({role: 'tool', tool_messages: [
    {id: 'unrelated', role: 'tool', content: '{"email":"wrong@example.test"}'},
    {id: first.state.pendingCallId!, role: 'tool', content: JSON.stringify(data)},
  ]}, first.state);
  assert.match(second.message.content!, /sample@example.test/);
  assert.equal(second.state.pendingCallId, null);
});
test('missing tool result does not fabricate success', async () => {
  const agent = createAgent(context());
  const reply = await agent.generateNextMessage({role: 'tool', tool_messages: []}, initialState());
  assert.match(reply.message.content!, /No matching/);
});
test('API encodes IDs and propagates status failures', async () => {
  const ctx = context();
  let calls = 0;
  ctx.clientApi.request = async (method, path) => {
    calls++;
    assert.equal(method, 'GET');
    assert.equal(path, '/v1/customers/a%2Fb%3Fx');
    return {status_code: 404, body: {}, headers: {}, raiseForStatus() {throw Error('not found');}};
  };
  await assert.rejects(readCustomer(ctx.clientApi, 'a/b?x'), /not found/);
  assert.equal(calls, 1);
  await assert.rejects(readCustomer(ctx.clientApi, ''), /required/);
});
