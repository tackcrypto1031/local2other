// ============================================
// Local2Other - SSH File Transfer Tool
// Renderer Process (UI Logic)
// ============================================

class Local2Other {
    constructor() {
        this.hosts = [];
        this.batches = [];
        this.batchIdCounter = 0;
        this.isTransferring = false;

        this.init();
    }

    async init() {
        // Load saved hosts
        this.hosts = await window.api.getHosts() || [];

        // Initialize UI
        this.bindEvents();
        this.renderHosts();
        this.updateTransferButton();
    }

    // ============================================
    // Event Bindings
    // ============================================
    bindEvents() {
        // Host management
        document.getElementById('addHostBtn').addEventListener('click', () => this.openHostModal());
        document.getElementById('closeHostModal').addEventListener('click', () => this.closeHostModal());
        document.getElementById('cancelHostBtn').addEventListener('click', () => this.closeHostModal());
        document.getElementById('saveHostBtn').addEventListener('click', () => this.saveHost());
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('hostModal').addEventListener('click', (e) => {
            if (e.target.id === 'hostModal') this.closeHostModal();
        });

        // Batch management
        document.getElementById('addBatchBtn').addEventListener('click', () => this.addBatch());

        // Transfer
        document.getElementById('startTransferBtn').addEventListener('click', () => this.startTransfer());
        document.getElementById('cancelTransferBtn').addEventListener('click', () => this.cancelTransfer());

        // SSH Guide
        document.getElementById('sshGuideBtn').addEventListener('click', () => this.openSshGuide());
        document.getElementById('closeSshGuide').addEventListener('click', () => this.closeSshGuide());
        document.getElementById('sshGuideModal').addEventListener('click', (e) => {
            if (e.target.id === 'sshGuideModal') this.closeSshGuide();
        });

        // Guide tabs
        document.querySelectorAll('.guide-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchGuideTab(tab.dataset.tab));
        });

        // Generate key button
        document.getElementById('generateKeyBtn').addEventListener('click', () => this.generateSshKey());

