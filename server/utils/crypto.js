const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- AES-256-GCM master key management -------------------------------------
const keyFile = path.join(__dirname, '..', '..', 'data', 'db', 'master.key');

function loadOrCreateMasterKey() {
  if (process.env.AES_MASTER_KEY && process.env.AES_MASTER_KEY.length === 64) {
    return Buffer.from(process.env.AES_MASTER_KEY, 'hex');
  }
  if (fs.existsSync(keyFile)) {
    return Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex');
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, key.toString('hex'));
  return key;
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
const rsaKeyDir = path.join(__dirname, '..', '..', 'data', 'db');
const privKeyPath = path.join(rsaKeyDir, 'signing_private.pem');
const pubKeyPath = path.join(rsaKeyDir, 'signing_public.pem');

function loadOrCreateSigningKeys() {
  if (fs.existsSync(privKeyPath) && fs.existsSync(pubKeyPath)) {
    return {
      privateKey: fs.readFileSync(privKeyPath, 'utf8'),
      publicKey: fs.readFileSync(pubKeyPath, 'utf8')
    };
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  fs.writeFileSync(privKeyPath, privateKey);
  fs.writeFileSync(pubKeyPath, publicKey);
  return { publicKey, privateKey };
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
