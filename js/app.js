const CONFIG = {
    rewards: { easy: 0.5, medium: 1.0, hard: 1.5 },
    costs: { p5050: 2.5, poll: 1.5, skip: 5.0 }
};

const loader = new QuestionLoader();

const App = {
    state: {
        score: 5.0, // Старт
        category: null,
        difficulty: 'medium',
        timeLimit: 30,
        questions: [],
        currentQ: 0,
        timer: null,
        timeLeft: 0
    },

    init: async () => {
        const manifest = await loader.loadManifest();
        App.renderCats(manifest.categories);
        App.updateScoreUI();
    },

    // UI Navigation
    goToSettings: () => App.switchScreen('screen-setup'),
    goToHome: () => App.switchScreen('screen-home'),
    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    // Setup Logic
    renderCats: (cats) => {
        const html = cats.map(c => `
            <div class="cat-card" onclick="App.selectCat('${c.id}', '${c.name}', this)">
                <i class="ph-duotone ${c.icon} cat-icon"></i>
                <div style="font-weight:600">${c.name}</div>
            </div>
        `).join('');
        document.getElementById('categories-list').innerHTML = html;
    },

    selectCat: (id, name, el) => {
        App.state.category = { id, name };
        document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
    },

    selectDiff: (val, el) => {
        App.state.difficulty = val;
        document.querySelectorAll('.segment-control .segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    selectTime: (val, el) => {
        App.state.timeLimit = val;
        // сброс классов active у соседей (простой способ через parent)
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    // Game Start
    startGame: async () => {
        if (!App.state.category) return alert("Выберите категорию!");
        
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
    }
};

const Game = {
    active: false,
    
    loadQuestion: () => {
        const q = App.state.questions[App.state.currentQ];
        if (!q) return Game.endGame();

        Game.active = true;
        clearInterval(App.state.timer);
        
        // Reset UI
        document.getElementById('answers-container').innerHTML = '';
        document.getElementById('timer-circle').style.strokeDashoffset = 0;
        document.getElementById('timer-circle').style.stroke = 'var(--success)';
        
        // Typewriter Effect
        const qEl = document.getElementById('question-text');
        qEl.innerText = "";
        let i = 0;
        const txt = q.q;
        const typeInt = setInterval(() => {
            qEl.innerText += txt.charAt(i);
            i++;
            if (i >= txt.length) clearInterval(typeInt);
        }, 20);

        // Render Answers
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.innerHTML = `<span style="position:relative; z-index:2">${opt}</span>`;
            btn.onclick = () => Game.submit(idx, btn);
            document.getElementById('answers-container').appendChild(btn);
        });

        Game.startTimer();
    },

    startTimer: () => {
        App.state.timeLeft = App.state.timeLimit;
        const circle = document.getElementById('timer-circle');
        const text = document.getElementById('timer-text');
        const total = 163; // 2*PI*R (R=26)

        text.innerText = App.state.timeLeft;

        App.state.timer = setInterval(() => {
            App.state.timeLeft--;
            text.innerText = App.state.timeLeft;
            
            const offset = total - (App.state.timeLeft / App.state.timeLimit) * total;
            circle.style.strokeDashoffset = offset;

            if (App.state.timeLeft < 10) circle.style.stroke = 'var(--danger)';
            
            if (App.state.timeLeft <= 0) {
                Game.submit(-1, null); // Timeout
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

        if (btn) {
            if (isCorrect) {
                btn.classList.add('correct');
                App.state.score += CONFIG.rewards[App.state.difficulty];
            } else {
                btn.classList.add('wrong');
                allBtns[q.correct].classList.add('correct'); // Show right answer
            }
        } else {
            // Timeout logic
             allBtns[q.correct].classList.add('correct');
        }

        App.updateScoreUI();
        setTimeout(() => Game.showModal(isCorrect), 1000);
    },

    showModal: (win) => {
        const m = document.getElementById('modal-round');
        document.getElementById('modal-title').innerText = win ? "Превосходно!" : "Ошибка";
        document.getElementById('modal-title').style.color = win ? "var(--success)" : "var(--danger)";
        document.getElementById('modal-desc').innerText = win ? `+${CONFIG.rewards[App.state.difficulty]} 💎` : "Не расстраивайся";
        m.classList.remove('hidden');
    },

    nextQuestion: () => {
        document.getElementById('modal-round').classList.add('hidden');
        App.state.currentQ++;
        Game.loadQuestion();
    },
    
    endGame: () => {
        alert("Вопросы кончились! Твой счет: " + App.state.score);
        App.goToHome();
    },

    // Lifelines Logic
    checkLifelines: () => {
        ['5050', 'poll', 'skip'].forEach(type => {
            const btn = document.getElementById('life-'+type);
            btn.disabled = App.state.score < CONFIG.costs['p'+type] && App.state.score < CONFIG.costs[type];
        });
    },

    useLifeline: (type) => {
        const cost = CONFIG.costs[type === '5050' ? 'p5050' : type];
        if (App.state.score < cost || !Game.active) return;
        
        App.state.score -= cost;
        App.updateScoreUI();
        document.getElementById(type === '5050' ? 'life-5050' : 'life-'+type).disabled = true;

        const q = App.state.questions[App.state.currentQ];
        const btns = document.querySelectorAll('.answer-btn');

        if (type === '5050') {
            let removed = 0;
            btns.forEach((b, i) => {
                if (i !== q.correct && removed < 2) {
                    if (Math.random() > 0.5) {
                        b.classList.add('dimmed');
                        removed++;
                    }
                }
            });
        }
        
        if (type === 'skip') {
            Game.submit(q.correct, btns[q.correct]);
        }

        if (type === 'poll') {
            // Smart crowd simulation
            const votes = [0,0,0,0];
            let left = 100;
            
            // 80% chance crowd is right
            const correctVotes = Math.floor(Math.random() * (85 - 40) + 40);
            votes[q.correct] = correctVotes;
            left -= correctVotes;

            votes.forEach((_, i) => {
                if (i !== q.correct) {
                    let v = Math.floor(Math.random() * left);
                    if (i === 3 && i !== q.correct) v = left; // Dump rest
                    votes[i] = v;
                    left -= v;
                }
            });

            btns.forEach((b, i) => {
                b.innerHTML += `<div class="vote-bar" style="width:${votes[i]}%"></div><span class="vote-text">${votes[i]}%</span>`;
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
