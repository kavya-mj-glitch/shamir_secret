document.addEventListener('DOMContentLoaded', () => {
    // -- Utility Functions --
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function buf2hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    function hex2buf(hexString) {
        const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
        return bytes.buffer;
    }

    // -- Toast Notifications --
    const toastContainer = document.getElementById('toast-container');
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconSvg = type === 'success' 
            ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
            : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        toast.innerHTML = `${iconSvg}<span class="toast-message">${message}</span>`;
        toastContainer.appendChild(toast);
        toast.offsetHeight; // reflow
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    function handleDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    }

    // -- Tab Switching --
    const tabEncrypt = document.getElementById('tab-encrypt');
    const tabDecrypt = document.getElementById('tab-decrypt');
    const panelEncrypt = document.getElementById('panel-encrypt');
    const panelDecrypt = document.getElementById('panel-decrypt');
    const indicator = document.getElementById('tab-indicator');

    function switchTab(isEncrypt) {
        if (isEncrypt) {
            tabEncrypt.classList.add('active');
            tabDecrypt.classList.remove('active');
            panelEncrypt.classList.add('active');
            panelDecrypt.classList.remove('active');
            indicator.style.transform = 'translateX(0)';
        } else {
            tabDecrypt.classList.add('active');
            tabEncrypt.classList.remove('active');
            panelDecrypt.classList.add('active');
            panelEncrypt.classList.remove('active');
            indicator.style.transform = 'translateX(100%)';
        }
    }
    tabEncrypt.addEventListener('click', () => switchTab(true));
    tabDecrypt.addEventListener('click', () => switchTab(false));

    // -- Encrypt Multi-Step Flow --
    const encFile = document.getElementById('encrypt-file');
    const btnEncNext1 = document.getElementById('btn-enc-next-1');
    const btnEncPrev2 = document.getElementById('btn-enc-prev-2');
    
    encFile.addEventListener('change', () => {
        if (encFile.files.length > 0) {
            document.getElementById('dz-encrypt-file').classList.add('has-file');
            document.getElementById('enc-filename').textContent = encFile.files[0].name;
            document.getElementById('enc-filesize').textContent = formatBytes(encFile.files[0].size);
            btnEncNext1.disabled = false;
        } else {
            document.getElementById('dz-encrypt-file').classList.remove('has-file');
            btnEncNext1.disabled = true;
        }
    });

    btnEncNext1.addEventListener('click', () => {
        document.getElementById('enc-step-1').classList.remove('active');
        document.getElementById('enc-step-2').classList.add('active');
    });
    btnEncPrev2.addEventListener('click', () => {
        document.getElementById('enc-step-2').classList.remove('active');
        document.getElementById('enc-step-1').classList.add('active');
    });

    // Encrypt Validation
    const nInput = document.getElementById('encrypt-n');
    const kInput = document.getElementById('encrypt-k');
    const valMsg = document.getElementById('encrypt-validation');
    const btnSubmitEnc = document.getElementById('btn-submit-encrypt');
    
    function validateNK() {
        const n = parseInt(nInput.value);
        const k = parseInt(kInput.value);
        if (k > n || k < 2 || n < 2) {
            valMsg.style.display = 'block';
            btnSubmitEnc.disabled = true;
            return false;
        }
        valMsg.style.display = 'none';
        btnSubmitEnc.disabled = false;
        return true;
    }
    nInput.addEventListener('input', validateNK);
    kInput.addEventListener('input', validateNK);

    // Encrypt Submit
    document.getElementById('form-encrypt').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateNK()) return;

        const file = encFile.files[0];
        if (!file) return;

        btnSubmitEnc.classList.add('loading');
        btnSubmitEnc.disabled = true;

        const n = parseInt(nInput.value);
        const k = parseInt(kInput.value);

        try {
            // 1. Generate AES-GCM 256-bit key
            const key = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            // 2. Export key to Raw buffer and convert to Hex
            const exportedKey = await window.crypto.subtle.exportKey("raw", key);
            const keyHex = buf2hex(exportedKey);

            // 3. Generate IV (12 bytes for AES-GCM)
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // 4. Read file and Encrypt
            const fileBuffer = await file.arrayBuffer();
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                fileBuffer
            );

            // 5. Combine IV + Ciphertext
            const combinedFile = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combinedFile.set(iv, 0);
            combinedFile.set(new Uint8Array(encryptedBuffer), iv.length);

            // 6. Split Key using Shamir's Secret Sharing
            const shares = secrets.share(keyHex, n, k);

            // 7. Create ZIP Package
            const zip = new JSZip();
            zip.file(`${file.name}.enc`, combinedFile);
            
            shares.forEach((shareStr, idx) => {
                zip.file(`share_${idx + 1}.txt`, shareStr);
            });

            const zipBlob = await zip.generateAsync({ type: "blob" });

            // 8. Trigger Download
            handleDownload(zipBlob, `shardsafe_package_${Date.now()}.zip`);
            showToast('File encrypted successfully!');
            
            // Move to success step
            document.getElementById('success-n-count').textContent = n;
            document.getElementById('enc-step-2').classList.remove('active');
            document.getElementById('enc-step-3').classList.add('active');

        } catch (error) {
            console.error("Encryption error:", error);
            showToast(error.message || 'Encryption failed', 'error');
        } finally {
            btnSubmitEnc.classList.remove('loading');
            btnSubmitEnc.disabled = false;
        }
    });

    // -- Decrypt Flow --
    const decZip = document.getElementById('decrypt-zip');
    const decFile = document.getElementById('decrypt-file');
    const decShares = document.getElementById('decrypt-shares');
    const btnSubmitDec = document.getElementById('btn-submit-decrypt');
    let decryptMode = 'zip'; // 'zip' or 'files'

    const toggleZip = document.getElementById('toggle-zip');
    const toggleFiles = document.getElementById('toggle-files');
    const modeZip = document.getElementById('decrypt-mode-zip');
    const modeFiles = document.getElementById('decrypt-mode-files');

    toggleZip.addEventListener('click', () => {
        decryptMode = 'zip';
        toggleZip.classList.add('active');
        toggleFiles.classList.remove('active');
        modeZip.style.display = 'block';
        modeFiles.style.display = 'none';
        decFile.removeAttribute('required');
        decShares.removeAttribute('required');
        decZip.setAttribute('required', 'true');
        checkDecryptReady();
    });

    toggleFiles.addEventListener('click', () => {
        decryptMode = 'files';
        toggleFiles.classList.add('active');
        toggleZip.classList.remove('active');
        modeFiles.style.display = 'block';
        modeZip.style.display = 'none';
        decZip.removeAttribute('required');
        decFile.setAttribute('required', 'true');
        decShares.setAttribute('required', 'true');
        checkDecryptReady();
    });

    function checkDecryptReady() {
        if (decryptMode === 'zip') {
            btnSubmitDec.disabled = (decZip.files.length === 0);
        } else {
            btnSubmitDec.disabled = !(decFile.files.length > 0 && decShares.files.length >= 2);
        }
    }

    decZip.addEventListener('change', () => {
        if (decZip.files.length > 0) {
            document.getElementById('dz-decrypt-zip').classList.add('has-file');
            document.getElementById('dec-zip-filename').textContent = decZip.files[0].name;
            document.getElementById('dec-zip-filesize').textContent = formatBytes(decZip.files[0].size);
        } else {
            document.getElementById('dz-decrypt-zip').classList.remove('has-file');
        }
        checkDecryptReady();
    });

    decFile.addEventListener('change', () => {
        if (decFile.files.length > 0) {
            document.getElementById('dz-decrypt-file').classList.add('has-file');
            document.getElementById('dec-filename').textContent = decFile.files[0].name;
            document.getElementById('dec-filesize').textContent = formatBytes(decFile.files[0].size);
        } else {
            document.getElementById('dz-decrypt-file').classList.remove('has-file');
        }
        checkDecryptReady();
    });

    decShares.addEventListener('change', () => {
        const list = document.getElementById('dec-shares-list');
        list.innerHTML = '';
        if (decShares.files.length > 0) {
            document.getElementById('dz-decrypt-shares').classList.add('has-file');
            
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `
                <div class="file-chip-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg></div>
                <div class="file-chip-details">
                    <div class="file-chip-name">${decShares.files.length} share files selected</div>
                    <div class="file-chip-size">Ready for decryption</div>
                </div>
            `;
            list.appendChild(chip);
        } else {
            document.getElementById('dz-decrypt-shares').classList.remove('has-file');
        }
        checkDecryptReady();
    });

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    // Decrypt Submit
    document.getElementById('form-decrypt').addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSubmitDec.classList.add('loading');
        btnSubmitDec.disabled = true;

        try {
            let encArrayBuffer = null;
            let sharesArray = [];
            let originalFilename = "decrypted_file";

            if (decryptMode === 'zip') {
                const zipFile = decZip.files[0];
                if (!zipFile) throw new Error("Please select a ZIP file");

                const zip = await JSZip.loadAsync(zipFile);
                
                // Find .enc file
                const encFiles = Object.keys(zip.files).filter(name => name.endsWith('.enc'));
                if (encFiles.length === 0) throw new Error("No .enc file found in ZIP");
                originalFilename = encFiles[0].replace('.enc', '');
                encArrayBuffer = await zip.files[encFiles[0]].async("arraybuffer");

                // Find share files
                const shareFiles = Object.keys(zip.files).filter(name => name.startsWith('share_') && name.endsWith('.txt'));
                if (shareFiles.length < 2) throw new Error("Not enough share files found in ZIP (minimum 2)");
                
                for (let filename of shareFiles) {
                    const text = await zip.files[filename].async("text");
                    sharesArray.push(text.trim());
                }

            } else {
                const encFileObj = decFile.files[0];
                if (!encFileObj) throw new Error("Please select an .enc file");
                originalFilename = encFileObj.name.replace('.enc', '');
                encArrayBuffer = await encFileObj.arrayBuffer();

                for (let i = 0; i < decShares.files.length; i++) {
                    const text = await readFileAsText(decShares.files[i]);
                    sharesArray.push(text.trim());
                }
            }

            // Reconstruct Key
            const reconstructedHex = secrets.combine(sharesArray);
            if (!reconstructedHex) throw new Error("Failed to reconstruct key. Shares might be invalid.");
            
            const keyBuffer = hex2buf(reconstructedHex);
            
            const key = await window.crypto.subtle.importKey(
                "raw",
                keyBuffer,
                "AES-GCM",
                true,
                ["encrypt", "decrypt"]
            );

            // Extract IV and Ciphertext
            const combinedFile = new Uint8Array(encArrayBuffer);
            const iv = combinedFile.slice(0, 12);
            const ciphertext = combinedFile.slice(12);

            // Decrypt
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );

            // Trigger Download
            const decryptedBlob = new Blob([decryptedBuffer]);
            handleDownload(decryptedBlob, originalFilename);
            showToast('File decrypted successfully!');
            
            document.getElementById('form-decrypt').reset();
            document.getElementById('dz-decrypt-zip').classList.remove('has-file');
            document.getElementById('dz-decrypt-file').classList.remove('has-file');
            document.getElementById('dz-decrypt-shares').classList.remove('has-file');
            checkDecryptReady();

        } catch (error) {
            console.error("Decryption error:", error);
            showToast(error.message || 'Decryption failed', 'error');
        } finally {
            btnSubmitDec.classList.remove('loading');
            checkDecryptReady();
        }
    });

    // Prevent default drag behaviors for dropzones
    document.querySelectorAll('.dropzone').forEach(dz => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dz.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => {
            dz.addEventListener(eventName, () => dz.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dz.addEventListener(eventName, () => dz.classList.remove('dragover'), false);
        });
        dz.addEventListener('drop', (e) => {
            const input = dz.querySelector('input[type="file"]');
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
});
