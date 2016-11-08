var fs = require('fs');

exports = module.exports = {
    onInitialized: function(request) {
        return request.browser.page.run(function(resolve) {
            var page = this;
            var data = page.evaluate(function() {
                console.log(window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth, window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
                //Disable d3's transitions API
                //https://github.com/mbostock/d3/issues/1789
                window.flushAnimationFrames = function() {
                    var now = Date.now;
                    Date.now = function() { return Infinity; };
                    d3.timer.flush();
                    Date.now = now;
                };
                //return 'lla';
            });
            resolve(data);
        }).then(function(data){
            console.log(data);
        }).catch(function(err) {
            console.error("Error evaluating javascript", err, err.stack);
        })
    },
    onPageLoaded: function(request) {
        return request.browser.page.run(function(resolve) {
            var page = this;
            page.render('fullpage.png');
            console.log('fullpage.png');
            resolve(page.content);
        }).then(function(data){
            console.log("wrote fullpage.png");
            fs.writeFile('static.html', data);
            console.log("wrote static.html")
        }).catch(function(err) {
            console.error("Error evaluating javascript", err, err.stack);
        })
    }
};
