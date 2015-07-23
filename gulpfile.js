var gulp = require("gulp"),
	replace = require("gulp-replace"),
	rename = require("gulp-rename"),
	sourcemaps = require("gulp-sourcemaps"),
	filter = require("gulp-filter"),
	changed = require("gulp-changed"),
	jasmine = require("gulp-jasmine"),
	common = require("./buildutils/gulp-common"),
	logging = require("./buildutils/logger-loader"),
	istanbul = require('gulp-istanbul'),
	gulpif = require("gulp-if"),
	minimist = require("minimist"),
	eslint = require('gulp-eslint');

var availableOptions = {
	'boolean': [ 'verbose', 'skipSourcemaps' ],
	'default': {
		'verbose': false,
		'skipSourcemaps': false
	}
}
var options = minimist(process.argv.slice(2), availableOptions);

function shouldSourcemap () {
	return !options.skipSourcemaps;
}
function isVerbose () {
	return !!options.verbose;
}

var src = ["core/**/*", "core/**/*"];

function compile(serverSide) {
	var codeFilter = filter(["**/*.js", "**/*.jsx"]);
	var dest = 'target/' + (serverSide ? "server" : "client");
	return gulp.src(src)
		.pipe(codeFilter)
			.pipe(changed(dest, {extension: '.js'}))
			.pipe(logging())
			.pipe(replace("SERVER_SIDE", serverSide ? "true" : "false"))
			.pipe(gulpif(shouldSourcemap(), sourcemaps.init()))
			.pipe(common.es6Transform())
			.pipe(gulpif(shouldSourcemap(), sourcemaps.write()))
			.pipe(rename(function (path) {
				path.extname = ".js";
			}))
		.pipe(codeFilter.restore())
		.pipe(gulp.dest(dest));
}

gulp.task('compile', ["compileClient", "compileServer"]);

gulp.task("compileClient", function() {
	return compile(false);
});

gulp.task("compileServer", function() {
	return compile(true);
});

gulp.task("build", ["compile"]);

gulp.task('watch', function () {
   gulp.watch(src, ["build"]);
});

gulp.task("test-coverage", ["compileServer", "compileClient"], function(cb) {
	gulp.src(['target/server/**/*.js', "!target/server/test/**/*.js", "!target/server/test-temp/**/*.js"])
		.pipe(istanbul({includeUntested:true})) // Covering files
		.pipe(gulp.dest("target/server-covered")) // copy covered files to a parallel directory
		.on('finish', function () {
			gulp.src("target/server/test/**/*.js")
				.pipe(gulp.dest("target/server-covered/test"))
				.on("finish", function() {
					gulp.src(['target/server-covered/test/**/*[Ss]pec.js'])
						.pipe(jasmine())
						.pipe(istanbul.writeReports({dir: './target/coverage'})) // Creating the reports after tests runned
						.on('end', cb);
    			});
    	});
});

gulp.task("test", ["compileServer", "compileClient"], function() {
	return gulp.src("target/server/test/**/*[Ss]pec.js")
		.pipe(jasmine(isVerbose() ? {verbose:true, includeStackTrace: true} : {}));
});

gulp.task("eslint", [], function() {
	return gulp.src(src)
		.pipe(codeFilter)
        // eslint() attaches the lint output to the eslint property
        // of the file object so it can be used by other modules.
        .pipe(eslint({
        	reset: true
        }))
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format());
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failOnError last.
        //.pipe(eslint.failWithError());
});

// todo: where should tests go?

// todo: add clean