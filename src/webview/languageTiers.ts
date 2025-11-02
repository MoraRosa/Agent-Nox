/**
 * 🦊 Highlight.js Language Tier Configuration
 * Enterprise-grade language loading strategy for optimal performance
 */

/**
 * TIER 1: Bundled at startup (20 languages)
 * These are the most commonly used languages in enterprise development
 */
export const TIER1_BUNDLED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'c',
  'rust',
  'go',
  'php',
  'ruby',
  'xml',
  'html', // Maps to xml
  'css',
  'scss',
  'json',
  'yaml',
  'bash',
  'shell',
  'sql',
  'dockerfile',
  'markdown',
  'powershell',
  'plaintext'
];

/**
 * TIER 2: Lazy-loaded on first use (popular but less common)
 * These languages are loaded dynamically when first encountered
 */
export const TIER2_LAZY_LANGUAGES = [
  'swift',
  'kotlin',
  'scala',
  'dart',
  'lua',
  'perl',
  'r',
  'matlab',
  'haskell',
  'clojure',
  'erlang',
  'elixir',
  'fsharp',
  'ocaml',
  'scheme',
  'groovy',
  'gradle',
  'vim',
  'diff',
  'ini',
  'properties',
  'cmake',
  'makefile',
  'nginx',
  'apache',
  'dns',
  'http',
  'graphql',
  'protobuf',
  'thrift',
  'asciidoc',
  'latex',
  'julia',
  'handlebars',
  'erb',
  'haml',
  'nix',
  'armasm',
  'x86asm',
  'llvm',
  'wasm',
  'verilog',
  'vhdl',
  'delphi',
  'ada',
  'prolog',
  'lisp',
  'smalltalk',
  'q',
  'crystal',
  'nim',
  'elm',
  'haxe',
  'pony',
  'reasonml',
  'sml',
  'vala',
  'awk',
  'basic',
  'coffeescript',
  'd',
  'gherkin',
  'objectivec',
  'tcl',
  'vbnet'
];

/**
 * TIER 3: All remaining languages (on-demand)
 * These are loaded only when encountered in code blocks
 * Highlight.js supports 192+ languages total
 */
export const TIER3_ALL_LANGUAGES = [
  // This is populated dynamically from highlight.js
  // We'll load any language not in TIER1 or TIER2
];

/**
 * Language aliases and mappings
 * Maps common aliases to canonical language names
 */
export const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'go': 'go',
  'rs': 'rust',
  'cs': 'csharp',
  'cpp': 'cpp',
  'c++': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'ksh': 'bash',
  'yml': 'yaml',
  'html': 'xml',
  'htm': 'xml',
  'xml': 'xml',
  'svg': 'xml',
  'xsl': 'xml',
  'xslt': 'xml',
  'md': 'markdown',
  'mdown': 'markdown',
  'mkd': 'markdown',
  'mkdn': 'markdown',
  'sql': 'sql',
  'psql': 'sql',
  'mysql': 'sql',
  'json': 'json',
  'jsonc': 'json',
  'json5': 'json',
  'yaml': 'yaml',
  'dockerfile': 'dockerfile',
  'docker': 'dockerfile',
  'makefile': 'makefile',
  'make': 'makefile',
  'cmake': 'cmake',
  'gradle': 'gradle',
  'maven': 'maven',
  'pom': 'maven',
  'diff': 'diff',
  'patch': 'patch',
  'ini': 'ini',
  'cfg': 'ini',
  'conf': 'ini',
  'config': 'ini',
  'toml': 'toml',
  'properties': 'properties',
  'props': 'properties',
  'nginx': 'nginx',
  'apache': 'apache',
  'httpd': 'apache',
  'graphql': 'graphql',
  'gql': 'graphql',
  'protobuf': 'protobuf',
  'proto': 'protobuf',
  'thrift': 'thrift',
  'avro': 'avro',
  'asciidoc': 'asciidoc',
  'adoc': 'asciidoc',
  'asc': 'asciidoc',
  'rst': 'rst',
  'tex': 'tex',
  'latex': 'latex',
  'jinja': 'jinja',
  'jinja2': 'jinja',
  'erb': 'erb',
  'haml': 'haml',
  'pug': 'pug',
  'jade': 'pug',
  'slim': 'slim',
  'nix': 'nix',
  'nasm': 'nasm',
  'asm': 'armasm',
  'assembly': 'armasm',
  'armasm': 'armasm',
  'x86asm': 'x86asm',
  'llvm': 'llvm',
  'wasm': 'wasm',
  'webassembly': 'wasm',
  'verilog': 'verilog',
  'vhdl': 'vhdl',
  'cobol': 'cobol',
  'fortran': 'fortran',
  'pascal': 'pascal',
  'delphi': 'delphi',
  'ada': 'ada',
  'prolog': 'prolog',
  'lisp': 'lisp',
  'racket': 'racket',
  'scheme': 'scheme',
  'smalltalk': 'smalltalk',
  'eiffel': 'eiffel',
  'modula': 'modula',
  'oberon': 'oberon',
  'algol': 'algol',
  'apl': 'apl',
  'j': 'j',
  'k': 'k',
  'q': 'q',
  'rebol': 'rebol',
  'red': 'red',
  'forth': 'forth',
  'factor': 'factor',
  'joy': 'joy',
  'golfscript': 'golfscript',
  'whitespace': 'whitespace',
  'brainfuck': 'brainfuck',
  'bf': 'brainfuck',
  'unlambda': 'unlambda',
  'malbolge': 'malbolge',
  'intercal': 'intercal',
  'befunge': 'befunge',
  'chef': 'chef',
  'shakespeare': 'shakespeare',
  'lolcode': 'lolcode',
  'cow': 'cow',
  'ook': 'ook',
  'zombie': 'zombie',
  'spoon': 'spoon',
  'false': 'false'
};

/**
 * Get canonical language name from alias
 */
export function getCanonicalLanguage(language: string): string {
  const lower = language.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
}

/**
 * Check if language is in tier 1 (bundled)
 */
export function isTier1Language(language: string): boolean {
  const canonical = getCanonicalLanguage(language);
  return TIER1_BUNDLED_LANGUAGES.includes(canonical);
}

/**
 * Check if language is in tier 2 (lazy-loaded)
 */
export function isTier2Language(language: string): boolean {
  const canonical = getCanonicalLanguage(language);
  return TIER2_LAZY_LANGUAGES.includes(canonical);
}

/**
 * Get tier for a language
 */
export function getLanguageTier(language: string): 1 | 2 | 3 {
  if (isTier1Language(language)) return 1;
  if (isTier2Language(language)) return 2;
  return 3;
}

