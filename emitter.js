function emitFunk(term) {

    switch(term.tag) {

        case 'Lower': return term.value + '_';

        case 'String': return JSON.stringify(term.value);

        case 'Number': return term.value;

        case 'Initialize': return 'var ' + term.name + '_ = ' + emitFunk(term.value);

        case 'Update': return term.name + '_ = ' + emitFunk(term.value);

        case 'Apply': return '_A(' + emitFunk(term.left) + ", " + emitFunk(term.right) + ')';

        case 'Function':
            var casesCode = ""; 
            var irrefutable = false;
            for(var i = 0; i < term.cases.length; i++) {
                var c = term.cases[i];
                if(c.pattern == null || c.pattern.tag == 'Lower') irrefutable = true;
                if(c.pattern != null && c.pattern.tag == 'Lower') {
                    casesCode += 'var ' + c.pattern.value + '_ = _X;\n';
                }
                if(c.pattern != null && c.pattern.tag == 'String') {
                    casesCode += 'if(_X == ' + JSON.stringify(c.pattern.value) + ') {\n';
                }
                if(c.pattern != null && c.pattern.tag == 'Number') {
                    casesCode += 'if(_X == ' + c.pattern.value + ') {\n';
                }
                casesCode += emitFunkStatements(c.body); 
                if(c.pattern != null && c.pattern.tag != 'Lower') {
                    casesCode += '}\n';
                }
            }
            if(!irrefutable) casesCode += 'throw "Unexpected argument: " + _X;';
            return 'function(_X) {\n' + casesCode + '}';

        default: throw 'Can\'t emit "' + term.tag + '" nodes.';

    }

}

function emitFunkStatements(statements) {

    if(statements.length == 0) return 'return;';

    var bodyCode = "";
    for(var i = 0; i < statements.length - 1; i++) {
        bodyCode += emitFunk(statements[i]) + ';\n';
    }

    var last = statements[statements.length - 1];
    if(!(last.tag == 'Initialize' || last.tag == 'Update')) {
        return bodyCode + 'return ' + emitFunk(last) + ';\n';
    } else {
        return bodyCode + emitFunk(last) + ';\nreturn;\n';
    }

}
