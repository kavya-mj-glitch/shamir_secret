import os
import io
import zipfile
import tempfile
import logging
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file, render_template

from crypto import generate_key, encrypt_data, decrypt_data
from shamir_utils import split_key, recover_key

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "ok", "version": "2.0.0"})

@app.route('/encrypt', methods=['POST'])
def encrypt_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        n = int(request.form.get('n', 5))
        k = int(request.form.get('k', 3))
    except ValueError:
        return jsonify({"error": "Invalid share numbers"}), 400

    if k > n or k < 2:
        return jsonify({"error": "Invalid share configuration: K must be >= 2 and <= N"}), 400

    temp_fd = None
    temp_path = None
    try:
        temp_fd, temp_path = tempfile.mkstemp()
        with os.fdopen(temp_fd, 'wb') as f:
            file.save(f)
            
        with open(temp_path, 'rb') as f:
            file_data = f.read()
        
        # Generate key
        key = generate_key()
        
        # Encrypt: encrypt_data(data, key) returns (ciphertext, nonce)
        ciphertext, nonce = encrypt_data(file_data, key)
        
        # Split key: split_key(aes_key, num_shares, threshold)
        shares = split_key(key, n, k)
        
        # Prepare ZIP in memory
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Write .enc file (nonce + ciphertext)
            enc_filename = f"{secure_filename(file.filename)}.enc"
            zf.writestr(enc_filename, nonce + ciphertext)
            
            # Write shares
            for i, share in enumerate(shares):
                zf.writestr(f"share_{i+1}.txt", share)
        
        memory_file.seek(0)
        logger.info(f"Successfully encrypted file: {file.filename}")
        
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='encrypted_and_shares.zip'
        )

    except Exception as e:
        logger.error(f"Encryption failed: {str(e)}")
        return jsonify({"error": "Encryption failed"}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Failed to clean up temp file {temp_path}: {e}")

@app.route('/decrypt', methods=['POST'])
def decrypt_route():
    temp_fd = None
    temp_path = None
    original_filename = "decrypted_file"

    try:
        if 'zip_file' in request.files and request.files['zip_file'].filename != '':
            zip_file = request.files['zip_file']
            
            # Save uploaded zip file to temp
            temp_fd, temp_path = tempfile.mkstemp()
            with os.fdopen(temp_fd, 'wb') as f:
                zip_file.save(f)
                
            shares = []
            data = None
            
            with zipfile.ZipFile(temp_path, 'r') as zf:
                for name in zf.namelist():
                    if name.endswith('.enc'):
                        data = zf.read(name)
                        original_filename = name[:-4] if name.endswith('.enc') else f"decrypted_{name}"
                    elif name.startswith('share_') and name.endswith('.txt'):
                        shares.append(zf.read(name).decode('utf-8'))
                        
            if data is None:
                return jsonify({"error": "Invalid ZIP: No .enc file found"}), 400
            if len(shares) < 2:
                return jsonify({"error": "Invalid ZIP: Not enough share files found"}), 400

        else:
            if 'file' not in request.files:
                return jsonify({"error": "No file part"}), 400
                
            enc_file = request.files['file']
            if enc_file.filename == '':
                return jsonify({"error": "No selected file"}), 400

            shares_files = request.files.getlist('shares')
            if not shares_files or len(shares_files) < 2:
                return jsonify({"error": "Not enough shares provided"}), 400

            # Save uploaded enc file to temp
            temp_fd, temp_path = tempfile.mkstemp()
            with os.fdopen(temp_fd, 'wb') as f:
                enc_file.save(f)
                
            with open(temp_path, 'rb') as f:
                data = f.read()
                
            shares = []
            for share_file in shares_files:
                if share_file.filename != '':
                    shares.append(share_file.read().decode('utf-8'))
                    
            if not shares:
                return jsonify({"error": "No valid share files"}), 400
                
            original_filename = enc_file.filename
            if original_filename.endswith('.enc'):
                original_filename = original_filename[:-4]
            else:
                original_filename = f"decrypted_{original_filename}"

        if len(data) < 12:
            return jsonify({"error": "Invalid encrypted file: too short"}), 400
            
        nonce = data[:12]
        ciphertext = data[12:]
        
        # Recover key
        try:
            key = recover_key(shares)
        except Exception as e:
            return jsonify({"error": "Key recovery failed. Invalid or insufficient shares."}), 400
            
        # Decrypt: decrypt_data(ciphertext, key, nonce)
        try:
            decrypted_data = decrypt_data(ciphertext, key, nonce)
        except Exception as e:
            if e.__class__.__name__ == 'InvalidTag':
                return jsonify({"error": "Decryption failed: Integrity check failed. Incorrect key or corrupted data."}), 400
            return jsonify({"error": f"Decryption failed: {str(e)}"}), 400
            
            

        memory_file = io.BytesIO(decrypted_data)
        logger.info(f"Successfully decrypted file: {original_filename}")
        
        return send_file(
            memory_file,
            as_attachment=True,
            download_name=original_filename
        )
        
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        if e.__class__.__name__ == 'InvalidTag':
            return jsonify({"error": "Decryption failed: Integrity check failed. Incorrect key or corrupted data."}), 400
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Failed to clean up temp file {temp_path}: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
