const { reactive, ref, computed, nextTick } = Vue;

export const useQuiz = (wordList, speak, showQuizSetup) => {
    const quiz = reactive({
        active: false,
        mode: 'zh2en',
        list: [],
        currentIdx: 0,
        currentWord: {},
        currentChoices: [],
        userInput: '',
        answered: false,
        isCorrect: false,
        score: 0,
        finished: false,
        isFlipped: false
    });

    const quizInput = ref(null);

    const generateChoices = () => {
        // Simple distractor generation
        if (!quiz.list || quiz.list.length === 0) return [];
        
        const correct = quiz.currentWord;
        // Avoid duplicates in choices
        const choices = [correct];
        
        // Try to find 3 distractors
        let attempts = 0;
        while (choices.length < 4 && attempts < 100) {
            attempts++;
            const rnd = quiz.list[Math.floor(Math.random() * quiz.list.length)];
            if (!choices.find(c => c.id === rnd.id) && rnd.chinese) {
                choices.push(rnd);
            }
        }
        
        // Shuffle
        return choices.sort(() => 0.5 - Math.random());
    };

    const loadQuestion = () => {
        quiz.currentWord = quiz.list[quiz.currentIdx] || {};
        quiz.userInput = '';
        quiz.answered = false;
        quiz.isCorrect = false;
        quiz.isFlipped = false;
        
        if (quiz.mode === 'en2zh-choice') {
            quiz.currentChoices = generateChoices();
        }

        nextTick(() => {
             if (quiz.mode !== 'flashcard' && quiz.mode !== 'en2zh-choice') quizInput.value?.focus();
        });
    };

    const startQuiz = (mode, customList = null) => {
        const sourceList = customList || wordList.value;
        if (!sourceList.length) {
            alert('列表为空，无法开始');
            return;
        }
        showQuizSetup.value = false;
        quiz.active = true;
        quiz.mode = mode;
        quiz.finished = false;
        quiz.score = 0;
        quiz.currentIdx = 0;

        const shuffled = [...sourceList].sort(() => 0.5 - Math.random());
        // User requested full list for every test
        quiz.list = shuffled;
        loadQuestion();
    };

    const flipCard = () => {
        quiz.isFlipped = !quiz.isFlipped;
    };

    const markFlashcard = (known) => {
        quiz.answered = true;
        quiz.isCorrect = known;
        if (known) {
            quiz.score++;
        }
        // Small delay to show result? Or instant?
        // Instant next question is better flow for flashcards
        setTimeout(() => {
            nextQuestion();
        }, 200);
    };

    const checkAnswer = (choiceAnswer = null) => {
        if (quiz.mode === 'flashcard') return; 
        
        if (quiz.mode === 'en2zh-choice') {
            if (!choiceAnswer) return;
            quiz.answered = true;
            // Store the ID of the selected answer so we can highlight it
            quiz.userInput = choiceAnswer.id;
            quiz.isCorrect = choiceAnswer.id === quiz.currentWord.id;
        } else {
            if (!quiz.userInput.trim()) return;
            quiz.answered = true;

            const input = quiz.userInput.trim().toLowerCase();
            const target = quiz.mode === 'zh2en'
                ? String(quiz.currentWord.english || '').toLowerCase()
                : String(quiz.currentWord.chinese || '').toLowerCase();

            if (quiz.mode === 'zh2en') {
                quiz.isCorrect = input === target;
            } else {
                quiz.isCorrect = target.includes(input) || input.includes(target);
            }
        }

        if (quiz.isCorrect) {
            quiz.score++;
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
        if (!quiz.currentWord.example || !quiz.currentWord.english) return '';
        try {
            // Escape special regex characters to prevent syntax errors in RegExp
            const escaped = quiz.currentWord.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'gi');
            return quiz.currentWord.example.replace(re, '_____');
        } catch (e) {
            return quiz.currentWord.example;
        }
    };

    const getChoiceClass = (choice) => {
        if (!quiz.answered) return 'border-transparent bg-black/5 dark:bg-white/5 hover:border-primary hover:text-primary cursor-pointer';
        
        const isCorrectChoice = choice.id === quiz.currentWord.id;
        const isSelected = quiz.userInput === choice.id;

        if (isCorrectChoice) {
            return 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
        }
        
        if (isSelected && !quiz.isCorrect) {
            return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
        }
        
        return 'opacity-40 border-transparent cursor-not-allowed';
    };

    return { quiz, quizInput, startQuiz, checkAnswer, nextQuestion, exitQuiz, inputStatusClass, getQuizHint, flipCard, markFlashcard, getChoiceClass };
};
