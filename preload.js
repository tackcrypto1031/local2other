const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Host management
    getHosts: () => ipcRenderer.invoke('hosts:get'),
    saveHosts: (hosts) => ipcRenderer.invoke('hosts:save', hosts),

    // File dialogs
    openFileDialog: () => ipcRenderer.invoke('dialog:openFiles'),
    openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

    // SSH operations
    testConnection: (host) => ipcRenderer.invoke('ssh:testConnection', host),
    generateSSHKey: () => ipcRenderer.invoke('ssh:generateKey'),
    getPublicKey: () => ipcRenderer.invoke('ssh:getPublicKey'),

    // Transfer operations
    startTransfer: (config) => ipcRenderer.invoke('transfer:start', config),
    cancelTransfer: () => ipcRenderer.invoke('transfer:cancel'),
    onTransferProgress: (callback) => {
        ipcRenderer.on('transfer:progress', (event, progress) => callback(progress));
    },

    // System
    getHomePath: () => ipcRenderer.invoke('system:getHomePath'),

    // Clipboard
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text)
});
