// 主应用逻辑
class WhisperApp {
    constructor() {
        this.userId = null;
        this.messages = [];
        this.refreshInterval = null;
        this.connectionStatus = 'disconnected';
        this.lastMessageCount = 0;
    }

    // 初始化应用
    async init() {
        try {
            // 加载配置
            await this.loadConfig();
            
            // 初始化用户ID
            await this.initUserId();
            
            // 更新UI
            this.updateUserInfo();
            
            // 加载消息
            await this.loadMessages();
            
            // 启动轮询
            this.startPolling();
            
            // 更新连接状态
            this.updateConnectionStatus('connected');
            
            this.showNotification('系统初始化完成', 'success');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showNotification('初始化失败，请检查配置', 'error');
            this.showConfig();
        }
    }

    // 加载配置
    async loadConfig() {
        // 从localStorage加载用户配置，否则使用默认配置
        const savedToken = localStorage.getItem('githubToken');
        const savedOwner = localStorage.getItem('repoOwner');
        const savedRepo = localStorage.getItem('repoName');
        
        if (savedToken) CONFIG.GITHUB_TOKEN = savedToken;
        if (savedOwner) CONFIG.REPO_OWNER = savedOwner;
        if (savedRepo) CONFIG.REPO_NAME = savedRepo;
        
        // 如果没有配置，显示配置模态框
        if (!CONFIG.GITHUB_TOKEN || !CONFIG.REPO_OWNER) {
            throw new Error('请先配置GitHub信息');
        }
    }

    // 初始化用户ID
    async initUserId() {
        // 尝试从URL获取用户ID
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('id');
        
        if (!userId) {
            // 从localStorage获取或生成新的用户ID
            userId = localStorage.getItem('whisperUserId');
            
            if (!userId) {
                // 生成新的用户ID并创建对应的GitHub Issue
                userId = await this.createNewUser();
                localStorage.setItem('whisperUserId', userId);
                
                // 更新URL但不刷新页面
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('id', userId);
                window.history.replaceState({}, '', newUrl);
            }
        }
        
        this.userId = userId;
        return userId;
    }

    // 创建新用户（Issue）
    async createNewUser() {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 8);
        const userId = `user-${timestamp}-${randomId}`;
        
        // 创建GitHub Issue
        const issueData = {
            title: `Whisper Box: ${userId}`,
            body: `匿名悄悄话接收者: ${userId}\n创建时间: ${new Date().toISOString()}\n\n---\n\n## 消息记录:`,
            labels: ['whisper-box', 'anonymous']
        };
        
        const response = await this.githubRequest('POST', `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues`, issueData);
        
