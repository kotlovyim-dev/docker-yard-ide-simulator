type LessonProgress = {
    currentLessonId: string | null;
    currentObjectiveIndex: number;
    completedLessonIds: string[];
};

const STORAGE_KEY = "docker-yard.lesson.progress";

export function loadLessonProgress(): LessonProgress | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LessonProgress;
        if (!parsed || !Array.isArray(parsed.completedLessonIds)) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveLessonProgress(progress: LessonProgress): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
