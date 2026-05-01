// ============================================================
//  GymScript Compiler — compiler.js
//  Analizador Léxico + Analizador Sintáctico
//  Universidad Mariano Gálvez de Guatemala — 2026
// ============================================================

// ─── Palabras reservadas del lenguaje ───────────────────────
const KEYWORDS = [
  'rutina', 'reps', 'peso', 'serie', 'descanso',
  'levantar', 'si_cumplo', 'sino', 'mientras_pueda',
  'para_cada', 'retornar', 'verdad', 'falso', 'nulo', 'marca'
];

const TYPES = ['reps', 'peso', 'serie', 'descanso'];

// ─── Programas de ejemplo ────────────────────────────────────
const SAMPLES = [
  // 0 — Declaración simple (válido)
`rutina Calentamiento {
  reps series = 3;
  peso carga = 50.0;
  serie nombre = "Press banca";
  levantar(nombre);
  levantar(series);
}`,

  // 1 — Condicional si_cumplo (válido)
`rutina EvaluarFuerza {
  reps resultado = 100;
  descanso activo = verdad;
  si_cumplo (resultado >= 80) {
    levantar("Nivel: Avanzado");
  } sino {
    levantar("Nivel: Principiante");
  }
}`,

  // 2 — Error léxico: carácter inválido @
`rutina ErrorLexico {
  reps x = 10;
  peso y = @55.5;
  levantar(x);
}`,

  // 3 — Error sintáctico: falta ;
`rutina ErrorSintactico {
  reps x = 10
  levantar(x);
}`,

  // 4 — Programa completo (válido)
`rutina RutinaCompleta {
  reps series = 4;
  reps reps_por_serie = 12;
  peso carga_kg = 80.5;
  serie ejercicio = "Sentadilla";
  descanso completado = falso;

  levantar(ejercicio);
  levantar(series);

  si_cumplo (carga_kg >= 80.0) {
    levantar("Carga pesada detectada");
    completado = verdad;
  } sino {
    levantar("Carga moderada");
  }

  retornar completado;
}`,

  // 5 — Bucle mientras_pueda (válido)
`rutina ContarSeries {
  reps contador = 0;
  reps limite = 5;
  mientras_pueda (contador < limite) {
    levantar(contador);
    contador = contador + 1;
  }
  levantar("Series completadas");
}`,

  // 6 — Aritmética y retorno (válido)
`rutina CalcularVolumen {
  reps series = 4;
  reps repeticiones = 10;
  peso carga = 60.5;
  peso volumen = series * repeticiones;
  levantar(volumen);
  retornar volumen;
}`,

  // 7 — Error: paréntesis sin cerrar
`rutina ErrorParen {
  reps x = 10;
  si_cumplo (x > 5 {
    levantar(x);
  }
}`,

  // 8 — Error: llave sin cerrar
`rutina ErrorLlave {
  reps x = 5;
  levantar(x);
`,

  // 9 — Error: tipo de dato inválido
`rutina ErrorTipo {
  numero x = 10;
  levantar(x);
}`
];

