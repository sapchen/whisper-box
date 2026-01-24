// qrcode-generator.js - 简单QRCode生成器
function generateQRCode(elementId, text, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('找不到元素:', elementId);
        return;
    }
    
    element.innerHTML = '';
    
    const size = options.size || 200;
    const darkColor = options.darkColor || '#00ff88';
    const lightColor = options.lightColor || '#141420';
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.cssText = `
        display: block;
        margin: 0 auto;
        background: ${lightColor};
        padding: 10px;
        border-radius: 8px;
        border: 2px solid ${darkColor};
    `;
    
    element.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // 绘制背景
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);
    
    // 简单二维码生成逻辑
    drawQRCode(ctx, text, size, darkColor);
}

// 绘制二维码的核心逻辑
function drawQRCode(ctx, text, size, color) {
    ctx.fillStyle = color;
    
    // 1. 绘制定位标记（三个大正方形）
    const markerSize = size * 0.2;
    const padding = size * 0.1;
    
    // 左上角
    drawPositionMarker(ctx, padding, padding, markerSize, color);
    // 右上角
    drawPositionMarker(ctx, size - padding - markerSize, padding, markerSize, color);
    // 左下角
    drawPositionMarker(ctx, padding, size - padding - markerSize, markerSize, color);
    
    // 2. 生成基于文本的数据点
    const dataPoints = generateDataPoints(text, 15); // 15x15的数据网格
    
    const cellSize = (size - 2 * padding - 2 * markerSize) / 15;
    const dataStartX = padding + markerSize;
    const dataStartY = padding + markerSize;
    
    // 3. 绘制数据点
    for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
            if (dataPoints[y][x]) {
                ctx.fillRect(
                    dataStartX + x * cellSize,
                    dataStartY + y * cellSize,
                    cellSize - 1,
                    cellSize - 1
                );
            }
        }
    }
    
    // 4. 添加边框
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, size - 10, size - 10);
}

// 绘制定位标记
function drawPositionMarker(ctx, x, y, size, color) {
    // 外框
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    
    // 内框
    const innerPadding = size * 0.2;
    const innerSize = size - 2 * innerPadding;
    ctx.fillStyle = '#141420';
    ctx.fillRect(x + innerPadding, y + innerPadding, innerSize, innerSize);
    
    // 中心点
    const centerSize = size * 0.3;
    const centerX = x + (size - centerSize) / 2;
    const centerY = y + (size - centerSize) / 2;
    ctx.fillStyle = color;
    ctx.fillRect(centerX, centerY, centerSize, centerSize);
}

// 生成数据点（基于文本的简单算法）
function generateDataPoints(text, gridSize) {
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    
    // 使用文本哈希生成可重复的图案
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash; // 转换为32位整数
    }
    
    // 填充网格
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // 使用伪随机算法，确保每次相同文本生成相同图案
            const seed = (hash + x * 31 + y * 37) % 3;
            grid[y][x] = seed === 0;
        }
    }
    
    return grid;
}

// 导出给其他文件使用
window.QRCodeGenerator = { generateQRCode };