        // Copy buttons
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => this.copyToClipboard(btn));
        });

        // Transfer progress listener
        window.api.onTransferProgress((progress) => this.handleTransferProgress(progress));
    }

    // ============================================
    // Host Management
    // ============================================
    renderHosts() {
        const hostList = document.getElementById('hostList');
        const emptyState = document.getElementById('emptyHostState');

        if (this.hosts.length === 0) {
            emptyState.classList.remove('hidden');
            hostList.innerHTML = '';
            hostList.appendChild(emptyState);
            return;
        }

        emptyState.classList.add('hidden');

        const hostsHtml = this.hosts.map(host => `
      <div class="host-card" data-host-id="${host.id}">
        <div class="host-name">
          <span class="status-dot ${host.status || ''}"></span>
          ${this.escapeHtml(host.name)}
        </div>
        <div class="host-ip">${this.escapeHtml(host.ip)}:${host.port || 22}</div>
        <div class="host-path">📁 ${this.escapeHtml(host.defaultPath)}</div>
        <div class="host-actions">
          <button class="btn-icon btn-edit-host" title="編輯">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon btn-delete-host" title="刪除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

        hostList.innerHTML = hostsHtml;

        // Bind host card events
        hostList.querySelectorAll('.btn-edit-host').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hostId = parseInt(btn.closest('.host-card').dataset.hostId);
                this.openHostModal(hostId);
            });
        });

        hostList.querySelectorAll('.btn-delete-host').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hostId = parseInt(btn.closest('.host-card').dataset.hostId);
                this.deleteHost(hostId);
            });
        });

        // Update batch host targets
        this.updateAllBatchTargets();
    }

    openHostModal(hostId = null) {
        const modal = document.getElementById('hostModal');
        const title = document.getElementById('hostModalTitle');
        const form = document.getElementById('hostForm');
        const status = document.getElementById('connectionStatus');

        form.reset();
        status.textContent = '';
        status.className = 'connection-status';

        if (hostId) {
            const host = this.hosts.find(h => h.id === hostId);
            if (host) {
                title.textContent = '編輯遠端主機';
                document.getElementById('hostId').value = host.id;
                document.getElementById('hostName').value = host.name;
                document.getElementById('hostIP').value = host.ip;
                document.getElementById('hostPort').value = host.port || 22;
                document.getElementById('hostUser').value = host.user;
                document.getElementById('hostDefaultPath').value = host.defaultPath;
            }
        } else {
            title.textContent = '新增遠端主機';
            document.getElementById('hostId').value = '';
            document.getElementById('hostPort').value = '22';
            document.getElementById('hostDefaultPath').value = 'D:/';
        }

        modal.classList.remove('hidden');
    }

    closeHostModal() {
        document.getElementById('hostModal').classList.add('hidden');
    }

    async saveHost() {
        const hostId = document.getElementById('hostId').value;
        const hostData = {
            id: hostId ? parseInt(hostId) : Date.now(),
            name: document.getElementById('hostName').value.trim(),
            ip: document.getElementById('hostIP').value.trim(),
            port: parseInt(document.getElementById('hostPort').value) || 22,
            user: document.getElementById('hostUser').value.trim(),
            defaultPath: document.getElementById('hostDefaultPath').value.trim() || 'D:/',
            status: ''
        };

        // Validate
        if (!hostData.name || !hostData.ip || !hostData.user) {
            alert('請填寫必要欄位');
            return;
        }

        if (hostId) {
            // Update existing
            const index = this.hosts.findIndex(h => h.id === parseInt(hostId));
            if (index !== -1) {
                this.hosts[index] = hostData;
            }
        } else {
            // Add new
            this.hosts.push(hostData);
        }

        await window.api.saveHosts(this.hosts);
        this.renderHosts();
        this.closeHostModal();
    }

    async deleteHost(hostId) {
        if (!confirm('確定要刪除此主機嗎？')) return;

        this.hosts = this.hosts.filter(h => h.id !== hostId);
        await window.api.saveHosts(this.hosts);
        this.renderHosts();
    }

    async testConnection() {
        const status = document.getElementById('connectionStatus');
        const btn = document.getElementById('testConnectionBtn');

        const host = {
            ip: document.getElementById('hostIP').value.trim(),
            port: parseInt(document.getElementById('hostPort').value) || 22,
            user: document.getElementById('hostUser').value.trim()
        };

        if (!host.ip || !host.user) {
            status.textContent = '請先填寫 IP 和使用者名稱';
            status.className = 'connection-status error';
            return;
        }

        status.textContent = '測試連線中...';
        status.className = 'connection-status testing';
        btn.disabled = true;

        try {
            const result = await window.api.testConnection(host);

            status.textContent = result.message;
            status.className = `connection-status ${result.success ? 'success' : 'error'}`;

            if (!result.success && result.needsSetup) {
                status.innerHTML += ' <a href="#" onclick="app.openSshGuide(); return false;">查看設定指南</a>';
            }
        } catch (error) {
            status.textContent = `測試失敗: ${error.message}`;
            status.className = 'connection-status error';
        }

        btn.disabled = false;
    }

    // ============================================
    // Batch Management
    // ============================================
    addBatch() {
        this.batchIdCounter++;
        const batchId = this.batchIdCounter;

        const batch = {
            id: batchId,
            files: [],
            useSamePath: true,
            commonPath: '',
            targets: []
        };

        this.batches.push(batch);
        this.renderBatch(batch);
        this.updateTransferButton();
    }

    renderBatch(batch) {
        const container = document.getElementById('batchesContainer');
        const emptyState = document.getElementById('emptyBatchState');

        if (emptyState) {
            emptyState.remove();
        }

        const template = document.getElementById('batchTemplate');
        const batchEl = template.content.cloneNode(true);
        const batchCard = batchEl.querySelector('.batch-card');

        batchCard.dataset.batchId = batch.id;
        batchCard.querySelector('.batch-number').textContent = `批次 #${batch.id}`;

        // Render host targets
        this.renderBatchTargets(batchCard, batch);

        container.appendChild(batchEl);

        // Bind batch events
        const cardEl = container.querySelector(`[data-batch-id="${batch.id}"]`);
        this.bindBatchEvents(cardEl, batch);
    }

    renderBatchTargets(batchCard, batch) {
        const hostTargets = batchCard.querySelector('.host-targets');

        if (this.hosts.length === 0) {
            hostTargets.innerHTML = `
        <div class="no-hosts-message">
          尚無遠端主機，請先在左側新增主機
        </div>
      `;
            return;
        }

        hostTargets.innerHTML = this.hosts.map(host => `
      <div class="host-target-item" data-host-id="${host.id}">
        <input type="checkbox" ${batch.targets.some(t => t.hostId === host.id) ? 'checked' : ''}>
        <div class="target-info">
          <div class="target-name">${this.escapeHtml(host.name)}</div>
          <div class="target-ip">${this.escapeHtml(host.ip)}</div>
        </div>
        <input type="text" class="target-path-input" placeholder="${host.defaultPath}" 
               value="${batch.targets.find(t => t.hostId === host.id)?.path || host.defaultPath}"
               ${batch.useSamePath ? 'style="display:none"' : ''}>
      </div>
    `).join('');
    }

    updateAllBatchTargets() {
        this.batches.forEach(batch => {
            const batchCard = document.querySelector(`[data-batch-id="${batch.id}"]`);
            if (batchCard) {
                this.renderBatchTargets(batchCard, batch);
                this.bindBatchEvents(batchCard, batch);
            }
        });
    }

    bindBatchEvents(batchCard, batch) {
        // Remove batch button
        batchCard.querySelector('.btn-remove-batch').addEventListener('click', () => {
            this.removeBatch(batch.id);
        });

        // Drop zone
        const dropZone = batchCard.querySelector('.drop-zone');

        dropZone.addEventListener('click', async () => {
            const files = await window.api.openFileDialog();
            if (files.length > 0) {
                this.addFilesToBatch(batch, files);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files).map(f => f.path);
            if (files.length > 0) {
                this.addFilesToBatch(batch, files);
            }
        });

        // Same path toggle
        const samePathToggle = batchCard.querySelector('.use-same-path');
        const samePathInput = batchCard.querySelector('.same-path-input');
        const pathInputs = batchCard.querySelectorAll('.target-path-input');

        samePathToggle.addEventListener('change', () => {
            batch.useSamePath = samePathToggle.checked;

            if (batch.useSamePath) {
                samePathInput.classList.remove('hidden');
                pathInputs.forEach(input => input.style.display = 'none');
            } else {
                samePathInput.classList.add('hidden');
                pathInputs.forEach(input => input.style.display = 'block');
            }
        });

        // Common path input
        const commonPathInput = batchCard.querySelector('.target-path-all');
        commonPathInput.addEventListener('input', () => {
            batch.commonPath = commonPathInput.value;
        });

        // Host target checkboxes
        batchCard.querySelectorAll('.host-target-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const pathInput = item.querySelector('.target-path-input');
            const hostId = parseInt(item.dataset.hostId);

            checkbox.addEventListener('change', () => {
                item.classList.toggle('selected', checkbox.checked);
                this.updateBatchTargets(batch, batchCard);
                this.updateTransferButton();
            });

            if (pathInput) {
                pathInput.addEventListener('input', () => {
                    this.updateBatchTargets(batch, batchCard);
                });
            }
        });
    }

    addFilesToBatch(batch, filePaths) {
        filePaths.forEach(filePath => {
            if (!batch.files.includes(filePath)) {
                batch.files.push(filePath);
            }
        });

        this.renderBatchFiles(batch);
        this.updateTransferButton();
    }

    renderBatchFiles(batch) {
        const batchCard = document.querySelector(`[data-batch-id="${batch.id}"]`);
        const fileList = batchCard.querySelector('.file-list');

        fileList.innerHTML = batch.files.map((filePath, index) => {
            const fileName = filePath.split(/[\\/]/).pop();
            return `
        <div class="file-item" data-file-index="${index}">
          <div class="file-name">
            <span>📄</span>
            <span title="${this.escapeHtml(filePath)}">${this.escapeHtml(fileName)}</span>
          </div>
          <button class="btn-icon btn-remove-file" title="移除">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
        }).join('');

        // Bind remove file events
        fileList.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.closest('.file-item').dataset.fileIndex);
                batch.files.splice(index, 1);
                this.renderBatchFiles(batch);
                this.updateTransferButton();
            });
        });
    }

    updateBatchTargets(batch, batchCard) {
        batch.targets = [];

        batchCard.querySelectorAll('.host-target-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const pathInput = item.querySelector('.target-path-input');
            const hostId = parseInt(item.dataset.hostId);
            const host = this.hosts.find(h => h.id === hostId);

            if (checkbox.checked && host) {
                let path;
                if (batch.useSamePath) {
                    const commonPath = batchCard.querySelector('.target-path-all').value.trim();
                    path = commonPath || host.defaultPath;
                } else {
                    path = pathInput.value.trim() || host.defaultPath;
                }

                batch.targets.push({
                    hostId,
                    host,
                    path
                });
            }
        });
    }

    removeBatch(batchId) {
        this.batches = this.batches.filter(b => b.id !== batchId);

        const batchCard = document.querySelector(`[data-batch-id="${batchId}"]`);
        if (batchCard) {
            batchCard.remove();
        }

        if (this.batches.length === 0) {
            document.getElementById('batchesContainer').innerHTML = `
        <div class="empty-batch-state" id="emptyBatchState">
          <div class="empty-icon">📂</div>
          <h3>尚無傳輸任務</h3>
          <p>點擊「新增批次」開始設定檔案傳輸</p>
        </div>
      `;
        }

        this.updateTransferButton();
    }

    updateTransferButton() {
        const btn = document.getElementById('startTransferBtn');

        // Check if any batch has files and targets
        const hasValidBatch = this.batches.some(batch =>
            batch.files.length > 0 && batch.targets.length > 0
        );

        btn.disabled = !hasValidBatch || this.isTransferring;
    }

    // ============================================
    // Transfer Operations
    // ============================================
    async startTransfer() {
        if (this.isTransferring) return;

        // Build transfer config
        const config = {
            batches: this.batches
                .filter(b => b.files.length > 0 && b.targets.length > 0)
                .map(batch => {
                    // Ensure targets have updated paths
                    const batchCard = document.querySelector(`[data-batch-id="${batch.id}"]`);
                    this.updateBatchTargets(batch, batchCard);

                    return {
                        files: batch.files,
                        targets: batch.targets
                    };
                })
        };

        if (config.batches.length === 0) {
            alert('請至少設定一個有效的傳輸批次');
            return;
        }

        this.isTransferring = true;
        this.updateTransferButton();

        // Show progress section
        const progressSection = document.getElementById('progressSection');
        const progressContainer = document.getElementById('progressContainer');
        const transferSummary = document.getElementById('transferSummary');

        progressSection.classList.remove('hidden');
        progressContainer.innerHTML = '';
        transferSummary.classList.add('hidden');

        try {
            await window.api.startTransfer(config);
        } catch (error) {
            console.error('Transfer error:', error);
        }
    }

    handleTransferProgress(progress) {
        const progressContainer = document.getElementById('progressContainer');
        const transferSummary = document.getElementById('transferSummary');

        switch (progress.type) {
            case 'start':
                progressContainer.innerHTML += `
          <div class="progress-item" id="progress-${progress.transferId}">
            <span class="file-icon">📄</span>
            <div class="progress-details">
              <div class="progress-filename">${this.escapeHtml(progress.fileName)}</div>
              <div class="progress-target">→ ${this.escapeHtml(progress.targetHost)} : ${this.escapeHtml(progress.targetPath)}</div>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: 0%"></div>
            </div>
            <span class="progress-percent">0%</span>
          </div>
        `;
                break;

            case 'progress':
                const progressItem = document.getElementById(`progress-${progress.transferId}`);
                if (progressItem) {
                    progressItem.querySelector('.progress-bar').style.width = `${progress.percent}%`;
                    progressItem.querySelector('.progress-percent').textContent = `${progress.percent}%`;
                }
                break;

            case 'complete':
                const completeItem = document.getElementById(`progress-${progress.transferId}`);
                if (completeItem) {
                    completeItem.classList.add('completed');
                    completeItem.querySelector('.progress-bar').style.width = '100%';
                    completeItem.querySelector('.progress-percent').innerHTML = '✓';
                }
                break;

            case 'error':
                const errorItem = document.getElementById(`progress-${progress.transferId}`);
                if (errorItem) {
                    errorItem.classList.add('error');
                    errorItem.querySelector('.progress-percent').innerHTML = '✗';
                    errorItem.querySelector('.progress-target').innerHTML +=
                        `<br><span style="color: var(--danger)">${this.escapeHtml(progress.error)}</span>`;
                }
                break;

            case 'finished':
                this.isTransferring = false;
                this.updateTransferButton();

                const results = progress.results;
                transferSummary.classList.remove('hidden');
                transferSummary.innerHTML = `
          <div class="summary-stats">
            <div class="summary-stat success">
              <span class="stat-value">${results.completed}</span>
              <span>成功</span>
            </div>
            <div class="summary-stat failed">
              <span class="stat-value">${results.failed}</span>
              <span>失敗</span>
            </div>
            <div class="summary-stat">
              <span class="stat-value">${results.total}</span>
              <span>總計</span>
            </div>
          </div>
          <button class="btn-secondary" onclick="app.closeProgressSection()">關閉</button>
        `;
                break;
        }
    }

    async cancelTransfer() {
        if (!this.isTransferring) return;

        await window.api.cancelTransfer();
        this.isTransferring = false;
        this.updateTransferButton();
    }

    closeProgressSection() {
        document.getElementById('progressSection').classList.add('hidden');
    }

    // ============================================
    // SSH Guide
    // ============================================
    async openSshGuide() {
        document.getElementById('sshGuideModal').classList.remove('hidden');
        this.loadKeyStatus();
        this.loadPublicKey();
    }

    closeSshGuide() {
        document.getElementById('sshGuideModal').classList.add('hidden');
    }

    switchGuideTab(tabName) {
        document.querySelectorAll('.guide-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.guide-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabName}`);
        });

        if (tabName === 'local') {
            this.loadKeyStatus();
        } else if (tabName === 'deploy') {
            this.loadPublicKey();
        }
    }

    async loadKeyStatus() {
        const keyStatus = document.getElementById('keyStatus');
        const result = await window.api.getPublicKey();
        const homePath = await window.api.getHomePath();

        if (result.success) {
            keyStatus.className = 'key-status exists';
            keyStatus.innerHTML = `
        <div>✅ SSH 金鑰已存在</div>
        <div class="key-path">${homePath}\\.ssh\\id_rsa</div>
      `;
        } else {
            keyStatus.className = 'key-status missing';
            keyStatus.innerHTML = `
        <div>⚠️ 尚未生成 SSH 金鑰</div>
        <div class="key-path">請點擊下方按鈕生成金鑰</div>
      `;
        }
    }

    async loadPublicKey() {
        const container = document.getElementById('publicKeyContainer');
        const result = await window.api.getPublicKey();

        if (result.success) {
            // Store the key for copying
            this.currentPublicKey = result.content;

            container.innerHTML = `
        <div class="public-key-content" id="publicKeyText">${this.escapeHtml(result.content)}</div>
        <div class="public-key-actions">
          <button class="btn-primary" id="copyPublicKeyBtn">複製公鑰</button>
        </div>
      `;

            // Bind click event directly
            document.getElementById('copyPublicKeyBtn').addEventListener('click', async () => {
                try {
                    await window.api.writeClipboard(this.currentPublicKey);
                    alert('公鑰已複製到剪貼簿！');
                } catch (e) {
                    // Fallback: select the text so user can copy manually
                    const textEl = document.getElementById('publicKeyText');
                    const range = document.createRange();
                    range.selectNodeContents(textEl);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    alert('請按 Ctrl+C 手動複製選取的公鑰');
                }
            });
        } else {
            container.innerHTML = `
        <div class="loading">請先生成 SSH 金鑰</div>
      `;
        }
    }

    async generateSshKey() {
        const btn = document.getElementById('generateKeyBtn');
        btn.disabled = true;
        btn.textContent = '生成中...';

        const result = await window.api.generateSSHKey();

        btn.disabled = false;
        btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      自動生成金鑰
    `;

        if (result.success) {
            alert(result.alreadyExists ? 'SSH 金鑰已存在' : 'SSH 金鑰生成成功！');
            this.loadKeyStatus();
            this.loadPublicKey();
        } else {
            alert(`生成失敗: ${result.message}`);
        }
    }

    async copyPublicKey() {
        const result = await window.api.getPublicKey();
        if (result.success) {
            await window.api.writeClipboard(result.content);
            alert('公鑰已複製到剪貼簿！');
        }
    }

    async copyToClipboard(btn) {
        const text = btn.dataset.copy;
        if (text) {
            await window.api.writeClipboard(text);
            btn.textContent = '已複製';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '複製';
                btn.classList.remove('copied');
            }, 2000);
        }
    }

    // ============================================
    // Utilities
    // ============================================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const app = new Local2Other();
