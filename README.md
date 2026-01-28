# local2other - SSH/SCP Multi-Host File Transfer Tool
# local2other - SSH/SCP 多主機檔案傳輸工具

![local2other Sample](https://raw.githubusercontent.com/tackcrypto1031/local2other/main/sample/sample.png)

`local2other` is a modern SSH/SCP file transfer tool built with Electron, designed to streamline the process of sending local files to multiple remote computers within a local network.
`local2other` 是一款基於 Electron 開發的現代化 SSH/SCP 檔案傳輸工具，旨在簡化將本地檔案傳送至內網中多台遠端電腦的過程。

## 🚀 Key Features / 主要功能

*   **Multi-Host Management**: Easily add, edit, and manage multiple remote host configurations.
    **多主機管理**：輕鬆添加、編輯和管理多個遠端主機配置。
*   **Batch File Transfer**: Select multiple files or entire folders to transfer to all selected hosts simultaneously.
    **批量檔案傳輸**：選擇多個檔案或整個資料夾，同時傳輸到所有選定的主機。
*   **SSH Key Integration**: Built-in SSH key generation and management for secure, password-less authentication.
    **SSH 金鑰整合**：內建 SSH 金鑰生成與管理功能，實現安全、免密碼的身份驗證。
*   **Real-time Progress Tracking**: Monitor the transfer status and progress for each host in real-time.
    **即時進度追蹤**：實時監控每台主機的傳輸狀態和進度。
*   **Cross-Platform (via Electron)**: Compatible with Windows, macOS, and Linux.
    **跨平台支援（透過 Electron）**：支援 Windows、macOS 和 Linux 系統。

## 🛠 Technical Stack / 技術棧

*   **Frontend**: HTML, Vanilla CSS, Vanilla JavaScript (Renderer process)
    **前端**：HTML、Vanilla CSS、Vanilla JavaScript（渲染程序）
*   **Backend**: Electron (Main process)
    **後端**：Electron（主程序）
*   **Secure Connection**: `ssh2` Library for robust SSH/SCP operations
    **安全連線**：使用 `ssh2` 庫進行穩定的 SSH/SCP 操作
*   **Storage**: Simple JSON-based local configuration storage
    **存儲**：基於 JSON 的簡易本地配置存儲

## 📦 Installation & Setup / 安裝與設定

### Prerequisites / 前置需求
*   [Node.js](https://nodejs.org/) (v16.x or later recommended)
*   Git

### Local Installation / 本地安裝
1.  **Clone the repository / 複製儲存庫**:
    ```bash
    git clone https://github.com/your-username/local2other.git
    cd local2other
    ```
2.  **Install dependencies / 安裝依賴**:
    ```bash
    npm install
    ```
3.  **Start the application / 啟動程式**:
    ```bash
    npm start
    ```

### Remote Host Setup / 遠端主機設定
To enable file transfers, the remote computer must have an SSH server running and configured for authentication.
為了啟用檔案傳輸，遠端電腦必須運行 SSH 服務器並配置好身份驗證。

**Windows (Remote) / Windows (遠端)**:
*   Ensure **OpenSSH Server** is installed and running.
    確保 **OpenSSH Server** 已安裝並運行。
*   Use the provided `遠端電腦安裝用.bat` script on the remote machine to help with setup if available.
    如果有的話，可以使用提供的 `遠端電腦安裝用.bat` 腳本來協助遠端機器的設定。

## 📖 Usage / 使用說明

1.  **Generate SSH Key**: Navigate to the settings/key management section in the app, click "Generate Key" if you don't have one.
    **生成 SSH 金鑰**：在程式中前往設定/金鑰管理部分，如果還沒有金鑰，點擊「生成金鑰」。
2.  **Add Hosts**: Add your remote machine's IP, username, and specify the port (default 22).
    **添加主機**：輸入遠端機器的 IP、使用者名稱，並指定端口（預設為 22）。
3.  **Deploy Public Key**: Copy your public key to the remote host's `authorized_keys` file.
    **部署公鑰**：將您的公鑰複製到遠端主機的 `authorized_keys` 檔案中。
4.  **Select Files**: Click the "Select Files" button to choose what to send.
    **選擇檔案**：點擊「選擇檔案」按鈕來挑選要傳送的文件。
5.  **Target Directory**: Set the destination path on the remote machines.
    **目標目錄**：設置遠端機器上的目標存放路徑。
6.  **Transfer**: Hit the transfer button and watch the progress!
    **傳輸**：按下傳輸按鈕，即可查看進度！

## ⚠️ Important: SSH Account Configuration / 重要：SSH 帳戶配置

### Domain Account vs Local Account / 網域帳戶 vs 本機帳戶

**Important**: When connecting to Windows computers joined to a domain, you **MUST use a local account**, NOT a domain account.
**重要**：連接加入網域的 Windows 電腦時，**必須使用本機帳戶**，而非網域帳戶。

| Account Type / 帳戶類型 | Example / 範例 | SSH Support / SSH 支援 |
|---|---|---|
| Local Account / 本機帳戶 | `auer`, `Administrator` | ✅ Works / 可用 |
| Domain Account / 網域帳戶 | `DOMAIN\username`, `user@domain.com` | ❌ Not supported / 不支援 |

#### Why? / 為什麼？
Windows OpenSSH service cannot create authentication tokens for domain users (S4U authentication limitation).
Windows OpenSSH 服務無法為網域用戶創建認證 Token（S4U 認證限制）。

#### How to find local accounts / 如何查找本機帳戶
Run on the remote machine / 在遠端機器上執行:
```powershell
net user
```

#### Troubleshooting Steps / 疑難排解步驟
1.  Stop sshd service / 停止 sshd 服務: `Stop-Service sshd`
2.  Run in debug mode / 以除錯模式運行: `& "C:\Windows\System32\OpenSSH\sshd.exe" -d`
3.  In another terminal, try to connect / 在另一個終端嘗試連線
4.  Check the debug output for errors / 檢查除錯輸出中的錯誤訊息

## ⌨️ Development Scripts / 開發指令

*   `npm start`: Run the application in production mode.
    `npm start`: 在生產模式下運行程式。
*   `npm run dev`: Run the application with DevTools enabled for debugging.
    `npm run dev`: 啟用 DevTools 以開發模式運行程式，方便調試。

## 📄 License / 授權

Distributed under the **MIT License**. See `LICENSE` for more information.
本專案採用 **MIT 授權條款**。詳情請參閱 `LICENSE` 檔案。
