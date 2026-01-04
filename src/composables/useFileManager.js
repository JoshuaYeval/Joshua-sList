import { uuid, formatFileSize, formatRelativeTime } from '../utils/format.js';

const { ref, reactive, computed, watch } = Vue;

export const useFileManager = (wordList, importFromText, buildCsvPayload) => {
    const activeList = ref({ name: '', handle: null, lastModified: null, size: null });
    const localFiles = ref([]);
    const directoryState = reactive({
        handle: null,
        name: '',
        isLoading: false,
        lastLoaded: null,
        fileCount: 0
    });

    const fileFilterQuery = ref('');
    const filteredLocalFiles = computed(() => {
        const query = fileFilterQuery.value.trim().toLowerCase();
        if (!query) return localFiles.value;
        return localFiles.value.filter((file) => file.name.toLowerCase().includes(query));
    });

    const visibleFileCount = ref(50);
    const visibleFiles = computed(() => filteredLocalFiles.value.slice(0, visibleFileCount.value));

    const folderStatusText = computed(() => {
        if (!directoryState.handle) return '尚未选择文件夹';
        if (directoryState.isLoading) return '正在扫描...';
        if (!directoryState.lastLoaded) return '已授权，等待刷新';
        return `上次刷新 ${formatRelativeTime(directoryState.lastLoaded)}`;
    });

    const fileCache = new Map();
    const CACHE_DURATION = 5 * 60 * 1000;

    watch(fileFilterQuery, () => {
        visibleFileCount.value = 50;
    });

    const ensureDirectoryPermission = async (handle, mode = 'readwrite') => {
        if (!handle?.queryPermission || !handle?.requestPermission) return true;
        const opts = { mode };
        const status = await handle.queryPermission(opts);
        if (status === 'granted') return true;
        const requested = await handle.requestPermission(opts);
        return requested === 'granted';
    };

    const populateMetadata = async (files) => {
        const chunkSize = 12;
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (file) => {
                try {
                    const blob = await file.handle.getFile();
                    file.size = blob.size;
                    file.modified = blob.lastModified;
                } catch (error) {
                    console.warn('无法读取文件信息', file.name, error);
                }
            }));
            localFiles.value = [...files];
            if (typeof requestAnimationFrame === 'function') {
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
        }
    };

    const loadDirectoryEntries = async ({ silent = false, forceRefresh = false } = {}) => {
        if (!directoryState.handle) return;

        const cacheKey = directoryState.handle.name || 'default';
        const now = Date.now();
        if (!forceRefresh && fileCache.has(cacheKey)) {
            const cached = fileCache.get(cacheKey);
            if (now - cached.timestamp < CACHE_DURATION) {
                localFiles.value = [...cached.files];
                directoryState.fileCount = cached.files.length;
                directoryState.lastLoaded = cached.timestamp;
                return;
            }
        }

        directoryState.isLoading = true;
        if (!silent) localFiles.value = [];

        const collected = [];
        let index = 0;

        try {
            for await (const entry of directoryState.handle.values()) {
                if (entry.kind !== 'file') continue;
                if (!entry.name.toLowerCase().endsWith('.csv')) continue;
                collected.push({
                    id: `${entry.name}-${index++}-${uuid()}`,
                    name: entry.name,
                    handle: entry,
                    size: null,
                    modified: null
                });
            }

            collected.sort((a, b) => a.name.localeCompare(b.name));
            await populateMetadata(collected);
            directoryState.fileCount = collected.length;
            directoryState.lastLoaded = now;
            localFiles.value = [...collected];
            fileCache.set(cacheKey, { files: [...collected], timestamp: now });
        } catch (error) {
            console.error('读取文件夹失败:', error);
            alert('读取文件夹失败: ' + error.message);
        } finally {
            directoryState.isLoading = false;
        }
    };

    const openLocalFolder = async () => {
        if (!window.showDirectoryPicker) {
            alert('当前浏览器不支持文件夹授权');
            return;
        }
        try {
            const dirHandle = await window.showDirectoryPicker();
            const granted = await ensureDirectoryPermission(dirHandle, 'readwrite');
            if (!granted) {
                alert('需要读写权限才能加载文件夹');
                return;
            }
            directoryState.handle = dirHandle;
            directoryState.name = dirHandle.name || '未命名文件夹';
            fileFilterQuery.value = '';
            await loadDirectoryEntries();
        } catch (error) {
            if (error?.name !== 'AbortError') console.error(error);
        }
    };

    const openLocalFile = async () => {
        if (!window.showOpenFilePicker) {
            alert('当前浏览器不支持文件选择');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }]
            });
            if (!handle) return;
            const record = { id: uuid(), name: handle.name, handle, size: null, modified: null };
            const file = await handle.getFile();
            record.size = file.size;
            record.modified = file.lastModified;
            await loadLocalFile(record);
        } catch (error) {
            if (error?.name !== 'AbortError') console.error(error);
        }
    };

    const loadLocalFile = async (entry) => {
        const handle = entry?.handle || entry;
        if (!handle) return;
        try {
            const file = await handle.getFile();
            const text = await file.text();
            activeList.value = {
                name: entry?.name || handle.name,
                handle,
                lastModified: file.lastModified,
                size: file.size
            };
            importFromText(text, 'replace', { silent: true });
        } catch (error) {
            console.error('读取文件失败:', error);
            alert('读取文件失败: ' + error.message);
        }
    };

    const saveToLocal = async () => {
        if (!activeList.value.handle) {
            alert('请选择一个 CSV 文件后再保存');
            return;
        }
        try {
            const writable = await activeList.value.handle.createWritable();
            await writable.write(buildCsvPayload());
            await writable.close();
            alert('已成功保存到: ' + activeList.value.name);
            if (directoryState.handle) {
                await loadDirectoryEntries({ silent: true, forceRefresh: true });
            }
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    };

    const refreshLocalFiles = async () => {
        if (!directoryState.handle) {
            await openLocalFolder();
            return;
        }
        await loadDirectoryEntries({ silent: true, forceRefresh: true });
    };

    const loadMoreFiles = () => {
        const total = filteredLocalFiles.value.length;
        if (visibleFileCount.value < total) {
            visibleFileCount.value = Math.min(visibleFileCount.value + 50, total);
        }
    };

    const handleFileScroll = (event) => {
        const el = event.target;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
            loadMoreFiles();
        }
    };

    const formatFileMeta = (file) => {
        const segments = [];
        if (file.size != null) segments.push(formatFileSize(file.size));
        if (file.modified) segments.push(formatRelativeTime(file.modified));
        return segments.join(' · ');
    };

    return {
        activeList,
        localFiles,
        directoryState,
        fileFilterQuery,
        filteredLocalFiles,
        visibleFiles,
        visibleFileCount,
        folderStatusText,
        openLocalFolder,
        openLocalFile,
        loadLocalFile,
        saveToLocal,
        refreshLocalFiles,
        loadMoreFiles,
        handleFileScroll,
        formatFileMeta
    };
};
