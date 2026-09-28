/** Serializable, per-conversation state. No module-global session memory. */
export type SessionState = {
  turn: number;
  pendingCallId: string | null;
  customerId: string | null;
};
export function initialState(): SessionState {
  return {turn: 0, pendingCallId: null, customerId: null};
}
