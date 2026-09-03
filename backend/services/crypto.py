import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()

# Generate or read 256-bit encryption key
_RAW_KEY = os.getenv("ENCRYPTION_KEY", "docuguard-secret-encryption-key-32-bytes!!")
_KEY = hashlib.sha256(_RAW_KEY.encode('utf-8')).digest()

def sha256_buffer(data: bytes) -> str:
    """Computes hexadecimal SHA-256 hash of a byte buffer."""
    return hashlib.sha256(data).hexdigest()

def encrypt_buffer(data: bytes) -> bytes:
    """
    Encrypts byte buffer with AES-256-GCM.
    Returns nonce (12 bytes) + ciphertext + tag.
    """
    aesgcm = AESGCM(_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext

def decrypt_buffer(encrypted_data: bytes) -> bytes:
    """
    Decrypts AES-256-GCM encrypted byte buffer.
    """
    aesgcm = AESGCM(_KEY)
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)
