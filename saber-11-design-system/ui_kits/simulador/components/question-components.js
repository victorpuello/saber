/**
 * Saber 11 — Question Type Components
 * =====================================
 * Factory functions for all 8 question context-panel types.
 *
 * Each function accepts a typed config object and returns:
 *   { badge: string, contextHTML: string }
 *
 * Usage (in any HTML page):
 *   <script src="components/question-components.js"></script>
 *   const { contextHTML, badge } = QC.barChart({ title: '...', groups: [...] });
 *
 * The returned contextHTML goes into the `.ctx-scroll` pane.
 * The badge string goes into the `.ctx-badge` element.
 *
 * Companion file: QC.stem(), QC.options(), QC.explanation()
 * generate the right-side question pane content.
 *
 * @version 1.1.0
 * @requires saber-11-design-system (CSS custom properties must be loaded)
 */

const QC = (function () {

  // ─────────────────────────────────────────────────────────────────
  // 0. TEXTO BASE SIMPLE
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a text-only context block without auxiliary table, chart,
   * dialogue or geometry. This is the current baseline case used by the
   * product when a question only needs a reading passage or short scenario.
   *
   * @param {Object}   cfg
   * @param {string[]} cfg.paragraphs     - Paragraphs rendered in order.
   * @param {string=}  cfg.instruction    - Optional instruction above the text.
   * @param {string=}  cfg.footer         - Optional source note or closing text.
   */
  function textOnly({ paragraphs = [], instruction = '', footer = '' }) {
    return {
      badge: 'Texto Base',
      contextHTML: `
        <div class="ctx-prose">
          ${instruction ? `<p style="font-size:13px;color:var(--secondary);margin-bottom:16px;font-style:italic">${instruction}</p>` : ''}
          ${paragraphs.map(p => `<p>${p}</p>`).join('\n')}
          ${footer ? `<p class="author">${footer}</p>` : ''}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. TEXTO CONTINUO + TABLA DE DATOS
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a prose reading passage optionally combined with a data table.
   * Use for: MAT (data interpretation), LC (reading comprehension),
   *          SC (social science texts), CN (science passages).
   *
   * @param {Object}   cfg
   * @param {string[]} cfg.intro         - Paragraphs before the table
   * @param {{ text: string, num?: boolean }[]} cfg.headers
   * @param {{ cells: { text: string, num?: boolean, hi?: boolean }[] }[]} cfg.rows
   * @param {string=}  cfg.tableCaption  - Source note rendered as .author
   * @param {string[]} [cfg.footer=[]]   - Paragraphs after the table
   */
  function proseTable({ intro = [], headers = [], rows = [], tableCaption = '', footer = [] }) {
    const headHTML = headers.map(h =>
      `<th${h.num ? ' class="num"' : ''}>${h.text}</th>`
    ).join('');

    const bodyHTML = rows.map(r =>
      `<tr>${r.cells.map(c => {
        const cls = [c.num ? 'num' : '', c.hi ? 'hi' : ''].filter(Boolean).join(' ');
        return `<td${cls ? ` class="${cls}"` : ''}>${c.text}</td>`;
      }).join('')}</tr>`
    ).join('\n');

    return {
      badge: 'Material de Lectura',
      contextHTML: `
        <div class="ctx-prose">
          ${intro.map(p => `<p>${p}</p>`).join('\n')}
          ${headers.length ? `
          <div style="margin:20px 0">
            <table class="ctx-table">
              <thead><tr>${headHTML}</tr></thead>
              <tbody>${bodyHTML}</tbody>
            </table>
          </div>` : ''}
          ${tableCaption ? `<p class="author">${tableCaption}</p>` : ''}
          ${footer.map(p => `<p>${p}</p>`).join('\n')}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. TABLA CIENTÍFICA
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a scientific/experimental data table with an introductory
   * context paragraph. Use for: CN (Ciencias Naturales — experimental
   * scenarios, lab data, physical/chemical properties).
   *
   * @param {Object}   cfg
   * @param {string=}  cfg.intro  - Context paragraph (what the student is investigating)
   * @param {{ text: string, num?: boolean }[]} cfg.headers
   * @param {{ cells: { text: string, num?: boolean, hi?: boolean, bold?: boolean }[] }[]} cfg.rows
   * @param {string=}  cfg.source - Source footnote (italic)
   */
  function scientificTable({ intro = '', headers = [], rows = [], source = '' }) {
    const headHTML = headers.map(h =>
      `<th${h.num ? ' class="num"' : ''}>${h.text}</th>`
    ).join('');

    const bodyHTML = rows.map(r =>
      `<tr>${r.cells.map(c => {
        const cls = [c.num ? 'num' : '', c.hi ? 'hi' : ''].filter(Boolean).join(' ');
        const bold = c.bold ? ' style="font-weight:600"' : '';
        return `<td${cls ? ` class="${cls}"` : ''}${bold}>${c.text}</td>`;
      }).join('')}</tr>`
    ).join('\n');

    return {
      badge: 'Escenario Científico',
      contextHTML: `
        <div style="padding-top:8px">
          ${intro ? `<p style="font-size:14px;color:var(--on-sv);line-height:1.7;margin-bottom:16px">${intro}</p>` : ''}
          <table class="ctx-table">
            <thead><tr>${headHTML}</tr></thead>
            <tbody>${bodyHTML}</tbody>
          </table>
          ${source ? `<p style="font-size:12px;color:var(--secondary);margin-top:12px;font-style:italic">${source}</p>` : ''}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. GRÁFICA DE BARRAS
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a grouped bar chart using pure CSS/HTML (no canvas/library).
   * Use for: MAT (statistical interpretation), SC (demographic comparisons),
   *          CN (experimental results).
   *
   * @param {Object}   cfg
   * @param {string=}  cfg.intro   - Introductory paragraph
   * @param {string}   cfg.title   - Chart title shown above bars
   * @param {{ label: string, bars: { value: number, color: string, label?: string }[] }[]} cfg.groups
   *   - Each group is one cluster of bars (one column position).
   *   - bars[i].color: CSS color string (hex or var).
   * @param {number}   cfg.maxVal  - Y-axis ceiling used for % scaling
   * @param {{ color: string, label: string }[]} cfg.legend
   * @param {string=}  cfg.source  - Source footnote
   * @param {number=}  cfg.height  - Bar area height in px (default 100)
   */
  function barChart({ intro = '', title = '', groups = [], maxVal = 100, legend = [], source = '', height = 100 }) {
    const barsPerGroup = groups[0]?.bars.length ?? 1;
    const barW = Math.max(Math.floor(38 / barsPerGroup) - 3, 8);

    const barsHTML = groups.map(g => `
      <div class="bar-col">
        <div style="display:flex;gap:3px;align-items:flex-end;height:${height - 4}px">
          ${g.bars.map(b =>
            `<div style="width:${barW}px;height:${Math.round((b.value / maxVal) * (height - 4))}px;background:${b.color};border-radius:4px 4px 0 0" title="${b.label ?? b.value}"></div>`
          ).join('')}
        </div>
        <div class="bar-label">${g.label}</div>
      </div>`).join('');

    const legendHTML = legend.map(l =>
      `<div class="legend-item"><div class="legend-dot" style="background:${l.color}"></div>${l.label}</div>`
    ).join('');

    return {
      badge: 'Recurso Gráfico',
      contextHTML: `
        <div style="padding-top:4px">
          ${intro ? `<p style="font-size:14px;color:var(--on-sv);line-height:1.7;margin-bottom:16px">${intro}</p>` : ''}
          <div class="ctx-chart">
            <div class="ctx-chart-title">${title}</div>
            <div class="bar-chart" style="height:${height}px">${barsHTML}</div>
            <div class="chart-legend">${legendHTML}</div>
          </div>
          ${source ? `<p style="font-size:12px;color:var(--secondary);margin-top:10px;font-style:italic">${source}</p>` : ''}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. AVISO PÚBLICO INSTITUCIONAL
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders an institutional public sign/notice (schedules, rules, etc.).
   * Use for: ING Part 1 (pragmatic reading A1/A2) — also valid for
   *          LC (non-continuous texts: signs, notices, regulations).
   *
   * @param {Object}   cfg
   * @param {'es'|'en'} [cfg.lang='es']   - Language; affects the badge label
   * @param {string=}  cfg.instruction    - Italic instruction above the sign
   * @param {string}   cfg.header         - Title/name of the institution or sign
   * @param {{ label: string, value: string }[]} cfg.rows  - Info rows (e.g. schedule)
   * @param {string=}  cfg.note           - Highlighted note (rendered in green)
   * @param {string=}  cfg.footer         - Footer note (italic, centered)
   */
  function publicNotice({ lang = 'es', instruction = '', header = '', rows = [], note = '', footer = '' }) {
    const rowsHTML = rows.map(r =>
      `<div class="ctx-sign-row"><span class="ctx-sign-day">${r.label}</span><span class="ctx-sign-hours">${r.value}</span></div>`
    ).join('\n');

    return {
      badge: lang === 'en' ? 'Public Notice · Part 1' : 'Aviso Público',
      contextHTML: `
        <div style="padding-top:8px">
          ${instruction ? `<p style="font-size:13px;color:var(--secondary);margin-bottom:16px;font-style:italic">${instruction}</p>` : ''}
          <div class="ctx-sign">
            <div class="ctx-sign-header">${header}</div>
            ${rowsHTML}
            ${note ? `<div style="margin-top:14px;background:#ecfdf5;border-radius:10px;padding:10px 14px;font-size:13px;color:#047857;font-weight:500">${note}</div>` : ''}
            ${footer ? `<div class="ctx-sign-footer">${footer}</div>` : ''}
          </div>
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. DIÁLOGO CONVERSACIONAL CON BURBUJAS
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a conversational dialogue with chat-style speech bubbles.
   * Use for: ING Part 3 (dialogue comprehension A1/A2) — also valid for
   *          LC (dialogue/dramatic texts).
   *
   * @param {Object} cfg
   * @param {'es'|'en'} [cfg.lang='es']
   * @param {string=}  cfg.instruction
   * @param {Object.<string, { name: string, initials: string, bg: string, color: string }>} cfg.speakers
   *   - Key: speaker identifier used in cfg.lines[].speaker
   *   - bg/color: background and text color for the avatar circle
   * @param {{ speaker: string, side: 'left'|'right', text: string }[]} cfg.lines
   */
  function dialogue({ lang = 'es', instruction = '', speakers = {}, lines = [] }) {
    const linesHTML = lines.map(line => {
      const sp = speakers[line.speaker] ?? {
        name: line.speaker, initials: line.speaker[0].toUpperCase(),
        bg: '#dbe1ff', color: '#004ac6'
      };
      const isRight = line.side === 'right';
      return `
        <div class="dlg-line${isRight ? ' right' : ''}">
          <div class="dlg-speaker" style="background:${sp.bg};color:${sp.color}">${sp.initials}</div>
          <div${isRight ? ' style="text-align:right"' : ''}>
            <div class="dlg-name"${isRight ? ' style="text-align:right"' : ''}>${sp.name}</div>
            <div class="dlg-bubble">${line.text}</div>
          </div>
        </div>`;
    }).join('');

    return {
      badge: lang === 'en' ? 'Dialogue · Part 3' : 'Diálogo',
      contextHTML: `
        <div style="padding-top:8px">
          ${instruction ? `<p style="font-size:13px;color:var(--secondary);margin-bottom:16px;font-style:italic">${instruction}</p>` : ''}
          <div class="ctx-dialogue">${linesHTML}</div>
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. CLOZE GRAMATICAL (FILL-IN-THE-BLANK)
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders a gap-fill (cloze) text where blanks are inline spans.
   * The active blank (currently being answered) is highlighted in blue.
   * Use for: ING Part 4 (grammar in context A2/B1).
   *
   * @param {Object} cfg
   * @param {'es'|'en'} [cfg.lang='es']
   * @param {string=}  cfg.instruction
   * @param {number}   cfg.activeBlank      - 1-based index of the blank being answered
   * @param {({ type: 'text', text: string } | { type: 'blank', n: number })[]} cfg.segments
   *   - Alternate between text and blank segments to build the full paragraph.
   *   - blank.n: blank number shown as (1) ___, (2) ___, etc.
   * @param {string=}  cfg.footer           - Note shown below the text box (e.g. "Answer blank (1) only")
   */
  function cloze({ lang = 'es', instruction = '', activeBlank = 1, segments = [], footer = '' }) {
    const paraHTML = segments.map(seg => {
      if (seg.type === 'text') return seg.text;
      const isActive = seg.n === activeBlank;
      const style = isActive
        ? 'background:rgba(219,225,255,0.6);border-radius:6px;padding:2px 10px;font-weight:700;color:var(--primary)'
        : 'background:var(--sc-low);border-radius:6px;padding:2px 10px;font-weight:600';
      return `<span style="${style}">(${seg.n}) ___</span>`;
    }).join('');

    return {
      badge: lang === 'en' ? 'Cloze · Part 4' : 'Texto con Huecos',
      contextHTML: `
        <div style="padding-top:8px">
          ${instruction ? `<p style="font-size:13px;color:var(--secondary);margin-bottom:16px;font-style:italic">${instruction}</p>` : ''}
          <div style="background:white;border-radius:16px;padding:22px 24px;font-size:15px;line-height:2;color:var(--on-surface);box-shadow:0 2px 8px rgba(0,0,0,0.06)">
            <p>${paraHTML}</p>
          </div>
          ${footer ? `<p style="font-size:12px;color:var(--secondary);margin-top:12px">${footer}</p>` : ''}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 7. FIGURA GEOMÉTRICA SVG
  // ─────────────────────────────────────────────────────────────────
  /**
   * Renders an SVG geometric figure inside the context pane.
   * Use for: MAT (geometry, trigonometry, Pythagorean theorem),
   *          CN (physics diagrams, force vectors).
   *
   * @param {Object}  cfg
   * @param {string=} cfg.intro       - Instruction paragraph before the figure
   * @param {string}  cfg.svgContent  - Full <svg> tag markup (including viewBox, width, height)
   * @param {string=} cfg.caption     - Caption paragraph below the figure
   */
  function geometry({ intro = '', svgContent = '', caption = '' }) {
    return {
      badge: 'Figura Geométrica',
      contextHTML: `
        <div style="padding-top:8px">
          ${intro ? `<p style="font-size:14px;color:var(--on-sv);line-height:1.7;margin-bottom:16px">${intro}</p>` : ''}
          <div class="ctx-geo">${svgContent}</div>
          ${caption ? `<p style="font-size:13px;color:var(--on-sv);margin-top:8px">${caption}</p>` : ''}
        </div>`
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // SHARED HELPERS — Question pane
  // ─────────────────────────────────────────────────────────────────

  /**
   * Renders the question stem (enunciado) inside the question pane.
   * @param {{ text: string, type?: 'normal'|'cloze' }} cfg
   */
  function stem({ text, type = 'normal' }) {
    return type === 'cloze'
      ? `<div class="q-stem-cloze">${text}</div>`
      : `<div class="q-stem">${text}</div>`;
  }

  /**
   * Renders the answer option list.
   * @param {{ l: string, t: string }[]} opts - l: letter label, t: option text
   * @param {function=} onSelect - optional override for onclick (receives letter)
   */
  function options(opts, onSelect) {
    const handler = onSelect
      ? `onclick="(${onSelect.toString()})(this,'LETTER')"`
      : `onclick="selectOption(this,'LETTER')"`;
    return `
      <div class="options">
        ${opts.map(o => `
          <div class="option" data-value="${o.l}" ${handler.replace(/LETTER/g, o.l)}>
            <div class="opt-letter">${o.l}</div>
            <div class="opt-text">${o.t}</div>
          </div>`).join('')}
      </div>`;
  }

  /**
   * Renders the post-answer explanation box.
   * @param {{ text: string, isCorrect?: boolean }} cfg
   */
  function explanation({ text, isCorrect = true }) {
    const cls = `explanation-box${isCorrect ? '' : ' wrong-exp'} show`;
    const label = isCorrect
      ? (text.match(/^[A-Z]/) ? 'Correct answer' : 'Respuesta correcta')
      : 'Respuesta incorrecta';
    return `
      <div class="${cls}">
        <div class="exp-title">${label}</div>
        <div class="exp-text">${text}</div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────
  return {
    // Context panels
    textOnly,
    proseTable,
    scientificTable,
    barChart,
    publicNotice,
    dialogue,
    cloze,
    geometry,
    // Question pane helpers
    stem,
    options,
    explanation
  };

})();

// CommonJS compatibility (Node / bundler usage)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QC;
}
