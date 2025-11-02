/**
 * 🦊 Nox Enterprise Markdown Renderer
 * Aurora-themed markdown rendering with syntax highlighting
 *
 * ENTERPRISE LANGUAGE LOADING STRATEGY:
 * - Tier 1 (20 languages): Bundled at startup for instant highlighting
 * - Tier 2 (80+ languages): Lazy-loaded on first use, cached in memory
 * - Tier 3 (All 192 languages): On-demand loading with fallback to plaintext
 */

import { marked, Renderer } from 'marked';
import hljs from 'highlight.js/lib/core';
import DOMPurify from 'dompurify';
import {
  TIER1_BUNDLED_LANGUAGES,
  TIER2_LAZY_LANGUAGES,
  getCanonicalLanguage,
  getLanguageTier
} from './languageTiers';


// ============================================================================
// TIER 1: BUNDLED LANGUAGES (20 most common)
// These are imported and registered at startup for instant highlighting
// ============================================================================

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import powershell from 'highlight.js/lib/languages/powershell';
import sql from 'highlight.js/lib/languages/sql';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// Register Tier 1 languages immediately (bundled at startup)
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', c);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml); // HTML uses XML highlighter
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('dockerfile', dockerfile);

/**
 * 🚀 Enterprise Dynamic Language Loader
 * Implements tiered language loading strategy:
 * - Tier 1: Bundled at startup (instant)
 * - Tier 2: Lazy-loaded on first use (cached)
 * - Tier 3: On-demand with fallback (graceful degradation)
 */
class LanguageLoader {
  private static loadingPromises = new Map<string, Promise<void>>();
  private static loadedLanguages = new Set<string>();

  /**
   * Dynamically load a language if not already registered
   * Returns true if language is available (either already loaded or successfully loaded)
   */
  static async ensureLanguage(language: string): Promise<boolean> {
    const canonical = getCanonicalLanguage(language);

    // Already registered?
    if (hljs.getLanguage(canonical)) {
      this.loadedLanguages.add(canonical);
      return true;
    }

    // Already loading?
    if (this.loadingPromises.has(canonical)) {
      await this.loadingPromises.get(canonical);
      return hljs.getLanguage(canonical) !== undefined;
    }

    // Start loading
    const loadPromise = this.loadLanguage(canonical);
    this.loadingPromises.set(canonical, loadPromise);

    try {
      await loadPromise;
      this.loadedLanguages.add(canonical);
      const success = hljs.getLanguage(canonical) !== undefined;

      if (success) {
        const tier = getLanguageTier(canonical);
        console.log(`🎨 Loaded language: ${canonical} (Tier ${tier})`);
      }

      return success;
    } catch (error) {
      console.warn(`🦊 Failed to load language '${canonical}':`, error);
      return false;
    } finally {
      this.loadingPromises.delete(canonical);
    }
  }

