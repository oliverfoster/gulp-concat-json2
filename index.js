var through = require('through');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var Buffer = require('buffer').Buffer;
var Concat = require('concat-with-sourcemaps');

var deepExtend = function(destination, source) {
  for (var property in source) {
    if (source[property] && source[property].constructor && source[property].constructor === Object) {
      destination[property] = destination[property] || {};
      arguments.callee(destination[property], source[property]);
    } else {
      destination[property] = source[property];
    }
  }
  return destination;
};

module.exports = function(file, opt) {
  if (!file) throw new PluginError('gulp-concat-json', 'Missing file option for gulp-concat-json');
  if (!opt) opt = {};
  // to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
  if (typeof opt.newLine !== 'string') opt.newLine = gutil.linefeed;

  var firstFile = null;

  var fileName = file;
  if (typeof file !== 'string') {
    if (typeof file.path !== 'string') {
      throw new PluginError('gulp-concat0json', 'Missing path in file options for gulp-concat-json');
    }
    fileName = path.basename(file.path);
    firstFile = new File(file);
  }

  var concat = null;
  var raw = null;

  function bufferContents(file) {
    if (file.isNull()) return; // ignore
    if (file.isStream()) return this.emit('error', new PluginError('gulp-concat-json',  'Streaming not supported'));

    if (!firstFile) firstFile = file;
    if (!raw) raw = []
    if (!concat) concat = new Concat(!!firstFile.sourceMap, fileName, opt.newLine);

    concat.add(file.relative, file.contents.toString(), file.sourceMap);

    raw.push({ relative:file.relative, data:file.contents.toString() });
  }

  function endStream() {
    if (firstFile) {
      var joinedFile = firstFile;

      if (typeof file === 'string') {
        joinedFile = firstFile.clone({contents: false});
        joinedFile.path = path.join(firstFile.base, file);
      }


      var object = {};
      var array = [];

      try {
        for (var i = 0; i < raw.length; i++) {
          var json = JSON.parse(raw[i].data);
          if (json && json.constructor && json.constructor === Object) {
            deepExtend(object, json);
          } else if (json && json.constructor && json.constructor === Array) {
            array = array.concat(json);
          }
        }
      } catch(err) {
        return this.emit('error', new PluginError('gulp-concat-json',  err));
      }

      var data = {
        object: object,
        array: array
      };

      joinedFile.contents = new Buffer(  JSON.stringify(data) );

      if (concat.sourceMapping)
        joinedFile.sourceMap = JSON.parse(concat.sourceMap);



      this.emit('data', joinedFile);
    }

    this.emit('end');
  }

  return through(bufferContents, endStream);
};
