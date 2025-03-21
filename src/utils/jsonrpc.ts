export function createJsonRpcMessage(method: string, params: any, id: number): string {
  const jsonRpcMessage = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };

  return JSON.stringify(jsonRpcMessage);
} 