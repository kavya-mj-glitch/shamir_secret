# ShardSafe 🛡️ (100% Client-Side Version)

ShardSafe is a military-grade file encryption tool featuring a zero-knowledge architecture and **Shamir's Secret Sharing**. This specific branch is a **100% Client-Side** rewrite, meaning all encryption and decryption happens directly in your browser.

🎉 **[Try the Live Demo Here!](https://kavya-mj-glitch.github.io/shamir_secret/)** 🎉

![ShardSafe Frontend](https://img.shields.io/badge/UI-Glassmorphism-6366f1?style=flat-square)
![JavaScript](https://img.shields.io/badge/Logic-Vanilla%20JS-yellow?style=flat-square)
![Zero Knowledge](https://img.shields.io/badge/Security-Zero%20Knowledge-success?style=flat-square)
![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM-red?style=flat-square)

## ✨ Key Features

- **Advanced Cryptography**: Uses AES-256-GCM for authenticated, military-grade file encryption.
- **Distributed Key Management**: Leverages Shamir's Secret Sharing to split your encryption key into `N` shares, requiring only `K` shares to reconstruct the key and decrypt the file.
- **Zero-Knowledge Architecture**: The server performs operations completely in-memory using Python's `tempfile` and `io.BytesIO`. Keys and plaintext data are never written to disk.
- **Premium User Experience**: A stunning, modern Single-Page Application (SPA) built with Vanilla JS/CSS featuring glassmorphism, animated gradients, and seamless drag-and-drop file handling.
- **Smart ZIP Packaging**: Encrypted files and all generated key shares are automatically bundled into a single `.zip` download.
- **One-Click Decrypt**: Easily reconstruct your file by dragging and dropping the generated `.zip` package back into the app, or manually upload the `.enc` file alongside the necessary share files.

## 🚀 Getting Started

Since this is the static, client-side version of ShardSafe, you can try it instantly without downloading anything:

👉 **[Launch Live Demo](https://kavya-mj-glitch.github.io/shamir_secret/)**

### Local Development (Optional)

If you'd like to run it locally, no backend server is needed. Simply serve the files statically:

1. **Clone the repository**
   ```bash
   git clone git@github.com:kavya-mj-glitch/shamir_secret.git
   cd shamir_secret
   git checkout gh-pages-demo
   ```

2. **Run a static server**
   ```bash
   python3 -m http.server 8080
   ```
   The application will be available at [http://localhost:8080](http://localhost:8080).

## 💡 How It Works

### Encrypt Flow
1. **Upload**: Drag and drop any file up to 50MB.
2. **Configure**: Choose the total number of shares (`N`) to generate, and the threshold of shares (`K`) required to decrypt.
3. **Download**: ShardSafe encrypts the file, splits the key, and provides a `.zip` package containing your `.enc` file and the generated `share_X.txt` files.

### Decrypt Flow
1. **Upload ZIP**: Drop the complete `.zip` package into the decrypt tab. ShardSafe will automatically extract the encrypted file and use the shares to decrypt it.
2. **Manual Upload (Alternative)**: Switch the toggle to upload the `.enc` file individually, along with at least `K` of the `share_X.txt` files.

## 🔒 Security Notice

This tool is designed for educational and practical cryptographic purposes. It relies on the robust `cryptography` and `shamirs` Python libraries. Always store your key shares securely and physically distribute them if maximum security is required.
