var browser = require('./browser');
var Visualization = require('./modules/visualizations');
var url = require('url');

var Module = {};
Module.init = function(options){
    this.options = options;
    browser.init(options);
    browser.createPhantom();
};

Module.handleRequest = function(req, res) {
    var _this = this;

    var request = {
        //url: 'http://localhost:9000/app/#!/visualizations/17',
        url: this.getUrl(this.buildSiteUrl(req)),
        rootPathname: '/app/#!/',
        start: new Date()
    };

    request.onInitialized = Visualization.onInitialized;
    //request.onPageLoaded = Visualization.onPageLoaded;
    request.onFinish = function(request){
        if (request.browser.redirectURL)
            res.setHeader('Location', request.browser.redirectURL);

        if (request.browser.html) {
            res.setHeader('Content-Type', 'text/html;charset=UTF-8');
            res.setHeader('Content-Length', Buffer.byteLength(request.browser.html, 'utf8'));
        }

        res.writeHead(request.browser.status || 504);

        if (request.browser.html) {
            res.write(request.browser.html);
        }

        res.end();
    };

    console.log('getting', JSON.stringify(request));

    browser.createPage(request);
};


Module.buildSiteUrl = function(req) {
    var protocol = req.connection.encrypted ? "https" : "http";
    if (req.headers['cf-visitor']) {
        var match = req.headers['cf-visitor'].match(/"scheme":"(http|https)"/);
        if (match) protocol = match[1];
    }
    if (req.headers['x-forwarded-proto']) {
        protocol = req.headers['x-forwarded-proto'].split(',')[0];
    }
    if (this.protocol) {
        protocol = this.protocol;
    }
    var fullUrl = protocol + "://" + (this.host || req.headers['x-forwarded-host'] || req.headers['host']) + req.url;
    return fullUrl;
};



Module.getUrl = function (realUrl) {
    var decodedUrl
        , parts;

    realUrl = realUrl.replace(/^\//, '');

    try {
        decodedUrl = decodeURIComponent(realUrl);
    } catch (e) {
        decodedUrl = realUrl;
    }

    //encode a # for a non #! URL so that we access it correctly
    decodedUrl = this.encodeHash(decodedUrl);

    //if decoded url has two query params from a decoded escaped fragment for hashbang URLs
    if(decodedUrl.indexOf('?') !== decodedUrl.lastIndexOf('?')) {
        decodedUrl = decodedUrl.substr(0, decodedUrl.lastIndexOf('?')) + '&' + decodedUrl.substr(decodedUrl.lastIndexOf('?')+1);
    }

    parts = url.parse(decodedUrl, true);

    // Remove the _escaped_fragment_ query parameter
    if (parts.query && parts.query['_escaped_fragment_'] !== undefined) {

        if (parts.query['_escaped_fragment_'] && !Array.isArray(parts.query['_escaped_fragment_'])) {
            parts.hash = '#!' + parts.query['_escaped_fragment_'];
        }

        delete parts.query['_escaped_fragment_'];
        delete parts.search;
    }

    // Bing was seen accessing a URL like /?&_escaped_fragment_=
    delete parts.query[''];

    var newUrl = url.format(parts);

    //url.format encodes spaces but not arabic characters. decode it here so we can encode it all correctly later
    try {
        newUrl = decodeURIComponent(newUrl);
    } catch (e) {}

    newUrl = this.encodeHash(newUrl);
    console.log(newUrl, realUrl);
    return newUrl;
};

Module.encodeHash = function(url) {
    if(url.indexOf('#!') === -1 && url.indexOf('#') >= 0) {
        url = url.replace(/#/g, '%23');
    }

    return url;
};
exports = module.exports = Module;
