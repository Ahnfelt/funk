function emitFunk(term, functions) {

    switch(term.tag) {

        case 'Placeholder': return '_P';

        case 'Lower': return term.value + '_';

        case 'String': return JSON.stringify(term.value);

        case 'Number': return term.value;

        case 'Unit': return 'null';

        case 'Initialize': 
            if(term.value.tag == 'Function') functions[term.name + '_'] = true;
            return 'var ' + term.name + '_ = ' + emitFunk(term.value, functions);

        case 'And':
            return '(_B(' + emitFunk(term.left, functions) + ') && _B(' + emitFunk(term.right, functions) + '))';

        case 'Or':
            return '(_B(' + emitFunk(term.left, functions) + ') || _B(' + emitFunk(term.right, functions) + '))';

        case 'Apply': 
            // A slight optimization that removes some of the superfluous calls to _A.
            // This could be improved by putting function arity into the "functions" map.
            if(term.left.tag == 'Lower' && functions[term.left.value + '_']) {
                return emitFunk(term.left, functions) + "(" + emitFunk(term.right, functions) + ")";
            } else {
                return '_A(' + emitFunk(term.left, functions) + ", " + emitFunk(term.right, functions) + ')';
            } 

        case 'Function':
            var casesCode = ""; 
            var irrefutable = false;
            for(var i = 0; i < term.cases.length; i++) {
                var c = term.cases[i];
                if(c.pattern == null || c.pattern.tag == 'Lower') irrefutable = true;
                if(c.pattern != null && c.pattern.tag == 'Lower') {
                    casesCode += 'var ' + c.pattern.value + '_ = _X;\n';
                }
                if(c.pattern != null && c.pattern.tag == 'Placeholder') {
                    casesCode += 'var _P = _X;\n';
                }
                if(c.pattern != null && c.pattern.tag == 'String') {
                    var extra = 
                        c.pattern.value == 'Unit' ? ' || _X == null' :
                        c.pattern.value == 'True' ? ' || _X === true' :
                        c.pattern.value == 'False' ? ' || _X === false':
                        '';
                    casesCode += 'if(_X === ' + JSON.stringify(c.pattern.value) + extra + ') {\n';
                }
                if(c.pattern != null && c.pattern.tag == 'Number') {
                    casesCode += 'if(_X === ' + c.pattern.value + ') {\n';
                }
                casesCode += emitFunk.emitStatements(c.body, emitFunk.copy(functions)); 
                if(c.pattern != null && c.pattern.tag != 'Lower' && c.pattern.tag != 'Placeholder') {
                    casesCode += '}\n';
                }
            }
            if(!irrefutable) casesCode += 'throw "Unexpected argument: " + _X;';
            return 'function(_X) {\n' + casesCode + '}';

        default: throw 'Can\'t emit "' + term.tag + '" nodes.';

    }

}

emitFunk.emitStatements = function(statements, functions) {

    if(statements.length == 0) return 'return;';

    var bodyCode = "";
    for(var i = 0; i < statements.length - 1; i++) {
        bodyCode += emitFunk(statements[i], functions) + ';\n';
    }

    var last = statements[statements.length - 1];
    if(!(last.tag == 'Initialize')) {
        return bodyCode + 'return ' + emitFunk(last, functions) + ';\n';
    } else {
        return bodyCode + emitFunk(last, functions) + ';\nreturn ' + last.name + '_;\n';
    }

};

emitFunk.emitProgram = function(statements) {
    var functions = {'system_': true, 'new_': true};
    var emitted = emitFunk.emitStatements(statements, functions);
    return '(function() {\n' + emitted + '})();\n'
}

emitFunk.copy = function(map) {
    var result = {};
    for(var k in map) {
        result[k] = map[k];
    }
    return result;
};
