import pino from "pino";
import type { Logger } from "pino";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseLogger: Logger = pino({
    level: "trace",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,file",
            messageFormat: "({file}) -> {msg}", // overridden per child
        },
    },
});

export function getLogger(meta: ImportMeta): Logger {
    const filename = path.basename(fileURLToPath(meta.url));
    return baseLogger.child({ file: filename });
}

export default baseLogger;

