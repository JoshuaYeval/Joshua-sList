const { reactive, ref, computed, nextTick } = Vue;

export const useQuiz = (wordList, speak, showQuizSetup) => {
    const quiz = reactive({
        active: false,
        mode: 'zh2de',
        list: [],
        currentIdx: 0,
        currentWord: {},
        userInput: '',
        answered: false,
        isCorrect: false,
        score: 0,
        finished: false
    });

    const quizInput = ref(null);

    const loadQuestion = () => {
        quiz.currentWord = quiz.list[quiz.currentIdx] || {};
        quiz.userInput = '';
        quiz.answered = false;
        quiz.isCorrect = false;
        nextTick(() => quizInput.value?.focus());
    };

    const startQuiz = (mode) => {
        if (!wordList.value.length) {
            alert('先添加一些单词吧！');
            return;
        }
        showQuizSetup.value = false;
        quiz.active = true;
        quiz.mode = mode;
        quiz.finished = false;
        quiz.score = 0;
        quiz.currentIdx = 0;

        const shuffled = [...wordList.value].sort(() => 0.5 - Math.random());
        quiz.list = shuffled.slice(0, Math.min(20, shuffled.length));
        loadQuestion();
    };

    const checkAnswer = () => {
        if (!quiz.userInput.trim()) return;
        quiz.answered = true;

        const input = quiz.userInput.trim().toLowerCase();
        const target = quiz.mode === 'zh2de'
            ? String(quiz.currentWord.german || '').toLowerCase()
            : String(quiz.currentWord.chinese || '').toLowerCase();

        if (quiz.mode === 'zh2de') {
            quiz.isCorrect = input === target;
        } else {
            quiz.isCorrect = target.includes(input) || input.includes(target);
        }

        if (quiz.isCorrect) {
            quiz.score++;
            speak(quiz.mode === 'zh2de' ? 'Richtig' : '正确');
        } else {
            speak('Falsch');
        }
    };

    const nextQuestion = () => {
        if (quiz.currentIdx < quiz.list.length - 1) {
            quiz.currentIdx++;
            loadQuestion();
        } else {
            quiz.finished = true;
        }
    };

    const exitQuiz = () => {
        quiz.active = false;
    };

    const inputStatusClass = computed(() => {
        if (!quiz.answered) return 'border-transparent focus:border-primary';
        return quiz.isCorrect
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
    });

    const getQuizHint = () => {
        if (!quiz.currentWord.example || !quiz.currentWord.german) return '';
        try {
            // Escape special regex characters to prevent syntax errors in RegExp
            const escaped = quiz.currentWord.german.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'gi');
            return quiz.currentWord.example.replace(re, '_____');
        } catch (e) {
            return quiz.currentWord.example;
        }
    };

    return { quiz, quizInput, startQuiz, checkAnswer, nextQuestion, exitQuiz, inputStatusClass, getQuizHint };
};
