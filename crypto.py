import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def generate_key():
    return AESGCM.generate_key(bit_length=256)

def generate_nonce():
    return os.urandom(12)

def encrypt_data(data, key):
    nonce = generate_nonce()
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return ciphertext, nonce

def decrypt_data(ciphertext, key, nonce):
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)