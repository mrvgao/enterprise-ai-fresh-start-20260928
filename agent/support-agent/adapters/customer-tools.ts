/** Tool registration is separate from HTTP transport and agent decisions. */
import type {AgentContext} from '../../contract.ts';
import {readCustomer, verifyAndReadCustomer} from './customer-api.ts';
import {domain} from '../config.ts';

export function createTools(context: AgentContext) {
  return [{
    type: 'read',
    schema: {type: 'function', function: {
      name: 'lookup_customer', description: 'Read a customer; retail requires independent email verification before details.',
      parameters: {type: 'object', properties: {customer_id: {type: 'string'}, email: {type: 'string'}},
        required: ['customer_id'], additionalProperties: false},
    }},
    async execute({customer_id, email = ''}: {customer_id: string; email?: string}) {
      if (domain === 'retail_plus') return verifyAndReadCustomer(context.clientApi, customer_id, email);
      return readCustomer(context.clientApi, customer_id);
    },
  }];
}
