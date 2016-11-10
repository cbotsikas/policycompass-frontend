var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

exports = module.exports = {
    init: function() {
        this.root = process.cwd() + '/cache/';
        this.makePath(this.root);
    },
    fetch: function(p) {

    },
    store: function(p, data) {

    },
    clear: function(p) {

    },
    clearAll: function() {

    },
    makePath: function(p, cb){
        if (cb && typeof cb == "function"){
            mkdirp(p, function (err) {
                if (err) console.error("Failed to make path", p, err, err.stack);
                cb(err);
            });
        } else {
            mkdirp.sync(p);
        }

    },
    pathExists: function(p){
        try {
            return fs.statSync(p);
        } catch (ex) {}
        return false;
    }
};
