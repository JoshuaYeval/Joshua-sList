export const uuid = () => (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

export const sleep = (ms = 16) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) {
        size /= 1024;
        unitIdx++;
    }
    const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(precision)} ${units[unitIdx]}`;
};

export const formatRelativeTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 0) return '';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} 个月前`;
    return new Date(ts).toLocaleDateString();
};

export const escapeCsv = (value) => String(value ?? '').replace(/"/g, '""');

export const formatDate = (ts) => new Date(ts).toLocaleDateString();
