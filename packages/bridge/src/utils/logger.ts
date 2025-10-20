export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
    name: string;
    level?: LogLevel;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

export class Logger {
    private readonly scope: string;
    private readonly level: LogLevel;

    constructor(options: LoggerOptions) {
        this.scope = options.name;
        this.level = options.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
    }

    debug(message: string, meta?: unknown) {
        this.log('debug', message, meta);
    }

    info(message: string, meta?: unknown) {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: unknown) {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: unknown) {
        this.log('error', message, meta);
    }

    private log(level: LogLevel, message: string, meta?: unknown) {
        if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) {
            return;
        }

        const time = new Date().toISOString();
        const payload = { scope: this.scope, message, meta };
        const formatted = `${time} [${level.toUpperCase()}] ${this.scope} - ${message}`;

        switch (level) {
            case 'debug':
                meta ? console.debug(formatted, payload) : console.debug(formatted);
                break;
            case 'info':
                meta ? console.info(formatted, payload) : console.info(formatted);
                break;
            case 'warn':
                meta ? console.warn(formatted, payload) : console.warn(formatted);
                break;
            case 'error':
                meta ? console.error(formatted, payload) : console.error(formatted);
                break;
            default:
                console.log(formatted, payload);
        }
    }
}

export function createLogger(name: string, level?: LogLevel) {
    return new Logger({ name, level });
}


