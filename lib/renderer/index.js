var browser = require('./browser');
var Visualization = require('./modules/visualizations');
var url = require('url');
var cache = require('./cache');

var Module = {};
Module.init = function(options){
    this.options = options;
    browser.init(options);
    cache.init();
    browser.createPhantom();
};
Module.shouldHandled = function(req) {
    return /(?:^\/render|_escaped_fragment_)/.exec(req.url);
};
Module.
Module.handleRequest = function(req, res) {
    var _this = this;

    var fullUrl = this.getFullUrl(req);
    var botUrl = this.normalizeBotUrl(fullUrl);


    var request = {
        url: botUrl,
        rootPathname: '/app/#!/',
        start: new Date()
    };
    //request.url = 'http://localhost:9000/app/#!/visualizations/17';
    //request.url = 'https://frontend-stage.policycompass.eu/app/#!/ags/4';

    this.crawl(request, function (request){
        if (request.browser.redirectURL)
            res.setHeader('Location', request.browser.redirectURL);

        if (request.browser.html) {
            res.setHeader('Content-Type', 'text/html;charset=UTF-8');
            res.setHeader('Content-Length', Buffer.byteLength(request.browser.html, 'utf8'));
        }

        //if the original server had a chunked encoding, we should remove it since we aren't sending a chunked response
        res.removeHeader('Transfer-Encoding');
        //if the original server wanted to keep the connection alive, let's close it
        res.removeHeader('Connection');
        //getting 502s for sites that return these headers
        res.removeHeader('X-Content-Security-Policy');
        res.removeHeader('Content-Security-Policy');

        res.writeHead(request.browser.status || 504);

        if (request.browser.html) {
            res.write(request.browser.html);
        }

        res.end();
        if (request.browser.html) {
            cache.store(request.url, request.browser.html);
        }
    });
};

Module.crawl = function(request, cb) {
    request.blockedResources = [
        "google-analytics.com",
        "fonts.googleapis.com",
        "use.typekit.net",
        "youtube.com\/embed",
        "\\.ttf",
        "\\.eot",
        "\\.otf",
        "\\.woff",
        "adhocracy-frontend-stage.policycompass.eu",
        "adhocracy-prod.policycompass.eu",
        "piwik.policycompass.eu",
        "creativecommons.org",
        "licensebuttons.net"
    ];
    request.onInitialized = Visualization.onInitialized;
    //request.onPageLoaded = Visualization.onPageLoaded;
    request.onFinish = function(request){
        var ms = new Date().getTime() - request.start.getTime();
        console.log('got', request.browser.status, 'in', ms + 'ms', 'for', request.url);
        if (cb && typeof cb == "function"){
            cb(request);
        }
    };

    console.log('getting', JSON.stringify(request));

    browser.createPage(request);
};


Module.getFullUrl = function(req) {
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



Module.normalizeBotUrl = function (realUrl) {
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

    var myhash = parts.hash;
    delete parts.hash;
    var newUrl = url.format(parts);
    var qIndex = newUrl.indexOf('?');
    var rest = "";
    if (qIndex>=0){
        rest = newUrl.substr(qIndex);
        newUrl = newUrl.substr(0, qIndex);
    }
    newUrl+=myhash+rest;

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