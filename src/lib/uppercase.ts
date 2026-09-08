export const trUpper = (v: string) => v.toLocaleUpperCase("tr");

const SKIP_TYPES = new Set(["email", "password", "number", "url", "date", "time", "datetime-local"]);

export function shouldUppercase(type?: string, dataAttr?: unknown) {
  if (dataAttr === true || dataAttr === "true") return false;
  return !SKIP_TYPES.has((type ?? "text").toLowerCase());
}
