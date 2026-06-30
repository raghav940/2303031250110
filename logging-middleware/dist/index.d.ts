export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";
export type Package = "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service" | "api" | "component" | "hook" | "page" | "state" | "style" | "auth" | "config" | "middleware" | "utils";
export declare const Log: (stack: Stack, level: Level, pkg: Package, message: string) => Promise<void>;
