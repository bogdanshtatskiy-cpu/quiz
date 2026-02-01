const CONFIG = {
    rewards: { easy: 0.5, medium: 1.0, hard: 1.5 },
    costs: { p5050: 2.5, poll: 5.0, skip: 8.0 } // Новые цены
};

const loader = new QuestionLoader();

const App = {
    state: {
        score: 0,
        category: null,
        difficulty: 'medium',
        timeLimit: 30,
        questions: [],
        currentQ: 0,
        timer: null,
        timeLeft: 0,
        stats: { total: 0, correct: 0, wrong: 0 }
    },

    init: async () => {
        // Загрузка очков из памяти
        const savedScore = localStorage.getItem('brainflow_score');
        App.state.score = savedScore ? parseFloat(savedScore) : 0; // 0 если новый игрок
        
        const manifest = await loader.loadManifest();
        App.renderCats(manifest.categories);
        App.updateScoreUI();
    },

    saveScore: () => {
        localStorage.setItem('brainflow_score', App.state.score.toFixed(1));
    },

    // --- НАВИГАЦИЯ ---
    goToHome: () => App.switchScreen('screen-home'),
    
    goToCategories: () => {
        App.switchScreen('screen-categories');
    },

    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const target = document.getElementById(id);
        target.classList.remove('hidden');
        // Небольшая задержка для плавности CSS
        setTimeout(() => target.classList.add('active'), 10);
    },

    // --- ВЫБОР ---
    renderCats: (cats) => {
        const html = cats.map(c => `
            <div class="cat-card" onclick="App.selectCat('${c.id}', '${c.name}')">
                <i class="ph-duotone ${c.icon} cat-icon"></i>
                <div class="cat-name">${c.name}</div>
                <div class="cat-desc">${c.desc || ''}</div>
            </div>
        `).join('');
        document.getElementById('categories-list').innerHTML = html;
    },

    selectCat: (id, name) => {
        App.state.category = { id, name };
        App.switchScreen('screen-options'); // Переход к настройкам
    },

    selectDiff: (val, el) => {
        App.state.difficulty = val;
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    selectTime: (val, el) => {
        App.state.timeLimit = val;
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    // --- ИГРА ---
    startGame: async () => {
        App.state.stats = { total: 0, correct: 0, wrong: 0 };
        
        const data = await loader.loadChunk(App.state.category.id, App.state.difficulty);
        App.state.questions = data.sort(() => Math.random() - 0.5);
        App.state.currentQ = 0;
        
        document.getElementById('game-cat-name').innerText = App.state.category.name;
        App.switchScreen('screen-game');
        Game.loadQuestion();
    },
    
    updateScoreUI: () => {
        document.getElementById('score-val').innerText = App.state.score.toFixed(1);
        Game.checkLifelines();
        App.saveScore(); // Сохраняем при любом изменении
    }
};

const Game = {
    active: false,
    
    loadQuestion: () => {
        const q = App.state.questions[App.state.currentQ];
        if (!q) return Game.endGame();

        Game.active = true;
        clearInterval(App.state.timer);
        
        // Сброс UI
        const container = document.getElementById('answers-container');
        container.innerHTML = '';
        
        // Сброс таймера
        const circle = document.getElementById('timer-circle');
        circle.style.transition = 'none';
        circle.style.strokeDashoffset = 0;
        circle.style.stroke = 'var(--success)';
        
        // Печатная машинка
        const qEl = document.getElementById('question-text');
        qEl.textContent = "";
        let i = 0;
        const txt = q.q;
        const speed = txt.length > 60 ? 10 : 20;
        
        const typeInt = setInterval(() => {
            qEl.textContent += txt.charAt(i);
            i++;
            if (i >= txt.length) clearInterval(typeInt);
        }, speed);

        // Рендер кнопок
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.innerHTML = `<span>${opt}</span>`;
            btn.onclick = () => Game.submit(idx, btn);
            container.appendChild(btn);
        });

        setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 1s linear';
            Game.startTimer();
        }, 100);
        
        App.updateScoreUI();
    },

    startTimer: () => {
        App.state.timeLeft = App.state.timeLimit;
        const circle = document.getElementById('timer-circle');
        const text = document.getElementById('timer-text');
        const total = 283; // 2*PI*45

        text.innerText = App.state.timeLeft;

        App.state.timer = setInterval(() => {
            App.state.timeLeft--;
            text.innerText = App.state.timeLeft;
            
            const offset = total - (App.state.timeLeft / App.state.timeLimit) * total;
            circle.style.strokeDashoffset = offset;

            if (App.state.timeLeft < 10) circle.style.stroke = 'var(--danger)';
            
            if (App.state.timeLeft <= 0) {
                Game.submit(-1, null);
            }
        }, 1000);
    },

    submit: (idx, btn) => {
        if (!Game.active) return;
        Game.active = false;
        clearInterval(App.state.timer);

        const q = App.state.questions[App.state.currentQ];
        const isCorrect = idx === q.correct;
        const allBtns = document.querySelectorAll('.answer-btn');

        App.state.stats.total++;
        if (isCorrect) App.state.stats.correct++;
        else App.state.stats.wrong++;

        if (btn) {
            if (isCorrect) {
                btn.classList.add('correct');
                App.state.score += CONFIG.rewards[App.state.difficulty];
            } else {
                btn.classList.add('wrong');
                if(allBtns[q.correct]) allBtns[q.correct].classList.add('correct');
            }
        } else {
            if(allBtns[q.correct]) allBtns[q.correct].classList.add('correct');
        }

        App.updateScoreUI();
        setTimeout(() => Game.showModal(isCorrect), 1200);
    },

    showModal: (win) => {
        const m = document.getElementById('modal-round');
        
        document.getElementById('modal-title').innerText = win ? "Отлично!" : "Мимо";
        document.getElementById('modal-title').style.color = win ? "var(--success)" : "var(--danger)";
        document.getElementById('modal-desc').innerText = win ? `+${CONFIG.rewards[App.state.difficulty]} баллов` : "Попробуй еще раз";
        
        const iconContainer = document.getElementById('modal-icon-container');
        iconContainer.innerHTML = win 
            ? '<i class="ph-duotone ph-check-circle" style="font-size: 60px; color: var(--success)"></i>'
            : '<i class="ph-duotone ph-x-circle" style="font-size: 60px; color: var(--danger)"></i>';

        document.getElementById('stat-total').innerText = App.state.stats.total;
        document.getElementById('stat-correct').innerText = App.state.stats.correct;
        document.getElementById('stat-wrong').innerText = App.state.stats.wrong;

        m.classList.remove('hidden');
        setTimeout(() => m.classList.add('visible'), 10);
    },

    nextQuestion: () => {
        const m = document.getElementById('modal-round');
        m.classList.remove('visible');
        setTimeout(() => m.classList.add('hidden'), 300);
        
        App.state.currentQ++;
        Game.loadQuestion();
    },

    // --- ПОДСКАЗКИ ---
    checkLifelines: () => {
        ['5050', 'poll', 'skip'].forEach(type => {
            const btn = document.getElementById('life-'+type);
            const cost = CONFIG.costs[type === '5050' ? 'p5050' : type];
            btn.disabled = App.state.score < cost;
        });
    },

    useLifeline: (type) => {
        if (!Game.active) return;
        const costKey = type === '5050' ? 'p5050' : type;
        if (App.state.score < CONFIG.costs[costKey]) return;

        App.state.score -= CONFIG.costs[costKey];
        App.updateScoreUI();
        
        const btn = document.getElementById('life-'+type);
        btn.disabled = true;

        const q = App.state.questions[App.state.currentQ];
        const btns = document.querySelectorAll('.answer-btn');

        if (type === '5050') {
            const wrong = [];
            btns.forEach((_, i) => { if(i !== q.correct) wrong.push(i) });
            wrong.sort(() => Math.random() - 0.5);
            wrong.slice(0, 2).forEach(i => btns[i].classList.add('dimmed'));
        }

        if (type === 'skip') {
            Game.submit(q.correct, btns[q.correct]);
        }

        if (type === 'poll') {
            // ЛОГИКА "ЛЮДИ": Только заполнение (без текста, как просил)
            let votes = [0,0,0,0];
            let remaining = 100;
            const correctVotes = Math.floor(Math.random() * (85 - 50) + 50);
            votes[q.correct] = correctVotes;
            remaining -= correctVotes;

            votes.forEach((_, i) => {
                if (i !== q.correct) {
                    if (i === 3 && i !== q.correct) votes[i] = remaining;
                    else {
                        let v = Math.floor(Math.random() * (remaining / 1.5));
                        votes[i] = v; remaining -= v;
                    }
                }
            });

            btns.forEach((b, i) => {
                const bar = document.createElement('div');
                bar.className = 'vote-bar';
                b.appendChild(bar);
                // Анимация высоты от 0 до %
                setTimeout(() => {
                    bar.style.height = votes[i] + '%'; 
                }, 50);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
