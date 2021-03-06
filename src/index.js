import _          from 'lodash';
import {resolve}  from 'path';
import isThere    from 'is-there';
import traverse   from 'traverse';

export default function(url, prev) {
  if (!isJSONfile(url)) {
    return null;
  }

  let includePaths = this.options.includePaths ? this.options.includePaths.split(':') : [];
  let paths = []
    .concat(prev.slice(0, prev.lastIndexOf('/')))
    .concat(includePaths);

  let file = paths
    .map(path => resolve(path, url))
    .filter(isThere)
    .pop();

  if (!file) {
    return new Error(`Unable to find "${url}" from the following path(s): ${paths.join(', ')}. Check includePaths.`);
  }

  // Prevent file from being cached by Node's `require` on continuous builds.
  // https://github.com/Updater/node-sass-json-importer/issues/21
  delete require.cache[require.resolve(file)];

  return {
    contents: transformJSONtoSass(require(file))
  };
}

export function isJSONfile(url) {
  return /\.json$/.test(url);
}

export function transformJSONtoSass(json) {
  var obj = traverse(json);
  return obj.paths(json)
    .map(key => {
      var val = obj.get(key);
      if (typeof val !== 'object') {
        return `$${key.join('-')}: ${val};`;
      }
    })
    .join('\n');
}

export function parseValue(value) {
  if (_.isArray(value)) {
    return parseList(value);
  } else if (_.isPlainObject(value)) {
    return parseMap(value);
  } else {
    return value;
  }
}

export function parseList(list) {
  return `(${list
    .map(value => parseValue(value))
    .join(',')})`;
}

export function parseMap(map) {
  return `(${Object.keys(map)
    .map(key => `${key}: ${parseValue(map[key])}`)
    .join(',')})`;
}

// Super-hacky: Override Babel's transpiled export to provide both
// a default CommonJS export and named exports.
// Fixes: https://github.com/Updater/node-sass-json-importer/issues/32
// TODO: Remove in 3.0.0. Upgrade to Babel6.
module.exports = exports.default;
Object.keys(exports).forEach(key => module.exports[key] = exports[key]);
