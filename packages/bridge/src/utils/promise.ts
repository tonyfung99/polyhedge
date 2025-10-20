export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        }),
    ]) as Promise<T>;
}

export async function retry<T>(operation: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}

export function createLimiter(limit: number) {
    if (limit <= 0) {
        throw new Error('Limiter requires a positive concurrency limit');
    }

    let active = 0;
    const queue: Array<() => void> = [];

    const dequeue = () => {
        if (active >= limit) return;
        const next = queue.shift();
        if (!next) return;
        active += 1;
        next();
    };

    const schedule = <T>(task: () => Promise<T>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            const run = () => {
                task()
                    .then(resolve)
                    .catch(reject)
                    .finally(() => {
                        active -= 1;
                        dequeue();
                    });
            };

            queue.push(run);
            dequeue();
        });
    };

    return { run: schedule };
}


