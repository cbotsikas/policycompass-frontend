var phridge = require('phridge');
var url = require('url');
var Service = {};

Service.init = function(options){
    this.options = options;
};

Service.createPhantom = function() {
    //http://phantomjs.org/api/command-line.html
    var args = {
        '--ignore-ssl-errors': true,
        '--ssl-protocol': 'tlsv1.2'
    };

    console.log('starting phantom...');
    console.log("createPhantom "+this.options);

    phridge.spawn(args)
        .then(this.onPhantomCreate.bind(this))
        .catch(function(err) {
            console.error(err.stack);
        });
};

Service.onPhantomCreate = function(phantom) {
    var _this = this;
    console.log('started phantom');
    this.phantom = phantom;
    this.phantomInstanceId = Math.random();
    this.pagesHandled = 0;
    this.pagesPending = 0;

    this.phantom.on('unexpectedExit', function(err) {
        console.log('phantom crashed, restarting...');
        process.nextTick(_this.createPhantom.bind(_this));
    });

    this.phantom.run(function() {
        //this = PhantomJS : phantom Object
        this.cookiesEnabled = true;
    });
};

Service.createPage = function(request) {
    var _this = this;
    console.log('createPage',this.phantomInstanceId, this.pagesHandled, this.pagesPending);
    if(!this.phantom) {
        setTimeout(function(){
            _this.createPage(request);
        }, 50);
    } else {
        request.browser = {};
        request.browser.phantomInstanceId = this.phantomInstanceId;
        request.browser.page = this.phantom.createPage();
        request.browser.pageClosed = false;
        request.browser.pageLoaded = false;
        request.browser.pageStatus = null;
        request.browser.pendingRequests = null;

        this.pagesPending++;
        this.onPageCreate(request);
    }
};