// ============================================================
//  ANALIZADOR LÉXICO
// ============================================================
function lexer(code) {
  const tokens = [];
  const errors = [];
  let i = 0, line = 1, col = 1;

  while (i < code.length) {
    const remaining = code.slice(i);

    // Salto de línea
    if (code[i] === '\n') {
      line++;
      col = 1;
      i++;
      continue;
    }

    // Espacios / tabulaciones
    if (/^\s/.test(code[i])) {
      col++;
      i++;
      continue;
    }

    // Comentario de línea //
    if (remaining.startsWith('//')) {
      const end = remaining.indexOf('\n');
      const comment = end === -1 ? remaining : remaining.slice(0, end);
      tokens.push({ type: 'COMENTARIO', value: comment, line, col });
      col += comment.length;
      i += comment.length;
      continue;
    }

    // Cadena de texto "..."
    if (code[i] === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"' && code[j] !== '\n') j++;
      if (j >= code.length || code[j] === '\n') {
        errors.push({ type: 'LÉXICO', msg: 'Cadena sin cerrar', line, col });
        i = j;
        continue;
      }
      const val = code.slice(i, j + 1);
      tokens.push({ type: 'CADENA', value: val, line, col });
      col += val.length;
      i += val.length;
      continue;
    }

    // Operadores de dos caracteres
    const two = remaining.slice(0, 2);
    const twoCharMap = {
      '==': 'IGUAL_IGUAL',
      '!=': 'DIFERENTE',
      '<=': 'MENOR_IGUAL',
      '>=': 'MAYOR_IGUAL',
      '&&': 'AND',
      '||': 'OR'
    };
    if (twoCharMap[two]) {
      tokens.push({ type: twoCharMap[two], value: two, line, col });
      col += 2;
      i += 2;
      continue;
    }

    // Operadores y símbolos de un carácter
    const singleMap = {
      '+': 'SUMA',    '-': 'RESTA',     '*': 'MULT',
      '/': 'DIV',     '=': 'ASIGNACION', ';': 'PUNTO_COMA',
      '{': 'LLAVE_ABR', '}': 'LLAVE_CIE', '(': 'PAREN_ABR',
      ')': 'PAREN_CIE', ',': 'COMA',    '<': 'MENOR',
      '>': 'MAYOR',   '!': 'NOT'
    };
    if (singleMap[code[i]]) {
      tokens.push({ type: singleMap[code[i]], value: code[i], line, col });
      col++;
      i++;
      continue;
    }

    // Número decimal (debe ir ANTES que entero)
    const decMatch = remaining.match(/^[0-9]+\.[0-9]+/);
    if (decMatch) {
      tokens.push({ type: 'DECIMAL', value: decMatch[0], line, col });
      col += decMatch[0].length;
      i += decMatch[0].length;
      continue;
    }

    // Número entero
    const numMatch = remaining.match(/^[0-9]+/);
    if (numMatch) {
      tokens.push({ type: 'NUMERO', value: numMatch[0], line, col });
      col += numMatch[0].length;
      i += numMatch[0].length;
      continue;
    }

    // Identificador o palabra reservada
    const idMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (idMatch) {
      const val = idMatch[0];
      let type = 'IDENTIFICADOR';
      if (val === 'verdad' || val === 'falso') type = 'BOOLEANO';
      else if (val === 'nulo') type = 'NULO';
      else if (KEYWORDS.includes(val)) type = 'RESERVADA';
      tokens.push({ type, value: val, line, col });
      col += val.length;
      i += val.length;
      continue;
    }

    // Carácter no reconocido → error léxico
    errors.push({ type: 'LÉXICO', msg: `Carácter no permitido: '${code[i]}'`, line, col });
    col++;
    i++;
  }

  return { tokens, errors };
}

