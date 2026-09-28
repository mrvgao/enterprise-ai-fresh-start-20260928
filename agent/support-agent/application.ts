/** Deterministic t1 lookup orchestration; extend this for business workflows. */
import type {AgentContext, Message} from '../contract.ts';
import {customerReply, findCustomerId, findEmail} from './domain/customer.ts';
import {domain} from './config.ts';
import {initialState} from './state.ts';
import type {SessionState} from './state.ts';

export function createAgent(_context: AgentContext) {
  return {
    getInitState(_history: Message[] = []): SessionState {return initialState();},
    async generateNextMessage(message: Message, state: SessionState) {
      const next = {...state, turn: state.turn + 1};
      if (message.role === 'tool') {
        const result = state.pendingCallId
          ? message.tool_messages?.find(item => item.id === state.pendingCallId)
          : undefined;
        next.pendingCallId = null;
        const content = result
          ? customerReply(result.content || '', result.error)
          : 'No matching customer lookup result was received. Please try again.';
        return {message: {role: 'assistant', content}, state: next};
      }
      const customerId = findCustomerId(message.content || '') || state.customerId;
      const email = findEmail(message.content || '');
      next.customerId = customerId;
      if (domain === 'retail_plus' && !email) return {message: {role: 'assistant',
        content: 'Please provide your email to verify identity before I access your profile. A customer ID alone is not verification.'}, state: next};
      if (!customerId && domain !== 'retail_plus') return {message: {role: 'assistant',
        content: 'This example supports customer lookup. Please provide your customer ID.'}, state: next};
      const callId = `lookup-${next.turn}`;
      next.customerId = customerId;
      next.pendingCallId = callId;
      return {message: {role: 'assistant', tool_calls: [{
        id: callId, name: 'lookup_customer', arguments: {customer_id: customerId || '', email: email || ''}, requestor: 'assistant',
      }]}, state: next};
    },
  };
}
