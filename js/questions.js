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
            // Фейковые данные если файл не найден
            return {
                categories: [
                    { id: 'general', name: '🧠 Общее', icon: 'ph-brain' },
                    { id: 'tech', name: '💻 IT & Код', icon: 'ph-code' }
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
        return Array.from({length: 5}, (_, i) => ({
            id: i,
            q: `Тестовый вопрос #${i+1} (${diff})?`,
            options: ["Неверно 1", "Правильный", "Неверно 2", "Неверно 3"],
            correct: 1
        }));
    }
}
