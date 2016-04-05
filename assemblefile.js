'use strict';

var path = require('path');
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
  app.partials('src/templates/includes/*.hbs');
  app.layouts('src/templates/layouts/*.hbs');
  app.pages('src/templates/pages/*.hbs');
  cb();
});

/**
 * Default task
 */

app.task('default', ['load'], function () {
  ['justjavac', 'phodal', 'daimajia'].forEach(function (userName, index) {
    var userData = app.cache.data['bang_' + userName];
    var stream = app.toStream('pages');

    stream.pipe(app.renderFile('hbs', userData))
      .on('error', console.log)
      .pipe(extname())
      .pipe(app.dest(function (file) {
        file.path = file.data.permalink + userName + '.html';
        file.base = path.dirname(file.path);
        return file.base;
      }))
  });
});

/**
 * Expose your instance of assemble to the CLI
 */

module.exports = app;