Service.onPageCreate = function(request) {
    var _this = this;
    request.browser.page.run(function() {
        //this: PhantomJS : Web Page Module
        var page = this;

        page.viewportSize = {
            width: 1440,
            height: 718
        };

        try {
            if(localStorage && typeof localStorage.clear == 'function') {
                localStorage.clear();
            }
        } catch (e) {}
        //https://github.com/ariya/phantomjs/issues/10357
        try {
            if(page.clearMemoryCache && typeof page.clearMemoryCache == 'function') {
                page.clearMemoryCache();
            }
        } catch (e) {}

        console.log(JSON.stringify(page));
        page.renderer = {
            initialized: false,
            loadStarted: null,
            loadFinished: null,
            navigationRequested: null,
            pageCreated: null,
            resourcesRequested: [],
            resourcesReceived: [],
            resourcesTimeout: [],
            lastResourceReceived: null,
            urlChanged: false
        };

        page.onConsoleMessage = function(msg, lineNum, sourceId) {
            console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
        };

        page.onLoadStarted = function() {
            page.renderer.loadStarted = new Date();
            console.log('onLoadStarted');
        };
        page.onLoadFinished = function(pageStatus) {
            page.renderer.loadFinished = new Date();
            console.log('onLoadFinished', pageStatus);
        };
        page.onNavigationRequested = function(url, type, willNavigate, main) {
            page.renderer.navigationRequested = new Date();
            console.log('onNavigationRequested');
            console.log('Trying to navigate to: ' + url);
            console.log('Caused by: ' + type);
            console.log('Will actually navigate: ' + willNavigate);
            console.log('Sent from the page\'s main frame: ' + main);
        };
        page.onPageCreated = function() {
            page.renderer.pageCreated = new Date();
            console.log('onPageCreated');
        };

        page.onUrlChanged = function(targetUrl) {
            console.log('onUrlChanged', page.renderer.initialized, targetUrl);
            if (page.renderer.initialized) {
                page.renderer.urlChanged = true;
                page.renderer.redirectURL = targetUrl;
            }
        };
    });

    request.browser.page.run(request.blockedResources || [], function(blockedResources){
        var page = this;

        page.renderer.resourcesRequested = 0;
        page.renderer.resourcesReceived = 0;
        page.renderer.resourcesTimeout = 0;
        page.renderer.resourcesLastReceived = 0;
        page.renderer.headers = null;
        page.renderer.status = null;
        page.renderer.redirectURL = null;



        page.onResourceRequested = function(requestData, networkRequest) {
            //console.log('onResourceRequested', requestData.id, requestData.url);
            //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
            for(var i = 0,l = blockedResources.length; i < l; i++) {
                var regex = new RegExp(blockedResources[i], 'gi');
                if(regex.test(requestData.url)) {
                    request.abort();
                    requestData.aborted = true;
                    break;
                }
            }
            if(!requestData.aborted) {
                page.renderer.resourcesRequested++;
            }

        };
        page.onResourceReceived = function(response) {
            //console.log('onResourceReceived', response.id, response.stage, response.url);
            //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));

            page.renderer.resourcesLastReceived = new Date();

            if (response.id === 1) {
                page.renderer.headers = response.headers;
                page.renderer.redirectURL = response.redirectURL;

            }

            if (response.stage === 'end') {
                if (response.id === 1) {
                    page.renderer.status = response.status;
                }
                page.renderer.resourcesReceived++;
            }
        };
        page.onResourceTimeout = function(request) {
            console.log('onResourceTimeout', request.id);
            //console.log('Response (#' + request.id + '): ' + JSON.stringify(request));

            page.renderer.resourcesTimeout++;
        };
        // PhandomJS will also trigger onResourceReceived for the resource.
        page.onResourceError = function(resourceError) {
            console.log('onResourceError', resourceError.id, resourceError.errorCode, resourceError.url);
            //console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
            //console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
        };
    });

    request.browser.page.run(function(resolve) {
        var page = this;
        page.onInitialized = function() {
            page.renderer.initialized = true;
            console.log('onInitialized');
            resolve();
        };
    }).then(function() {
        if (request.onInitialized && typeof request.onInitialized == 'function'){
            request.onInitialized(request);
        }
    });

    request.browser.page.run(function(resolve) {
        var page = this;
        page.onClosing = function() {
            console.log('onClosing');
            resolve();
        };
    }).then(function() {
        request.browser.pageClosed = true;
    });

    request.browser.checkResourcesTimeout = setInterval(function(){
        _this.checkResources(request);
    }, 200);

    request.browser.page.run(request.url, function(url, resolve) {
        var page = this;
        page.open(url, function(pageStatus){
            resolve(pageStatus);
        })
    }).then(function(pageStatus) {
        console.log('Page opened with status:', pageStatus);
        request.browser.pageStatus = pageStatus;
    }).catch(function(err) {
        request.browser.pageStatus = 'fail';
        console.error('Error while checking open page.', err, err.stack);
    });

};
Service.checkResources = function(request) {
    var _this = this;
    request.browser.page.run(function(resolve){
        var page = this;
        resolve(page.renderer);
    }).then(function(renderer){
        request.browser.resourcesPending = renderer.resourcesRequested - renderer.resourcesReceived - renderer.resourcesTimeout;
        request.browser.resourcesLastReceived = new Date(renderer.resourcesLastReceived);
        request.browser.headers = renderer.headers;
        request.browser.status = renderer.status;
        request.browser.redirectURL = renderer.redirectURL || request.browser.redirectURL;

        // PhandomJS' redirectURL returned from onResourceReceived looks like it's always null. Check headers.
        if (!request.browser.redirectURL && renderer.headers){
            var locationHeader = renderer.headers.filter(function(header){
                return header.name === 'location';
            });
            if (locationHeader.length>0) {
                request.browser.redirectURL = locationHeader[0].value;
            }
        }

        // Identify SPA's URL changes
        if (renderer.urlChanged && request.browser.redirectURL && request.browser.redirectURL.indexOf('http') === 0) {
            var root = request.browser.redirectURL.indexOf('/', 7); // find the first slash after http(s)://
            request.browser.redirectURL = request.browser.redirectURL.substr(root);
            request.browser.redirectURL = url.format(url.parse(request.browser.redirectURL, true));
            request.browser.status = 302;
        }

        // Make sure that the redirectin URL is starting with the config rootPathname
        if (request.browser.redirectURL && request.browser.redirectURL.indexOf(request.rootPathname) !== 0) {
            console.info('Redirection url does not match rootPathname. Changing to root.', request.browser.redirectURL, request.rootPathname);
            request.browser.redirectURL = request.rootPathname;
        }


        //Check if redirecting
        if(request.browser.status && request.browser.status >= 300 && request.browser.status <= 399) {
            clearInterval(request.browser.checkResourcesTimeout);
            request.browser.checkResourcesTimeout = null;

            return _this.finish(request);
        }

        //Check if page didn't load properly
        if(request.browser.pageStatus === 'fail') {
            clearInterval(request.browser.checkResourcesTimeout);
            request.browser.checkResourcesTimeout = null;
            request.browser.status = 504;
            return _this.finish(request);
        }
        var timeSinceLastResourceReceived = new Date().getTime() - request.browser.resourcesLastReceived.getTime();
        console.log(request.browser.pageStatus, request.browser.resourcesPending,timeSinceLastResourceReceived, request.browser.redirectURL, JSON.stringify(renderer));

        if(request.browser.pageStatus !== null && request.browser.resourcesPending <= 0 && timeSinceLastResourceReceived > 100) {
            clearInterval(request.browser.checkResourcesTimeout);
            request.browser.checkResourcesTimeout = null;
            _this.onPageLoaded(request);
        }
    }).catch(function(err) {
        console.error('Error while checking Resource status', err, err.stack);
    });
};