// ============================================================
//  ANALIZADOR SINTÁCTICO  (descendente recursivo)
// ============================================================
function parser(tokens, lexErrors) {
  const errors = [...lexErrors];
  const symbols = [];
  let pos = 0;

  // Filtramos comentarios para el parser
  const filtered = tokens.filter(t => t.type !== 'COMENTARIO');

  function peek()    { return filtered[pos] || { type: 'EOF', value: 'EOF', line: 0, col: 0 }; }
  function advance() { return filtered[pos++]; }
  function match(...types) { return types.includes(peek().type); }

  function consume(type) {
    if (peek().type === type) return advance();
    const tk = peek();
    errors.push({
      type: 'SINTÁCTICO',
      msg: `Se esperaba '${type}' pero se encontró '${tk.value}'`,
      line: tk.line, col: tk.col
    });
    return null;
  }

  // ── programa ──────────────────────────────────────────────
  function parseProgram() {
    const node = { type: 'PROGRAMA', children: [] };
    while (pos < filtered.length) {
      if (peek().type === 'RESERVADA' && peek().value === 'rutina') {
        node.children.push(parseRutina());
      } else {
        const tk = peek();
        errors.push({ type: 'SINTÁCTICO', msg: `Token inesperado: '${tk.value}'`, line: tk.line, col: tk.col });
        advance();
      }
    }
    return node;
  }

  // ── rutina NombreRutina { ... } ───────────────────────────
  function parseRutina() {
    advance(); // consume 'rutina'
    const nameTk = peek();
    let name = '';
    if (peek().type === 'IDENTIFICADOR') {
      name = advance().value;
    } else {
      errors.push({ type: 'SINTÁCTICO', msg: 'Se esperaba nombre de rutina', line: nameTk.line, col: nameTk.col });
    }

    if (peek().type !== 'LLAVE_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: `Se esperaba '{' para abrir rutina '${name}'`, line: peek().line, col: peek().col });
    } else advance();

    const children = parseInstrucciones();

    if (peek().type !== 'LLAVE_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: `Se esperaba '}' para cerrar rutina '${name}'`, line: peek().line, col: peek().col });
    } else advance();

    return { type: 'RUTINA', name, children };
  }

  // ── lista de instrucciones ────────────────────────────────
  function parseInstrucciones() {
    const nodes = [];
    while (pos < filtered.length && peek().type !== 'LLAVE_CIE' && peek().type !== 'EOF') {
      nodes.push(parseInstruccion());
    }
    return nodes;
  }

  // ── instruccion individual ────────────────────────────────
  function parseInstruccion() {
    const tk = peek();

    if (tk.type === 'RESERVADA') {
      if (TYPES.includes(tk.value))           return parseDeclaracion();
      if (tk.value === 'levantar')            return parseLevantar();
      if (tk.value === 'si_cumplo')           return parseCondicional();
      if (tk.value === 'mientras_pueda')      return parseMientras();
      if (tk.value === 'retornar')            return parseRetorno();
      if (tk.value === 'marca') {
        advance();
        consume('PUNTO_COMA');
        return { type: 'MARCA' };
      }
    }

    if (tk.type === 'IDENTIFICADOR') return parseAsignacion();

    errors.push({ type: 'SINTÁCTICO', msg: `Instrucción inválida: '${tk.value}'`, line: tk.line, col: tk.col });
    advance();
    return { type: 'ERROR_NODE' };
  }

  // ── declaración: tipo id = expr; ─────────────────────────
  function parseDeclaracion() {
    const tipo = advance().value;
    const idTk = peek();
    let name = '';

    if (peek().type === 'IDENTIFICADOR') {
      name = advance().value;
    } else {
      errors.push({ type: 'SINTÁCTICO', msg: 'Se esperaba identificador en declaración', line: idTk.line, col: idTk.col });
    }

    consume('ASIGNACION');
    const expr = parseExpresion();

    if (peek().type !== 'PUNTO_COMA') {
      errors.push({ type: 'SINTÁCTICO', msg: `Falta ';' después de declaración de '${name}'`, line: peek().line, col: peek().col });
    } else advance();

    if (name) symbols.push({ name, tipo, value: exprToString(expr), line: idTk.line });
    return { type: 'DECLARACION', tipo, name, expr };
  }

  // ── asignación: id = expr; ───────────────────────────────
  function parseAsignacion() {
    const name = advance().value;
    consume('ASIGNACION');
    const expr = parseExpresion();

    if (peek().type !== 'PUNTO_COMA') {
      errors.push({ type: 'SINTÁCTICO', msg: `Falta ';' después de asignación a '${name}'`, line: peek().line, col: peek().col });
    } else advance();

    return { type: 'ASIGNACION', name, expr };
  }

  // ── levantar(expr); ──────────────────────────────────────
  function parseLevantar() {
    advance(); // 'levantar'
    if (peek().type !== 'PAREN_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '(' en levantar()", line: peek().line, col: peek().col });
    } else advance();

    const expr = parseExpresion();

    if (peek().type !== 'PAREN_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba ')' en levantar()", line: peek().line, col: peek().col });
    } else advance();

    if (peek().type !== 'PUNTO_COMA') {
      errors.push({ type: 'SINTÁCTICO', msg: "Falta ';' después de levantar()", line: peek().line, col: peek().col });
    } else advance();

    return { type: 'LEVANTAR', expr };
  }

  // ── si_cumplo (cond) { } sino { } ────────────────────────
  function parseCondicional() {
    advance(); // 'si_cumplo'
    if (peek().type !== 'PAREN_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '(' en si_cumplo", line: peek().line, col: peek().col });
    } else advance();

    const cond = parseExpresion();

    if (peek().type !== 'PAREN_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba ')' en si_cumplo", line: peek().line, col: peek().col });
    } else advance();

    if (peek().type !== 'LLAVE_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '{' en si_cumplo", line: peek().line, col: peek().col });
    } else advance();

    const body = parseInstrucciones();

    if (peek().type !== 'LLAVE_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '}' para cerrar si_cumplo", line: peek().line, col: peek().col });
    } else advance();

    let elseBody = null;
    if (peek().type === 'RESERVADA' && peek().value === 'sino') {
      advance();
      if (peek().type !== 'LLAVE_ABR') {
        errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '{' en sino", line: peek().line, col: peek().col });
      } else advance();

      elseBody = parseInstrucciones();

      if (peek().type !== 'LLAVE_CIE') {
        errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '}' para cerrar sino", line: peek().line, col: peek().col });
      } else advance();
    }

    return { type: 'CONDICIONAL', cond, body, elseBody };
  }

  // ── mientras_pueda (cond) { } ────────────────────────────
  function parseMientras() {
    advance(); // 'mientras_pueda'
    if (peek().type !== 'PAREN_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '(' en mientras_pueda", line: peek().line, col: peek().col });
    } else advance();

    const cond = parseExpresion();

    if (peek().type !== 'PAREN_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba ')' en mientras_pueda", line: peek().line, col: peek().col });
    } else advance();

    if (peek().type !== 'LLAVE_ABR') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '{' en mientras_pueda", line: peek().line, col: peek().col });
    } else advance();

    const body = parseInstrucciones();

    if (peek().type !== 'LLAVE_CIE') {
      errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba '}' para cerrar mientras_pueda", line: peek().line, col: peek().col });
    } else advance();

    return { type: 'MIENTRAS', cond, body };
  }

  // ── retornar expr; ───────────────────────────────────────
  function parseRetorno() {
    advance(); // 'retornar'
    const expr = parseExpresion();
    if (peek().type !== 'PUNTO_COMA') {
      errors.push({ type: 'SINTÁCTICO', msg: "Falta ';' después de retornar", line: peek().line, col: peek().col });
    } else advance();
    return { type: 'RETORNO', expr };
  }

  // ── expresión (con operadores binarios) ──────────────────
  function parseExpresion() {
    let left = parseTerm();
    const binOps = ['SUMA','RESTA','IGUAL_IGUAL','DIFERENTE','MENOR','MAYOR','MENOR_IGUAL','MAYOR_IGUAL','AND','OR'];
    while (match(...binOps)) {
      const op = advance().value;
      const right = parseTerm();
      left = { type: 'BINARIO', op, left, right };
    }
    return left;
  }

  // ── término (* /) ─────────────────────────────────────────
  function parseTerm() {
    let left = parseFactor();
    while (match('MULT', 'DIV')) {
      const op = advance().value;
      const right = parseFactor();
      left = { type: 'BINARIO', op, left, right };
    }
    return left;
  }

  // ── factor (átomo) ────────────────────────────────────────
  function parseFactor() {
    const tk = peek();

    if (tk.type === 'NOT')         { advance(); return { type: 'UNARIO', op: '!', expr: parseFactor() }; }
    if (tk.type === 'NUMERO')      { advance(); return { type: 'NUMERO',      value: tk.value }; }
    if (tk.type === 'DECIMAL')     { advance(); return { type: 'DECIMAL',     value: tk.value }; }
    if (tk.type === 'CADENA')      { advance(); return { type: 'CADENA',      value: tk.value }; }
    if (tk.type === 'BOOLEANO')    { advance(); return { type: 'BOOLEANO',    value: tk.value }; }
    if (tk.type === 'NULO')        { advance(); return { type: 'NULO',        value: 'nulo'    }; }
    if (tk.type === 'IDENTIFICADOR') { advance(); return { type: 'ID',        value: tk.value }; }

    if (tk.type === 'PAREN_ABR') {
      advance();
      const expr = parseExpresion();
      if (peek().type !== 'PAREN_CIE') {
        errors.push({ type: 'SINTÁCTICO', msg: "Se esperaba ')'", line: peek().line, col: peek().col });
      } else advance();
      return expr;
    }

    // No es ningún factor válido
    const skipTypes = ['EOF', 'PUNTO_COMA', 'LLAVE_CIE', 'PAREN_CIE'];
    if (!skipTypes.includes(tk.type)) {
      errors.push({ type: 'SINTÁCTICO', msg: `Factor inesperado: '${tk.value}'`, line: tk.line, col: tk.col });
      advance();
    }
    return { type: 'VACIO' };
  }

  const ast = parseProgram();
  return { ast, errors, symbols };
}

