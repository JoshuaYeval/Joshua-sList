import { parseCsvLine, buildCsv } from '../utils/csv.js';
import { isPhrase, normalizePos } from '../utils/words.js';
import { sleep, formatDate as formatTimestamp } from '../utils/format.js';

const { ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;

export const useWordbook = () => {
    const wordList = ref([]);
    const newWord = reactive({ english: '', pos: '', chinese: '', example: '' });
    const searchQuery = ref('');
    const viewMode = ref('card');
    const showSettings = ref(false);
    const showQuizSetup = ref(false);
    const showImportModal = ref(false);
    const showAiFillModal = ref(false);
    const showEditModal = ref(false);
    const showSortMenu = ref(false);
    const isMasked = ref(false);
    const isTranslating = ref(false);

    const editingWord = reactive({ id: '', english: '', pos: '', chinese: '', example: '' });

    const importMode = ref('merge');
    const importFileInput = ref(null);
    const importProgress = reactive({ show: false, message: '', current: 0, total: 0 });
    const aiFillProgress = reactive({ show: false, message: '', current: 0, total: 0 });

    const sortBy = ref('timestamp');
    const sortOrder = ref('desc');

    const config = reactive({
        engine: 'free',
        apiKey: '',
        baseUrl: '',
        model: 'gpt-3.5-turbo',
        defaultDir: '',
        display: {
            pos: true,
            meaning: true,
            example: true,
            date: true
        }
    });

    const parseSimpleYaml = (text) => {
        const result = {};
        text.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf(':');
            if (idx === -1) return;
            const key = trimmed.slice(0, idx).trim();
            const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (key) result[key] = value;
        });
        return result;
    };

    const loadApiConfigFile = async () => {
        const candidates = ['setting.yaml', 'api.json', 'api.yaml', 'api.yml'];
        for (const name of candidates) {
            try {
                const response = await fetch(name, { cache: 'no-store' });
                if (!response.ok) continue;

                // Stop if response is HTML (Soft 404)
                const cType = response.headers.get('content-type');
                if (cType && cType.toLowerCase().includes('text/html')) continue;

                const text = await response.text();
                // Double check content
                if (text.trim().startsWith('<')) continue;

                const parsed = name.endsWith('.json') ? JSON.parse(text) : parseSimpleYaml(text);
                if (parsed.baseUrl) config.baseUrl = parsed.baseUrl;
                if (parsed.apiKey) config.apiKey = parsed.apiKey;
                if (parsed.model) config.model = parsed.model;
                if (parsed.engine) config.engine = parsed.engine;
                if (parsed.defaultDir) config.defaultDir = parsed.defaultDir;
                else if (parsed.apiKey || parsed.baseUrl) config.engine = 'ai';
                return true;
            } catch (error) {
                console.warn('读取本地 API 配置失败', name, error);
            }
        }
        return false;
    };

    const isNewWordPhrase = computed(() => isPhrase(newWord.english));

    const incompleteWords = computed(() => wordList.value.filter((word) => {
        const needsChinese = !word.chinese || !word.chinese.trim();
        const needsPos = !isPhrase(word.english) && (!word.pos || !word.pos.trim());
        const needsExample = !word.example || !word.example.trim();
        return needsChinese || needsPos || needsExample;
    }));

    const filteredList = computed(() => {
        let list = wordList.value;

        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            list = list.filter((word) => {
                const en = (word.english || '').toLowerCase();
                const zh = word.chinese || '';
                const ex = (word.example || '').toLowerCase();
                const pos = (word.pos || '').toLowerCase();
                return en.includes(q) || zh.includes(searchQuery.value) || ex.includes(q) || pos.includes(q);
            });
        }

        return [...list].sort((a, b) => {
            let aVal;
            let bVal;

            switch (sortBy.value) {
                case 'english':
                    aVal = (a.english || '').toLowerCase();
                    bVal = (b.english || '').toLowerCase();
                    break;
                case 'pos':
                    aVal = (a.pos || '').toLowerCase();
                    bVal = (b.pos || '').toLowerCase();
                    break;
                case 'timestamp':
                default:
                    aVal = a.timestamp || 0;
                    bVal = b.timestamp || 0;
                    break;
            }

            if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
            return 0;
        });
    });

    const setSortBy = (field, order) => {
        sortBy.value = field;
        sortOrder.value = order;
        showSortMenu.value = false;
    };

    const toggleMask = () => {
        if (!config.display.meaning) return;
        isMasked.value = !isMasked.value;
    };

    const speak = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = /[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const addWord = () => {
        const english = newWord.english.trim();
        if (!english) return;

        const pos = isPhrase(english) ? '' : normalizePos(newWord.pos);

        wordList.value.unshift({
            id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            english,
            pos,
            chinese: newWord.chinese.trim(),
            example: newWord.example.trim(),
            timestamp: Date.now()
        });

        newWord.english = '';
        newWord.pos = '';
        newWord.chinese = '';
        newWord.example = '';
    };

    const deleteWord = (id) => {
        if (confirm('Delete this word?')) {
            wordList.value = wordList.value.filter((word) => word.id !== id);
        }
    };

    const openEditModal = (word) => {
        Object.assign(editingWord, { ...word });
        showEditModal.value = true;
    };

    const saveEdit = () => {
        const index = wordList.value.findIndex(w => w.id === editingWord.id);
        if (index !== -1) {
            wordList.value[index] = {
                ...wordList.value[index],
                english: editingWord.english.trim(),
                pos: isPhrase(editingWord.english) ? '' : normalizePos(editingWord.pos),
                chinese: editingWord.chinese.trim(),
                example: editingWord.example.trim()
            };
        }
        showEditModal.value = false;
    };

    const translate = async () => {
        if (!newWord.english) return;
        isTranslating.value = true;

        try {
            if (config.engine === 'ai' && config.apiKey) {
                await aiTranslate();
            } else {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(newWord.english)}&langpair=en|zh-CN`);
                const data = await res.json();
                newWord.chinese = data.responseData?.translatedText || '';
            }
        } catch (error) {
            alert('Translation failed');
        } finally {
            isTranslating.value = false;
        }
    };

    const aiTranslate = async () => {
        const english = newWord.english.trim();
        const prompt = [
            'For the English input, output ONLY valid JSON (no markdown).',
            'Rules:',
            '- "pos" must be one of ["n.","v.","adj.","adv.","pron.","prep.","conj"] or "" when the input is a phrase.',
            '- "meaning" must be a concise Simplified Chinese meaning.',
            '- "example" must be a short English sentence using the input.',
            'Return format: {"pos":"","meaning":"","example":""}',
            `Input: "${english}"`
        ].join('\n');

        const url = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();

        try {
            const raw = data?.choices?.[0]?.message?.content || '';
            const json = JSON.parse(raw.replace(/```json|```/g, '').trim());

            newWord.chinese = json.meaning || '';
            newWord.example = json.example || '';
            newWord.pos = isPhrase(english) ? '' : normalizePos(json.pos);
        } catch (error) {
            newWord.chinese = data?.choices?.[0]?.message?.content || '';
        }
    };

    const handleEnter = () => {
        if (newWord.english && !newWord.chinese) {
            translate();
        } else {
            addWord();
        }
    };

    const exportCSV = () => {
        const csv = buildCsv(wordList.value);
        const anchor = document.createElement('a');
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        anchor.download = 'joshua_list.csv';
        anchor.click();
    };

    const importFromText = (text, modeOverride, { silent = false } = {}) => {
        const mode = modeOverride || importMode.value;
        const lines = text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim() !== '');
        if (lines.length < 2) {
            if (!silent) alert('CSV 为空或格式不正确');
            return { imported: 0, skipped: 0 };
        }

        const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase().replace(/^\uFEFF/, ''));
        const findIdx = (names) => {
            for (const name of names) {
                const idx = header.indexOf(name);
                if (idx >= 0) return idx;
            }
            return -1;
        };

        const idxEnglish = findIdx(['english', 'en', 'word', '单词']);
        const idxPos = findIdx(['partofspeech', 'pos', '词性']);
        const idxMeaning = findIdx(['meaning', 'chinese', '释义']);
        const idxExample = findIdx(['example', '例句']);
        const idxDate = findIdx(['date', 'timestamp', '时间']);

        if (!silent) {
            importProgress.show = true;
            importProgress.message = '正在处理数据...';
            importProgress.current = 0;
            importProgress.total = lines.length - 1;
        }

        if (mode === 'replace') {
            wordList.value = [];
        }

        let imported = 0;
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!silent) importProgress.current = i;
            const cols = parseCsvLine(lines[i]);
            const english = (cols[idxEnglish >= 0 ? idxEnglish : 0] || '').trim();
            if (!english) {
                skipped++;
                continue;
            }

            if (mode === 'merge' && wordList.value.some((word) => word.english?.toLowerCase() === english.toLowerCase())) {
                skipped++;
                continue;
            }

            const pos = isPhrase(english) ? '' : normalizePos(cols[idxPos] || '');
            const chinese = (cols[idxMeaning >= 0 ? idxMeaning : 1] || '').trim();
            const example = (cols[idxExample >= 0 ? idxExample : 2] || '').trim();

            let timestamp = Date.now();
            const dateStr = (cols[idxDate] || '').trim();
            if (dateStr) {
                const parsedDate = Date.parse(dateStr);
                if (!Number.isNaN(parsedDate)) timestamp = parsedDate;
            }

            wordList.value.push({
                id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
                english,
                pos,
                chinese,
                example,
                timestamp
            });
            imported++;
        }

        if (!silent) {
            setTimeout(() => {
                importProgress.show = false;
                showImportModal.value = false;
                alert(`导入完成!\n成功导入: ${imported} 个单词\n跳过重复: ${skipped} 个单词`);
            }, 400);
        }

        return { imported, skipped };
    };

    const handleImportFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            importFromText(String(ev.target?.result || ''), importMode.value);
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const buildCsvPayload = () => buildCsv(wordList.value);

    const startAiFill = async () => {
        if (!config.apiKey || config.engine !== 'ai') {
            alert('请先在设置中配置 AI API');
            return;
        }

        const targets = incompleteWords.value;
        if (!targets.length) {
            alert('没有需要补充的单词');
            return;
        }

        aiFillProgress.show = true;
        aiFillProgress.total = targets.length;
        aiFillProgress.current = 0;

        // Batch processing to reduce API calls
        const BATCH_SIZE = 10;
        const batches = [];
        for (let i = 0; i < targets.length; i += BATCH_SIZE) {
            batches.push(targets.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            aiFillProgress.message = `正在批量处理 ${batch.map(w => w.english).join(', ')}...`;
            try {
                await fillBatchWithAI(batch);
                // Rate limit protection
                await sleep(500); 
            } catch (error) {
                console.error('AI 批量处理失败:', error);
            }
            aiFillProgress.current += batch.length;
        }

        setTimeout(() => {
            aiFillProgress.show = false;
            showAiFillModal.value = false;
            alert(`AI 补充完成!\n处理了 ${targets.length} 个单词`);
        }, 400);
    };

    const fillBatchWithAI = async (words) => {
        const payload = words.map(w => ({
            id: w.id,
            english: w.english,
            context: `${w.pos||''} ${w.chinese||''} ${w.example||''}`.trim()
        }));

        const prompt = [
            'You are a vocabulary assistant. Output ONLY valid JSON array (no markdown).',
            'Task: Complete missing fields for the following words.',
            'Rules:',
            '- "pos": n./v./adj./adv./pron./prep./conj. or "" if phrase (has spaces).',
            '- "meaning": Concise Simplified Chinese meaning.',
            '- "example": Short English sentence containing the word.',
            '- Use existing data if available/correct, otherwise generate.',
            'Return format: [{"id":"...","pos":"...","meaning":"...","example":"..."}, ...]',
            `Input Array: ${JSON.stringify(payload)}`
        ].join('\n');

        const url = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();

        try {
            const raw = data?.choices?.[0]?.message?.content || '';
            const cleanRaw = raw.replace(/```json|```/g, '').trim();
            let jsonArray = JSON.parse(cleanRaw);
            
            if (!Array.isArray(jsonArray)) {
                // formatting fallback?
                console.warn('AI did not return an array');
                return;
            }

            for (const item of jsonArray) {
                const targetWord = words.find(w => w.id === item.id);
                if (targetWord) {
                    if (item.meaning && (!targetWord.chinese || !targetWord.chinese.trim())) targetWord.chinese = item.meaning;
                    if (item.example && (!targetWord.example || !targetWord.example.trim())) targetWord.example = item.example;
                    if (item.pos && !isPhrase(targetWord.english) && (!targetWord.pos || !targetWord.pos.trim())) targetWord.pos = normalizePos(item.pos);
                }
            }
        } catch (error) {
            console.error('无法解析 AI 响应', error);
        }
    };
    
    // Kept for single manual translation if needed, but not used by bulk
    const fillWordWithAI = async (word) => { return fillBatchWithAI([word]); };

    const startQuizSetup = () => {
        if (!wordList.value.length) {
            alert('先添加一些单词吧！');
            return;
        }
        showQuizSetup.value = true;
    };

    const saveConfig = () => {
        localStorage.setItem('jl_config', JSON.stringify(config));
        if (!config.display.meaning) {
            isMasked.value = false;
        }
        showSettings.value = false;
    };

    const handleClickOutside = (event) => {
        if (!showSortMenu.value) return;
        if (event.target.closest('[data-sort-menu]')) return;
        showSortMenu.value = false;
    };

    watch(wordList, (value) => localStorage.setItem('jl_data', JSON.stringify(value)), { deep: true });

    watch(() => newWord.english, (english) => {
        if (isPhrase(english)) newWord.pos = '';
    });

    watch(isMasked, (value) => localStorage.setItem('jl_masked', value ? '1' : '0'));

    watch([sortBy, sortOrder], ([by, order]) => {
        localStorage.setItem('jl_sort', JSON.stringify({ by, order }));
    });

    onMounted(async () => {
        const savedWords = localStorage.getItem('jl_data');
        if (savedWords) {
            try {
                const parsed = JSON.parse(savedWords);
                if (Array.isArray(parsed)) {
                    wordList.value = parsed.map((word) => ({ pos: '', example: '', ...word }));
                }
            } catch (error) {
                console.error('Failed to load saved data:', error);
            }
        }

        const savedConfig = localStorage.getItem('jl_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                Object.assign(config, parsed || {});
                config.display = {
                    pos: true,
                    meaning: true,
                    example: true,
                    date: true,
                    ...(parsed?.display || {})
                };
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }

        await loadApiConfigFile();

        const savedMask = localStorage.getItem('jl_masked');
        if (savedMask) isMasked.value = savedMask === '1';

        const savedSort = localStorage.getItem('jl_sort');
        if (savedSort) {
            try {
                const parsed = JSON.parse(savedSort);
                sortBy.value = parsed.by || 'timestamp';
                sortOrder.value = parsed.order || 'desc';
            } catch (error) {
                console.error('Failed to load sort preferences:', error);
            }
        }

        document.addEventListener('click', handleClickOutside);
    });

    onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside));

    return {
        wordList,
        newWord,
        searchQuery,
        viewMode,
        showSettings,
        showQuizSetup,
        showImportModal,
        showAiFillModal,
        showEditModal,
        showSortMenu,
        isMasked,
        isTranslating,
        importMode,
        importFileInput,
        importProgress,
        aiFillProgress,
        sortBy,
        sortOrder,
        config,
        filteredList,
        incompleteWords,
        isNewWordPhrase,
        editingWord,
        addWord,
        deleteWord,
        openEditModal,
        saveEdit,
        translate,
        handleEnter,
        speak,
        toggleMask,
        startQuizSetup,
        saveConfig,
        exportCSV,
        handleImportFile,
        startAiFill,
        setSortBy,
        importFromText,
        buildCsvPayload,
        formatDate: formatTimestamp
    };
};
