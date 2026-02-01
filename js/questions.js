class QuestionLoader {
    constructor() {
        this.path = 'data/';
    }

    async loadManifest() {
        try {
            const res = await fetch(this.path + 'manifest.json');
            return await res.json();
        } catch (e) {
            console.error("Manifest load error:", e);
            // Fallback без эмодзи
            return {
                categories: [
                    { id: 'general', name: 'Общее', icon: 'ph-brain', desc: 'Обо всём' },
                    { id: 'code', name: 'Код', icon: 'ph-code', desc: 'JS & Python' }
                ]
            };
        }
    }

    async loadChunk(category, diff, index = 1) {
        try {
            const res = await fetch(`${this.path}${category}/${diff}_${index}.json`);
            if (!res.ok) throw new Error('404');
            return await res.json();
        } catch (e) {
            console.warn("Using fallback questions");
            return this.getFallback(diff);
        }
    }

    getFallback(diff) {
        // Fallback вопросы тоже без эмодзи
        return Array.from({length: 5}, (_, i) => ({
            id: i,
            q: `Тестовый вопрос #${i+1} (Уровень: ${diff})`,
            options: ["Неверный ответ", "Правильный ответ", "Еще неверный", "Тоже неверный"],
            correct: 1
        }));
    }
}
