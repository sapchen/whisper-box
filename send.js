// 发送页面逻辑
class SendPage {
    constructor() {
        this.targetUserId = null;
        this.isSending = false;
    }

    init() {
        // 获取目标用户ID
        const urlParams = new URLSearchParams(window.location.search);
        this.targetUserId = urlParams.get('to');
        
        if (!this.targetUserId) {
            this.showNotification('错误: 未指定收件人', 'error');
            return;
        }
        
        // 加载配置
        this.loadConfig();
    }

    loadConfig() {
        // 从localStorage加载配置
        const savedToken = localStorage.getItem('githubToken');
        const savedOwner = localStorage.getItem('repoOwner');
        const savedRepo = localStorage.getItem('repoName');
        
        if (savedToken) CONFIG.GITHUB_TOKEN = savedToken;
        if (savedOwner) CONFIG.REPO_OWNER = savedOwner;
        if (savedRepo) CONFIG.REPO_NAME = savedRepo;
        
        // 检查配置是否完整
        if (!CONFIG.GITHUB_TOKEN || !CONFIG.REPO_OWNER || !CONFIG.REPO_NAME) {
            this.showNotification('请先配置GitHub信息', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    // 发送消息
    async sendMessage() {
        if (this.isSending) return;
        
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) {
            this.showNotification('请输入消息内容', 'error');
            return;
        }
        
        if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
            this.showNotification(`消息过长（最大${CONFIG.MAX_MESSAGE_LENGTH}字符）`, 'error');
            return;
        }
        
        this.isSending = true;
        this.updateSendStatus('发送中...', 'info');
        
        try {
            // 查找目标用户的Issue
            const issueId = await this.findUserIssue(this.targetUserId);
            
            if (!issueId) {
                throw new Error('找不到目标用户');
            }
            
            // 加密消息
            const encryptedMessage = this.encryptMessage(message);
            
            // 发送评论到Issue
            const commentData = {
                body: encryptedMessage
            };
            
            await this.githubRequest('POST', 
                `/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${issueId}/comments`, 
                commentData);
            
            // 发送成功
            this.showNotification('消息发送成功！', 'success');
            this.updateSendStatus('发送成功', 'success');
            messageInput.value = '';
            document.getElementById('charCount').textContent = '0';
            
            // 3秒后重置状态
            setTimeout(() => {
                this.updateSendStatus('准备发送', 'ready');
                this.isSending = false;
            }, 3000);
            
        } catch (error) {
            console.error('发送失败:', error);
            this.showNotification('发送失败: ' + error.message, 'error');
            this.updateSendStatus('发送失败', 'error');
            this.isSending = false;
        }
    }

    // 查找用户Issue
    async findUserIssue(userId) {
        try {
            // 搜索包含用户ID的Issue
            const searchQuery = encodeURIComponent(`${userId} in:title repo:${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}`);
            const response = await this.githubRequest('GET', 
                `/search/issues?q=${searchQuery}`);
            
            if (response && response.items && response.items.length > 0) {
                return response.items[0].number;
            }
            
            return null;
        } catch (error) {
            console.error('查找用户失败:', error);
            return null;
        }
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
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API错误: ${response.status} - ${errorText}`);
        }
        
        if (method !== 'DELETE') {
            return await response.json();
        }
        
        return true;
    }

    // 简单加密
    encryptMessage(text) {
        const key = CONFIG.ENCRYPT_KEY;
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        return btoa(result);
    }

    // 更新发送状态
    updateSendStatus(status, type = 'info') {
        const statusElement = document.getElementById('sendStatus');
        const sendBtn = document.getElementById('sendBtn');
        
        statusElement.textContent = status;
        statusElement.className = `status-text status-${type}`;
        
        if (type === 'sending') {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
        } else if (type === 'success') {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-check"></i> 发送成功';
        } else if (type === 'error') {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送匿名消息';
        } else {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送匿名消息';
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
}

// 全局实例
const sendPage = new SendPage();

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    sendPage.init();
    
    // 绑定发送按钮
    document.getElementById('sendBtn').addEventListener('click', () => {
        sendPage.sendMessage();
    });
    
    // 回车发送
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            sendPage.sendMessage();
        }
    });
});

// 插入表情
function insertEmoji(emoji) {
    const textarea = document.getElementById('messageInput');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    textarea.focus();
    
    // 更新字符计数
    document.getElementById('charCount').textContent = textarea.value.length;
}

// 清空消息
function clearMessage() {
    if (confirm('确定要清空消息内容吗？')) {
        document.getElementById('messageInput').value = '';
        document.getElementById('charCount').textContent = '0';
        sendPage.updateSendStatus('准备发送', 'ready');
    }
}