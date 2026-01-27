@echo off
:: 檢查管理員權限
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [錯誤] 請點擊右鍵，選擇「以系統管理員身分執行」！
    pause
    exit /B
)

echo ==========================================
echo    OpenSSH Server 快速安裝工具
echo ==========================================

echo 1. 正在安裝 OpenSSH Server... (請稍候，這可能需要一分鐘)
powershell -Command "Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0"

echo 2. 正在啟動服務並設定自動啟動...
powershell -Command "Start-Service sshd; Set-Service -Name sshd -StartupType 'Automatic'"

echo 3. 正在設定防火牆規則 (Port 22)...
powershell -Command "if (!(Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22; echo '防火牆規則已建立' } else { echo '防火牆規則已存在，跳過' }"

echo ==========================================
echo 檢查服務狀態：
powershell -Command "Get-Service sshd | Select-Object Name, Status, StartType"
echo ==========================================
echo 安裝完成！現在你可以從其他電腦發送檔案過來了。
pause