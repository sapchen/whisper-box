# CyberWhisper 🔐

基于GitHub Issues的匿名悄悄话应用，具有科技感UI，完全免费部署。

## ✨ 特性
- 🎯 **完全匿名** - 不记录发送者信息
- 🔒 **端到端加密** - 消息安全存储
- ⚡ **实时更新** - 自动刷新新消息
- 📱 **PWA支持** - 可安装为桌面应用
- 🎨 **科技感UI** - 现代化设计
- 🆓 **完全免费** - 使用GitHub Pages + Issues

## 🚀 快速开始

### 1. 准备工作
1. Fork此仓库
2. 创建GitHub Token:
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token"
   - 选择 `repo` 权限
   - 复制生成的Token

### 2. 部署步骤
1. 克隆仓库到本地
   ```bash
   git clone https://github.com/YOUR_USERNAME/whisper-box.git
   cd whisper-box
2. 修改配置文
   - 打开 config.js
   - 修改 REPO_OWNER 为你的GitHub用户名
   - 修改 REPO_NAME 为仓库名（默认 whisper-box）
3. 启用GitHub Pages
   - 进入仓库 Settings → Pages
   - Source选择 main branch
   - 保存