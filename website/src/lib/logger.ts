// @ts-nocheck
/*! loglevel - v1.9.2 - https://github.com/pimterry/loglevel - (c) 2024 Tim Perry - licensed MIT */
/*! Modified version */

type LogLevelNumbers = 0 | 1 | 2 | 3 | 4 | 5;
type LogLevelNames = "trace" | "debug" | "info" | "warn" | "error" | "silent";
type LogMethodNames = Exclude<LogLevelNames, "silent">;
type LogLevelDesc = LogLevelNames | LogLevelNumbers;

interface LogLevel {
    TRACE: 0;
    DEBUG: 1;
    INFO: 2;
    WARN: 3;
    ERROR: 4;
    SILENT: 5;
    [key: string]: LogLevelNumbers;
}

type LoggingMethod = (...args: any[]) => void;
type MethodFactory = (
    methodName: LogMethodNames,
    level: LogLevelNumbers,
    loggerName: string | symbol,
) => LoggingMethod;

interface ILogger {
    readonly name: string | symbol;
    readonly levels: LogLevel;

    trace: LoggingMethod;
    debug: LoggingMethod;
    log: LoggingMethod;
    info: LoggingMethod;
    warn: LoggingMethod;
    error: LoggingMethod;

    methodFactory: MethodFactory;

    getLevel(): LogLevelNumbers;
    setLevel(level: LogLevelDesc, persist?: boolean): void;
    setDefaultLevel(level: LogLevelDesc): void;
    resetLevel(): void;
    enableAll(persist?: boolean): void;
    disableAll(persist?: boolean): void;
    rebuild(): void;
}

const levelColors: { [key in LogMethodNames]: string } = {
    trace: "color: gray; font-style: italic;",
    debug: "color: cyan;",
    info: "color: blue;",
    warn: "color: orange;",
    error: "color: red; font-weight: bold;",
};

const logMethods: LogMethodNames[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
];

const _loggersByName: { [name: string]: Logger } = {};
let defaultLogger: Logger | null = null;

const noop = () => { };

const isIE =
    typeof window !== "undefined" &&
    typeof window.navigator !== "undefined" &&
    /Trident\/|MSIE /.test(window.navigator.userAgent);

function bindMethod(obj: any, methodName: string): LoggingMethod {
    const method = obj[methodName];
    if (typeof method.bind === "function") {
        return method.bind(obj);
    } else {
        try {
            return Function.prototype.bind.call(method, obj);
        } catch (e) {
            return (...args: any[]) => {
                return Function.prototype.apply.apply(method, [obj, args]);
            };
        }
    }
}

function traceForIE(...args: any[]) {
    if (console.log) {
        if (console.log.apply) {
            console.log.apply(console, args);
        } else {
            Function.prototype.apply.apply(console.log, [console, args]);
        }
    }
    if (console.trace) console.trace();
}

function realMethod(methodName: LogMethodNames): LoggingMethod | false {
    let consoleName: string = methodName;
    if (methodName === "debug") {
        consoleName = "log";
    }

    if (typeof console === "undefined") {
        return false;
    } else if (methodName === "trace" && isIE) {
        return traceForIE;
    } else if (console[consoleName as keyof Console] !== undefined) {
        return bindMethod(console, consoleName);
    } else if (console.log !== undefined) {
        return bindMethod(console, "log");
    } else {
        return noop;
    }
}

class Logger implements ILogger {
    readonly name: string | symbol;
    readonly levels: LogLevel = {
        TRACE: 0,
        DEBUG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4,
        SILENT: 5,
    };
    methodFactory: MethodFactory;

    trace: LoggingMethod = noop;
    debug: LoggingMethod = noop;
    log: LoggingMethod = noop;
    info: LoggingMethod = noop;
    warn: LoggingMethod = noop;
    error: LoggingMethod = noop;

    private inheritedLevel: LogLevelNumbers;
    private defaultLevel: LogLevelNumbers | null = null;
    private userLevel: LogLevelNumbers | null = null;
    private storageKey?: string;

    constructor(
        name: string | symbol,
        factory: MethodFactory = defaultMethodFactory,
    ) {
        this.name = name;
        this.methodFactory = factory;

        if (typeof name === "string") {
            this.storageKey = "loglevel:" + name;
        } else if (typeof name === "symbol") {
            this.storageKey = undefined;
        }

        this.inheritedLevel = this.normalizeLevel(
            defaultLogger ? defaultLogger.getLevel() : "warn",
        );
        const initialLevel = this.getPersistedLevel();
        if (initialLevel != null) {
            this.userLevel = this.normalizeLevel(
                initialLevel.toLowerCase() as LogLevelNames,
            );
        }

        this.replaceLoggingMethods();
    }

    private persistLevelIfPossible(levelNum: LogLevelNumbers): void {
        const levelName = (
            Object.keys(this.levels) as Array<keyof LogLevel>
        ).find((key) => this.levels[key] === levelNum) || "SILENT";

        if (typeof window === "undefined" || !this.storageKey) return;

        try {
            window.localStorage[this.storageKey] = levelName;
            return;
        } catch (ignore) { }

        try {
            window.document.cookie =
                encodeURIComponent(this.storageKey) + "=" + levelName + ";";
        } catch (ignore) { }
    }

