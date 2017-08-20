function parseFunk(code) {

    var offset = 0;
    var currentLine = 1;
    var bracketStack = ['{'];

    function current() {
        return code.charAt(offset) || '\n';
    }

    function ahead() {
        return code.charAt(offset + 1) || '\n';
    }

    function next(skipSpace) {
        if(offset > code.length) throw 'Unexpected end of file at line ' + currentLine;
        offset += 1;
        if(skipSpace) skipWhitespace();
        return current();
    }

    function skipWhitespace() {
        if(bracketStack[bracketStack.length - 1] != '{') return skipLineEnd();
        var c = current();
        while(offset < code.length && (c == ' ' || c == '\t')) {
            c = next();
        }
    }

    function skipLineEnd() {
        var c = current();
        while(offset < code.length && (c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == ';')) {
            if(c == ';') while(c != '\n') c = next();
            if(c == '\n') currentLine += 1;
            c = next();
        }
    }

    function node(skipSpace, tag, line, extra) {
        extra = extra || {};
        extra.tag = tag;
        extra.line = line;
        if(skipSpace) skipWhitespace();
        return extra;
    }

    function parseLower() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c >= 'a' && c <= 'z')) return null;
        while((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) c = next();
        return node(true, 'Lower', line, {value: code.substring(start, offset)});
    }

    function parseUpper() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c >= 'A' && c <= 'Z')) return null;
        while((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) c = next();
        return node(true, 'String', line, {value: code.substring(start, offset)});
    }

    function parseNumber() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c >= '0' && c <= '9')) return null;
        while(c >= '0' && c <= '9') c = next();
        return node(true, 'Number', line, {value: code.substring(start, offset)});
    }

    function parseString() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c == '"')) return null;
        c = next();
        while(c != '"') c = next();
        c = next();
        return node(true, 'String', line, {value: code.substring(start + 1, offset - 1)});
    }

    function parseLambda() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c == '{')) return null;
        bracketStack.push('{');
        next();
        skipLineEnd();
        c = current();
        if(!(c == '|')) {
            var statements = parseStatements();
            c = current();
            if(!(c == '}')) throw 'Expected "}" after function at line ' + currentLine;
            bracketStack.pop();
            next(true);
            return node(false, 'Function', line, {cases: [node(false, 'Case', line, {pattern: null, body: statements})]});
        }
        var cases = [];
        while(c == '|') {
            next(true);
            var primaryPattern = parseUpper() || parseNumber() || parseString() || parseLower();
            if(primaryPattern == null) {
                c = current();
                if(!(c == '_')) throw 'Expected "_" wildcard pattern at line ' + currentLine;
                next(true);
            }
            var extraPatterns = [];
            var extraPattern = parseLower();
            c = current();
            while(extraPattern != null || c == '_') {
                if(extraPattern == null) next(true);
                extraPatterns.push(extraPattern);
                extraPattern = parseLower();
                c = current();
            }
            c = current();
            if(!(c == '|')) throw 'Expected "|" after pattern at line ' + currentLine;
            next();
            skipLineEnd();
            var statements = parseStatements();
            for(var i = extraPatterns.length - 1; i >= 0; i--) {
                statements = [node(false, 'Function', line, {cases: [node(false, 'Case', line, {pattern: extraPatterns[i], body: statements})]})];
            }
            cases.push(node(false, 'Case', line, {pattern: primaryPattern, body: statements}));
            c = current();
        }
        c = current();
        if(!(c == '}')) throw 'Expected "}" after function at line ' + currentLine;
        bracketStack.pop();
        next(true);
        return node(false, 'Function', line, {cases: cases});
    }

    function parseAtom() {
        var c = current();
        var start = offset;
        if(c == '(') {
            next(true);
            bracketStack.push('(');
            var term = parseTerm();
            if(term == null) term = node(false, 'Unit', line);
            c = current();
            if(!(c == ')')) throw 'Expected ")" after "(" at line ' + currentLine;
            bracketStack.pop();
            next(true);
            return term;
        } else {
            return parseLower() || parseUpper() || parseNumber() || parseString() || parseLambda();
        }
        
    }

    function parseApply() {
        var term = parseAtom();
        if(term == null) return null;
        var c = current();
        var start = offset;
        while(c == '.' || c == '(' || c == '{') {
            var line = currentLine;
            if(c == '.') {
                next(true);
                var method = parseUpper();
                if(method == null) throw 'Method name expected after "." at line ' + line;
                term = node(false, 'Apply', line, {left: term, right: method});
            } else if(c == '(') {
                next(true);
                bracketStack.push('(');
                var right = parseTerm();
                if(right == null) {
                    term = node(false, 'Apply', line, {left: term, right: node(false, 'Unit', line)});
                } else {
                    term = node(false, 'Apply', line, {left: term, right: right});
                    while(current() == ',') {
                        next(true);
                        var right = parseTerm();
                        if(right == null) throw 'Term expected after "," at line ' + line;
                        term = node(false, 'Apply', line, {left: term, right: right});
                    }
                }
                c = current();
                if(c != ')') throw '")" expected after "(" at line ' + line;
                bracketStack.pop();
                next(true);
            } else {
                var argument = parseLambda();
                if(argument == null) throw 'Lambda function argument expected at line ' + line;
                term = node(false, 'Apply', line, {left: term, right: argument});
            }
            c = current();
        }
        return term;
    }

    function parseUnaryOperator() {
        var c = current();
        var start = offset;
        var line = currentLine;
        while('@!#$%/=?^~*<>+-'.indexOf(c) != -1) {
            c = next();
        }
        var operator = code.substring(start, offset);
        skipWhitespace();
        var term = parseApply();
        if(operator.length == 0) return term;
        else if(term == null) throw 'Term expected after "' + operator + '" at line ' + line;
        else return node(false, 'Apply', line, {left: term, right: node(false, 'String', line, {value: operator + '_'})});
   }

    function parseBinaryOperator() {
        var left = parseUnaryOperator();
        if(left == null) return null;
        var c = current();
        var start = offset;
        var line = currentLine;
        while('@!#$%/=?^~*<>+-'.indexOf(c) != -1) {
            c = next();
        }
        var operator = code.substring(start, offset);
        skipWhitespace();
        if(operator.length == 0) return left;
        var right = parseBinaryOperator();
        if(right == null) throw 'Term expected after "' + operator + '" at line ' + line;
        else return node(false, 'Apply', line, {
            left: node(false, 'Apply', line, {left: left, right: node(false, 'String', line, {value: operator})}),
            right: right
        });
    }

    function parseAndOr() {
        var left = parseBinaryOperator();
        if(left == null) return null;
        var c = current();
        var n = ahead();
        var start = offset;
        var line = currentLine;
        var isAnd = c == '&' && n == '&';
        var isOr = c == '|' && n == '|';
        if(!(isAnd || isOr)) return left;
        next();
        next(true);
        var right = parseAndOr();
        if(right == null) throw 'Term expected after "' + (isAnd ? '&&' : '||') + '" at line ' + line;
        else return node(false, isAnd ? 'And' : 'Or', line, {left: left, right: right});
    }

    var parseTerm = parseAndOr;

    function parseInitialization() {
        var c = current();
        var start = offset;
        var line = currentLine;
        if(!(c == ':')) return parseTerm();
        next(true);
        var name = parseLower();
        if(name == null) throw 'Lower case identifier expected after "' + c + '" at line ' + line;
        var term = parseBinaryOperator();
        return node(false, 'Initialize', line, {name: name.value, value: term});
    }

    function parseStatements() {
        var statements = [];
        skipLineEnd();
        var statement = parseInitialization();
        if(statement == null) return statements;
        skipLineEnd();
        while(statement != null) {
            statements.push(statement);
            statement = parseInitialization();
            skipLineEnd();
        }
        return statements;
    }

    var programStatements = parseStatements();
    if(offset < code.length) throw 'Unexpected character "' + current() + '" at line ' + currentLine;
    return programStatements;

}
