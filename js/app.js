// Конфиг
const CONFIG = {
    rewards: { easy: 0.5, medium: 1, hard: 1.5 },
    costs: { p5050: 2.5, poll: 1.5, skip: 5.0 }
};

const loader = new QuestionLoader();

const App = {
    state: {
        score: 3.0, // Стартовый бонус
        category: null,
        difficulty: 'medium',
        timeLimit: 30,
        questions: [],
        currentQIndex: 0,
        timerInterval: null,
        timeLeft: 0
    },

    init: async () => {
        const manifest = await loader.loadManifest();
        App.renderCategories(manifest.categories);
        App.updateUI();
    },

    // --- Навигация ---
    goToSettings: () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('screen-setup').classList.remove('hidden');
        document.getElementById('step-cat').classList.remove('hidden');
        document.getElementById('step-diff').classList.add('hidden');
    },

    goToHome: () => {
        location.reload(); // Простой сброс
    },

    nextSetupStep: (step) => {
        if (step === 'diff') {
            if (!App.state.category) return alert('Выберите категорию!');
            document.getElementById('step-cat').classList.add('hidden');
            document.getElementById('step-diff').classList.remove('hidden');
        }
    },

    // --- Выбор настроек ---
    renderCategories: (cats) => {
        const container = document.getElementById('categories-list');
        container.innerHTML = cats.map(c => `
            <button class="btn-select" onclick="App.selectCategory('${c.id}', this)">
                ${c.name}
            </button>
        `).join('');
    },

    selectCategory: (id, btn) => {
        App.state.category = id;
        document.querySelectorAll('#categories-list .btn-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    selectDiff: (diff, btn) => {
        App.state.difficulty = diff;
        document.querySelectorAll('.diff-selector .btn-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    selectTime: (sec, btn) => {
        App.state.timeLimit = sec;
        document.querySelectorAll('.time-selector .btn-mini').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    // --- Старт игры ---
    startGame: async () => {
        // Загружаем вопросы (chunk 1)
        const data = await loader.loadChunk(App.state.category, App.state.difficulty, 1);
        App.state.questions = data.sort(() => Math.random() - 0.5); // Перемешать
        App.state.currentQIndex = 0;

        document.getElementById('screen-setup').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');
        
        Game.loadQuestion();
    },

    updateUI: () => {
        document.getElementById('score').innerText = App.state.score.toFixed(1);
    }
};

const Game = {
    currentQ: null,
    isAnswered: false,

    loadQuestion: () => {
        Game.isAnswered = false;
        clearInterval(App.state.timerInterval);
        
        // Сброс UI ответов
        const q = App.state.questions[App.state.currentQIndex];
        Game.currentQ = q;

        // Тайпрайтер эффект для вопроса
        const qEl = document.getElementById('question-text');
        qEl.innerHTML = '';
        let i = 0;
        const txt = q.q;
        const typeTimer = setInterval(() => {
            qEl.innerHTML += txt.charAt(i);
            i++;
            if (i >= txt.length) clearInterval(typeTimer);
        }, 30);

        // Рендер ответов
        const ansArea = document.getElementById('answers-area');
        ansArea.innerHTML = '';
        q.options.forEach((opt, index) => {
            const btn = document.createElement('div');
            btn.className = 'answer-btn';
            btn.innerHTML = `<div class="vote-bar"></div><span class="ans-text">${opt}</span><span class="vote-percent"></span>`;
            btn.onclick = () => Game.checkAnswer(index, btn);
            ansArea.appendChild(btn);
        });

        Game.startTimer();
        Game.checkBalance(); // Обновить доступность подсказок
    },

    startTimer: () => {
        App.state.timeLeft = App.state.timeLimit;
        const pie = document.getElementById('timer-visual');
        
        App.state.timerInterval = setInterval(() => {
            App.state.timeLeft--;
            const percent = (App.state.timeLeft / App.state.timeLimit) * 100;
            pie.style.setProperty('--p', `${percent}%`);
            
            // Цвет меняется от зеленого к красному
            if (percent < 30) pie.style.color = 'var(--danger)';

            if (App.state.timeLeft <= 0) {
                Game.finishRound(false);
            }
        }, 1000);
    },

    checkAnswer: (index, btnEl) => {
        if (Game.isAnswered) return;
        Game.isAnswered = true;
        clearInterval(App.state.timerInterval);

        const isCorrect = index === Game.currentQ.correct;
        
        if (isCorrect) {
            btnEl.classList.add('correct');
            App.state.score += CONFIG.rewards[App.state.difficulty];
            Game.finishRound(true);
        } else {
            btnEl.classList.add('wrong');
            // Подсветка правильного
            const allBtns = document.querySelectorAll('.answer-btn');
            allBtns[Game.currentQ.correct].classList.add('correct');
            Game.finishRound(false);
        }
        App.updateUI();
    },

    finishRound: (win) => {
        setTimeout(() => {
            const modal = document.getElementById('modal-round');
            const title = document.getElementById('round-title');
            title.innerText = win ? "Превосходно!" : "Ошибка";
            title.style.color = win ? "var(--success)" : "var(--danger)";
            document.getElementById('round-score').innerText = App.state.score.toFixed(1);
            modal.classList.remove('hidden');
        }, 1000);
    },

    nextQuestion: () => {
        document.getElementById('modal-round').classList.add('hidden');
        App.state.currentQIndex++;
        if (App.state.currentQIndex >= App.state.questions.length) {
            alert("Демо вопросы закончились! Загрузи больше JSON файлов.");
            App.goToHome();
        } else {
            Game.loadQuestion();
        }
    },

    // --- ПОДСКАЗКИ ---
    
    checkBalance: () => {
        document.querySelectorAll('.lifeline').forEach(btn => {
            // Находим цену внутри кнопки (хардкод логика для примера)
            const type = btn.innerText.includes('50/50') ? 'p5050' : 
                         btn.innerText.includes('Люди') ? 'poll' : 'skip';
            if (App.state.score < CONFIG.costs[type]) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });
    },

    use5050: (btn) => {
        if (App.state.score < CONFIG.costs.p5050) return;
        App.state.score -= CONFIG.costs.p5050;
        btn.disabled = true;
        App.updateUI();

        const correct = Game.currentQ.correct;
        const allBtns = Array.from(document.querySelectorAll('.answer-btn'));
        const wrongIndices = allBtns.map((_, i) => i).filter(i => i !== correct);
        
        // Убрать 2 случайных неправильных
        wrongIndices.sort(() => Math.random() - 0.5);
        wrongIndices.slice(0, 2).forEach(i => {
            allBtns[i].classList.add('dimmed');
            allBtns[i].onclick = null;
        });
    },

    useSkip: (btn) => {
        if (App.state.score < CONFIG.costs.skip) return;
        App.state.score -= CONFIG.costs.skip;
        App.updateUI();
        Game.isAnswered = true; // Блокируем ввод
        clearInterval(App.state.timerInterval);
        
        // Показать правильный ответ и пройти дальше
        const allBtns = document.querySelectorAll('.answer-btn');
        allBtns[Game.currentQ.correct].classList.add('correct');
        setTimeout(() => Game.finishRound(true), 1000);
    },

    usePoll: (btn) => {
        if (App.state.score < CONFIG.costs.poll) return;
        App.state.score -= CONFIG.costs.poll;
        btn.disabled = true;
        App.updateUI();

        const correctIndex = Game.currentQ.correct;
        const optionsCount = 4;
        let votes = new Array(optionsCount).fill(0);
        let remaining = 100;

        // Симуляция: 90% шанс, что толпа права
        const isSmartCrowd = Math.random() < 0.9;
        
        if (isSmartCrowd) {
            // Правильному ответу от 35% до 80%
            const correctVotes = Math.floor(Math.random() * (80 - 35 + 1)) + 35;
            votes[correctIndex] = correctVotes;
            remaining -= correctVotes;
        } else {
            // Толпа ошибается, даем правильному мало
            const correctVotes = Math.floor(Math.random() * 20);
            votes[correctIndex] = correctVotes;
            remaining -= correctVotes;
        }

        // Распределяем остаток по другим
        for (let i = 0; i < optionsCount; i++) {
            if (i === correctIndex) continue;
            if (i === optionsCount - 1 && i !== correctIndex) {
                votes[i] = remaining; // Остатки последнему
            } else {
                // Случайный кусок от оставшегося
                let share = Math.floor(Math.random() * (remaining / 2));
                votes[i] = share;
                remaining -= share;
            }
        }

        // Визуализация
        const btns = document.querySelectorAll('.answer-btn');
        btns.forEach((b, i) => {
            const bar = b.querySelector('.vote-bar');
            const txt = b.querySelector('.vote-percent');
            
            bar.style.width = `${votes[i]}%`;
            txt.innerText = `${votes[i]}%`;
            txt.style.opacity = 1;
        });
    }
};

// Запуск
document.addEventListener('DOMContentLoaded', App.init);
