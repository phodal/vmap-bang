'use strict';

var path = require('path');
var fs = require('fs');
var merge = require('mixin-deep');
var extname = require('gulp-extname');
var permalinks = require('assemble-permalinks');
var getDest = require('./plugins/get-dest');
var viewEvents = require('./plugins/view-events');
var assemble = require('assemble');
var app = assemble();

/**
 * Plugins
 */

app.use(viewEvents('permalink'));
app.use(permalinks());
app.use(getDest());

app.onPermalink(/./, function (file, next) {
  file.data = merge({}, app.cache.data, file.data);
  next();
});

app.data({
  site: {
    base: 'site'
  }
});

app.data('test_data/*.json', {
  renameKey: function (key) {
    return 'bang_' + path.basename(key, path.extname(key));
  }
});

/**
 * Create views collection for our site pages and blog posts.
 * Posts will be written in markdown.
 */

app.create('pages');
app.pages.use(permalinks(':site.base/github/'));

/**
 * Register a handlebars helper for processing markdown.
 * This could also be done with a gulp plugin, or a
 * middleware, but helpers are really easy and provide
 * the most control.
 */

app.helpers('./helpers/*.js');
app.helper('log', function (val) {
  console.log(val);
});

/**
 * Tasks for loading and rendering our templates
 */

app.task('load', function (cb) {
  app.layouts('src/templates/layouts/*.hbs');
  cb();
});

/**
 * Default task
 */

var detailContent = new Buffer(fs.readFileSync('src/templates/pages/blog.hbs'));

fs.readdir(process.cwd() + '/test_data', function (err, files) {
  if (err) {
    console.log(err);
    return;
  }

  files.forEach(function (filename) {
    var userName = filename.split('.')[0];
    var userData = app.cache.data['bang_' + userName];
    app.page(userName + '.hbs', {
      contents: detailContent,
      locals: userData,
      data: {layout: 'default'}
    });
  });
});

app.task('default', ['load'], function () {
  var stream = app.toStream('pages');
  stream.pipe(app.renderFile())
    .on('error', console.log)
    .pipe(extname())
    .pipe(app.dest('site'));

  stream.end();
});

/**
 * Expose your instance of assemble to the CLI
 */

module.exports = app;
