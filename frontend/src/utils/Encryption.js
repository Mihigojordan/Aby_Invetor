// utils/encryption.js

const secretKeyHex = import.meta.env.VITE_SECRET_KEY; // your 64-byte hex key

// Convert first 32 bytes of hex to Uint8Array for AES-256
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

const secretKey = hexToBytes(secretKeyHex.slice(0, 64)); // 32 bytes


// Helper: generate random IV
function generateIV() {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Encrypt
export async function encrypt(text) {
  const iv = generateIV();
  const key = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encodedText = new TextEncoder().encode(text);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encodedText
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  // Combine IV + ciphertext and convert to hex string
  const combined = [...iv, ...encryptedArray].map(b => b.toString(16).padStart(2, "0")).join("");
  return combined;
}

// Decrypt
export async function decrypt(encryptedHex) {
  const combined = hexToBytes(encryptedHex);
  const iv = combined.slice(0, 16);
  const data = combined.slice(16);

  const key = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedBuffer);
}
