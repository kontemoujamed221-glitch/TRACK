const encoder = new TextEncoder();

async function getCryptoKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Safe base64url encoding
  const encodeBase64Url = (str: string) => {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const headerBase64 = encodeBase64Url(JSON.stringify(header));
  const payloadBase64 = encodeBase64Url(JSON.stringify(payload));
  const tokenData = `${headerBase64}.${payloadBase64}`;
  
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(tokenData)
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBinaryStr = signatureArray.map(b => String.fromCharCode(b)).join('');
  const signatureBase64 = btoa(signatureBinaryStr)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${tokenData}.${signatureBase64}`;
}

export async function verifyToken(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerBase64, payloadBase64, signatureBase64] = parts;
    const tokenData = `${headerBase64}.${payloadBase64}`;
    
    const key = await getCryptoKey(secret);
    
    const signatureStr = atob(signatureBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const signatureBytes = new Uint8Array(
      signatureStr.split('').map((char) => char.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(tokenData)
    );
    
    if (!isValid) return null;
    
    const payloadStr = decodeURIComponent(
      escape(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
    );
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
