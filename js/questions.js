class QuestionLoader {
    constructor() {
        this.basePath = 'data/';
    }

    // Загрузка манифеста (список категорий)
    async loadManifest() {
        try {
            // Для теста создадим виртуальный манифест, если файла нет
            // В реальности fetch(this.basePath + 'manifest.json')
            return {
                categories: [
                    { id: 'general', name: '🧠 Общее' },
                    { id: 'geo', name: '🌍 География' },
                    { id: 'tech', name: '💻 IT & Код' },
                    { id: 'memes', name: '🤡 Мемы' }
                ]
            };
        } catch (e) {
            console.error(e);
            return { categories: [] };
        }
    }

    // Загрузка чанка вопросов (например data/general/easy_1.json)
    async loadChunk(category, difficulty, chunkIndex = 1) {
        const path = `${this.basePath}${category}/${difficulty}_${chunkIndex}.json`;
        console.log(`Loading: ${path}`);
        
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error('File not found');
            return await response.json();
        } catch (e) {
            console.warn(`Chunk loaded failed, using fallback data for demo.`);
            return this.getFallbackData(difficulty);
        }
    }

    // Временные данные для теста, если ты еще не создал JSON файлы
    getFallbackData(diff) {
        const suffix = diff === 'hard' ? ' (Сложно)' : '';
        return Array.from({length: 10}, (_, i) => ({
            id: i,
            q: `Вопрос номер ${i + 1} уровня ${diff}?`,
            options: [`Ответ A${suffix}`, `Правильный${suffix}`, `Ответ C`, `Ответ D`],
            correct: 1 // Индекс правильного (0-3)
        }));
    }
}