    private getPersistedLevel(): string | undefined {
        let storedLevel: string | undefined;

        if (typeof window === "undefined" || !this.storageKey) return undefined;

        try {
            storedLevel = window.localStorage[this.storageKey];
        } catch (ignore) { }

        if (typeof storedLevel === "undefined") {
            try {
                const cookie = window.document.cookie;
                const cookieName = encodeURIComponent(this.storageKey);
                const location = cookie.indexOf(cookieName + "=");
                if (location !== -1) {
                    storedLevel = /^([^;]+)/.exec(
                        cookie.slice(location + cookieName.length + 1),
                    )?.[1];
                }
            } catch (ignore) { }
        }

        if (
            typeof storedLevel !== "string" ||
            this.levels[storedLevel.toUpperCase()] === undefined
        ) {
            storedLevel = undefined;
        }

        return storedLevel;
    }

    private clearPersistedLevel(): void {
        if (typeof window === "undefined" || !this.storageKey) return;

        try {
            window.localStorage.removeItem(this.storageKey);
        } catch (ignore) { }

        try {
            window.document.cookie =
                encodeURIComponent(this.storageKey) +
                "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        } catch (ignore) { }
    }

    private normalizeLevel(input: LogLevelDesc): LogLevelNumbers {
        let level = input;
        if (
            typeof level === "string" &&
            this.levels[level.toUpperCase()] !== undefined
        ) {
            level = this.levels[level.toUpperCase()];
        }
        if (
            typeof level === "number" &&
            level >= 0 &&
            level <= this.levels.SILENT
        ) {
            return level;
        } else {
            throw new TypeError("log.setLevel() called with invalid level: " + input);
        }
    }

    private replaceLoggingMethods(): string | undefined {
        const level = this.getLevel();

        for (let i = 0; i < logMethods.length; i++) {
            const methodName = logMethods[i];
            (this as any)[methodName] =
                i < level
                    ? noop
                    : this.methodFactory(methodName, level, this.name);
        }

        this.log = this.debug;

        if (typeof console === "undefined" && level < this.levels.SILENT) {
            return "No console available for logging";
        }
        return undefined;
    }

    private enableLoggingWhenConsoleArrives(
        methodName: LogMethodNames,
    ): LoggingMethod {
        return (...args: any[]) => {
            if (typeof console !== "undefined") {
                this.replaceLoggingMethods();
                ((this as any)[methodName] as LoggingMethod).apply(this, args);
            }
        };
    }

    getLevel(): LogLevelNumbers {
        if (this.userLevel != null) {
            return this.userLevel;
        } else if (this.defaultLevel != null) {
            return this.defaultLevel;
        } else {
            return this.inheritedLevel;
        }
    }

    setLevel(level: LogLevelDesc, persist: boolean = true): void {
        this.userLevel = this.normalizeLevel(level);
        if (persist) {
            this.persistLevelIfPossible(this.userLevel);
        }
        this.replaceLoggingMethods();
    }

    setDefaultLevel(level: LogLevelDesc): void {
        this.defaultLevel = this.normalizeLevel(level);
        if (!this.getPersistedLevel()) {
            this.setLevel(level, false);
        }
    }

    resetLevel(): void {
        this.userLevel = null;
        this.clearPersistedLevel();
        this.replaceLoggingMethods();
    }

    enableAll(persist: boolean = true): void {
        this.setLevel(this.levels.TRACE, persist);
    }

    disableAll(persist: boolean = true): void {
        this.setLevel(this.levels.SILENT, persist);
    }

    rebuild(): void {
        if (defaultLogger !== this) {
            this.inheritedLevel = this.normalizeLevel(defaultLogger!.getLevel());
        }
        this.replaceLoggingMethods();

        if (defaultLogger === this) {
            for (const childName in _loggersByName) {
                _loggersByName[childName].rebuild();
            }
        }
    }
}

function defaultMethodFactory(
    methodName: LogMethodNames,
    _level: LogLevelNumbers,
    loggerName: string | symbol,
): LoggingMethod {
    const originalMethod = realMethod(methodName);

    if (!originalMethod) {
        return noop;
    }

    const style = levelColors[methodName] || "";
    const nameStr = loggerName.toString();
    const prefix = `[${methodName.toUpperCase()}] [${nameStr}]`;

    return (...args: any[]) => {
        const newArgs = [...args];

        if (newArgs.length > 0 && typeof newArgs[0] === "string") {
            newArgs[0] = `%c${prefix} ${newArgs[0]}`;
            newArgs.splice(1, 0, style);
        } else {
            newArgs.unshift(prefix);
        }

        originalMethod.apply(undefined, newArgs);
    };
}

defaultLogger = new Logger("default", defaultMethodFactory);

export function getLogger(name: string | symbol): ILogger {
    if ((typeof name !== "symbol" && typeof name !== "string") || name === "") {
        throw new TypeError("You must supply a name when creating a logger.");
    }

    const loggerKey = typeof name === "symbol" ? name.toString() : name;

    let logger = _loggersByName[loggerKey];
    if (!logger) {
        logger = _loggersByName[loggerKey] = new Logger(
            name,
            defaultMethodFactory,
        );
    }
    return logger;
}

export function getLoggers(): { [name: string]: ILogger } {
    return _loggersByName;
}

const _globalLog =
    typeof window !== "undefined" ? (window as any).log : undefined;
export function noConflict(): ILogger {
    if (typeof window !== "undefined" && (window as any).log === defaultLogger) {
        (window as any).log = _globalLog;
    }
    return defaultLogger!;
}

export type {
    LogLevel,
    LogLevelNames,
    LogLevelNumbers,
    LogLevelDesc,
    ILogger,
    LoggingMethod,
    MethodFactory,
};

export default defaultLogger!;
