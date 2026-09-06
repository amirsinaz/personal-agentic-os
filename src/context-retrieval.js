const stopWords = new Set(["the", "this", "that", "does", "have", "what", "which", "how", "many", "and", "for", "project", "پروژه", "چیست", "چه"]);
const aliases = {
  "ایجنت": "agents", "عامل": "agents", "توکن": "tokens", "نشست": "sessions", "سشن": "sessions",
  "فعالیت": "activity", "مهارت": "skills", "اسکیل": "skills", "ابزار": "tools",
  "تصمیم": "decisions", "قانون": "rules", "قوانین": "rules", "فکت": "facts", "واقعیت": "facts",
  "احراز": "authentication", "هویت": "authentication", "decision": "decisions",
};

function terms(value) {
  const tokens = String(value ?? "").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(tokens.filter((term) => term.length > 2 && !stopWords.has(term)).map((term) => aliases[term] ?? term))];
}

export function searchProjectContext(query, documents, limit = 5) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return [];
  return documents.map((document) => {
    const haystackTerms = new Set(terms(`${document.path}\n${document.content}`));
    const matchedTerms = queryTerms.filter((term) => haystackTerms.has(term));
    return { path: document.path, score: matchedTerms.length / queryTerms.length, matchedTerms };
  }).filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}
