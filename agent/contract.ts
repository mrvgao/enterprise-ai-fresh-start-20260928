/** Types only. Runtime capabilities are injected, never provider keys. */
export type Message = {
  id?: string; role: string; content?: string | null; error?: boolean;
  tool_messages?: Message[]; tool_calls?: object[];
};
export type AgentContext = {
  tools: object[];
  clientApi: {
    context: {conversation_id: string} | null;
    request(method: string, path: string, options?: {query?: object; body?: unknown; headers?: Record<string, string>}): Promise<{
      status_code: number; body: unknown; headers: Record<string, string>; raiseForStatus(): void;
    }>;
  };
  modelGateway: {
    availableModels: string[];
    generate(options: {messages: Message[]; model?: string; tools?: object[]; [key: string]: unknown}): Promise<Message>;
  };
};
