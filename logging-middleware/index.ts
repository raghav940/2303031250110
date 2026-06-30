const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzAzMDMxMjUwMTEwQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsImV4cCI6MTc4MjgxNTc5OSwiaWF0IjoxNzgyODE0ODk5LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNDBkZmIwMzMtZGExZC00Yjg4LTg1YmMtYTU4NTFlODllNGIzIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicmFnaGF2IGRhZGhpY2giLCJzdWIiOiI0YTc0YjFhZC03Y2Y0LTQ0ZTAtOTY5OS01NzEyNDZiZGU2MjQifSwiZW1haWwiOiIyMzAzMDMxMjUwMTEwQHBhcnVsdW5pdmVyc2l0eS5hYy5pbiIsIm5hbWUiOiJyYWdoYXYgZGFkaGljaCIsInJvbGxObyI6IjIzMDMwMzEyNTAxMTAiLCJhY2Nlc3NDb2RlIjoiY0pxYUVCIiwiY2xpZW50SUQiOiI0YTc0YjFhZC03Y2Y0LTQ0ZTAtOTY5OS01NzEyNDZiZGU2MjQiLCJjbGllbnRTZWNyZXQiOiJoYVhOeGRXTUdyYmRFc3dhIn0.OKDvizdKQlwjjX5roeAW4ze_a6A68-IodLvQQ689YC8";
const URL = "http://4.224.186.213/evaluation-service/logs";

export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";
export type Package = 
  | "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service"
  | "api" | "component" | "hook" | "page" | "state" | "style"
  | "auth" | "config" | "middleware" | "utils";

export const Log = async (stack: Stack, level: Level, pkg: Package, message: string) => {
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                stack,
                level,
                package: pkg,
                message
            })
        });
        if (!response.ok) {
            // Silently fail as console.log is strictly prohibited
        }
    } catch (e) {
        // Silently fail
    }
}
