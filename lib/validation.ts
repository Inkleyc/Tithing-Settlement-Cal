const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request body."); return value as Record<string, unknown>; };
export const text = (value: unknown, name: string, max: number) => { if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`); const result = value.trim(); if (result.length > max) throw new Error(`${name} is too long.`); return result; };
export const identifier = (value: unknown, name: string) => text(value, name, 100);
export const phone = (value: unknown) => { const result = text(value, "Phone", 25); if (!/^[+()\d.\-\s]{7,25}$/.test(result)) throw new Error("Enter a valid phone number."); return result; };
export const email = (value: unknown) => { const result = text(value, "Email", 255).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error("Enter a valid email address."); return result; };
export const bodyObject = object;
export async function jsonBody(request: Request) { try { return object(await request.json()); } catch (error) { if (error instanceof SyntaxError) throw new Error("Request body must be valid JSON."); throw error; } }
