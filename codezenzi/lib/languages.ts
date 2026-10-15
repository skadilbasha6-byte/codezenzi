export type LanguageId = "python" | "java" | "c" | "cpp" | "javascript" | "typescript" | "html" | "css" | "sql"

export type AnalysisKind = "python-ast" | "js-parser" | "delimiter" | "css" | "html"

export interface FrameworkOption {
  id: string
  label: string
}

export interface LanguageConfig {
  id: LanguageId
  label: string
  /** Monaco language mode id */
  monaco: string
  /** File extension used for downloads and project files */
  ext: string
  /** How the real-time analyzer treats this language */
  analysis: AnalysisKind
  /** True when a genuine parser/compiler backs the analysis. */
  hasRealParser: boolean
  /** Starter snippet shown when switching languages with an empty editor. */
  sample: string
  /** Optional framework/library choices offered by the AI Code Generator. */
  frameworks?: FrameworkOption[]
}

export const LANGUAGES: Record<LanguageId, LanguageConfig> = {
  python: {
    id: "python",
    label: "Python",
    monaco: "python",
    ext: "py",
    analysis: "python-ast",
    hasRealParser: true,
    sample: `def calculate(x):\n    return x * 2\n\n\nprint(calculate(21))\n`,
    frameworks: [
      { id: "none", label: "None / Standard library" },
      { id: "flask", label: "Flask" },
      { id: "fastapi", label: "FastAPI" },
      { id: "django", label: "Django" },
      { id: "pandas", label: "pandas" },
    ],
  },
  javascript: {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    ext: "js",
    analysis: "js-parser",
    hasRealParser: true,
    sample: `function greet(name) {\n  return "Hello, " + name\n}\n\nconsole.log(greet("world"))\n`,
    frameworks: [
      { id: "none", label: "None / Vanilla" },
      { id: "node", label: "Node.js" },
      { id: "react", label: "React" },
      { id: "express", label: "Express" },
    ],
  },
  typescript: {
    id: "typescript",
    label: "TypeScript",
    monaco: "typescript",
    ext: "ts",
    analysis: "js-parser",
    hasRealParser: true,
    sample: `function greet(name: string): string {\n  return \`Hello, \${name}\`\n}\n\nconsole.log(greet("world"))\n`,
    frameworks: [
      { id: "none", label: "None / Vanilla" },
      { id: "node", label: "Node.js" },
      { id: "react", label: "React" },
      { id: "nextjs", label: "Next.js" },
    ],
  },
  java: {
    id: "java",
    label: "Java",
    monaco: "java",
    ext: "java",
    analysis: "delimiter",
    hasRealParser: false,
    sample: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world");\n    }\n}\n`,
    frameworks: [
      { id: "none", label: "None / Standard" },
      { id: "spring", label: "Spring Boot" },
    ],
  },
  c: {
    id: "c",
    label: "C",
    monaco: "c",
    ext: "c",
    analysis: "delimiter",
    hasRealParser: false,
    sample: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world\\n");\n    return 0;\n}\n`,
  },
  cpp: {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    ext: "cpp",
    analysis: "delimiter",
    hasRealParser: false,
    sample: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, world" << std::endl;\n    return 0;\n}\n`,
  },
  html: {
    id: "html",
    label: "HTML",
    monaco: "html",
    ext: "html",
    analysis: "html",
    hasRealParser: false,
    sample: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <title>Page</title>\n  </head>\n  <body>\n    <h1>Hello, world</h1>\n  </body>\n</html>\n`,
  },
  css: {
    id: "css",
    label: "CSS",
    monaco: "css",
    ext: "css",
    analysis: "css",
    hasRealParser: false,
    sample: `.button {\n  display: inline-flex;\n  padding: 8px 16px;\n  border-radius: 6px;\n  background: #2563eb;\n  color: white;\n}\n`,
  },
  sql: {
    id: "sql",
    label: "SQL",
    monaco: "sql",
    ext: "sql",
    analysis: "delimiter",
    hasRealParser: false,
    sample: `SELECT name, salary\nFROM employees\nORDER BY salary DESC\nLIMIT 5;\n`,
    frameworks: [
      { id: "none", label: "Standard SQL" },
      { id: "postgres", label: "PostgreSQL" },
      { id: "mysql", label: "MySQL" },
      { id: "sqlite", label: "SQLite" },
    ],
  },
}

export const LANGUAGE_LIST: LanguageConfig[] = [
  LANGUAGES.python,
  LANGUAGES.javascript,
  LANGUAGES.typescript,
  LANGUAGES.java,
  LANGUAGES.c,
  LANGUAGES.cpp,
  LANGUAGES.html,
  LANGUAGES.css,
  LANGUAGES.sql,
]

export function getLanguage(id: LanguageId): LanguageConfig {
  return LANGUAGES[id]
}
