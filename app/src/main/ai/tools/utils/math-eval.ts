// Self-contained arithmetic evaluator for the calculator tool. Deliberately
// NOT eval/new Function: expressions come from the LLM, whose context can
// contain untrusted web content (getDataFromUrl), so this must never be able
// to execute code.

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt,
    pow: Math.pow,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
};

type Token =
    | { kind: 'number'; value: number; pos: number }
    | { kind: 'name'; value: string; pos: number }
    | { kind: 'op'; value: string; pos: number };

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
        const char = input[i];
        if (/\s/.test(char)) {
            i++;
            continue;
        }
        if (/[0-9.]/.test(char)) {
            const start = i;
            while (i < input.length && /[0-9.]/.test(input[i])) i++;
            const text = input.slice(start, i);
            const value = Number(text);
            if (!Number.isFinite(value)) {
                throw new Error(
                    `Invalid number '${text}' at position ${start}`,
                );
            }
            tokens.push({ kind: 'number', value, pos: start });
            continue;
        }
        if (/[a-zA-Z_]/.test(char)) {
            const start = i;
            while (i < input.length && /[a-zA-Z_]/.test(input[i])) i++;
            tokens.push({
                kind: 'name',
                value: input.slice(start, i),
                pos: start,
            });
            continue;
        }
        if ('+-*/%(),'.includes(char)) {
            tokens.push({ kind: 'op', value: char, pos: i });
            i++;
            continue;
        }
        throw new Error(
            `Unexpected character '${char}' at position ${i}. Only numbers, + - * / %, parentheses, commas, and the functions ${Object.keys(FUNCTIONS).join(', ')} are supported.`,
        );
    }
    return tokens;
}

class Parser {
    private index = 0;

    constructor(private tokens: Token[]) {}

    parse(): number {
        const value = this.parseExpression();
        const leftover = this.tokens[this.index];
        if (leftover) {
            throw new Error(
                `Unexpected '${'value' in leftover ? leftover.value : ''}' at position ${leftover.pos}`,
            );
        }
        return value;
    }

    // expression := term (('+' | '-') term)*
    private parseExpression(): number {
        let value = this.parseTerm();
        while (this.peekOp('+') || this.peekOp('-')) {
            const op = (this.next() as Token & { kind: 'op' }).value;
            const right = this.parseTerm();
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    // term := factor (('*' | '/' | '%') factor)*
    private parseTerm(): number {
        let value = this.parseFactor();
        while (this.peekOp('*') || this.peekOp('/') || this.peekOp('%')) {
            const op = (this.next() as Token & { kind: 'op' }).value;
            const right = this.parseFactor();
            if (op === '*') value *= right;
            else if (op === '/') value /= right;
            else value %= right;
        }
        return value;
    }

    // factor := ('-' | '+') factor | number | name '(' args ')' | '(' expression ')'
    private parseFactor(): number {
        const token = this.next();
        if (!token) {
            throw new Error('Unexpected end of expression');
        }
        if (
            token.kind === 'op' &&
            (token.value === '-' || token.value === '+')
        ) {
            const value = this.parseFactor();
            return token.value === '-' ? -value : value;
        }
        if (token.kind === 'number') {
            return token.value;
        }
        if (token.kind === 'name') {
            const fn = FUNCTIONS[token.value];
            if (!fn) {
                throw new Error(
                    `Unknown function '${token.value}' at position ${token.pos}. Supported functions: ${Object.keys(FUNCTIONS).join(', ')}.`,
                );
            }
            this.expectOp('(', token.value);
            const args: number[] = [];
            if (!this.peekOp(')')) {
                args.push(this.parseExpression());
                while (this.peekOp(',')) {
                    this.next();
                    args.push(this.parseExpression());
                }
            }
            this.expectOp(')', token.value);
            return fn(...args);
        }
        if (token.kind === 'op' && token.value === '(') {
            const value = this.parseExpression();
            if (!this.peekOp(')')) {
                throw new Error(
                    `Missing closing ')' for '(' at position ${token.pos}`,
                );
            }
            this.next();
            return value;
        }
        throw new Error(`Unexpected '${token.value}' at position ${token.pos}`);
    }

    private peekOp(value: string): boolean {
        const token = this.tokens[this.index];
        return token?.kind === 'op' && token.value === value;
    }

    private next(): Token | undefined {
        return this.tokens[this.index++];
    }

    private expectOp(value: string, context: string): void {
        if (!this.peekOp(value)) {
            const token = this.tokens[this.index];
            throw new Error(
                token
                    ? `Expected '${value}' after '${context}' but found '${token.value}' at position ${token.pos}`
                    : `Expected '${value}' after '${context}' but the expression ended`,
            );
        }
        this.next();
    }
}

export function evaluateExpression(expression: string): number {
    const tokens = tokenize(expression);
    if (tokens.length === 0) {
        throw new Error('Expression is empty');
    }
    const result = new Parser(tokens).parse();
    if (!Number.isFinite(result)) {
        throw new Error(
            'Result is not a finite number (division by zero or invalid arguments?)',
        );
    }
    return result;
}
