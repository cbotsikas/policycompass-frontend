var time = Date.now();
var timep = time;
var system = require('system');
var page = require('webpage').create();
var fs = require('fs');

function logTime(label, fromTime){
    var s = "Time";
    if (label) s = label;
    var t = Date.now();
    var o = timep.time || timep;
    var logmsg ="@"+((t - time)/1000)+"s" + "\t+"+((t - o)/1000)+"s\t" + s;
    if (fromTime !== undefined){
        if (fromTime === fromTime-0) fromTime = {time:fromTime};
        logmsg += " (+"+((t - fromTime.time)/1000)+"s"+((fromTime.label)?" from: "+fromTime.label:"")+")";
    }
    console.log(logmsg);
    timep={label:label,time:t};
    return timep;
}

var p = "https://frontend-stage.policycompass.eu/app/#!/visualizations/9";
//var p = "https://frontend-stage.policycompass.eu/app/#!/visualizations/23";
if (system.args.length > 1)
    p = system.args[1];

page.viewportSize = {
    width: 1280,
    height: 918
};

page.onConsoleMessage = function (msg) { logTime(msg); };

page.onInitialized = function() {
    page.evaluate(function() {
        console.log(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth, window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
        //Disable d3's transitions API
        //https://github.com/mbostock/d3/issues/1789
        window.flushAnimationFrames = function() {
            var now = Date.now;
            Date.now = function() { return Infinity; };
            d3.timer.flush();
            Date.now = now;
        };
    });
};
page.onResourceRequested = function(request) {
    logTime('Request ' +request.id+" "+ JSON.stringify(request.url, undefined, 4));
};
page.onResourceReceived = function(response) {
    logTime('Receive ' +request.id+" "+ JSON.stringify(response.url, undefined, 4));
};

logTime("Loading page: "+p);
page.onCallback = function(data){
    console.log(JSON.stringify(data, null, 4));
};
page.open(p, function() {
    logTime("Page Loaded");

    fs.write('static.html', page.content, 'w');
    logTime("Static html created");



    console.log(JSON.stringify(page.viewportSize, null, 4));
    console.log(JSON.stringify(page.clipRect, null, 4));

    var clipRect = page.evaluate(function() {

        try {
            window.callPhantom(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth, window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
            window.callPhantom(pcApp);
            commonmanager.run([
                '$rootScope', function ($rootScope) {
                    $rootScope.$on('$locationChangeStart', function () {
                        window.callPhantom({text: '$locationChangeStart'});
                    });

                    $rootScope.$on('$locationChangeSuccess', function () {
                        window.callPhantom({text: '$locationChangeSuccess'});

                    });

                    $rootScope.$on('$viewContentLoaded', function () {
                        window.callPhantom({text: '$viewContentLoaded'});

                    });
                }
            ])
            window.callPhantom({text: 'injected'});
            flushAnimationFrames(); // Render visualisation's final state
            var chartContainer = document.querySelector("div:not(.ng-hide)>div>.container_graph");
            var rect = chartContainer.getBoundingClientRect(); // Measure svg container
            var svg = chartContainer.querySelector("svg"); // svg's container has display:block covering the more width than the svg. Can be fixed with display:inline-block.
            if (svg == null) svg = rect;
            return {
                top: rect.top,
                left: rect.left,
                width: svg.clientWidth,
                height: rect.height
            };
        } catch (e) {
            console.log("Can't locate a graph container or svg",JSON.stringify(e, null, 4));
        }
    });
    console.log(JSON.stringify(clipRect, null, 4));
    var ft = logTime("Visualisation measured");
    page.render('fullpage.png');
    logTime("Fullpage captured", ft);

    var oldClip = page.clipRect;
    page.clipRect = clipRect;

    page.render('visualisation.png');
    logTime("Visualisation captured", ft);

    page.clipRect = oldClip; // Reset clipping rectangle for fullpage capture.
    //page.render('fullpage.png');
    //logTime("Fullpage captured", ft);

    //PhantomJS 1.9.8 error workaround
    //https://github.com/guard/guard-jasmine/pull/177/files
    page.close();
    setTimeout(phantom.exit, 0);
});
