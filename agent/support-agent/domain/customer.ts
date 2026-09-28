/** Pure business rules; no platform, network, or model dependency. */
export function findCustomerId(text: string): string | null {
  return text.match(/\b(?:developer_(?:traveler|pending|delivered)_\d+|customer_[A-Za-z0-9_-]+)\b/)?.[0] ?? null;
}
export function findEmail(text: string): string | null {
  return text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? null;
}
export function customerReply(content: string, error = false): string {
  if (error) return 'I could not find that customer. Please check the customer ID.';
  let customer: unknown;
  try {customer = JSON.parse(content);} catch {
    return 'The customer service returned an invalid response. Please try again.';
  }
  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    return 'The customer service returned an invalid response. Please try again.';
  }
  const email = (customer as {email?: unknown}).email;
  return typeof email === 'string' && email.trim()
    ? `The customer email is ${email}.`
    : 'The customer record has no email address available.';
}
