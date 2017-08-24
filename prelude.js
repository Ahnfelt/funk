// A function for Funk Function Application (required to support methods on primitive types in JavaScript)
function _A(f, x) {
    if(typeof f === 'function') {
        return f(x);
    } else if(typeof f === 'string') {
        switch(x) {
            case 'Show': return JSON.stringify(f);
            case 'Size': return f.length;
            case 'CharAt': return function(i) { return f.charAt(i); };
            case 'CharCodeAt': return function(i) { return f.charCodeAt(i); };
            case 'Slice': return function(b) { return function(e) { return f.substring(b, e); }; };
            case 'ToUpper': return f.toUpperCase();
            case 'ToLower': return f.toLowerCase();
            case 'Trim': return f.trim();
            case 'IndexOf': return function(v) { return f.indexOf(v); };
            case '==': return function(v) { return f == v; };
            case '!=': return function(v) { return f != v; };
            case '+': return function(v) { return f + v; };
            case '!_': return function(v) { return (v === true || v === 'True') ? 'False' : 'True'; };
            default: throw "Unexpected argument: " + x;
        }
    } else if(typeof f === 'number') {
        switch(x) {
            case 'Show': return "" + f;
            case '==': return function(v) { return f == v; };
            case '!=': return function(v) { return f != v; };
            case '>': return function(v) { return f > v; };
            case '>=': return function(v) { return f >= v; };
            case '<': return function(v) { return f < v; };
            case '<=': return function(v) { return f <= v; };
            case '-_': return -f; // Unary operator -
            case '+_': return +f; // Unary operator +
            case '+': return function(v) { return f + v; };
            case '-': return function(v) { return f - v; };
            case '*': return function(v) { return f * v; };
            case '/': return function(v) { return f / v; };
            default: throw "Unexpected argument: " + x;
        }
    } else if(Array.isArray(f)) {
        switch(x) {
            case 'Show': return "[" + f.join(", ") + "]";
            case 'Get': return function(v) { return _O(f[v]); };
            case 'Size': return f.length;
            case 'Head': return _O(f[0]);
            case 'Tail': return _O(f.length == 0 ? void 0 : f.slice(1));
            case 'Each': return function(g) { return f.forEach(function(y) { return _A(g, y); }); };
            case 'Map': return function(g) { return f.map(function(y) { return _A(g, y); }); };
            case 'Filter': return function(g) { return f.filter(function(y) { return _B(_A(g, y)); }); };
            case 'All': return function(g) { return f.every(function(y) { return _B(_A(g, y)); }); };
            case 'Any': return function(g) { return f.some(function(y) { return _B(_A(g, y)); }); };
            case 'Find': return function(g) { return _O(f.find(function(y) { return _B(_A(g, y)); })); };
            case 'FindIndex': return function(g) { return _O(f.findIndex(function(y) { return _B(_A(g, y)); })); };
            case 'Join': return function(s) { return f.join(s); };
            case 'Slice': return function(a) { return function(b) { return f.slice(a, b); } };
            case 'Fold': return function(g) { return function(x) { return f.reduce(g, x); } };
            case 'FoldRight': return function(g) { return function(x) { return f.reduceRight(g, x); } };
            case '+': return function(v) { return f.concat(v); };
            default: throw "Unexpected argument: " + x;
        }
    } else if(f === true) {
        return _A('True', x);
    } else if(f === false) {
        return _A('False', x);
    } else if(f == null) {
        return _A('Unit', x);
    } else {
        throw "Unexpected argument: " + x;
    }
}

// For using truth values with JavaScript logical operators
function _B(x) {
    return x === true || x === 'True';
}

// For converting undefined/not undefined to {_ None} and {_ Some x}
function _O(x) {
    return x === void 0 ? function(g) { return _A(g, 'None'); } : function(g) { return _A(_A(g, 'Some'), x); };
}

// Global variables can be exposed to funk simply by giving them a "_" suffix:
var system_ = function(x) {
    switch(x) {
        case 'Log': return function(v) { console.log(v) };
        case 'Dir': return function(v) { console.dir(v) };
        case 'SetText': return function(v) { document.getElementById("result").textContent = v; };
        case 'SetHtml': return function(v) { document.getElementById("result").innerHTML = v; };
        default: throw "Unexpected argument: " + x;
    }
}

// Mutable "variables" as a library function. Read with unit application, eg. "foo()".
var new_ = function(x) {
    return function(t) {
        if(t == null) return x;
        switch(t) {
            case 'Show': return 'new(' + _A(x, 'Show') + ')';
            case '*_': return x;
            case '=': return function(y) { x = y; };
            case '+=': return function(y) { x += y; };
            case '-=': return function(y) { x -= y; };
            case '*=': return function(y) { x *= y; };
            throw "Unexpected argument: " + t;
        }
    }
}