Service.onPageLoaded = function(request) {
    var _this = this;
    console.log("onPageLoaded");
    if (request.browser.pageLoaded) return;
    request.browser.pageLoaded = true;
    request.browser.page.run(function(resolve) {
        var page = this;
        resolve(page.content);
    }).then(function(data){
        request.browser.html = data;
        Service.removeScripts(request);
        if (request.onPageLoaded && typeof request.onPageLoaded == 'function'){
            request.onPageLoaded(request)
                .then(function(){
                    _this.finish(request);
                });
        } else {
            _this.finish(request);
        }
    }).catch(function(err) {
        console.error("Error evaluating javascript while onPageLoaded", err, err.stack);
    });
};

Service.finish = function(request) {
    var _this = this;
    console.log("finish");
    request.onFinish(request);
    if (request.browser.page) {
        request.browser.page
            .dispose()
            .then(function(){
                request.browser.page = null;
            });
    }
    this.pagesHandled++;
    if (request.browser.phantomInstanceId == this.phantomInstanceId) {
        this.pagesPending--;
    }
    if (this.pagesHandled > 5 && this.pagesPending<=0){
        Service.disposePhantom(function() {
            process.nextTick(_this.createPhantom.bind(_this));
        });
    }
};

Service.removeScripts = function(request){
    var matches = request.browser.html.toString().match(/<script(?:.*?)>(?:[\S\s]*?)<\/script>/gi);
    for (var i = 0; matches && i < matches.length; i++) {
        if(matches[i].indexOf('application/ld+json') === -1) {
            request.browser.html = request.browser.html.toString().replace(matches[i], '');
        }
    }
};


Service.disposePhantom = function(cb) {
    console.log("Dispose PhantomJS");

    var disposed = false;
    var _this = this;
    var phantomPid = this.phantom && this.phantom.childProcess && this.phantom.childProcess.pid;



    setTimeout(function() {
        if (disposed) return;
        console.warn('Unable to dispose PhantomJS. Will try force kill for Pid:', phantomPid);
        if(phantomPid) {
            try {
                process.kill(phantomPid, 'SIGKILL');
            } catch(err) {
                console.log('Error force killing PhantomJS with Pid:', phantomPid, err, err.stack);
            }
        }
    }, 10000);


    this.phantom.dispose().then(function() {
        _this.phantom = null;
        disposed = true;
        cb && cb();
    }).catch(function(err) {
        console.error('Error disposing PhantomJS with Pid:', phantomPid, err, err.stack);
    });
};

Service.disposeAll = function(cb) {
    console.log("Dispose all PhantomJS");
    var disposed = false;
    var _this = this;

    this.phantom = null;

    setTimeout(function() {
        if (disposed) return;
        console.warn('Unable to dispose all PhantomJS. Will try disposing last instance.');
        _this.disposePhantom(cb);
    }, 10000);

    phridge.disposeAll().then(function() {
        disposed = true;
        cb && cb();
    }).catch(function(err) {
        console.error('Error disposing all PhantomJS instances:', err, err.stack);
    });
};

exports = module.exports = Service;