        if (response && response.number) {
            // 将issue编号作为用户标识存储
            localStorage.setItem('userIssueId', response.number);
            return userId;
        } else {
            throw new Error('创建用户失败');
        }
    }

    // 加载消息
    async loadMessages() {
        try {
            const issueId = localStorage.getItem('userIssueId');
            if (!issueId) {
                throw new Error('用户未初始化');
            }
            
            const comments = await this.githubRequest('GET', 
                `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${issueId}/comments`);
            
            if (comments && Array.isArray(comments)) {
                // 解析消息
                this.messages = comments.map(comment => ({
                    id: comment.id,
                    text: this.decryptMessage(comment.body),
                    time: new Date(comment.created_at),
                    author: comment.user?.login || 'anonymous',
                    avatar: comment.user?.avatar_url
                }));
                
                // 更新UI
                this.renderMessages();
                this.updateStats();
                
                // 如果有新消息，显示通知
                if (this.messages.length > this.lastMessageCount) {
                    const newCount = this.messages.length - this.lastMessageCount;
                    if (newCount > 0 && this.lastMessageCount > 0) {
                        this.showNotification(`收到${newCount}条新消息`, 'info');
                    }
                    this.lastMessageCount = this.messages.length;
                }
            }
        } catch (error) {
            console.error('加载消息失败:', error);
            this.updateConnectionStatus('error');
        }
    }

    // 渲染消息
    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        
        if (this.messages.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-comment-slash"></i>
                    </div>
                    <h3>暂无消息</h3>
                    <p>分享你的链接，接收匿名悄悄话</p>
                </div>
            `;
            return;
        }
        
        // 按时间排序（最新的在前）
        const sortedMessages = [...this.messages].sort((a, b) => b.time - a.time);
        
        messagesList.innerHTML = sortedMessages.map((msg, index) => `
            <div class="message-item ${index < 3 ? 'new' : ''}" 
                 onclick="app.showMessageDetail(${msg.id})"
                 data-id="${msg.id}">
                <div class="message-header">
                    <span class="message-time">
                        <i class="far fa-clock"></i>
                        ${this.formatTime(msg.time)}
                    </span>
                    <span class="message-id">
                        #${msg.id.toString().slice(-6)}
                    </span>
                </div>
                <div class="message-content">
                    ${this.formatMessageContent(msg.text)}
                </div>
            </div>
        `).join('');
    }

    // 格式化时间
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        // 今天内
        if (diff < 24 * 60 * 60 * 1000) {
            if (diff < 60 * 60 * 1000) {
                const minutes = Math.floor(diff / (60 * 1000));
                return `${minutes}分钟前`;
            }
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours}小时前`;
        }
        
        // 昨天
        if (diff < 48 * 60 * 60 * 1000) {
            return '昨天';
        }
        
        // 一周内
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days}天前`;
        }
        
        // 显示完整日期
        return date.toLocaleDateString('zh-CN');
    }

    // 格式化消息内容
    formatMessageContent(text) {
        // 简单的表情替换
        const emojiMap = {
            ':)': '😊',
            ':(': '😢',
            ':D': '😃',
            ':P': '😛',
            ';)': '😉',
            '<3': '❤️'
        };
        
        let formatted = text;
        for (const [key, emoji] of Object.entries(emojiMap)) {
            formatted = formatted.replace(new RegExp(key, 'g'), emoji);
        }
        
        // 处理换行
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('messageCount').textContent = this.messages.length;
        document.getElementById('lastUpdate').textContent = 
            new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 更新用户信息显示
    updateUserInfo() {
        document.getElementById('userId').textContent = this.userId;
    }

    // 更新连接状态
    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            statusElement.textContent = this.getStatusText(status);
            statusElement.className = `status-${status}`;
        }
    }

    getStatusText(status) {
        const statusMap = {
            connected: '✅ 已连接',
            disconnected: '❌ 断开连接',
            error: '⚠️ 连接错误',
            connecting: '🔄 连接中...'
        };
        return statusMap[status] || '未知状态';
    }

    // 开始轮询
    startPolling() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.loadMessages();
        }, CONFIG.AUTO_REFRESH);
    }

    // GitHub API请求
    async githubRequest(method, endpoint, data = null) {
        if (!CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub Token未配置');
        }
        
        const url = `https://api.github.com${endpoint}`;
        const headers = {
            'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const options = {
            method,
            headers
        };
        
        if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`GitHub API错误: ${response.status} ${response.statusText}`);
            }
            
            if (method !== 'DELETE') {
                return await response.json();
            }
            
            return true;
        } catch (error) {
            console.error('GitHub请求失败:', error);
            throw error;
        }
    }

    // 简单加密（Base64 + 混淆）
    encryptMessage(text) {
        const key = CONFIG.ENCRYPT_KEY;
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        return btoa(result);
    }

    // 解密
    decryptMessage(encryptedText) {
        try {
            const decoded = atob(encryptedText);
            const key = CONFIG.ENCRYPT_KEY;
            let result = '';
            
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            
            return result;
        } catch (error) {
            return encryptedText; // 如果不是加密内容，直接返回
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // 显示消息详情
    showMessageDetail(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        document.getElementById('detailTime').textContent = 
            message.time.toLocaleString('zh-CN');
        document.getElementById('detailId').textContent = `消息ID: ${message.id}`;
        document.getElementById('detailContent').innerHTML = 
            this.formatMessageContent(message.text);
        
        document.getElementById('messageModal').classList.add('active');
    }

    // 清空所有消息
    async clearAllMessages() {
        if (!confirm('确定要清空所有消息吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            const issueId = localStorage.getItem('userIssueId');
            const comments = await this.githubRequest('GET', 
                `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${issueId}/comments`);
            
            // 删除所有评论
            for (const comment of comments) {
                await this.githubRequest('DELETE', 
                    `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/comments/${comment.id}`);
            }
            
            this.messages = [];
            this.renderMessages();
            this.updateStats();
            this.showNotification('已清空所有消息', 'success');
        } catch (error) {
            console.error('清空消息失败:', error);
            this.showNotification('清空失败', 'error');
        }
    }
}

// 全局应用实例
const app = new WhisperApp();

// 初始化函数
function initApp() {
    app.init();
}

// 刷新消息
function refreshMessages() {
    app.loadMessages();
    app.showNotification('刷新完成', 'info');
}

// 复制用户ID
function copyUserId() {
    navigator.clipboard.writeText(app.userId)
        .then(() => app.showNotification('用户ID已复制', 'success'))
        .catch(() => app.showNotification('复制失败', 'error'));
}

// 显示配置模态框
function showConfig() {
    document.getElementById('githubToken').value = CONFIG.GITHUB_TOKEN || '';
    document.getElementById('repoOwner').value = CONFIG.REPO_OWNER;
    document.getElementById('repoName').value = CONFIG.REPO_NAME;
    document.getElementById('configModal').classList.add('active');
}

// 关闭配置模态框
function closeConfig() {
    document.getElementById('configModal').classList.remove('active');
}

// 保存配置
function saveConfig() {
    const token = document.getElementById('githubToken').value;
    const owner = document.getElementById('repoOwner').value;
    const repo = document.getElementById('repoName').value;
    
    if (!token || !owner || !repo) {
        app.showNotification('请填写所有配置项', 'error');
        return;
    }
    
    // 保存到localStorage
    localStorage.setItem('githubToken', token);
    localStorage.setItem('repoOwner', owner);
    localStorage.setItem('repoName', repo);
    
    // 更新配置
    CONFIG.GITHUB_TOKEN = token;
    CONFIG.REPO_OWNER = owner;
    CONFIG.REPO_NAME = repo;
    
    closeConfig();
    app.showNotification('配置已保存，重新初始化中...', 'success');
    
    // 重新初始化
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// 分享链接
function shareLink() {
    const shareUrl = `${window.location.origin}/whisper.html?to=${app.userId}`;
    document.getElementById('shareUrl').value = shareUrl;
    
    // 生成二维码
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    QRCode.toCanvas(qrcodeDiv, shareUrl, {
        width: 200,
        height: 200,
        margin: 1,
        color: {
            dark: '#00ff88',
            light: '#141420'
        }
    }, function(error) {
        if (error) console.error(error);
    });
    
    document.getElementById('shareModal').classList.add('active');
}

// 关闭分享模态框
function closeShare() {
    document.getElementById('shareModal').classList.remove('active');
}

// 复制分享链接
function copyShareUrl() {
    const shareUrl = document.getElementById('shareUrl').value;
    navigator.clipboard.writeText(shareUrl)
        .then(() => app.showNotification('链接已复制', 'success'))
        .catch(() => app.showNotification('复制失败', 'error'));
}

// 分享功能 - 简化版
function shareToQQ() {
    const url = encodeURIComponent(document.getElementById('shareUrl').value);
    const title = encodeURIComponent('匿名悄悄话 | 有什么想对我说的吗？');
    const summary = encodeURIComponent('完全匿名的悄悄话应用，想说什么都可以～');
    const shareUrl = `http://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${summary}`;
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    app.showNotification('已打开QQ分享', 'info');
}

function shareToWeibo() {
    const url = encodeURIComponent(document.getElementById('shareUrl').value);
    const title = encodeURIComponent('匿名悄悄话 | 有什么想对我说的吗？');
    const shareUrl = `http://service.weibo.com/share/share.php?url=${url}&title=${title}`;
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    app.showNotification('已打开微博分享', 'info');
}

// 关闭消息详情模态框
function closeMessageModal() {
    document.getElementById('messageModal').classList.remove('active');
}

// 粒子效果
function startParticles() {
    const container = document.querySelector('.particles-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: var(--primary-color);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.1};
            animation: float ${Math.random() * 10 + 10}s linear infinite;
        `;
        container.appendChild(particle);
    }
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}