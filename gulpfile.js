'use strict';

// General
var gulp = require('gulp');
var es = require('event-stream');
var plumber = require('gulp-plumber'); // Prevents pipe from breaking prematurely
var flatten = require('gulp-flatten'); // Removes relative paths from source
var debug = require('gulp-debug'); // Use for debugging
var size = require('gulp-size');
var sourcemaps = require('gulp-sourcemaps');
var seq = require('run-sequence');
var gpif = require('gulp-if');
var prettify = require('gulp-jsbeautifier');
var gutil = require('gulp-util');
var path = require('path');
var newer = require('gulp-newer');
var concat = require('gulp-concat');
var browserSync  = require('browser-sync');
var clean = require('gulp-clean');

// Version Management
var git = require('gulp-git');
var bump = require('gulp-bump');
var filter = require('gulp-filter')

// html
var inject = require('gulp-inject');
var htmlmin = require('gulp-htmlmin');

// Styles
var sass = require('gulp-sass');
var sassLint = require('gulp-sass-lint');
var postcss = require('gulp-postcss');
var atImport = require("postcss-import");
var mqpack = require('css-mqpacker');
var nano = require('cssnano');
var autoprefixer = require('autoprefixer');

// Scripts
var uglify = require('gulp-uglify');

/* * initialized variables * */

//Config Variables
var paths = {
  output: 'dev/',
  production_output: 'dist/',
  styles: {
    input: 'styles/main.scss',
    output: 'css/'
  },
  scripts: {
    vendor: 'scripts/vendor/*.js',
    input: 'scripts/*.js',
    output: 'js/'
  },
  html: {
    input: 'html/*.html',
    output: '.'
  },
  krpano: 'krpano/',
  images: 'images/',
  video: 'video/'
};

var is_production = false;
var watching = false;
var isBrowserSync = false;

// Process, lint, and minify Sass files
gulp.task('build:styles:lint', function() {
  return gulp.src(paths.styles.input)
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
});

gulp.task('build:styles', ['build:styles:lint'], function() {
  return gulp.src(paths.styles.input)
    .pipe(plumber())
    .pipe(gpif(!is_production, sourcemaps.init()))
    .pipe(sass())
    .pipe(postcss([
      atImport({path:'./node_modules'}),
      mqpack(),
      autoprefixer({ browsers: ['last 3 versions', '> 1%', 'IE >=9'] }),
      nano()
    ]))
    .pipe(flatten())
    .pipe(gpif(!is_production, prettify({indentSize: 2})))
    .pipe(gpif(!is_production, sourcemaps.write()))
    .pipe(concat('app.css'))
    .pipe(gulp.dest(paths.output + paths.styles.output))
    .pipe(gpif(isBrowserSync, browserSync.stream()));
});

gulp.task('build:scripts', function() {
  return gulp.src([paths.scripts.vendor, paths.scripts.input])
    .pipe(concat('app.js'))
    .pipe(plumber())
    .pipe(gpif(!is_production, sourcemaps.init()))
    .pipe(gpif(is_production, uglify()))
    .pipe(gpif(!is_production, sourcemaps.write()))
    .pipe(gulp.dest(paths.output + paths.scripts.output));
});

gulp.task('build:html', function() {
  return gulp.src(paths.html.input)
    .pipe(gpif(is_production, htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest(paths.output));
});

gulp.task('clean', function() {
 return gulp.src(paths.output)
   .pipe(clean());
});

gulp.task('copy', function() {
 // Copy krpano
 gulp.src(paths.krpano+"**/*")
   .pipe(gulp.dest(paths.output+paths.krpano));

 // Copy Images
 gulp.src(paths.images+"**/*")
   .pipe(gulp.dest(paths.output+paths.images));

  // Copy Videos
 gulp.src(paths.video+"**/*")
   .pipe(gulp.dest(paths.output+paths.video));
});

// Compile files
gulp.task('build', function(){ seq('clean', ['copy', 'build:styles', 'build:scripts', 'build:html']) });

// Compile files and generate docs (default)
gulp.task('default', ['build']);

// Watch files for changes
gulp.task('watch', ['build'], function () {
  gulp.watch('html/**/*.html', ['build:html']);
  gulp.watch('styles/**/*.scss', ['build:styles']);
  gulp.watch('script/**/*.js', ['build:scripts']);
});

// Compile for production
gulp.task('set-production', function() {
  is_production = true;
  paths.output = paths.production_output;
});

gulp.task('production', function(callback) {
  seq('set-production', ['build'], callback);
});

/* Without Hot Module Replacement, but browsersynched */
gulp.task('set-browserSync', function() {
  isBrowserSync = true;
});

gulp.task('serve', ['set-browserSync', 'build'], function(callback) {
  browserSync({
    port: 7777,
    server: {
      baseDir: paths.output
    },
    options: {
      reloadDelay: 100
    },
    notify: true
  });

  gulp.watch('html/**/*.html', ['build:html']).on("change", browserSync.reload);
  gulp.watch('scripts/**/*.js', ['build:scripts']).on("change", browserSync.reload);
  gulp.watch('styles/**/*.scss', ['build:styles']);
  gulp.watch('krpano/**/*.xml', ['copy']).on("change", browserSync.reload);
  gutil.log("[browserSync-server]", "http://localhost:7777");
});

// Bump version
function inc(importance) {
  // get all the files to bump version in
  return gulp.src(['./package.json', './bower.json'])
    // bump the version number in those files
    .pipe(bump({type: importance}))
    // save it back to filesystem
    .pipe(gulp.dest('./'))
    // commit the changed version number
    .pipe(git.commit('version bump'))

    // read only one file to get the version number
    .pipe(filter('package.json'))
    // **tag it in the repository**
    .pipe(tagVersion());
}

gulp.task('patch', function() { return inc('patch'); })
gulp.task('feature', function() { return inc('minor'); })
gulp.task('release', function() { return inc('major'); })
