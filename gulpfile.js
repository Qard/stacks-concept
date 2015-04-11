require('babel/register')
var gulp = require('gulp')
var babel = require('gulp-babel')
var mocha = require('gulp-mocha')

gulp.task('default', [
  'watch'
])

gulp.task('build', function () {
  return gulp.src('lib/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('dist'))
})

gulp.task('test', function () {
  require('should')
  return gulp.src('test/**/*.js', {
    read: false
  })
  .pipe(mocha({
    reporter: 'spec',
    timeout: 5000
  }))
})

gulp.task('watch', function () {
  gulp.watch('lib/**/*.js', [
    'build'
  ])

  gulp.watch([
    'dist/**/*.js',
    'test/**/*.js'
  ], [
    'test'
  ])
})
