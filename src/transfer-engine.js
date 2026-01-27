const fs = require('fs');
const path = require('path');

class TransferEngine {
    constructor(sshManager) {
        this.sshManager = sshManager;
        this.activeTransfers = new Map();
        this.cancelled = false;
    }

    /**
     * Start file transfer based on config
     * @param {Object} config - { batches: [{ files: [], targets: [{ hostId, host, path }] }] }
     * @param {Function} onProgress - Progress callback (progress object)
     * @returns {Promise<Object>} - Transfer result
     */
    async startTransfer(config, onProgress) {
        this.cancelled = false;
        const results = {
            success: true,
            completed: 0,
            failed: 0,
            total: 0,
            details: []
        };

        // Calculate total transfers
        for (const batch of config.batches) {
            results.total += batch.files.length * batch.targets.length;
        }

        let currentIndex = 0;

        // Process each batch
        for (const batch of config.batches) {
            if (this.cancelled) break;

            for (const file of batch.files) {
                if (this.cancelled) break;

                const fileName = path.basename(file);
                const fileStats = fs.statSync(file);

                for (const target of batch.targets) {
                    if (this.cancelled) break;

                    currentIndex++;
                    const transferId = `${Date.now()}-${currentIndex}`;

                    onProgress({
                        type: 'start',
                        transferId,
                        currentIndex,
                        total: results.total,
                        fileName,
                        fileSize: fileStats.size,
                        targetHost: target.host.name || target.host.ip,
                        targetPath: target.path
                    });

                    try {
                        await this.transferFile(file, target, (percent, bytesTransferred) => {
                            onProgress({
                                type: 'progress',
                                transferId,
                                currentIndex,
                                total: results.total,
                                fileName,
                                percent,
                                bytesTransferred,
                                totalBytes: fileStats.size
                            });
                        });

                        results.completed++;
                        results.details.push({
                            file: fileName,
                            target: target.host.ip,
                            path: target.path,
                            success: true
                        });

                        onProgress({
                            type: 'complete',
                            transferId,
                            currentIndex,
                            total: results.total,
                            fileName,
                            success: true
                        });

                    } catch (error) {
                        results.failed++;
                        results.success = false;
                        results.details.push({
                            file: fileName,
                            target: target.host.ip,
                            path: target.path,
                            success: false,
                            error: error.message
                        });

                        onProgress({
                            type: 'error',
                            transferId,
                            currentIndex,
                            total: results.total,
                            fileName,
                            error: error.message,
                            errorType: this.classifyError(error)
                        });
                    }
                }
            }
        }

        onProgress({
            type: 'finished',
            results
        });

        return results;
    }

    /**
     * Transfer a single file to target
     * @param {string} localPath - Local file path
     * @param {Object} target - { host, path }
     * @param {Function} onProgress - Progress callback (percent, bytesTransferred)
     */
    async transferFile(localPath, target, onProgress) {
        return new Promise(async (resolve, reject) => {
            let conn;

            try {
                conn = await this.sshManager.createConnection(target.host);
            } catch (error) {
                reject(error);
                return;
            }

            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    reject(new Error(`SFTP 初始化失敗: ${err.message}`));
                    return;
                }

                const fileName = path.basename(localPath);
                // Normalize Windows paths for remote (convert backslashes and handle drive letters)
                let remotePath = target.path;

                // Handle Windows-style paths on remote
                if (!remotePath.endsWith('/') && !remotePath.endsWith('\\')) {
                    remotePath += '/';
                }
                remotePath = remotePath + fileName;

                // Convert Windows path separators to forward slashes for SFTP
                remotePath = remotePath.replace(/\\/g, '/');

                // Handle Windows drive letter format (D:/ -> /D:/)
                if (/^[A-Za-z]:/.test(remotePath) && !remotePath.startsWith('/')) {
                    remotePath = '/' + remotePath;
                }

                const fileStats = fs.statSync(localPath);
                const readStream = fs.createReadStream(localPath);
                const writeStream = sftp.createWriteStream(remotePath);

                let bytesTransferred = 0;

                readStream.on('data', (chunk) => {
                    bytesTransferred += chunk.length;
                    const percent = Math.round((bytesTransferred / fileStats.size) * 100);
                    onProgress(percent, bytesTransferred);
                });

                readStream.on('error', (err) => {
                    conn.end();
                    reject(new Error(`讀取本地檔案失敗: ${err.message}`));
                });

                writeStream.on('error', (err) => {
                    conn.end();
                    reject(new Error(`寫入遠端檔案失敗: ${err.message}`));
                });

                writeStream.on('close', () => {
                    conn.end();
                    resolve();
                });

                readStream.pipe(writeStream);
            });
        });
    }

    /**
     * Cancel ongoing transfers
     */
    cancelTransfer() {
        this.cancelled = true;
        // Close all active connections
        for (const [id, conn] of this.activeTransfers) {
            try {
                conn.end();
            } catch (e) {
                // Ignore close errors
            }
        }
        this.activeTransfers.clear();
        return { success: true, message: '傳輸已取消' };
    }

    /**
     * Classify error for user guidance
     */
    classifyError(error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('authentication') || msg.includes('auth')) {
            return 'auth_failed';
        }
        if (msg.includes('refused') || msg.includes('econnrefused')) {
            return 'no_ssh_server';
        }
        if (msg.includes('timeout')) {
            return 'timeout';
        }
        if (msg.includes('permission') || msg.includes('access denied')) {
            return 'permission_denied';
        }
        if (msg.includes('no such file') || msg.includes('not found')) {
            return 'path_not_found';
        }
        return 'unknown';
    }
}

module.exports = { TransferEngine };
