import { useTheme } from './composables/useTheme.js';
import { useWordbook } from './composables/useWordbook.js';
import { useQuiz } from './composables/useQuiz.js';
import { useFileManager } from './composables/useFileManager.js';
import { parseCsvLine } from './utils/csv.js'; 

const { createApp, reactive, ref } = Vue;

createApp({
    setup() {
        const theme = useTheme();
        const wordbook = useWordbook();
        const {
            wordList,
            showQuizSetup,
            speak,
            importFromText,
            buildCsvPayload,
            ...wordbookExpose
        } = wordbook;

        const quizApi = useQuiz(wordList, speak, showQuizSetup);
        const fileManager = useFileManager(wordList, importFromText, buildCsvPayload);

        const quizConfig = reactive({
            useAllLists: false,
            loading: false,
            progress: ''
        });

        const startQuizWrapped = async (mode) => {
            if (quizConfig.loading) return;
            
            if (quizConfig.useAllLists) {
                if (!fileManager.directoryState.handle) {
                    alert('请先选择一个文件夹以使用"所有列表"模式');
                    return;
                }
                
                quizConfig.loading = true;
                quizConfig.progress = '正在读取文件...';
                
                try {
                    const allFileContents = await fileManager.readAllFiles((cur, total) => {
                        quizConfig.progress = `加载文件 ${cur}/${total}`;
                    });

                    quizConfig.progress = '正在解析数据...';
                    // Allow UI update
                    await new Promise(r => setTimeout(r, 50));

                    let totalWords = [];
                    for (const f of allFileContents) {
                        const lines = f.content.split(/\r?\n/);
                        // Skip header usually
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;
                            const cols = parseCsvLine(line);
                            if (cols.length >= 1) {
                                totalWords.push({
                                    id: `${f.name}-${i}`,
                                    english: cols[0],
                                    pos: cols[1] || '',
                                    chinese: cols[2] || '',
                                    example: cols[3] || '',
                                    timestamp: 0 
                                });
                            }
                        }
                    }

                    if (totalWords.length === 0) {
                        alert('未找到任何单词');
                    } else {
                        quizApi.startQuiz(mode, totalWords);
                    }

                } catch (e) {
                    console.error(e);
                    alert('加载所有列表失败: ' + e.message);
                } finally {
                    quizConfig.loading = false;
                    quizConfig.progress = '';
                }
            } else {
                quizApi.startQuiz(mode);
            }
        };

        const exportToPrint = () => {
            const list = wordbook.filteredList.value;
            if (!list.length) {
                alert('没有可导出的单词');
                return;
            }

            const win = window.open('', '_blank');
            if (!win) return;

            const rows = list.map(w => `
                <tr>
                    <td><b>${w.english}</b> <span class="pos">${w.pos || ''}</span></td>
                    <td>${w.chinese}</td>
                    <td class="example">${w.example || ''}</td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Vocabulary List Export</title>
                    <style>
                        body { font-family: sans-serif; line-height: 1.5; color: #333; }
                        table { width: 100%; border-collapse: collapse; }
                        td, th { border-bottom: 1px solid #ddd; padding: 12px 8px; vertical-align: top; }
                        .pos { color: #666; font-size: 0.85em; font-style: italic; margin-left: 8px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
                        .example { color: #555; font-style: italic; font-size: 0.9em; }
                        @media print {
                            body { font-size: 10pt; }
                            a { text-decoration: none; color: inherit; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Vocabulary List</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align:left; width: 30%">Word</th>
                                <th style="text-align:left; width: 30%">Meaning</th>
                                <th style="text-align:left; width: 40%">Example</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                    <script>
                        window.onload = () => window.print();
                    </script>
                </body>
                </html>
            `;

            win.document.write(html);
            win.document.close();
        };

        return {
            ...theme,
            wordList,
            showQuizSetup,
            speak,
            ...wordbookExpose,
            ...quizApi,
            startQuiz: startQuizWrapped,
            quizConfig,
            exportToPrint,
            ...fileManager
        };
    }
}).mount('#app');
