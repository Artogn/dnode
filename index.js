var dnode = require('./lib/dnode');
var parseArgs = require('./lib/parse_args');
var net = require('net');
var util = require('util');

exports = module.exports = function (cons, opts) {
    return new D(cons, opts);
};

exports.connect = function () {
    var d = new D();
    return d.connect.apply(d, arguments);
};

exports.listen = function () {
    var d = new D();
    return d.listen.apply(d, arguments);
};

util.inherits(D, dnode);
function D (cons, opts) {
    return dnode.call(this, cons, opts);
}

D.prototype.connect = function () {
    var self = this;  
    var params = parseArgs(arguments);
    
    var stream;
    if (params.path) {
        stream = net.connect(params.path);
    }
    else if (params.port) {
        stream = net.connect(params.port, params.host);
    }
    else {
        throw new Error('no port or unix path given');
    }
    
    if (params.block) {
        self.on('remote', function () {
            params.block.call(client.instance, client.remote, client);
        });
    }
    
    stream.on('error', function (err) {
        self.emit('error', err);
    });
    
    self.stream = stream;
    stream.pipe(self);
    self.pipe(stream);
    
    return self;
};

dnode.prototype.listen = function () {
    var self = this;
    
    // just copy over the opts and cons, the rest will need to be re-created
    var cons = self.cons, opts = self.opts;
    self.end();
    
    var params = parseArgs(arguments);
    
    var server = net.createServer(function (stream) {
        var d = new dnode(cons, opts);
        do { d.id = randomId() }
        while (server.sessions[d.id]);
        
        server.sessions[d.id] = d;
        d.on('end', function () {
            delete server.sessions[d.id];
        });
        
        d.on('local', function (ref) {
            server.emit('local', ref, d);
        });
        
        d.on('remote', function (remote) {
            server.emit('remote', remote, d);
        });
        
        d.stream = stream;
        stream.pipe(d);
        d.pipe(stream);
    });
    
    server.sessions = {};
    
    if (params.port) {
        server.listen(params.port, params.host);
    }
    else if (params.path) {
        server.listen(params.path);
    }
    else {
        throw new Error('no port or path provided');
    }
    
    if (params.block) server.on('listening', params.block);
    
    return server;
};

function randomId () {
    var s = '';
    for (var i = 0; i < 4; i++) {
        s += Math.random().toString(16).slice(2);
    }
    return s;
}
