var path = require('path');
var mkdirp = require('mkdirp-then');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var concat = require('gulp-concat');
var chmod = require('gulp-chmod');
var rename = require('gulp-rename');
var minifyCSS = require('gulp-minify-css');
var gzip = require('gulp-gzip');

var buildDir = "dist";

// test are currently not run
//gulp.task('test', ['test-mocha']);
//gulp.task('test-mocha', function () {
//    return gulp.src('./test/mocha/**/*.js', {read: false})
//        .pipe(mocha({reporter: 'spec',
//                    ui: "qunit",
//                    useColors: false
//                    }));
//});
//
//gulp.task('watch-mocha', ['test-mocha'], function() {
//   gulp.watch(['./src/**/*.js', './test/**/*.js'], ['test-mocha']);
//});

gulp.task('init', function() {
	  return mkdirp(buildDir)
	});

gulp.task('css',gulp.series('init'), function () {
    return gulp.src(path.join('css', '*.css') )
      .pipe(concat('msa.css'))
      .pipe(chmod(644))
      .pipe(gulp.dest(buildDir));
});

gulp.task('min-css',gulp.series('css'), function () {
	   return gulp.src(path.join(buildDir,"msa.css"))
	   .pipe(minifyCSS())
	   .pipe(rename('msa.min.css'))
	   .pipe(chmod(644))
	   .pipe(gulp.dest(buildDir));
	});
gulp.task('build-gzip-css', gulp.series('min-css'), function() {
	  return gulp.src(path.join(buildDir, "msa.min.css"))
	    .pipe(gzip({append: false, gzipOptions: { level: 9 }}))
	    .pipe(rename("msa.min.gz.css"))
	    .pipe(gulp.dest(buildDir));
	});

gulp.task('build-gzip-js', function() {
   return gulp.src(path.join(buildDir, "msa.js"))
     .pipe(gzip({append: false, gzipOptions: { level: 9 }}))
     .pipe(rename("msa.min.gz.js"))
     .pipe(gulp.dest(buildDir));
});

gulp.task('build-gzip', gulp.parallel('build-gzip-js', 'build-gzip-css'));
gulp.task('build', gulp.series('min-css', 'build-gzip'));
gulp.task('default', gulp.series('build'));
