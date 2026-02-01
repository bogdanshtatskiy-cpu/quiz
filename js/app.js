const CONFIG = {
    rewards: { easy: 0.5, medium: 1.0, hard: 1.5 },
    costs: { p5050: 2.5, poll: 1.5, skip: 5.0 }
};

const loader = new QuestionLoader();

const App = {
    state: {
        score: 5.0,
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

    // --- НАВИГАЦИЯ ---
    goToSettings: () => App.switchScreen('screen-setup'),
    goToHome: () => App.switchScreen('screen-home'),
    
    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const active = document.getElementById(id);
        active.classList.remove('hidden');
        active.classList.add('fade-in');
    },

    // --- РЕНДЕР КАТЕГОРИЙ ---
    renderCats: (cats) => {
        // Генерируем карточки без эмодзи в тексте
        const html = cats.map(c => `
            <div class="cat-card" onclick="App.selectCat('${c.id}', '${c.name}', this)">
                <i class="ph-duotone ${c.icon} cat-icon"></i>
                <div class="cat-name">${c.name}</div>
                <div class="cat-desc">${c.desc || ''}</div>
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
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    // --- СТАРТ ИГРЫ ---
    startGame: async () => {
        if (!App.state.category) return alert("Выберите категорию!");
        
        const data = await loader.loadChunk(App.state.category.id, App.state.difficulty);
        App.state.questions = data.sort(() => Math.random() - 0.5);
        App.state.currentQ = 0;
        
        // Устанавливаем название категории в хедер игры
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
        
        // Сброс UI
        document.getElementById('answers-container').innerHTML = '';
        document.getElementById('timer-circle').style.strokeDashoffset = 0;
        document.getElementById('timer-circle').style.stroke = 'var(--success)';
        
        // Анимация текста (Печатная машинка)
        const qEl = document.getElementById('question-text');
        qEl.innerText = "";
        let i = 0;
        const txt = q.q;
        const typeInt = setInterval(() => {
            qEl.innerText += txt.charAt(i);
            i++;
            if (i >= txt.length) clearInterval(typeInt);
        }, 15); // Чуть быстрее скорость печати

        // Рендер ответов
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
        const total = 163;

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

        if (btn) {
            if (isCorrect) {
                btn.classList.add('correct');
                App.state.score += CONFIG.rewards[App.state.difficulty];
            } else {
                btn.classList.add('wrong');
                allBtns[q.correct].classList.add('correct');
            }
        } else {
             // Если время вышло
             if(allBtns[q.correct]) allBtns[q.correct].classList.add('correct');
        }

        App.updateScoreUI();
        setTimeout(() => Game.showModal(isCorrect), 1000);
    },

    showModal: (win) => {
        const m = document.getElementById('modal-round');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');
        const iconContainer = document.getElementById('modal-icon-container');

        // Чистая типографика и иконки, никаких эмодзи
        title.innerText = win ? "Верно" : "Ошибка";
        title.style.color = win ? "var(--success)" : "var(--danger)";
        
        // Меняем иконку внутри модалки
        if (win) {
            iconContainer.innerHTML = '<i class="ph-duotone ph-check-circle" style="font-size: 64px; color: var(--success);"></i>';
            desc.innerHTML = `+${CONFIG.rewards[App.state.difficulty]} <span style="font-size:0.8em; opacity:0.7">баллов</span>`;
        } else {
            iconContainer.innerHTML = '<i class="ph-duotone ph-x-circle" style="font-size: 64px; color: var(--danger);"></i>';
            desc.innerText = "В следующий раз повезет";
        }

        m.classList.remove('hidden');
    },

    nextQuestion: () => {
        document.getElementById('modal-round').classList.add('hidden');
        App.state.currentQ++;
        Game.loadQuestion();
    },
    
    endGame: () => {
        alert("Раунд завершен! Итоговый счет: " + App.state.score.toFixed(1));
        App.goToHome();
    },

    // --- ПОДСКАЗКИ ---
    checkLifelines: () => {
        ['5050', 'poll', 'skip'].forEach(type => {
            const btn = document.getElementById('life-'+type);
            const cost = CONFIG.costs['p'+type] || CONFIG.costs[type];
            // Блокируем кнопку, если не хватает денег
            if (App.state.score < cost) {
                btn.classList.add('disabled');
                btn.disabled = true;
            } else {
                btn.classList.remove('disabled');
                btn.disabled = false;
            }
        });
    },

    useLifeline: (type) => {
        const costKey = type === '5050' ? 'p5050' : type;
        const cost = CONFIG.costs[costKey];
        
        if (App.state.score < cost || !Game.active) return;
        
        App.state.score -= cost;
        App.updateScoreUI();
        
        const btn = document.getElementById(type === '5050' ? 'life-5050' : 'life-'+type);
        btn.disabled = true;
        btn.classList.add('used'); // Стиль для использованной кнопки

        const q = App.state.questions[App.state.currentQ];
        const btns = document.querySelectorAll('.answer-btn');

        if (type === '5050') {
            let removed = 0;
            // Создаем массив индексов, исключая правильный
            const wrongIndices = [];
            btns.forEach((_, i) => {
                if (i !== q.correct) wrongIndices.push(i);
            });
            // Перемешиваем и берем 2
            wrongIndices.sort(() => Math.random() - 0.5);
            wrongIndices.slice(0, 2).forEach(idx => {
                btns[idx].classList.add('dimmed');
            });
        }
        
        if (type === 'skip') {
            Game.submit(q.correct, btns[q.correct]);
        }

        if (type === 'poll') {
            // Симуляция голосования
            const votes = [0,0,0,0];
            let left = 100;
            
            // 85% шанс что толпа права
            const correctVotes = Math.floor(Math.random() * (85 - 40) + 40);
            votes[q.correct] = correctVotes;
            left -= correctVotes;

            // Распределяем остаток
            votes.forEach((_, i) => {
                if (i !== q.correct) {
                    let v = (i === 3 && i !== q.correct) ? left : Math.floor(Math.random() * left);
                    // Корректировка для последнего элемента, если он не правильный
                    if (i === 3 && i !== q.correct) v = left; 
                    else if (i !== 3) left -= v;
                    
                    votes[i] = v;
                }
            });
            // Финальная зачистка остатков, если логика выше сбойнет (просто страховка)
            const sum = votes.reduce((a,b)=>a+b,0);
            if(sum < 100) votes[q.correct] += (100 - sum);

            btns.forEach((b, i) => {
                b.innerHTML += `
                    <div class="vote-bar" style="width:${votes[i]}%"></div>
                    <span class="vote-text">${votes[i]}%</span>
                `;
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