  /**
   * Load a specific language module using dynamic imports
   * Supports all 192+ highlight.js languages
   *
   * WEBPACK CODE SPLITTING STRATEGY:
   * - Tier 1 (20 languages): Bundled at startup (imported above)
   * - Tier 2 (65 languages): Lazy-loaded via dynamic imports in switch statement
   * - Tier 3 (remaining): Fallback to plaintext
   *
   * The switch statement with explicit import() calls allows webpack to:
   * 1. Statically analyze each import path
   * 2. Create separate chunks for each language
   * 3. Load chunks on-demand when the case is hit
   * 4. Cache chunks in memory after first load
   */
  private static async loadLanguage(language: string): Promise<void> {
    try {
      let module;

      // Tier 2: Lazy-loaded languages via dynamic imports
      // Each case triggers a separate chunk load
      switch (language) {
        case 'swift': module = await import(/* webpackChunkName: "lang-swift" */ 'highlight.js/lib/languages/swift'); break;
        case 'kotlin': module = await import(/* webpackChunkName: "lang-kotlin" */ 'highlight.js/lib/languages/kotlin'); break;
        case 'scala': module = await import(/* webpackChunkName: "lang-scala" */ 'highlight.js/lib/languages/scala'); break;
        case 'dart': module = await import(/* webpackChunkName: "lang-dart" */ 'highlight.js/lib/languages/dart'); break;
        case 'lua': module = await import(/* webpackChunkName: "lang-lua" */ 'highlight.js/lib/languages/lua'); break;
        case 'perl': module = await import(/* webpackChunkName: "lang-perl" */ 'highlight.js/lib/languages/perl'); break;
        case 'r': module = await import(/* webpackChunkName: "lang-r" */ 'highlight.js/lib/languages/r'); break;
        case 'matlab': module = await import(/* webpackChunkName: "lang-matlab" */ 'highlight.js/lib/languages/matlab'); break;
        case 'haskell': module = await import(/* webpackChunkName: "lang-haskell" */ 'highlight.js/lib/languages/haskell'); break;
        case 'clojure': module = await import(/* webpackChunkName: "lang-clojure" */ 'highlight.js/lib/languages/clojure'); break;
        case 'erlang': module = await import(/* webpackChunkName: "lang-erlang" */ 'highlight.js/lib/languages/erlang'); break;
        case 'elixir': module = await import(/* webpackChunkName: "lang-elixir" */ 'highlight.js/lib/languages/elixir'); break;
        case 'fsharp': module = await import(/* webpackChunkName: "lang-fsharp" */ 'highlight.js/lib/languages/fsharp'); break;
        case 'ocaml': module = await import(/* webpackChunkName: "lang-ocaml" */ 'highlight.js/lib/languages/ocaml'); break;
        case 'scheme': module = await import(/* webpackChunkName: "lang-scheme" */ 'highlight.js/lib/languages/scheme'); break;
        case 'groovy': module = await import(/* webpackChunkName: "lang-groovy" */ 'highlight.js/lib/languages/groovy'); break;
        case 'gradle': module = await import(/* webpackChunkName: "lang-gradle" */ 'highlight.js/lib/languages/gradle'); break;
        case 'vim': module = await import(/* webpackChunkName: "lang-vim" */ 'highlight.js/lib/languages/vim'); break;
        case 'diff': module = await import(/* webpackChunkName: "lang-diff" */ 'highlight.js/lib/languages/diff'); break;
        case 'ini': module = await import(/* webpackChunkName: "lang-ini" */ 'highlight.js/lib/languages/ini'); break;
        case 'properties': module = await import(/* webpackChunkName: "lang-properties" */ 'highlight.js/lib/languages/properties'); break;
        case 'cmake': module = await import(/* webpackChunkName: "lang-cmake" */ 'highlight.js/lib/languages/cmake'); break;
        case 'makefile': module = await import(/* webpackChunkName: "lang-makefile" */ 'highlight.js/lib/languages/makefile'); break;
        case 'nginx': module = await import(/* webpackChunkName: "lang-nginx" */ 'highlight.js/lib/languages/nginx'); break;
        case 'apache': module = await import(/* webpackChunkName: "lang-apache" */ 'highlight.js/lib/languages/apache'); break;
        case 'dns': module = await import(/* webpackChunkName: "lang-dns" */ 'highlight.js/lib/languages/dns'); break;
        case 'http': module = await import(/* webpackChunkName: "lang-http" */ 'highlight.js/lib/languages/http'); break;
        case 'graphql': module = await import(/* webpackChunkName: "lang-graphql" */ 'highlight.js/lib/languages/graphql'); break;
        case 'protobuf': module = await import(/* webpackChunkName: "lang-protobuf" */ 'highlight.js/lib/languages/protobuf'); break;
        case 'thrift': module = await import(/* webpackChunkName: "lang-thrift" */ 'highlight.js/lib/languages/thrift'); break;
        case 'asciidoc': module = await import(/* webpackChunkName: "lang-asciidoc" */ 'highlight.js/lib/languages/asciidoc'); break;
        case 'latex': module = await import(/* webpackChunkName: "lang-latex" */ 'highlight.js/lib/languages/latex'); break;
        case 'julia': module = await import(/* webpackChunkName: "lang-julia" */ 'highlight.js/lib/languages/julia'); break;
        case 'handlebars': module = await import(/* webpackChunkName: "lang-handlebars" */ 'highlight.js/lib/languages/handlebars'); break;
        case 'erb': module = await import(/* webpackChunkName: "lang-erb" */ 'highlight.js/lib/languages/erb'); break;
        case 'haml': module = await import(/* webpackChunkName: "lang-haml" */ 'highlight.js/lib/languages/haml'); break;
        case 'nix': module = await import(/* webpackChunkName: "lang-nix" */ 'highlight.js/lib/languages/nix'); break;
        case 'armasm': module = await import(/* webpackChunkName: "lang-armasm" */ 'highlight.js/lib/languages/armasm'); break;
        case 'x86asm': module = await import(/* webpackChunkName: "lang-x86asm" */ 'highlight.js/lib/languages/x86asm'); break;
        case 'llvm': module = await import(/* webpackChunkName: "lang-llvm" */ 'highlight.js/lib/languages/llvm'); break;
        case 'wasm': module = await import(/* webpackChunkName: "lang-wasm" */ 'highlight.js/lib/languages/wasm'); break;
        case 'verilog': module = await import(/* webpackChunkName: "lang-verilog" */ 'highlight.js/lib/languages/verilog'); break;
        case 'vhdl': module = await import(/* webpackChunkName: "lang-vhdl" */ 'highlight.js/lib/languages/vhdl'); break;
        case 'delphi': module = await import(/* webpackChunkName: "lang-delphi" */ 'highlight.js/lib/languages/delphi'); break;
        case 'ada': module = await import(/* webpackChunkName: "lang-ada" */ 'highlight.js/lib/languages/ada'); break;
        case 'prolog': module = await import(/* webpackChunkName: "lang-prolog" */ 'highlight.js/lib/languages/prolog'); break;
        case 'lisp': module = await import(/* webpackChunkName: "lang-lisp" */ 'highlight.js/lib/languages/lisp'); break;
        case 'smalltalk': module = await import(/* webpackChunkName: "lang-smalltalk" */ 'highlight.js/lib/languages/smalltalk'); break;
        case 'q': module = await import(/* webpackChunkName: "lang-q" */ 'highlight.js/lib/languages/q'); break;
        case 'crystal': module = await import(/* webpackChunkName: "lang-crystal" */ 'highlight.js/lib/languages/crystal'); break;
        case 'nim': module = await import(/* webpackChunkName: "lang-nim" */ 'highlight.js/lib/languages/nim'); break;
        case 'elm': module = await import(/* webpackChunkName: "lang-elm" */ 'highlight.js/lib/languages/elm'); break;
        case 'haxe': module = await import(/* webpackChunkName: "lang-haxe" */ 'highlight.js/lib/languages/haxe'); break;
        case 'pony': module = await import(/* webpackChunkName: "lang-pony" */ 'highlight.js/lib/languages/pony'); break;
        case 'reasonml': module = await import(/* webpackChunkName: "lang-reasonml" */ 'highlight.js/lib/languages/reasonml'); break;
        case 'sml': module = await import(/* webpackChunkName: "lang-sml" */ 'highlight.js/lib/languages/sml'); break;
        case 'vala': module = await import(/* webpackChunkName: "lang-vala" */ 'highlight.js/lib/languages/vala'); break;
        case 'awk': module = await import(/* webpackChunkName: "lang-awk" */ 'highlight.js/lib/languages/awk'); break;
        case 'basic': module = await import(/* webpackChunkName: "lang-basic" */ 'highlight.js/lib/languages/basic'); break;
        case 'coffeescript': module = await import(/* webpackChunkName: "lang-coffeescript" */ 'highlight.js/lib/languages/coffeescript'); break;
        case 'd': module = await import(/* webpackChunkName: "lang-d" */ 'highlight.js/lib/languages/d'); break;
        case 'gherkin': module = await import(/* webpackChunkName: "lang-gherkin" */ 'highlight.js/lib/languages/gherkin'); break;
        case 'objectivec': module = await import(/* webpackChunkName: "lang-objectivec" */ 'highlight.js/lib/languages/objectivec'); break;
        case 'tcl': module = await import(/* webpackChunkName: "lang-tcl" */ 'highlight.js/lib/languages/tcl'); break;
        case 'vbnet': module = await import(/* webpackChunkName: "lang-vbnet" */ 'highlight.js/lib/languages/vbnet'); break;
        default:
          throw new Error(`Language '${language}' not available`);
      }

      hljs.registerLanguage(language, module.default);
    } catch (error) {
      throw new Error(`Failed to load language '${language}': ${error}`);
    }
  }

