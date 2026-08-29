export function generateAppleClientSecret(input: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyBase64: string;
  now?: number;
}): Promise<string>;
