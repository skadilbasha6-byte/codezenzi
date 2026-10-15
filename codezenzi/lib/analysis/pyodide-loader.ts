"use client"

/**
 * Loads Pyodide (real CPython compiled to WebAssembly) from the official CDN.
 * We use CPython's own `compile()` and `ast` module for genuine static analysis —
 * no code is ever executed, only parsed and inspected.
 */

const PYODIDE_VERSION = "0.26.4"
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

type PyodideInterface = {
  runPython: (code: string) => unknown
  globals: {
    set: (name: string, value: unknown) => void
    get: (name: string) => unknown
  }
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Pyodide runtime"))
    document.head.appendChild(script)
  })
}

export function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) return pyodidePromise

  pyodidePromise = (async () => {
    await loadScript(`${PYODIDE_CDN}pyodide.js`)
    if (!window.loadPyodide) {
      throw new Error("Pyodide loader unavailable")
    }
    const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN })
    // Install the analysis program once so subsequent runs are fast.
    pyodide.runPython(ANALYZER_SOURCE)
    return pyodide
  })()

  return pyodidePromise
}

/**
 * Python program that performs the static analysis. It compiles the source
 * (catching SyntaxError / IndentationError with exact positions) and, when it
 * compiles, walks the AST to find undefined names and unused imports.
 * Returns a JSON string of raw diagnostics.
 */
const ANALYZER_SOURCE = String.raw`
import ast, json, builtins, difflib

def _analyze(source):
    diagnostics = []
    try:
        compile(source, "<editor>", "exec")
    except (SyntaxError, IndentationError) as e:
        etype = type(e).__name__
        diagnostics.append({
            "type": etype,
            "line": e.lineno or 1,
            "column": (e.offset or 1),
            "message": (e.msg or "invalid syntax"),
            "source": "parser",
        })
        return json.dumps(diagnostics)
    except ValueError as e:
        diagnostics.append({
            "type": "SyntaxError",
            "line": 1,
            "column": 1,
            "message": str(e),
            "source": "parser",
        })
        return json.dumps(diagnostics)

    try:
        tree = ast.parse(source)
    except Exception:
        return json.dumps(diagnostics)

    builtin_names = set(dir(builtins))
    defined = set()
    imports = {}  # name -> line
    params = set()

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defined.add(node.name)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            a = node.args
            for arg in list(a.args) + list(a.posonlyargs) + list(a.kwonlyargs):
                params.add(arg.arg)
            if a.vararg: params.add(a.vararg.arg)
            if a.kwarg: params.add(a.kwarg.arg)
        if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store,)):
            defined.add(node.id)
        if isinstance(node, ast.arg):
            params.add(node.arg)
        if isinstance(node, (ast.For, ast.comprehension)):
            pass
        if isinstance(node, ast.Global):
            for n in node.names: defined.add(n)
        if isinstance(node, ast.Nonlocal):
            for n in node.names: defined.add(n)
        if isinstance(node, ast.Import):
            for alias in node.names:
                nm = alias.asname or alias.name.split(".")[0]
                defined.add(nm)
                imports[nm] = node.lineno
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == "*":
                    continue
                nm = alias.asname or alias.name
                defined.add(nm)
                imports[nm] = node.lineno

    known = builtin_names | defined | params | {"__name__", "__file__", "__doc__"}

    # Collect loaded names for undefined detection and usage tracking.
    used = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            used.add(node.id)
            if node.id not in known:
                suggestion = difflib.get_close_matches(node.id, list(defined) + list(params), n=1, cutoff=0.7)
                msg = "name '" + node.id + "' is not defined"
                d = {
                    "type": "NameError",
                    "line": node.lineno,
                    "column": node.col_offset + 1,
                    "message": msg,
                    "source": "parser",
                    "name": node.id,
                }
                if suggestion:
                    d["suggestion"] = suggestion[0]
                diagnostics.append(d)
        if isinstance(node, ast.Attribute):
            pass

    # Unused imports -> warning
    for nm, line in imports.items():
        if nm not in used:
            diagnostics.append({
                "type": "UnusedImport",
                "line": line,
                "column": 1,
                "message": "'" + nm + "' imported but never used",
                "source": "linter",
                "name": nm,
            })

    return json.dumps(diagnostics)
`