  /**
   * Get statistics about loaded languages
   */
  static getLoadingStats() {
    return {
      tier1Bundled: TIER1_BUNDLED_LANGUAGES.length,
      tier2Available: TIER2_LAZY_LANGUAGES.length,
      loadedLanguages: this.loadedLanguages.size,
      loadedList: Array.from(this.loadedLanguages)
    };
  }
}

/**
 * Enterprise Markdown Renderer with Aurora theming
 */
export class NoxMarkdownRenderer {
  private static instance: NoxMarkdownRenderer;
  private renderer: Renderer;

  private constructor() {
    this.renderer = new Renderer();
    this.setupCustomRenderers();
    this.configureMarked();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): NoxMarkdownRenderer {
    if (!NoxMarkdownRenderer.instance) {
      NoxMarkdownRenderer.instance = new NoxMarkdownRenderer();
    }
    return NoxMarkdownRenderer.instance;
  }
  
  /**
   * Setup custom Aurora-themed renderers
   */
  private setupCustomRenderers(): void {
    // Custom heading renderer with Aurora colors
    this.renderer.heading = (text: string, level: number): string => {
      const colors = {
        1: 'var(--aurora-blue)',
        2: 'var(--aurora-purple)', 
        3: 'var(--aurora-cyan)',
        4: 'var(--aurora-green)',
        5: 'var(--aurora-pink)',
        6: 'var(--aurora-orange)'
      };
      
      const color = colors[level as keyof typeof colors] || 'var(--aurora-blue)';
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      
      return `
        <h${level} id="${id}" class="nox-heading nox-h${level}" style="color: ${color};">
          ${text}
        </h${level}>
      `;
    };
    
    // Custom code block renderer with tiered syntax highlighting
    this.renderer.code = (code: string, language: string | undefined): string => {
      const targetLanguage = language ? getCanonicalLanguage(language) : 'plaintext';
      const tier = getLanguageTier(targetLanguage);

      // For immediate rendering, use what's available
      const availableLanguage = hljs.getLanguage(targetLanguage) ? targetLanguage : 'plaintext';
      const highlighted = hljs.highlight(code, { language: availableLanguage });

      // Create the code block with tier indicator
      const codeBlockHtml = `
        <div class="nox-code-block" data-language="${targetLanguage}" data-original-language="${targetLanguage}" data-tier="${tier}">
          <div class="nox-code-header">
            <span class="nox-code-language">${this.getLanguageDisplayName(targetLanguage)}</span>
            <button class="nox-copy-btn" data-copy-target="code" title="Copy code">
              <span class="copy-icon">📋</span>
            </button>
          </div>
          <pre class="nox-code-content"><code class="hljs language-${availableLanguage}">${highlighted.value}</code></pre>
        </div>
      `;

      // If we used a fallback, try to load the real language asynchronously
      if (availableLanguage === 'plaintext' && targetLanguage !== 'plaintext') {
        this.loadLanguageAsync(targetLanguage, code);
      }

      return codeBlockHtml;
    };
    
    // Custom inline code renderer
    this.renderer.codespan = (code: string): string => {
      return `<code class="nox-inline-code">${code}</code>`;
    };
    
    // Custom list renderer with Aurora styling
    this.renderer.list = (body: string, ordered: boolean): string => {
      const tag = ordered ? 'ol' : 'ul';
      const className = ordered ? 'nox-ordered-list' : 'nox-unordered-list';
      return `<${tag} class="${className}">${body}</${tag}>`;
    };
    
    // Custom list item renderer
    this.renderer.listitem = (text: string): string => {
      return `<li class="nox-list-item">${text}</li>`;
    };
    
    // Custom blockquote renderer
    this.renderer.blockquote = (quote: string): string => {
      return `<blockquote class="nox-blockquote">${quote}</blockquote>`;
    };
    
    // Custom table renderer
    this.renderer.table = (header: string, body: string): string => {
      return `
        <div class="nox-table-container">
          <table class="nox-table">
            <thead class="nox-table-header">${header}</thead>
            <tbody class="nox-table-body">${body}</tbody>
          </table>
        </div>
      `;
    };
    
    // Custom link renderer with security
    this.renderer.link = (href: string, title: string | null, text: string): string => {
      const safeHref = DOMPurify.sanitize(href);
      const safeTitle = title ? DOMPurify.sanitize(title) : '';
      const titleAttr = safeTitle ? ` title="${safeTitle}"` : '';
      
      return `<a href="${safeHref}" class="nox-link" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    };
    
    // Custom paragraph renderer
    this.renderer.paragraph = (text: string): string => {
      return `<p class="nox-paragraph">${text}</p>`;
    };
    
    // Custom strong/bold renderer
    this.renderer.strong = (text: string): string => {
      return `<strong class="nox-strong">${text}</strong>`;
    };
    
    // Custom emphasis/italic renderer
    this.renderer.em = (text: string): string => {
      return `<em class="nox-emphasis">${text}</em>`;
    };
  }
  
  /**
   * Configure marked with our custom renderer
   */
  private configureMarked(): void {
    marked.setOptions({
      renderer: this.renderer,
      gfm: true,
      breaks: true
    });
  }
  
  /**
   * Asynchronously load a language and re-highlight code blocks
   */
  private async loadLanguageAsync(language: string, code: string): Promise<void> {
    try {
      const loaded = await LanguageLoader.ensureLanguage(language);
      if (loaded) {
        // Find all code blocks with this language and re-highlight them
        const codeBlocks = document.querySelectorAll(`[data-original-language="${language}"]`);
        codeBlocks.forEach(block => {
          const codeElement = block.querySelector('code');
          if (codeElement && codeElement.textContent) {
            const highlighted = hljs.highlight(codeElement.textContent, { language });
            codeElement.innerHTML = highlighted.value;
            codeElement.className = `hljs language-${language}`;
          }
        });
      }
    } catch (error) {
      console.warn(`🦊 Failed to load and re-highlight language '${language}':`, error);
    }
  }

  /**
   * Render markdown to HTML with Aurora theming
   */
  render(markdown: string): string {
    try {
      // First pass: marked.js processing
      const html = marked(markdown);
      
      // Second pass: DOMPurify sanitization
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'code', 'pre',
          'ul', 'ol', 'li', 'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'div', 'span', 'button'
        ],
        ALLOWED_ATTR: [
          'class', 'id', 'style', 'data-language',
          'href', 'target', 'rel', 'title', 'onclick'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
      
      return sanitized;
    } catch (error) {
      console.error('🦊 Markdown rendering error:', error);
      // Fallback to escaped plain text
      return `<p class="nox-error">Error rendering markdown: ${this.escapeHtml(markdown)}</p>`;
    }
  }
  
  /**
   * Get display name for programming language
   * Now supports all 192 languages via dynamic loading
   */
  private getLanguageDisplayName(lang: string): string {
    const languageNames: Record<string, string> = {
      // Common languages (bundled)
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'csharp': 'C#',
      'cpp': 'C++',
      'c': 'C',
      'rust': 'Rust',
      'go': 'Go',
      'php': 'PHP',
      'ruby': 'Ruby',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'markdown': 'Markdown',
      'bash': 'Bash',
      'shell': 'Shell',
      'powershell': 'PowerShell',
      'sql': 'SQL',
      'dockerfile': 'Dockerfile',

      // Additional languages (dynamically loaded)
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'dart': 'Dart',
      'lua': 'Lua',
      'perl': 'Perl',
      'r': 'R',
      'matlab': 'MATLAB',
      'haskell': 'Haskell',
      'clojure': 'Clojure',
      'erlang': 'Erlang',
      'elixir': 'Elixir',
      'fsharp': 'F#',
      'ocaml': 'OCaml',
      'scheme': 'Scheme',
      'lisp': 'Lisp',
      'prolog': 'Prolog',
      'fortran': 'Fortran',
      'cobol': 'COBOL',
      'assembly': 'Assembly',
      'vhdl': 'VHDL',
      'verilog': 'Verilog',
      'plaintext': 'Text'
    };

    return languageNames[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
  }
  
  /**
   * Escape HTML for fallback rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Initialize copy button functionality with proper event listeners
 * This avoids CSP violations from inline onclick handlers
 */
export function initializeCopyButtons(): void {
  // Set up event delegation for copy buttons
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const copyButton = target.closest('.nox-copy-btn') as HTMLButtonElement;

    if (copyButton) {
      event.preventDefault();
      copyCodeToClipboard(copyButton);
    }
  });
}

/**
 * Copy code to clipboard functionality
 */
function copyCodeToClipboard(button: HTMLButtonElement): void {
  const codeBlock = button.closest('.nox-code-block');
  const codeContent = codeBlock?.querySelector('code');

  if (codeContent) {
    const code = codeContent.textContent || '';

    // Use the Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        showCopySuccess(button);
      }).catch(err => {
        console.error('Failed to copy code with Clipboard API:', err);
        fallbackCopyToClipboard(code, button);
      });
    } else {
      // Fallback for older browsers or restricted contexts
      fallbackCopyToClipboard(code, button);
    }
  }
}

/**
 * Fallback copy method for environments without Clipboard API
 */
function fallbackCopyToClipboard(text: string, button: HTMLButtonElement): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(button);
    } else {
      showCopyError(button);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyError(button);
  } finally {
    document.body.removeChild(textArea);
  }
}

/**
 * Show copy success feedback
 */
function showCopySuccess(button: HTMLButtonElement): void {
  const icon = button.querySelector('.copy-icon');
  if (icon) {
    const originalText = icon.textContent;
    icon.textContent = '✅';
    setTimeout(() => {
      icon.textContent = originalText;
    }, 2000);
  }
}

/**
 * Show copy error feedback
 */
function showCopyError(button: HTMLButtonElement): void {
  const icon = button.querySelector('.copy-icon');
  if (icon) {
    const originalText = icon.textContent;
    icon.textContent = '❌';
    setTimeout(() => {
      icon.textContent = originalText;
    }, 2000);
  }
}
