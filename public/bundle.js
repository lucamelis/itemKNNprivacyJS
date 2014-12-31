require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict"

var hashInt = require("hash-int")
var murmur = require("murmurhash-js")

var hashFunc
if(typeof Float64Array !== "undefined") {
  //Typed array version
  var DOUBLE_BUFFER = new Float64Array(1)
  var INT_VIEW = new Uint32Array(DOUBLE_BUFFER.buffer)
  hashFunc = function hashTypedArray(key, bins) {
    var d = bins.length
    if(typeof key === "number") {
      if(key === key|0) {
        var b = hashInt(key)
        bins[0] = b
        for(var i=1; i<d; ++i) {
          b = hashInt(b)
          bins[i] = b
        }
      } else {
        DOUBLE_BUFFER[0] = key
        var b = hashInt(INT_VIEW[0] + hashInt(INT_VIEW[1]))
        bins[0] = b
        for(var i=1; i<d; ++i) {
          b = hashInt(b)
          scratch[i] = b
        }
      }
    } else if(typeof key === "string") {
      for(var i=0; i<d; ++i) {
        bins[i] = murmur(key, i)
      }
    } else if(typeof key === "object") {
      var str
      if(key.toString) {
        str = key.toString()
      } else {
        str = JSON.stringify(key)
      }
      for(var i=0; i<d; ++i) {
        bins[i] = murmur(str, i)
      }
    } else {
      var str = key + ""
      for(var i=0; i<d; ++i) {
        bins[i] = murmur(str, i)
      }
    }
  }
} else {
  //Untyped version
  hashFunc = function hashNoTypedArray(key, bins) {
    var d = bins.length
    if(typeof key === "number") {
      if(key === key|0) {
        var b = hashInt(key)
        bins[0] = b
        for(var i=0; i<d; ++i) {
          b = hashInt(b)
          bins[i] = b
        }
        return
      }
    } else if(typeof key === "string") {
      for(var i=0; i<d; ++i) {
        bins[i] = murmur(key, i)
      }
      return
    } else if(typeof key === "object") {
      var str
      if(key.toString) {
        str = key.toString()
      } else {
        str = JSON.stingify(key)
      }
      for(var i=0; i<d; ++i) {
        bins[i] = murmur(str, i)
      }
      return
    }
    var str = key + ""
    for(var i=0; i<d; ++i) {
      bins[i] = murmur(str, i)
    }
  }
}

module.exports = hashFunc
},{"hash-int":2,"murmurhash-js":3}],2:[function(require,module,exports){
"use strict"

var A
if(typeof Uint32Array === undefined) {
  A = [ 0 ]
} else {
  A = new Uint32Array(1)
}

function hashInt(x) {
  A[0]  = x|0
  A[0] -= (A[0]<<6)
  A[0] ^= (A[0]>>>17)
  A[0] -= (A[0]<<9)
  A[0] ^= (A[0]<<4)
  A[0] -= (A[0]<<3)
  A[0] ^= (A[0]<<10)
  A[0] ^= (A[0]>>>15)
  return A[0]
}

module.exports = hashInt

},{}],3:[function(require,module,exports){
var murmur3 = require("./murmurhash3_gc.js")
var murmur2 = require("./murmurhash2_gc.js")

module.exports = murmur3
module.exports.murmur3 = murmur3
module.exports.murmur2 = murmur2

},{"./murmurhash2_gc.js":4,"./murmurhash3_gc.js":5}],4:[function(require,module,exports){
/**
 * JS Implementation of MurmurHash2
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */

function murmurhash2_32_gc(str, seed) {
  var
    l = str.length,
    h = seed ^ l,
    i = 0,
    k;
  
  while (l >= 4) {
  	k = 
  	  ((str.charCodeAt(i) & 0xff)) |
  	  ((str.charCodeAt(++i) & 0xff) << 8) |
  	  ((str.charCodeAt(++i) & 0xff) << 16) |
  	  ((str.charCodeAt(++i) & 0xff) << 24);
    
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    k ^= k >>> 24;
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

	h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

    l -= 4;
    ++i;
  }
  
  switch (l) {
  case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
  case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
  case 1: h ^= (str.charCodeAt(i) & 0xff);
          h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  }

  h ^= h >>> 13;
  h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  h ^= h >>> 15;

  return h >>> 0;
}

if(typeof module !== undefined) {
  module.exports = murmurhash2_32_gc
}

},{}],5:[function(require,module,exports){
/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

function murmurhash3_32_gc(key, seed) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}

if(typeof module !== "undefined") {
  module.exports = murmurhash3_32_gc
}
},{}],"count-min":[function(require,module,exports){
"use strict"

var defaultHash = require("k-hash")

function CountMinSketch(width, depth, hashFunc) {
  this.width = width
  this.depth = depth
  this.hashFunc = hashFunc
  this.table = new Uint32Array(width * depth)
  var scratch
  var table
  if(typeof Uint32Array === undefined) {
    table = new Array(width * depth)
    for(var i=0, n=table.length; i<n; ++i) {
      table[i] = 0
    }
    scratch = new Array(depth)
    for(var i=0; i<depth; ++i) {
      scratch[i] = 0
    }
  } else {
    table = new Uint32Array(width * depth)
    scratch = new Uint32Array(depth)
  }
  this.table = table
  this.scratch = scratch
}

var proto = CountMinSketch.prototype

proto.toJSON = function() {
  return {
    width: this.width,
    depth: this.depth,
    table: Array.prototype.slice.call(this.table)
  }
}

proto.fromJSON = function(data) {
  if (typeof data == 'string') {
    data = JSON.parse(data)
  }
  if (!(data.width && data.depth && data.table)) {
    throw new Error('Cannot reconstruct the filter with a partial object')
  }
  var n = data.width * data.depth
  var table = this.table
  if(table.length > n) {
    table = table.subarray(0, n)
  } else if(table.length < n) {
    table = new Uint32Array(n)
  }
  var input_table = data.table
  for(var i=0; i<n; ++i) {
    table[i] = input_table[i]
  }
  if(this.scratch.length > data.depth) {
    this.scratch = this.scratch.subarray(0, data.depth)
  } else if(this.scratch.length < data.depth) {
    this.scratch = new Uint32Array(data.depth)
  }
  this.width = data.width|0
  this.depth = data.depth|0
  this.table = table
  return this
}

proto.update = function(key, v) {
  var scratch = this.scratch
  var d = this.depth
  var w = this.width
  var tab = this.table
  var ptr = 0
  this.hashFunc(key, scratch)
  for(var i=0; i<d; ++i) {
    tab[ptr + (scratch[i] % w)] += v
    ptr += w
  }
}

proto.query = function(key) {
  var scratch = this.scratch
  var d = this.depth
  var w = this.width
  var tab = this.table
  var ptr = w
  this.hashFunc(key, scratch)
  var r = tab[scratch[0]%w]
  for(var i=1; i<d; ++i) {
    r = Math.min(r, tab[ptr + (scratch[i]%w)])
    ptr += w
  }
  return r
}

function createCountMinSketch(accuracy, probIncorrect,samples, hashFunc) {
  accuracy = accuracy || 0.1
  probIncorrect = probIncorrect || 0.0001
  samples = samples || 1  
  hashFunc = hashFunc || defaultHash
  var width = Math.ceil(Math.E / accuracy)|0
  var depth = Math.ceil(Math.log(samples / probIncorrect))|0
  return new CountMinSketch(width, depth, hashFunc)
}

exports.createCountMinSketch = createCountMinSketch

},{"k-hash":1}]},{},[]);
