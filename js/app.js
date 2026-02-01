// === КОНФИГУРАЦИЯ ЦЕН ===
const CONFIG = {
    rewards: { easy: 0.5, medium: 1.0, hard: 1.5 },
    costs: { p5050: 2.5, poll: 5.0, skip: 8.0 } // Новые цены
};

const loader = new QuestionLoader();

const App = {
    state: {
        score: 50.0,
        category: null,
        difficulty: 'medium',
        timeLimit: 30,
        questions: [],
        currentQ: 0,
        timer: null,
        timeLeft: 0,
        // Статистика сессии
        stats: {
            total: 0,
            correct: 0,
            wrong: 0
        }
    },

    init: async () => {
        const manifest = await loader.loadManifest();
        App.renderCats(manifest.categories);
        App.updateScoreUI();
    },

    // Навигация
    goToSettings: () => App.switchScreen('screen-setup'),
    goToHome: () => App.switchScreen('screen-home'),
    
    switchScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const el = document.getElementById(id);
        el.classList.remove('hidden');
        el.classList.add('fade-in');
    },

    // Настройки
    renderCats: (cats) => {
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
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active')); // класс diff-btn добавь в html если менял
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    selectTime: (val, el) => {
        App.state.timeLimit = val;
        el.parentElement.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    },

    // Старт игры
    startGame: async () => {
        if (!App.state.category) return alert("Выберите категорию!");
        
        // Сброс статистики
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
        
        const circle = document.getElementById('timer-circle');
        circle.style.strokeDashoffset = 0;
        circle.style.stroke = 'var(--success)';
        circle.style.transition = 'none'; // Убираем анимацию для мгновенного сброса
        setTimeout(() => circle.style.transition = 'stroke-dashoffset 1s linear', 10);
        
        // Печатная машинка (улучшена)
        const qEl = document.getElementById('question-text');
        qEl.innerText = ""; // Очистка
        
        let i = 0;
        const txt = q.q;
        // Скорость печати: чем длиннее вопрос, тем быстрее печатаем, чтобы не ждать вечность
        const speed = txt.length > 50 ? 15 : 25; 
        
        const typeInt = setInterval(() => {
            qEl.textContent += txt.charAt(i); // textContent лучше для спецсимволов
            i++;
            if (i >= txt.length) clearInterval(typeInt);
        }, speed);

        // Рендер кнопок
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            // Вставляем span для текста, чтобы z-index работал с Poll баром
            btn.innerHTML = `<span>${opt}</span>`;
            btn.onclick = () => Game.submit(idx, btn);
            container.appendChild(btn);
        });

        Game.startTimer();
        App.updateScoreUI(); // Обновить доступность подсказок
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

            // Смена цвета таймера
            if (App.state.timeLeft < 10) circle.style.stroke = 'var(--danger)';
            else if (App.state.timeLeft < 20) circle.style.stroke = 'var(--gold)';
            
            if (App.state.timeLeft <= 0) {
                Game.submit(-1, null); // Время вышло
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

        // Обновляем статистику
        App.state.stats.total++;
        if (isCorrect) App.state.stats.correct++;
        else App.state.stats.wrong++;

        // Визуал ответа
        if (btn) {
            if (isCorrect) {
                btn.classList.add('correct');
                App.state.score += CONFIG.rewards[App.state.difficulty];
            } else {
                btn.classList.add('wrong');
                // Показать правильный
                if(allBtns[q.correct]) allBtns[q.correct].classList.add('correct');
            }
        } else {
            // Если тайм-аут
            if(allBtns[q.correct]) allBtns[q.correct].classList.add('correct');
        }

        App.updateScoreUI();
        
        // Задержка перед модалкой
        setTimeout(() => Game.showModal(isCorrect), 1200);
    },

    showModal: (win) => {
        const m = document.getElementById('modal-round');
        const content = m.querySelector('.modal-content');
        
        // Генерация HTML модалки с кнопками и статистикой
        const reward = CONFIG.rewards[App.state.difficulty];
        const title = win ? "Верно!" : "Ошибка";
        const titleColor = win ? "var(--success)" : "var(--danger)";
        const icon = win ? "ph-check-circle" : "ph-x-circle";
        const desc = win ? `+${reward} 💎` : "В следующий раз повезет";

        content.innerHTML = `
            <div id="modal-icon-container">
                <i class="ph-duotone ${icon}" style="font-size: 64px; color: ${titleColor};"></i>
            </div>
            <h2 id="modal-title" style="color: ${titleColor}">${title}</h2>
            <p id="modal-desc">${desc}</p>
            
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-val">${App.state.stats.total}</span>
                    <span class="stat-label">Всего</span>
                </div>
                <div class="stat-item">
                    <span class="stat-val" style="color:var(--success)">${App.state.stats.correct}</span>
                    <span class="stat-label">Верно</span>
                </div>
                <div class="stat-item">
                    <span class="stat-val" style="color:var(--danger)">${App.state.stats.wrong}</span>
                    <span class="stat-label">Ошибки</span>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-outline" onclick="App.goToHome()">Меню</button>
                <button class="btn-primary" onclick="Game.nextQuestion()">Далее</button>
            </div>
        `;

        m.classList.remove('hidden');
        // Небольшой таймаут для анимации появления (scale effect)
        setTimeout(() => m.classList.add('visible'), 10);
    },

    nextQuestion: () => {
        const m = document.getElementById('modal-round');
        m.classList.remove('visible');
        setTimeout(() => m.classList.add('hidden'), 300);
        
        App.state.currentQ++;
        Game.loadQuestion();
    },
    
    endGame: () => {
        alert(`Игра окончена! Твой счет: ${App.state.score.toFixed(1)}`);
        App.goToHome();
    },

    // --- ПОДСКАЗКИ ---
    checkLifelines: () => {
        ['5050', 'poll', 'skip'].forEach(type => {
            const btn = document.getElementById('life-'+type);
            const cost = CONFIG.costs[type === '5050' ? 'p5050' : type];
            const hasMoney = App.state.score >= cost;
            
            // Если денег нет или кнопка уже нажата (можно добавить класс .used логику)
            btn.disabled = !hasMoney;
        });
    },

    useLifeline: (type) => {
        if (!Game.active) return;
        const costKey = type === '5050' ? 'p5050' : type;
        const cost = CONFIG.costs[costKey];

        if (App.state.score < cost) return;

        // Списываем
        App.state.score -= cost;
        App.updateScoreUI();
        
        // Блокируем кнопку
        const btn = document.getElementById('life-'+type);
        btn.disabled = true;

        const q = App.state.questions[App.state.currentQ];
        const btns = document.querySelectorAll('.answer-btn');

        // ЛОГИКА 50/50
        if (type === '5050') {
            const wrongIndices = [];
            btns.forEach((_, i) => { if (i !== q.correct) wrongIndices.push(i); });
            wrongIndices.sort(() => Math.random() - 0.5);
            // Скрываем 2 неверных
            wrongIndices.slice(0, 2).forEach(idx => btns[idx].classList.add('dimmed'));
        }
        
        // ЛОГИКА СКИП
        if (type === 'skip') {
            Game.submit(q.correct, btns[q.correct]);
        }

        // ЛОГИКА ЛЮДИ (Poll)
        if (type === 'poll') {
            let votes = [0,0,0,0];
            let remaining = 100;
            
            // 85% шанс, что большинство право
            const correctVotes = Math.floor(Math.random() * (80 - 45) + 45); // от 45 до 80%
            votes[q.correct] = correctVotes;
            remaining -= correctVotes;

            // Раскидываем остаток
            votes.forEach((_, i) => {
                if (i !== q.correct) {
                    if (i === 3 && i !== q.correct) {
                        votes[i] = remaining; // Последнему остатки
                    } else {
                        const v = Math.floor(Math.random() * (remaining / 1.5));
                        votes[i] = v;
                        remaining -= v;
                    }
                }
            });

            // Рендер баров
            btns.forEach((b, i) => {
                // Добавляем полоску и текст
                // height: 0% -> height: votes[i]% через анимацию
                const bar = document.createElement('div');
                bar.className = 'vote-bar';
                
                const txt = document.createElement('span');
                txt.className = 'vote-text';
                txt.innerText = votes[i] + '%';
                
                b.appendChild(bar);
                b.appendChild(txt);
                
                // Триггер анимации высоты
                setTimeout(() => {
                    bar.style.height = '100%'; // Заливаем кнопку полностью...
                    // ... но ширину можно использовать как индикатор, ИЛИ прозрачность. 
                    // Твой запрос: "Заполняется по процентам". 
                    // Сделаем лучше: меняем ширину фона (width) или высоту.
                    // В CSS я поставил height.
                    bar.style.height = '100%'; 
                    bar.style.width = votes[i] + '%'; // Вот так логичнее визуально
                }, 50);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
