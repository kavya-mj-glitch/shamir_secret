from crypto import generate_key, encrypt_data, decrypt_data

key = generate_key()

message = b"Hello ShardSafe!"

ciphertext, nonce = encrypt_data(message, key)

print("Encrypted:", ciphertext)

plaintext = decrypt_data(ciphertext, key, nonce)

print("Decrypted:", plaintext.decode())