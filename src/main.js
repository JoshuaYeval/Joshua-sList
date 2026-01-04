import { useTheme } from './composables/useTheme.js';
import { useWordbook } from './composables/useWordbook.js';
import { useQuiz } from './composables/useQuiz.js';
import { useFileManager } from './composables/useFileManager.js';

const { createApp } = Vue;

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

        return {
            ...theme,
            wordList,
            showQuizSetup,
            speak,
            ...wordbookExpose,
            ...quizApi,
            ...fileManager
        };
    }
}).mount('#app');
