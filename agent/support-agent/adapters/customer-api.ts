/** Uses only the injected business API; no external endpoints or keys. */
import type {AgentContext} from '../../contract.ts';

export async function verifyAndReadCustomer(clientApi: AgentContext['clientApi'], customerId: string, email: string) {
  if (typeof email !== 'string' || !email.trim()) throw Error('Provide email to verify identity; customer ID alone is insufficient');
  const response = await clientApi.request('POST', '/v1/customers/search', {body: {email}});
  response.raiseForStatus();
  const found = (response.body as {customer_id?: unknown} | null)?.customer_id;
  if (typeof found !== 'string' || !found || (customerId && found !== customerId)) {
    throw Error('Identity verification failed; no customer details were loaded');
  }
  return readCustomer(clientApi, found);
}

export async function readCustomer(clientApi: AgentContext['clientApi'], customerId: string) {
  if (typeof customerId !== 'string' || !customerId.trim()) throw new Error('customer_id is required');
  const response = await clientApi.request('GET', `/v1/customers/${encodeURIComponent(customerId)}`);
  response.raiseForStatus();
  if (!response.body || typeof response.body !== 'object' || Array.isArray(response.body)) {
    throw new Error('Expected a customer object');
  }
  return response.body;
}
