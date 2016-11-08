module.exports = function (grunt) {
    'use strict';
    // Project configuration
    var projectConf = {
        js: ['app/config.js', 'app/app.js', 'app/modules/**/*.js'],
        css: ['app/css/**/*.css'],
        scss: ['app/sass/**/*.{scss,sass}'],
        index: 'app/index.html',
        injectorIgnorePath: 'app/',
        app: 'app',
        dist: 'dist'
    };
    grunt.initConfig({
        // Metadata
        pkg: grunt.file.readJSON('package.json'),
        project: projectConf,
        // Task configuration
        //concat: {
        //    options: {
        //        stripBanners: true,
        //        sourceMap: false
        //    },
        //    js: {
        //        src: '<%= project.js %>',
        //        dest: '<%= project.dist %>/js/main.js'
        //    },
        //    css: {
        //        src: '<%= project.css %>',
        //        dest: '<%= project.dist %>/css/main.css'
        //    }
        //},
        //bower_concat: {
        //    all: {
        //        dest: '<%= project.dist %>/js/vendor.js',
        //        cssDest: '<%= project.dist %>/css/vendor.css',
        //        mainFiles: {
        //            'wellaged': 'dist/wellaged.min.js',
        //            'Leaflet.Pancontrol': ['src/L.Control.Pan.js', 'src/L.Control.Pan.css']
        //        },
        //        //exclude: ['wellaged'] //uglify doesn't like wellaged
        //    }
        //},
        //uglify: {
        //    options: {
        //        mangle: false
        //    },
        //    all: {
        //        files: {
        //            '<%= project.dist %>/js/main.min.js': ['<%= project.dist %>/js/main.js'],
        //            '<%= project.dist %>/js/vendor.min.js': ['<%= project.dist %>/js/vendor.js']
        //        }
        //    }
        //},
        //cssmin: {
        //    all: {
        //        files: {
        //            '<%= concat.css.dest %>': ['<%= concat.css.dest %>'],
        //            '<%= bower_concat.all.cssDest %>': ['<%= bower_concat.all.cssDest %>']
        //        }
        //    }
        //},
        injector: {
            options: {
                destFile: '<%= project.index %>',
                ignorePath: '<%= project.injectorIgnorePath %>',
                relative: true,
                addRootSlash: false
            },
            //prod: {
            //    src: [
            //        '<%= bower_concat.all.dest %>',
            //        '<%= bower_concat.all.cssDest %>',
            //        '<%= concat.js.dest %>',
            //        '<%= concat.css.dest %>'
            //    ]
            //},
            //dev: {
            //    src: [
            //        'bower.json',
            //        '<%= concat.js.src %>',
            //        '<%= concat.css.src %>'
            //    ]
            //
            //},
            app: {
                src: [
                    '<%= project.js %>',
                    '<%= project.css %>'
                ]
            }
        },
        wiredep: {
            app: {
                src: ['<%= project.index %>'],
                //ignorePath: /\.\.\//,
                //options: {
                //    exclude: [
                //        'pikaday',
                //        'angular-mocks',
                //        'zeroclipboard',
                //        'moment',
                //        'skrollr'
                //    ]
                //}
            }
        },
        useminPrepare: {
            html: '<%= project.index %>',
            options: {
                dest: '<%= project.dist %>',
                flow: {
                    html: {
                        steps: {
                            js: ['concat', 'uglifyjs'],
                            css: ['cssmin']
                        },
                        post: {}
                    }
                }
            }
        },
        // Performs rewrites based on filerev and the useminPrepare configuration
        usemin: {
            html: '<%= project.index %>',
            css: ['<%= project.dist %>/styles/{,*/}*.css'],
            js: ['<%= project.dist %>/scripts/{,*/}*.js'],
            options: {
                assetsDirs: [
                    '<%= project.dist %>',
                    '<%= project.dist %>/img',
                    '<%= project.dist %>/fonts',
                    '<%= project.dist %>/styles'
                ],
                patterns: {
                    js: [[/(images\/[^''""]*\.(png|jpg|jpeg|gif|webp|svg))/g, 'Replacing references to images']]
                },
                blockReplacements: {
                    js: function (block) {
                        grunt.log.debug("++++++++++++++++++++++++++++++++++++");
                        grunt.log.debug(JSON.stringify(block.dest));
                        //grunt.log.debug(JSON.stringify(grunt.filerev.summary));

                        return '<script src="'+block.dest+'"></script>';
                    },
                    css: function (block) {
                        grunt.log.debug("++++++++++++++++++++++++++++++++++++");
                        grunt.log.debug(JSON.stringify(block.dest));
                        //grunt.log.debug(JSON.stringify(grunt.filerev.summary));

                        return '<script src="'+block.dest+'"></script>';
                    }
                }
            }
        },
        jshint: {
            options: {
                node: true,
                browser: true,
                jquery: true,
                loopfunc: true,
                globals: {
                    console: true,
                    module: true,
                    angular: true,
                    streetlife: true
                }
            },
            app: {
                src: '<%= project.js %>'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            }

        },
        bower: {

        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= project.app %>',
                    dest: '<%= project.dist %>',
                    src: [
                        '*.{ico,png,txt}',
                        '*.html',
                        'img/{,*/}*.{webp}',
                        'fonts/{,*/}*.*'
                    ]
                }]
            }
        },
        compass: {
            watch: {
                options: {
                    watch: true
                }
            },
            dev: {
                options: {
                    watch: false
                }
            },
            prod: {
                options: {
                    watch: false,
                    environment: 'production'
                }
            }
        },
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile']
            },
            sass: {
                files: '<%= project.scss %>',
                tasks: ['compass:dev']
            }
        },
        connect: {
            options: {
                port: 9000,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: 'localhost',
                //livereload: 35729
            },
            dev: {
                options: {
                    target: 'http://localhost:9000/app/',
                    open: true,
                    base: '.',
                    middleware: function(connect, options, middlewares) {
                        // inject a custom middleware into the array of default middlewares
                        middlewares.unshift(function(req, res, next) {
                            if (req.url == '/') {
                                var target;
                                res.statusCode = 303;
                                res.setHeader('Location', '/app/');
                                res.end('Redirecting to app');
                            } else {
                                return next();
                            }
                        });

                        return middlewares;
                    }
                }
            },
            dist: {
                options: {
                    open: true,
                    base: '<%= project.dist %>'
                }
            }
        }
    });

    // These plugins provide necessary tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-injector');
    grunt.loadNpmTasks('grunt-wiredep');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // Default task
    grunt.registerTask('default', ['jshint', 'qunit', 'concat', 'uglify']);
    grunt.registerTask('build', [
        //'clean:dist',
        'injector:app',
        //'wiredep',
        'useminPrepare',
        //'compass:prod',
        //'ngtemplates',
        //'concat',
        //'copy:dist',
        'cssmin',
        //'uglify',
        //'filerev',
        'usemin',
        //'htmlmin'
    ]);

    grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            //'clean:server',
            'wiredep',
            //'concurrent:server',
            //'postcss:server',
            'connect:dev:keepalive',
            //'watch'
        ]);
    });
};
