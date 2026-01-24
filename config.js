// GitHub配置 - 用户需要修改这些值
const CONFIG = {
  // 修改为你的GitHub用户名和仓库名
  REPO_OWNER: 'sapchen',
  REPO_NAME: 'whisper-box',
  
  // 生成GitHub Token: https://github.com/settings/tokens
  // 需要 repo 权限
  GITHUB_TOKEN: '', // 留空，用户自行填入
  
  // 应用设置
  APP_TITLE: 'CyberWhisper',
  APP_DESCRIPTION: '基于GitHub Issues的匿名悄悄话',
  
  // 消息设置
  MAX_MESSAGE_LENGTH: 500,
  MESSAGE_LIMIT: 50, // 最多显示多少条消息
  AUTO_REFRESH: 5000, // 自动刷新间隔(ms)
  
  // 加密密钥（前端简单混淆）
  ENCRYPT_KEY: 'cyber-whisper-2026'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}