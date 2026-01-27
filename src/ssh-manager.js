const { Client } = require('ssh2');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SSHManager {
    constructor() {
        this.sshDir = path.join(os.homedir(), '.ssh');
        this.privateKeyPath = path.join(this.sshDir, 'id_rsa');
        this.publicKeyPath = path.join(this.sshDir, 'id_rsa.pub');
    }

    /**
     * Test SSH connection to a remote host
     * @param {Object} host - { ip, user, port }
     * @returns {Promise<Object>} - { success, message, needsSetup }
     */
    async testConnection(host) {
        return new Promise((resolve) => {
            const conn = new Client();
            let resolved = false;

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    conn.end();
                    resolve({
                        success: false,
                        message: '連線逾時 (10秒)',
                        needsSetup: true,
                        errorType: 'timeout'
                    });
                }
            }, 10000);

            conn.on('ready', () => {
                clearTimeout(timeout);
                if (!resolved) {
                    resolved = true;
                    conn.end();
                    resolve({
                        success: true,
                        message: 'SSH 連線成功！',
                        needsSetup: false
                    });
                }
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                if (!resolved) {
                    resolved = true;
                    let message = err.message;
                    let needsSetup = false;
                    let errorType = 'unknown';

                    if (err.code === 'ECONNREFUSED') {
                        message = '連線被拒絕 - 遠端電腦可能未安裝或啟動 OpenSSH Server';
                        needsSetup = true;
                        errorType = 'no_ssh_server';
                    } else if (err.code === 'ENOTFOUND' || err.code === 'EHOSTUNREACH') {
                        message = '找不到主機 - 請確認 IP 位址是否正確';
                        errorType = 'host_not_found';
                    } else if (err.level === 'client-authentication') {
                        message = '認證失敗 - 請設定 SSH 金鑰或檢查使用者名稱';
                        needsSetup = true;
                        errorType = 'auth_failed';
                    } else if (err.code === 'ETIMEDOUT') {
                        message = '連線逾時 - 請確認網路連接及防火牆設定';
                        errorType = 'timeout';
                    }

                    resolve({
                        success: false,
                        message,
                        needsSetup,
                        errorType,
                        rawError: err.message
                    });
                }
            });

            // Try to connect with key-based auth first, then fall back
            const connectConfig = {
                host: host.ip,
                port: host.port || 22,
                username: host.user,
                readyTimeout: 10000,
                keepaliveInterval: 0
            };

            // Try to use SSH key if available
            if (fs.existsSync(this.privateKeyPath)) {
                try {
                    connectConfig.privateKey = fs.readFileSync(this.privateKeyPath);
                } catch (e) {
                    // Key read failed, continue without it
                }
            }

            // If no key, we'll fail auth but that's expected and handled
            conn.connect(connectConfig);
        });
    }

    /**
     * Generate SSH key pair
     * @returns {Promise<Object>} - { success, message, publicKeyPath }
     */
    async generateKey() {
        return new Promise((resolve) => {
            // Check if key already exists
            if (fs.existsSync(this.privateKeyPath)) {
                resolve({
                    success: true,
                    message: 'SSH 金鑰已存在',
                    publicKeyPath: this.publicKeyPath,
                    alreadyExists: true
                });
                return;
            }

            // Ensure .ssh directory exists
            if (!fs.existsSync(this.sshDir)) {
                fs.mkdirSync(this.sshDir, { recursive: true, mode: 0o700 });
            }

            // Generate key using ssh-keygen with proper Windows syntax
            // Use echo | to provide empty passphrase on Windows
            const command = `echo y | ssh-keygen -t rsa -b 4096 -f "${this.privateKeyPath}" -q -P ""`;

            exec(command, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
                if (error) {
                    // Try alternative method if first one fails
                    const altCommand = `ssh-keygen -t rsa -b 4096 -f "${this.privateKeyPath}" -q -N """"`;
                    exec(altCommand, { shell: 'cmd.exe' }, (err2, stdout2, stderr2) => {
                        if (err2) {
                            resolve({
                                success: false,
                                message: `金鑰生成失敗: ${err2.message}\n${stderr2}`,
                                rawError: stderr2
                            });
                        } else {
                            resolve({
                                success: true,
                                message: 'SSH 金鑰生成成功！',
                                publicKeyPath: this.publicKeyPath,
                                alreadyExists: false
                            });
                        }
                    });
                    return;
                }

                resolve({
                    success: true,
                    message: 'SSH 金鑰生成成功！',
                    publicKeyPath: this.publicKeyPath,
                    alreadyExists: false
                });
            });
        });
    }

    /**
     * Get public key content for deployment
     * @returns {Promise<Object>} - { success, content }
     */
    async getPublicKey() {
        try {
            if (!fs.existsSync(this.publicKeyPath)) {
                return {
                    success: false,
                    message: 'SSH 公鑰不存在，請先生成金鑰',
                    content: null
                };
            }

            const content = fs.readFileSync(this.publicKeyPath, 'utf8').trim();
            return {
                success: true,
                content,
                path: this.publicKeyPath
            };
        } catch (error) {
            return {
                success: false,
                message: `讀取公鑰失敗: ${error.message}`,
                content: null
            };
        }
    }

    /**
     * Check if SSH key exists
     * @returns {boolean}
     */
    hasKey() {
        return fs.existsSync(this.privateKeyPath);
    }

    /**
     * Create SSH connection for file transfer
     * @param {Object} host - { ip, user, port }
     * @returns {Promise<Client>}
     */
    createConnection(host) {
        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                resolve(conn);
            });

            conn.on('error', (err) => {
                reject(err);
            });

            const connectConfig = {
                host: host.ip,
                port: host.port || 22,
                username: host.user,
                readyTimeout: 30000
            };

            if (fs.existsSync(this.privateKeyPath)) {
                try {
                    connectConfig.privateKey = fs.readFileSync(this.privateKeyPath);
                } catch (e) {
                    reject(new Error('無法讀取 SSH 金鑰'));
                    return;
                }
            } else {
                reject(new Error('SSH 金鑰不存在，請先生成並部署金鑰'));
                return;
            }

            conn.connect(connectConfig);
        });
    }
}

module.exports = { SSHManager };
