const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- AES-256-GCM master key management -------------------------------------
// On Vercel (read-only fs), AES_MASTER_KEY env var MUST be set.
// Locally, falls back to a file in data/db/master.key (auto-created).

function loadOrCreateMasterKey() {
  // 1. Prefer env var (required on Vercel / any read-only host)
  if (process.env.AES_MASTER_KEY && process.env.AES_MASTER_KEY.length === 64) {
    return Buffer.from(process.env.AES_MASTER_KEY, 'hex');
  }
  // 2. Try reading from file (local dev only)
  const keyFile = path.join(__dirname, '..', '..', 'data', 'db', 'master.key');
  try {
    if (fs.existsSync(keyFile)) {
      return Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex');
    }
    // 3. Create new key and save to file (local dev only)
    const key = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    fs.writeFileSync(keyFile, key.toString('hex'));
    return key;
  } catch {
    // 4. Vercel / read-only: generate an in-memory key (ephemeral, fine for sessions)
    console.warn('[crypto] No AES_MASTER_KEY env var and filesystem is read-only — using ephemeral key. Set AES_MASTER_KEY in Vercel env vars for persistence.');
    return crypto.randomBytes(32);
  }
}

const MASTER_KEY = loadOrCreateMasterKey();

/** Encrypt a buffer with AES-256-GCM. Returns a single buffer: [iv(12)][authTag(16)][ciphertext]. */
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** Decrypt a buffer produced by encryptBuffer. */
function decryptBuffer(payload) {
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function sha256(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

// --- RSA keypair for digital signature verification demo -------------------
// On Vercel, use RSA_PRIVATE_KEY / RSA_PUBLIC_KEY env vars (PEM strings).
// Locally, falls back to files in data/db/.

function loadOrCreateSigningKeys() {
  // 1. Prefer env vars (Vercel / production)
  if (process.env.RSA_PRIVATE_KEY && process.env.RSA_PUBLIC_KEY) {
    return {
      privateKey: process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: process.env.RSA_PUBLIC_KEY.replace(/\\n/g, '\n')
    };
  }

  // 2. Try reading from files (local dev)
  const rsaKeyDir = path.join(__dirname, '..', '..', 'data', 'db');
  const privKeyPath = path.join(rsaKeyDir, 'signing_private.pem');
  const pubKeyPath = path.join(rsaKeyDir, 'signing_public.pem');

  try {
    if (fs.existsSync(privKeyPath) && fs.existsSync(pubKeyPath)) {
      return {
        privateKey: fs.readFileSync(privKeyPath, 'utf8'),
        publicKey: fs.readFileSync(pubKeyPath, 'utf8')
      };
    }
    // 3. Generate and save locally
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    fs.mkdirSync(rsaKeyDir, { recursive: true });
    fs.writeFileSync(privKeyPath, privateKey);
    fs.writeFileSync(pubKeyPath, publicKey);
    return { publicKey, privateKey };
  } catch {
    // 4. Vercel / read-only: generate ephemeral keys
    console.warn('[crypto] Filesystem read-only — generating ephemeral RSA keys. Set RSA_PRIVATE_KEY and RSA_PUBLIC_KEY in Vercel env vars for persistence.');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }
}

const SIGNING_KEYS = loadOrCreateSigningKeys();

function signData(data) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(SIGNING_KEYS.privateKey, 'base64');
}

function verifySignature(data, signature) {
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(data);
  verifier.end();
  try {
    return verifier.verify(SIGNING_KEYS.publicKey, signature, 'base64');
  } catch (e) {
    return false;
  }
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  encryptBuffer,
  decryptBuffer,
  sha256,
  signData,
  verifySignature,
  randomToken,
  publicSigningKey: SIGNING_KEYS.publicKey
};
