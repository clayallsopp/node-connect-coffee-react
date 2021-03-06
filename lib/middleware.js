// Generated by CoffeeScript 1.9.1
var clone, coffeeScript, debug, fs, mkdirp, path, updateSyntaxError, url;

coffeeScript = require('coffee-react');

updateSyntaxError = require('coffee-react/lib/helpers').updateSyntaxError;

fs = require('fs');

path = require('path');

url = require('url');

mkdirp = require('mkdirp');

debug = require('debug')('connect-coffee-script');

clone = function(src) {
  var obj, prop, val;
  if (typeof src !== 'object') {
    return;
  }
  if (Array.isArray(src)) {
    return src.slice();
  }
  obj = {};
  for (prop in src) {
    val = src[prop];
    obj[prop] = val;
  }
  return obj;
};


/*

A simple connect middleware to serve CoffeeScript files.

@param {Object} options
@return {Function}
@api public
 */

module.exports = function(options) {
  var baseDir, dest, src;
  if (options == null) {
    options = {};
  }
  if (typeof options === 'string') {
    options = {
      src: options
    };
  }
  baseDir = options.baseDir || process.cwd();
  src = options.src;
  if (!src) {
    throw new Error('Coffeescript middleware requires "src" directory');
  }
  src = path.resolve(baseDir, src);
  dest = options.dest ? options.dest : src;
  dest = path.resolve(baseDir, dest);
  if (options.compile == null) {
    options.compile = function(str, options) {
      var err;
      try {
        return coffeeScript.compile(str, clone(options));
      } catch (_error) {
        err = _error;
        updateSyntaxError(err, null, options.filename);
        throw err;
      }
    };
  }
  return function(req, res, next) {
    var coffeePath, compile, error, jsPath, pathname;
    if ('GET' !== req.method && 'HEAD' !== req.method) {
      return next();
    }
    pathname = url.parse(req.url).pathname;
    if (/\.js$/.test(pathname)) {
      if (options.prefix && 0 === pathname.indexOf(options.prefix)) {
        pathname = pathname.substring(options.prefix.length);
      }
      jsPath = path.join(dest, pathname);
      coffeePath = path.join(src, pathname.replace('.js', '.coffee'));
      error = function(err) {
        var arg;
        arg = 'ENOENT' === err.code ? null : err;
        return next(arg);
      };
      compile = function() {
        debug('read %s', jsPath);
        return fs.readFile(coffeePath, 'utf8', function(err, str) {
          var js, map, result;
          if (err) {
            return error(err);
          }
          options.filename = coffeePath;
          options.generatedFile = path.basename(pathname);
          options.sourceFiles = [path.basename(pathname, '.js') + '.coffee'];
          try {
            result = options.compile(str, options, coffeePath);
            map = result.v3SourceMap;
            js = map != null ? result.js : result;
          } catch (_error) {
            err = _error;
            return next(err);
          }
          debug('render %s', coffeePath);
          return mkdirp(path.dirname(jsPath), 0x1c0, function(err) {
            var mapFile, mapFooter, mapPath, ref;
            if (err) {
              return error(err);
            }
            if (map != null) {
              mapFile = jsPath.replace(/\.js$/, '.map');
              mapPath = ((ref = options.sourceMapRoot) != null ? ref : '') + pathname.replace(/\.js$/, '.map');
              mapFooter = "//# sourceMappingURL=" + mapPath + "\n//@ sourceMappingURL=" + mapPath;
              js = js + "\n\n" + mapFooter;
            }
            return fs.writeFile(jsPath, js, 'utf8', function() {
              if (map == null) {
                return next();
              }
              return fs.writeFile(mapFile, map, 'utf8', next);
            });
          });
        });
      };
      if (options.force) {
        return compile();
      }
      return fs.stat(coffeePath, function(err, coffeeStats) {
        if (err) {
          return error(err);
        }
        return fs.stat(jsPath, function(err, jsStats) {
          if (err) {
            if ('ENOENT' === err.code) {
              debug('not found %s', jsPath);
              return compile();
            } else {
              return next(err);
            }
          } else {
            if (coffeeStats.mtime > jsStats.mtime) {
              debug('modified %s', jsPath);
              return compile();
            } else {
              return next();
            }
          }
        });
      });
    } else {
      return next();
    }
  };
};