// ============================================================
//  UTILIDADES
// ============================================================

/** Convierte un nodo de expresión a string legible para la tabla de símbolos */
function exprToString(node) {
  if (!node) return '?';
  if (['NUMERO','DECIMAL','CADENA','BOOLEANO','ID','NULO'].includes(node.type)) return node.value || '?';
  if (node.type === 'BINARIO') return `${exprToString(node.left)} ${node.op} ${exprToString(node.right)}`;
  if (node.type === 'UNARIO')  return `!${exprToString(node.expr)}`;
  return '?';
}

/** Escapa caracteres HTML para evitar XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  RENDERIZADORES DE RESULTADOS
// ============================================================

const TOKEN_COLORS = {
  RESERVADA:    '#e94560', IDENTIFICADOR: '#a8e6cf',
  NUMERO:       '#ffd700', DECIMAL:       '#ffd700',
  CADENA:       '#98d8c8', BOOLEANO:      '#c3b1e1',
  COMENTARIO:   '#555555', ASIGNACION:    '#f0a0a0',
  PUNTO_COMA:   '#888888', LLAVE_ABR:     '#ff9f43',
  LLAVE_CIE:    '#ff9f43', PAREN_ABR:     '#fdcb6e',
  PAREN_CIE:    '#fdcb6e', SUMA:          '#f0a0a0',
  RESTA:        '#f0a0a0', MULT:          '#f0a0a0',
  DIV:          '#f0a0a0', IGUAL_IGUAL:   '#a29bfe',
  DIFERENTE:    '#a29bfe', MENOR:         '#a29bfe',
  MAYOR:        '#a29bfe', MENOR_IGUAL:   '#a29bfe',
  MAYOR_IGUAL:  '#a29bfe', AND:           '#fd79a8',
  OR:           '#fd79a8', NULO:          '#b2bec3',
  NOT:          '#f0a0a0', COMA:          '#888888'
};

function renderTokens(tokens) {
  const visible = tokens.filter(t => t.type !== 'COMENTARIO');
  if (!visible.length) return '<span class="empty-msg">Sin tokens.</span>';
  return visible.map(t => {
    const color = TOKEN_COLORS[t.type] || '#aaa';
    return `<div class="token-row">
      <span class="token-type" style="background:${color}">${t.type}</span>
      <span class="token-val">${escHtml(t.value)}</span>
      <span class="token-pos">L${t.line}:C${t.col}</span>
    </div>`;
  }).join('');
}

function renderErrors(errors) {
  if (!errors.length) return '<div class="ok-msg">Sin errores detectados.</div>';
  return errors.map(e =>
    `<div class="error-row">
      <span class="err-badge">${e.type}</span>
      <span>${escHtml(e.msg)}</span>
      ${e.line ? `<span class="err-pos">L${e.line}${e.col ? ':C' + e.col : ''}</span>` : ''}
    </div>`
  ).join('');
}

function renderSymbols(symbols) {
  if (!symbols.length) return '<span class="empty-msg">Sin variables declaradas.</span>';
  return `<table class="sym-table">
    <thead><tr><th>#</th><th>Nombre</th><th>Tipo</th><th>Valor inicial</th><th>Línea</th></tr></thead>
    <tbody>
      ${symbols.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escHtml(s.name)}</td>
          <td class="td-tipo">${s.tipo}</td>
          <td>${escHtml(s.value || '—')}</td>
          <td>${s.line}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

// ============================================================
//  INTÉRPRETE — Ejecuta el AST y captura output de levantar()
// ============================================================
function interpreter(ast) {
  const output = [];
  const variables = {};
  let isExecuting = true;

  function evaluateExpr(expr) {
    if (!expr) return null;

    if (expr.type === 'NUMERO') return parseInt(expr.value);
    if (expr.type === 'DECIMAL') return parseFloat(expr.value);
    if (expr.type === 'CADENA') return expr.value.slice(1, -1); // Remover comillas
    if (expr.type === 'BOOLEANO') return expr.value === 'verdad';
    if (expr.type === 'NULO') return null;

    if (expr.type === 'ID') {
      return variables[expr.value] !== undefined ? variables[expr.value] : null;
    }

    if (expr.type === 'BINARIO') {
      const left = evaluateExpr(expr.left);
      const right = evaluateExpr(expr.right);
      switch (expr.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '==': return left == right;
        case '!=': return left != right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '&&': return left && right;
        case '||': return left || right;
        default: return null;
      }
    }

    if (expr.type === 'UNARIO') {
      if (expr.op === '!') return !evaluateExpr(expr.expr);
    }

    return null;
  }

  function executeNode(node) {
    if (!isExecuting || !node) return;

    if (node.type === 'DECLARACION') {
      variables[node.name] = evaluateExpr(node.expr);
    }

    if (node.type === 'ASIGNACION') {
      variables[node.name] = evaluateExpr(node.expr);
    }

    if (node.type === 'LEVANTAR') {
      const val = evaluateExpr(node.expr);
      output.push(String(val));
    }

    if (node.type === 'CONDICIONAL') {
      const condition = evaluateExpr(node.cond);
      if (condition && node.body) {
        node.body.forEach(n => executeNode(n));
      } else if (!condition && node.elseBody) {
        node.elseBody.forEach(n => executeNode(n));
      }
    }

    if (node.type === 'MIENTRAS') {
      let watchdog = 0;
      while (evaluateExpr(node.cond) && watchdog++ < 10000) {
        if (node.body) {
          node.body.forEach(n => executeNode(n));
        }
      }
    }

    if (node.type === 'RETORNO') {
      isExecuting = false;
    }
  }

  function executeProgram(node) {
    if (node.type === 'PROGRAMA' && node.children) {
      node.children.forEach(rutina => {
        if (rutina.type === 'RUTINA' && rutina.children) {
          rutina.children.forEach(n => executeNode(n));
        }
      });
    }
  }

  executeProgram(ast);
  return output;
}

function renderOutput(output) {
  if (!output || output.length === 0) {
    return '<div class="output-container"><span class="empty-msg">El programa no devolvió resultados.</span></div>';
  }
  return `<div class="output-container"><pre class="output-text">${output.map(o => escHtml(o)).join('\n')}</pre></div>`;
}

function renderTree(ast) {
  function nodeHtml(node, depth) {
    if (!node) return '';
    const pad = '&nbsp;'.repeat(depth * 3);

    const wrappers = {
      PROGRAMA:    ['<span class="t-programa">PROGRAMA</span>',   n => (n.children || []).map(c => nodeHtml(c, depth + 1)).join('')],
      RUTINA:      ['<span class="t-rutina">RUTINA</span>',       n => `<span class="t-val">${n.name}</span>` + (n.children || []).map(c => nodeHtml(c, depth + 1)).join('')],
      DECLARACION: ['<span class="t-decl">DECLARACION</span>',   n => `<span class="t-tipo">${n.tipo}</span> <span class="t-val">${n.name}</span><br>` + nodeHtml(n.expr, depth + 1)],
      ASIGNACION:  ['<span class="t-asig">ASIGNACION</span>',    n => `<span class="t-val">${n.name}</span><br>` + nodeHtml(n.expr, depth + 1)],
      LEVANTAR:    ['<span class="t-levantar">LEVANTAR</span>',   n => nodeHtml(n.expr, depth + 1)],
      RETORNO:     ['<span class="t-retorno">RETORNAR</span>',    n => nodeHtml(n.expr, depth + 1)],
      MARCA:       ['<span class="t-marca">MARCA</span>',         () => ''],
      CONDICIONAL: ['<span class="t-cond">SI_CUMPLO</span>',     n =>
        `<br>${'&nbsp;'.repeat((depth+1)*3)}<span class="t-label">cond:</span><br>` + nodeHtml(n.cond, depth + 2) +
        `${'&nbsp;'.repeat((depth+1)*3)}<span class="t-label">entonces:</span><br>` + (n.body || []).map(c => nodeHtml(c, depth + 2)).join('') +
        (n.elseBody ? `${'&nbsp;'.repeat((depth+1)*3)}<span class="t-label">sino:</span><br>` + n.elseBody.map(c => nodeHtml(c, depth + 2)).join('') : '')
      ],
      MIENTRAS:    ['<span class="t-mientras">MIENTRAS_PUEDA</span>', n =>
        nodeHtml(n.cond, depth + 1) + (n.body || []).map(c => nodeHtml(c, depth + 1)).join('')
      ],
      BINARIO:     ['<span class="t-binario">BINARIO</span>',    n => `<span class="t-op">${n.op}</span><br>` + nodeHtml(n.left, depth + 1) + nodeHtml(n.right, depth + 1)],
      UNARIO:      ['<span class="t-binario">UNARIO</span>',     n => `<span class="t-op">${n.op}</span><br>` + nodeHtml(n.expr, depth + 1)],
    };

    if (wrappers[node.type]) {
      const [label, childFn] = wrappers[node.type];
      return `${pad}${label} ${childFn(node)}<br>`;
    }

    // Átomos (hojas)
    if (['NUMERO','DECIMAL','CADENA','BOOLEANO','ID','NULO'].includes(node.type)) {
      return `${pad}<span class="t-atom">${node.type}</span> <span class="t-val">${escHtml(node.value || '')}</span><br>`;
    }

    return `${pad}<span class="t-generic">${node.type}</span><br>`;
  }

  return nodeHtml(ast, 0) || '<span class="empty-msg">Árbol vacío</span>';
}

// ============================================================
//  FUNCIÓN PRINCIPAL — compila el código del textarea
// ============================================================
function compile() {
  const code = document.getElementById('code-input').value;
  if (!code.trim()) {
    clearAll();
    return;
  }

  const { tokens, errors: lexErrors } = lexer(code);
  const { ast, errors, symbols }      = parser(tokens, lexErrors);

  const lexOnly = errors.filter(e => e.type === 'LÉXICO');
  const synOnly = errors.filter(e => e.type === 'SINTÁCTICO');

  document.getElementById('tokens-output').innerHTML  = renderTokens(tokens);
  document.getElementById('errors-output').innerHTML  = renderErrors(errors);
  document.getElementById('symbols-output').innerHTML = renderSymbols(symbols);
  document.getElementById('tree-output').innerHTML    = renderTree(ast);

  // Ejecutar el programa si no hay errores
  if (errors.length === 0) {
    const output = interpreter(ast);
    document.getElementById('output-result').innerHTML = renderOutput(output);
  } else {
    document.getElementById('output-result').innerHTML = '<div class="output-container"><span class="error-msg">No se puede ejecutar: hay errores en la compilacion.</span></div>';
  }

  const ok = errors.length === 0;
  const stEl = document.getElementById('status-txt');
  stEl.textContent  = ok ? 'OK — Compilación exitosa' : 'ERRORES detectados';
  stEl.className    = ok ? 'status-ok' : 'status-err';

  document.getElementById('tok-count').textContent = tokens.filter(t => t.type !== 'COMENTARIO').length;
  document.getElementById('lex-count').textContent = lexOnly.length;
  document.getElementById('syn-count').textContent = synOnly.length;
}

function clearAll() {
  document.getElementById('code-input').value         = '';
  document.getElementById('tokens-output').innerHTML  = '<span class="empty-msg">Los tokens aparecerán aquí...</span>';
  document.getElementById('errors-output').innerHTML  = '<span class="empty-msg">Sin errores detectados.</span>';
  document.getElementById('tree-output').innerHTML    = '<span class="empty-msg">El árbol aparecerá aquí tras compilar...</span>';
  document.getElementById('symbols-output').innerHTML = '<span class="empty-msg">Los símbolos declarados aparecerán aquí...</span>';
  document.getElementById('output-result').innerHTML  = '<span class="empty-msg">El resultado aparecerá aquí tras compilar...</span>';
  document.getElementById('status-txt').textContent   = 'Esperando código...';
  document.getElementById('status-txt').className     = '';
  document.getElementById('tok-count').textContent    = '0';
  document.getElementById('lex-count').textContent    = '0';
  document.getElementById('syn-count').textContent    = '0';
}

function loadSample(index) {
  document.getElementById('code-input').value = SAMPLES[index] || '';
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
}

function loadAndSwitch(index) {
  loadSample(index);
  showTabByName('editor');
  setTimeout(compile, 80);
}

function showTabByName(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
}

// ============================================================
//  GUARDAR Y ABRIR ARCHIVOS
// ============================================================

function saveFile() {
  const code = document.getElementById('code-input').value;
  
  if (!code.trim()) {
    alert('⚠️ El área de código está vacía. Escribe algo para guardar.');
    return;
  }

  // Generar nombre automático con timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  const fileName = `programa_${year}-${month}-${day}_${hour}-${minute}-${second}`;
  
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.gym`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  alert('✅ Archivo guardado como: ' + fileName + '.gym');
}

function openFile() {
  const fileInput = document.getElementById('file-input');
  fileInput.click();
}

function handleFileOpen(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = function(e) {
    const content = e.target.result;
    document.getElementById('code-input').value = content;
    alert('✅ Archivo cargado: ' + file.name);
  };
  
  reader.onerror = function() {
    alert('❌ Error al abrir el archivo');
  };
  
  reader.readAsText(file);
  
  // Limpiar input para poder abrir el mismo archivo otra vez
  event.target.value = '';
}

// Atajo de teclado Ctrl+Enter para compilar
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') compile();
});
