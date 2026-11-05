declare module "mammoth" {
  export function extractRawText(input: {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
  }): Promise<{ value: string; messages: unknown[] }>;
}
