const { ref, watch, onMounted } = Vue;

const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark', !!dark);
    document.body?.setAttribute('theme-mode', dark ? 'dark' : 'light');
};

export const useTheme = () => {
    const isDarkMode = ref(false);

    onMounted(() => {
        const stored = localStorage.getItem('jl_theme');
        if (stored) {
            isDarkMode.value = stored === 'dark';
        } else {
            isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        applyTheme(isDarkMode.value);
    });

    watch(isDarkMode, (value) => {
        localStorage.setItem('jl_theme', value ? 'dark' : 'light');
        applyTheme(value);
    });

    const toggleDarkMode = () => {
        isDarkMode.value = !isDarkMode.value;
    };

    return { isDarkMode, toggleDarkMode };
};
