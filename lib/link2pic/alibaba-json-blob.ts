export function extractJsonBlob(
  html: string,
  assignmentPattern: RegExp,
  maxLength = 3_000_000,
): unknown | undefined {
  const match = html.match(assignmentPattern);
  if (!match?.[1] || match.index === undefined) return undefined;

  const startIndex = match.index + match[0].length - 1;
  if (html[startIndex] !== "{") return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < html.length && index < startIndex + maxLength; index++) {
    const char = html[index]!;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const jsonText = html.slice(startIndex, index + 1);
        try {
          return JSON.parse(jsonText) as unknown;
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}
