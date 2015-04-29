require('babel/register')
var gulp = require('gulp')
var server = require('gulp-develop-server')
var babelify = require('babelify')
var browserify = require('browserify')
var source = require('vinyl-source-stream')

gulp.task('build', function () {
  return browserify({
    entries: './index.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('bundle.js'))
  .pipe(gulp.dest('./'))
})

gulp.task('watch', ['build'], function () {
  server.listen({
    path: './server.js'
  })

  gulp.watch([
    './server.js'
  ], server.restart)

  gulp.watch('index.js', [
    'build'
  ])
})

gulp.task('default', [
  'watch'
])
