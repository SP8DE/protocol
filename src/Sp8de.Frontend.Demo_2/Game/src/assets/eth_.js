(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EthJS = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    module.exports = {
      Util: require('ethereumjs-util')
    }
  },{"ethereumjs-util":25}],2:[function(require,module,exports){
// Reference https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki
// Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
// NOTE: SIGHASH byte ignored AND restricted, truncate before use

    var Buffer = require('safe-buffer').Buffer

    function check (buffer) {
      if (buffer.length < 8) return false
      if (buffer.length > 72) return false
      if (buffer[0] !== 0x30) return false
      if (buffer[1] !== buffer.length - 2) return false
      if (buffer[2] !== 0x02) return false

      var lenR = buffer[3]
      if (lenR === 0) return false
      if (5 + lenR >= buffer.length) return false
      if (buffer[4 + lenR] !== 0x02) return false

      var lenS = buffer[5 + lenR]
      if (lenS === 0) return false
      if ((6 + lenR + lenS) !== buffer.length) return false

      if (buffer[4] & 0x80) return false
      if (lenR > 1 && (buffer[4] === 0x00) && !(buffer[5] & 0x80)) return false

      if (buffer[lenR + 6] & 0x80) return false
      if (lenS > 1 && (buffer[lenR + 6] === 0x00) && !(buffer[lenR + 7] & 0x80)) return false
      return true
    }

    function decode (buffer) {
      if (buffer.length < 8) throw new Error('DER sequence length is too short')
      if (buffer.length > 72) throw new Error('DER sequence length is too long')
      if (buffer[0] !== 0x30) throw new Error('Expected DER sequence')
      if (buffer[1] !== buffer.length - 2) throw new Error('DER sequence length is invalid')
      if (buffer[2] !== 0x02) throw new Error('Expected DER integer')

      var lenR = buffer[3]
      if (lenR === 0) throw new Error('R length is zero')
      if (5 + lenR >= buffer.length) throw new Error('R length is too long')
      if (buffer[4 + lenR] !== 0x02) throw new Error('Expected DER integer (2)')

      var lenS = buffer[5 + lenR]
      if (lenS === 0) throw new Error('S length is zero')
      if ((6 + lenR + lenS) !== buffer.length) throw new Error('S length is invalid')

      if (buffer[4] & 0x80) throw new Error('R value is negative')
      if (lenR > 1 && (buffer[4] === 0x00) && !(buffer[5] & 0x80)) throw new Error('R value excessively padded')

      if (buffer[lenR + 6] & 0x80) throw new Error('S value is negative')
      if (lenS > 1 && (buffer[lenR + 6] === 0x00) && !(buffer[lenR + 7] & 0x80)) throw new Error('S value excessively padded')

      // non-BIP66 - extract R, S values
      return {
        r: buffer.slice(4, 4 + lenR),
        s: buffer.slice(6 + lenR)
      }
    }

    /*
 * Expects r and s to be positive DER integers.
 *
 * The DER format uses the most significant bit as a sign bit (& 0x80).
 * If the significant bit is set AND the integer is positive, a 0x00 is prepended.
 *
 * Examples:
 *
 *      0 =>     0x00
 *      1 =>     0x01
 *     -1 =>     0xff
 *    127 =>     0x7f
 *   -127 =>     0x81
 *    128 =>   0x0080
 *   -128 =>     0x80
 *    255 =>   0x00ff
 *   -255 =>   0xff01
 *  16300 =>   0x3fac
 * -16300 =>   0xc054
 *  62300 => 0x00f35c
 * -62300 => 0xff0ca4
*/
    function encode (r, s) {
      var lenR = r.length
      var lenS = s.length
      if (lenR === 0) throw new Error('R length is zero')
      if (lenS === 0) throw new Error('S length is zero')
      if (lenR > 33) throw new Error('R length is too long')
      if (lenS > 33) throw new Error('S length is too long')
      if (r[0] & 0x80) throw new Error('R value is negative')
      if (s[0] & 0x80) throw new Error('S value is negative')
      if (lenR > 1 && (r[0] === 0x00) && !(r[1] & 0x80)) throw new Error('R value excessively padded')
      if (lenS > 1 && (s[0] === 0x00) && !(s[1] & 0x80)) throw new Error('S value excessively padded')

      var signature = Buffer.allocUnsafe(6 + lenR + lenS)

      // 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
      signature[0] = 0x30
      signature[1] = signature.length - 2
      signature[2] = 0x02
      signature[3] = r.length
      r.copy(signature, 4)
      signature[4 + lenR] = 0x02
      signature[5 + lenR] = s.length
      s.copy(signature, 6 + lenR)

      return signature
    }

    module.exports = {
      check: check,
      decode: decode,
      encode: encode
    }

  },{"safe-buffer":53}],3:[function(require,module,exports){
    (function (module, exports) {
      'use strict';

      // Utils
      function assert (val, msg) {
        if (!val) throw new Error(msg || 'Assertion failed');
      }

      // Could use `inherits` module, but don't want to move from single file
      // architecture yet.
      function inherits (ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function () {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }

      // BN

      function BN (number, base, endian) {
        if (BN.isBN(number)) {
          return number;
        }

        this.negative = 0;
        this.words = null;
        this.length = 0;

        // Reduction context
        this.red = null;

        if (number !== null) {
          if (base === 'le' || base === 'be') {
            endian = base;
            base = 10;
          }

          this._init(number || 0, base || 10, endian || 'be');
        }
      }
      if (typeof module === 'object') {
        module.exports = BN;
      } else {
        exports.BN = BN;
      }

      BN.BN = BN;
      BN.wordSize = 26;

      var Buffer;
      try {
        // Obfuscate that we require Buffer, to reduce size
        Buffer = require('buf' + 'fer').Buffer;
      } catch (e) {
      }

      BN.isBN = function isBN (num) {
        if (num instanceof BN) {
          return true;
        }

        return num !== null && typeof num === 'object' &&
          num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
      };

      BN.max = function max (left, right) {
        if (left.cmp(right) > 0) return left;
        return right;
      };

      BN.min = function min (left, right) {
        if (left.cmp(right) < 0) return left;
        return right;
      };

      BN.prototype._init = function init (number, base, endian) {
        if (typeof number === 'number') {
          return this._initNumber(number, base, endian);
        }

        if (typeof number === 'object') {
          return this._initArray(number, base, endian);
        }

        if (base === 'hex') {
          base = 16;
        }
        assert(base === (base | 0) && base >= 2 && base <= 36);

        number = number.toString().replace(/\s+/g, '');
        var start = 0;
        if (number[0] === '-') {
          start++;
        }

        if (base === 16) {
          this._parseHex(number, start);
        } else {
          this._parseBase(number, base, start);
        }

        if (number[0] === '-') {
          this.negative = 1;
        }

        this.strip();

        if (endian !== 'le') return;

        this._initArray(this.toArray(), base, endian);
      };

      BN.prototype._initNumber = function _initNumber (number, base, endian) {
        if (number < 0) {
          this.negative = 1;
          number = -number;
        }
        if (number < 0x4000000) {
          this.words = [ number & 0x3ffffff ];
          this.length = 1;
        } else if (number < 0x10000000000000) {
          this.words = [
            number & 0x3ffffff,
            (number / 0x4000000) & 0x3ffffff
          ];
          this.length = 2;
        } else {
          assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
          this.words = [
            number & 0x3ffffff,
            (number / 0x4000000) & 0x3ffffff,
            1
          ];
          this.length = 3;
        }

        if (endian !== 'le') return;

        // Reverse the bytes
        this._initArray(this.toArray(), base, endian);
      };

      BN.prototype._initArray = function _initArray (number, base, endian) {
        // Perhaps a Uint8Array
        assert(typeof number.length === 'number');
        if (number.length <= 0) {
          this.words = [ 0 ];
          this.length = 1;
          return this;
        }

        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }

        var j, w;
        var off = 0;
        if (endian === 'be') {
          for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
            w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
            this.words[j] |= (w << off) & 0x3ffffff;
            this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        } else if (endian === 'le') {
          for (i = 0, j = 0; i < number.length; i += 3) {
            w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
            this.words[j] |= (w << off) & 0x3ffffff;
            this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        }
        return this.strip();
      };

      function parseHex (str, start, end) {
        var r = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;

          r <<= 4;

          // 'a' - 'f'
          if (c >= 49 && c <= 54) {
            r |= c - 49 + 0xa;

            // 'A' - 'F'
          } else if (c >= 17 && c <= 22) {
            r |= c - 17 + 0xa;

            // '0' - '9'
          } else {
            r |= c & 0xf;
          }
        }
        return r;
      }

      BN.prototype._parseHex = function _parseHex (number, start) {
        // Create possibly bigger array to ensure that it fits the number
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }

        var j, w;
        // Scan 24-bit chunks and add them to the number
        var off = 0;
        for (i = number.length - 6, j = 0; i >= start; i -= 6) {
          w = parseHex(number, i, i + 6);
          this.words[j] |= (w << off) & 0x3ffffff;
          // NOTE: `0x3fffff` is intentional here, 26bits max shift + 24bit hex limb
          this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
          off += 24;
          if (off >= 26) {
            off -= 26;
            j++;
          }
        }
        if (i + 6 !== start) {
          w = parseHex(number, start, i + 6);
          this.words[j] |= (w << off) & 0x3ffffff;
          this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
        }
        this.strip();
      };

      function parseBase (str, start, end, mul) {
        var r = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;

          r *= mul;

          // 'a'
          if (c >= 49) {
            r += c - 49 + 0xa;

            // 'A'
          } else if (c >= 17) {
            r += c - 17 + 0xa;

            // '0' - '9'
          } else {
            r += c;
          }
        }
        return r;
      }

      BN.prototype._parseBase = function _parseBase (number, base, start) {
        // Initialize as zero
        this.words = [ 0 ];
        this.length = 1;

        // Find length of limb in base
        for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
          limbLen++;
        }
        limbLen--;
        limbPow = (limbPow / base) | 0;

        var total = number.length - start;
        var mod = total % limbLen;
        var end = Math.min(total, total - mod) + start;

        var word = 0;
        for (var i = start; i < end; i += limbLen) {
          word = parseBase(number, i, i + limbLen, base);

          this.imuln(limbPow);
          if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }

        if (mod !== 0) {
          var pow = 1;
          word = parseBase(number, i, number.length, base);

          for (i = 0; i < mod; i++) {
            pow *= base;
          }

          this.imuln(pow);
          if (this.words[0] + word < 0x4000000) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
      };

      BN.prototype.copy = function copy (dest) {
        dest.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          dest.words[i] = this.words[i];
        }
        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
      };

      BN.prototype.clone = function clone () {
        var r = new BN(null);
        this.copy(r);
        return r;
      };

      BN.prototype._expand = function _expand (size) {
        while (this.length < size) {
          this.words[this.length++] = 0;
        }
        return this;
      };

      // Remove leading `0` from `this`
      BN.prototype.strip = function strip () {
        while (this.length > 1 && this.words[this.length - 1] === 0) {
          this.length--;
        }
        return this._normSign();
      };

      BN.prototype._normSign = function _normSign () {
        // -0 = 0
        if (this.length === 1 && this.words[0] === 0) {
          this.negative = 0;
        }
        return this;
      };

      BN.prototype.inspect = function inspect () {
        return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
      };

      /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

      var zeros = [
        '',
        '0',
        '00',
        '000',
        '0000',
        '00000',
        '000000',
        '0000000',
        '00000000',
        '000000000',
        '0000000000',
        '00000000000',
        '000000000000',
        '0000000000000',
        '00000000000000',
        '000000000000000',
        '0000000000000000',
        '00000000000000000',
        '000000000000000000',
        '0000000000000000000',
        '00000000000000000000',
        '000000000000000000000',
        '0000000000000000000000',
        '00000000000000000000000',
        '000000000000000000000000',
        '0000000000000000000000000'
      ];

      var groupSizes = [
        0, 0,
        25, 16, 12, 11, 10, 9, 8,
        8, 7, 7, 7, 7, 6, 6,
        6, 6, 6, 6, 6, 5, 5,
        5, 5, 5, 5, 5, 5, 5,
        5, 5, 5, 5, 5, 5, 5
      ];

      var groupBases = [
        0, 0,
        33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
        43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
        16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
        6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
        24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
      ];

      BN.prototype.toString = function toString (base, padding) {
        base = base || 10;
        padding = padding | 0 || 1;

        var out;
        if (base === 16 || base === 'hex') {
          out = '';
          var off = 0;
          var carry = 0;
          for (var i = 0; i < this.length; i++) {
            var w = this.words[i];
            var word = (((w << off) | carry) & 0xffffff).toString(16);
            carry = (w >>> (24 - off)) & 0xffffff;
            if (carry !== 0 || i !== this.length - 1) {
              out = zeros[6 - word.length] + word + out;
            } else {
              out = word + out;
            }
            off += 2;
            if (off >= 26) {
              off -= 26;
              i--;
            }
          }
          if (carry !== 0) {
            out = carry.toString(16) + out;
          }
          while (out.length % padding !== 0) {
            out = '0' + out;
          }
          if (this.negative !== 0) {
            out = '-' + out;
          }
          return out;
        }

        if (base === (base | 0) && base >= 2 && base <= 36) {
          // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
          var groupSize = groupSizes[base];
          // var groupBase = Math.pow(base, groupSize);
          var groupBase = groupBases[base];
          out = '';
          var c = this.clone();
          c.negative = 0;
          while (!c.isZero()) {
            var r = c.modn(groupBase).toString(base);
            c = c.idivn(groupBase);

            if (!c.isZero()) {
              out = zeros[groupSize - r.length] + r + out;
            } else {
              out = r + out;
            }
          }
          if (this.isZero()) {
            out = '0' + out;
          }
          while (out.length % padding !== 0) {
            out = '0' + out;
          }
          if (this.negative !== 0) {
            out = '-' + out;
          }
          return out;
        }

        assert(false, 'Base should be between 2 and 36');
      };

      BN.prototype.toNumber = function toNumber () {
        var ret = this.words[0];
        if (this.length === 2) {
          ret += this.words[1] * 0x4000000;
        } else if (this.length === 3 && this.words[2] === 0x01) {
          // NOTE: at this stage it is known that the top bit is set
          ret += 0x10000000000000 + (this.words[1] * 0x4000000);
        } else if (this.length > 2) {
          assert(false, 'Number can only safely store up to 53 bits');
        }
        return (this.negative !== 0) ? -ret : ret;
      };

      BN.prototype.toJSON = function toJSON () {
        return this.toString(16);
      };

      BN.prototype.toBuffer = function toBuffer (endian, length) {
        assert(typeof Buffer !== 'undefined');
        return this.toArrayLike(Buffer, endian, length);
      };

      BN.prototype.toArray = function toArray (endian, length) {
        return this.toArrayLike(Array, endian, length);
      };

      BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
        var byteLength = this.byteLength();
        var reqLength = length || Math.max(1, byteLength);
        assert(byteLength <= reqLength, 'byte array longer than desired length');
        assert(reqLength > 0, 'Requested array length <= 0');

        this.strip();
        var littleEndian = endian === 'le';
        var res = new ArrayType(reqLength);

        var b, i;
        var q = this.clone();
        if (!littleEndian) {
          // Assume big-endian
          for (i = 0; i < reqLength - byteLength; i++) {
            res[i] = 0;
          }

          for (i = 0; !q.isZero(); i++) {
            b = q.andln(0xff);
            q.iushrn(8);

            res[reqLength - i - 1] = b;
          }
        } else {
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(0xff);
            q.iushrn(8);

            res[i] = b;
          }

          for (; i < reqLength; i++) {
            res[i] = 0;
          }
        }

        return res;
      };

      if (Math.clz32) {
        BN.prototype._countBits = function _countBits (w) {
          return 32 - Math.clz32(w);
        };
      } else {
        BN.prototype._countBits = function _countBits (w) {
          var t = w;
          var r = 0;
          if (t >= 0x1000) {
            r += 13;
            t >>>= 13;
          }
          if (t >= 0x40) {
            r += 7;
            t >>>= 7;
          }
          if (t >= 0x8) {
            r += 4;
            t >>>= 4;
          }
          if (t >= 0x02) {
            r += 2;
            t >>>= 2;
          }
          return r + t;
        };
      }

      BN.prototype._zeroBits = function _zeroBits (w) {
        // Short-cut
        if (w === 0) return 26;

        var t = w;
        var r = 0;
        if ((t & 0x1fff) === 0) {
          r += 13;
          t >>>= 13;
        }
        if ((t & 0x7f) === 0) {
          r += 7;
          t >>>= 7;
        }
        if ((t & 0xf) === 0) {
          r += 4;
          t >>>= 4;
        }
        if ((t & 0x3) === 0) {
          r += 2;
          t >>>= 2;
        }
        if ((t & 0x1) === 0) {
          r++;
        }
        return r;
      };

      // Return number of used bits in a BN
      BN.prototype.bitLength = function bitLength () {
        var w = this.words[this.length - 1];
        var hi = this._countBits(w);
        return (this.length - 1) * 26 + hi;
      };

      function toBitArray (num) {
        var w = new Array(num.bitLength());

        for (var bit = 0; bit < w.length; bit++) {
          var off = (bit / 26) | 0;
          var wbit = bit % 26;

          w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
        }

        return w;
      }

      // Number of trailing zero bits
      BN.prototype.zeroBits = function zeroBits () {
        if (this.isZero()) return 0;

        var r = 0;
        for (var i = 0; i < this.length; i++) {
          var b = this._zeroBits(this.words[i]);
          r += b;
          if (b !== 26) break;
        }
        return r;
      };

      BN.prototype.byteLength = function byteLength () {
        return Math.ceil(this.bitLength() / 8);
      };

      BN.prototype.toTwos = function toTwos (width) {
        if (this.negative !== 0) {
          return this.abs().inotn(width).iaddn(1);
        }
        return this.clone();
      };

      BN.prototype.fromTwos = function fromTwos (width) {
        if (this.testn(width - 1)) {
          return this.notn(width).iaddn(1).ineg();
        }
        return this.clone();
      };

      BN.prototype.isNeg = function isNeg () {
        return this.negative !== 0;
      };

      // Return negative clone of `this`
      BN.prototype.neg = function neg () {
        return this.clone().ineg();
      };

      BN.prototype.ineg = function ineg () {
        if (!this.isZero()) {
          this.negative ^= 1;
        }

        return this;
      };

      // Or `num` with `this` in-place
      BN.prototype.iuor = function iuor (num) {
        while (this.length < num.length) {
          this.words[this.length++] = 0;
        }

        for (var i = 0; i < num.length; i++) {
          this.words[i] = this.words[i] | num.words[i];
        }

        return this.strip();
      };

      BN.prototype.ior = function ior (num) {
        assert((this.negative | num.negative) === 0);
        return this.iuor(num);
      };

      // Or `num` with `this`
      BN.prototype.or = function or (num) {
        if (this.length > num.length) return this.clone().ior(num);
        return num.clone().ior(this);
      };

      BN.prototype.uor = function uor (num) {
        if (this.length > num.length) return this.clone().iuor(num);
        return num.clone().iuor(this);
      };

      // And `num` with `this` in-place
      BN.prototype.iuand = function iuand (num) {
        // b = min-length(num, this)
        var b;
        if (this.length > num.length) {
          b = num;
        } else {
          b = this;
        }

        for (var i = 0; i < b.length; i++) {
          this.words[i] = this.words[i] & num.words[i];
        }

        this.length = b.length;

        return this.strip();
      };

      BN.prototype.iand = function iand (num) {
        assert((this.negative | num.negative) === 0);
        return this.iuand(num);
      };

      // And `num` with `this`
      BN.prototype.and = function and (num) {
        if (this.length > num.length) return this.clone().iand(num);
        return num.clone().iand(this);
      };

      BN.prototype.uand = function uand (num) {
        if (this.length > num.length) return this.clone().iuand(num);
        return num.clone().iuand(this);
      };

      // Xor `num` with `this` in-place
      BN.prototype.iuxor = function iuxor (num) {
        // a.length > b.length
        var a;
        var b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        for (var i = 0; i < b.length; i++) {
          this.words[i] = a.words[i] ^ b.words[i];
        }

        if (this !== a) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        this.length = a.length;

        return this.strip();
      };

      BN.prototype.ixor = function ixor (num) {
        assert((this.negative | num.negative) === 0);
        return this.iuxor(num);
      };

      // Xor `num` with `this`
      BN.prototype.xor = function xor (num) {
        if (this.length > num.length) return this.clone().ixor(num);
        return num.clone().ixor(this);
      };

      BN.prototype.uxor = function uxor (num) {
        if (this.length > num.length) return this.clone().iuxor(num);
        return num.clone().iuxor(this);
      };

      // Not ``this`` with ``width`` bitwidth
      BN.prototype.inotn = function inotn (width) {
        assert(typeof width === 'number' && width >= 0);

        var bytesNeeded = Math.ceil(width / 26) | 0;
        var bitsLeft = width % 26;

        // Extend the buffer with leading zeroes
        this._expand(bytesNeeded);

        if (bitsLeft > 0) {
          bytesNeeded--;
        }

        // Handle complete words
        for (var i = 0; i < bytesNeeded; i++) {
          this.words[i] = ~this.words[i] & 0x3ffffff;
        }

        // Handle the residue
        if (bitsLeft > 0) {
          this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
        }

        // And remove leading zeroes
        return this.strip();
      };

      BN.prototype.notn = function notn (width) {
        return this.clone().inotn(width);
      };

      // Set `bit` of `this`
      BN.prototype.setn = function setn (bit, val) {
        assert(typeof bit === 'number' && bit >= 0);

        var off = (bit / 26) | 0;
        var wbit = bit % 26;

        this._expand(off + 1);

        if (val) {
          this.words[off] = this.words[off] | (1 << wbit);
        } else {
          this.words[off] = this.words[off] & ~(1 << wbit);
        }

        return this.strip();
      };

      // Add `num` to `this` in-place
      BN.prototype.iadd = function iadd (num) {
        var r;

        // negative + positive
        if (this.negative !== 0 && num.negative === 0) {
          this.negative = 0;
          r = this.isub(num);
          this.negative ^= 1;
          return this._normSign();

          // positive + negative
        } else if (this.negative === 0 && num.negative !== 0) {
          num.negative = 0;
          r = this.isub(num);
          num.negative = 1;
          return r._normSign();
        }

        // a.length > b.length
        var a, b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
          this.words[i] = r & 0x3ffffff;
          carry = r >>> 26;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          this.words[i] = r & 0x3ffffff;
          carry = r >>> 26;
        }

        this.length = a.length;
        if (carry !== 0) {
          this.words[this.length] = carry;
          this.length++;
          // Copy the rest of the words
        } else if (a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        return this;
      };

      // Add `num` to `this`
      BN.prototype.add = function add (num) {
        var res;
        if (num.negative !== 0 && this.negative === 0) {
          num.negative = 0;
          res = this.sub(num);
          num.negative ^= 1;
          return res;
        } else if (num.negative === 0 && this.negative !== 0) {
          this.negative = 0;
          res = num.sub(this);
          this.negative = 1;
          return res;
        }

        if (this.length > num.length) return this.clone().iadd(num);

        return num.clone().iadd(this);
      };

      // Subtract `num` from `this` in-place
      BN.prototype.isub = function isub (num) {
        // this - (-num) = this + num
        if (num.negative !== 0) {
          num.negative = 0;
          var r = this.iadd(num);
          num.negative = 1;
          return r._normSign();

          // -this - num = -(this + num)
        } else if (this.negative !== 0) {
          this.negative = 0;
          this.iadd(num);
          this.negative = 1;
          return this._normSign();
        }

        // At this point both numbers are positive
        var cmp = this.cmp(num);

        // Optimization - zeroify
        if (cmp === 0) {
          this.negative = 0;
          this.length = 1;
          this.words[0] = 0;
          return this;
        }

        // a > b
        var a, b;
        if (cmp > 0) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }

        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 0x3ffffff;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 0x3ffffff;
        }

        // Copy rest of the words
        if (carry === 0 && i < a.length && a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }

        this.length = Math.max(this.length, i);

        if (a !== this) {
          this.negative = 1;
        }

        return this.strip();
      };

      // Subtract `num` from `this`
      BN.prototype.sub = function sub (num) {
        return this.clone().isub(num);
      };

      function smallMulTo (self, num, out) {
        out.negative = num.negative ^ self.negative;
        var len = (self.length + num.length) | 0;
        out.length = len;
        len = (len - 1) | 0;

        // Peel one iteration (compiler can't do it, because of code complexity)
        var a = self.words[0] | 0;
        var b = num.words[0] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        var carry = (r / 0x4000000) | 0;
        out.words[0] = lo;

        for (var k = 1; k < len; k++) {
          // Sum all words with the same `i + j = k` and accumulate `ncarry`,
          // note that ncarry could be >= 0x3ffffff
          var ncarry = carry >>> 26;
          var rword = carry & 0x3ffffff;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = (k - j) | 0;
            a = self.words[i] | 0;
            b = num.words[j] | 0;
            r = a * b + rword;
            ncarry += (r / 0x4000000) | 0;
            rword = r & 0x3ffffff;
          }
          out.words[k] = rword | 0;
          carry = ncarry | 0;
        }
        if (carry !== 0) {
          out.words[k] = carry | 0;
        } else {
          out.length--;
        }

        return out.strip();
      }

      // TODO(indutny): it may be reasonable to omit it for users who don't need
      // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
      // multiplication (like elliptic secp256k1).
      var comb10MulTo = function comb10MulTo (self, num, out) {
        var a = self.words;
        var b = num.words;
        var o = out.words;
        var c = 0;
        var lo;
        var mid;
        var hi;
        var a0 = a[0] | 0;
        var al0 = a0 & 0x1fff;
        var ah0 = a0 >>> 13;
        var a1 = a[1] | 0;
        var al1 = a1 & 0x1fff;
        var ah1 = a1 >>> 13;
        var a2 = a[2] | 0;
        var al2 = a2 & 0x1fff;
        var ah2 = a2 >>> 13;
        var a3 = a[3] | 0;
        var al3 = a3 & 0x1fff;
        var ah3 = a3 >>> 13;
        var a4 = a[4] | 0;
        var al4 = a4 & 0x1fff;
        var ah4 = a4 >>> 13;
        var a5 = a[5] | 0;
        var al5 = a5 & 0x1fff;
        var ah5 = a5 >>> 13;
        var a6 = a[6] | 0;
        var al6 = a6 & 0x1fff;
        var ah6 = a6 >>> 13;
        var a7 = a[7] | 0;
        var al7 = a7 & 0x1fff;
        var ah7 = a7 >>> 13;
        var a8 = a[8] | 0;
        var al8 = a8 & 0x1fff;
        var ah8 = a8 >>> 13;
        var a9 = a[9] | 0;
        var al9 = a9 & 0x1fff;
        var ah9 = a9 >>> 13;
        var b0 = b[0] | 0;
        var bl0 = b0 & 0x1fff;
        var bh0 = b0 >>> 13;
        var b1 = b[1] | 0;
        var bl1 = b1 & 0x1fff;
        var bh1 = b1 >>> 13;
        var b2 = b[2] | 0;
        var bl2 = b2 & 0x1fff;
        var bh2 = b2 >>> 13;
        var b3 = b[3] | 0;
        var bl3 = b3 & 0x1fff;
        var bh3 = b3 >>> 13;
        var b4 = b[4] | 0;
        var bl4 = b4 & 0x1fff;
        var bh4 = b4 >>> 13;
        var b5 = b[5] | 0;
        var bl5 = b5 & 0x1fff;
        var bh5 = b5 >>> 13;
        var b6 = b[6] | 0;
        var bl6 = b6 & 0x1fff;
        var bh6 = b6 >>> 13;
        var b7 = b[7] | 0;
        var bl7 = b7 & 0x1fff;
        var bh7 = b7 >>> 13;
        var b8 = b[8] | 0;
        var bl8 = b8 & 0x1fff;
        var bh8 = b8 >>> 13;
        var b9 = b[9] | 0;
        var bl9 = b9 & 0x1fff;
        var bh9 = b9 >>> 13;

        out.negative = self.negative ^ num.negative;
        out.length = 19;
        /* k = 0 */
        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = (mid + Math.imul(ah0, bl0)) | 0;
        hi = Math.imul(ah0, bh0);
        var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
        w0 &= 0x3ffffff;
        /* k = 1 */
        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = (mid + Math.imul(ah1, bl0)) | 0;
        hi = Math.imul(ah1, bh0);
        lo = (lo + Math.imul(al0, bl1)) | 0;
        mid = (mid + Math.imul(al0, bh1)) | 0;
        mid = (mid + Math.imul(ah0, bl1)) | 0;
        hi = (hi + Math.imul(ah0, bh1)) | 0;
        var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
        w1 &= 0x3ffffff;
        /* k = 2 */
        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = (mid + Math.imul(ah2, bl0)) | 0;
        hi = Math.imul(ah2, bh0);
        lo = (lo + Math.imul(al1, bl1)) | 0;
        mid = (mid + Math.imul(al1, bh1)) | 0;
        mid = (mid + Math.imul(ah1, bl1)) | 0;
        hi = (hi + Math.imul(ah1, bh1)) | 0;
        lo = (lo + Math.imul(al0, bl2)) | 0;
        mid = (mid + Math.imul(al0, bh2)) | 0;
        mid = (mid + Math.imul(ah0, bl2)) | 0;
        hi = (hi + Math.imul(ah0, bh2)) | 0;
        var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
        w2 &= 0x3ffffff;
        /* k = 3 */
        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = (mid + Math.imul(ah3, bl0)) | 0;
        hi = Math.imul(ah3, bh0);
        lo = (lo + Math.imul(al2, bl1)) | 0;
        mid = (mid + Math.imul(al2, bh1)) | 0;
        mid = (mid + Math.imul(ah2, bl1)) | 0;
        hi = (hi + Math.imul(ah2, bh1)) | 0;
        lo = (lo + Math.imul(al1, bl2)) | 0;
        mid = (mid + Math.imul(al1, bh2)) | 0;
        mid = (mid + Math.imul(ah1, bl2)) | 0;
        hi = (hi + Math.imul(ah1, bh2)) | 0;
        lo = (lo + Math.imul(al0, bl3)) | 0;
        mid = (mid + Math.imul(al0, bh3)) | 0;
        mid = (mid + Math.imul(ah0, bl3)) | 0;
        hi = (hi + Math.imul(ah0, bh3)) | 0;
        var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
        w3 &= 0x3ffffff;
        /* k = 4 */
        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = (mid + Math.imul(ah4, bl0)) | 0;
        hi = Math.imul(ah4, bh0);
        lo = (lo + Math.imul(al3, bl1)) | 0;
        mid = (mid + Math.imul(al3, bh1)) | 0;
        mid = (mid + Math.imul(ah3, bl1)) | 0;
        hi = (hi + Math.imul(ah3, bh1)) | 0;
        lo = (lo + Math.imul(al2, bl2)) | 0;
        mid = (mid + Math.imul(al2, bh2)) | 0;
        mid = (mid + Math.imul(ah2, bl2)) | 0;
        hi = (hi + Math.imul(ah2, bh2)) | 0;
        lo = (lo + Math.imul(al1, bl3)) | 0;
        mid = (mid + Math.imul(al1, bh3)) | 0;
        mid = (mid + Math.imul(ah1, bl3)) | 0;
        hi = (hi + Math.imul(ah1, bh3)) | 0;
        lo = (lo + Math.imul(al0, bl4)) | 0;
        mid = (mid + Math.imul(al0, bh4)) | 0;
        mid = (mid + Math.imul(ah0, bl4)) | 0;
        hi = (hi + Math.imul(ah0, bh4)) | 0;
        var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
        w4 &= 0x3ffffff;
        /* k = 5 */
        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = (mid + Math.imul(ah5, bl0)) | 0;
        hi = Math.imul(ah5, bh0);
        lo = (lo + Math.imul(al4, bl1)) | 0;
        mid = (mid + Math.imul(al4, bh1)) | 0;
        mid = (mid + Math.imul(ah4, bl1)) | 0;
        hi = (hi + Math.imul(ah4, bh1)) | 0;
        lo = (lo + Math.imul(al3, bl2)) | 0;
        mid = (mid + Math.imul(al3, bh2)) | 0;
        mid = (mid + Math.imul(ah3, bl2)) | 0;
        hi = (hi + Math.imul(ah3, bh2)) | 0;
        lo = (lo + Math.imul(al2, bl3)) | 0;
        mid = (mid + Math.imul(al2, bh3)) | 0;
        mid = (mid + Math.imul(ah2, bl3)) | 0;
        hi = (hi + Math.imul(ah2, bh3)) | 0;
        lo = (lo + Math.imul(al1, bl4)) | 0;
        mid = (mid + Math.imul(al1, bh4)) | 0;
        mid = (mid + Math.imul(ah1, bl4)) | 0;
        hi = (hi + Math.imul(ah1, bh4)) | 0;
        lo = (lo + Math.imul(al0, bl5)) | 0;
        mid = (mid + Math.imul(al0, bh5)) | 0;
        mid = (mid + Math.imul(ah0, bl5)) | 0;
        hi = (hi + Math.imul(ah0, bh5)) | 0;
        var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
        w5 &= 0x3ffffff;
        /* k = 6 */
        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = (mid + Math.imul(ah6, bl0)) | 0;
        hi = Math.imul(ah6, bh0);
        lo = (lo + Math.imul(al5, bl1)) | 0;
        mid = (mid + Math.imul(al5, bh1)) | 0;
        mid = (mid + Math.imul(ah5, bl1)) | 0;
        hi = (hi + Math.imul(ah5, bh1)) | 0;
        lo = (lo + Math.imul(al4, bl2)) | 0;
        mid = (mid + Math.imul(al4, bh2)) | 0;
        mid = (mid + Math.imul(ah4, bl2)) | 0;
        hi = (hi + Math.imul(ah4, bh2)) | 0;
        lo = (lo + Math.imul(al3, bl3)) | 0;
        mid = (mid + Math.imul(al3, bh3)) | 0;
        mid = (mid + Math.imul(ah3, bl3)) | 0;
        hi = (hi + Math.imul(ah3, bh3)) | 0;
        lo = (lo + Math.imul(al2, bl4)) | 0;
        mid = (mid + Math.imul(al2, bh4)) | 0;
        mid = (mid + Math.imul(ah2, bl4)) | 0;
        hi = (hi + Math.imul(ah2, bh4)) | 0;
        lo = (lo + Math.imul(al1, bl5)) | 0;
        mid = (mid + Math.imul(al1, bh5)) | 0;
        mid = (mid + Math.imul(ah1, bl5)) | 0;
        hi = (hi + Math.imul(ah1, bh5)) | 0;
        lo = (lo + Math.imul(al0, bl6)) | 0;
        mid = (mid + Math.imul(al0, bh6)) | 0;
        mid = (mid + Math.imul(ah0, bl6)) | 0;
        hi = (hi + Math.imul(ah0, bh6)) | 0;
        var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
        w6 &= 0x3ffffff;
        /* k = 7 */
        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = (mid + Math.imul(ah7, bl0)) | 0;
        hi = Math.imul(ah7, bh0);
        lo = (lo + Math.imul(al6, bl1)) | 0;
        mid = (mid + Math.imul(al6, bh1)) | 0;
        mid = (mid + Math.imul(ah6, bl1)) | 0;
        hi = (hi + Math.imul(ah6, bh1)) | 0;
        lo = (lo + Math.imul(al5, bl2)) | 0;
        mid = (mid + Math.imul(al5, bh2)) | 0;
        mid = (mid + Math.imul(ah5, bl2)) | 0;
        hi = (hi + Math.imul(ah5, bh2)) | 0;
        lo = (lo + Math.imul(al4, bl3)) | 0;
        mid = (mid + Math.imul(al4, bh3)) | 0;
        mid = (mid + Math.imul(ah4, bl3)) | 0;
        hi = (hi + Math.imul(ah4, bh3)) | 0;
        lo = (lo + Math.imul(al3, bl4)) | 0;
        mid = (mid + Math.imul(al3, bh4)) | 0;
        mid = (mid + Math.imul(ah3, bl4)) | 0;
        hi = (hi + Math.imul(ah3, bh4)) | 0;
        lo = (lo + Math.imul(al2, bl5)) | 0;
        mid = (mid + Math.imul(al2, bh5)) | 0;
        mid = (mid + Math.imul(ah2, bl5)) | 0;
        hi = (hi + Math.imul(ah2, bh5)) | 0;
        lo = (lo + Math.imul(al1, bl6)) | 0;
        mid = (mid + Math.imul(al1, bh6)) | 0;
        mid = (mid + Math.imul(ah1, bl6)) | 0;
        hi = (hi + Math.imul(ah1, bh6)) | 0;
        lo = (lo + Math.imul(al0, bl7)) | 0;
        mid = (mid + Math.imul(al0, bh7)) | 0;
        mid = (mid + Math.imul(ah0, bl7)) | 0;
        hi = (hi + Math.imul(ah0, bh7)) | 0;
        var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
        w7 &= 0x3ffffff;
        /* k = 8 */
        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = (mid + Math.imul(ah8, bl0)) | 0;
        hi = Math.imul(ah8, bh0);
        lo = (lo + Math.imul(al7, bl1)) | 0;
        mid = (mid + Math.imul(al7, bh1)) | 0;
        mid = (mid + Math.imul(ah7, bl1)) | 0;
        hi = (hi + Math.imul(ah7, bh1)) | 0;
        lo = (lo + Math.imul(al6, bl2)) | 0;
        mid = (mid + Math.imul(al6, bh2)) | 0;
        mid = (mid + Math.imul(ah6, bl2)) | 0;
        hi = (hi + Math.imul(ah6, bh2)) | 0;
        lo = (lo + Math.imul(al5, bl3)) | 0;
        mid = (mid + Math.imul(al5, bh3)) | 0;
        mid = (mid + Math.imul(ah5, bl3)) | 0;
        hi = (hi + Math.imul(ah5, bh3)) | 0;
        lo = (lo + Math.imul(al4, bl4)) | 0;
        mid = (mid + Math.imul(al4, bh4)) | 0;
        mid = (mid + Math.imul(ah4, bl4)) | 0;
        hi = (hi + Math.imul(ah4, bh4)) | 0;
        lo = (lo + Math.imul(al3, bl5)) | 0;
        mid = (mid + Math.imul(al3, bh5)) | 0;
        mid = (mid + Math.imul(ah3, bl5)) | 0;
        hi = (hi + Math.imul(ah3, bh5)) | 0;
        lo = (lo + Math.imul(al2, bl6)) | 0;
        mid = (mid + Math.imul(al2, bh6)) | 0;
        mid = (mid + Math.imul(ah2, bl6)) | 0;
        hi = (hi + Math.imul(ah2, bh6)) | 0;
        lo = (lo + Math.imul(al1, bl7)) | 0;
        mid = (mid + Math.imul(al1, bh7)) | 0;
        mid = (mid + Math.imul(ah1, bl7)) | 0;
        hi = (hi + Math.imul(ah1, bh7)) | 0;
        lo = (lo + Math.imul(al0, bl8)) | 0;
        mid = (mid + Math.imul(al0, bh8)) | 0;
        mid = (mid + Math.imul(ah0, bl8)) | 0;
        hi = (hi + Math.imul(ah0, bh8)) | 0;
        var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
        w8 &= 0x3ffffff;
        /* k = 9 */
        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = (mid + Math.imul(ah9, bl0)) | 0;
        hi = Math.imul(ah9, bh0);
        lo = (lo + Math.imul(al8, bl1)) | 0;
        mid = (mid + Math.imul(al8, bh1)) | 0;
        mid = (mid + Math.imul(ah8, bl1)) | 0;
        hi = (hi + Math.imul(ah8, bh1)) | 0;
        lo = (lo + Math.imul(al7, bl2)) | 0;
        mid = (mid + Math.imul(al7, bh2)) | 0;
        mid = (mid + Math.imul(ah7, bl2)) | 0;
        hi = (hi + Math.imul(ah7, bh2)) | 0;
        lo = (lo + Math.imul(al6, bl3)) | 0;
        mid = (mid + Math.imul(al6, bh3)) | 0;
        mid = (mid + Math.imul(ah6, bl3)) | 0;
        hi = (hi + Math.imul(ah6, bh3)) | 0;
        lo = (lo + Math.imul(al5, bl4)) | 0;
        mid = (mid + Math.imul(al5, bh4)) | 0;
        mid = (mid + Math.imul(ah5, bl4)) | 0;
        hi = (hi + Math.imul(ah5, bh4)) | 0;
        lo = (lo + Math.imul(al4, bl5)) | 0;
        mid = (mid + Math.imul(al4, bh5)) | 0;
        mid = (mid + Math.imul(ah4, bl5)) | 0;
        hi = (hi + Math.imul(ah4, bh5)) | 0;
        lo = (lo + Math.imul(al3, bl6)) | 0;
        mid = (mid + Math.imul(al3, bh6)) | 0;
        mid = (mid + Math.imul(ah3, bl6)) | 0;
        hi = (hi + Math.imul(ah3, bh6)) | 0;
        lo = (lo + Math.imul(al2, bl7)) | 0;
        mid = (mid + Math.imul(al2, bh7)) | 0;
        mid = (mid + Math.imul(ah2, bl7)) | 0;
        hi = (hi + Math.imul(ah2, bh7)) | 0;
        lo = (lo + Math.imul(al1, bl8)) | 0;
        mid = (mid + Math.imul(al1, bh8)) | 0;
        mid = (mid + Math.imul(ah1, bl8)) | 0;
        hi = (hi + Math.imul(ah1, bh8)) | 0;
        lo = (lo + Math.imul(al0, bl9)) | 0;
        mid = (mid + Math.imul(al0, bh9)) | 0;
        mid = (mid + Math.imul(ah0, bl9)) | 0;
        hi = (hi + Math.imul(ah0, bh9)) | 0;
        var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
        w9 &= 0x3ffffff;
        /* k = 10 */
        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = (mid + Math.imul(ah9, bl1)) | 0;
        hi = Math.imul(ah9, bh1);
        lo = (lo + Math.imul(al8, bl2)) | 0;
        mid = (mid + Math.imul(al8, bh2)) | 0;
        mid = (mid + Math.imul(ah8, bl2)) | 0;
        hi = (hi + Math.imul(ah8, bh2)) | 0;
        lo = (lo + Math.imul(al7, bl3)) | 0;
        mid = (mid + Math.imul(al7, bh3)) | 0;
        mid = (mid + Math.imul(ah7, bl3)) | 0;
        hi = (hi + Math.imul(ah7, bh3)) | 0;
        lo = (lo + Math.imul(al6, bl4)) | 0;
        mid = (mid + Math.imul(al6, bh4)) | 0;
        mid = (mid + Math.imul(ah6, bl4)) | 0;
        hi = (hi + Math.imul(ah6, bh4)) | 0;
        lo = (lo + Math.imul(al5, bl5)) | 0;
        mid = (mid + Math.imul(al5, bh5)) | 0;
        mid = (mid + Math.imul(ah5, bl5)) | 0;
        hi = (hi + Math.imul(ah5, bh5)) | 0;
        lo = (lo + Math.imul(al4, bl6)) | 0;
        mid = (mid + Math.imul(al4, bh6)) | 0;
        mid = (mid + Math.imul(ah4, bl6)) | 0;
        hi = (hi + Math.imul(ah4, bh6)) | 0;
        lo = (lo + Math.imul(al3, bl7)) | 0;
        mid = (mid + Math.imul(al3, bh7)) | 0;
        mid = (mid + Math.imul(ah3, bl7)) | 0;
        hi = (hi + Math.imul(ah3, bh7)) | 0;
        lo = (lo + Math.imul(al2, bl8)) | 0;
        mid = (mid + Math.imul(al2, bh8)) | 0;
        mid = (mid + Math.imul(ah2, bl8)) | 0;
        hi = (hi + Math.imul(ah2, bh8)) | 0;
        lo = (lo + Math.imul(al1, bl9)) | 0;
        mid = (mid + Math.imul(al1, bh9)) | 0;
        mid = (mid + Math.imul(ah1, bl9)) | 0;
        hi = (hi + Math.imul(ah1, bh9)) | 0;
        var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
        w10 &= 0x3ffffff;
        /* k = 11 */
        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = (mid + Math.imul(ah9, bl2)) | 0;
        hi = Math.imul(ah9, bh2);
        lo = (lo + Math.imul(al8, bl3)) | 0;
        mid = (mid + Math.imul(al8, bh3)) | 0;
        mid = (mid + Math.imul(ah8, bl3)) | 0;
        hi = (hi + Math.imul(ah8, bh3)) | 0;
        lo = (lo + Math.imul(al7, bl4)) | 0;
        mid = (mid + Math.imul(al7, bh4)) | 0;
        mid = (mid + Math.imul(ah7, bl4)) | 0;
        hi = (hi + Math.imul(ah7, bh4)) | 0;
        lo = (lo + Math.imul(al6, bl5)) | 0;
        mid = (mid + Math.imul(al6, bh5)) | 0;
        mid = (mid + Math.imul(ah6, bl5)) | 0;
        hi = (hi + Math.imul(ah6, bh5)) | 0;
        lo = (lo + Math.imul(al5, bl6)) | 0;
        mid = (mid + Math.imul(al5, bh6)) | 0;
        mid = (mid + Math.imul(ah5, bl6)) | 0;
        hi = (hi + Math.imul(ah5, bh6)) | 0;
        lo = (lo + Math.imul(al4, bl7)) | 0;
        mid = (mid + Math.imul(al4, bh7)) | 0;
        mid = (mid + Math.imul(ah4, bl7)) | 0;
        hi = (hi + Math.imul(ah4, bh7)) | 0;
        lo = (lo + Math.imul(al3, bl8)) | 0;
        mid = (mid + Math.imul(al3, bh8)) | 0;
        mid = (mid + Math.imul(ah3, bl8)) | 0;
        hi = (hi + Math.imul(ah3, bh8)) | 0;
        lo = (lo + Math.imul(al2, bl9)) | 0;
        mid = (mid + Math.imul(al2, bh9)) | 0;
        mid = (mid + Math.imul(ah2, bl9)) | 0;
        hi = (hi + Math.imul(ah2, bh9)) | 0;
        var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
        w11 &= 0x3ffffff;
        /* k = 12 */
        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = (mid + Math.imul(ah9, bl3)) | 0;
        hi = Math.imul(ah9, bh3);
        lo = (lo + Math.imul(al8, bl4)) | 0;
        mid = (mid + Math.imul(al8, bh4)) | 0;
        mid = (mid + Math.imul(ah8, bl4)) | 0;
        hi = (hi + Math.imul(ah8, bh4)) | 0;
        lo = (lo + Math.imul(al7, bl5)) | 0;
        mid = (mid + Math.imul(al7, bh5)) | 0;
        mid = (mid + Math.imul(ah7, bl5)) | 0;
        hi = (hi + Math.imul(ah7, bh5)) | 0;
        lo = (lo + Math.imul(al6, bl6)) | 0;
        mid = (mid + Math.imul(al6, bh6)) | 0;
        mid = (mid + Math.imul(ah6, bl6)) | 0;
        hi = (hi + Math.imul(ah6, bh6)) | 0;
        lo = (lo + Math.imul(al5, bl7)) | 0;
        mid = (mid + Math.imul(al5, bh7)) | 0;
        mid = (mid + Math.imul(ah5, bl7)) | 0;
        hi = (hi + Math.imul(ah5, bh7)) | 0;
        lo = (lo + Math.imul(al4, bl8)) | 0;
        mid = (mid + Math.imul(al4, bh8)) | 0;
        mid = (mid + Math.imul(ah4, bl8)) | 0;
        hi = (hi + Math.imul(ah4, bh8)) | 0;
        lo = (lo + Math.imul(al3, bl9)) | 0;
        mid = (mid + Math.imul(al3, bh9)) | 0;
        mid = (mid + Math.imul(ah3, bl9)) | 0;
        hi = (hi + Math.imul(ah3, bh9)) | 0;
        var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
        w12 &= 0x3ffffff;
        /* k = 13 */
        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = (mid + Math.imul(ah9, bl4)) | 0;
        hi = Math.imul(ah9, bh4);
        lo = (lo + Math.imul(al8, bl5)) | 0;
        mid = (mid + Math.imul(al8, bh5)) | 0;
        mid = (mid + Math.imul(ah8, bl5)) | 0;
        hi = (hi + Math.imul(ah8, bh5)) | 0;
        lo = (lo + Math.imul(al7, bl6)) | 0;
        mid = (mid + Math.imul(al7, bh6)) | 0;
        mid = (mid + Math.imul(ah7, bl6)) | 0;
        hi = (hi + Math.imul(ah7, bh6)) | 0;
        lo = (lo + Math.imul(al6, bl7)) | 0;
        mid = (mid + Math.imul(al6, bh7)) | 0;
        mid = (mid + Math.imul(ah6, bl7)) | 0;
        hi = (hi + Math.imul(ah6, bh7)) | 0;
        lo = (lo + Math.imul(al5, bl8)) | 0;
        mid = (mid + Math.imul(al5, bh8)) | 0;
        mid = (mid + Math.imul(ah5, bl8)) | 0;
        hi = (hi + Math.imul(ah5, bh8)) | 0;
        lo = (lo + Math.imul(al4, bl9)) | 0;
        mid = (mid + Math.imul(al4, bh9)) | 0;
        mid = (mid + Math.imul(ah4, bl9)) | 0;
        hi = (hi + Math.imul(ah4, bh9)) | 0;
        var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
        w13 &= 0x3ffffff;
        /* k = 14 */
        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = (mid + Math.imul(ah9, bl5)) | 0;
        hi = Math.imul(ah9, bh5);
        lo = (lo + Math.imul(al8, bl6)) | 0;
        mid = (mid + Math.imul(al8, bh6)) | 0;
        mid = (mid + Math.imul(ah8, bl6)) | 0;
        hi = (hi + Math.imul(ah8, bh6)) | 0;
        lo = (lo + Math.imul(al7, bl7)) | 0;
        mid = (mid + Math.imul(al7, bh7)) | 0;
        mid = (mid + Math.imul(ah7, bl7)) | 0;
        hi = (hi + Math.imul(ah7, bh7)) | 0;
        lo = (lo + Math.imul(al6, bl8)) | 0;
        mid = (mid + Math.imul(al6, bh8)) | 0;
        mid = (mid + Math.imul(ah6, bl8)) | 0;
        hi = (hi + Math.imul(ah6, bh8)) | 0;
        lo = (lo + Math.imul(al5, bl9)) | 0;
        mid = (mid + Math.imul(al5, bh9)) | 0;
        mid = (mid + Math.imul(ah5, bl9)) | 0;
        hi = (hi + Math.imul(ah5, bh9)) | 0;
        var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
        w14 &= 0x3ffffff;
        /* k = 15 */
        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = (mid + Math.imul(ah9, bl6)) | 0;
        hi = Math.imul(ah9, bh6);
        lo = (lo + Math.imul(al8, bl7)) | 0;
        mid = (mid + Math.imul(al8, bh7)) | 0;
        mid = (mid + Math.imul(ah8, bl7)) | 0;
        hi = (hi + Math.imul(ah8, bh7)) | 0;
        lo = (lo + Math.imul(al7, bl8)) | 0;
        mid = (mid + Math.imul(al7, bh8)) | 0;
        mid = (mid + Math.imul(ah7, bl8)) | 0;
        hi = (hi + Math.imul(ah7, bh8)) | 0;
        lo = (lo + Math.imul(al6, bl9)) | 0;
        mid = (mid + Math.imul(al6, bh9)) | 0;
        mid = (mid + Math.imul(ah6, bl9)) | 0;
        hi = (hi + Math.imul(ah6, bh9)) | 0;
        var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
        w15 &= 0x3ffffff;
        /* k = 16 */
        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = (mid + Math.imul(ah9, bl7)) | 0;
        hi = Math.imul(ah9, bh7);
        lo = (lo + Math.imul(al8, bl8)) | 0;
        mid = (mid + Math.imul(al8, bh8)) | 0;
        mid = (mid + Math.imul(ah8, bl8)) | 0;
        hi = (hi + Math.imul(ah8, bh8)) | 0;
        lo = (lo + Math.imul(al7, bl9)) | 0;
        mid = (mid + Math.imul(al7, bh9)) | 0;
        mid = (mid + Math.imul(ah7, bl9)) | 0;
        hi = (hi + Math.imul(ah7, bh9)) | 0;
        var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
        w16 &= 0x3ffffff;
        /* k = 17 */
        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = (mid + Math.imul(ah9, bl8)) | 0;
        hi = Math.imul(ah9, bh8);
        lo = (lo + Math.imul(al8, bl9)) | 0;
        mid = (mid + Math.imul(al8, bh9)) | 0;
        mid = (mid + Math.imul(ah8, bl9)) | 0;
        hi = (hi + Math.imul(ah8, bh9)) | 0;
        var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
        w17 &= 0x3ffffff;
        /* k = 18 */
        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = (mid + Math.imul(ah9, bl9)) | 0;
        hi = Math.imul(ah9, bh9);
        var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
        c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
        w18 &= 0x3ffffff;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;
        if (c !== 0) {
          o[19] = c;
          out.length++;
        }
        return out;
      };

      // Polyfill comb
      if (!Math.imul) {
        comb10MulTo = smallMulTo;
      }

      function bigMulTo (self, num, out) {
        out.negative = num.negative ^ self.negative;
        out.length = self.length + num.length;

        var carry = 0;
        var hncarry = 0;
        for (var k = 0; k < out.length - 1; k++) {
          // Sum all words with the same `i + j = k` and accumulate `ncarry`,
          // note that ncarry could be >= 0x3ffffff
          var ncarry = hncarry;
          hncarry = 0;
          var rword = carry & 0x3ffffff;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j;
            var a = self.words[i] | 0;
            var b = num.words[j] | 0;
            var r = a * b;

            var lo = r & 0x3ffffff;
            ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
            lo = (lo + rword) | 0;
            rword = lo & 0x3ffffff;
            ncarry = (ncarry + (lo >>> 26)) | 0;

            hncarry += ncarry >>> 26;
            ncarry &= 0x3ffffff;
          }
          out.words[k] = rword;
          carry = ncarry;
          ncarry = hncarry;
        }
        if (carry !== 0) {
          out.words[k] = carry;
        } else {
          out.length--;
        }

        return out.strip();
      }

      function jumboMulTo (self, num, out) {
        var fftm = new FFTM();
        return fftm.mulp(self, num, out);
      }

      BN.prototype.mulTo = function mulTo (num, out) {
        var res;
        var len = this.length + num.length;
        if (this.length === 10 && num.length === 10) {
          res = comb10MulTo(this, num, out);
        } else if (len < 63) {
          res = smallMulTo(this, num, out);
        } else if (len < 1024) {
          res = bigMulTo(this, num, out);
        } else {
          res = jumboMulTo(this, num, out);
        }

        return res;
      };

      // Cooley-Tukey algorithm for FFT
      // slightly revisited to rely on looping instead of recursion

      function FFTM (x, y) {
        this.x = x;
        this.y = y;
      }

      FFTM.prototype.makeRBT = function makeRBT (N) {
        var t = new Array(N);
        var l = BN.prototype._countBits(N) - 1;
        for (var i = 0; i < N; i++) {
          t[i] = this.revBin(i, l, N);
        }

        return t;
      };

      // Returns binary-reversed representation of `x`
      FFTM.prototype.revBin = function revBin (x, l, N) {
        if (x === 0 || x === N - 1) return x;

        var rb = 0;
        for (var i = 0; i < l; i++) {
          rb |= (x & 1) << (l - i - 1);
          x >>= 1;
        }

        return rb;
      };

      // Performs "tweedling" phase, therefore 'emulating'
      // behaviour of the recursive algorithm
      FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
        for (var i = 0; i < N; i++) {
          rtws[i] = rws[rbt[i]];
          itws[i] = iws[rbt[i]];
        }
      };

      FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
        this.permute(rbt, rws, iws, rtws, itws, N);

        for (var s = 1; s < N; s <<= 1) {
          var l = s << 1;

          var rtwdf = Math.cos(2 * Math.PI / l);
          var itwdf = Math.sin(2 * Math.PI / l);

          for (var p = 0; p < N; p += l) {
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;

            for (var j = 0; j < s; j++) {
              var re = rtws[p + j];
              var ie = itws[p + j];

              var ro = rtws[p + j + s];
              var io = itws[p + j + s];

              var rx = rtwdf_ * ro - itwdf_ * io;

              io = rtwdf_ * io + itwdf_ * ro;
              ro = rx;

              rtws[p + j] = re + ro;
              itws[p + j] = ie + io;

              rtws[p + j + s] = re - ro;
              itws[p + j + s] = ie - io;

              /* jshint maxdepth : false */
              if (j !== l) {
                rx = rtwdf * rtwdf_ - itwdf * itwdf_;

                itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                rtwdf_ = rx;
              }
            }
          }
        }
      };

      FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
        var N = Math.max(m, n) | 1;
        var odd = N & 1;
        var i = 0;
        for (N = N / 2 | 0; N; N = N >>> 1) {
          i++;
        }

        return 1 << i + 1 + odd;
      };

      FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
        if (N <= 1) return;

        for (var i = 0; i < N / 2; i++) {
          var t = rws[i];

          rws[i] = rws[N - i - 1];
          rws[N - i - 1] = t;

          t = iws[i];

          iws[i] = -iws[N - i - 1];
          iws[N - i - 1] = -t;
        }
      };

      FFTM.prototype.normalize13b = function normalize13b (ws, N) {
        var carry = 0;
        for (var i = 0; i < N / 2; i++) {
          var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
            Math.round(ws[2 * i] / N) +
            carry;

          ws[i] = w & 0x3ffffff;

          if (w < 0x4000000) {
            carry = 0;
          } else {
            carry = w / 0x4000000 | 0;
          }
        }

        return ws;
      };

      FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
        var carry = 0;
        for (var i = 0; i < len; i++) {
          carry = carry + (ws[i] | 0);

          rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
          rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
        }

        // Pad with zeroes
        for (i = 2 * len; i < N; ++i) {
          rws[i] = 0;
        }

        assert(carry === 0);
        assert((carry & ~0x1fff) === 0);
      };

      FFTM.prototype.stub = function stub (N) {
        var ph = new Array(N);
        for (var i = 0; i < N; i++) {
          ph[i] = 0;
        }

        return ph;
      };

      FFTM.prototype.mulp = function mulp (x, y, out) {
        var N = 2 * this.guessLen13b(x.length, y.length);

        var rbt = this.makeRBT(N);

        var _ = this.stub(N);

        var rws = new Array(N);
        var rwst = new Array(N);
        var iwst = new Array(N);

        var nrws = new Array(N);
        var nrwst = new Array(N);
        var niwst = new Array(N);

        var rmws = out.words;
        rmws.length = N;

        this.convert13b(x.words, x.length, rws, N);
        this.convert13b(y.words, y.length, nrws, N);

        this.transform(rws, _, rwst, iwst, N, rbt);
        this.transform(nrws, _, nrwst, niwst, N, rbt);

        for (var i = 0; i < N; i++) {
          var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
          iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
          rwst[i] = rx;
        }

        this.conjugate(rwst, iwst, N);
        this.transform(rwst, iwst, rmws, _, N, rbt);
        this.conjugate(rmws, _, N);
        this.normalize13b(rmws, N);

        out.negative = x.negative ^ y.negative;
        out.length = x.length + y.length;
        return out.strip();
      };

      // Multiply `this` by `num`
      BN.prototype.mul = function mul (num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
      };

      // Multiply employing FFT
      BN.prototype.mulf = function mulf (num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return jumboMulTo(this, num, out);
      };

      // In-place Multiplication
      BN.prototype.imul = function imul (num) {
        return this.clone().mulTo(num, this);
      };

      BN.prototype.imuln = function imuln (num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000);

        // Carry
        var carry = 0;
        for (var i = 0; i < this.length; i++) {
          var w = (this.words[i] | 0) * num;
          var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
          carry >>= 26;
          carry += (w / 0x4000000) | 0;
          // NOTE: lo is 27bit maximum
          carry += lo >>> 26;
          this.words[i] = lo & 0x3ffffff;
        }

        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }

        return this;
      };

      BN.prototype.muln = function muln (num) {
        return this.clone().imuln(num);
      };

      // `this` * `this`
      BN.prototype.sqr = function sqr () {
        return this.mul(this);
      };

      // `this` * `this` in-place
      BN.prototype.isqr = function isqr () {
        return this.imul(this.clone());
      };

      // Math.pow(`this`, `num`)
      BN.prototype.pow = function pow (num) {
        var w = toBitArray(num);
        if (w.length === 0) return new BN(1);

        // Skip leading zeroes
        var res = this;
        for (var i = 0; i < w.length; i++, res = res.sqr()) {
          if (w[i] !== 0) break;
        }

        if (++i < w.length) {
          for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
            if (w[i] === 0) continue;

            res = res.mul(q);
          }
        }

        return res;
      };

      // Shift-left in-place
      BN.prototype.iushln = function iushln (bits) {
        assert(typeof bits === 'number' && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
        var i;

        if (r !== 0) {
          var carry = 0;

          for (i = 0; i < this.length; i++) {
            var newCarry = this.words[i] & carryMask;
            var c = ((this.words[i] | 0) - newCarry) << r;
            this.words[i] = c | carry;
            carry = newCarry >>> (26 - r);
          }

          if (carry) {
            this.words[i] = carry;
            this.length++;
          }
        }

        if (s !== 0) {
          for (i = this.length - 1; i >= 0; i--) {
            this.words[i + s] = this.words[i];
          }

          for (i = 0; i < s; i++) {
            this.words[i] = 0;
          }

          this.length += s;
        }

        return this.strip();
      };

      BN.prototype.ishln = function ishln (bits) {
        // TODO(indutny): implement me
        assert(this.negative === 0);
        return this.iushln(bits);
      };

      // Shift-right in-place
      // NOTE: `hint` is a lowest bit before trailing zeroes
      // NOTE: if `extended` is present - it will be filled with destroyed bits
      BN.prototype.iushrn = function iushrn (bits, hint, extended) {
        assert(typeof bits === 'number' && bits >= 0);
        var h;
        if (hint) {
          h = (hint - (hint % 26)) / 26;
        } else {
          h = 0;
        }

        var r = bits % 26;
        var s = Math.min((bits - r) / 26, this.length);
        var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
        var maskedWords = extended;

        h -= s;
        h = Math.max(0, h);

        // Extended mode, copy masked part
        if (maskedWords) {
          for (var i = 0; i < s; i++) {
            maskedWords.words[i] = this.words[i];
          }
          maskedWords.length = s;
        }

        if (s === 0) {
          // No-op, we should not move anything at all
        } else if (this.length > s) {
          this.length -= s;
          for (i = 0; i < this.length; i++) {
            this.words[i] = this.words[i + s];
          }
        } else {
          this.words[0] = 0;
          this.length = 1;
        }

        var carry = 0;
        for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
          var word = this.words[i] | 0;
          this.words[i] = (carry << (26 - r)) | (word >>> r);
          carry = word & mask;
        }

        // Push carried bits as a mask
        if (maskedWords && carry !== 0) {
          maskedWords.words[maskedWords.length++] = carry;
        }

        if (this.length === 0) {
          this.words[0] = 0;
          this.length = 1;
        }

        return this.strip();
      };

      BN.prototype.ishrn = function ishrn (bits, hint, extended) {
        // TODO(indutny): implement me
        assert(this.negative === 0);
        return this.iushrn(bits, hint, extended);
      };

      // Shift-left
      BN.prototype.shln = function shln (bits) {
        return this.clone().ishln(bits);
      };

      BN.prototype.ushln = function ushln (bits) {
        return this.clone().iushln(bits);
      };

      // Shift-right
      BN.prototype.shrn = function shrn (bits) {
        return this.clone().ishrn(bits);
      };

      BN.prototype.ushrn = function ushrn (bits) {
        return this.clone().iushrn(bits);
      };

      // Test if n bit is set
      BN.prototype.testn = function testn (bit) {
        assert(typeof bit === 'number' && bit >= 0);
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;

        // Fast case: bit is much higher than all existing words
        if (this.length <= s) return false;

        // Check bit and return
        var w = this.words[s];

        return !!(w & q);
      };

      // Return only lowers bits of number (in-place)
      BN.prototype.imaskn = function imaskn (bits) {
        assert(typeof bits === 'number' && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;

        assert(this.negative === 0, 'imaskn works only with positive numbers');

        if (this.length <= s) {
          return this;
        }

        if (r !== 0) {
          s++;
        }
        this.length = Math.min(s, this.length);

        if (r !== 0) {
          var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
          this.words[this.length - 1] &= mask;
        }

        return this.strip();
      };

      // Return only lowers bits of number
      BN.prototype.maskn = function maskn (bits) {
        return this.clone().imaskn(bits);
      };

      // Add plain number `num` to `this`
      BN.prototype.iaddn = function iaddn (num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000);
        if (num < 0) return this.isubn(-num);

        // Possible sign change
        if (this.negative !== 0) {
          if (this.length === 1 && (this.words[0] | 0) < num) {
            this.words[0] = num - (this.words[0] | 0);
            this.negative = 0;
            return this;
          }

          this.negative = 0;
          this.isubn(num);
          this.negative = 1;
          return this;
        }

        // Add without checks
        return this._iaddn(num);
      };

      BN.prototype._iaddn = function _iaddn (num) {
        this.words[0] += num;

        // Carry
        for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
          this.words[i] -= 0x4000000;
          if (i === this.length - 1) {
            this.words[i + 1] = 1;
          } else {
            this.words[i + 1]++;
          }
        }
        this.length = Math.max(this.length, i + 1);

        return this;
      };

      // Subtract plain number `num` from `this`
      BN.prototype.isubn = function isubn (num) {
        assert(typeof num === 'number');
        assert(num < 0x4000000);
        if (num < 0) return this.iaddn(-num);

        if (this.negative !== 0) {
          this.negative = 0;
          this.iaddn(num);
          this.negative = 1;
          return this;
        }

        this.words[0] -= num;

        if (this.length === 1 && this.words[0] < 0) {
          this.words[0] = -this.words[0];
          this.negative = 1;
        } else {
          // Carry
          for (var i = 0; i < this.length && this.words[i] < 0; i++) {
            this.words[i] += 0x4000000;
            this.words[i + 1] -= 1;
          }
        }

        return this.strip();
      };

      BN.prototype.addn = function addn (num) {
        return this.clone().iaddn(num);
      };

      BN.prototype.subn = function subn (num) {
        return this.clone().isubn(num);
      };

      BN.prototype.iabs = function iabs () {
        this.negative = 0;

        return this;
      };

      BN.prototype.abs = function abs () {
        return this.clone().iabs();
      };

      BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
        var len = num.length + shift;
        var i;

        this._expand(len);

        var w;
        var carry = 0;
        for (i = 0; i < num.length; i++) {
          w = (this.words[i + shift] | 0) + carry;
          var right = (num.words[i] | 0) * mul;
          w -= right & 0x3ffffff;
          carry = (w >> 26) - ((right / 0x4000000) | 0);
          this.words[i + shift] = w & 0x3ffffff;
        }
        for (; i < this.length - shift; i++) {
          w = (this.words[i + shift] | 0) + carry;
          carry = w >> 26;
          this.words[i + shift] = w & 0x3ffffff;
        }

        if (carry === 0) return this.strip();

        // Subtraction overflow
        assert(carry === -1);
        carry = 0;
        for (i = 0; i < this.length; i++) {
          w = -(this.words[i] | 0) + carry;
          carry = w >> 26;
          this.words[i] = w & 0x3ffffff;
        }
        this.negative = 1;

        return this.strip();
      };

      BN.prototype._wordDiv = function _wordDiv (num, mode) {
        var shift = this.length - num.length;

        var a = this.clone();
        var b = num;

        // Normalize
        var bhi = b.words[b.length - 1] | 0;
        var bhiBits = this._countBits(bhi);
        shift = 26 - bhiBits;
        if (shift !== 0) {
          b = b.ushln(shift);
          a.iushln(shift);
          bhi = b.words[b.length - 1] | 0;
        }

        // Initialize quotient
        var m = a.length - b.length;
        var q;

        if (mode !== 'mod') {
          q = new BN(null);
          q.length = m + 1;
          q.words = new Array(q.length);
          for (var i = 0; i < q.length; i++) {
            q.words[i] = 0;
          }
        }

        var diff = a.clone()._ishlnsubmul(b, 1, m);
        if (diff.negative === 0) {
          a = diff;
          if (q) {
            q.words[m] = 1;
          }
        }

        for (var j = m - 1; j >= 0; j--) {
          var qj = (a.words[b.length + j] | 0) * 0x4000000 +
            (a.words[b.length + j - 1] | 0);

          // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
          // (0x7ffffff)
          qj = Math.min((qj / bhi) | 0, 0x3ffffff);

          a._ishlnsubmul(b, qj, j);
          while (a.negative !== 0) {
            qj--;
            a.negative = 0;
            a._ishlnsubmul(b, 1, j);
            if (!a.isZero()) {
              a.negative ^= 1;
            }
          }
          if (q) {
            q.words[j] = qj;
          }
        }
        if (q) {
          q.strip();
        }
        a.strip();

        // Denormalize
        if (mode !== 'div' && shift !== 0) {
          a.iushrn(shift);
        }

        return {
          div: q || null,
          mod: a
        };
      };

      // NOTE: 1) `mode` can be set to `mod` to request mod only,
      //       to `div` to request div only, or be absent to
      //       request both div & mod
      //       2) `positive` is true if unsigned mod is requested
      BN.prototype.divmod = function divmod (num, mode, positive) {
        assert(!num.isZero());

        if (this.isZero()) {
          return {
            div: new BN(0),
            mod: new BN(0)
          };
        }

        var div, mod, res;
        if (this.negative !== 0 && num.negative === 0) {
          res = this.neg().divmod(num, mode);

          if (mode !== 'mod') {
            div = res.div.neg();
          }

          if (mode !== 'div') {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.iadd(num);
            }
          }

          return {
            div: div,
            mod: mod
          };
        }

        if (this.negative === 0 && num.negative !== 0) {
          res = this.divmod(num.neg(), mode);

          if (mode !== 'mod') {
            div = res.div.neg();
          }

          return {
            div: div,
            mod: res.mod
          };
        }

        if ((this.negative & num.negative) !== 0) {
          res = this.neg().divmod(num.neg(), mode);

          if (mode !== 'div') {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.isub(num);
            }
          }

          return {
            div: res.div,
            mod: mod
          };
        }

        // Both numbers are positive at this point

        // Strip both numbers to approximate shift value
        if (num.length > this.length || this.cmp(num) < 0) {
          return {
            div: new BN(0),
            mod: this
          };
        }

        // Very short reduction
        if (num.length === 1) {
          if (mode === 'div') {
            return {
              div: this.divn(num.words[0]),
              mod: null
            };
          }

          if (mode === 'mod') {
            return {
              div: null,
              mod: new BN(this.modn(num.words[0]))
            };
          }

          return {
            div: this.divn(num.words[0]),
            mod: new BN(this.modn(num.words[0]))
          };
        }

        return this._wordDiv(num, mode);
      };

      // Find `this` / `num`
      BN.prototype.div = function div (num) {
        return this.divmod(num, 'div', false).div;
      };

      // Find `this` % `num`
      BN.prototype.mod = function mod (num) {
        return this.divmod(num, 'mod', false).mod;
      };

      BN.prototype.umod = function umod (num) {
        return this.divmod(num, 'mod', true).mod;
      };

      // Find Round(`this` / `num`)
      BN.prototype.divRound = function divRound (num) {
        var dm = this.divmod(num);

        // Fast case - exact division
        if (dm.mod.isZero()) return dm.div;

        var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

        var half = num.ushrn(1);
        var r2 = num.andln(1);
        var cmp = mod.cmp(half);

        // Round down
        if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

        // Round up
        return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
      };

      BN.prototype.modn = function modn (num) {
        assert(num <= 0x3ffffff);
        var p = (1 << 26) % num;

        var acc = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          acc = (p * acc + (this.words[i] | 0)) % num;
        }

        return acc;
      };

      // In-place division by number
      BN.prototype.idivn = function idivn (num) {
        assert(num <= 0x3ffffff);

        var carry = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var w = (this.words[i] | 0) + carry * 0x4000000;
          this.words[i] = (w / num) | 0;
          carry = w % num;
        }

        return this.strip();
      };

      BN.prototype.divn = function divn (num) {
        return this.clone().idivn(num);
      };

      BN.prototype.egcd = function egcd (p) {
        assert(p.negative === 0);
        assert(!p.isZero());

        var x = this;
        var y = p.clone();

        if (x.negative !== 0) {
          x = x.umod(p);
        } else {
          x = x.clone();
        }

        // A * x + B * y = x
        var A = new BN(1);
        var B = new BN(0);

        // C * x + D * y = y
        var C = new BN(0);
        var D = new BN(1);

        var g = 0;

        while (x.isEven() && y.isEven()) {
          x.iushrn(1);
          y.iushrn(1);
          ++g;
        }

        var yp = y.clone();
        var xp = x.clone();

        while (!x.isZero()) {
          for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
          if (i > 0) {
            x.iushrn(i);
            while (i-- > 0) {
              if (A.isOdd() || B.isOdd()) {
                A.iadd(yp);
                B.isub(xp);
              }

              A.iushrn(1);
              B.iushrn(1);
            }
          }

          for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
          if (j > 0) {
            y.iushrn(j);
            while (j-- > 0) {
              if (C.isOdd() || D.isOdd()) {
                C.iadd(yp);
                D.isub(xp);
              }

              C.iushrn(1);
              D.iushrn(1);
            }
          }

          if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
          } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
          }
        }

        return {
          a: C,
          b: D,
          gcd: y.iushln(g)
        };
      };

      // This is reduced incarnation of the binary EEA
      // above, designated to invert members of the
      // _prime_ fields F(p) at a maximal speed
      BN.prototype._invmp = function _invmp (p) {
        assert(p.negative === 0);
        assert(!p.isZero());

        var a = this;
        var b = p.clone();

        if (a.negative !== 0) {
          a = a.umod(p);
        } else {
          a = a.clone();
        }

        var x1 = new BN(1);
        var x2 = new BN(0);

        var delta = b.clone();

        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
          for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
          if (i > 0) {
            a.iushrn(i);
            while (i-- > 0) {
              if (x1.isOdd()) {
                x1.iadd(delta);
              }

              x1.iushrn(1);
            }
          }

          for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
          if (j > 0) {
            b.iushrn(j);
            while (j-- > 0) {
              if (x2.isOdd()) {
                x2.iadd(delta);
              }

              x2.iushrn(1);
            }
          }

          if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
          } else {
            b.isub(a);
            x2.isub(x1);
          }
        }

        var res;
        if (a.cmpn(1) === 0) {
          res = x1;
        } else {
          res = x2;
        }

        if (res.cmpn(0) < 0) {
          res.iadd(p);
        }

        return res;
      };

      BN.prototype.gcd = function gcd (num) {
        if (this.isZero()) return num.abs();
        if (num.isZero()) return this.abs();

        var a = this.clone();
        var b = num.clone();
        a.negative = 0;
        b.negative = 0;

        // Remove common factor of two
        for (var shift = 0; a.isEven() && b.isEven(); shift++) {
          a.iushrn(1);
          b.iushrn(1);
        }

        do {
          while (a.isEven()) {
            a.iushrn(1);
          }
          while (b.isEven()) {
            b.iushrn(1);
          }

          var r = a.cmp(b);
          if (r < 0) {
            // Swap `a` and `b` to make `a` always bigger than `b`
            var t = a;
            a = b;
            b = t;
          } else if (r === 0 || b.cmpn(1) === 0) {
            break;
          }

          a.isub(b);
        } while (true);

        return b.iushln(shift);
      };

      // Invert number in the field F(num)
      BN.prototype.invm = function invm (num) {
        return this.egcd(num).a.umod(num);
      };

      BN.prototype.isEven = function isEven () {
        return (this.words[0] & 1) === 0;
      };

      BN.prototype.isOdd = function isOdd () {
        return (this.words[0] & 1) === 1;
      };

      // And first word and num
      BN.prototype.andln = function andln (num) {
        return this.words[0] & num;
      };

      // Increment at the bit position in-line
      BN.prototype.bincn = function bincn (bit) {
        assert(typeof bit === 'number');
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;

        // Fast case: bit is much higher than all existing words
        if (this.length <= s) {
          this._expand(s + 1);
          this.words[s] |= q;
          return this;
        }

        // Add bit and propagate, if needed
        var carry = q;
        for (var i = s; carry !== 0 && i < this.length; i++) {
          var w = this.words[i] | 0;
          w += carry;
          carry = w >>> 26;
          w &= 0x3ffffff;
          this.words[i] = w;
        }
        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }
        return this;
      };

      BN.prototype.isZero = function isZero () {
        return this.length === 1 && this.words[0] === 0;
      };

      BN.prototype.cmpn = function cmpn (num) {
        var negative = num < 0;

        if (this.negative !== 0 && !negative) return -1;
        if (this.negative === 0 && negative) return 1;

        this.strip();

        var res;
        if (this.length > 1) {
          res = 1;
        } else {
          if (negative) {
            num = -num;
          }

          assert(num <= 0x3ffffff, 'Number is too big');

          var w = this.words[0] | 0;
          res = w === num ? 0 : w < num ? -1 : 1;
        }
        if (this.negative !== 0) return -res | 0;
        return res;
      };

      // Compare two numbers and return:
      // 1 - if `this` > `num`
      // 0 - if `this` == `num`
      // -1 - if `this` < `num`
      BN.prototype.cmp = function cmp (num) {
        if (this.negative !== 0 && num.negative === 0) return -1;
        if (this.negative === 0 && num.negative !== 0) return 1;

        var res = this.ucmp(num);
        if (this.negative !== 0) return -res | 0;
        return res;
      };

      // Unsigned comparison
      BN.prototype.ucmp = function ucmp (num) {
        // At this point both numbers have the same sign
        if (this.length > num.length) return 1;
        if (this.length < num.length) return -1;

        var res = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var a = this.words[i] | 0;
          var b = num.words[i] | 0;

          if (a === b) continue;
          if (a < b) {
            res = -1;
          } else if (a > b) {
            res = 1;
          }
          break;
        }
        return res;
      };

      BN.prototype.gtn = function gtn (num) {
        return this.cmpn(num) === 1;
      };

      BN.prototype.gt = function gt (num) {
        return this.cmp(num) === 1;
      };

      BN.prototype.gten = function gten (num) {
        return this.cmpn(num) >= 0;
      };

      BN.prototype.gte = function gte (num) {
        return this.cmp(num) >= 0;
      };

      BN.prototype.ltn = function ltn (num) {
        return this.cmpn(num) === -1;
      };

      BN.prototype.lt = function lt (num) {
        return this.cmp(num) === -1;
      };

      BN.prototype.lten = function lten (num) {
        return this.cmpn(num) <= 0;
      };

      BN.prototype.lte = function lte (num) {
        return this.cmp(num) <= 0;
      };

      BN.prototype.eqn = function eqn (num) {
        return this.cmpn(num) === 0;
      };

      BN.prototype.eq = function eq (num) {
        return this.cmp(num) === 0;
      };

      //
      // A reduce context, could be using montgomery or something better, depending
      // on the `m` itself.
      //
      BN.red = function red (num) {
        return new Red(num);
      };

      BN.prototype.toRed = function toRed (ctx) {
        assert(!this.red, 'Already a number in reduction context');
        assert(this.negative === 0, 'red works only with positives');
        return ctx.convertTo(this)._forceRed(ctx);
      };

      BN.prototype.fromRed = function fromRed () {
        assert(this.red, 'fromRed works only with numbers in reduction context');
        return this.red.convertFrom(this);
      };

      BN.prototype._forceRed = function _forceRed (ctx) {
        this.red = ctx;
        return this;
      };

      BN.prototype.forceRed = function forceRed (ctx) {
        assert(!this.red, 'Already a number in reduction context');
        return this._forceRed(ctx);
      };

      BN.prototype.redAdd = function redAdd (num) {
        assert(this.red, 'redAdd works only with red numbers');
        return this.red.add(this, num);
      };

      BN.prototype.redIAdd = function redIAdd (num) {
        assert(this.red, 'redIAdd works only with red numbers');
        return this.red.iadd(this, num);
      };

      BN.prototype.redSub = function redSub (num) {
        assert(this.red, 'redSub works only with red numbers');
        return this.red.sub(this, num);
      };

      BN.prototype.redISub = function redISub (num) {
        assert(this.red, 'redISub works only with red numbers');
        return this.red.isub(this, num);
      };

      BN.prototype.redShl = function redShl (num) {
        assert(this.red, 'redShl works only with red numbers');
        return this.red.shl(this, num);
      };

      BN.prototype.redMul = function redMul (num) {
        assert(this.red, 'redMul works only with red numbers');
        this.red._verify2(this, num);
        return this.red.mul(this, num);
      };

      BN.prototype.redIMul = function redIMul (num) {
        assert(this.red, 'redMul works only with red numbers');
        this.red._verify2(this, num);
        return this.red.imul(this, num);
      };

      BN.prototype.redSqr = function redSqr () {
        assert(this.red, 'redSqr works only with red numbers');
        this.red._verify1(this);
        return this.red.sqr(this);
      };

      BN.prototype.redISqr = function redISqr () {
        assert(this.red, 'redISqr works only with red numbers');
        this.red._verify1(this);
        return this.red.isqr(this);
      };

      // Square root over p
      BN.prototype.redSqrt = function redSqrt () {
        assert(this.red, 'redSqrt works only with red numbers');
        this.red._verify1(this);
        return this.red.sqrt(this);
      };

      BN.prototype.redInvm = function redInvm () {
        assert(this.red, 'redInvm works only with red numbers');
        this.red._verify1(this);
        return this.red.invm(this);
      };

      // Return negative clone of `this` % `red modulo`
      BN.prototype.redNeg = function redNeg () {
        assert(this.red, 'redNeg works only with red numbers');
        this.red._verify1(this);
        return this.red.neg(this);
      };

      BN.prototype.redPow = function redPow (num) {
        assert(this.red && !num.red, 'redPow(normalNum)');
        this.red._verify1(this);
        return this.red.pow(this, num);
      };

      // Prime numbers with efficient reduction
      var primes = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      };

      // Pseudo-Mersenne prime
      function MPrime (name, p) {
        // P = 2 ^ N - K
        this.name = name;
        this.p = new BN(p, 16);
        this.n = this.p.bitLength();
        this.k = new BN(1).iushln(this.n).isub(this.p);

        this.tmp = this._tmp();
      }

      MPrime.prototype._tmp = function _tmp () {
        var tmp = new BN(null);
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
      };

      MPrime.prototype.ireduce = function ireduce (num) {
        // Assumes that `num` is less than `P^2`
        // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
        var r = num;
        var rlen;

        do {
          this.split(r, this.tmp);
          r = this.imulK(r);
          r = r.iadd(this.tmp);
          rlen = r.bitLength();
        } while (rlen > this.n);

        var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
        if (cmp === 0) {
          r.words[0] = 0;
          r.length = 1;
        } else if (cmp > 0) {
          r.isub(this.p);
        } else {
          r.strip();
        }

        return r;
      };

      MPrime.prototype.split = function split (input, out) {
        input.iushrn(this.n, 0, out);
      };

      MPrime.prototype.imulK = function imulK (num) {
        return num.imul(this.k);
      };

      function K256 () {
        MPrime.call(
          this,
          'k256',
          'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
      }
      inherits(K256, MPrime);

      K256.prototype.split = function split (input, output) {
        // 256 = 9 * 26 + 22
        var mask = 0x3fffff;

        var outLen = Math.min(input.length, 9);
        for (var i = 0; i < outLen; i++) {
          output.words[i] = input.words[i];
        }
        output.length = outLen;

        if (input.length <= 9) {
          input.words[0] = 0;
          input.length = 1;
          return;
        }

        // Shift by 9 limbs
        var prev = input.words[9];
        output.words[output.length++] = prev & mask;

        for (i = 10; i < input.length; i++) {
          var next = input.words[i] | 0;
          input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
          prev = next;
        }
        prev >>>= 22;
        input.words[i - 10] = prev;
        if (prev === 0 && input.length > 10) {
          input.length -= 10;
        } else {
          input.length -= 9;
        }
      };

      K256.prototype.imulK = function imulK (num) {
        // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2;

        // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
        var lo = 0;
        for (var i = 0; i < num.length; i++) {
          var w = num.words[i] | 0;
          lo += w * 0x3d1;
          num.words[i] = lo & 0x3ffffff;
          lo = w * 0x40 + ((lo / 0x4000000) | 0);
        }

        // Fast length reduction
        if (num.words[num.length - 1] === 0) {
          num.length--;
          if (num.words[num.length - 1] === 0) {
            num.length--;
          }
        }
        return num;
      };

      function P224 () {
        MPrime.call(
          this,
          'p224',
          'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
      }
      inherits(P224, MPrime);

      function P192 () {
        MPrime.call(
          this,
          'p192',
          'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
      }
      inherits(P192, MPrime);

      function P25519 () {
        // 2 ^ 255 - 19
        MPrime.call(
          this,
          '25519',
          '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
      }
      inherits(P25519, MPrime);

      P25519.prototype.imulK = function imulK (num) {
        // K = 0x13
        var carry = 0;
        for (var i = 0; i < num.length; i++) {
          var hi = (num.words[i] | 0) * 0x13 + carry;
          var lo = hi & 0x3ffffff;
          hi >>>= 26;

          num.words[i] = lo;
          carry = hi;
        }
        if (carry !== 0) {
          num.words[num.length++] = carry;
        }
        return num;
      };

      // Exported mostly for testing purposes, use plain name instead
      BN._prime = function prime (name) {
        // Cached version of prime
        if (primes[name]) return primes[name];

        var prime;
        if (name === 'k256') {
          prime = new K256();
        } else if (name === 'p224') {
          prime = new P224();
        } else if (name === 'p192') {
          prime = new P192();
        } else if (name === 'p25519') {
          prime = new P25519();
        } else {
          throw new Error('Unknown prime ' + name);
        }
        primes[name] = prime;

        return prime;
      };

      //
      // Base reduction engine
      //
      function Red (m) {
        if (typeof m === 'string') {
          var prime = BN._prime(m);
          this.m = prime.p;
          this.prime = prime;
        } else {
          assert(m.gtn(1), 'modulus must be greater than 1');
          this.m = m;
          this.prime = null;
        }
      }

      Red.prototype._verify1 = function _verify1 (a) {
        assert(a.negative === 0, 'red works only with positives');
        assert(a.red, 'red works only with red numbers');
      };

      Red.prototype._verify2 = function _verify2 (a, b) {
        assert((a.negative | b.negative) === 0, 'red works only with positives');
        assert(a.red && a.red === b.red,
          'red works only with red numbers');
      };

      Red.prototype.imod = function imod (a) {
        if (this.prime) return this.prime.ireduce(a)._forceRed(this);
        return a.umod(this.m)._forceRed(this);
      };

      Red.prototype.neg = function neg (a) {
        if (a.isZero()) {
          return a.clone();
        }

        return this.m.sub(a)._forceRed(this);
      };

      Red.prototype.add = function add (a, b) {
        this._verify2(a, b);

        var res = a.add(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res._forceRed(this);
      };

      Red.prototype.iadd = function iadd (a, b) {
        this._verify2(a, b);

        var res = a.iadd(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res;
      };

      Red.prototype.sub = function sub (a, b) {
        this._verify2(a, b);

        var res = a.sub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res._forceRed(this);
      };

      Red.prototype.isub = function isub (a, b) {
        this._verify2(a, b);

        var res = a.isub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res;
      };

      Red.prototype.shl = function shl (a, num) {
        this._verify1(a);
        return this.imod(a.ushln(num));
      };

      Red.prototype.imul = function imul (a, b) {
        this._verify2(a, b);
        return this.imod(a.imul(b));
      };

      Red.prototype.mul = function mul (a, b) {
        this._verify2(a, b);
        return this.imod(a.mul(b));
      };

      Red.prototype.isqr = function isqr (a) {
        return this.imul(a, a.clone());
      };

      Red.prototype.sqr = function sqr (a) {
        return this.mul(a, a);
      };

      Red.prototype.sqrt = function sqrt (a) {
        if (a.isZero()) return a.clone();

        var mod3 = this.m.andln(3);
        assert(mod3 % 2 === 1);

        // Fast case
        if (mod3 === 3) {
          var pow = this.m.add(new BN(1)).iushrn(2);
          return this.pow(a, pow);
        }

        // Tonelli-Shanks algorithm (Totally unoptimized and slow)
        //
        // Find Q and S, that Q * 2 ^ S = (P - 1)
        var q = this.m.subn(1);
        var s = 0;
        while (!q.isZero() && q.andln(1) === 0) {
          s++;
          q.iushrn(1);
        }
        assert(!q.isZero());

        var one = new BN(1).toRed(this);
        var nOne = one.redNeg();

        // Find quadratic non-residue
        // NOTE: Max is such because of generalized Riemann hypothesis.
        var lpow = this.m.subn(1).iushrn(1);
        var z = this.m.bitLength();
        z = new BN(2 * z * z).toRed(this);

        while (this.pow(z, lpow).cmp(nOne) !== 0) {
          z.redIAdd(nOne);
        }

        var c = this.pow(z, q);
        var r = this.pow(a, q.addn(1).iushrn(1));
        var t = this.pow(a, q);
        var m = s;
        while (t.cmp(one) !== 0) {
          var tmp = t;
          for (var i = 0; tmp.cmp(one) !== 0; i++) {
            tmp = tmp.redSqr();
          }
          assert(i < m);
          var b = this.pow(c, new BN(1).iushln(m - i - 1));

          r = r.redMul(b);
          c = b.redSqr();
          t = t.redMul(c);
          m = i;
        }

        return r;
      };

      Red.prototype.invm = function invm (a) {
        var inv = a._invmp(this.m);
        if (inv.negative !== 0) {
          inv.negative = 0;
          return this.imod(inv).redNeg();
        } else {
          return this.imod(inv);
        }
      };

      Red.prototype.pow = function pow (a, num) {
        if (num.isZero()) return new BN(1).toRed(this);
        if (num.cmpn(1) === 0) return a.clone();

        var windowSize = 4;
        var wnd = new Array(1 << windowSize);
        wnd[0] = new BN(1).toRed(this);
        wnd[1] = a;
        for (var i = 2; i < wnd.length; i++) {
          wnd[i] = this.mul(wnd[i - 1], a);
        }

        var res = wnd[0];
        var current = 0;
        var currentLen = 0;
        var start = num.bitLength() % 26;
        if (start === 0) {
          start = 26;
        }

        for (i = num.length - 1; i >= 0; i--) {
          var word = num.words[i];
          for (var j = start - 1; j >= 0; j--) {
            var bit = (word >> j) & 1;
            if (res !== wnd[0]) {
              res = this.sqr(res);
            }

            if (bit === 0 && current === 0) {
              currentLen = 0;
              continue;
            }

            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
          }
          start = 26;
        }

        return res;
      };

      Red.prototype.convertTo = function convertTo (num) {
        var r = num.umod(this.m);

        return r === num ? r.clone() : r;
      };

      Red.prototype.convertFrom = function convertFrom (num) {
        var res = num.clone();
        res.red = null;
        return res;
      };

      //
      // Montgomery method engine
      //

      BN.mont = function mont (num) {
        return new Mont(num);
      };

      function Mont (m) {
        Red.call(this, m);

        this.shift = this.m.bitLength();
        if (this.shift % 26 !== 0) {
          this.shift += 26 - (this.shift % 26);
        }

        this.r = new BN(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);

        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
      }
      inherits(Mont, Red);

      Mont.prototype.convertTo = function convertTo (num) {
        return this.imod(num.ushln(this.shift));
      };

      Mont.prototype.convertFrom = function convertFrom (num) {
        var r = this.imod(num.mul(this.rinv));
        r.red = null;
        return r;
      };

      Mont.prototype.imul = function imul (a, b) {
        if (a.isZero() || b.isZero()) {
          a.words[0] = 0;
          a.length = 1;
          return a;
        }

        var t = a.imul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;

        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }

        return res._forceRed(this);
      };

      Mont.prototype.mul = function mul (a, b) {
        if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

        var t = a.mul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }

        return res._forceRed(this);
      };

      Mont.prototype.invm = function invm (a) {
        // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
        var res = this.imod(a._invmp(this.m).mul(this.r2));
        return res._forceRed(this);
      };
    })(typeof module === 'undefined' || module, this);

  },{}],4:[function(require,module,exports){
    var r;

    module.exports = function rand(len) {
      if (!r)
        r = new Rand(null);

      return r.generate(len);
    };

    function Rand(rand) {
      this.rand = rand;
    }
    module.exports.Rand = Rand;

    Rand.prototype.generate = function generate(len) {
      return this._rand(len);
    };

// Emulate crypto API using randy
    Rand.prototype._rand = function _rand(n) {
      if (this.rand.getBytes)
        return this.rand.getBytes(n);

      var res = new Uint8Array(n);
      for (var i = 0; i < res.length; i++)
        res[i] = this.rand.getByte();
      return res;
    };

    if (typeof self === 'object') {
      if (self.crypto && self.crypto.getRandomValues) {
        // Modern browsers
        Rand.prototype._rand = function _rand(n) {
          var arr = new Uint8Array(n);
          self.crypto.getRandomValues(arr);
          return arr;
        };
      } else if (self.msCrypto && self.msCrypto.getRandomValues) {
        // IE
        Rand.prototype._rand = function _rand(n) {
          var arr = new Uint8Array(n);
          self.msCrypto.getRandomValues(arr);
          return arr;
        };

        // Safari's WebWorkers do not have `crypto`
      } else if (typeof window === 'object') {
        // Old junk
        Rand.prototype._rand = function() {
          throw new Error('Not implemented yet');
        };
      }
    } else {
      // Node.js or Web worker with no crypto support
      try {
        var crypto = require('crypto');
        if (typeof crypto.randomBytes !== 'function')
          throw new Error('Not supported');

        Rand.prototype._rand = function _rand(n) {
          return crypto.randomBytes(n);
        };
      } catch (e) {
      }
    }

  },{"crypto":71}],5:[function(require,module,exports){
    var Buffer = require('safe-buffer').Buffer
    var Transform = require('stream').Transform
    var StringDecoder = require('string_decoder').StringDecoder
    var inherits = require('inherits')

    function CipherBase (hashMode) {
      Transform.call(this)
      this.hashMode = typeof hashMode === 'string'
      if (this.hashMode) {
        this[hashMode] = this._finalOrDigest
      } else {
        this.final = this._finalOrDigest
      }
      if (this._final) {
        this.__final = this._final
        this._final = null
      }
      this._decoder = null
      this._encoding = null
    }
    inherits(CipherBase, Transform)

    CipherBase.prototype.update = function (data, inputEnc, outputEnc) {
      if (typeof data === 'string') {
        data = Buffer.from(data, inputEnc)
      }

      var outData = this._update(data)
      if (this.hashMode) return this

      if (outputEnc) {
        outData = this._toString(outData, outputEnc)
      }

      return outData
    }

    CipherBase.prototype.setAutoPadding = function () {}
    CipherBase.prototype.getAuthTag = function () {
      throw new Error('trying to get auth tag in unsupported state')
    }

    CipherBase.prototype.setAuthTag = function () {
      throw new Error('trying to set auth tag in unsupported state')
    }

    CipherBase.prototype.setAAD = function () {
      throw new Error('trying to set aad in unsupported state')
    }

    CipherBase.prototype._transform = function (data, _, next) {
      var err
      try {
        if (this.hashMode) {
          this._update(data)
        } else {
          this.push(this._update(data))
        }
      } catch (e) {
        err = e
      } finally {
        next(err)
      }
    }
    CipherBase.prototype._flush = function (done) {
      var err
      try {
        this.push(this.__final())
      } catch (e) {
        err = e
      }

      done(err)
    }
    CipherBase.prototype._finalOrDigest = function (outputEnc) {
      var outData = this.__final() || Buffer.alloc(0)
      if (outputEnc) {
        outData = this._toString(outData, outputEnc, true)
      }
      return outData
    }

    CipherBase.prototype._toString = function (value, enc, fin) {
      if (!this._decoder) {
        this._decoder = new StringDecoder(enc)
        this._encoding = enc
      }

      if (this._encoding !== enc) throw new Error('can\'t switch encodings')

      var out = this._decoder.write(value)
      if (fin) {
        out += this._decoder.end()
      }

      return out
    }

    module.exports = CipherBase

  },{"inherits":41,"safe-buffer":53,"stream":95,"string_decoder":96}],6:[function(require,module,exports){
    (function (Buffer){
      'use strict'
      var inherits = require('inherits')
      var md5 = require('./md5')
      var RIPEMD160 = require('ripemd160')
      var sha = require('sha.js')

      var Base = require('cipher-base')

      function HashNoConstructor (hash) {
        Base.call(this, 'digest')

        this._hash = hash
        this.buffers = []
      }

      inherits(HashNoConstructor, Base)

      HashNoConstructor.prototype._update = function (data) {
        this.buffers.push(data)
      }

      HashNoConstructor.prototype._final = function () {
        var buf = Buffer.concat(this.buffers)
        var r = this._hash(buf)
        this.buffers = null

        return r
      }

      function Hash (hash) {
        Base.call(this, 'digest')

        this._hash = hash
      }

      inherits(Hash, Base)

      Hash.prototype._update = function (data) {
        this._hash.update(data)
      }

      Hash.prototype._final = function () {
        return this._hash.digest()
      }

      module.exports = function createHash (alg) {
        alg = alg.toLowerCase()
        if (alg === 'md5') return new HashNoConstructor(md5)
        if (alg === 'rmd160' || alg === 'ripemd160') return new Hash(new RIPEMD160())

        return new Hash(sha(alg))
      }

    }).call(this,require("buffer").Buffer)
  },{"./md5":8,"buffer":72,"cipher-base":5,"inherits":41,"ripemd160":51,"sha.js":61}],7:[function(require,module,exports){
    (function (Buffer){
      'use strict'
      var intSize = 4
      var zeroBuffer = new Buffer(intSize)
      zeroBuffer.fill(0)

      var charSize = 8
      var hashSize = 16

      function toArray (buf) {
        if ((buf.length % intSize) !== 0) {
          var len = buf.length + (intSize - (buf.length % intSize))
          buf = Buffer.concat([buf, zeroBuffer], len)
        }

        var arr = new Array(buf.length >>> 2)
        for (var i = 0, j = 0; i < buf.length; i += intSize, j++) {
          arr[j] = buf.readInt32LE(i)
        }

        return arr
      }

      module.exports = function hash (buf, fn) {
        var arr = fn(toArray(buf), buf.length * charSize)
        buf = new Buffer(hashSize)
        for (var i = 0; i < arr.length; i++) {
          buf.writeInt32LE(arr[i], i << 2, true)
        }
        return buf
      }

    }).call(this,require("buffer").Buffer)
  },{"buffer":72}],8:[function(require,module,exports){
    'use strict'
    /*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

    var makeHash = require('./make-hash')

    /*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
    function core_md5 (x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << ((len) % 32)
      x[(((len + 64) >>> 9) << 4) + 14] = len

      var a = 1732584193
      var b = -271733879
      var c = -1732584194
      var d = 271733878

      for (var i = 0; i < x.length; i += 16) {
        var olda = a
        var oldb = b
        var oldc = c
        var oldd = d

        a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936)
        d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586)
        c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819)
        b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330)
        a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897)
        d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426)
        c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341)
        b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983)
        a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416)
        d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417)
        c = md5_ff(c, d, a, b, x[i + 10], 17, -42063)
        b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162)
        a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682)
        d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101)
        c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290)
        b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329)

        a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510)
        d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632)
        c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713)
        b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302)
        a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691)
        d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083)
        c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335)
        b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848)
        a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438)
        d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690)
        c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961)
        b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501)
        a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467)
        d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784)
        c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473)
        b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734)

        a = md5_hh(a, b, c, d, x[i + 5], 4, -378558)
        d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463)
        c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562)
        b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556)
        a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060)
        d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353)
        c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632)
        b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640)
        a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174)
        d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222)
        c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979)
        b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189)
        a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487)
        d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835)
        c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520)
        b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651)

        a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844)
        d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415)
        c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905)
        b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055)
        a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571)
        d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606)
        c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523)
        b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799)
        a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359)
        d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744)
        c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380)
        b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649)
        a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070)
        d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379)
        c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259)
        b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551)

        a = safe_add(a, olda)
        b = safe_add(b, oldb)
        c = safe_add(c, oldc)
        d = safe_add(d, oldd)
      }

      return [a, b, c, d]
    }

    /*
 * These functions implement the four basic operations the algorithm uses.
 */
    function md5_cmn (q, a, b, x, s, t) {
      return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
    }

    function md5_ff (a, b, c, d, x, s, t) {
      return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t)
    }

    function md5_gg (a, b, c, d, x, s, t) {
      return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t)
    }

    function md5_hh (a, b, c, d, x, s, t) {
      return md5_cmn(b ^ c ^ d, a, b, x, s, t)
    }

    function md5_ii (a, b, c, d, x, s, t) {
      return md5_cmn(c ^ (b | (~d)), a, b, x, s, t)
    }

    /*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
    function safe_add (x, y) {
      var lsw = (x & 0xFFFF) + (y & 0xFFFF)
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
      return (msw << 16) | (lsw & 0xFFFF)
    }

    /*
 * Bitwise rotate a 32-bit number to the left.
 */
    function bit_rol (num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt))
    }

    module.exports = function md5 (buf) {
      return makeHash(buf, core_md5)
    }

  },{"./make-hash":7}],9:[function(require,module,exports){
    'use strict';

    var elliptic = exports;

    elliptic.version = require('../package.json').version;
    elliptic.utils = require('./elliptic/utils');
    elliptic.rand = require('brorand');
    elliptic.curve = require('./elliptic/curve');
    elliptic.curves = require('./elliptic/curves');

// Protocols
    elliptic.ec = require('./elliptic/ec');
    elliptic.eddsa = require('./elliptic/eddsa');

  },{"../package.json":24,"./elliptic/curve":12,"./elliptic/curves":15,"./elliptic/ec":16,"./elliptic/eddsa":19,"./elliptic/utils":23,"brorand":4}],10:[function(require,module,exports){
    'use strict';

    var BN = require('bn.js');
    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var getNAF = utils.getNAF;
    var getJSF = utils.getJSF;
    var assert = utils.assert;

    function BaseCurve(type, conf) {
      this.type = type;
      this.p = new BN(conf.p, 16);

      // Use Montgomery, when there is no fast reduction for the prime
      this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);

      // Useful for many curves
      this.zero = new BN(0).toRed(this.red);
      this.one = new BN(1).toRed(this.red);
      this.two = new BN(2).toRed(this.red);

      // Curve configuration, optional
      this.n = conf.n && new BN(conf.n, 16);
      this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);

      // Temporary arrays
      this._wnafT1 = new Array(4);
      this._wnafT2 = new Array(4);
      this._wnafT3 = new Array(4);
      this._wnafT4 = new Array(4);

      // Generalized Greg Maxwell's trick
      var adjustCount = this.n && this.p.div(this.n);
      if (!adjustCount || adjustCount.cmpn(100) > 0) {
        this.redN = null;
      } else {
        this._maxwellTrick = true;
        this.redN = this.n.toRed(this.red);
      }
    }
    module.exports = BaseCurve;

    BaseCurve.prototype.point = function point() {
      throw new Error('Not implemented');
    };

    BaseCurve.prototype.validate = function validate() {
      throw new Error('Not implemented');
    };

    BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
      assert(p.precomputed);
      var doubles = p._getDoubles();

      var naf = getNAF(k, 1);
      var I = (1 << (doubles.step + 1)) - (doubles.step % 2 === 0 ? 2 : 1);
      I /= 3;

      // Translate into more windowed form
      var repr = [];
      for (var j = 0; j < naf.length; j += doubles.step) {
        var nafW = 0;
        for (var k = j + doubles.step - 1; k >= j; k--)
          nafW = (nafW << 1) + naf[k];
        repr.push(nafW);
      }

      var a = this.jpoint(null, null, null);
      var b = this.jpoint(null, null, null);
      for (var i = I; i > 0; i--) {
        for (var j = 0; j < repr.length; j++) {
          var nafW = repr[j];
          if (nafW === i)
            b = b.mixedAdd(doubles.points[j]);
          else if (nafW === -i)
            b = b.mixedAdd(doubles.points[j].neg());
        }
        a = a.add(b);
      }
      return a.toP();
    };

    BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
      var w = 4;

      // Precompute window
      var nafPoints = p._getNAFPoints(w);
      w = nafPoints.wnd;
      var wnd = nafPoints.points;

      // Get NAF form
      var naf = getNAF(k, w);

      // Add `this`*(N+1) for every w-NAF index
      var acc = this.jpoint(null, null, null);
      for (var i = naf.length - 1; i >= 0; i--) {
        // Count zeroes
        for (var k = 0; i >= 0 && naf[i] === 0; i--)
          k++;
        if (i >= 0)
          k++;
        acc = acc.dblp(k);

        if (i < 0)
          break;
        var z = naf[i];
        assert(z !== 0);
        if (p.type === 'affine') {
          // J +- P
          if (z > 0)
            acc = acc.mixedAdd(wnd[(z - 1) >> 1]);
          else
            acc = acc.mixedAdd(wnd[(-z - 1) >> 1].neg());
        } else {
          // J +- J
          if (z > 0)
            acc = acc.add(wnd[(z - 1) >> 1]);
          else
            acc = acc.add(wnd[(-z - 1) >> 1].neg());
        }
      }
      return p.type === 'affine' ? acc.toP() : acc;
    };

    BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW,
                                                           points,
                                                           coeffs,
                                                           len,
                                                           jacobianResult) {
      var wndWidth = this._wnafT1;
      var wnd = this._wnafT2;
      var naf = this._wnafT3;

      // Fill all arrays
      var max = 0;
      for (var i = 0; i < len; i++) {
        var p = points[i];
        var nafPoints = p._getNAFPoints(defW);
        wndWidth[i] = nafPoints.wnd;
        wnd[i] = nafPoints.points;
      }

      // Comb small window NAFs
      for (var i = len - 1; i >= 1; i -= 2) {
        var a = i - 1;
        var b = i;
        if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
          naf[a] = getNAF(coeffs[a], wndWidth[a]);
          naf[b] = getNAF(coeffs[b], wndWidth[b]);
          max = Math.max(naf[a].length, max);
          max = Math.max(naf[b].length, max);
          continue;
        }

        var comb = [
          points[a], /* 1 */
          null, /* 3 */
          null, /* 5 */
          points[b] /* 7 */
        ];

        // Try to avoid Projective points, if possible
        if (points[a].y.cmp(points[b].y) === 0) {
          comb[1] = points[a].add(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].add(points[b].neg());
        } else {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        }

        var index = [
          -3, /* -1 -1 */
          -1, /* -1 0 */
          -5, /* -1 1 */
          -7, /* 0 -1 */
          0, /* 0 0 */
          7, /* 0 1 */
          5, /* 1 -1 */
          1, /* 1 0 */
          3  /* 1 1 */
        ];

        var jsf = getJSF(coeffs[a], coeffs[b]);
        max = Math.max(jsf[0].length, max);
        naf[a] = new Array(max);
        naf[b] = new Array(max);
        for (var j = 0; j < max; j++) {
          var ja = jsf[0][j] | 0;
          var jb = jsf[1][j] | 0;

          naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
          naf[b][j] = 0;
          wnd[a] = comb;
        }
      }

      var acc = this.jpoint(null, null, null);
      var tmp = this._wnafT4;
      for (var i = max; i >= 0; i--) {
        var k = 0;

        while (i >= 0) {
          var zero = true;
          for (var j = 0; j < len; j++) {
            tmp[j] = naf[j][i] | 0;
            if (tmp[j] !== 0)
              zero = false;
          }
          if (!zero)
            break;
          k++;
          i--;
        }
        if (i >= 0)
          k++;
        acc = acc.dblp(k);
        if (i < 0)
          break;

        for (var j = 0; j < len; j++) {
          var z = tmp[j];
          var p;
          if (z === 0)
            continue;
          else if (z > 0)
            p = wnd[j][(z - 1) >> 1];
          else if (z < 0)
            p = wnd[j][(-z - 1) >> 1].neg();

          if (p.type === 'affine')
            acc = acc.mixedAdd(p);
          else
            acc = acc.add(p);
        }
      }
      // Zeroify references
      for (var i = 0; i < len; i++)
        wnd[i] = null;

      if (jacobianResult)
        return acc;
      else
        return acc.toP();
    };

    function BasePoint(curve, type) {
      this.curve = curve;
      this.type = type;
      this.precomputed = null;
    }
    BaseCurve.BasePoint = BasePoint;

    BasePoint.prototype.eq = function eq(/*other*/) {
      throw new Error('Not implemented');
    };

    BasePoint.prototype.validate = function validate() {
      return this.curve.validate(this);
    };

    BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      bytes = utils.toArray(bytes, enc);

      var len = this.p.byteLength();

      // uncompressed, hybrid-odd, hybrid-even
      if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) &&
        bytes.length - 1 === 2 * len) {
        if (bytes[0] === 0x06)
          assert(bytes[bytes.length - 1] % 2 === 0);
        else if (bytes[0] === 0x07)
          assert(bytes[bytes.length - 1] % 2 === 1);

        var res =  this.point(bytes.slice(1, 1 + len),
          bytes.slice(1 + len, 1 + 2 * len));

        return res;
      } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) &&
        bytes.length - 1 === len) {
        return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
      }
      throw new Error('Unknown point format');
    };

    BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
      return this.encode(enc, true);
    };

    BasePoint.prototype._encode = function _encode(compact) {
      var len = this.curve.p.byteLength();
      var x = this.getX().toArray('be', len);

      if (compact)
        return [ this.getY().isEven() ? 0x02 : 0x03 ].concat(x);

      return [ 0x04 ].concat(x, this.getY().toArray('be', len)) ;
    };

    BasePoint.prototype.encode = function encode(enc, compact) {
      return utils.encode(this._encode(compact), enc);
    };

    BasePoint.prototype.precompute = function precompute(power) {
      if (this.precomputed)
        return this;

      var precomputed = {
        doubles: null,
        naf: null,
        beta: null
      };
      precomputed.naf = this._getNAFPoints(8);
      precomputed.doubles = this._getDoubles(4, power);
      precomputed.beta = this._getBeta();
      this.precomputed = precomputed;

      return this;
    };

    BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
      if (!this.precomputed)
        return false;

      var doubles = this.precomputed.doubles;
      if (!doubles)
        return false;

      return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
    };

    BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
      if (this.precomputed && this.precomputed.doubles)
        return this.precomputed.doubles;

      var doubles = [ this ];
      var acc = this;
      for (var i = 0; i < power; i += step) {
        for (var j = 0; j < step; j++)
          acc = acc.dbl();
        doubles.push(acc);
      }
      return {
        step: step,
        points: doubles
      };
    };

    BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
      if (this.precomputed && this.precomputed.naf)
        return this.precomputed.naf;

      var res = [ this ];
      var max = (1 << wnd) - 1;
      var dbl = max === 1 ? null : this.dbl();
      for (var i = 1; i < max; i++)
        res[i] = res[i - 1].add(dbl);
      return {
        wnd: wnd,
        points: res
      };
    };

    BasePoint.prototype._getBeta = function _getBeta() {
      return null;
    };

    BasePoint.prototype.dblp = function dblp(k) {
      var r = this;
      for (var i = 0; i < k; i++)
        r = r.dbl();
      return r;
    };

  },{"../../elliptic":9,"bn.js":3}],11:[function(require,module,exports){
    'use strict';

    var curve = require('../curve');
    var elliptic = require('../../elliptic');
    var BN = require('bn.js');
    var inherits = require('inherits');
    var Base = curve.base;

    var assert = elliptic.utils.assert;

    function EdwardsCurve(conf) {
      // NOTE: Important as we are creating point in Base.call()
      this.twisted = (conf.a | 0) !== 1;
      this.mOneA = this.twisted && (conf.a | 0) === -1;
      this.extended = this.mOneA;

      Base.call(this, 'edwards', conf);

      this.a = new BN(conf.a, 16).umod(this.red.m);
      this.a = this.a.toRed(this.red);
      this.c = new BN(conf.c, 16).toRed(this.red);
      this.c2 = this.c.redSqr();
      this.d = new BN(conf.d, 16).toRed(this.red);
      this.dd = this.d.redAdd(this.d);

      assert(!this.twisted || this.c.fromRed().cmpn(1) === 0);
      this.oneC = (conf.c | 0) === 1;
    }
    inherits(EdwardsCurve, Base);
    module.exports = EdwardsCurve;

    EdwardsCurve.prototype._mulA = function _mulA(num) {
      if (this.mOneA)
        return num.redNeg();
      else
        return this.a.redMul(num);
    };

    EdwardsCurve.prototype._mulC = function _mulC(num) {
      if (this.oneC)
        return num;
      else
        return this.c.redMul(num);
    };

// Just for compatibility with Short curve
    EdwardsCurve.prototype.jpoint = function jpoint(x, y, z, t) {
      return this.point(x, y, z, t);
    };

    EdwardsCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new BN(x, 16);
      if (!x.red)
        x = x.toRed(this.red);

      var x2 = x.redSqr();
      var rhs = this.c2.redSub(this.a.redMul(x2));
      var lhs = this.one.redSub(this.c2.redMul(this.d).redMul(x2));

      var y2 = rhs.redMul(lhs.redInvm());
      var y = y2.redSqrt();
      if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
        throw new Error('invalid point');

      var isOdd = y.fromRed().isOdd();
      if (odd && !isOdd || !odd && isOdd)
        y = y.redNeg();

      return this.point(x, y);
    };

    EdwardsCurve.prototype.pointFromY = function pointFromY(y, odd) {
      y = new BN(y, 16);
      if (!y.red)
        y = y.toRed(this.red);

      // x^2 = (y^2 - 1) / (d y^2 + 1)
      var y2 = y.redSqr();
      var lhs = y2.redSub(this.one);
      var rhs = y2.redMul(this.d).redAdd(this.one);
      var x2 = lhs.redMul(rhs.redInvm());

      if (x2.cmp(this.zero) === 0) {
        if (odd)
          throw new Error('invalid point');
        else
          return this.point(this.zero, y);
      }

      var x = x2.redSqrt();
      if (x.redSqr().redSub(x2).cmp(this.zero) !== 0)
        throw new Error('invalid point');

      if (x.isOdd() !== odd)
        x = x.redNeg();

      return this.point(x, y);
    };

    EdwardsCurve.prototype.validate = function validate(point) {
      if (point.isInfinity())
        return true;

      // Curve: A * X^2 + Y^2 = C^2 * (1 + D * X^2 * Y^2)
      point.normalize();

      var x2 = point.x.redSqr();
      var y2 = point.y.redSqr();
      var lhs = x2.redMul(this.a).redAdd(y2);
      var rhs = this.c2.redMul(this.one.redAdd(this.d.redMul(x2).redMul(y2)));

      return lhs.cmp(rhs) === 0;
    };

    function Point(curve, x, y, z, t) {
      Base.BasePoint.call(this, curve, 'projective');
      if (x === null && y === null && z === null) {
        this.x = this.curve.zero;
        this.y = this.curve.one;
        this.z = this.curve.one;
        this.t = this.curve.zero;
        this.zOne = true;
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        this.z = z ? new BN(z, 16) : this.curve.one;
        this.t = t && new BN(t, 16);
        if (!this.x.red)
          this.x = this.x.toRed(this.curve.red);
        if (!this.y.red)
          this.y = this.y.toRed(this.curve.red);
        if (!this.z.red)
          this.z = this.z.toRed(this.curve.red);
        if (this.t && !this.t.red)
          this.t = this.t.toRed(this.curve.red);
        this.zOne = this.z === this.curve.one;

        // Use extended coordinates
        if (this.curve.extended && !this.t) {
          this.t = this.x.redMul(this.y);
          if (!this.zOne)
            this.t = this.t.redMul(this.z.redInvm());
        }
      }
    }
    inherits(Point, Base.BasePoint);

    EdwardsCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
      return Point.fromJSON(this, obj);
    };

    EdwardsCurve.prototype.point = function point(x, y, z, t) {
      return new Point(this, x, y, z, t);
    };

    Point.fromJSON = function fromJSON(curve, obj) {
      return new Point(curve, obj[0], obj[1], obj[2]);
    };

    Point.prototype.inspect = function inspect() {
      if (this.isInfinity())
        return '<EC Point Infinity>';
      return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
        ' y: ' + this.y.fromRed().toString(16, 2) +
        ' z: ' + this.z.fromRed().toString(16, 2) + '>';
    };

    Point.prototype.isInfinity = function isInfinity() {
      // XXX This code assumes that zero is always zero in red
      return this.x.cmpn(0) === 0 &&
        this.y.cmp(this.z) === 0;
    };

    Point.prototype._extDbl = function _extDbl() {
      // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
      //     #doubling-dbl-2008-hwcd
      // 4M + 4S

      // A = X1^2
      var a = this.x.redSqr();
      // B = Y1^2
      var b = this.y.redSqr();
      // C = 2 * Z1^2
      var c = this.z.redSqr();
      c = c.redIAdd(c);
      // D = a * A
      var d = this.curve._mulA(a);
      // E = (X1 + Y1)^2 - A - B
      var e = this.x.redAdd(this.y).redSqr().redISub(a).redISub(b);
      // G = D + B
      var g = d.redAdd(b);
      // F = G - C
      var f = g.redSub(c);
      // H = D - B
      var h = d.redSub(b);
      // X3 = E * F
      var nx = e.redMul(f);
      // Y3 = G * H
      var ny = g.redMul(h);
      // T3 = E * H
      var nt = e.redMul(h);
      // Z3 = F * G
      var nz = f.redMul(g);
      return this.curve.point(nx, ny, nz, nt);
    };

    Point.prototype._projDbl = function _projDbl() {
      // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
      //     #doubling-dbl-2008-bbjlp
      //     #doubling-dbl-2007-bl
      // and others
      // Generally 3M + 4S or 2M + 4S

      // B = (X1 + Y1)^2
      var b = this.x.redAdd(this.y).redSqr();
      // C = X1^2
      var c = this.x.redSqr();
      // D = Y1^2
      var d = this.y.redSqr();

      var nx;
      var ny;
      var nz;
      if (this.curve.twisted) {
        // E = a * C
        var e = this.curve._mulA(c);
        // F = E + D
        var f = e.redAdd(d);
        if (this.zOne) {
          // X3 = (B - C - D) * (F - 2)
          nx = b.redSub(c).redSub(d).redMul(f.redSub(this.curve.two));
          // Y3 = F * (E - D)
          ny = f.redMul(e.redSub(d));
          // Z3 = F^2 - 2 * F
          nz = f.redSqr().redSub(f).redSub(f);
        } else {
          // H = Z1^2
          var h = this.z.redSqr();
          // J = F - 2 * H
          var j = f.redSub(h).redISub(h);
          // X3 = (B-C-D)*J
          nx = b.redSub(c).redISub(d).redMul(j);
          // Y3 = F * (E - D)
          ny = f.redMul(e.redSub(d));
          // Z3 = F * J
          nz = f.redMul(j);
        }
      } else {
        // E = C + D
        var e = c.redAdd(d);
        // H = (c * Z1)^2
        var h = this.curve._mulC(this.c.redMul(this.z)).redSqr();
        // J = E - 2 * H
        var j = e.redSub(h).redSub(h);
        // X3 = c * (B - E) * J
        nx = this.curve._mulC(b.redISub(e)).redMul(j);
        // Y3 = c * E * (C - D)
        ny = this.curve._mulC(e).redMul(c.redISub(d));
        // Z3 = E * J
        nz = e.redMul(j);
      }
      return this.curve.point(nx, ny, nz);
    };

    Point.prototype.dbl = function dbl() {
      if (this.isInfinity())
        return this;

      // Double in extended coordinates
      if (this.curve.extended)
        return this._extDbl();
      else
        return this._projDbl();
    };

    Point.prototype._extAdd = function _extAdd(p) {
      // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
      //     #addition-add-2008-hwcd-3
      // 8M

      // A = (Y1 - X1) * (Y2 - X2)
      var a = this.y.redSub(this.x).redMul(p.y.redSub(p.x));
      // B = (Y1 + X1) * (Y2 + X2)
      var b = this.y.redAdd(this.x).redMul(p.y.redAdd(p.x));
      // C = T1 * k * T2
      var c = this.t.redMul(this.curve.dd).redMul(p.t);
      // D = Z1 * 2 * Z2
      var d = this.z.redMul(p.z.redAdd(p.z));
      // E = B - A
      var e = b.redSub(a);
      // F = D - C
      var f = d.redSub(c);
      // G = D + C
      var g = d.redAdd(c);
      // H = B + A
      var h = b.redAdd(a);
      // X3 = E * F
      var nx = e.redMul(f);
      // Y3 = G * H
      var ny = g.redMul(h);
      // T3 = E * H
      var nt = e.redMul(h);
      // Z3 = F * G
      var nz = f.redMul(g);
      return this.curve.point(nx, ny, nz, nt);
    };

    Point.prototype._projAdd = function _projAdd(p) {
      // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
      //     #addition-add-2008-bbjlp
      //     #addition-add-2007-bl
      // 10M + 1S

      // A = Z1 * Z2
      var a = this.z.redMul(p.z);
      // B = A^2
      var b = a.redSqr();
      // C = X1 * X2
      var c = this.x.redMul(p.x);
      // D = Y1 * Y2
      var d = this.y.redMul(p.y);
      // E = d * C * D
      var e = this.curve.d.redMul(c).redMul(d);
      // F = B - E
      var f = b.redSub(e);
      // G = B + E
      var g = b.redAdd(e);
      // X3 = A * F * ((X1 + Y1) * (X2 + Y2) - C - D)
      var tmp = this.x.redAdd(this.y).redMul(p.x.redAdd(p.y)).redISub(c).redISub(d);
      var nx = a.redMul(f).redMul(tmp);
      var ny;
      var nz;
      if (this.curve.twisted) {
        // Y3 = A * G * (D - a * C)
        ny = a.redMul(g).redMul(d.redSub(this.curve._mulA(c)));
        // Z3 = F * G
        nz = f.redMul(g);
      } else {
        // Y3 = A * G * (D - C)
        ny = a.redMul(g).redMul(d.redSub(c));
        // Z3 = c * F * G
        nz = this.curve._mulC(f).redMul(g);
      }
      return this.curve.point(nx, ny, nz);
    };

    Point.prototype.add = function add(p) {
      if (this.isInfinity())
        return p;
      if (p.isInfinity())
        return this;

      if (this.curve.extended)
        return this._extAdd(p);
      else
        return this._projAdd(p);
    };

    Point.prototype.mul = function mul(k) {
      if (this._hasDoubles(k))
        return this.curve._fixedNafMul(this, k);
      else
        return this.curve._wnafMul(this, k);
    };

    Point.prototype.mulAdd = function mulAdd(k1, p, k2) {
      return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, false);
    };

    Point.prototype.jmulAdd = function jmulAdd(k1, p, k2) {
      return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, true);
    };

    Point.prototype.normalize = function normalize() {
      if (this.zOne)
        return this;

      // Normalize coordinates
      var zi = this.z.redInvm();
      this.x = this.x.redMul(zi);
      this.y = this.y.redMul(zi);
      if (this.t)
        this.t = this.t.redMul(zi);
      this.z = this.curve.one;
      this.zOne = true;
      return this;
    };

    Point.prototype.neg = function neg() {
      return this.curve.point(this.x.redNeg(),
        this.y,
        this.z,
        this.t && this.t.redNeg());
    };

    Point.prototype.getX = function getX() {
      this.normalize();
      return this.x.fromRed();
    };

    Point.prototype.getY = function getY() {
      this.normalize();
      return this.y.fromRed();
    };

    Point.prototype.eq = function eq(other) {
      return this === other ||
        this.getX().cmp(other.getX()) === 0 &&
        this.getY().cmp(other.getY()) === 0;
    };

    Point.prototype.eqXToP = function eqXToP(x) {
      var rx = x.toRed(this.curve.red).redMul(this.z);
      if (this.x.cmp(rx) === 0)
        return true;

      var xc = x.clone();
      var t = this.curve.redN.redMul(this.z);
      for (;;) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0)
          return false;

        rx.redIAdd(t);
        if (this.x.cmp(rx) === 0)
          return true;
      }
      return false;
    };

// Compatibility with BaseCurve
    Point.prototype.toP = Point.prototype.normalize;
    Point.prototype.mixedAdd = Point.prototype.add;

  },{"../../elliptic":9,"../curve":12,"bn.js":3,"inherits":41}],12:[function(require,module,exports){
    'use strict';

    var curve = exports;

    curve.base = require('./base');
    curve.short = require('./short');
    curve.mont = require('./mont');
    curve.edwards = require('./edwards');

  },{"./base":10,"./edwards":11,"./mont":13,"./short":14}],13:[function(require,module,exports){
    'use strict';

    var curve = require('../curve');
    var BN = require('bn.js');
    var inherits = require('inherits');
    var Base = curve.base;

    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;

    function MontCurve(conf) {
      Base.call(this, 'mont', conf);

      this.a = new BN(conf.a, 16).toRed(this.red);
      this.b = new BN(conf.b, 16).toRed(this.red);
      this.i4 = new BN(4).toRed(this.red).redInvm();
      this.two = new BN(2).toRed(this.red);
      this.a24 = this.i4.redMul(this.a.redAdd(this.two));
    }
    inherits(MontCurve, Base);
    module.exports = MontCurve;

    MontCurve.prototype.validate = function validate(point) {
      var x = point.normalize().x;
      var x2 = x.redSqr();
      var rhs = x2.redMul(x).redAdd(x2.redMul(this.a)).redAdd(x);
      var y = rhs.redSqrt();

      return y.redSqr().cmp(rhs) === 0;
    };

    function Point(curve, x, z) {
      Base.BasePoint.call(this, curve, 'projective');
      if (x === null && z === null) {
        this.x = this.curve.one;
        this.z = this.curve.zero;
      } else {
        this.x = new BN(x, 16);
        this.z = new BN(z, 16);
        if (!this.x.red)
          this.x = this.x.toRed(this.curve.red);
        if (!this.z.red)
          this.z = this.z.toRed(this.curve.red);
      }
    }
    inherits(Point, Base.BasePoint);

    MontCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      return this.point(utils.toArray(bytes, enc), 1);
    };

    MontCurve.prototype.point = function point(x, z) {
      return new Point(this, x, z);
    };

    MontCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
      return Point.fromJSON(this, obj);
    };

    Point.prototype.precompute = function precompute() {
      // No-op
    };

    Point.prototype._encode = function _encode() {
      return this.getX().toArray('be', this.curve.p.byteLength());
    };

    Point.fromJSON = function fromJSON(curve, obj) {
      return new Point(curve, obj[0], obj[1] || curve.one);
    };

    Point.prototype.inspect = function inspect() {
      if (this.isInfinity())
        return '<EC Point Infinity>';
      return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
        ' z: ' + this.z.fromRed().toString(16, 2) + '>';
    };

    Point.prototype.isInfinity = function isInfinity() {
      // XXX This code assumes that zero is always zero in red
      return this.z.cmpn(0) === 0;
    };

    Point.prototype.dbl = function dbl() {
      // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#doubling-dbl-1987-m-3
      // 2M + 2S + 4A

      // A = X1 + Z1
      var a = this.x.redAdd(this.z);
      // AA = A^2
      var aa = a.redSqr();
      // B = X1 - Z1
      var b = this.x.redSub(this.z);
      // BB = B^2
      var bb = b.redSqr();
      // C = AA - BB
      var c = aa.redSub(bb);
      // X3 = AA * BB
      var nx = aa.redMul(bb);
      // Z3 = C * (BB + A24 * C)
      var nz = c.redMul(bb.redAdd(this.curve.a24.redMul(c)));
      return this.curve.point(nx, nz);
    };

    Point.prototype.add = function add() {
      throw new Error('Not supported on Montgomery curve');
    };

    Point.prototype.diffAdd = function diffAdd(p, diff) {
      // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#diffadd-dadd-1987-m-3
      // 4M + 2S + 6A

      // A = X2 + Z2
      var a = this.x.redAdd(this.z);
      // B = X2 - Z2
      var b = this.x.redSub(this.z);
      // C = X3 + Z3
      var c = p.x.redAdd(p.z);
      // D = X3 - Z3
      var d = p.x.redSub(p.z);
      // DA = D * A
      var da = d.redMul(a);
      // CB = C * B
      var cb = c.redMul(b);
      // X5 = Z1 * (DA + CB)^2
      var nx = diff.z.redMul(da.redAdd(cb).redSqr());
      // Z5 = X1 * (DA - CB)^2
      var nz = diff.x.redMul(da.redISub(cb).redSqr());
      return this.curve.point(nx, nz);
    };

    Point.prototype.mul = function mul(k) {
      var t = k.clone();
      var a = this; // (N / 2) * Q + Q
      var b = this.curve.point(null, null); // (N / 2) * Q
      var c = this; // Q

      for (var bits = []; t.cmpn(0) !== 0; t.iushrn(1))
        bits.push(t.andln(1));

      for (var i = bits.length - 1; i >= 0; i--) {
        if (bits[i] === 0) {
          // N * Q + Q = ((N / 2) * Q + Q)) + (N / 2) * Q
          a = a.diffAdd(b, c);
          // N * Q = 2 * ((N / 2) * Q + Q))
          b = b.dbl();
        } else {
          // N * Q = ((N / 2) * Q + Q) + ((N / 2) * Q)
          b = a.diffAdd(b, c);
          // N * Q + Q = 2 * ((N / 2) * Q + Q)
          a = a.dbl();
        }
      }
      return b;
    };

    Point.prototype.mulAdd = function mulAdd() {
      throw new Error('Not supported on Montgomery curve');
    };

    Point.prototype.jumlAdd = function jumlAdd() {
      throw new Error('Not supported on Montgomery curve');
    };

    Point.prototype.eq = function eq(other) {
      return this.getX().cmp(other.getX()) === 0;
    };

    Point.prototype.normalize = function normalize() {
      this.x = this.x.redMul(this.z.redInvm());
      this.z = this.curve.one;
      return this;
    };

    Point.prototype.getX = function getX() {
      // Normalize coordinates
      this.normalize();

      return this.x.fromRed();
    };

  },{"../../elliptic":9,"../curve":12,"bn.js":3,"inherits":41}],14:[function(require,module,exports){
    'use strict';

    var curve = require('../curve');
    var elliptic = require('../../elliptic');
    var BN = require('bn.js');
    var inherits = require('inherits');
    var Base = curve.base;

    var assert = elliptic.utils.assert;

    function ShortCurve(conf) {
      Base.call(this, 'short', conf);

      this.a = new BN(conf.a, 16).toRed(this.red);
      this.b = new BN(conf.b, 16).toRed(this.red);
      this.tinv = this.two.redInvm();

      this.zeroA = this.a.fromRed().cmpn(0) === 0;
      this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;

      // If the curve is endomorphic, precalculate beta and lambda
      this.endo = this._getEndomorphism(conf);
      this._endoWnafT1 = new Array(4);
      this._endoWnafT2 = new Array(4);
    }
    inherits(ShortCurve, Base);
    module.exports = ShortCurve;

    ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
      // No efficient endomorphism
      if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1)
        return;

      // Compute beta and lambda, that lambda * P = (beta * Px; Py)
      var beta;
      var lambda;
      if (conf.beta) {
        beta = new BN(conf.beta, 16).toRed(this.red);
      } else {
        var betas = this._getEndoRoots(this.p);
        // Choose the smallest beta
        beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
        beta = beta.toRed(this.red);
      }
      if (conf.lambda) {
        lambda = new BN(conf.lambda, 16);
      } else {
        // Choose the lambda that is matching selected beta
        var lambdas = this._getEndoRoots(this.n);
        if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
          lambda = lambdas[0];
        } else {
          lambda = lambdas[1];
          assert(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
        }
      }

      // Get basis vectors, used for balanced length-two representation
      var basis;
      if (conf.basis) {
        basis = conf.basis.map(function(vec) {
          return {
            a: new BN(vec.a, 16),
            b: new BN(vec.b, 16)
          };
        });
      } else {
        basis = this._getEndoBasis(lambda);
      }

      return {
        beta: beta,
        lambda: lambda,
        basis: basis
      };
    };

    ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
      // Find roots of for x^2 + x + 1 in F
      // Root = (-1 +- Sqrt(-3)) / 2
      //
      var red = num === this.p ? this.red : BN.mont(num);
      var tinv = new BN(2).toRed(red).redInvm();
      var ntinv = tinv.redNeg();

      var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);

      var l1 = ntinv.redAdd(s).fromRed();
      var l2 = ntinv.redSub(s).fromRed();
      return [ l1, l2 ];
    };

    ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
      // aprxSqrt >= sqrt(this.n)
      var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));

      // 3.74
      // Run EGCD, until r(L + 1) < aprxSqrt
      var u = lambda;
      var v = this.n.clone();
      var x1 = new BN(1);
      var y1 = new BN(0);
      var x2 = new BN(0);
      var y2 = new BN(1);

      // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)
      var a0;
      var b0;
      // First vector
      var a1;
      var b1;
      // Second vector
      var a2;
      var b2;

      var prevR;
      var i = 0;
      var r;
      var x;
      while (u.cmpn(0) !== 0) {
        var q = v.div(u);
        r = v.sub(q.mul(u));
        x = x2.sub(q.mul(x1));
        var y = y2.sub(q.mul(y1));

        if (!a1 && r.cmp(aprxSqrt) < 0) {
          a0 = prevR.neg();
          b0 = x1;
          a1 = r.neg();
          b1 = x;
        } else if (a1 && ++i === 2) {
          break;
        }
        prevR = r;

        v = u;
        u = r;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
      }
      a2 = r.neg();
      b2 = x;

      var len1 = a1.sqr().add(b1.sqr());
      var len2 = a2.sqr().add(b2.sqr());
      if (len2.cmp(len1) >= 0) {
        a2 = a0;
        b2 = b0;
      }

      // Normalize signs
      if (a1.negative) {
        a1 = a1.neg();
        b1 = b1.neg();
      }
      if (a2.negative) {
        a2 = a2.neg();
        b2 = b2.neg();
      }

      return [
        { a: a1, b: b1 },
        { a: a2, b: b2 }
      ];
    };

    ShortCurve.prototype._endoSplit = function _endoSplit(k) {
      var basis = this.endo.basis;
      var v1 = basis[0];
      var v2 = basis[1];

      var c1 = v2.b.mul(k).divRound(this.n);
      var c2 = v1.b.neg().mul(k).divRound(this.n);

      var p1 = c1.mul(v1.a);
      var p2 = c2.mul(v2.a);
      var q1 = c1.mul(v1.b);
      var q2 = c2.mul(v2.b);

      // Calculate answer
      var k1 = k.sub(p1).sub(p2);
      var k2 = q1.add(q2).neg();
      return { k1: k1, k2: k2 };
    };

    ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new BN(x, 16);
      if (!x.red)
        x = x.toRed(this.red);

      var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
      var y = y2.redSqrt();
      if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
        throw new Error('invalid point');

      // XXX Is there any way to tell if the number is odd without converting it
      // to non-red form?
      var isOdd = y.fromRed().isOdd();
      if (odd && !isOdd || !odd && isOdd)
        y = y.redNeg();

      return this.point(x, y);
    };

    ShortCurve.prototype.validate = function validate(point) {
      if (point.inf)
        return true;

      var x = point.x;
      var y = point.y;

      var ax = this.a.redMul(x);
      var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
      return y.redSqr().redISub(rhs).cmpn(0) === 0;
    };

    ShortCurve.prototype._endoWnafMulAdd =
      function _endoWnafMulAdd(points, coeffs, jacobianResult) {
        var npoints = this._endoWnafT1;
        var ncoeffs = this._endoWnafT2;
        for (var i = 0; i < points.length; i++) {
          var split = this._endoSplit(coeffs[i]);
          var p = points[i];
          var beta = p._getBeta();

          if (split.k1.negative) {
            split.k1.ineg();
            p = p.neg(true);
          }
          if (split.k2.negative) {
            split.k2.ineg();
            beta = beta.neg(true);
          }

          npoints[i * 2] = p;
          npoints[i * 2 + 1] = beta;
          ncoeffs[i * 2] = split.k1;
          ncoeffs[i * 2 + 1] = split.k2;
        }
        var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);

        // Clean-up references to points and coefficients
        for (var j = 0; j < i * 2; j++) {
          npoints[j] = null;
          ncoeffs[j] = null;
        }
        return res;
      };

    function Point(curve, x, y, isRed) {
      Base.BasePoint.call(this, curve, 'affine');
      if (x === null && y === null) {
        this.x = null;
        this.y = null;
        this.inf = true;
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        // Force redgomery representation when loading from JSON
        if (isRed) {
          this.x.forceRed(this.curve.red);
          this.y.forceRed(this.curve.red);
        }
        if (!this.x.red)
          this.x = this.x.toRed(this.curve.red);
        if (!this.y.red)
          this.y = this.y.toRed(this.curve.red);
        this.inf = false;
      }
    }
    inherits(Point, Base.BasePoint);

    ShortCurve.prototype.point = function point(x, y, isRed) {
      return new Point(this, x, y, isRed);
    };

    ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
      return Point.fromJSON(this, obj, red);
    };

    Point.prototype._getBeta = function _getBeta() {
      if (!this.curve.endo)
        return;

      var pre = this.precomputed;
      if (pre && pre.beta)
        return pre.beta;

      var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
      if (pre) {
        var curve = this.curve;
        var endoMul = function(p) {
          return curve.point(p.x.redMul(curve.endo.beta), p.y);
        };
        pre.beta = beta;
        beta.precomputed = {
          beta: null,
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(endoMul)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(endoMul)
          }
        };
      }
      return beta;
    };

    Point.prototype.toJSON = function toJSON() {
      if (!this.precomputed)
        return [ this.x, this.y ];

      return [ this.x, this.y, this.precomputed && {
        doubles: this.precomputed.doubles && {
          step: this.precomputed.doubles.step,
          points: this.precomputed.doubles.points.slice(1)
        },
        naf: this.precomputed.naf && {
          wnd: this.precomputed.naf.wnd,
          points: this.precomputed.naf.points.slice(1)
        }
      } ];
    };

    Point.fromJSON = function fromJSON(curve, obj, red) {
      if (typeof obj === 'string')
        obj = JSON.parse(obj);
      var res = curve.point(obj[0], obj[1], red);
      if (!obj[2])
        return res;

      function obj2point(obj) {
        return curve.point(obj[0], obj[1], red);
      }

      var pre = obj[2];
      res.precomputed = {
        beta: null,
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: [ res ].concat(pre.doubles.points.map(obj2point))
        },
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: [ res ].concat(pre.naf.points.map(obj2point))
        }
      };
      return res;
    };

    Point.prototype.inspect = function inspect() {
      if (this.isInfinity())
        return '<EC Point Infinity>';
      return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
        ' y: ' + this.y.fromRed().toString(16, 2) + '>';
    };

    Point.prototype.isInfinity = function isInfinity() {
      return this.inf;
    };

    Point.prototype.add = function add(p) {
      // O + P = P
      if (this.inf)
        return p;

      // P + O = P
      if (p.inf)
        return this;

      // P + P = 2P
      if (this.eq(p))
        return this.dbl();

      // P + (-P) = O
      if (this.neg().eq(p))
        return this.curve.point(null, null);

      // P + Q = O
      if (this.x.cmp(p.x) === 0)
        return this.curve.point(null, null);

      var c = this.y.redSub(p.y);
      if (c.cmpn(0) !== 0)
        c = c.redMul(this.x.redSub(p.x).redInvm());
      var nx = c.redSqr().redISub(this.x).redISub(p.x);
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };

    Point.prototype.dbl = function dbl() {
      if (this.inf)
        return this;

      // 2P = O
      var ys1 = this.y.redAdd(this.y);
      if (ys1.cmpn(0) === 0)
        return this.curve.point(null, null);

      var a = this.curve.a;

      var x2 = this.x.redSqr();
      var dyinv = ys1.redInvm();
      var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);

      var nx = c.redSqr().redISub(this.x.redAdd(this.x));
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };

    Point.prototype.getX = function getX() {
      return this.x.fromRed();
    };

    Point.prototype.getY = function getY() {
      return this.y.fromRed();
    };

    Point.prototype.mul = function mul(k) {
      k = new BN(k, 16);

      if (this._hasDoubles(k))
        return this.curve._fixedNafMul(this, k);
      else if (this.curve.endo)
        return this.curve._endoWnafMulAdd([ this ], [ k ]);
      else
        return this.curve._wnafMul(this, k);
    };

    Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
      var points = [ this, p2 ];
      var coeffs = [ k1, k2 ];
      if (this.curve.endo)
        return this.curve._endoWnafMulAdd(points, coeffs);
      else
        return this.curve._wnafMulAdd(1, points, coeffs, 2);
    };

    Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
      var points = [ this, p2 ];
      var coeffs = [ k1, k2 ];
      if (this.curve.endo)
        return this.curve._endoWnafMulAdd(points, coeffs, true);
      else
        return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
    };

    Point.prototype.eq = function eq(p) {
      return this === p ||
        this.inf === p.inf &&
        (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
    };

    Point.prototype.neg = function neg(_precompute) {
      if (this.inf)
        return this;

      var res = this.curve.point(this.x, this.y.redNeg());
      if (_precompute && this.precomputed) {
        var pre = this.precomputed;
        var negate = function(p) {
          return p.neg();
        };
        res.precomputed = {
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(negate)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(negate)
          }
        };
      }
      return res;
    };

    Point.prototype.toJ = function toJ() {
      if (this.inf)
        return this.curve.jpoint(null, null, null);

      var res = this.curve.jpoint(this.x, this.y, this.curve.one);
      return res;
    };

    function JPoint(curve, x, y, z) {
      Base.BasePoint.call(this, curve, 'jacobian');
      if (x === null && y === null && z === null) {
        this.x = this.curve.one;
        this.y = this.curve.one;
        this.z = new BN(0);
      } else {
        this.x = new BN(x, 16);
        this.y = new BN(y, 16);
        this.z = new BN(z, 16);
      }
      if (!this.x.red)
        this.x = this.x.toRed(this.curve.red);
      if (!this.y.red)
        this.y = this.y.toRed(this.curve.red);
      if (!this.z.red)
        this.z = this.z.toRed(this.curve.red);

      this.zOne = this.z === this.curve.one;
    }
    inherits(JPoint, Base.BasePoint);

    ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
      return new JPoint(this, x, y, z);
    };

    JPoint.prototype.toP = function toP() {
      if (this.isInfinity())
        return this.curve.point(null, null);

      var zinv = this.z.redInvm();
      var zinv2 = zinv.redSqr();
      var ax = this.x.redMul(zinv2);
      var ay = this.y.redMul(zinv2).redMul(zinv);

      return this.curve.point(ax, ay);
    };

    JPoint.prototype.neg = function neg() {
      return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
    };

    JPoint.prototype.add = function add(p) {
      // O + P = P
      if (this.isInfinity())
        return p;

      // P + O = P
      if (p.isInfinity())
        return this;

      // 12M + 4S + 7A
      var pz2 = p.z.redSqr();
      var z2 = this.z.redSqr();
      var u1 = this.x.redMul(pz2);
      var u2 = p.x.redMul(z2);
      var s1 = this.y.redMul(pz2.redMul(p.z));
      var s2 = p.y.redMul(z2.redMul(this.z));

      var h = u1.redSub(u2);
      var r = s1.redSub(s2);
      if (h.cmpn(0) === 0) {
        if (r.cmpn(0) !== 0)
          return this.curve.jpoint(null, null, null);
        else
          return this.dbl();
      }

      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);

      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(p.z).redMul(h);

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.mixedAdd = function mixedAdd(p) {
      // O + P = P
      if (this.isInfinity())
        return p.toJ();

      // P + O = P
      if (p.isInfinity())
        return this;

      // 8M + 3S + 7A
      var z2 = this.z.redSqr();
      var u1 = this.x;
      var u2 = p.x.redMul(z2);
      var s1 = this.y;
      var s2 = p.y.redMul(z2).redMul(this.z);

      var h = u1.redSub(u2);
      var r = s1.redSub(s2);
      if (h.cmpn(0) === 0) {
        if (r.cmpn(0) !== 0)
          return this.curve.jpoint(null, null, null);
        else
          return this.dbl();
      }

      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);

      var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(h);

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.dblp = function dblp(pow) {
      if (pow === 0)
        return this;
      if (this.isInfinity())
        return this;
      if (!pow)
        return this.dbl();

      if (this.curve.zeroA || this.curve.threeA) {
        var r = this;
        for (var i = 0; i < pow; i++)
          r = r.dbl();
        return r;
      }

      // 1M + 2S + 1A + N * (4S + 5M + 8A)
      // N = 1 => 6M + 6S + 9A
      var a = this.curve.a;
      var tinv = this.curve.tinv;

      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();

      // Reuse results
      var jyd = jy.redAdd(jy);
      for (var i = 0; i < pow; i++) {
        var jx2 = jx.redSqr();
        var jyd2 = jyd.redSqr();
        var jyd4 = jyd2.redSqr();
        var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

        var t1 = jx.redMul(jyd2);
        var nx = c.redSqr().redISub(t1.redAdd(t1));
        var t2 = t1.redISub(nx);
        var dny = c.redMul(t2);
        dny = dny.redIAdd(dny).redISub(jyd4);
        var nz = jyd.redMul(jz);
        if (i + 1 < pow)
          jz4 = jz4.redMul(jyd4);

        jx = nx;
        jz = nz;
        jyd = dny;
      }

      return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
    };

    JPoint.prototype.dbl = function dbl() {
      if (this.isInfinity())
        return this;

      if (this.curve.zeroA)
        return this._zeroDbl();
      else if (this.curve.threeA)
        return this._threeDbl();
      else
        return this._dbl();
    };

    JPoint.prototype._zeroDbl = function _zeroDbl() {
      var nx;
      var ny;
      var nz;
      // Z = 1
      if (this.zOne) {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
        //     #doubling-mdbl-2007-bl
        // 1M + 5S + 14A

        // XX = X1^2
        var xx = this.x.redSqr();
        // YY = Y1^2
        var yy = this.y.redSqr();
        // YYYY = YY^2
        var yyyy = yy.redSqr();
        // S = 2 * ((X1 + YY)^2 - XX - YYYY)
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        // M = 3 * XX + a; a = 0
        var m = xx.redAdd(xx).redIAdd(xx);
        // T = M ^ 2 - 2*S
        var t = m.redSqr().redISub(s).redISub(s);

        // 8 * YYYY
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);

        // X3 = T
        nx = t;
        // Y3 = M * (S - T) - 8 * YYYY
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        // Z3 = 2*Y1
        nz = this.y.redAdd(this.y);
      } else {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
        //     #doubling-dbl-2009-l
        // 2M + 5S + 13A

        // A = X1^2
        var a = this.x.redSqr();
        // B = Y1^2
        var b = this.y.redSqr();
        // C = B^2
        var c = b.redSqr();
        // D = 2 * ((X1 + B)^2 - A - C)
        var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
        d = d.redIAdd(d);
        // E = 3 * A
        var e = a.redAdd(a).redIAdd(a);
        // F = E^2
        var f = e.redSqr();

        // 8 * C
        var c8 = c.redIAdd(c);
        c8 = c8.redIAdd(c8);
        c8 = c8.redIAdd(c8);

        // X3 = F - 2 * D
        nx = f.redISub(d).redISub(d);
        // Y3 = E * (D - X3) - 8 * C
        ny = e.redMul(d.redISub(nx)).redISub(c8);
        // Z3 = 2 * Y1 * Z1
        nz = this.y.redMul(this.z);
        nz = nz.redIAdd(nz);
      }

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype._threeDbl = function _threeDbl() {
      var nx;
      var ny;
      var nz;
      // Z = 1
      if (this.zOne) {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
        //     #doubling-mdbl-2007-bl
        // 1M + 5S + 15A

        // XX = X1^2
        var xx = this.x.redSqr();
        // YY = Y1^2
        var yy = this.y.redSqr();
        // YYYY = YY^2
        var yyyy = yy.redSqr();
        // S = 2 * ((X1 + YY)^2 - XX - YYYY)
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        // M = 3 * XX + a
        var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
        // T = M^2 - 2 * S
        var t = m.redSqr().redISub(s).redISub(s);
        // X3 = T
        nx = t;
        // Y3 = M * (S - T) - 8 * YYYY
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        // Z3 = 2 * Y1
        nz = this.y.redAdd(this.y);
      } else {
        // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
        // 3M + 5S

        // delta = Z1^2
        var delta = this.z.redSqr();
        // gamma = Y1^2
        var gamma = this.y.redSqr();
        // beta = X1 * gamma
        var beta = this.x.redMul(gamma);
        // alpha = 3 * (X1 - delta) * (X1 + delta)
        var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
        alpha = alpha.redAdd(alpha).redIAdd(alpha);
        // X3 = alpha^2 - 8 * beta
        var beta4 = beta.redIAdd(beta);
        beta4 = beta4.redIAdd(beta4);
        var beta8 = beta4.redAdd(beta4);
        nx = alpha.redSqr().redISub(beta8);
        // Z3 = (Y1 + Z1)^2 - gamma - delta
        nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
        // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2
        var ggamma8 = gamma.redSqr();
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
      }

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype._dbl = function _dbl() {
      var a = this.curve.a;

      // 4M + 6S + 10A
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();

      var jx2 = jx.redSqr();
      var jy2 = jy.redSqr();

      var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

      var jxd4 = jx.redAdd(jx);
      jxd4 = jxd4.redIAdd(jxd4);
      var t1 = jxd4.redMul(jy2);
      var nx = c.redSqr().redISub(t1.redAdd(t1));
      var t2 = t1.redISub(nx);

      var jyd8 = jy2.redSqr();
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      var ny = c.redMul(t2).redISub(jyd8);
      var nz = jy.redAdd(jy).redMul(jz);

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.trpl = function trpl() {
      if (!this.curve.zeroA)
        return this.dbl().add(this);

      // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
      // 5M + 10S + ...

      // XX = X1^2
      var xx = this.x.redSqr();
      // YY = Y1^2
      var yy = this.y.redSqr();
      // ZZ = Z1^2
      var zz = this.z.redSqr();
      // YYYY = YY^2
      var yyyy = yy.redSqr();
      // M = 3 * XX + a * ZZ2; a = 0
      var m = xx.redAdd(xx).redIAdd(xx);
      // MM = M^2
      var mm = m.redSqr();
      // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM
      var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      e = e.redIAdd(e);
      e = e.redAdd(e).redIAdd(e);
      e = e.redISub(mm);
      // EE = E^2
      var ee = e.redSqr();
      // T = 16*YYYY
      var t = yyyy.redIAdd(yyyy);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      // U = (M + E)^2 - MM - EE - T
      var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
      // X3 = 4 * (X1 * EE - 4 * YY * U)
      var yyu4 = yy.redMul(u);
      yyu4 = yyu4.redIAdd(yyu4);
      yyu4 = yyu4.redIAdd(yyu4);
      var nx = this.x.redMul(ee).redISub(yyu4);
      nx = nx.redIAdd(nx);
      nx = nx.redIAdd(nx);
      // Y3 = 8 * Y1 * (U * (T - U) - E * EE)
      var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      // Z3 = (Z1 + E)^2 - ZZ - EE
      var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);

      return this.curve.jpoint(nx, ny, nz);
    };

    JPoint.prototype.mul = function mul(k, kbase) {
      k = new BN(k, kbase);

      return this.curve._wnafMul(this, k);
    };

    JPoint.prototype.eq = function eq(p) {
      if (p.type === 'affine')
        return this.eq(p.toJ());

      if (this === p)
        return true;

      // x1 * z2^2 == x2 * z1^2
      var z2 = this.z.redSqr();
      var pz2 = p.z.redSqr();
      if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0)
        return false;

      // y1 * z2^3 == y2 * z1^3
      var z3 = z2.redMul(this.z);
      var pz3 = pz2.redMul(p.z);
      return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
    };

    JPoint.prototype.eqXToP = function eqXToP(x) {
      var zs = this.z.redSqr();
      var rx = x.toRed(this.curve.red).redMul(zs);
      if (this.x.cmp(rx) === 0)
        return true;

      var xc = x.clone();
      var t = this.curve.redN.redMul(zs);
      for (;;) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0)
          return false;

        rx.redIAdd(t);
        if (this.x.cmp(rx) === 0)
          return true;
      }
      return false;
    };

    JPoint.prototype.inspect = function inspect() {
      if (this.isInfinity())
        return '<EC JPoint Infinity>';
      return '<EC JPoint x: ' + this.x.toString(16, 2) +
        ' y: ' + this.y.toString(16, 2) +
        ' z: ' + this.z.toString(16, 2) + '>';
    };

    JPoint.prototype.isInfinity = function isInfinity() {
      // XXX This code assumes that zero is always zero in red
      return this.z.cmpn(0) === 0;
    };

  },{"../../elliptic":9,"../curve":12,"bn.js":3,"inherits":41}],15:[function(require,module,exports){
    'use strict';

    var curves = exports;

    var hash = require('hash.js');
    var elliptic = require('../elliptic');

    var assert = elliptic.utils.assert;

    function PresetCurve(options) {
      if (options.type === 'short')
        this.curve = new elliptic.curve.short(options);
      else if (options.type === 'edwards')
        this.curve = new elliptic.curve.edwards(options);
      else
        this.curve = new elliptic.curve.mont(options);
      this.g = this.curve.g;
      this.n = this.curve.n;
      this.hash = options.hash;

      assert(this.g.validate(), 'Invalid curve');
      assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
    }
    curves.PresetCurve = PresetCurve;

    function defineCurve(name, options) {
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        get: function() {
          var curve = new PresetCurve(options);
          Object.defineProperty(curves, name, {
            configurable: true,
            enumerable: true,
            value: curve
          });
          return curve;
        }
      });
    }

    defineCurve('p192', {
      type: 'short',
      prime: 'p192',
      p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
      a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
      b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
      n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
      hash: hash.sha256,
      gRed: false,
      g: [
        '188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012',
        '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811'
      ]
    });

    defineCurve('p224', {
      type: 'short',
      prime: 'p224',
      p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
      a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
      b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
      n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
      hash: hash.sha256,
      gRed: false,
      g: [
        'b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21',
        'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34'
      ]
    });

    defineCurve('p256', {
      type: 'short',
      prime: null,
      p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
      a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
      b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
      n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
      hash: hash.sha256,
      gRed: false,
      g: [
        '6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296',
        '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5'
      ]
    });

    defineCurve('p384', {
      type: 'short',
      prime: null,
      p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'fffffffe ffffffff 00000000 00000000 ffffffff',
      a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'fffffffe ffffffff 00000000 00000000 fffffffc',
      b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' +
        '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
      n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' +
        'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
      hash: hash.sha384,
      gRed: false,
      g: [
        'aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' +
        '5502f25d bf55296c 3a545e38 72760ab7',
        '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' +
        '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f'
      ]
    });

    defineCurve('p521', {
      type: 'short',
      prime: null,
      p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'ffffffff ffffffff ffffffff ffffffff ffffffff',
      a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'ffffffff ffffffff ffffffff ffffffff fffffffc',
      b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' +
        '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' +
        '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
      n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
        'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' +
        'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
      hash: hash.sha512,
      gRed: false,
      g: [
        '000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' +
        '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' +
        'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66',
        '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' +
        '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' +
        '3fad0761 353c7086 a272c240 88be9476 9fd16650'
      ]
    });

    defineCurve('curve25519', {
      type: 'mont',
      prime: 'p25519',
      p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
      a: '76d06',
      b: '1',
      n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
      hash: hash.sha256,
      gRed: false,
      g: [
        '9'
      ]
    });

    defineCurve('ed25519', {
      type: 'edwards',
      prime: 'p25519',
      p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
      a: '-1',
      c: '1',
      // -121665 * (121666^(-1)) (mod P)
      d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
      n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
      hash: hash.sha256,
      gRed: false,
      g: [
        '216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a',

        // 4/5
        '6666666666666666666666666666666666666666666666666666666666666658'
      ]
    });

    var pre;
    try {
      pre = require('./precomputed/secp256k1');
    } catch (e) {
      pre = undefined;
    }

    defineCurve('secp256k1', {
      type: 'short',
      prime: 'k256',
      p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
      a: '0',
      b: '7',
      n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
      h: '1',
      hash: hash.sha256,

      // Precomputed endomorphism
      beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
      lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
      basis: [
        {
          a: '3086d221a7d46bcde86c90e49284eb15',
          b: '-e4437ed6010e88286f547fa90abfe4c3'
        },
        {
          a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
          b: '3086d221a7d46bcde86c90e49284eb15'
        }
      ],

      gRed: false,
      g: [
        '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
        pre
      ]
    });

  },{"../elliptic":9,"./precomputed/secp256k1":22,"hash.js":28}],16:[function(require,module,exports){
    'use strict';

    var BN = require('bn.js');
    var HmacDRBG = require('hmac-drbg');
    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;

    var KeyPair = require('./key');
    var Signature = require('./signature');

    function EC(options) {
      if (!(this instanceof EC))
        return new EC(options);

      // Shortcut `elliptic.ec(curve-name)`
      if (typeof options === 'string') {
        assert(elliptic.curves.hasOwnProperty(options), 'Unknown curve ' + options);

        options = elliptic.curves[options];
      }

      // Shortcut for `elliptic.ec(elliptic.curves.curveName)`
      if (options instanceof elliptic.curves.PresetCurve)
        options = { curve: options };

      this.curve = options.curve.curve;
      this.n = this.curve.n;
      this.nh = this.n.ushrn(1);
      this.g = this.curve.g;

      // Point on curve
      this.g = options.curve.g;
      this.g.precompute(options.curve.n.bitLength() + 1);

      // Hash for function for DRBG
      this.hash = options.hash || options.curve.hash;
    }
    module.exports = EC;

    EC.prototype.keyPair = function keyPair(options) {
      return new KeyPair(this, options);
    };

    EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
      return KeyPair.fromPrivate(this, priv, enc);
    };

    EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
      return KeyPair.fromPublic(this, pub, enc);
    };

    EC.prototype.genKeyPair = function genKeyPair(options) {
      if (!options)
        options = {};

      // Instantiate Hmac_DRBG
      var drbg = new HmacDRBG({
        hash: this.hash,
        pers: options.pers,
        persEnc: options.persEnc || 'utf8',
        entropy: options.entropy || elliptic.rand(this.hash.hmacStrength),
        entropyEnc: options.entropy && options.entropyEnc || 'utf8',
        nonce: this.n.toArray()
      });

      var bytes = this.n.byteLength();
      var ns2 = this.n.sub(new BN(2));
      do {
        var priv = new BN(drbg.generate(bytes));
        if (priv.cmp(ns2) > 0)
          continue;

        priv.iaddn(1);
        return this.keyFromPrivate(priv);
      } while (true);
    };

    EC.prototype._truncateToN = function truncateToN(msg, truncOnly) {
      var delta = msg.byteLength() * 8 - this.n.bitLength();
      if (delta > 0)
        msg = msg.ushrn(delta);
      if (!truncOnly && msg.cmp(this.n) >= 0)
        return msg.sub(this.n);
      else
        return msg;
    };

    EC.prototype.sign = function sign(msg, key, enc, options) {
      if (typeof enc === 'object') {
        options = enc;
        enc = null;
      }
      if (!options)
        options = {};

      key = this.keyFromPrivate(key, enc);
      msg = this._truncateToN(new BN(msg, 16));

      // Zero-extend key to provide enough entropy
      var bytes = this.n.byteLength();
      var bkey = key.getPrivate().toArray('be', bytes);

      // Zero-extend nonce to have the same byte size as N
      var nonce = msg.toArray('be', bytes);

      // Instantiate Hmac_DRBG
      var drbg = new HmacDRBG({
        hash: this.hash,
        entropy: bkey,
        nonce: nonce,
        pers: options.pers,
        persEnc: options.persEnc || 'utf8'
      });

      // Number of bytes to generate
      var ns1 = this.n.sub(new BN(1));

      for (var iter = 0; true; iter++) {
        var k = options.k ?
          options.k(iter) :
          new BN(drbg.generate(this.n.byteLength()));
        k = this._truncateToN(k, true);
        if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0)
          continue;

        var kp = this.g.mul(k);
        if (kp.isInfinity())
          continue;

        var kpX = kp.getX();
        var r = kpX.umod(this.n);
        if (r.cmpn(0) === 0)
          continue;

        var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
        s = s.umod(this.n);
        if (s.cmpn(0) === 0)
          continue;

        var recoveryParam = (kp.getY().isOdd() ? 1 : 0) |
          (kpX.cmp(r) !== 0 ? 2 : 0);

        // Use complement of `s`, if it is > `n / 2`
        if (options.canonical && s.cmp(this.nh) > 0) {
          s = this.n.sub(s);
          recoveryParam ^= 1;
        }

        return new Signature({ r: r, s: s, recoveryParam: recoveryParam });
      }
    };

    EC.prototype.verify = function verify(msg, signature, key, enc) {
      msg = this._truncateToN(new BN(msg, 16));
      key = this.keyFromPublic(key, enc);
      signature = new Signature(signature, 'hex');

      // Perform primitive values validation
      var r = signature.r;
      var s = signature.s;
      if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0)
        return false;
      if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0)
        return false;

      // Validate signature
      var sinv = s.invm(this.n);
      var u1 = sinv.mul(msg).umod(this.n);
      var u2 = sinv.mul(r).umod(this.n);

      if (!this.curve._maxwellTrick) {
        var p = this.g.mulAdd(u1, key.getPublic(), u2);
        if (p.isInfinity())
          return false;

        return p.getX().umod(this.n).cmp(r) === 0;
      }

      // NOTE: Greg Maxwell's trick, inspired by:
      // https://git.io/vad3K

      var p = this.g.jmulAdd(u1, key.getPublic(), u2);
      if (p.isInfinity())
        return false;

      // Compare `p.x` of Jacobian point with `r`,
      // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
      // inverse of `p.z^2`
      return p.eqXToP(r);
    };

    EC.prototype.recoverPubKey = function(msg, signature, j, enc) {
      assert((3 & j) === j, 'The recovery param is more than two bits');
      signature = new Signature(signature, enc);

      var n = this.n;
      var e = new BN(msg);
      var r = signature.r;
      var s = signature.s;

      // A set LSB signifies that the y-coordinate is odd
      var isYOdd = j & 1;
      var isSecondKey = j >> 1;
      if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey)
        throw new Error('Unable to find sencond key candinate');

      // 1.1. Let x = r + jn.
      if (isSecondKey)
        r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);
      else
        r = this.curve.pointFromX(r, isYOdd);

      var rInv = signature.r.invm(n);
      var s1 = n.sub(e).mul(rInv).umod(n);
      var s2 = s.mul(rInv).umod(n);

      // 1.6.1 Compute Q = r^-1 (sR -  eG)
      //               Q = r^-1 (sR + -eG)
      return this.g.mulAdd(s1, r, s2);
    };

    EC.prototype.getKeyRecoveryParam = function(e, signature, Q, enc) {
      signature = new Signature(signature, enc);
      if (signature.recoveryParam !== null)
        return signature.recoveryParam;

      for (var i = 0; i < 4; i++) {
        var Qprime;
        try {
          Qprime = this.recoverPubKey(e, signature, i);
        } catch (e) {
          continue;
        }

        if (Qprime.eq(Q))
          return i;
      }
      throw new Error('Unable to find valid recovery factor');
    };

  },{"../../elliptic":9,"./key":17,"./signature":18,"bn.js":3,"hmac-drbg":40}],17:[function(require,module,exports){
    'use strict';

    var BN = require('bn.js');
    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;

    function KeyPair(ec, options) {
      this.ec = ec;
      this.priv = null;
      this.pub = null;

      // KeyPair(ec, { priv: ..., pub: ... })
      if (options.priv)
        this._importPrivate(options.priv, options.privEnc);
      if (options.pub)
        this._importPublic(options.pub, options.pubEnc);
    }
    module.exports = KeyPair;

    KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
      if (pub instanceof KeyPair)
        return pub;

      return new KeyPair(ec, {
        pub: pub,
        pubEnc: enc
      });
    };

    KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
      if (priv instanceof KeyPair)
        return priv;

      return new KeyPair(ec, {
        priv: priv,
        privEnc: enc
      });
    };

    KeyPair.prototype.validate = function validate() {
      var pub = this.getPublic();

      if (pub.isInfinity())
        return { result: false, reason: 'Invalid public key' };
      if (!pub.validate())
        return { result: false, reason: 'Public key is not a point' };
      if (!pub.mul(this.ec.curve.n).isInfinity())
        return { result: false, reason: 'Public key * N != O' };

      return { result: true, reason: null };
    };

    KeyPair.prototype.getPublic = function getPublic(compact, enc) {
      // compact is optional argument
      if (typeof compact === 'string') {
        enc = compact;
        compact = null;
      }

      if (!this.pub)
        this.pub = this.ec.g.mul(this.priv);

      if (!enc)
        return this.pub;

      return this.pub.encode(enc, compact);
    };

    KeyPair.prototype.getPrivate = function getPrivate(enc) {
      if (enc === 'hex')
        return this.priv.toString(16, 2);
      else
        return this.priv;
    };

    KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
      this.priv = new BN(key, enc || 16);

      // Ensure that the priv won't be bigger than n, otherwise we may fail
      // in fixed multiplication method
      this.priv = this.priv.umod(this.ec.curve.n);
    };

    KeyPair.prototype._importPublic = function _importPublic(key, enc) {
      if (key.x || key.y) {
        // Montgomery points only have an `x` coordinate.
        // Weierstrass/Edwards points on the other hand have both `x` and
        // `y` coordinates.
        if (this.ec.curve.type === 'mont') {
          assert(key.x, 'Need x coordinate');
        } else if (this.ec.curve.type === 'short' ||
          this.ec.curve.type === 'edwards') {
          assert(key.x && key.y, 'Need both x and y coordinate');
        }
        this.pub = this.ec.curve.point(key.x, key.y);
        return;
      }
      this.pub = this.ec.curve.decodePoint(key, enc);
    };

// ECDH
    KeyPair.prototype.derive = function derive(pub) {
      return pub.mul(this.priv).getX();
    };

// ECDSA
    KeyPair.prototype.sign = function sign(msg, enc, options) {
      return this.ec.sign(msg, this, enc, options);
    };

    KeyPair.prototype.verify = function verify(msg, signature) {
      return this.ec.verify(msg, signature, this);
    };

    KeyPair.prototype.inspect = function inspect() {
      return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) +
        ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
    };

  },{"../../elliptic":9,"bn.js":3}],18:[function(require,module,exports){
    'use strict';

    var BN = require('bn.js');

    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;

    function Signature(options, enc) {
      if (options instanceof Signature)
        return options;

      if (this._importDER(options, enc))
        return;

      assert(options.r && options.s, 'Signature without r or s');
      this.r = new BN(options.r, 16);
      this.s = new BN(options.s, 16);
      if (options.recoveryParam === undefined)
        this.recoveryParam = null;
      else
        this.recoveryParam = options.recoveryParam;
    }
    module.exports = Signature;

    function Position() {
      this.place = 0;
    }

    function getLength(buf, p) {
      var initial = buf[p.place++];
      if (!(initial & 0x80)) {
        return initial;
      }
      var octetLen = initial & 0xf;
      var val = 0;
      for (var i = 0, off = p.place; i < octetLen; i++, off++) {
        val <<= 8;
        val |= buf[off];
      }
      p.place = off;
      return val;
    }

    function rmPadding(buf) {
      var i = 0;
      var len = buf.length - 1;
      while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
        i++;
      }
      if (i === 0) {
        return buf;
      }
      return buf.slice(i);
    }

    Signature.prototype._importDER = function _importDER(data, enc) {
      data = utils.toArray(data, enc);
      var p = new Position();
      if (data[p.place++] !== 0x30) {
        return false;
      }
      var len = getLength(data, p);
      if ((len + p.place) !== data.length) {
        return false;
      }
      if (data[p.place++] !== 0x02) {
        return false;
      }
      var rlen = getLength(data, p);
      var r = data.slice(p.place, rlen + p.place);
      p.place += rlen;
      if (data[p.place++] !== 0x02) {
        return false;
      }
      var slen = getLength(data, p);
      if (data.length !== slen + p.place) {
        return false;
      }
      var s = data.slice(p.place, slen + p.place);
      if (r[0] === 0 && (r[1] & 0x80)) {
        r = r.slice(1);
      }
      if (s[0] === 0 && (s[1] & 0x80)) {
        s = s.slice(1);
      }

      this.r = new BN(r);
      this.s = new BN(s);
      this.recoveryParam = null;

      return true;
    };

    function constructLength(arr, len) {
      if (len < 0x80) {
        arr.push(len);
        return;
      }
      var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
      arr.push(octets | 0x80);
      while (--octets) {
        arr.push((len >>> (octets << 3)) & 0xff);
      }
      arr.push(len);
    }

    Signature.prototype.toDER = function toDER(enc) {
      var r = this.r.toArray();
      var s = this.s.toArray();

      // Pad values
      if (r[0] & 0x80)
        r = [ 0 ].concat(r);
      // Pad values
      if (s[0] & 0x80)
        s = [ 0 ].concat(s);

      r = rmPadding(r);
      s = rmPadding(s);

      while (!s[0] && !(s[1] & 0x80)) {
        s = s.slice(1);
      }
      var arr = [ 0x02 ];
      constructLength(arr, r.length);
      arr = arr.concat(r);
      arr.push(0x02);
      constructLength(arr, s.length);
      var backHalf = arr.concat(s);
      var res = [ 0x30 ];
      constructLength(res, backHalf.length);
      res = res.concat(backHalf);
      return utils.encode(res, enc);
    };

  },{"../../elliptic":9,"bn.js":3}],19:[function(require,module,exports){
    'use strict';

    var hash = require('hash.js');
    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;
    var parseBytes = utils.parseBytes;
    var KeyPair = require('./key');
    var Signature = require('./signature');

    function EDDSA(curve) {
      assert(curve === 'ed25519', 'only tested with ed25519 so far');

      if (!(this instanceof EDDSA))
        return new EDDSA(curve);

      var curve = elliptic.curves[curve].curve;
      this.curve = curve;
      this.g = curve.g;
      this.g.precompute(curve.n.bitLength() + 1);

      this.pointClass = curve.point().constructor;
      this.encodingLength = Math.ceil(curve.n.bitLength() / 8);
      this.hash = hash.sha512;
    }

    module.exports = EDDSA;

    /**
     * @param {Array|String} message - message bytes
     * @param {Array|String|KeyPair} secret - secret bytes or a keypair
     * @returns {Signature} - signature
     */
    EDDSA.prototype.sign = function sign(message, secret) {
      message = parseBytes(message);
      var key = this.keyFromSecret(secret);
      var r = this.hashInt(key.messagePrefix(), message);
      var R = this.g.mul(r);
      var Rencoded = this.encodePoint(R);
      var s_ = this.hashInt(Rencoded, key.pubBytes(), message)
        .mul(key.priv());
      var S = r.add(s_).umod(this.curve.n);
      return this.makeSignature({ R: R, S: S, Rencoded: Rencoded });
    };

    /**
     * @param {Array} message - message bytes
     * @param {Array|String|Signature} sig - sig bytes
     * @param {Array|String|Point|KeyPair} pub - public key
     * @returns {Boolean} - true if public key matches sig of message
     */
    EDDSA.prototype.verify = function verify(message, sig, pub) {
      message = parseBytes(message);
      sig = this.makeSignature(sig);
      var key = this.keyFromPublic(pub);
      var h = this.hashInt(sig.Rencoded(), key.pubBytes(), message);
      var SG = this.g.mul(sig.S());
      var RplusAh = sig.R().add(key.pub().mul(h));
      return RplusAh.eq(SG);
    };

    EDDSA.prototype.hashInt = function hashInt() {
      var hash = this.hash();
      for (var i = 0; i < arguments.length; i++)
        hash.update(arguments[i]);
      return utils.intFromLE(hash.digest()).umod(this.curve.n);
    };

    EDDSA.prototype.keyFromPublic = function keyFromPublic(pub) {
      return KeyPair.fromPublic(this, pub);
    };

    EDDSA.prototype.keyFromSecret = function keyFromSecret(secret) {
      return KeyPair.fromSecret(this, secret);
    };

    EDDSA.prototype.makeSignature = function makeSignature(sig) {
      if (sig instanceof Signature)
        return sig;
      return new Signature(this, sig);
    };

    /**
     * * https://tools.ietf.org/html/draft-josefsson-eddsa-ed25519-03#section-5.2
     *
     * EDDSA defines methods for encoding and decoding points and integers. These are
     * helper convenience methods, that pass along to utility functions implied
     * parameters.
     *
     */
    EDDSA.prototype.encodePoint = function encodePoint(point) {
      var enc = point.getY().toArray('le', this.encodingLength);
      enc[this.encodingLength - 1] |= point.getX().isOdd() ? 0x80 : 0;
      return enc;
    };

    EDDSA.prototype.decodePoint = function decodePoint(bytes) {
      bytes = utils.parseBytes(bytes);

      var lastIx = bytes.length - 1;
      var normed = bytes.slice(0, lastIx).concat(bytes[lastIx] & ~0x80);
      var xIsOdd = (bytes[lastIx] & 0x80) !== 0;

      var y = utils.intFromLE(normed);
      return this.curve.pointFromY(y, xIsOdd);
    };

    EDDSA.prototype.encodeInt = function encodeInt(num) {
      return num.toArray('le', this.encodingLength);
    };

    EDDSA.prototype.decodeInt = function decodeInt(bytes) {
      return utils.intFromLE(bytes);
    };

    EDDSA.prototype.isPoint = function isPoint(val) {
      return val instanceof this.pointClass;
    };

  },{"../../elliptic":9,"./key":20,"./signature":21,"hash.js":28}],20:[function(require,module,exports){
    'use strict';

    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;
    var parseBytes = utils.parseBytes;
    var cachedProperty = utils.cachedProperty;

    /**
     * @param {EDDSA} eddsa - instance
     * @param {Object} params - public/private key parameters
     *
     * @param {Array<Byte>} [params.secret] - secret seed bytes
     * @param {Point} [params.pub] - public key point (aka `A` in eddsa terms)
     * @param {Array<Byte>} [params.pub] - public key point encoded as bytes
     *
     */
    function KeyPair(eddsa, params) {
      this.eddsa = eddsa;
      this._secret = parseBytes(params.secret);
      if (eddsa.isPoint(params.pub))
        this._pub = params.pub;
      else
        this._pubBytes = parseBytes(params.pub);
    }

    KeyPair.fromPublic = function fromPublic(eddsa, pub) {
      if (pub instanceof KeyPair)
        return pub;
      return new KeyPair(eddsa, { pub: pub });
    };

    KeyPair.fromSecret = function fromSecret(eddsa, secret) {
      if (secret instanceof KeyPair)
        return secret;
      return new KeyPair(eddsa, { secret: secret });
    };

    KeyPair.prototype.secret = function secret() {
      return this._secret;
    };

    cachedProperty(KeyPair, 'pubBytes', function pubBytes() {
      return this.eddsa.encodePoint(this.pub());
    });

    cachedProperty(KeyPair, 'pub', function pub() {
      if (this._pubBytes)
        return this.eddsa.decodePoint(this._pubBytes);
      return this.eddsa.g.mul(this.priv());
    });

    cachedProperty(KeyPair, 'privBytes', function privBytes() {
      var eddsa = this.eddsa;
      var hash = this.hash();
      var lastIx = eddsa.encodingLength - 1;

      var a = hash.slice(0, eddsa.encodingLength);
      a[0] &= 248;
      a[lastIx] &= 127;
      a[lastIx] |= 64;

      return a;
    });

    cachedProperty(KeyPair, 'priv', function priv() {
      return this.eddsa.decodeInt(this.privBytes());
    });

    cachedProperty(KeyPair, 'hash', function hash() {
      return this.eddsa.hash().update(this.secret()).digest();
    });

    cachedProperty(KeyPair, 'messagePrefix', function messagePrefix() {
      return this.hash().slice(this.eddsa.encodingLength);
    });

    KeyPair.prototype.sign = function sign(message) {
      assert(this._secret, 'KeyPair can only verify');
      return this.eddsa.sign(message, this);
    };

    KeyPair.prototype.verify = function verify(message, sig) {
      return this.eddsa.verify(message, sig, this);
    };

    KeyPair.prototype.getSecret = function getSecret(enc) {
      assert(this._secret, 'KeyPair is public only');
      return utils.encode(this.secret(), enc);
    };

    KeyPair.prototype.getPublic = function getPublic(enc) {
      return utils.encode(this.pubBytes(), enc);
    };

    module.exports = KeyPair;

  },{"../../elliptic":9}],21:[function(require,module,exports){
    'use strict';

    var BN = require('bn.js');
    var elliptic = require('../../elliptic');
    var utils = elliptic.utils;
    var assert = utils.assert;
    var cachedProperty = utils.cachedProperty;
    var parseBytes = utils.parseBytes;

    /**
     * @param {EDDSA} eddsa - eddsa instance
     * @param {Array<Bytes>|Object} sig -
     * @param {Array<Bytes>|Point} [sig.R] - R point as Point or bytes
     * @param {Array<Bytes>|bn} [sig.S] - S scalar as bn or bytes
     * @param {Array<Bytes>} [sig.Rencoded] - R point encoded
     * @param {Array<Bytes>} [sig.Sencoded] - S scalar encoded
     */
    function Signature(eddsa, sig) {
      this.eddsa = eddsa;

      if (typeof sig !== 'object')
        sig = parseBytes(sig);

      if (Array.isArray(sig)) {
        sig = {
          R: sig.slice(0, eddsa.encodingLength),
          S: sig.slice(eddsa.encodingLength)
        };
      }

      assert(sig.R && sig.S, 'Signature without R or S');

      if (eddsa.isPoint(sig.R))
        this._R = sig.R;
      if (sig.S instanceof BN)
        this._S = sig.S;

      this._Rencoded = Array.isArray(sig.R) ? sig.R : sig.Rencoded;
      this._Sencoded = Array.isArray(sig.S) ? sig.S : sig.Sencoded;
    }

    cachedProperty(Signature, 'S', function S() {
      return this.eddsa.decodeInt(this.Sencoded());
    });

    cachedProperty(Signature, 'R', function R() {
      return this.eddsa.decodePoint(this.Rencoded());
    });

    cachedProperty(Signature, 'Rencoded', function Rencoded() {
      return this.eddsa.encodePoint(this.R());
    });

    cachedProperty(Signature, 'Sencoded', function Sencoded() {
      return this.eddsa.encodeInt(this.S());
    });

    Signature.prototype.toBytes = function toBytes() {
      return this.Rencoded().concat(this.Sencoded());
    };

    Signature.prototype.toHex = function toHex() {
      return utils.encode(this.toBytes(), 'hex').toUpperCase();
    };

    module.exports = Signature;

  },{"../../elliptic":9,"bn.js":3}],22:[function(require,module,exports){
    module.exports = {
      doubles: {
        step: 4,
        points: [
          [
            'e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a',
            'f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821'
          ],
          [
            '8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508',
            '11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf'
          ],
          [
            '175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739',
            'd3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695'
          ],
          [
            '363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640',
            '4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9'
          ],
          [
            '8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c',
            '4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36'
          ],
          [
            '723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda',
            '96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f'
          ],
          [
            'eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa',
            '5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999'
          ],
          [
            '100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0',
            'cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09'
          ],
          [
            'e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d',
            '9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d'
          ],
          [
            'feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d',
            'e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088'
          ],
          [
            'da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1',
            '9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d'
          ],
          [
            '53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0',
            '5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8'
          ],
          [
            '8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047',
            '10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a'
          ],
          [
            '385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862',
            '283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453'
          ],
          [
            '6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7',
            '7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160'
          ],
          [
            '3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd',
            '56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0'
          ],
          [
            '85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83',
            '7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6'
          ],
          [
            '948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a',
            '53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589'
          ],
          [
            '6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8',
            'bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17'
          ],
          [
            'e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d',
            '4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda'
          ],
          [
            'e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725',
            '7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd'
          ],
          [
            '213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754',
            '4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2'
          ],
          [
            '4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c',
            '17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6'
          ],
          [
            'fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6',
            '6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f'
          ],
          [
            '76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39',
            'c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01'
          ],
          [
            'c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891',
            '893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3'
          ],
          [
            'd895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b',
            'febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f'
          ],
          [
            'b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03',
            '2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7'
          ],
          [
            'e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d',
            'eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78'
          ],
          [
            'a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070',
            '7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1'
          ],
          [
            '90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4',
            'e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150'
          ],
          [
            '8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da',
            '662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82'
          ],
          [
            'e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11',
            '1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc'
          ],
          [
            '8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e',
            'efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b'
          ],
          [
            'e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41',
            '2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51'
          ],
          [
            'b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef',
            '67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45'
          ],
          [
            'd68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8',
            'db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120'
          ],
          [
            '324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d',
            '648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84'
          ],
          [
            '4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96',
            '35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d'
          ],
          [
            '9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd',
            'ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d'
          ],
          [
            '6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5',
            '9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8'
          ],
          [
            'a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266',
            '40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8'
          ],
          [
            '7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71',
            '34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac'
          ],
          [
            '928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac',
            'c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f'
          ],
          [
            '85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751',
            '1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962'
          ],
          [
            'ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e',
            '493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907'
          ],
          [
            '827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241',
            'c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec'
          ],
          [
            'eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3',
            'be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d'
          ],
          [
            'e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f',
            '4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414'
          ],
          [
            '1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19',
            'aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd'
          ],
          [
            '146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be',
            'b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0'
          ],
          [
            'fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9',
            '6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811'
          ],
          [
            'da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2',
            '8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1'
          ],
          [
            'a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13',
            '7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c'
          ],
          [
            '174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c',
            'ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73'
          ],
          [
            '959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba',
            '2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd'
          ],
          [
            'd2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151',
            'e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405'
          ],
          [
            '64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073',
            'd99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589'
          ],
          [
            '8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458',
            '38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e'
          ],
          [
            '13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b',
            '69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27'
          ],
          [
            'bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366',
            'd3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1'
          ],
          [
            '8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa',
            '40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482'
          ],
          [
            '8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0',
            '620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945'
          ],
          [
            'dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787',
            '7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573'
          ],
          [
            'f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e',
            'ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82'
          ]
        ]
      },
      naf: {
        wnd: 7,
        points: [
          [
            'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
            '388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672'
          ],
          [
            '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
            'd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6'
          ],
          [
            '5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc',
            '6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da'
          ],
          [
            'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe',
            'cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37'
          ],
          [
            '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
            'd984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b'
          ],
          [
            'f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8',
            'ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81'
          ],
          [
            'd7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e',
            '581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58'
          ],
          [
            'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
            '4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77'
          ],
          [
            '2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c',
            '85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a'
          ],
          [
            '352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5',
            '321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c'
          ],
          [
            '2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f',
            '2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67'
          ],
          [
            '9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714',
            '73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402'
          ],
          [
            'daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729',
            'a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55'
          ],
          [
            'c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db',
            '2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482'
          ],
          [
            '6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4',
            'e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82'
          ],
          [
            '1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5',
            'b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396'
          ],
          [
            '605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479',
            '2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49'
          ],
          [
            '62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d',
            '80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf'
          ],
          [
            '80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f',
            '1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a'
          ],
          [
            '7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb',
            'd0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7'
          ],
          [
            'd528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9',
            'eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933'
          ],
          [
            '49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963',
            '758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a'
          ],
          [
            '77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74',
            '958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6'
          ],
          [
            'f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530',
            'e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37'
          ],
          [
            '463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b',
            '5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e'
          ],
          [
            'f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247',
            'cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6'
          ],
          [
            'caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1',
            'cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476'
          ],
          [
            '2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120',
            '4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40'
          ],
          [
            '7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435',
            '91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61'
          ],
          [
            '754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18',
            '673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683'
          ],
          [
            'e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8',
            '59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5'
          ],
          [
            '186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb',
            '3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b'
          ],
          [
            'df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f',
            '55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417'
          ],
          [
            '5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143',
            'efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868'
          ],
          [
            '290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba',
            'e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a'
          ],
          [
            'af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45',
            'f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6'
          ],
          [
            '766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a',
            '744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996'
          ],
          [
            '59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e',
            'c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e'
          ],
          [
            'f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8',
            'e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d'
          ],
          [
            '7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c',
            '30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2'
          ],
          [
            '948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519',
            'e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e'
          ],
          [
            '7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab',
            '100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437'
          ],
          [
            '3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca',
            'ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311'
          ],
          [
            'd3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf',
            '8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4'
          ],
          [
            '1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610',
            '68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575'
          ],
          [
            '733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4',
            'f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d'
          ],
          [
            '15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c',
            'd56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d'
          ],
          [
            'a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940',
            'edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629'
          ],
          [
            'e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980',
            'a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06'
          ],
          [
            '311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3',
            '66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374'
          ],
          [
            '34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf',
            '9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee'
          ],
          [
            'f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63',
            '4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1'
          ],
          [
            'd7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448',
            'fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b'
          ],
          [
            '32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf',
            '5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661'
          ],
          [
            '7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5',
            '8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6'
          ],
          [
            'ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6',
            '8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e'
          ],
          [
            '16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5',
            '5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d'
          ],
          [
            'eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99',
            'f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc'
          ],
          [
            '78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51',
            'f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4'
          ],
          [
            '494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5',
            '42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c'
          ],
          [
            'a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5',
            '204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b'
          ],
          [
            'c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997',
            '4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913'
          ],
          [
            '841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881',
            '73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154'
          ],
          [
            '5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5',
            '39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865'
          ],
          [
            '36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66',
            'd2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc'
          ],
          [
            '336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726',
            'ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224'
          ],
          [
            '8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede',
            '6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e'
          ],
          [
            '1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94',
            '60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6'
          ],
          [
            '85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31',
            '3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511'
          ],
          [
            '29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51',
            'b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b'
          ],
          [
            'a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252',
            'ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2'
          ],
          [
            '4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5',
            'cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c'
          ],
          [
            'd24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b',
            '6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3'
          ],
          [
            'ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4',
            '322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d'
          ],
          [
            'af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f',
            '6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700'
          ],
          [
            'e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889',
            '2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4'
          ],
          [
            '591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246',
            'b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196'
          ],
          [
            '11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984',
            '998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4'
          ],
          [
            '3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a',
            'b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257'
          ],
          [
            'cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030',
            'bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13'
          ],
          [
            'c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197',
            '6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096'
          ],
          [
            'c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593',
            'c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38'
          ],
          [
            'a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef',
            '21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f'
          ],
          [
            '347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38',
            '60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448'
          ],
          [
            'da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a',
            '49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a'
          ],
          [
            'c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111',
            '5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4'
          ],
          [
            '4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502',
            '7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437'
          ],
          [
            '3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea',
            'be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7'
          ],
          [
            'cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26',
            '8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d'
          ],
          [
            'b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986',
            '39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a'
          ],
          [
            'd4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e',
            '62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54'
          ],
          [
            '48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4',
            '25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77'
          ],
          [
            'dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda',
            'ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517'
          ],
          [
            '6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859',
            'cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10'
          ],
          [
            'e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f',
            'f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125'
          ],
          [
            'eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c',
            '6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e'
          ],
          [
            '13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942',
            'fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1'
          ],
          [
            'ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a',
            '1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2'
          ],
          [
            'b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80',
            '5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423'
          ],
          [
            'ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d',
            '438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8'
          ],
          [
            '8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1',
            'cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758'
          ],
          [
            '52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63',
            'c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375'
          ],
          [
            'e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352',
            '6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d'
          ],
          [
            '7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193',
            'ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec'
          ],
          [
            '5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00',
            '9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0'
          ],
          [
            '32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58',
            'ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c'
          ],
          [
            'e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7',
            'd3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4'
          ],
          [
            '8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8',
            'c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f'
          ],
          [
            '4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e',
            '67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649'
          ],
          [
            '3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d',
            'cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826'
          ],
          [
            '674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b',
            '299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5'
          ],
          [
            'd32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f',
            'f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87'
          ],
          [
            '30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6',
            '462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b'
          ],
          [
            'be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297',
            '62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc'
          ],
          [
            '93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a',
            '7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c'
          ],
          [
            'b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c',
            'ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f'
          ],
          [
            'd5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52',
            '4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a'
          ],
          [
            'd3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb',
            'bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46'
          ],
          [
            '463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065',
            'bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f'
          ],
          [
            '7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917',
            '603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03'
          ],
          [
            '74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9',
            'cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08'
          ],
          [
            '30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3',
            '553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8'
          ],
          [
            '9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57',
            '712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373'
          ],
          [
            '176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66',
            'ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3'
          ],
          [
            '75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8',
            '9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8'
          ],
          [
            '809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721',
            '9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1'
          ],
          [
            '1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180',
            '4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9'
          ]
        ]
      }
    };

  },{}],23:[function(require,module,exports){
    'use strict';

    var utils = exports;
    var BN = require('bn.js');
    var minAssert = require('minimalistic-assert');
    var minUtils = require('minimalistic-crypto-utils');

    utils.assert = minAssert;
    utils.toArray = minUtils.toArray;
    utils.zero2 = minUtils.zero2;
    utils.toHex = minUtils.toHex;
    utils.encode = minUtils.encode;

// Represent num in a w-NAF form
    function getNAF(num, w) {
      var naf = [];
      var ws = 1 << (w + 1);
      var k = num.clone();
      while (k.cmpn(1) >= 0) {
        var z;
        if (k.isOdd()) {
          var mod = k.andln(ws - 1);
          if (mod > (ws >> 1) - 1)
            z = (ws >> 1) - mod;
          else
            z = mod;
          k.isubn(z);
        } else {
          z = 0;
        }
        naf.push(z);

        // Optimization, shift by word if possible
        var shift = (k.cmpn(0) !== 0 && k.andln(ws - 1) === 0) ? (w + 1) : 1;
        for (var i = 1; i < shift; i++)
          naf.push(0);
        k.iushrn(shift);
      }

      return naf;
    }
    utils.getNAF = getNAF;

// Represent k1, k2 in a Joint Sparse Form
    function getJSF(k1, k2) {
      var jsf = [
        [],
        []
      ];

      k1 = k1.clone();
      k2 = k2.clone();
      var d1 = 0;
      var d2 = 0;
      while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {

        // First phase
        var m14 = (k1.andln(3) + d1) & 3;
        var m24 = (k2.andln(3) + d2) & 3;
        if (m14 === 3)
          m14 = -1;
        if (m24 === 3)
          m24 = -1;
        var u1;
        if ((m14 & 1) === 0) {
          u1 = 0;
        } else {
          var m8 = (k1.andln(7) + d1) & 7;
          if ((m8 === 3 || m8 === 5) && m24 === 2)
            u1 = -m14;
          else
            u1 = m14;
        }
        jsf[0].push(u1);

        var u2;
        if ((m24 & 1) === 0) {
          u2 = 0;
        } else {
          var m8 = (k2.andln(7) + d2) & 7;
          if ((m8 === 3 || m8 === 5) && m14 === 2)
            u2 = -m24;
          else
            u2 = m24;
        }
        jsf[1].push(u2);

        // Second phase
        if (2 * d1 === u1 + 1)
          d1 = 1 - d1;
        if (2 * d2 === u2 + 1)
          d2 = 1 - d2;
        k1.iushrn(1);
        k2.iushrn(1);
      }

      return jsf;
    }
    utils.getJSF = getJSF;

    function cachedProperty(obj, name, computer) {
      var key = '_' + name;
      obj.prototype[name] = function cachedProperty() {
        return this[key] !== undefined ? this[key] :
          this[key] = computer.call(this);
      };
    }
    utils.cachedProperty = cachedProperty;

    function parseBytes(bytes) {
      return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') :
        bytes;
    }
    utils.parseBytes = parseBytes;

    function intFromLE(bytes) {
      return new BN(bytes, 'hex', 'le');
    }
    utils.intFromLE = intFromLE;


  },{"bn.js":3,"minimalistic-assert":49,"minimalistic-crypto-utils":50}],24:[function(require,module,exports){
    module.exports={
      "_from": "elliptic@^6.2.3",
      "_id": "elliptic@6.4.0",
      "_inBundle": false,
      "_integrity": "sha1-ysmvh2LIWDYYcAPI3+GT5eLq5d8=",
      "_location": "/elliptic",
      "_phantomChildren": {},
      "_requested": {
        "type": "range",
        "registry": true,
        "raw": "elliptic@^6.2.3",
        "name": "elliptic",
        "escapedName": "elliptic",
        "rawSpec": "^6.2.3",
        "saveSpec": null,
        "fetchSpec": "^6.2.3"
      },
      "_requiredBy": [
        "/secp256k1"
      ],
      "_resolved": "https://registry.npmjs.org/elliptic/-/elliptic-6.4.0.tgz",
      "_shasum": "cac9af8762c85836187003c8dfe193e5e2eae5df",
      "_spec": "elliptic@^6.2.3",
      "_where": "/Users/robertlie/ethjs/node_modules/secp256k1",
      "author": {
        "name": "Fedor Indutny",
        "email": "fedor@indutny.com"
      },
      "bugs": {
        "url": "https://github.com/indutny/elliptic/issues"
      },
      "bundleDependencies": false,
      "dependencies": {
        "bn.js": "^4.4.0",
        "brorand": "^1.0.1",
        "hash.js": "^1.0.0",
        "hmac-drbg": "^1.0.0",
        "inherits": "^2.0.1",
        "minimalistic-assert": "^1.0.0",
        "minimalistic-crypto-utils": "^1.0.0"
      },
      "deprecated": false,
      "description": "EC cryptography",
      "devDependencies": {
        "brfs": "^1.4.3",
        "coveralls": "^2.11.3",
        "grunt": "^0.4.5",
        "grunt-browserify": "^5.0.0",
        "grunt-cli": "^1.2.0",
        "grunt-contrib-connect": "^1.0.0",
        "grunt-contrib-copy": "^1.0.0",
        "grunt-contrib-uglify": "^1.0.1",
        "grunt-mocha-istanbul": "^3.0.1",
        "grunt-saucelabs": "^8.6.2",
        "istanbul": "^0.4.2",
        "jscs": "^2.9.0",
        "jshint": "^2.6.0",
        "mocha": "^2.1.0"
      },
      "files": [
        "lib"
      ],
      "homepage": "https://github.com/indutny/elliptic",
      "keywords": [
        "EC",
        "Elliptic",
        "curve",
        "Cryptography"
      ],
      "license": "MIT",
      "main": "lib/elliptic.js",
      "name": "elliptic",
      "repository": {
        "type": "git",
        "url": "git+ssh://git@github.com/indutny/elliptic.git"
      },
      "scripts": {
        "jscs": "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
        "jshint": "jscs benchmarks/*.js lib/*.js lib/**/*.js lib/**/**/*.js test/index.js",
        "lint": "npm run jscs && npm run jshint",
        "test": "npm run lint && npm run unit",
        "unit": "istanbul test _mocha --reporter=spec test/index.js",
        "version": "grunt dist && git add dist/"
      },
      "version": "6.4.0"
    }

  },{}],25:[function(require,module,exports){
    (function (Buffer){
      'use strict';

      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

      var createKeccakHash = require('keccak');
      var secp256k1 = require('secp256k1');
      var assert = require('assert');
      var rlp = require('rlp');
      var BN = require('bn.js');
      var createHash = require('create-hash');
      Object.assign(exports, require('ethjs-util'));

      /**
       * the max integer that this VM can handle (a ```BN```)
       * @var {BN} MAX_INTEGER
       */
      exports.MAX_INTEGER = new BN('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 16);

      /**
       * 2^256 (a ```BN```)
       * @var {BN} TWO_POW256
       */
      exports.TWO_POW256 = new BN('10000000000000000000000000000000000000000000000000000000000000000', 16);

      /**
       * SHA3-256 hash of null (a ```String```)
       * @var {String} SHA3_NULL_S
       */
      exports.SHA3_NULL_S = 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';

      /**
       * SHA3-256 hash of null (a ```Buffer```)
       * @var {Buffer} SHA3_NULL
       */
      exports.SHA3_NULL = Buffer.from(exports.SHA3_NULL_S, 'hex');

      /**
       * SHA3-256 of an RLP of an empty array (a ```String```)
       * @var {String} SHA3_RLP_ARRAY_S
       */
      exports.SHA3_RLP_ARRAY_S = '1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347';

      /**
       * SHA3-256 of an RLP of an empty array (a ```Buffer```)
       * @var {Buffer} SHA3_RLP_ARRAY
       */
      exports.SHA3_RLP_ARRAY = Buffer.from(exports.SHA3_RLP_ARRAY_S, 'hex');

      /**
       * SHA3-256 hash of the RLP of null  (a ```String```)
       * @var {String} SHA3_RLP_S
       */
      exports.SHA3_RLP_S = '56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

      /**
       * SHA3-256 hash of the RLP of null (a ```Buffer```)
       * @var {Buffer} SHA3_RLP
       */
      exports.SHA3_RLP = Buffer.from(exports.SHA3_RLP_S, 'hex');

      /**
       * [`BN`](https://github.com/indutny/bn.js)
       * @var {Function}
       */
      exports.BN = BN;

      /**
       * [`rlp`](https://github.com/ethereumjs/rlp)
       * @var {Function}
       */
      exports.rlp = rlp;

      /**
       * [`secp256k1`](https://github.com/cryptocoinjs/secp256k1-node/)
       * @var {Object}
       */
      exports.secp256k1 = secp256k1;

      /**
       * Returns a buffer filled with 0s
       * @method zeros
       * @param {Number} bytes  the number of bytes the buffer should be
       * @return {Buffer}
       */
      exports.zeros = function (bytes) {
        return Buffer.allocUnsafe(bytes).fill(0);
      };

      /**
       * Left Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
       * Or it truncates the beginning if it exceeds.
       * @method lsetLength
       * @param {Buffer|Array} msg the value to pad
       * @param {Number} length the number of bytes the output should be
       * @param {Boolean} [right=false] whether to start padding form the left or right
       * @return {Buffer|Array}
       */
      exports.setLengthLeft = exports.setLength = function (msg, length, right) {
        var buf = exports.zeros(length);
        msg = exports.toBuffer(msg);
        if (right) {
          if (msg.length < length) {
            msg.copy(buf);
            return buf;
          }
          return msg.slice(0, length);
        } else {
          if (msg.length < length) {
            msg.copy(buf, length - msg.length);
            return buf;
          }
          return msg.slice(-length);
        }
      };

      /**
       * Right Pads an `Array` or `Buffer` with leading zeros till it has `length` bytes.
       * Or it truncates the beginning if it exceeds.
       * @param {Buffer|Array} msg the value to pad
       * @param {Number} length the number of bytes the output should be
       * @return {Buffer|Array}
       */
      exports.setLengthRight = function (msg, length) {
        return exports.setLength(msg, length, true);
      };

      /**
       * Trims leading zeros from a `Buffer` or an `Array`
       * @param {Buffer|Array|String} a
       * @return {Buffer|Array|String}
       */
      exports.unpad = exports.stripZeros = function (a) {
        a = exports.stripHexPrefix(a);
        var first = a[0];
        while (a.length > 0 && first.toString() === '0') {
          a = a.slice(1);
          first = a[0];
        }
        return a;
      };
      /**
       * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`, null/undefined, `BN` and other objects with a `toArray()` method.
       * @param {*} v the value
       */
      exports.toBuffer = function (v) {
        if (!Buffer.isBuffer(v)) {
          if (Array.isArray(v)) {
            v = Buffer.from(v);
          } else if (typeof v === 'string') {
            if (exports.isHexString(v)) {
              v = Buffer.from(exports.padToEven(exports.stripHexPrefix(v)), 'hex');
            } else {
              v = Buffer.from(v);
            }
          } else if (typeof v === 'number') {
            v = exports.intToBuffer(v);
          } else if (v === null || v === undefined) {
            v = Buffer.allocUnsafe(0);
          } else if (v.toArray) {
            // converts a BN to a Buffer
            v = Buffer.from(v.toArray());
          } else {
            throw new Error('invalid type');
          }
        }
        return v;
      };

      /**
       * Converts a `Buffer` to a `Number`
       * @param {Buffer} buf
       * @return {Number}
       * @throws If the input number exceeds 53 bits.
       */
      exports.bufferToInt = function (buf) {
        return new BN(exports.toBuffer(buf)).toNumber();
      };

      /**
       * Converts a `Buffer` into a hex `String`
       * @param {Buffer} buf
       * @return {String}
       */
      exports.bufferToHex = function (buf) {
        buf = exports.toBuffer(buf);
        return '0x' + buf.toString('hex');
      };

      /**
       * Interprets a `Buffer` as a signed integer and returns a `BN`. Assumes 256-bit numbers.
       * @param {Buffer} num
       * @return {BN}
       */
      exports.fromSigned = function (num) {
        return new BN(num).fromTwos(256);
      };

      /**
       * Converts a `BN` to an unsigned integer and returns it as a `Buffer`. Assumes 256-bit numbers.
       * @param {BN} num
       * @return {Buffer}
       */
      exports.toUnsigned = function (num) {
        return Buffer.from(num.toTwos(256).toArray());
      };

      /**
       * Creates SHA-3 hash of the input
       * @param {Buffer|Array|String|Number} a the input data
       * @param {Number} [bits=256] the SHA width
       * @return {Buffer}
       */
      exports.sha3 = function (a, bits) {
        a = exports.toBuffer(a);
        if (!bits) bits = 256;

        return createKeccakHash('keccak' + bits).update(a).digest();
      };

      /**
       * Creates SHA256 hash of the input
       * @param {Buffer|Array|String|Number} a the input data
       * @return {Buffer}
       */
      exports.sha256 = function (a) {
        a = exports.toBuffer(a);
        return createHash('sha256').update(a).digest();
      };

      /**
       * Creates RIPEMD160 hash of the input
       * @param {Buffer|Array|String|Number} a the input data
       * @param {Boolean} padded whether it should be padded to 256 bits or not
       * @return {Buffer}
       */
      exports.ripemd160 = function (a, padded) {
        a = exports.toBuffer(a);
        var hash = createHash('rmd160').update(a).digest();
        if (padded === true) {
          return exports.setLength(hash, 32);
        } else {
          return hash;
        }
      };

      /**
       * Creates SHA-3 hash of the RLP encoded version of the input
       * @param {Buffer|Array|String|Number} a the input data
       * @return {Buffer}
       */
      exports.rlphash = function (a) {
        return exports.sha3(rlp.encode(a));
      };

      /**
       * Checks if the private key satisfies the rules of the curve secp256k1.
       * @param {Buffer} privateKey
       * @return {Boolean}
       */
      exports.isValidPrivate = function (privateKey) {
        return secp256k1.privateKeyVerify(privateKey);
      };

      /**
       * Checks if the public key satisfies the rules of the curve secp256k1
       * and the requirements of Ethereum.
       * @param {Buffer} publicKey The two points of an uncompressed key, unless sanitize is enabled
       * @param {Boolean} [sanitize=false] Accept public keys in other formats
       * @return {Boolean}
       */
      exports.isValidPublic = function (publicKey, sanitize) {
        if (publicKey.length === 64) {
          // Convert to SEC1 for secp256k1
          return secp256k1.publicKeyVerify(Buffer.concat([Buffer.from([4]), publicKey]));
        }

        if (!sanitize) {
          return false;
        }

        return secp256k1.publicKeyVerify(publicKey);
      };

      /**
       * Returns the ethereum address of a given public key.
       * Accepts "Ethereum public keys" and SEC1 encoded keys.
       * @param {Buffer} pubKey The two points of an uncompressed key, unless sanitize is enabled
       * @param {Boolean} [sanitize=false] Accept public keys in other formats
       * @return {Buffer}
       */
      exports.pubToAddress = exports.publicToAddress = function (pubKey, sanitize) {
        pubKey = exports.toBuffer(pubKey);
        if (sanitize && pubKey.length !== 64) {
          pubKey = secp256k1.publicKeyConvert(pubKey, false).slice(1);
        }
        assert(pubKey.length === 64);
        // Only take the lower 160bits of the hash
        return exports.sha3(pubKey).slice(-20);
      };

      /**
       * Returns the ethereum public key of a given private key
       * @param {Buffer} privateKey A private key must be 256 bits wide
       * @return {Buffer}
       */
      var privateToPublic = exports.privateToPublic = function (privateKey) {
        privateKey = exports.toBuffer(privateKey);
        // skip the type flag and use the X, Y points
        return secp256k1.publicKeyCreate(privateKey, false).slice(1);
      };

      /**
       * Converts a public key to the Ethereum format.
       * @param {Buffer} publicKey
       * @return {Buffer}
       */
      exports.importPublic = function (publicKey) {
        publicKey = exports.toBuffer(publicKey);
        if (publicKey.length !== 64) {
          publicKey = secp256k1.publicKeyConvert(publicKey, false).slice(1);
        }
        return publicKey;
      };

      /**
       * ECDSA sign
       * @param {Buffer} msgHash
       * @param {Buffer} privateKey
       * @return {Object}
       */
      exports.ecsign = function (msgHash, privateKey) {
        var sig = secp256k1.sign(msgHash, privateKey);

        var ret = {};
        ret.r = sig.signature.slice(0, 32);
        ret.s = sig.signature.slice(32, 64);
        ret.v = sig.recovery + 27;
        return ret;
      };

      /**
       * Returns the keccak-256 hash of `message`, prefixed with the header used by the `eth_sign` RPC call.
       * The output of this function can be fed into `ecsign` to produce the same signature as the `eth_sign`
       * call for a given `message`, or fed to `ecrecover` along with a signature to recover the public key
       * used to produce the signature.
       * @param message
       * @returns {Buffer} hash
       */
      exports.hashPersonalMessage = function (message) {
        var prefix = exports.toBuffer('\x19Ethereum Signed Message:\n' + message.length.toString());
        return exports.sha3(Buffer.concat([prefix, message]));
      };

      /**
       * ECDSA public key recovery from signature
       * @param {Buffer} msgHash
       * @param {Number} v
       * @param {Buffer} r
       * @param {Buffer} s
       * @return {Buffer} publicKey
       */
      exports.ecrecover = function (msgHash, v, r, s) {
        var signature = Buffer.concat([exports.setLength(r, 32), exports.setLength(s, 32)], 64);
        var recovery = v - 27;
        if (recovery !== 0 && recovery !== 1) {
          throw new Error('Invalid signature v value');
        }
        var senderPubKey = secp256k1.recover(msgHash, signature, recovery);
        return secp256k1.publicKeyConvert(senderPubKey, false).slice(1);
      };

      /**
       * Convert signature parameters into the format of `eth_sign` RPC method
       * @param {Number} v
       * @param {Buffer} r
       * @param {Buffer} s
       * @return {String} sig
       */
      exports.toRpcSig = function (v, r, s) {
        // NOTE: with potential introduction of chainId this might need to be updated
        if (v !== 27 && v !== 28) {
          throw new Error('Invalid recovery id');
        }

        // geth (and the RPC eth_sign method) uses the 65 byte format used by Bitcoin
        // FIXME: this might change in the future - https://github.com/ethereum/go-ethereum/issues/2053
        return exports.bufferToHex(Buffer.concat([exports.setLengthLeft(r, 32), exports.setLengthLeft(s, 32), exports.toBuffer(v - 27)]));
      };

      /**
       * Convert signature format of the `eth_sign` RPC method to signature parameters
       * NOTE: all because of a bug in geth: https://github.com/ethereum/go-ethereum/issues/2053
       * @param {String} sig
       * @return {Object}
       */
      exports.fromRpcSig = function (sig) {
        sig = exports.toBuffer(sig);

        // NOTE: with potential introduction of chainId this might need to be updated
        if (sig.length !== 65) {
          throw new Error('Invalid signature length');
        }

        var v = sig[64];
        // support both versions of `eth_sign` responses
        if (v < 27) {
          v += 27;
        }

        return {
          v: v,
          r: sig.slice(0, 32),
          s: sig.slice(32, 64)
        };
      };

      /**
       * Returns the ethereum address of a given private key
       * @param {Buffer} privateKey A private key must be 256 bits wide
       * @return {Buffer}
       */
      exports.privateToAddress = function (privateKey) {
        return exports.publicToAddress(privateToPublic(privateKey));
      };

      /**
       * Checks if the address is a valid. Accepts checksummed addresses too
       * @param {String} address
       * @return {Boolean}
       */
      exports.isValidAddress = function (address) {
        return (/^0x[0-9a-fA-F]{40}$/i.test(address)
        );
      };

      /**
       * Returns a checksummed address
       * @param {String} address
       * @return {String}
       */
      exports.toChecksumAddress = function (address) {
        address = exports.stripHexPrefix(address).toLowerCase();
        var hash = exports.sha3(address).toString('hex');
        var ret = '0x';

        for (var i = 0; i < address.length; i++) {
          if (parseInt(hash[i], 16) >= 8) {
            ret += address[i].toUpperCase();
          } else {
            ret += address[i];
          }
        }

        return ret;
      };

      /**
       * Checks if the address is a valid checksummed address
       * @param {Buffer} address
       * @return {Boolean}
       */
      exports.isValidChecksumAddress = function (address) {
        return exports.isValidAddress(address) && exports.toChecksumAddress(address) === address;
      };

      /**
       * Generates an address of a newly created contract
       * @param {Buffer} from the address which is creating this new address
       * @param {Buffer} nonce the nonce of the from account
       * @return {Buffer}
       */
      exports.generateAddress = function (from, nonce) {
        from = exports.toBuffer(from);
        nonce = new BN(nonce);

        if (nonce.isZero()) {
          // in RLP we want to encode null in the case of zero nonce
          // read the RLP documentation for an answer if you dare
          nonce = null;
        } else {
          nonce = Buffer.from(nonce.toArray());
        }

        // Only take the lower 160bits of the hash
        return exports.rlphash([from, nonce]).slice(-20);
      };

      /**
       * Returns true if the supplied address belongs to a precompiled account
       * @param {Buffer|String} address
       * @return {Boolean}
       */
      exports.isPrecompiled = function (address) {
        var a = exports.unpad(address);
        return a.length === 1 && a[0] > 0 && a[0] < 5;
      };

      /**
       * Adds "0x" to a given `String` if it does not already start with "0x"
       * @param {String} str
       * @return {String}
       */
      exports.addHexPrefix = function (str) {
        if (typeof str !== 'string') {
          return str;
        }

        return exports.isHexPrefixed(str) ? str : '0x' + str;
      };

      /**
       * Validate ECDSA signature
       * @method isValidSignature
       * @param {Buffer} v
       * @param {Buffer} r
       * @param {Buffer} s
       * @param {Boolean} [homestead=true]
       * @return {Boolean}
       */

      exports.isValidSignature = function (v, r, s, homestead) {
        var SECP256K1_N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16);
        var SECP256K1_N = new BN('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 16);

        if (r.length !== 32 || s.length !== 32) {
          return false;
        }

        if (v !== 27 && v !== 28) {
          return false;
        }

        r = new BN(r);
        s = new BN(s);

        if (r.isZero() || r.gt(SECP256K1_N) || s.isZero() || s.gt(SECP256K1_N)) {
          return false;
        }

        if (homestead === false && new BN(s).cmp(SECP256K1_N_DIV_2) === 1) {
          return false;
        }

        return true;
      };

      /**
       * Converts a `Buffer` or `Array` to JSON
       * @param {Buffer|Array} ba
       * @return {Array|String|null}
       */
      exports.baToJSON = function (ba) {
        if (Buffer.isBuffer(ba)) {
          return '0x' + ba.toString('hex');
        } else if (ba instanceof Array) {
          var array = [];
          for (var i = 0; i < ba.length; i++) {
            array.push(exports.baToJSON(ba[i]));
          }
          return array;
        }
      };

      /**
       * Defines properties on a `Object`. It make the assumption that underlying data is binary.
       * @param {Object} self the `Object` to define properties on
       * @param {Array} fields an array fields to define. Fields can contain:
       * * `name` - the name of the properties
       * * `length` - the number of bytes the field can have
       * * `allowLess` - if the field can be less than the length
       * * `allowEmpty`
       * @param {*} data data to be validated against the definitions
       */
      exports.defineProperties = function (self, fields, data) {
        self.raw = [];
        self._fields = [];

        // attach the `toJSON`
        self.toJSON = function (label) {
          if (label) {
            var obj = {};
            self._fields.forEach(function (field) {
              obj[field] = '0x' + self[field].toString('hex');
            });
            return obj;
          }
          return exports.baToJSON(this.raw);
        };

        self.serialize = function serialize() {
          return rlp.encode(self.raw);
        };

        fields.forEach(function (field, i) {
          self._fields.push(field.name);
          function getter() {
            return self.raw[i];
          }
          function setter(v) {
            v = exports.toBuffer(v);

            if (v.toString('hex') === '00' && !field.allowZero) {
              v = Buffer.allocUnsafe(0);
            }

            if (field.allowLess && field.length) {
              v = exports.stripZeros(v);
              assert(field.length >= v.length, 'The field ' + field.name + ' must not have more ' + field.length + ' bytes');
            } else if (!(field.allowZero && v.length === 0) && field.length) {
              assert(field.length === v.length, 'The field ' + field.name + ' must have byte length of ' + field.length);
            }

            self.raw[i] = v;
          }

          Object.defineProperty(self, field.name, {
            enumerable: true,
            configurable: true,
            get: getter,
            set: setter
          });

          if (field.default) {
            self[field.name] = field.default;
          }

          // attach alias
          if (field.alias) {
            Object.defineProperty(self, field.alias, {
              enumerable: false,
              configurable: true,
              set: setter,
              get: getter
            });
          }
        });

        // if the constuctor is passed data
        if (data) {
          if (typeof data === 'string') {
            data = Buffer.from(exports.stripHexPrefix(data), 'hex');
          }

          if (Buffer.isBuffer(data)) {
            data = rlp.decode(data);
          }

          if (Array.isArray(data)) {
            if (data.length > self._fields.length) {
              throw new Error('wrong number of fields in data');
            }

            // make sure all the items are buffers
            data.forEach(function (d, i) {
              self[self._fields[i]] = exports.toBuffer(d);
            });
          } else if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
            var keys = Object.keys(data);
            fields.forEach(function (field) {
              if (keys.indexOf(field.name) !== -1) self[field.name] = data[field.name];
              if (keys.indexOf(field.alias) !== -1) self[field.alias] = data[field.alias];
            });
          } else {
            throw new Error('invalid data');
          }
        }
      };

    }).call(this,require("buffer").Buffer)
  },{"assert":69,"bn.js":3,"buffer":72,"create-hash":6,"ethjs-util":26,"keccak":43,"rlp":52,"secp256k1":54}],26:[function(require,module,exports){
    (function (Buffer){
      'use strict';

      var isHexPrefixed = require('is-hex-prefixed');
      var stripHexPrefix = require('strip-hex-prefix');

      /**
       * Pads a `String` to have an even length
       * @param {String} value
       * @return {String} output
       */
      function padToEven(value) {
        var a = value; // eslint-disable-line

        if (typeof a !== 'string') {
          throw new Error('[ethjs-util] while padding to even, value must be string, is currently ' + typeof a + ', while padToEven.');
        }

        if (a.length % 2) {
          a = '0' + a;
        }

        return a;
      }

      /**
       * Converts a `Number` into a hex `String`
       * @param {Number} i
       * @return {String}
       */
      function intToHex(i) {
        var hex = i.toString(16); // eslint-disable-line

        return '0x' + padToEven(hex);
      }

      /**
       * Converts an `Number` to a `Buffer`
       * @param {Number} i
       * @return {Buffer}
       */
      function intToBuffer(i) {
        var hex = intToHex(i);

        return new Buffer(hex.slice(2), 'hex');
      }

      /**
       * Get the binary size of a string
       * @param {String} str
       * @return {Number}
       */
      function getBinarySize(str) {
        if (typeof str !== 'string') {
          throw new Error('[ethjs-util] while getting binary size, method getBinarySize requires input \'str\' to be type String, got \'' + typeof str + '\'.');
        }

        return Buffer.byteLength(str, 'utf8');
      }

      /**
       * Returns TRUE if the first specified array contains all elements
       * from the second one. FALSE otherwise.
       *
       * @param {array} superset
       * @param {array} subset
       *
       * @returns {boolean}
       */
      function arrayContainsArray(superset, subset, some) {
        if (Array.isArray(superset) !== true) {
          throw new Error('[ethjs-util] method arrayContainsArray requires input \'superset\' to be an array got type \'' + typeof superset + '\'');
        }
        if (Array.isArray(subset) !== true) {
          throw new Error('[ethjs-util] method arrayContainsArray requires input \'subset\' to be an array got type \'' + typeof subset + '\'');
        }

        return subset[Boolean(some) && 'some' || 'every'](function (value) {
          return superset.indexOf(value) >= 0;
        });
      }

      /**
       * Should be called to get utf8 from it's hex representation
       *
       * @method toUtf8
       * @param {String} string in hex
       * @returns {String} ascii string representation of hex value
       */
      function toUtf8(hex) {
        var bufferValue = new Buffer(padToEven(stripHexPrefix(hex).replace(/^0+|0+$/g, '')), 'hex');

        return bufferValue.toString('utf8');
      }

      /**
       * Should be called to get ascii from it's hex representation
       *
       * @method toAscii
       * @param {String} string in hex
       * @returns {String} ascii string representation of hex value
       */
      function toAscii(hex) {
        var str = ''; // eslint-disable-line
        var i = 0,
          l = hex.length; // eslint-disable-line

        if (hex.substring(0, 2) === '0x') {
          i = 2;
        }

        for (; i < l; i += 2) {
          var code = parseInt(hex.substr(i, 2), 16);
          str += String.fromCharCode(code);
        }

        return str;
      }

      /**
       * Should be called to get hex representation (prefixed by 0x) of utf8 string
       *
       * @method fromUtf8
       * @param {String} string
       * @param {Number} optional padding
       * @returns {String} hex representation of input string
       */
      function fromUtf8(stringValue) {
        var str = new Buffer(stringValue, 'utf8');

        return '0x' + padToEven(str.toString('hex')).replace(/^0+|0+$/g, '');
      }

      /**
       * Should be called to get hex representation (prefixed by 0x) of ascii string
       *
       * @method fromAscii
       * @param {String} string
       * @param {Number} optional padding
       * @returns {String} hex representation of input string
       */
      function fromAscii(stringValue) {
        var hex = ''; // eslint-disable-line
        for (var i = 0; i < stringValue.length; i++) {
          // eslint-disable-line
          var code = stringValue.charCodeAt(i);
          var n = code.toString(16);
          hex += n.length < 2 ? '0' + n : n;
        }

        return '0x' + hex;
      }

      /**
       * getKeys([{a: 1, b: 2}, {a: 3, b: 4}], 'a') => [1, 3]
       *
       * @method getKeys get specific key from inner object array of objects
       * @param {String} params
       * @param {String} key
       * @param {Boolean} allowEmpty
       * @returns {Array} output just a simple array of output keys
       */
      function getKeys(params, key, allowEmpty) {
        if (!Array.isArray(params)) {
          throw new Error('[ethjs-util] method getKeys expecting type Array as \'params\' input, got \'' + typeof params + '\'');
        }
        if (typeof key !== 'string') {
          throw new Error('[ethjs-util] method getKeys expecting type String for input \'key\' got \'' + typeof key + '\'.');
        }

        var result = []; // eslint-disable-line

        for (var i = 0; i < params.length; i++) {
          // eslint-disable-line
          var value = params[i][key]; // eslint-disable-line
          if (allowEmpty && !value) {
            value = '';
          } else if (typeof value !== 'string') {
            throw new Error('invalid abi');
          }
          result.push(value);
        }

        return result;
      }

      /**
       * Is the string a hex string.
       *
       * @method check if string is hex string of specific length
       * @param {String} value
       * @param {Number} length
       * @returns {Boolean} output the string is a hex string
       */
      function isHexString(value, length) {
        if (typeof value !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) {
          return false;
        }

        if (length && value.length !== 2 + 2 * length) {
          return false;
        }

        return true;
      }

      module.exports = {
        arrayContainsArray: arrayContainsArray,
        intToBuffer: intToBuffer,
        getBinarySize: getBinarySize,
        isHexPrefixed: isHexPrefixed,
        stripHexPrefix: stripHexPrefix,
        padToEven: padToEven,
        intToHex: intToHex,
        fromAscii: fromAscii,
        fromUtf8: fromUtf8,
        toAscii: toAscii,
        toUtf8: toUtf8,
        getKeys: getKeys,
        isHexString: isHexString
      };
    }).call(this,require("buffer").Buffer)
  },{"buffer":72,"is-hex-prefixed":42,"strip-hex-prefix":68}],27:[function(require,module,exports){
    (function (Buffer){
      'use strict'
      var Transform = require('stream').Transform
      var inherits = require('inherits')

      function HashBase (blockSize) {
        Transform.call(this)

        this._block = new Buffer(blockSize)
        this._blockSize = blockSize
        this._blockOffset = 0
        this._length = [0, 0, 0, 0]

        this._finalized = false
      }

      inherits(HashBase, Transform)

      HashBase.prototype._transform = function (chunk, encoding, callback) {
        var error = null
        try {
          if (encoding !== 'buffer') chunk = new Buffer(chunk, encoding)
          this.update(chunk)
        } catch (err) {
          error = err
        }

        callback(error)
      }

      HashBase.prototype._flush = function (callback) {
        var error = null
        try {
          this.push(this._digest())
        } catch (err) {
          error = err
        }

        callback(error)
      }

      HashBase.prototype.update = function (data, encoding) {
        if (!Buffer.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer')
        if (this._finalized) throw new Error('Digest already called')
        if (!Buffer.isBuffer(data)) data = new Buffer(data, encoding || 'binary')

        // consume data
        var block = this._block
        var offset = 0
        while (this._blockOffset + data.length - offset >= this._blockSize) {
          for (var i = this._blockOffset; i < this._blockSize;) block[i++] = data[offset++]
          this._update()
          this._blockOffset = 0
        }
        while (offset < data.length) block[this._blockOffset++] = data[offset++]

        // update length
        for (var j = 0, carry = data.length * 8; carry > 0; ++j) {
          this._length[j] += carry
          carry = (this._length[j] / 0x0100000000) | 0
          if (carry > 0) this._length[j] -= 0x0100000000 * carry
        }

        return this
      }

      HashBase.prototype._update = function (data) {
        throw new Error('_update is not implemented')
      }

      HashBase.prototype.digest = function (encoding) {
        if (this._finalized) throw new Error('Digest already called')
        this._finalized = true

        var digest = this._digest()
        if (encoding !== undefined) digest = digest.toString(encoding)
        return digest
      }

      HashBase.prototype._digest = function () {
        throw new Error('_digest is not implemented')
      }

      module.exports = HashBase

    }).call(this,require("buffer").Buffer)
  },{"buffer":72,"inherits":41,"stream":95}],28:[function(require,module,exports){
    var hash = exports;

    hash.utils = require('./hash/utils');
    hash.common = require('./hash/common');
    hash.sha = require('./hash/sha');
    hash.ripemd = require('./hash/ripemd');
    hash.hmac = require('./hash/hmac');

// Proxy hash functions to the main object
    hash.sha1 = hash.sha.sha1;
    hash.sha256 = hash.sha.sha256;
    hash.sha224 = hash.sha.sha224;
    hash.sha384 = hash.sha.sha384;
    hash.sha512 = hash.sha.sha512;
    hash.ripemd160 = hash.ripemd.ripemd160;

  },{"./hash/common":29,"./hash/hmac":30,"./hash/ripemd":31,"./hash/sha":32,"./hash/utils":39}],29:[function(require,module,exports){
    'use strict';

    var utils = require('./utils');
    var assert = require('minimalistic-assert');

    function BlockHash() {
      this.pending = null;
      this.pendingTotal = 0;
      this.blockSize = this.constructor.blockSize;
      this.outSize = this.constructor.outSize;
      this.hmacStrength = this.constructor.hmacStrength;
      this.padLength = this.constructor.padLength / 8;
      this.endian = 'big';

      this._delta8 = this.blockSize / 8;
      this._delta32 = this.blockSize / 32;
    }
    exports.BlockHash = BlockHash;

    BlockHash.prototype.update = function update(msg, enc) {
      // Convert message to array, pad it, and join into 32bit blocks
      msg = utils.toArray(msg, enc);
      if (!this.pending)
        this.pending = msg;
      else
        this.pending = this.pending.concat(msg);
      this.pendingTotal += msg.length;

      // Enough data, try updating
      if (this.pending.length >= this._delta8) {
        msg = this.pending;

        // Process pending data in blocks
        var r = msg.length % this._delta8;
        this.pending = msg.slice(msg.length - r, msg.length);
        if (this.pending.length === 0)
          this.pending = null;

        msg = utils.join32(msg, 0, msg.length - r, this.endian);
        for (var i = 0; i < msg.length; i += this._delta32)
          this._update(msg, i, i + this._delta32);
      }

      return this;
    };

    BlockHash.prototype.digest = function digest(enc) {
      this.update(this._pad());
      assert(this.pending === null);

      return this._digest(enc);
    };

    BlockHash.prototype._pad = function pad() {
      var len = this.pendingTotal;
      var bytes = this._delta8;
      var k = bytes - ((len + this.padLength) % bytes);
      var res = new Array(k + this.padLength);
      res[0] = 0x80;
      for (var i = 1; i < k; i++)
        res[i] = 0;

      // Append length
      len <<= 3;
      if (this.endian === 'big') {
        for (var t = 8; t < this.padLength; t++)
          res[i++] = 0;

        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = (len >>> 24) & 0xff;
        res[i++] = (len >>> 16) & 0xff;
        res[i++] = (len >>> 8) & 0xff;
        res[i++] = len & 0xff;
      } else {
        res[i++] = len & 0xff;
        res[i++] = (len >>> 8) & 0xff;
        res[i++] = (len >>> 16) & 0xff;
        res[i++] = (len >>> 24) & 0xff;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;

        for (t = 8; t < this.padLength; t++)
          res[i++] = 0;
      }

      return res;
    };

  },{"./utils":39,"minimalistic-assert":49}],30:[function(require,module,exports){
    'use strict';

    var utils = require('./utils');
    var assert = require('minimalistic-assert');

    function Hmac(hash, key, enc) {
      if (!(this instanceof Hmac))
        return new Hmac(hash, key, enc);
      this.Hash = hash;
      this.blockSize = hash.blockSize / 8;
      this.outSize = hash.outSize / 8;
      this.inner = null;
      this.outer = null;

      this._init(utils.toArray(key, enc));
    }
    module.exports = Hmac;

    Hmac.prototype._init = function init(key) {
      // Shorten key, if needed
      if (key.length > this.blockSize)
        key = new this.Hash().update(key).digest();
      assert(key.length <= this.blockSize);

      // Add padding to key
      for (var i = key.length; i < this.blockSize; i++)
        key.push(0);

      for (i = 0; i < key.length; i++)
        key[i] ^= 0x36;
      this.inner = new this.Hash().update(key);

      // 0x36 ^ 0x5c = 0x6a
      for (i = 0; i < key.length; i++)
        key[i] ^= 0x6a;
      this.outer = new this.Hash().update(key);
    };

    Hmac.prototype.update = function update(msg, enc) {
      this.inner.update(msg, enc);
      return this;
    };

    Hmac.prototype.digest = function digest(enc) {
      this.outer.update(this.inner.digest());
      return this.outer.digest(enc);
    };

  },{"./utils":39,"minimalistic-assert":49}],31:[function(require,module,exports){
    'use strict';

    var utils = require('./utils');
    var common = require('./common');

    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_3 = utils.sum32_3;
    var sum32_4 = utils.sum32_4;
    var BlockHash = common.BlockHash;

    function RIPEMD160() {
      if (!(this instanceof RIPEMD160))
        return new RIPEMD160();

      BlockHash.call(this);

      this.h = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
      this.endian = 'little';
    }
    utils.inherits(RIPEMD160, BlockHash);
    exports.ripemd160 = RIPEMD160;

    RIPEMD160.blockSize = 512;
    RIPEMD160.outSize = 160;
    RIPEMD160.hmacStrength = 192;
    RIPEMD160.padLength = 64;

    RIPEMD160.prototype._update = function update(msg, start) {
      var A = this.h[0];
      var B = this.h[1];
      var C = this.h[2];
      var D = this.h[3];
      var E = this.h[4];
      var Ah = A;
      var Bh = B;
      var Ch = C;
      var Dh = D;
      var Eh = E;
      for (var j = 0; j < 80; j++) {
        var T = sum32(
          rotl32(
            sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)),
            s[j]),
          E);
        A = E;
        E = D;
        D = rotl32(C, 10);
        C = B;
        B = T;
        T = sum32(
          rotl32(
            sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
            sh[j]),
          Eh);
        Ah = Eh;
        Eh = Dh;
        Dh = rotl32(Ch, 10);
        Ch = Bh;
        Bh = T;
      }
      T = sum32_3(this.h[1], C, Dh);
      this.h[1] = sum32_3(this.h[2], D, Eh);
      this.h[2] = sum32_3(this.h[3], E, Ah);
      this.h[3] = sum32_3(this.h[4], A, Bh);
      this.h[4] = sum32_3(this.h[0], B, Ch);
      this.h[0] = T;
    };

    RIPEMD160.prototype._digest = function digest(enc) {
      if (enc === 'hex')
        return utils.toHex32(this.h, 'little');
      else
        return utils.split32(this.h, 'little');
    };

    function f(j, x, y, z) {
      if (j <= 15)
        return x ^ y ^ z;
      else if (j <= 31)
        return (x & y) | ((~x) & z);
      else if (j <= 47)
        return (x | (~y)) ^ z;
      else if (j <= 63)
        return (x & z) | (y & (~z));
      else
        return x ^ (y | (~z));
    }

    function K(j) {
      if (j <= 15)
        return 0x00000000;
      else if (j <= 31)
        return 0x5a827999;
      else if (j <= 47)
        return 0x6ed9eba1;
      else if (j <= 63)
        return 0x8f1bbcdc;
      else
        return 0xa953fd4e;
    }

    function Kh(j) {
      if (j <= 15)
        return 0x50a28be6;
      else if (j <= 31)
        return 0x5c4dd124;
      else if (j <= 47)
        return 0x6d703ef3;
      else if (j <= 63)
        return 0x7a6d76e9;
      else
        return 0x00000000;
    }

    var r = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
      3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
      1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
      4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
    ];

    var rh = [
      5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
      6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
      15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
      8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
      12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
    ];

    var s = [
      11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
      7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
      11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
      11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
      9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
    ];

    var sh = [
      8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
      9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
      9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
      15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
      8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
    ];

  },{"./common":29,"./utils":39}],32:[function(require,module,exports){
    'use strict';

    exports.sha1 = require('./sha/1');
    exports.sha224 = require('./sha/224');
    exports.sha256 = require('./sha/256');
    exports.sha384 = require('./sha/384');
    exports.sha512 = require('./sha/512');

  },{"./sha/1":33,"./sha/224":34,"./sha/256":35,"./sha/384":36,"./sha/512":37}],33:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');
    var common = require('../common');
    var shaCommon = require('./common');

    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_5 = utils.sum32_5;
    var ft_1 = shaCommon.ft_1;
    var BlockHash = common.BlockHash;

    var sha1_K = [
      0x5A827999, 0x6ED9EBA1,
      0x8F1BBCDC, 0xCA62C1D6
    ];

    function SHA1() {
      if (!(this instanceof SHA1))
        return new SHA1();

      BlockHash.call(this);
      this.h = [
        0x67452301, 0xefcdab89, 0x98badcfe,
        0x10325476, 0xc3d2e1f0 ];
      this.W = new Array(80);
    }

    utils.inherits(SHA1, BlockHash);
    module.exports = SHA1;

    SHA1.blockSize = 512;
    SHA1.outSize = 160;
    SHA1.hmacStrength = 80;
    SHA1.padLength = 64;

    SHA1.prototype._update = function _update(msg, start) {
      var W = this.W;

      for (var i = 0; i < 16; i++)
        W[i] = msg[start + i];

      for(; i < W.length; i++)
        W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];

      for (i = 0; i < W.length; i++) {
        var s = ~~(i / 20);
        var t = sum32_5(rotl32(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
        e = d;
        d = c;
        c = rotl32(b, 30);
        b = a;
        a = t;
      }

      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
    };

    SHA1.prototype._digest = function digest(enc) {
      if (enc === 'hex')
        return utils.toHex32(this.h, 'big');
      else
        return utils.split32(this.h, 'big');
    };

  },{"../common":29,"../utils":39,"./common":38}],34:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');
    var SHA256 = require('./256');

    function SHA224() {
      if (!(this instanceof SHA224))
        return new SHA224();

      SHA256.call(this);
      this.h = [
        0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
        0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4 ];
    }
    utils.inherits(SHA224, SHA256);
    module.exports = SHA224;

    SHA224.blockSize = 512;
    SHA224.outSize = 224;
    SHA224.hmacStrength = 192;
    SHA224.padLength = 64;

    SHA224.prototype._digest = function digest(enc) {
      // Just truncate output
      if (enc === 'hex')
        return utils.toHex32(this.h.slice(0, 7), 'big');
      else
        return utils.split32(this.h.slice(0, 7), 'big');
    };


  },{"../utils":39,"./256":35}],35:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');
    var common = require('../common');
    var shaCommon = require('./common');
    var assert = require('minimalistic-assert');

    var sum32 = utils.sum32;
    var sum32_4 = utils.sum32_4;
    var sum32_5 = utils.sum32_5;
    var ch32 = shaCommon.ch32;
    var maj32 = shaCommon.maj32;
    var s0_256 = shaCommon.s0_256;
    var s1_256 = shaCommon.s1_256;
    var g0_256 = shaCommon.g0_256;
    var g1_256 = shaCommon.g1_256;

    var BlockHash = common.BlockHash;

    var sha256_K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function SHA256() {
      if (!(this instanceof SHA256))
        return new SHA256();

      BlockHash.call(this);
      this.h = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
      ];
      this.k = sha256_K;
      this.W = new Array(64);
    }
    utils.inherits(SHA256, BlockHash);
    module.exports = SHA256;

    SHA256.blockSize = 512;
    SHA256.outSize = 256;
    SHA256.hmacStrength = 192;
    SHA256.padLength = 64;

    SHA256.prototype._update = function _update(msg, start) {
      var W = this.W;

      for (var i = 0; i < 16; i++)
        W[i] = msg[start + i];
      for (; i < W.length; i++)
        W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);

      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];
      var f = this.h[5];
      var g = this.h[6];
      var h = this.h[7];

      assert(this.k.length === W.length);
      for (i = 0; i < W.length; i++) {
        var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
        var T2 = sum32(s0_256(a), maj32(a, b, c));
        h = g;
        g = f;
        f = e;
        e = sum32(d, T1);
        d = c;
        c = b;
        b = a;
        a = sum32(T1, T2);
      }

      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
      this.h[5] = sum32(this.h[5], f);
      this.h[6] = sum32(this.h[6], g);
      this.h[7] = sum32(this.h[7], h);
    };

    SHA256.prototype._digest = function digest(enc) {
      if (enc === 'hex')
        return utils.toHex32(this.h, 'big');
      else
        return utils.split32(this.h, 'big');
    };

  },{"../common":29,"../utils":39,"./common":38,"minimalistic-assert":49}],36:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');

    var SHA512 = require('./512');

    function SHA384() {
      if (!(this instanceof SHA384))
        return new SHA384();

      SHA512.call(this);
      this.h = [
        0xcbbb9d5d, 0xc1059ed8,
        0x629a292a, 0x367cd507,
        0x9159015a, 0x3070dd17,
        0x152fecd8, 0xf70e5939,
        0x67332667, 0xffc00b31,
        0x8eb44a87, 0x68581511,
        0xdb0c2e0d, 0x64f98fa7,
        0x47b5481d, 0xbefa4fa4 ];
    }
    utils.inherits(SHA384, SHA512);
    module.exports = SHA384;

    SHA384.blockSize = 1024;
    SHA384.outSize = 384;
    SHA384.hmacStrength = 192;
    SHA384.padLength = 128;

    SHA384.prototype._digest = function digest(enc) {
      if (enc === 'hex')
        return utils.toHex32(this.h.slice(0, 12), 'big');
      else
        return utils.split32(this.h.slice(0, 12), 'big');
    };

  },{"../utils":39,"./512":37}],37:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');
    var common = require('../common');
    var assert = require('minimalistic-assert');

    var rotr64_hi = utils.rotr64_hi;
    var rotr64_lo = utils.rotr64_lo;
    var shr64_hi = utils.shr64_hi;
    var shr64_lo = utils.shr64_lo;
    var sum64 = utils.sum64;
    var sum64_hi = utils.sum64_hi;
    var sum64_lo = utils.sum64_lo;
    var sum64_4_hi = utils.sum64_4_hi;
    var sum64_4_lo = utils.sum64_4_lo;
    var sum64_5_hi = utils.sum64_5_hi;
    var sum64_5_lo = utils.sum64_5_lo;

    var BlockHash = common.BlockHash;

    var sha512_K = [
      0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
      0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
      0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
      0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
      0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
      0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
      0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
      0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
      0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
      0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
      0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
      0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
      0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
      0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
      0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
      0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
      0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
      0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
      0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
      0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
      0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
      0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
      0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
      0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
      0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
      0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
      0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
      0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
      0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
      0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
      0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
      0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
      0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
      0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
      0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
      0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
      0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
      0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
      0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
      0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
    ];

    function SHA512() {
      if (!(this instanceof SHA512))
        return new SHA512();

      BlockHash.call(this);
      this.h = [
        0x6a09e667, 0xf3bcc908,
        0xbb67ae85, 0x84caa73b,
        0x3c6ef372, 0xfe94f82b,
        0xa54ff53a, 0x5f1d36f1,
        0x510e527f, 0xade682d1,
        0x9b05688c, 0x2b3e6c1f,
        0x1f83d9ab, 0xfb41bd6b,
        0x5be0cd19, 0x137e2179 ];
      this.k = sha512_K;
      this.W = new Array(160);
    }
    utils.inherits(SHA512, BlockHash);
    module.exports = SHA512;

    SHA512.blockSize = 1024;
    SHA512.outSize = 512;
    SHA512.hmacStrength = 192;
    SHA512.padLength = 128;

    SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
      var W = this.W;

      // 32 x 32bit words
      for (var i = 0; i < 32; i++)
        W[i] = msg[start + i];
      for (; i < W.length; i += 2) {
        var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);  // i - 2
        var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
        var c1_hi = W[i - 14];  // i - 7
        var c1_lo = W[i - 13];
        var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);  // i - 15
        var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
        var c3_hi = W[i - 32];  // i - 16
        var c3_lo = W[i - 31];

        W[i] = sum64_4_hi(
          c0_hi, c0_lo,
          c1_hi, c1_lo,
          c2_hi, c2_lo,
          c3_hi, c3_lo);
        W[i + 1] = sum64_4_lo(
          c0_hi, c0_lo,
          c1_hi, c1_lo,
          c2_hi, c2_lo,
          c3_hi, c3_lo);
      }
    };

    SHA512.prototype._update = function _update(msg, start) {
      this._prepareBlock(msg, start);

      var W = this.W;

      var ah = this.h[0];
      var al = this.h[1];
      var bh = this.h[2];
      var bl = this.h[3];
      var ch = this.h[4];
      var cl = this.h[5];
      var dh = this.h[6];
      var dl = this.h[7];
      var eh = this.h[8];
      var el = this.h[9];
      var fh = this.h[10];
      var fl = this.h[11];
      var gh = this.h[12];
      var gl = this.h[13];
      var hh = this.h[14];
      var hl = this.h[15];

      assert(this.k.length === W.length);
      for (var i = 0; i < W.length; i += 2) {
        var c0_hi = hh;
        var c0_lo = hl;
        var c1_hi = s1_512_hi(eh, el);
        var c1_lo = s1_512_lo(eh, el);
        var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
        var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
        var c3_hi = this.k[i];
        var c3_lo = this.k[i + 1];
        var c4_hi = W[i];
        var c4_lo = W[i + 1];

        var T1_hi = sum64_5_hi(
          c0_hi, c0_lo,
          c1_hi, c1_lo,
          c2_hi, c2_lo,
          c3_hi, c3_lo,
          c4_hi, c4_lo);
        var T1_lo = sum64_5_lo(
          c0_hi, c0_lo,
          c1_hi, c1_lo,
          c2_hi, c2_lo,
          c3_hi, c3_lo,
          c4_hi, c4_lo);

        c0_hi = s0_512_hi(ah, al);
        c0_lo = s0_512_lo(ah, al);
        c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
        c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);

        var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
        var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);

        hh = gh;
        hl = gl;

        gh = fh;
        gl = fl;

        fh = eh;
        fl = el;

        eh = sum64_hi(dh, dl, T1_hi, T1_lo);
        el = sum64_lo(dl, dl, T1_hi, T1_lo);

        dh = ch;
        dl = cl;

        ch = bh;
        cl = bl;

        bh = ah;
        bl = al;

        ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
        al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
      }

      sum64(this.h, 0, ah, al);
      sum64(this.h, 2, bh, bl);
      sum64(this.h, 4, ch, cl);
      sum64(this.h, 6, dh, dl);
      sum64(this.h, 8, eh, el);
      sum64(this.h, 10, fh, fl);
      sum64(this.h, 12, gh, gl);
      sum64(this.h, 14, hh, hl);
    };

    SHA512.prototype._digest = function digest(enc) {
      if (enc === 'hex')
        return utils.toHex32(this.h, 'big');
      else
        return utils.split32(this.h, 'big');
    };

    function ch64_hi(xh, xl, yh, yl, zh) {
      var r = (xh & yh) ^ ((~xh) & zh);
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function ch64_lo(xh, xl, yh, yl, zh, zl) {
      var r = (xl & yl) ^ ((~xl) & zl);
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function maj64_hi(xh, xl, yh, yl, zh) {
      var r = (xh & yh) ^ (xh & zh) ^ (yh & zh);
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function maj64_lo(xh, xl, yh, yl, zh, zl) {
      var r = (xl & yl) ^ (xl & zl) ^ (yl & zl);
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function s0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 28);
      var c1_hi = rotr64_hi(xl, xh, 2);  // 34
      var c2_hi = rotr64_hi(xl, xh, 7);  // 39

      var r = c0_hi ^ c1_hi ^ c2_hi;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function s0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 28);
      var c1_lo = rotr64_lo(xl, xh, 2);  // 34
      var c2_lo = rotr64_lo(xl, xh, 7);  // 39

      var r = c0_lo ^ c1_lo ^ c2_lo;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function s1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 14);
      var c1_hi = rotr64_hi(xh, xl, 18);
      var c2_hi = rotr64_hi(xl, xh, 9);  // 41

      var r = c0_hi ^ c1_hi ^ c2_hi;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function s1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 14);
      var c1_lo = rotr64_lo(xh, xl, 18);
      var c2_lo = rotr64_lo(xl, xh, 9);  // 41

      var r = c0_lo ^ c1_lo ^ c2_lo;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function g0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 1);
      var c1_hi = rotr64_hi(xh, xl, 8);
      var c2_hi = shr64_hi(xh, xl, 7);

      var r = c0_hi ^ c1_hi ^ c2_hi;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function g0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 1);
      var c1_lo = rotr64_lo(xh, xl, 8);
      var c2_lo = shr64_lo(xh, xl, 7);

      var r = c0_lo ^ c1_lo ^ c2_lo;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function g1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 19);
      var c1_hi = rotr64_hi(xl, xh, 29);  // 61
      var c2_hi = shr64_hi(xh, xl, 6);

      var r = c0_hi ^ c1_hi ^ c2_hi;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

    function g1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 19);
      var c1_lo = rotr64_lo(xl, xh, 29);  // 61
      var c2_lo = shr64_lo(xh, xl, 6);

      var r = c0_lo ^ c1_lo ^ c2_lo;
      if (r < 0)
        r += 0x100000000;
      return r;
    }

  },{"../common":29,"../utils":39,"minimalistic-assert":49}],38:[function(require,module,exports){
    'use strict';

    var utils = require('../utils');
    var rotr32 = utils.rotr32;

    function ft_1(s, x, y, z) {
      if (s === 0)
        return ch32(x, y, z);
      if (s === 1 || s === 3)
        return p32(x, y, z);
      if (s === 2)
        return maj32(x, y, z);
    }
    exports.ft_1 = ft_1;

    function ch32(x, y, z) {
      return (x & y) ^ ((~x) & z);
    }
    exports.ch32 = ch32;

    function maj32(x, y, z) {
      return (x & y) ^ (x & z) ^ (y & z);
    }
    exports.maj32 = maj32;

    function p32(x, y, z) {
      return x ^ y ^ z;
    }
    exports.p32 = p32;

    function s0_256(x) {
      return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
    }
    exports.s0_256 = s0_256;

    function s1_256(x) {
      return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
    }
    exports.s1_256 = s1_256;

    function g0_256(x) {
      return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
    }
    exports.g0_256 = g0_256;

    function g1_256(x) {
      return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
    }
    exports.g1_256 = g1_256;

  },{"../utils":39}],39:[function(require,module,exports){
    'use strict';

    var assert = require('minimalistic-assert');
    var inherits = require('inherits');

    exports.inherits = inherits;

    function toArray(msg, enc) {
      if (Array.isArray(msg))
        return msg.slice();
      if (!msg)
        return [];
      var res = [];
      if (typeof msg === 'string') {
        if (!enc) {
          for (var i = 0; i < msg.length; i++) {
            var c = msg.charCodeAt(i);
            var hi = c >> 8;
            var lo = c & 0xff;
            if (hi)
              res.push(hi, lo);
            else
              res.push(lo);
          }
        } else if (enc === 'hex') {
          msg = msg.replace(/[^a-z0-9]+/ig, '');
          if (msg.length % 2 !== 0)
            msg = '0' + msg;
          for (i = 0; i < msg.length; i += 2)
            res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
      } else {
        for (i = 0; i < msg.length; i++)
          res[i] = msg[i] | 0;
      }
      return res;
    }
    exports.toArray = toArray;

    function toHex(msg) {
      var res = '';
      for (var i = 0; i < msg.length; i++)
        res += zero2(msg[i].toString(16));
      return res;
    }
    exports.toHex = toHex;

    function htonl(w) {
      var res = (w >>> 24) |
        ((w >>> 8) & 0xff00) |
        ((w << 8) & 0xff0000) |
        ((w & 0xff) << 24);
      return res >>> 0;
    }
    exports.htonl = htonl;

    function toHex32(msg, endian) {
      var res = '';
      for (var i = 0; i < msg.length; i++) {
        var w = msg[i];
        if (endian === 'little')
          w = htonl(w);
        res += zero8(w.toString(16));
      }
      return res;
    }
    exports.toHex32 = toHex32;

    function zero2(word) {
      if (word.length === 1)
        return '0' + word;
      else
        return word;
    }
    exports.zero2 = zero2;

    function zero8(word) {
      if (word.length === 7)
        return '0' + word;
      else if (word.length === 6)
        return '00' + word;
      else if (word.length === 5)
        return '000' + word;
      else if (word.length === 4)
        return '0000' + word;
      else if (word.length === 3)
        return '00000' + word;
      else if (word.length === 2)
        return '000000' + word;
      else if (word.length === 1)
        return '0000000' + word;
      else
        return word;
    }
    exports.zero8 = zero8;

    function join32(msg, start, end, endian) {
      var len = end - start;
      assert(len % 4 === 0);
      var res = new Array(len / 4);
      for (var i = 0, k = start; i < res.length; i++, k += 4) {
        var w;
        if (endian === 'big')
          w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
        else
          w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
        res[i] = w >>> 0;
      }
      return res;
    }
    exports.join32 = join32;

    function split32(msg, endian) {
      var res = new Array(msg.length * 4);
      for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
        var m = msg[i];
        if (endian === 'big') {
          res[k] = m >>> 24;
          res[k + 1] = (m >>> 16) & 0xff;
          res[k + 2] = (m >>> 8) & 0xff;
          res[k + 3] = m & 0xff;
        } else {
          res[k + 3] = m >>> 24;
          res[k + 2] = (m >>> 16) & 0xff;
          res[k + 1] = (m >>> 8) & 0xff;
          res[k] = m & 0xff;
        }
      }
      return res;
    }
    exports.split32 = split32;

    function rotr32(w, b) {
      return (w >>> b) | (w << (32 - b));
    }
    exports.rotr32 = rotr32;

    function rotl32(w, b) {
      return (w << b) | (w >>> (32 - b));
    }
    exports.rotl32 = rotl32;

    function sum32(a, b) {
      return (a + b) >>> 0;
    }
    exports.sum32 = sum32;

    function sum32_3(a, b, c) {
      return (a + b + c) >>> 0;
    }
    exports.sum32_3 = sum32_3;

    function sum32_4(a, b, c, d) {
      return (a + b + c + d) >>> 0;
    }
    exports.sum32_4 = sum32_4;

    function sum32_5(a, b, c, d, e) {
      return (a + b + c + d + e) >>> 0;
    }
    exports.sum32_5 = sum32_5;

    function sum64(buf, pos, ah, al) {
      var bh = buf[pos];
      var bl = buf[pos + 1];

      var lo = (al + bl) >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      buf[pos] = hi >>> 0;
      buf[pos + 1] = lo;
    }
    exports.sum64 = sum64;

    function sum64_hi(ah, al, bh, bl) {
      var lo = (al + bl) >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      return hi >>> 0;
    }
    exports.sum64_hi = sum64_hi;

    function sum64_lo(ah, al, bh, bl) {
      var lo = al + bl;
      return lo >>> 0;
    }
    exports.sum64_lo = sum64_lo;

    function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
      var carry = 0;
      var lo = al;
      lo = (lo + bl) >>> 0;
      carry += lo < al ? 1 : 0;
      lo = (lo + cl) >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = (lo + dl) >>> 0;
      carry += lo < dl ? 1 : 0;

      var hi = ah + bh + ch + dh + carry;
      return hi >>> 0;
    }
    exports.sum64_4_hi = sum64_4_hi;

    function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
      var lo = al + bl + cl + dl;
      return lo >>> 0;
    }
    exports.sum64_4_lo = sum64_4_lo;

    function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var carry = 0;
      var lo = al;
      lo = (lo + bl) >>> 0;
      carry += lo < al ? 1 : 0;
      lo = (lo + cl) >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = (lo + dl) >>> 0;
      carry += lo < dl ? 1 : 0;
      lo = (lo + el) >>> 0;
      carry += lo < el ? 1 : 0;

      var hi = ah + bh + ch + dh + eh + carry;
      return hi >>> 0;
    }
    exports.sum64_5_hi = sum64_5_hi;

    function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var lo = al + bl + cl + dl + el;

      return lo >>> 0;
    }
    exports.sum64_5_lo = sum64_5_lo;

    function rotr64_hi(ah, al, num) {
      var r = (al << (32 - num)) | (ah >>> num);
      return r >>> 0;
    }
    exports.rotr64_hi = rotr64_hi;

    function rotr64_lo(ah, al, num) {
      var r = (ah << (32 - num)) | (al >>> num);
      return r >>> 0;
    }
    exports.rotr64_lo = rotr64_lo;

    function shr64_hi(ah, al, num) {
      return ah >>> num;
    }
    exports.shr64_hi = shr64_hi;

    function shr64_lo(ah, al, num) {
      var r = (ah << (32 - num)) | (al >>> num);
      return r >>> 0;
    }
    exports.shr64_lo = shr64_lo;

  },{"inherits":41,"minimalistic-assert":49}],40:[function(require,module,exports){
    'use strict';

    var hash = require('hash.js');
    var utils = require('minimalistic-crypto-utils');
    var assert = require('minimalistic-assert');

    function HmacDRBG(options) {
      if (!(this instanceof HmacDRBG))
        return new HmacDRBG(options);
      this.hash = options.hash;
      this.predResist = !!options.predResist;

      this.outLen = this.hash.outSize;
      this.minEntropy = options.minEntropy || this.hash.hmacStrength;

      this._reseed = null;
      this.reseedInterval = null;
      this.K = null;
      this.V = null;

      var entropy = utils.toArray(options.entropy, options.entropyEnc || 'hex');
      var nonce = utils.toArray(options.nonce, options.nonceEnc || 'hex');
      var pers = utils.toArray(options.pers, options.persEnc || 'hex');
      assert(entropy.length >= (this.minEntropy / 8),
        'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');
      this._init(entropy, nonce, pers);
    }
    module.exports = HmacDRBG;

    HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
      var seed = entropy.concat(nonce).concat(pers);

      this.K = new Array(this.outLen / 8);
      this.V = new Array(this.outLen / 8);
      for (var i = 0; i < this.V.length; i++) {
        this.K[i] = 0x00;
        this.V[i] = 0x01;
      }

      this._update(seed);
      this._reseed = 1;
      this.reseedInterval = 0x1000000000000;  // 2^48
    };

    HmacDRBG.prototype._hmac = function hmac() {
      return new hash.hmac(this.hash, this.K);
    };

    HmacDRBG.prototype._update = function update(seed) {
      var kmac = this._hmac()
        .update(this.V)
        .update([ 0x00 ]);
      if (seed)
        kmac = kmac.update(seed);
      this.K = kmac.digest();
      this.V = this._hmac().update(this.V).digest();
      if (!seed)
        return;

      this.K = this._hmac()
        .update(this.V)
        .update([ 0x01 ])
        .update(seed)
        .digest();
      this.V = this._hmac().update(this.V).digest();
    };

    HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
      // Optional entropy enc
      if (typeof entropyEnc !== 'string') {
        addEnc = add;
        add = entropyEnc;
        entropyEnc = null;
      }

      entropy = utils.toArray(entropy, entropyEnc);
      add = utils.toArray(add, addEnc);

      assert(entropy.length >= (this.minEntropy / 8),
        'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

      this._update(entropy.concat(add || []));
      this._reseed = 1;
    };

    HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
      if (this._reseed > this.reseedInterval)
        throw new Error('Reseed is required');

      // Optional encoding
      if (typeof enc !== 'string') {
        addEnc = add;
        add = enc;
        enc = null;
      }

      // Optional additional data
      if (add) {
        add = utils.toArray(add, addEnc || 'hex');
        this._update(add);
      }

      var temp = [];
      while (temp.length < len) {
        this.V = this._hmac().update(this.V).digest();
        temp = temp.concat(this.V);
      }

      var res = temp.slice(0, len);
      this._update(add);
      this._reseed++;
      return utils.encode(res, enc);
    };

  },{"hash.js":28,"minimalistic-assert":49,"minimalistic-crypto-utils":50}],41:[function(require,module,exports){
    if (typeof Object.create === 'function') {
      // implementation from standard node.js 'util' module
      module.exports = function inherits(ctor, superCtor) {
        ctor.super_ = superCtor
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      };
    } else {
      // old school shim for old browsers
      module.exports = function inherits(ctor, superCtor) {
        ctor.super_ = superCtor
        var TempCtor = function () {}
        TempCtor.prototype = superCtor.prototype
        ctor.prototype = new TempCtor()
        ctor.prototype.constructor = ctor
      }
    }

  },{}],42:[function(require,module,exports){
    /**
     * Returns a `Boolean` on whether or not the a `String` starts with '0x'
     * @param {String} str the string input value
     * @return {Boolean} a boolean if it is or is not hex prefixed
     * @throws if the str input is not a string
     */
    module.exports = function isHexPrefixed(str) {
      if (typeof str !== 'string') {
        throw new Error("[is-hex-prefixed] value must be type 'string', is currently type " + (typeof str) + ", while checking isHexPrefixed.");
      }

      return str.slice(0, 2) === '0x';
    }

  },{}],43:[function(require,module,exports){
    'use strict'
    module.exports = require('./lib/api')(require('./lib/keccak'))

  },{"./lib/api":44,"./lib/keccak":48}],44:[function(require,module,exports){
    'use strict'
    var createKeccak = require('./keccak')
    var createShake = require('./shake')

    module.exports = function (KeccakState) {
      var Keccak = createKeccak(KeccakState)
      var Shake = createShake(KeccakState)

      return function (algorithm, options) {
        var hash = typeof algorithm === 'string' ? algorithm.toLowerCase() : algorithm
        switch (hash) {
          case 'keccak224': return new Keccak(1152, 448, null, 224, options)
          case 'keccak256': return new Keccak(1088, 512, null, 256, options)
          case 'keccak384': return new Keccak(832, 768, null, 384, options)
          case 'keccak512': return new Keccak(576, 1024, null, 512, options)

          case 'sha3-224': return new Keccak(1152, 448, 0x06, 224, options)
          case 'sha3-256': return new Keccak(1088, 512, 0x06, 256, options)
          case 'sha3-384': return new Keccak(832, 768, 0x06, 384, options)
          case 'sha3-512': return new Keccak(576, 1024, 0x06, 512, options)

          case 'shake128': return new Shake(1344, 256, 0x1f, options)
          case 'shake256': return new Shake(1088, 512, 0x1f, options)

          default: throw new Error('Invald algorithm: ' + algorithm)
        }
      }
    }

  },{"./keccak":45,"./shake":46}],45:[function(require,module,exports){
    'use strict'
    var Buffer = require('safe-buffer').Buffer
    var Transform = require('stream').Transform
    var inherits = require('inherits')

    module.exports = function (KeccakState) {
      function Keccak (rate, capacity, delimitedSuffix, hashBitLength, options) {
        Transform.call(this, options)

        this._rate = rate
        this._capacity = capacity
        this._delimitedSuffix = delimitedSuffix
        this._hashBitLength = hashBitLength
        this._options = options

        this._state = new KeccakState()
        this._state.initialize(rate, capacity)
        this._finalized = false
      }

      inherits(Keccak, Transform)

      Keccak.prototype._transform = function (chunk, encoding, callback) {
        var error = null
        try {
          this.update(chunk, encoding)
        } catch (err) {
          error = err
        }

        callback(error)
      }

      Keccak.prototype._flush = function (callback) {
        var error = null
        try {
          this.push(this.digest())
        } catch (err) {
          error = err
        }

        callback(error)
      }

      Keccak.prototype.update = function (data, encoding) {
        if (!Buffer.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer')
        if (this._finalized) throw new Error('Digest already called')
        if (!Buffer.isBuffer(data)) data = Buffer.from(data, encoding)

        this._state.absorb(data)

        return this
      }

      Keccak.prototype.digest = function (encoding) {
        if (this._finalized) throw new Error('Digest already called')
        this._finalized = true

        if (this._delimitedSuffix) this._state.absorbLastFewBits(this._delimitedSuffix)
        var digest = this._state.squeeze(this._hashBitLength / 8)
        if (encoding !== undefined) digest = digest.toString(encoding)

        this._resetState()

        return digest
      }

      // remove result from memory
      Keccak.prototype._resetState = function () {
        this._state.initialize(this._rate, this._capacity)
        return this
      }

      // because sometimes we need hash right now and little later
      Keccak.prototype._clone = function () {
        var clone = new Keccak(this._rate, this._capacity, this._delimitedSuffix, this._hashBitLength, this._options)
        this._state.copy(clone._state)
        clone._finalized = this._finalized

        return clone
      }

      return Keccak
    }

  },{"inherits":41,"safe-buffer":53,"stream":95}],46:[function(require,module,exports){
    'use strict'
    var Buffer = require('safe-buffer').Buffer
    var Transform = require('stream').Transform
    var inherits = require('inherits')

    module.exports = function (KeccakState) {
      function Shake (rate, capacity, delimitedSuffix, options) {
        Transform.call(this, options)

        this._rate = rate
        this._capacity = capacity
        this._delimitedSuffix = delimitedSuffix
        this._options = options

        this._state = new KeccakState()
        this._state.initialize(rate, capacity)
        this._finalized = false
      }

      inherits(Shake, Transform)

      Shake.prototype._transform = function (chunk, encoding, callback) {
        var error = null
        try {
          this.update(chunk, encoding)
        } catch (err) {
          error = err
        }

        callback(error)
      }

      Shake.prototype._flush = function () {}

      Shake.prototype._read = function (size) {
        this.push(this.squeeze(size))
      }

      Shake.prototype.update = function (data, encoding) {
        if (!Buffer.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer')
        if (this._finalized) throw new Error('Squeeze already called')
        if (!Buffer.isBuffer(data)) data = Buffer.from(data, encoding)

        this._state.absorb(data)

        return this
      }

      Shake.prototype.squeeze = function (dataByteLength, encoding) {
        if (!this._finalized) {
          this._finalized = true
          this._state.absorbLastFewBits(this._delimitedSuffix)
        }

        var data = this._state.squeeze(dataByteLength)
        if (encoding !== undefined) data = data.toString(encoding)

        return data
      }

      Shake.prototype._resetState = function () {
        this._state.initialize(this._rate, this._capacity)
        return this
      }

      Shake.prototype._clone = function () {
        var clone = new Shake(this._rate, this._capacity, this._delimitedSuffix, this._options)
        this._state.copy(clone._state)
        clone._finalized = this._finalized

        return clone
      }

      return Shake
    }

  },{"inherits":41,"safe-buffer":53,"stream":95}],47:[function(require,module,exports){
    'use strict'
    var P1600_ROUND_CONSTANTS = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649, 0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771, 2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648]

    exports.p1600 = function (s) {
      for (var round = 0; round < 24; ++round) {
        // theta
        var lo0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40]
        var hi0 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41]
        var lo1 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42]
        var hi1 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43]
        var lo2 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44]
        var hi2 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45]
        var lo3 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46]
        var hi3 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47]
        var lo4 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48]
        var hi4 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49]

        var lo = lo4 ^ (lo1 << 1 | hi1 >>> 31)
        var hi = hi4 ^ (hi1 << 1 | lo1 >>> 31)
        var t1slo0 = s[0] ^ lo
        var t1shi0 = s[1] ^ hi
        var t1slo5 = s[10] ^ lo
        var t1shi5 = s[11] ^ hi
        var t1slo10 = s[20] ^ lo
        var t1shi10 = s[21] ^ hi
        var t1slo15 = s[30] ^ lo
        var t1shi15 = s[31] ^ hi
        var t1slo20 = s[40] ^ lo
        var t1shi20 = s[41] ^ hi
        lo = lo0 ^ (lo2 << 1 | hi2 >>> 31)
        hi = hi0 ^ (hi2 << 1 | lo2 >>> 31)
        var t1slo1 = s[2] ^ lo
        var t1shi1 = s[3] ^ hi
        var t1slo6 = s[12] ^ lo
        var t1shi6 = s[13] ^ hi
        var t1slo11 = s[22] ^ lo
        var t1shi11 = s[23] ^ hi
        var t1slo16 = s[32] ^ lo
        var t1shi16 = s[33] ^ hi
        var t1slo21 = s[42] ^ lo
        var t1shi21 = s[43] ^ hi
        lo = lo1 ^ (lo3 << 1 | hi3 >>> 31)
        hi = hi1 ^ (hi3 << 1 | lo3 >>> 31)
        var t1slo2 = s[4] ^ lo
        var t1shi2 = s[5] ^ hi
        var t1slo7 = s[14] ^ lo
        var t1shi7 = s[15] ^ hi
        var t1slo12 = s[24] ^ lo
        var t1shi12 = s[25] ^ hi
        var t1slo17 = s[34] ^ lo
        var t1shi17 = s[35] ^ hi
        var t1slo22 = s[44] ^ lo
        var t1shi22 = s[45] ^ hi
        lo = lo2 ^ (lo4 << 1 | hi4 >>> 31)
        hi = hi2 ^ (hi4 << 1 | lo4 >>> 31)
        var t1slo3 = s[6] ^ lo
        var t1shi3 = s[7] ^ hi
        var t1slo8 = s[16] ^ lo
        var t1shi8 = s[17] ^ hi
        var t1slo13 = s[26] ^ lo
        var t1shi13 = s[27] ^ hi
        var t1slo18 = s[36] ^ lo
        var t1shi18 = s[37] ^ hi
        var t1slo23 = s[46] ^ lo
        var t1shi23 = s[47] ^ hi
        lo = lo3 ^ (lo0 << 1 | hi0 >>> 31)
        hi = hi3 ^ (hi0 << 1 | lo0 >>> 31)
        var t1slo4 = s[8] ^ lo
        var t1shi4 = s[9] ^ hi
        var t1slo9 = s[18] ^ lo
        var t1shi9 = s[19] ^ hi
        var t1slo14 = s[28] ^ lo
        var t1shi14 = s[29] ^ hi
        var t1slo19 = s[38] ^ lo
        var t1shi19 = s[39] ^ hi
        var t1slo24 = s[48] ^ lo
        var t1shi24 = s[49] ^ hi

        // rho & pi
        var t2slo0 = t1slo0
        var t2shi0 = t1shi0
        var t2slo16 = (t1shi5 << 4 | t1slo5 >>> 28)
        var t2shi16 = (t1slo5 << 4 | t1shi5 >>> 28)
        var t2slo7 = (t1slo10 << 3 | t1shi10 >>> 29)
        var t2shi7 = (t1shi10 << 3 | t1slo10 >>> 29)
        var t2slo23 = (t1shi15 << 9 | t1slo15 >>> 23)
        var t2shi23 = (t1slo15 << 9 | t1shi15 >>> 23)
        var t2slo14 = (t1slo20 << 18 | t1shi20 >>> 14)
        var t2shi14 = (t1shi20 << 18 | t1slo20 >>> 14)
        var t2slo10 = (t1slo1 << 1 | t1shi1 >>> 31)
        var t2shi10 = (t1shi1 << 1 | t1slo1 >>> 31)
        var t2slo1 = (t1shi6 << 12 | t1slo6 >>> 20)
        var t2shi1 = (t1slo6 << 12 | t1shi6 >>> 20)
        var t2slo17 = (t1slo11 << 10 | t1shi11 >>> 22)
        var t2shi17 = (t1shi11 << 10 | t1slo11 >>> 22)
        var t2slo8 = (t1shi16 << 13 | t1slo16 >>> 19)
        var t2shi8 = (t1slo16 << 13 | t1shi16 >>> 19)
        var t2slo24 = (t1slo21 << 2 | t1shi21 >>> 30)
        var t2shi24 = (t1shi21 << 2 | t1slo21 >>> 30)
        var t2slo20 = (t1shi2 << 30 | t1slo2 >>> 2)
        var t2shi20 = (t1slo2 << 30 | t1shi2 >>> 2)
        var t2slo11 = (t1slo7 << 6 | t1shi7 >>> 26)
        var t2shi11 = (t1shi7 << 6 | t1slo7 >>> 26)
        var t2slo2 = (t1shi12 << 11 | t1slo12 >>> 21)
        var t2shi2 = (t1slo12 << 11 | t1shi12 >>> 21)
        var t2slo18 = (t1slo17 << 15 | t1shi17 >>> 17)
        var t2shi18 = (t1shi17 << 15 | t1slo17 >>> 17)
        var t2slo9 = (t1shi22 << 29 | t1slo22 >>> 3)
        var t2shi9 = (t1slo22 << 29 | t1shi22 >>> 3)
        var t2slo5 = (t1slo3 << 28 | t1shi3 >>> 4)
        var t2shi5 = (t1shi3 << 28 | t1slo3 >>> 4)
        var t2slo21 = (t1shi8 << 23 | t1slo8 >>> 9)
        var t2shi21 = (t1slo8 << 23 | t1shi8 >>> 9)
        var t2slo12 = (t1slo13 << 25 | t1shi13 >>> 7)
        var t2shi12 = (t1shi13 << 25 | t1slo13 >>> 7)
        var t2slo3 = (t1slo18 << 21 | t1shi18 >>> 11)
        var t2shi3 = (t1shi18 << 21 | t1slo18 >>> 11)
        var t2slo19 = (t1shi23 << 24 | t1slo23 >>> 8)
        var t2shi19 = (t1slo23 << 24 | t1shi23 >>> 8)
        var t2slo15 = (t1slo4 << 27 | t1shi4 >>> 5)
        var t2shi15 = (t1shi4 << 27 | t1slo4 >>> 5)
        var t2slo6 = (t1slo9 << 20 | t1shi9 >>> 12)
        var t2shi6 = (t1shi9 << 20 | t1slo9 >>> 12)
        var t2slo22 = (t1shi14 << 7 | t1slo14 >>> 25)
        var t2shi22 = (t1slo14 << 7 | t1shi14 >>> 25)
        var t2slo13 = (t1slo19 << 8 | t1shi19 >>> 24)
        var t2shi13 = (t1shi19 << 8 | t1slo19 >>> 24)
        var t2slo4 = (t1slo24 << 14 | t1shi24 >>> 18)
        var t2shi4 = (t1shi24 << 14 | t1slo24 >>> 18)

        // chi
        s[0] = t2slo0 ^ (~t2slo1 & t2slo2)
        s[1] = t2shi0 ^ (~t2shi1 & t2shi2)
        s[10] = t2slo5 ^ (~t2slo6 & t2slo7)
        s[11] = t2shi5 ^ (~t2shi6 & t2shi7)
        s[20] = t2slo10 ^ (~t2slo11 & t2slo12)
        s[21] = t2shi10 ^ (~t2shi11 & t2shi12)
        s[30] = t2slo15 ^ (~t2slo16 & t2slo17)
        s[31] = t2shi15 ^ (~t2shi16 & t2shi17)
        s[40] = t2slo20 ^ (~t2slo21 & t2slo22)
        s[41] = t2shi20 ^ (~t2shi21 & t2shi22)
        s[2] = t2slo1 ^ (~t2slo2 & t2slo3)
        s[3] = t2shi1 ^ (~t2shi2 & t2shi3)
        s[12] = t2slo6 ^ (~t2slo7 & t2slo8)
        s[13] = t2shi6 ^ (~t2shi7 & t2shi8)
        s[22] = t2slo11 ^ (~t2slo12 & t2slo13)
        s[23] = t2shi11 ^ (~t2shi12 & t2shi13)
        s[32] = t2slo16 ^ (~t2slo17 & t2slo18)
        s[33] = t2shi16 ^ (~t2shi17 & t2shi18)
        s[42] = t2slo21 ^ (~t2slo22 & t2slo23)
        s[43] = t2shi21 ^ (~t2shi22 & t2shi23)
        s[4] = t2slo2 ^ (~t2slo3 & t2slo4)
        s[5] = t2shi2 ^ (~t2shi3 & t2shi4)
        s[14] = t2slo7 ^ (~t2slo8 & t2slo9)
        s[15] = t2shi7 ^ (~t2shi8 & t2shi9)
        s[24] = t2slo12 ^ (~t2slo13 & t2slo14)
        s[25] = t2shi12 ^ (~t2shi13 & t2shi14)
        s[34] = t2slo17 ^ (~t2slo18 & t2slo19)
        s[35] = t2shi17 ^ (~t2shi18 & t2shi19)
        s[44] = t2slo22 ^ (~t2slo23 & t2slo24)
        s[45] = t2shi22 ^ (~t2shi23 & t2shi24)
        s[6] = t2slo3 ^ (~t2slo4 & t2slo0)
        s[7] = t2shi3 ^ (~t2shi4 & t2shi0)
        s[16] = t2slo8 ^ (~t2slo9 & t2slo5)
        s[17] = t2shi8 ^ (~t2shi9 & t2shi5)
        s[26] = t2slo13 ^ (~t2slo14 & t2slo10)
        s[27] = t2shi13 ^ (~t2shi14 & t2shi10)
        s[36] = t2slo18 ^ (~t2slo19 & t2slo15)
        s[37] = t2shi18 ^ (~t2shi19 & t2shi15)
        s[46] = t2slo23 ^ (~t2slo24 & t2slo20)
        s[47] = t2shi23 ^ (~t2shi24 & t2shi20)
        s[8] = t2slo4 ^ (~t2slo0 & t2slo1)
        s[9] = t2shi4 ^ (~t2shi0 & t2shi1)
        s[18] = t2slo9 ^ (~t2slo5 & t2slo6)
        s[19] = t2shi9 ^ (~t2shi5 & t2shi6)
        s[28] = t2slo14 ^ (~t2slo10 & t2slo11)
        s[29] = t2shi14 ^ (~t2shi10 & t2shi11)
        s[38] = t2slo19 ^ (~t2slo15 & t2slo16)
        s[39] = t2shi19 ^ (~t2shi15 & t2shi16)
        s[48] = t2slo24 ^ (~t2slo20 & t2slo21)
        s[49] = t2shi24 ^ (~t2shi20 & t2shi21)

        // iota
        s[0] ^= P1600_ROUND_CONSTANTS[round * 2]
        s[1] ^= P1600_ROUND_CONSTANTS[round * 2 + 1]
      }
    }

  },{}],48:[function(require,module,exports){
    'use strict'
    var Buffer = require('safe-buffer').Buffer
    var keccakState = require('./keccak-state-unroll')

    function Keccak () {
      // much faster than `new Array(50)`
      this.state = [
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0
      ]

      this.blockSize = null
      this.count = 0
      this.squeezing = false
    }

    Keccak.prototype.initialize = function (rate, capacity) {
      for (var i = 0; i < 50; ++i) this.state[i] = 0
      this.blockSize = rate / 8
      this.count = 0
      this.squeezing = false
    }

    Keccak.prototype.absorb = function (data) {
      for (var i = 0; i < data.length; ++i) {
        this.state[~~(this.count / 4)] ^= data[i] << (8 * (this.count % 4))
        this.count += 1
        if (this.count === this.blockSize) {
          keccakState.p1600(this.state)
          this.count = 0
        }
      }
    }

    Keccak.prototype.absorbLastFewBits = function (bits) {
      this.state[~~(this.count / 4)] ^= bits << (8 * (this.count % 4))
      if ((bits & 0x80) !== 0 && this.count === (this.blockSize - 1)) keccakState.p1600(this.state)
      this.state[~~((this.blockSize - 1) / 4)] ^= 0x80 << (8 * ((this.blockSize - 1) % 4))
      keccakState.p1600(this.state)
      this.count = 0
      this.squeezing = true
    }

    Keccak.prototype.squeeze = function (length) {
      if (!this.squeezing) this.absorbLastFewBits(0x01)

      var output = Buffer.alloc(length)
      for (var i = 0; i < length; ++i) {
        output[i] = (this.state[~~(this.count / 4)] >>> (8 * (this.count % 4))) & 0xff
        this.count += 1
        if (this.count === this.blockSize) {
          keccakState.p1600(this.state)
          this.count = 0
        }
      }

      return output
    }

    Keccak.prototype.copy = function (dest) {
      for (var i = 0; i < 50; ++i) dest.state[i] = this.state[i]
      dest.blockSize = this.blockSize
      dest.count = this.count
      dest.squeezing = this.squeezing
    }

    module.exports = Keccak

  },{"./keccak-state-unroll":47,"safe-buffer":53}],49:[function(require,module,exports){
    module.exports = assert;

    function assert(val, msg) {
      if (!val)
        throw new Error(msg || 'Assertion failed');
    }

    assert.equal = function assertEqual(l, r, msg) {
      if (l != r)
        throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
    };

  },{}],50:[function(require,module,exports){
    'use strict';

    var utils = exports;

    function toArray(msg, enc) {
      if (Array.isArray(msg))
        return msg.slice();
      if (!msg)
        return [];
      var res = [];
      if (typeof msg !== 'string') {
        for (var i = 0; i < msg.length; i++)
          res[i] = msg[i] | 0;
        return res;
      }
      if (enc === 'hex') {
        msg = msg.replace(/[^a-z0-9]+/ig, '');
        if (msg.length % 2 !== 0)
          msg = '0' + msg;
        for (var i = 0; i < msg.length; i += 2)
          res.push(parseInt(msg[i] + msg[i + 1], 16));
      } else {
        for (var i = 0; i < msg.length; i++) {
          var c = msg.charCodeAt(i);
          var hi = c >> 8;
          var lo = c & 0xff;
          if (hi)
            res.push(hi, lo);
          else
            res.push(lo);
        }
      }
      return res;
    }
    utils.toArray = toArray;

    function zero2(word) {
      if (word.length === 1)
        return '0' + word;
      else
        return word;
    }
    utils.zero2 = zero2;

    function toHex(msg) {
      var res = '';
      for (var i = 0; i < msg.length; i++)
        res += zero2(msg[i].toString(16));
      return res;
    }
    utils.toHex = toHex;

    utils.encode = function encode(arr, enc) {
      if (enc === 'hex')
        return toHex(arr);
      else
        return arr;
    };

  },{}],51:[function(require,module,exports){
    (function (Buffer){
      'use strict'
      var inherits = require('inherits')
      var HashBase = require('hash-base')

      function RIPEMD160 () {
        HashBase.call(this, 64)

        // state
        this._a = 0x67452301
        this._b = 0xefcdab89
        this._c = 0x98badcfe
        this._d = 0x10325476
        this._e = 0xc3d2e1f0
      }

      inherits(RIPEMD160, HashBase)

      RIPEMD160.prototype._update = function () {
        var m = new Array(16)
        for (var i = 0; i < 16; ++i) m[i] = this._block.readInt32LE(i * 4)

        var al = this._a
        var bl = this._b
        var cl = this._c
        var dl = this._d
        var el = this._e

        // Mj = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
        // K = 0x00000000
        // Sj = 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8
        al = fn1(al, bl, cl, dl, el, m[0], 0x00000000, 11); cl = rotl(cl, 10)
        el = fn1(el, al, bl, cl, dl, m[1], 0x00000000, 14); bl = rotl(bl, 10)
        dl = fn1(dl, el, al, bl, cl, m[2], 0x00000000, 15); al = rotl(al, 10)
        cl = fn1(cl, dl, el, al, bl, m[3], 0x00000000, 12); el = rotl(el, 10)
        bl = fn1(bl, cl, dl, el, al, m[4], 0x00000000, 5); dl = rotl(dl, 10)
        al = fn1(al, bl, cl, dl, el, m[5], 0x00000000, 8); cl = rotl(cl, 10)
        el = fn1(el, al, bl, cl, dl, m[6], 0x00000000, 7); bl = rotl(bl, 10)
        dl = fn1(dl, el, al, bl, cl, m[7], 0x00000000, 9); al = rotl(al, 10)
        cl = fn1(cl, dl, el, al, bl, m[8], 0x00000000, 11); el = rotl(el, 10)
        bl = fn1(bl, cl, dl, el, al, m[9], 0x00000000, 13); dl = rotl(dl, 10)
        al = fn1(al, bl, cl, dl, el, m[10], 0x00000000, 14); cl = rotl(cl, 10)
        el = fn1(el, al, bl, cl, dl, m[11], 0x00000000, 15); bl = rotl(bl, 10)
        dl = fn1(dl, el, al, bl, cl, m[12], 0x00000000, 6); al = rotl(al, 10)
        cl = fn1(cl, dl, el, al, bl, m[13], 0x00000000, 7); el = rotl(el, 10)
        bl = fn1(bl, cl, dl, el, al, m[14], 0x00000000, 9); dl = rotl(dl, 10)
        al = fn1(al, bl, cl, dl, el, m[15], 0x00000000, 8); cl = rotl(cl, 10)

        // Mj = 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8
        // K = 0x5a827999
        // Sj = 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12
        el = fn2(el, al, bl, cl, dl, m[7], 0x5a827999, 7); bl = rotl(bl, 10)
        dl = fn2(dl, el, al, bl, cl, m[4], 0x5a827999, 6); al = rotl(al, 10)
        cl = fn2(cl, dl, el, al, bl, m[13], 0x5a827999, 8); el = rotl(el, 10)
        bl = fn2(bl, cl, dl, el, al, m[1], 0x5a827999, 13); dl = rotl(dl, 10)
        al = fn2(al, bl, cl, dl, el, m[10], 0x5a827999, 11); cl = rotl(cl, 10)
        el = fn2(el, al, bl, cl, dl, m[6], 0x5a827999, 9); bl = rotl(bl, 10)
        dl = fn2(dl, el, al, bl, cl, m[15], 0x5a827999, 7); al = rotl(al, 10)
        cl = fn2(cl, dl, el, al, bl, m[3], 0x5a827999, 15); el = rotl(el, 10)
        bl = fn2(bl, cl, dl, el, al, m[12], 0x5a827999, 7); dl = rotl(dl, 10)
        al = fn2(al, bl, cl, dl, el, m[0], 0x5a827999, 12); cl = rotl(cl, 10)
        el = fn2(el, al, bl, cl, dl, m[9], 0x5a827999, 15); bl = rotl(bl, 10)
        dl = fn2(dl, el, al, bl, cl, m[5], 0x5a827999, 9); al = rotl(al, 10)
        cl = fn2(cl, dl, el, al, bl, m[2], 0x5a827999, 11); el = rotl(el, 10)
        bl = fn2(bl, cl, dl, el, al, m[14], 0x5a827999, 7); dl = rotl(dl, 10)
        al = fn2(al, bl, cl, dl, el, m[11], 0x5a827999, 13); cl = rotl(cl, 10)
        el = fn2(el, al, bl, cl, dl, m[8], 0x5a827999, 12); bl = rotl(bl, 10)

        // Mj = 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12
        // K = 0x6ed9eba1
        // Sj = 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5
        dl = fn3(dl, el, al, bl, cl, m[3], 0x6ed9eba1, 11); al = rotl(al, 10)
        cl = fn3(cl, dl, el, al, bl, m[10], 0x6ed9eba1, 13); el = rotl(el, 10)
        bl = fn3(bl, cl, dl, el, al, m[14], 0x6ed9eba1, 6); dl = rotl(dl, 10)
        al = fn3(al, bl, cl, dl, el, m[4], 0x6ed9eba1, 7); cl = rotl(cl, 10)
        el = fn3(el, al, bl, cl, dl, m[9], 0x6ed9eba1, 14); bl = rotl(bl, 10)
        dl = fn3(dl, el, al, bl, cl, m[15], 0x6ed9eba1, 9); al = rotl(al, 10)
        cl = fn3(cl, dl, el, al, bl, m[8], 0x6ed9eba1, 13); el = rotl(el, 10)
        bl = fn3(bl, cl, dl, el, al, m[1], 0x6ed9eba1, 15); dl = rotl(dl, 10)
        al = fn3(al, bl, cl, dl, el, m[2], 0x6ed9eba1, 14); cl = rotl(cl, 10)
        el = fn3(el, al, bl, cl, dl, m[7], 0x6ed9eba1, 8); bl = rotl(bl, 10)
        dl = fn3(dl, el, al, bl, cl, m[0], 0x6ed9eba1, 13); al = rotl(al, 10)
        cl = fn3(cl, dl, el, al, bl, m[6], 0x6ed9eba1, 6); el = rotl(el, 10)
        bl = fn3(bl, cl, dl, el, al, m[13], 0x6ed9eba1, 5); dl = rotl(dl, 10)
        al = fn3(al, bl, cl, dl, el, m[11], 0x6ed9eba1, 12); cl = rotl(cl, 10)
        el = fn3(el, al, bl, cl, dl, m[5], 0x6ed9eba1, 7); bl = rotl(bl, 10)
        dl = fn3(dl, el, al, bl, cl, m[12], 0x6ed9eba1, 5); al = rotl(al, 10)

        // Mj = 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2
        // K = 0x8f1bbcdc
        // Sj = 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12
        cl = fn4(cl, dl, el, al, bl, m[1], 0x8f1bbcdc, 11); el = rotl(el, 10)
        bl = fn4(bl, cl, dl, el, al, m[9], 0x8f1bbcdc, 12); dl = rotl(dl, 10)
        al = fn4(al, bl, cl, dl, el, m[11], 0x8f1bbcdc, 14); cl = rotl(cl, 10)
        el = fn4(el, al, bl, cl, dl, m[10], 0x8f1bbcdc, 15); bl = rotl(bl, 10)
        dl = fn4(dl, el, al, bl, cl, m[0], 0x8f1bbcdc, 14); al = rotl(al, 10)
        cl = fn4(cl, dl, el, al, bl, m[8], 0x8f1bbcdc, 15); el = rotl(el, 10)
        bl = fn4(bl, cl, dl, el, al, m[12], 0x8f1bbcdc, 9); dl = rotl(dl, 10)
        al = fn4(al, bl, cl, dl, el, m[4], 0x8f1bbcdc, 8); cl = rotl(cl, 10)
        el = fn4(el, al, bl, cl, dl, m[13], 0x8f1bbcdc, 9); bl = rotl(bl, 10)
        dl = fn4(dl, el, al, bl, cl, m[3], 0x8f1bbcdc, 14); al = rotl(al, 10)
        cl = fn4(cl, dl, el, al, bl, m[7], 0x8f1bbcdc, 5); el = rotl(el, 10)
        bl = fn4(bl, cl, dl, el, al, m[15], 0x8f1bbcdc, 6); dl = rotl(dl, 10)
        al = fn4(al, bl, cl, dl, el, m[14], 0x8f1bbcdc, 8); cl = rotl(cl, 10)
        el = fn4(el, al, bl, cl, dl, m[5], 0x8f1bbcdc, 6); bl = rotl(bl, 10)
        dl = fn4(dl, el, al, bl, cl, m[6], 0x8f1bbcdc, 5); al = rotl(al, 10)
        cl = fn4(cl, dl, el, al, bl, m[2], 0x8f1bbcdc, 12); el = rotl(el, 10)

        // Mj = 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
        // K = 0xa953fd4e
        // Sj = 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
        bl = fn5(bl, cl, dl, el, al, m[4], 0xa953fd4e, 9); dl = rotl(dl, 10)
        al = fn5(al, bl, cl, dl, el, m[0], 0xa953fd4e, 15); cl = rotl(cl, 10)
        el = fn5(el, al, bl, cl, dl, m[5], 0xa953fd4e, 5); bl = rotl(bl, 10)
        dl = fn5(dl, el, al, bl, cl, m[9], 0xa953fd4e, 11); al = rotl(al, 10)
        cl = fn5(cl, dl, el, al, bl, m[7], 0xa953fd4e, 6); el = rotl(el, 10)
        bl = fn5(bl, cl, dl, el, al, m[12], 0xa953fd4e, 8); dl = rotl(dl, 10)
        al = fn5(al, bl, cl, dl, el, m[2], 0xa953fd4e, 13); cl = rotl(cl, 10)
        el = fn5(el, al, bl, cl, dl, m[10], 0xa953fd4e, 12); bl = rotl(bl, 10)
        dl = fn5(dl, el, al, bl, cl, m[14], 0xa953fd4e, 5); al = rotl(al, 10)
        cl = fn5(cl, dl, el, al, bl, m[1], 0xa953fd4e, 12); el = rotl(el, 10)
        bl = fn5(bl, cl, dl, el, al, m[3], 0xa953fd4e, 13); dl = rotl(dl, 10)
        al = fn5(al, bl, cl, dl, el, m[8], 0xa953fd4e, 14); cl = rotl(cl, 10)
        el = fn5(el, al, bl, cl, dl, m[11], 0xa953fd4e, 11); bl = rotl(bl, 10)
        dl = fn5(dl, el, al, bl, cl, m[6], 0xa953fd4e, 8); al = rotl(al, 10)
        cl = fn5(cl, dl, el, al, bl, m[15], 0xa953fd4e, 5); el = rotl(el, 10)
        bl = fn5(bl, cl, dl, el, al, m[13], 0xa953fd4e, 6); dl = rotl(dl, 10)

        var ar = this._a
        var br = this._b
        var cr = this._c
        var dr = this._d
        var er = this._e

        // M'j = 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12
        // K' = 0x50a28be6
        // S'j = 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6
        ar = fn5(ar, br, cr, dr, er, m[5], 0x50a28be6, 8); cr = rotl(cr, 10)
        er = fn5(er, ar, br, cr, dr, m[14], 0x50a28be6, 9); br = rotl(br, 10)
        dr = fn5(dr, er, ar, br, cr, m[7], 0x50a28be6, 9); ar = rotl(ar, 10)
        cr = fn5(cr, dr, er, ar, br, m[0], 0x50a28be6, 11); er = rotl(er, 10)
        br = fn5(br, cr, dr, er, ar, m[9], 0x50a28be6, 13); dr = rotl(dr, 10)
        ar = fn5(ar, br, cr, dr, er, m[2], 0x50a28be6, 15); cr = rotl(cr, 10)
        er = fn5(er, ar, br, cr, dr, m[11], 0x50a28be6, 15); br = rotl(br, 10)
        dr = fn5(dr, er, ar, br, cr, m[4], 0x50a28be6, 5); ar = rotl(ar, 10)
        cr = fn5(cr, dr, er, ar, br, m[13], 0x50a28be6, 7); er = rotl(er, 10)
        br = fn5(br, cr, dr, er, ar, m[6], 0x50a28be6, 7); dr = rotl(dr, 10)
        ar = fn5(ar, br, cr, dr, er, m[15], 0x50a28be6, 8); cr = rotl(cr, 10)
        er = fn5(er, ar, br, cr, dr, m[8], 0x50a28be6, 11); br = rotl(br, 10)
        dr = fn5(dr, er, ar, br, cr, m[1], 0x50a28be6, 14); ar = rotl(ar, 10)
        cr = fn5(cr, dr, er, ar, br, m[10], 0x50a28be6, 14); er = rotl(er, 10)
        br = fn5(br, cr, dr, er, ar, m[3], 0x50a28be6, 12); dr = rotl(dr, 10)
        ar = fn5(ar, br, cr, dr, er, m[12], 0x50a28be6, 6); cr = rotl(cr, 10)

        // M'j = 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2
        // K' = 0x5c4dd124
        // S'j = 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11
        er = fn4(er, ar, br, cr, dr, m[6], 0x5c4dd124, 9); br = rotl(br, 10)
        dr = fn4(dr, er, ar, br, cr, m[11], 0x5c4dd124, 13); ar = rotl(ar, 10)
        cr = fn4(cr, dr, er, ar, br, m[3], 0x5c4dd124, 15); er = rotl(er, 10)
        br = fn4(br, cr, dr, er, ar, m[7], 0x5c4dd124, 7); dr = rotl(dr, 10)
        ar = fn4(ar, br, cr, dr, er, m[0], 0x5c4dd124, 12); cr = rotl(cr, 10)
        er = fn4(er, ar, br, cr, dr, m[13], 0x5c4dd124, 8); br = rotl(br, 10)
        dr = fn4(dr, er, ar, br, cr, m[5], 0x5c4dd124, 9); ar = rotl(ar, 10)
        cr = fn4(cr, dr, er, ar, br, m[10], 0x5c4dd124, 11); er = rotl(er, 10)
        br = fn4(br, cr, dr, er, ar, m[14], 0x5c4dd124, 7); dr = rotl(dr, 10)
        ar = fn4(ar, br, cr, dr, er, m[15], 0x5c4dd124, 7); cr = rotl(cr, 10)
        er = fn4(er, ar, br, cr, dr, m[8], 0x5c4dd124, 12); br = rotl(br, 10)
        dr = fn4(dr, er, ar, br, cr, m[12], 0x5c4dd124, 7); ar = rotl(ar, 10)
        cr = fn4(cr, dr, er, ar, br, m[4], 0x5c4dd124, 6); er = rotl(er, 10)
        br = fn4(br, cr, dr, er, ar, m[9], 0x5c4dd124, 15); dr = rotl(dr, 10)
        ar = fn4(ar, br, cr, dr, er, m[1], 0x5c4dd124, 13); cr = rotl(cr, 10)
        er = fn4(er, ar, br, cr, dr, m[2], 0x5c4dd124, 11); br = rotl(br, 10)

        // M'j = 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13
        // K' = 0x6d703ef3
        // S'j = 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5
        dr = fn3(dr, er, ar, br, cr, m[15], 0x6d703ef3, 9); ar = rotl(ar, 10)
        cr = fn3(cr, dr, er, ar, br, m[5], 0x6d703ef3, 7); er = rotl(er, 10)
        br = fn3(br, cr, dr, er, ar, m[1], 0x6d703ef3, 15); dr = rotl(dr, 10)
        ar = fn3(ar, br, cr, dr, er, m[3], 0x6d703ef3, 11); cr = rotl(cr, 10)
        er = fn3(er, ar, br, cr, dr, m[7], 0x6d703ef3, 8); br = rotl(br, 10)
        dr = fn3(dr, er, ar, br, cr, m[14], 0x6d703ef3, 6); ar = rotl(ar, 10)
        cr = fn3(cr, dr, er, ar, br, m[6], 0x6d703ef3, 6); er = rotl(er, 10)
        br = fn3(br, cr, dr, er, ar, m[9], 0x6d703ef3, 14); dr = rotl(dr, 10)
        ar = fn3(ar, br, cr, dr, er, m[11], 0x6d703ef3, 12); cr = rotl(cr, 10)
        er = fn3(er, ar, br, cr, dr, m[8], 0x6d703ef3, 13); br = rotl(br, 10)
        dr = fn3(dr, er, ar, br, cr, m[12], 0x6d703ef3, 5); ar = rotl(ar, 10)
        cr = fn3(cr, dr, er, ar, br, m[2], 0x6d703ef3, 14); er = rotl(er, 10)
        br = fn3(br, cr, dr, er, ar, m[10], 0x6d703ef3, 13); dr = rotl(dr, 10)
        ar = fn3(ar, br, cr, dr, er, m[0], 0x6d703ef3, 13); cr = rotl(cr, 10)
        er = fn3(er, ar, br, cr, dr, m[4], 0x6d703ef3, 7); br = rotl(br, 10)
        dr = fn3(dr, er, ar, br, cr, m[13], 0x6d703ef3, 5); ar = rotl(ar, 10)

        // M'j = 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14
        // K' = 0x7a6d76e9
        // S'j = 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8
        cr = fn2(cr, dr, er, ar, br, m[8], 0x7a6d76e9, 15); er = rotl(er, 10)
        br = fn2(br, cr, dr, er, ar, m[6], 0x7a6d76e9, 5); dr = rotl(dr, 10)
        ar = fn2(ar, br, cr, dr, er, m[4], 0x7a6d76e9, 8); cr = rotl(cr, 10)
        er = fn2(er, ar, br, cr, dr, m[1], 0x7a6d76e9, 11); br = rotl(br, 10)
        dr = fn2(dr, er, ar, br, cr, m[3], 0x7a6d76e9, 14); ar = rotl(ar, 10)
        cr = fn2(cr, dr, er, ar, br, m[11], 0x7a6d76e9, 14); er = rotl(er, 10)
        br = fn2(br, cr, dr, er, ar, m[15], 0x7a6d76e9, 6); dr = rotl(dr, 10)
        ar = fn2(ar, br, cr, dr, er, m[0], 0x7a6d76e9, 14); cr = rotl(cr, 10)
        er = fn2(er, ar, br, cr, dr, m[5], 0x7a6d76e9, 6); br = rotl(br, 10)
        dr = fn2(dr, er, ar, br, cr, m[12], 0x7a6d76e9, 9); ar = rotl(ar, 10)
        cr = fn2(cr, dr, er, ar, br, m[2], 0x7a6d76e9, 12); er = rotl(er, 10)
        br = fn2(br, cr, dr, er, ar, m[13], 0x7a6d76e9, 9); dr = rotl(dr, 10)
        ar = fn2(ar, br, cr, dr, er, m[9], 0x7a6d76e9, 12); cr = rotl(cr, 10)
        er = fn2(er, ar, br, cr, dr, m[7], 0x7a6d76e9, 5); br = rotl(br, 10)
        dr = fn2(dr, er, ar, br, cr, m[10], 0x7a6d76e9, 15); ar = rotl(ar, 10)
        cr = fn2(cr, dr, er, ar, br, m[14], 0x7a6d76e9, 8); er = rotl(er, 10)

        // M'j = 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
        // K' = 0x00000000
        // S'j = 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
        br = fn1(br, cr, dr, er, ar, m[12], 0x00000000, 8); dr = rotl(dr, 10)
        ar = fn1(ar, br, cr, dr, er, m[15], 0x00000000, 5); cr = rotl(cr, 10)
        er = fn1(er, ar, br, cr, dr, m[10], 0x00000000, 12); br = rotl(br, 10)
        dr = fn1(dr, er, ar, br, cr, m[4], 0x00000000, 9); ar = rotl(ar, 10)
        cr = fn1(cr, dr, er, ar, br, m[1], 0x00000000, 12); er = rotl(er, 10)
        br = fn1(br, cr, dr, er, ar, m[5], 0x00000000, 5); dr = rotl(dr, 10)
        ar = fn1(ar, br, cr, dr, er, m[8], 0x00000000, 14); cr = rotl(cr, 10)
        er = fn1(er, ar, br, cr, dr, m[7], 0x00000000, 6); br = rotl(br, 10)
        dr = fn1(dr, er, ar, br, cr, m[6], 0x00000000, 8); ar = rotl(ar, 10)
        cr = fn1(cr, dr, er, ar, br, m[2], 0x00000000, 13); er = rotl(er, 10)
        br = fn1(br, cr, dr, er, ar, m[13], 0x00000000, 6); dr = rotl(dr, 10)
        ar = fn1(ar, br, cr, dr, er, m[14], 0x00000000, 5); cr = rotl(cr, 10)
        er = fn1(er, ar, br, cr, dr, m[0], 0x00000000, 15); br = rotl(br, 10)
        dr = fn1(dr, er, ar, br, cr, m[3], 0x00000000, 13); ar = rotl(ar, 10)
        cr = fn1(cr, dr, er, ar, br, m[9], 0x00000000, 11); er = rotl(er, 10)
        br = fn1(br, cr, dr, er, ar, m[11], 0x00000000, 11); dr = rotl(dr, 10)

        // change state
        var t = (this._b + cl + dr) | 0
        this._b = (this._c + dl + er) | 0
        this._c = (this._d + el + ar) | 0
        this._d = (this._e + al + br) | 0
        this._e = (this._a + bl + cr) | 0
        this._a = t
      }

      RIPEMD160.prototype._digest = function () {
        // create padding and handle blocks
        this._block[this._blockOffset++] = 0x80
        if (this._blockOffset > 56) {
          this._block.fill(0, this._blockOffset, 64)
          this._update()
          this._blockOffset = 0
        }

        this._block.fill(0, this._blockOffset, 56)
        this._block.writeUInt32LE(this._length[0], 56)
        this._block.writeUInt32LE(this._length[1], 60)
        this._update()

        // produce result
        var buffer = new Buffer(20)
        buffer.writeInt32LE(this._a, 0)
        buffer.writeInt32LE(this._b, 4)
        buffer.writeInt32LE(this._c, 8)
        buffer.writeInt32LE(this._d, 12)
        buffer.writeInt32LE(this._e, 16)
        return buffer
      }

      function rotl (x, n) {
        return (x << n) | (x >>> (32 - n))
      }

      function fn1 (a, b, c, d, e, m, k, s) {
        return (rotl((a + (b ^ c ^ d) + m + k) | 0, s) + e) | 0
      }

      function fn2 (a, b, c, d, e, m, k, s) {
        return (rotl((a + ((b & c) | ((~b) & d)) + m + k) | 0, s) + e) | 0
      }

      function fn3 (a, b, c, d, e, m, k, s) {
        return (rotl((a + ((b | (~c)) ^ d) + m + k) | 0, s) + e) | 0
      }

      function fn4 (a, b, c, d, e, m, k, s) {
        return (rotl((a + ((b & d) | (c & (~d))) + m + k) | 0, s) + e) | 0
      }

      function fn5 (a, b, c, d, e, m, k, s) {
        return (rotl((a + (b ^ (c | (~d))) + m + k) | 0, s) + e) | 0
      }

      module.exports = RIPEMD160

    }).call(this,require("buffer").Buffer)
  },{"buffer":72,"hash-base":27,"inherits":41}],52:[function(require,module,exports){
    (function (Buffer){
      const assert = require('assert')
      /**
       * RLP Encoding based on: https://github.com/ethereum/wiki/wiki/%5BEnglish%5D-RLP
       * This function takes in a data, convert it to buffer if not, and a length for recursion
       *
       * @param {Buffer,String,Integer,Array} data - will be converted to buffer
       * @returns {Buffer} - returns buffer of encoded data
       **/
      exports.encode = function (input) {
        if (input instanceof Array) {
          var output = []
          for (var i = 0; i < input.length; i++) {
            output.push(exports.encode(input[i]))
          }
          var buf = Buffer.concat(output)
          return Buffer.concat([encodeLength(buf.length, 192), buf])
        } else {
          input = toBuffer(input)
          if (input.length === 1 && input[0] < 128) {
            return input
          } else {
            return Buffer.concat([encodeLength(input.length, 128), input])
          }
        }
      }

      function safeParseInt (v, base) {
        if (v.slice(0, 2) === '00') {
          throw (new Error('invalid RLP: extra zeros'))
        }

        return parseInt(v, base)
      }

      function encodeLength (len, offset) {
        if (len < 56) {
          return new Buffer([len + offset])
        } else {
          var hexLength = intToHex(len)
          var lLength = hexLength.length / 2
          var firstByte = intToHex(offset + 55 + lLength)
          return new Buffer(firstByte + hexLength, 'hex')
        }
      }

      /**
       * RLP Decoding based on: {@link https://github.com/ethereum/wiki/wiki/%5BEnglish%5D-RLP|RLP}
       * @param {Buffer,String,Integer,Array} data - will be converted to buffer
       * @returns {Array} - returns decode Array of Buffers containg the original message
       **/
      exports.decode = function (input, stream) {
        if (!input || input.length === 0) {
          return new Buffer([])
        }

        input = toBuffer(input)
        var decoded = _decode(input)

        if (stream) {
          return decoded
        }

        assert.equal(decoded.remainder.length, 0, 'invalid remainder')
        return decoded.data
      }

      exports.getLength = function (input) {
        if (!input || input.length === 0) {
          return new Buffer([])
        }

        input = toBuffer(input)
        var firstByte = input[0]
        if (firstByte <= 0x7f) {
          return input.length
        } else if (firstByte <= 0xb7) {
          return firstByte - 0x7f
        } else if (firstByte <= 0xbf) {
          return firstByte - 0xb6
        } else if (firstByte <= 0xf7) {
          // a list between  0-55 bytes long
          return firstByte - 0xbf
        } else {
          // a list  over 55 bytes long
          var llength = firstByte - 0xf6
          var length = safeParseInt(input.slice(1, llength).toString('hex'), 16)
          return llength + length
        }
      }

      function _decode (input) {
        var length, llength, data, innerRemainder, d
        var decoded = []
        var firstByte = input[0]

        if (firstByte <= 0x7f) {
          // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
          return {
            data: input.slice(0, 1),
            remainder: input.slice(1)
          }
        } else if (firstByte <= 0xb7) {
          // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
          // The range of the first byte is [0x80, 0xb7]
          length = firstByte - 0x7f

          // set 0x80 null to 0
          if (firstByte === 0x80) {
            data = new Buffer([])
          } else {
            data = input.slice(1, length)
          }

          if (length === 2 && data[0] < 0x80) {
            throw new Error('invalid rlp encoding: byte must be less 0x80')
          }

          return {
            data: data,
            remainder: input.slice(length)
          }
        } else if (firstByte <= 0xbf) {
          llength = firstByte - 0xb6
          length = safeParseInt(input.slice(1, llength).toString('hex'), 16)
          data = input.slice(llength, length + llength)
          if (data.length < length) {
            throw (new Error('invalid RLP'))
          }

          return {
            data: data,
            remainder: input.slice(length + llength)
          }
        } else if (firstByte <= 0xf7) {
          // a list between  0-55 bytes long
          length = firstByte - 0xbf
          innerRemainder = input.slice(1, length)
          while (innerRemainder.length) {
            d = _decode(innerRemainder)
            decoded.push(d.data)
            innerRemainder = d.remainder
          }

          return {
            data: decoded,
            remainder: input.slice(length)
          }
        } else {
          // a list  over 55 bytes long
          llength = firstByte - 0xf6
          length = safeParseInt(input.slice(1, llength).toString('hex'), 16)
          var totalLength = llength + length
          if (totalLength > input.length) {
            throw new Error('invalid rlp: total length is larger than the data')
          }

          innerRemainder = input.slice(llength, totalLength)
          if (innerRemainder.length === 0) {
            throw new Error('invalid rlp, List has a invalid length')
          }

          while (innerRemainder.length) {
            d = _decode(innerRemainder)
            decoded.push(d.data)
            innerRemainder = d.remainder
          }
          return {
            data: decoded,
            remainder: input.slice(totalLength)
          }
        }
      }

      function isHexPrefixed (str) {
        return str.slice(0, 2) === '0x'
      }

// Removes 0x from a given String
      function stripHexPrefix (str) {
        if (typeof str !== 'string') {
          return str
        }
        return isHexPrefixed(str) ? str.slice(2) : str
      }

      function intToHex (i) {
        var hex = i.toString(16)
        if (hex.length % 2) {
          hex = '0' + hex
        }

        return hex
      }

      function padToEven (a) {
        if (a.length % 2) a = '0' + a
        return a
      }

      function intToBuffer (i) {
        var hex = intToHex(i)
        return new Buffer(hex, 'hex')
      }

      function toBuffer (v) {
        if (!Buffer.isBuffer(v)) {
          if (typeof v === 'string') {
            if (isHexPrefixed(v)) {
              v = new Buffer(padToEven(stripHexPrefix(v)), 'hex')
            } else {
              v = new Buffer(v)
            }
          } else if (typeof v === 'number') {
            if (!v) {
              v = new Buffer([])
            } else {
              v = intToBuffer(v)
            }
          } else if (v === null || v === undefined) {
            v = new Buffer([])
          } else if (v.toArray) {
            // converts a BN to a Buffer
            v = new Buffer(v.toArray())
          } else {
            throw new Error('invalid type')
          }
        }
        return v
      }

    }).call(this,require("buffer").Buffer)
  },{"assert":69,"buffer":72}],53:[function(require,module,exports){
    /* eslint-disable node/no-deprecated-api */
    var buffer = require('buffer')
    var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
    function copyProps (src, dst) {
      for (var key in src) {
        dst[key] = src[key]
      }
    }
    if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
      module.exports = buffer
    } else {
      // Copy properties from require('buffer')
      copyProps(buffer, exports)
      exports.Buffer = SafeBuffer
    }

    function SafeBuffer (arg, encodingOrOffset, length) {
      return Buffer(arg, encodingOrOffset, length)
    }

// Copy static methods from Buffer
    copyProps(Buffer, SafeBuffer)

    SafeBuffer.from = function (arg, encodingOrOffset, length) {
      if (typeof arg === 'number') {
        throw new TypeError('Argument must not be a number')
      }
      return Buffer(arg, encodingOrOffset, length)
    }

    SafeBuffer.alloc = function (size, fill, encoding) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number')
      }
      var buf = Buffer(size)
      if (fill !== undefined) {
        if (typeof encoding === 'string') {
          buf.fill(fill, encoding)
        } else {
          buf.fill(fill)
        }
      } else {
        buf.fill(0)
      }
      return buf
    }

    SafeBuffer.allocUnsafe = function (size) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number')
      }
      return Buffer(size)
    }

    SafeBuffer.allocUnsafeSlow = function (size) {
      if (typeof size !== 'number') {
        throw new TypeError('Argument must be a number')
      }
      return buffer.SlowBuffer(size)
    }

  },{"buffer":72}],54:[function(require,module,exports){
    'use strict'
    module.exports = require('./lib')(require('./lib/elliptic'))

  },{"./lib":58,"./lib/elliptic":57}],55:[function(require,module,exports){
    (function (Buffer){
      'use strict'
      var toString = Object.prototype.toString

// TypeError
      exports.isArray = function (value, message) {
        if (!Array.isArray(value)) throw TypeError(message)
      }

      exports.isBoolean = function (value, message) {
        if (toString.call(value) !== '[object Boolean]') throw TypeError(message)
      }

      exports.isBuffer = function (value, message) {
        if (!Buffer.isBuffer(value)) throw TypeError(message)
      }

      exports.isFunction = function (value, message) {
        if (toString.call(value) !== '[object Function]') throw TypeError(message)
      }

      exports.isNumber = function (value, message) {
        if (toString.call(value) !== '[object Number]') throw TypeError(message)
      }

      exports.isObject = function (value, message) {
        if (toString.call(value) !== '[object Object]') throw TypeError(message)
      }

// RangeError
      exports.isBufferLength = function (buffer, length, message) {
        if (buffer.length !== length) throw RangeError(message)
      }

      exports.isBufferLength2 = function (buffer, length1, length2, message) {
        if (buffer.length !== length1 && buffer.length !== length2) throw RangeError(message)
      }

      exports.isLengthGTZero = function (value, message) {
        if (value.length === 0) throw RangeError(message)
      }

      exports.isNumberInInterval = function (number, x, y, message) {
        if (number <= x || number >= y) throw RangeError(message)
      }

    }).call(this,{"isBuffer":require("../../../../../../usr/local/lib/node_modules/browserify/node_modules/is-buffer/index.js")})
  },{"../../../../../../usr/local/lib/node_modules/browserify/node_modules/is-buffer/index.js":77}],56:[function(require,module,exports){
    'use strict'
    var Buffer = require('safe-buffer').Buffer
    var bip66 = require('bip66')

    var EC_PRIVKEY_EXPORT_DER_COMPRESSED = Buffer.from([
      // begin
      0x30, 0x81, 0xd3, 0x02, 0x01, 0x01, 0x04, 0x20,
      // private key
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // middle
      0xa0, 0x81, 0x85, 0x30, 0x81, 0x82, 0x02, 0x01, 0x01, 0x30, 0x2c, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xcE, 0x3d, 0x01, 0x01, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xfE, 0xff, 0xff, 0xfc, 0x2f, 0x30, 0x06, 0x04, 0x01, 0x00, 0x04, 0x01, 0x07, 0x04,
      0x21, 0x02, 0x79, 0xbE, 0x66, 0x7E, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xcE, 0x87,
      0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xcE, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16, 0xf8,
      0x17, 0x98, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xfE, 0xba, 0xaE, 0xdc, 0xE6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5E,
      0x8c, 0xd0, 0x36, 0x41, 0x41, 0x02, 0x01, 0x01, 0xa1, 0x24, 0x03, 0x22, 0x00,
      // public key
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00
    ])

    var EC_PRIVKEY_EXPORT_DER_UNCOMPRESSED = Buffer.from([
      // begin
      0x30, 0x82, 0x01, 0x13, 0x02, 0x01, 0x01, 0x04, 0x20,
      // private key
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // middle
      0xa0, 0x81, 0xa5, 0x30, 0x81, 0xa2, 0x02, 0x01, 0x01, 0x30, 0x2c, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xcE, 0x3d, 0x01, 0x01, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xfE, 0xff, 0xff, 0xfc, 0x2f, 0x30, 0x06, 0x04, 0x01, 0x00, 0x04, 0x01, 0x07, 0x04,
      0x41, 0x04, 0x79, 0xbE, 0x66, 0x7E, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xcE, 0x87,
      0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xcE, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16, 0xf8,
      0x17, 0x98, 0x48, 0x3a, 0xda, 0x77, 0x26, 0xa3, 0xc4, 0x65, 0x5d, 0xa4, 0xfb, 0xfc, 0x0E, 0x11,
      0x08, 0xa8, 0xfd, 0x17, 0xb4, 0x48, 0xa6, 0x85, 0x54, 0x19, 0x9c, 0x47, 0xd0, 0x8f, 0xfb, 0x10,
      0xd4, 0xb8, 0x02, 0x21, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xfE, 0xba, 0xaE, 0xdc, 0xE6, 0xaf, 0x48, 0xa0, 0x3b, 0xbf, 0xd2, 0x5E,
      0x8c, 0xd0, 0x36, 0x41, 0x41, 0x02, 0x01, 0x01, 0xa1, 0x44, 0x03, 0x42, 0x00,
      // public key
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00
    ])

    var ZERO_BUFFER_32 = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])

    exports.privateKeyExport = function (privateKey, publicKey, compressed) {
      var result = Buffer.from(compressed ? EC_PRIVKEY_EXPORT_DER_COMPRESSED : EC_PRIVKEY_EXPORT_DER_UNCOMPRESSED)
      privateKey.copy(result, compressed ? 8 : 9)
      publicKey.copy(result, compressed ? 181 : 214)
      return result
    }

    exports.privateKeyImport = function (privateKey) {
      var length = privateKey.length

      // sequence header
      var index = 0
      if (length < index + 1 || privateKey[index] !== 0x30) return
      index += 1

      // sequence length constructor
      if (length < index + 1 || !(privateKey[index] & 0x80)) return

      var lenb = privateKey[index] & 0x7f
      index += 1
      if (lenb < 1 || lenb > 2) return
      if (length < index + lenb) return

      // sequence length
      var len = privateKey[index + lenb - 1] | (lenb > 1 ? privateKey[index + lenb - 2] << 8 : 0)
      index += lenb
      if (length < index + len) return

      // sequence element 0: version number (=1)
      if (length < index + 3 ||
        privateKey[index] !== 0x02 ||
        privateKey[index + 1] !== 0x01 ||
        privateKey[index + 2] !== 0x01) {
        return
      }
      index += 3

      // sequence element 1: octet string, up to 32 bytes
      if (length < index + 2 ||
        privateKey[index] !== 0x04 ||
        privateKey[index + 1] > 0x20 ||
        length < index + 2 + privateKey[index + 1]) {
        return
      }

      return privateKey.slice(index + 2, index + 2 + privateKey[index + 1])
    }

    exports.signatureExport = function (sigObj) {
      var r = Buffer.concat([Buffer.from([0]), sigObj.r])
      for (var lenR = 33, posR = 0; lenR > 1 && r[posR] === 0x00 && !(r[posR + 1] & 0x80); --lenR, ++posR);

      var s = Buffer.concat([Buffer.from([0]), sigObj.s])
      for (var lenS = 33, posS = 0; lenS > 1 && s[posS] === 0x00 && !(s[posS + 1] & 0x80); --lenS, ++posS);

      return bip66.encode(r.slice(posR), s.slice(posS))
    }

    exports.signatureImport = function (sig) {
      var r = Buffer.from(ZERO_BUFFER_32)
      var s = Buffer.from(ZERO_BUFFER_32)

      try {
        var sigObj = bip66.decode(sig)
        if (sigObj.r.length === 33 && sigObj.r[0] === 0x00) sigObj.r = sigObj.r.slice(1)
        if (sigObj.r.length > 32) throw new Error('R length is too long')
        if (sigObj.s.length === 33 && sigObj.s[0] === 0x00) sigObj.s = sigObj.s.slice(1)
        if (sigObj.s.length > 32) throw new Error('S length is too long')
      } catch (err) {
        return
      }

      sigObj.r.copy(r, 32 - sigObj.r.length)
      sigObj.s.copy(s, 32 - sigObj.s.length)

      return { r: r, s: s }
    }

    exports.signatureImportLax = function (sig) {
      var r = Buffer.from(ZERO_BUFFER_32)
      var s = Buffer.from(ZERO_BUFFER_32)

      var length = sig.length
      var index = 0

      // sequence tag byte
      if (sig[index++] !== 0x30) return

      // sequence length byte
      var lenbyte = sig[index++]
      if (lenbyte & 0x80) {
        index += lenbyte - 0x80
        if (index > length) return
      }

      // sequence tag byte for r
      if (sig[index++] !== 0x02) return

      // length for r
      var rlen = sig[index++]
      if (rlen & 0x80) {
        lenbyte = rlen - 0x80
        if (index + lenbyte > length) return
        for (; lenbyte > 0 && sig[index] === 0x00; index += 1, lenbyte -= 1);
        for (rlen = 0; lenbyte > 0; index += 1, lenbyte -= 1) rlen = (rlen << 8) + sig[index]
      }
      if (rlen > length - index) return
      var rindex = index
      index += rlen

      // sequence tag byte for s
      if (sig[index++] !== 0x02) return

      // length for s
      var slen = sig[index++]
      if (slen & 0x80) {
        lenbyte = slen - 0x80
        if (index + lenbyte > length) return
        for (; lenbyte > 0 && sig[index] === 0x00; index += 1, lenbyte -= 1);
        for (slen = 0; lenbyte > 0; index += 1, lenbyte -= 1) slen = (slen << 8) + sig[index]
      }
      if (slen > length - index) return
      var sindex = index
      index += slen

      // ignore leading zeros in r
      for (; rlen > 0 && sig[rindex] === 0x00; rlen -= 1, rindex += 1);
      // copy r value
      if (rlen > 32) return
      var rvalue = sig.slice(rindex, rindex + rlen)
      rvalue.copy(r, 32 - rvalue.length)

      // ignore leading zeros in s
      for (; slen > 0 && sig[sindex] === 0x00; slen -= 1, sindex += 1);
      // copy s value
      if (slen > 32) return
      var svalue = sig.slice(sindex, sindex + slen)
      svalue.copy(s, 32 - svalue.length)

      return { r: r, s: s }
    }

  },{"bip66":2,"safe-buffer":53}],57:[function(require,module,exports){
    'use strict'
    var Buffer = require('safe-buffer').Buffer
    var createHash = require('create-hash')
    var BN = require('bn.js')
    var EC = require('elliptic').ec

    var messages = require('../messages.json')

    var ec = new EC('secp256k1')
    var ecparams = ec.curve

    function loadCompressedPublicKey (first, xBuffer) {
      var x = new BN(xBuffer)

      // overflow
      if (x.cmp(ecparams.p) >= 0) return null
      x = x.toRed(ecparams.red)

      // compute corresponding Y
      var y = x.redSqr().redIMul(x).redIAdd(ecparams.b).redSqrt()
      if ((first === 0x03) !== y.isOdd()) y = y.redNeg()

      return ec.keyPair({ pub: { x: x, y: y } })
    }

    function loadUncompressedPublicKey (first, xBuffer, yBuffer) {
      var x = new BN(xBuffer)
      var y = new BN(yBuffer)

      // overflow
      if (x.cmp(ecparams.p) >= 0 || y.cmp(ecparams.p) >= 0) return null

      x = x.toRed(ecparams.red)
      y = y.toRed(ecparams.red)

      // is odd flag
      if ((first === 0x06 || first === 0x07) && y.isOdd() !== (first === 0x07)) return null

      // x*x*x + b = y*y
      var x3 = x.redSqr().redIMul(x)
      if (!y.redSqr().redISub(x3.redIAdd(ecparams.b)).isZero()) return null

      return ec.keyPair({ pub: { x: x, y: y } })
    }

    function loadPublicKey (publicKey) {
      var first = publicKey[0]
      switch (first) {
        case 0x02:
        case 0x03:
          if (publicKey.length !== 33) return null
          return loadCompressedPublicKey(first, publicKey.slice(1, 33))
        case 0x04:
        case 0x06:
        case 0x07:
          if (publicKey.length !== 65) return null
          return loadUncompressedPublicKey(first, publicKey.slice(1, 33), publicKey.slice(33, 65))
        default:
          return null
      }
    }

    exports.privateKeyVerify = function (privateKey) {
      var bn = new BN(privateKey)
      return bn.cmp(ecparams.n) < 0 && !bn.isZero()
    }

    exports.privateKeyExport = function (privateKey, compressed) {
      var d = new BN(privateKey)
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PRIVATE_KEY_EXPORT_DER_FAIL)

      return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, true))
    }

    exports.privateKeyTweakAdd = function (privateKey, tweak) {
      var bn = new BN(tweak)
      if (bn.cmp(ecparams.n) >= 0) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL)

      bn.iadd(new BN(privateKey))
      if (bn.cmp(ecparams.n) >= 0) bn.isub(ecparams.n)
      if (bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL)

      return bn.toArrayLike(Buffer, 'be', 32)
    }

    exports.privateKeyTweakMul = function (privateKey, tweak) {
      var bn = new BN(tweak)
      if (bn.cmp(ecparams.n) >= 0 || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL)

      bn.imul(new BN(privateKey))
      if (bn.cmp(ecparams.n)) bn = bn.umod(ecparams.n)

      return bn.toArrayLike(Buffer, 'be', 32)
    }

    exports.publicKeyCreate = function (privateKey, compressed) {
      var d = new BN(privateKey)
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PUBLIC_KEY_CREATE_FAIL)

      return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, true))
    }

    exports.publicKeyConvert = function (publicKey, compressed) {
      var pair = loadPublicKey(publicKey)
      if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)

      return Buffer.from(pair.getPublic(compressed, true))
    }

    exports.publicKeyVerify = function (publicKey) {
      return loadPublicKey(publicKey) !== null
    }

    exports.publicKeyTweakAdd = function (publicKey, tweak, compressed) {
      var pair = loadPublicKey(publicKey)
      if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)

      tweak = new BN(tweak)
      if (tweak.cmp(ecparams.n) >= 0) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_ADD_FAIL)

      return Buffer.from(ecparams.g.mul(tweak).add(pair.pub).encode(true, compressed))
    }

    exports.publicKeyTweakMul = function (publicKey, tweak, compressed) {
      var pair = loadPublicKey(publicKey)
      if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)

      tweak = new BN(tweak)
      if (tweak.cmp(ecparams.n) >= 0 || tweak.isZero()) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL)

      return Buffer.from(pair.pub.mul(tweak).encode(true, compressed))
    }

    exports.publicKeyCombine = function (publicKeys, compressed) {
      var pairs = new Array(publicKeys.length)
      for (var i = 0; i < publicKeys.length; ++i) {
        pairs[i] = loadPublicKey(publicKeys[i])
        if (pairs[i] === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)
      }

      var point = pairs[0].pub
      for (var j = 1; j < pairs.length; ++j) point = point.add(pairs[j].pub)
      if (point.isInfinity()) throw new Error(messages.EC_PUBLIC_KEY_COMBINE_FAIL)

      return Buffer.from(point.encode(true, compressed))
    }

    exports.signatureNormalize = function (signature) {
      var r = new BN(signature.slice(0, 32))
      var s = new BN(signature.slice(32, 64))
      if (r.cmp(ecparams.n) >= 0 || s.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL)

      var result = Buffer.from(signature)
      if (s.cmp(ec.nh) === 1) ecparams.n.sub(s).toArrayLike(Buffer, 'be', 32).copy(result, 32)

      return result
    }

    exports.signatureExport = function (signature) {
      var r = signature.slice(0, 32)
      var s = signature.slice(32, 64)
      if (new BN(r).cmp(ecparams.n) >= 0 || new BN(s).cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL)

      return { r: r, s: s }
    }

    exports.signatureImport = function (sigObj) {
      var r = new BN(sigObj.r)
      if (r.cmp(ecparams.n) >= 0) r = new BN(0)

      var s = new BN(sigObj.s)
      if (s.cmp(ecparams.n) >= 0) s = new BN(0)

      return Buffer.concat([
        r.toArrayLike(Buffer, 'be', 32),
        s.toArrayLike(Buffer, 'be', 32)
      ])
    }

    exports.sign = function (message, privateKey, noncefn, data) {
      if (typeof noncefn === 'function') {
        var getNonce = noncefn
        noncefn = function (counter) {
          var nonce = getNonce(message, privateKey, null, data, counter)
          if (!Buffer.isBuffer(nonce) || nonce.length !== 32) throw new Error(messages.ECDSA_SIGN_FAIL)

          return new BN(nonce)
        }
      }

      var d = new BN(privateKey)
      if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.ECDSA_SIGN_FAIL)

      var result = ec.sign(message, privateKey, { canonical: true, k: noncefn, pers: data })
      return {
        signature: Buffer.concat([
          result.r.toArrayLike(Buffer, 'be', 32),
          result.s.toArrayLike(Buffer, 'be', 32)
        ]),
        recovery: result.recoveryParam
      }
    }

    exports.verify = function (message, signature, publicKey) {
      var sigObj = {r: signature.slice(0, 32), s: signature.slice(32, 64)}

      var sigr = new BN(sigObj.r)
      var sigs = new BN(sigObj.s)
      if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL)
      if (sigs.cmp(ec.nh) === 1 || sigr.isZero() || sigs.isZero()) return false

      var pair = loadPublicKey(publicKey)
      if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)

      return ec.verify(message, sigObj, {x: pair.pub.x, y: pair.pub.y})
    }

    exports.recover = function (message, signature, recovery, compressed) {
      var sigObj = {r: signature.slice(0, 32), s: signature.slice(32, 64)}

      var sigr = new BN(sigObj.r)
      var sigs = new BN(sigObj.s)
      if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL)

      try {
        if (sigr.isZero() || sigs.isZero()) throw new Error()

        var point = ec.recoverPubKey(message, sigObj, recovery)
        return Buffer.from(point.encode(true, compressed))
      } catch (err) {
        throw new Error(messages.ECDSA_RECOVER_FAIL)
      }
    }

    exports.ecdh = function (publicKey, privateKey) {
      var shared = exports.ecdhUnsafe(publicKey, privateKey, true)
      return createHash('sha256').update(shared).digest()
    }

    exports.ecdhUnsafe = function (publicKey, privateKey, compressed) {
      var pair = loadPublicKey(publicKey)
      if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL)

      var scalar = new BN(privateKey)
      if (scalar.cmp(ecparams.n) >= 0 || scalar.isZero()) throw new Error(messages.ECDH_FAIL)

      return Buffer.from(pair.pub.mul(scalar).encode(true, compressed))
    }

  },{"../messages.json":59,"bn.js":3,"create-hash":6,"elliptic":9,"safe-buffer":53}],58:[function(require,module,exports){
    'use strict'
    var assert = require('./assert')
    var der = require('./der')
    var messages = require('./messages.json')

    function initCompressedValue (value, defaultValue) {
      if (value === undefined) return defaultValue

      assert.isBoolean(value, messages.COMPRESSED_TYPE_INVALID)
      return value
    }

    module.exports = function (secp256k1) {
      return {
        privateKeyVerify: function (privateKey) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          return privateKey.length === 32 && secp256k1.privateKeyVerify(privateKey)
        },

        privateKeyExport: function (privateKey, compressed) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)
          var publicKey = secp256k1.privateKeyExport(privateKey, compressed)

          return der.privateKeyExport(privateKey, publicKey, compressed)
        },

        privateKeyImport: function (privateKey) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)

          privateKey = der.privateKeyImport(privateKey)
          if (privateKey && privateKey.length === 32 && secp256k1.privateKeyVerify(privateKey)) return privateKey

          throw new Error(messages.EC_PRIVATE_KEY_IMPORT_DER_FAIL)
        },

        privateKeyTweakAdd: function (privateKey, tweak) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          assert.isBuffer(tweak, messages.TWEAK_TYPE_INVALID)
          assert.isBufferLength(tweak, 32, messages.TWEAK_LENGTH_INVALID)

          return secp256k1.privateKeyTweakAdd(privateKey, tweak)
        },

        privateKeyTweakMul: function (privateKey, tweak) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          assert.isBuffer(tweak, messages.TWEAK_TYPE_INVALID)
          assert.isBufferLength(tweak, 32, messages.TWEAK_LENGTH_INVALID)

          return secp256k1.privateKeyTweakMul(privateKey, tweak)
        },

        publicKeyCreate: function (privateKey, compressed) {
          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.publicKeyCreate(privateKey, compressed)
        },

        publicKeyConvert: function (publicKey, compressed) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.publicKeyConvert(publicKey, compressed)
        },

        publicKeyVerify: function (publicKey) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          return secp256k1.publicKeyVerify(publicKey)
        },

        publicKeyTweakAdd: function (publicKey, tweak, compressed) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          assert.isBuffer(tweak, messages.TWEAK_TYPE_INVALID)
          assert.isBufferLength(tweak, 32, messages.TWEAK_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.publicKeyTweakAdd(publicKey, tweak, compressed)
        },

        publicKeyTweakMul: function (publicKey, tweak, compressed) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          assert.isBuffer(tweak, messages.TWEAK_TYPE_INVALID)
          assert.isBufferLength(tweak, 32, messages.TWEAK_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.publicKeyTweakMul(publicKey, tweak, compressed)
        },

        publicKeyCombine: function (publicKeys, compressed) {
          assert.isArray(publicKeys, messages.EC_PUBLIC_KEYS_TYPE_INVALID)
          assert.isLengthGTZero(publicKeys, messages.EC_PUBLIC_KEYS_LENGTH_INVALID)
          for (var i = 0; i < publicKeys.length; ++i) {
            assert.isBuffer(publicKeys[i], messages.EC_PUBLIC_KEY_TYPE_INVALID)
            assert.isBufferLength2(publicKeys[i], 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)
          }

          compressed = initCompressedValue(compressed, true)

          return secp256k1.publicKeyCombine(publicKeys, compressed)
        },

        signatureNormalize: function (signature) {
          assert.isBuffer(signature, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isBufferLength(signature, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          return secp256k1.signatureNormalize(signature)
        },

        signatureExport: function (signature) {
          assert.isBuffer(signature, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isBufferLength(signature, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          var sigObj = secp256k1.signatureExport(signature)
          return der.signatureExport(sigObj)
        },

        signatureImport: function (sig) {
          assert.isBuffer(sig, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isLengthGTZero(sig, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          var sigObj = der.signatureImport(sig)
          if (sigObj) return secp256k1.signatureImport(sigObj)

          throw new Error(messages.ECDSA_SIGNATURE_PARSE_DER_FAIL)
        },

        signatureImportLax: function (sig) {
          assert.isBuffer(sig, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isLengthGTZero(sig, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          var sigObj = der.signatureImportLax(sig)
          if (sigObj) return secp256k1.signatureImport(sigObj)

          throw new Error(messages.ECDSA_SIGNATURE_PARSE_DER_FAIL)
        },

        sign: function (message, privateKey, options) {
          assert.isBuffer(message, messages.MSG32_TYPE_INVALID)
          assert.isBufferLength(message, 32, messages.MSG32_LENGTH_INVALID)

          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          var data = null
          var noncefn = null
          if (options !== undefined) {
            assert.isObject(options, messages.OPTIONS_TYPE_INVALID)

            if (options.data !== undefined) {
              assert.isBuffer(options.data, messages.OPTIONS_DATA_TYPE_INVALID)
              assert.isBufferLength(options.data, 32, messages.OPTIONS_DATA_LENGTH_INVALID)
              data = options.data
            }

            if (options.noncefn !== undefined) {
              assert.isFunction(options.noncefn, messages.OPTIONS_NONCEFN_TYPE_INVALID)
              noncefn = options.noncefn
            }
          }

          return secp256k1.sign(message, privateKey, noncefn, data)
        },

        verify: function (message, signature, publicKey) {
          assert.isBuffer(message, messages.MSG32_TYPE_INVALID)
          assert.isBufferLength(message, 32, messages.MSG32_LENGTH_INVALID)

          assert.isBuffer(signature, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isBufferLength(signature, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          return secp256k1.verify(message, signature, publicKey)
        },

        recover: function (message, signature, recovery, compressed) {
          assert.isBuffer(message, messages.MSG32_TYPE_INVALID)
          assert.isBufferLength(message, 32, messages.MSG32_LENGTH_INVALID)

          assert.isBuffer(signature, messages.ECDSA_SIGNATURE_TYPE_INVALID)
          assert.isBufferLength(signature, 64, messages.ECDSA_SIGNATURE_LENGTH_INVALID)

          assert.isNumber(recovery, messages.RECOVERY_ID_TYPE_INVALID)
          assert.isNumberInInterval(recovery, -1, 4, messages.RECOVERY_ID_VALUE_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.recover(message, signature, recovery, compressed)
        },

        ecdh: function (publicKey, privateKey) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          return secp256k1.ecdh(publicKey, privateKey)
        },

        ecdhUnsafe: function (publicKey, privateKey, compressed) {
          assert.isBuffer(publicKey, messages.EC_PUBLIC_KEY_TYPE_INVALID)
          assert.isBufferLength2(publicKey, 33, 65, messages.EC_PUBLIC_KEY_LENGTH_INVALID)

          assert.isBuffer(privateKey, messages.EC_PRIVATE_KEY_TYPE_INVALID)
          assert.isBufferLength(privateKey, 32, messages.EC_PRIVATE_KEY_LENGTH_INVALID)

          compressed = initCompressedValue(compressed, true)

          return secp256k1.ecdhUnsafe(publicKey, privateKey, compressed)
        }
      }
    }

  },{"./assert":55,"./der":56,"./messages.json":59}],59:[function(require,module,exports){
    module.exports={
      "COMPRESSED_TYPE_INVALID": "compressed should be a boolean",
      "EC_PRIVATE_KEY_TYPE_INVALID": "private key should be a Buffer",
      "EC_PRIVATE_KEY_LENGTH_INVALID": "private key length is invalid",
      "EC_PRIVATE_KEY_TWEAK_ADD_FAIL": "tweak out of range or resulting private key is invalid",
      "EC_PRIVATE_KEY_TWEAK_MUL_FAIL": "tweak out of range",
      "EC_PRIVATE_KEY_EXPORT_DER_FAIL": "couldn't export to DER format",
      "EC_PRIVATE_KEY_IMPORT_DER_FAIL": "couldn't import from DER format",
      "EC_PUBLIC_KEYS_TYPE_INVALID": "public keys should be an Array",
      "EC_PUBLIC_KEYS_LENGTH_INVALID": "public keys Array should have at least 1 element",
      "EC_PUBLIC_KEY_TYPE_INVALID": "public key should be a Buffer",
      "EC_PUBLIC_KEY_LENGTH_INVALID": "public key length is invalid",
      "EC_PUBLIC_KEY_PARSE_FAIL": "the public key could not be parsed or is invalid",
      "EC_PUBLIC_KEY_CREATE_FAIL": "private was invalid, try again",
      "EC_PUBLIC_KEY_TWEAK_ADD_FAIL": "tweak out of range or resulting public key is invalid",
      "EC_PUBLIC_KEY_TWEAK_MUL_FAIL": "tweak out of range",
      "EC_PUBLIC_KEY_COMBINE_FAIL": "the sum of the public keys is not valid",
      "ECDH_FAIL": "scalar was invalid (zero or overflow)",
      "ECDSA_SIGNATURE_TYPE_INVALID": "signature should be a Buffer",
      "ECDSA_SIGNATURE_LENGTH_INVALID": "signature length is invalid",
      "ECDSA_SIGNATURE_PARSE_FAIL": "couldn't parse signature",
      "ECDSA_SIGNATURE_PARSE_DER_FAIL": "couldn't parse DER signature",
      "ECDSA_SIGNATURE_SERIALIZE_DER_FAIL": "couldn't serialize signature to DER format",
      "ECDSA_SIGN_FAIL": "nonce generation function failed or private key is invalid",
      "ECDSA_RECOVER_FAIL": "couldn't recover public key from signature",
      "MSG32_TYPE_INVALID": "message should be a Buffer",
      "MSG32_LENGTH_INVALID": "message length is invalid",
      "OPTIONS_TYPE_INVALID": "options should be an Object",
      "OPTIONS_DATA_TYPE_INVALID": "options.data should be a Buffer",
      "OPTIONS_DATA_LENGTH_INVALID": "options.data length is invalid",
      "OPTIONS_NONCEFN_TYPE_INVALID": "options.noncefn should be a Function",
      "RECOVERY_ID_TYPE_INVALID": "recovery should be a Number",
      "RECOVERY_ID_VALUE_INVALID": "recovery should have value between -1 and 4",
      "TWEAK_TYPE_INVALID": "tweak should be a Buffer",
      "TWEAK_LENGTH_INVALID": "tweak length is invalid"
    }

  },{}],60:[function(require,module,exports){
    (function (Buffer){
// prototype class for hash functions
      function Hash (blockSize, finalSize) {
        this._block = new Buffer(blockSize)
        this._finalSize = finalSize
        this._blockSize = blockSize
        this._len = 0
        this._s = 0
      }

      Hash.prototype.update = function (data, enc) {
        if (typeof data === 'string') {
          enc = enc || 'utf8'
          data = new Buffer(data, enc)
        }

        var l = this._len += data.length
        var s = this._s || 0
        var f = 0
        var buffer = this._block

        while (s < l) {
          var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
          var ch = (t - f)

          for (var i = 0; i < ch; i++) {
            buffer[(s % this._blockSize) + i] = data[i + f]
          }

          s += ch
          f += ch

          if ((s % this._blockSize) === 0) {
            this._update(buffer)
          }
        }
        this._s = s

        return this
      }

      Hash.prototype.digest = function (enc) {
        // Suppose the length of the message M, in bits, is l
        var l = this._len * 8

        // Append the bit 1 to the end of the message
        this._block[this._len % this._blockSize] = 0x80

        // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
        this._block.fill(0, this._len % this._blockSize + 1)

        if (l % (this._blockSize * 8) >= this._finalSize * 8) {
          this._update(this._block)
          this._block.fill(0)
        }

        // to this append the block which is equal to the number l written in binary
        // TODO: handle case where l is > Math.pow(2, 29)
        this._block.writeInt32BE(l, this._blockSize - 4)

        var hash = this._update(this._block) || this._hash()

        return enc ? hash.toString(enc) : hash
      }

      Hash.prototype._update = function () {
        throw new Error('_update must be implemented by subclass')
      }

      module.exports = Hash

    }).call(this,require("buffer").Buffer)
  },{"buffer":72}],61:[function(require,module,exports){
    var exports = module.exports = function SHA (algorithm) {
      algorithm = algorithm.toLowerCase()

      var Algorithm = exports[algorithm]
      if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)')

      return new Algorithm()
    }

    exports.sha = require('./sha')
    exports.sha1 = require('./sha1')
    exports.sha224 = require('./sha224')
    exports.sha256 = require('./sha256')
    exports.sha384 = require('./sha384')
    exports.sha512 = require('./sha512')

  },{"./sha":62,"./sha1":63,"./sha224":64,"./sha256":65,"./sha384":66,"./sha512":67}],62:[function(require,module,exports){
    (function (Buffer){
      /*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
 * in FIPS PUB 180-1
 * This source code is derived from sha1.js of the same repository.
 * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
 * operation was added.
 */

      var inherits = require('inherits')
      var Hash = require('./hash')

      var K = [
        0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
      ]

      var W = new Array(80)

      function Sha () {
        this.init()
        this._w = W

        Hash.call(this, 64, 56)
      }

      inherits(Sha, Hash)

      Sha.prototype.init = function () {
        this._a = 0x67452301
        this._b = 0xefcdab89
        this._c = 0x98badcfe
        this._d = 0x10325476
        this._e = 0xc3d2e1f0

        return this
      }

      function rotl5 (num) {
        return (num << 5) | (num >>> 27)
      }

      function rotl30 (num) {
        return (num << 30) | (num >>> 2)
      }

      function ft (s, b, c, d) {
        if (s === 0) return (b & c) | ((~b) & d)
        if (s === 2) return (b & c) | (b & d) | (c & d)
        return b ^ c ^ d
      }

      Sha.prototype._update = function (M) {
        var W = this._w

        var a = this._a | 0
        var b = this._b | 0
        var c = this._c | 0
        var d = this._d | 0
        var e = this._e | 0

        for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
        for (; i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]

        for (var j = 0; j < 80; ++j) {
          var s = ~~(j / 20)
          var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

          e = d
          d = c
          c = rotl30(b)
          b = a
          a = t
        }

        this._a = (a + this._a) | 0
        this._b = (b + this._b) | 0
        this._c = (c + this._c) | 0
        this._d = (d + this._d) | 0
        this._e = (e + this._e) | 0
      }

      Sha.prototype._hash = function () {
        var H = new Buffer(20)

        H.writeInt32BE(this._a | 0, 0)
        H.writeInt32BE(this._b | 0, 4)
        H.writeInt32BE(this._c | 0, 8)
        H.writeInt32BE(this._d | 0, 12)
        H.writeInt32BE(this._e | 0, 16)

        return H
      }

      module.exports = Sha

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"buffer":72,"inherits":41}],63:[function(require,module,exports){
    (function (Buffer){
      /*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

      var inherits = require('inherits')
      var Hash = require('./hash')

      var K = [
        0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
      ]

      var W = new Array(80)

      function Sha1 () {
        this.init()
        this._w = W

        Hash.call(this, 64, 56)
      }

      inherits(Sha1, Hash)

      Sha1.prototype.init = function () {
        this._a = 0x67452301
        this._b = 0xefcdab89
        this._c = 0x98badcfe
        this._d = 0x10325476
        this._e = 0xc3d2e1f0

        return this
      }

      function rotl1 (num) {
        return (num << 1) | (num >>> 31)
      }

      function rotl5 (num) {
        return (num << 5) | (num >>> 27)
      }

      function rotl30 (num) {
        return (num << 30) | (num >>> 2)
      }

      function ft (s, b, c, d) {
        if (s === 0) return (b & c) | ((~b) & d)
        if (s === 2) return (b & c) | (b & d) | (c & d)
        return b ^ c ^ d
      }

      Sha1.prototype._update = function (M) {
        var W = this._w

        var a = this._a | 0
        var b = this._b | 0
        var c = this._c | 0
        var d = this._d | 0
        var e = this._e | 0

        for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
        for (; i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16])

        for (var j = 0; j < 80; ++j) {
          var s = ~~(j / 20)
          var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

          e = d
          d = c
          c = rotl30(b)
          b = a
          a = t
        }

        this._a = (a + this._a) | 0
        this._b = (b + this._b) | 0
        this._c = (c + this._c) | 0
        this._d = (d + this._d) | 0
        this._e = (e + this._e) | 0
      }

      Sha1.prototype._hash = function () {
        var H = new Buffer(20)

        H.writeInt32BE(this._a | 0, 0)
        H.writeInt32BE(this._b | 0, 4)
        H.writeInt32BE(this._c | 0, 8)
        H.writeInt32BE(this._d | 0, 12)
        H.writeInt32BE(this._e | 0, 16)

        return H
      }

      module.exports = Sha1

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"buffer":72,"inherits":41}],64:[function(require,module,exports){
    (function (Buffer){
      /**
       * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
       * in FIPS 180-2
       * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
       * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
       *
       */

      var inherits = require('inherits')
      var Sha256 = require('./sha256')
      var Hash = require('./hash')

      var W = new Array(64)

      function Sha224 () {
        this.init()

        this._w = W // new Array(64)

        Hash.call(this, 64, 56)
      }

      inherits(Sha224, Sha256)

      Sha224.prototype.init = function () {
        this._a = 0xc1059ed8
        this._b = 0x367cd507
        this._c = 0x3070dd17
        this._d = 0xf70e5939
        this._e = 0xffc00b31
        this._f = 0x68581511
        this._g = 0x64f98fa7
        this._h = 0xbefa4fa4

        return this
      }

      Sha224.prototype._hash = function () {
        var H = new Buffer(28)

        H.writeInt32BE(this._a, 0)
        H.writeInt32BE(this._b, 4)
        H.writeInt32BE(this._c, 8)
        H.writeInt32BE(this._d, 12)
        H.writeInt32BE(this._e, 16)
        H.writeInt32BE(this._f, 20)
        H.writeInt32BE(this._g, 24)

        return H
      }

      module.exports = Sha224

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"./sha256":65,"buffer":72,"inherits":41}],65:[function(require,module,exports){
    (function (Buffer){
      /**
       * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
       * in FIPS 180-2
       * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
       * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
       *
       */

      var inherits = require('inherits')
      var Hash = require('./hash')

      var K = [
        0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
        0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
        0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
        0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
        0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
        0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
        0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
        0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
        0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
        0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
        0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
        0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
        0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
        0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
        0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
        0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
      ]

      var W = new Array(64)

      function Sha256 () {
        this.init()

        this._w = W // new Array(64)

        Hash.call(this, 64, 56)
      }

      inherits(Sha256, Hash)

      Sha256.prototype.init = function () {
        this._a = 0x6a09e667
        this._b = 0xbb67ae85
        this._c = 0x3c6ef372
        this._d = 0xa54ff53a
        this._e = 0x510e527f
        this._f = 0x9b05688c
        this._g = 0x1f83d9ab
        this._h = 0x5be0cd19

        return this
      }

      function ch (x, y, z) {
        return z ^ (x & (y ^ z))
      }

      function maj (x, y, z) {
        return (x & y) | (z & (x | y))
      }

      function sigma0 (x) {
        return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
      }

      function sigma1 (x) {
        return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
      }

      function gamma0 (x) {
        return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
      }

      function gamma1 (x) {
        return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
      }

      Sha256.prototype._update = function (M) {
        var W = this._w

        var a = this._a | 0
        var b = this._b | 0
        var c = this._c | 0
        var d = this._d | 0
        var e = this._e | 0
        var f = this._f | 0
        var g = this._g | 0
        var h = this._h | 0

        for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
        for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0

        for (var j = 0; j < 64; ++j) {
          var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0
          var T2 = (sigma0(a) + maj(a, b, c)) | 0

          h = g
          g = f
          f = e
          e = (d + T1) | 0
          d = c
          c = b
          b = a
          a = (T1 + T2) | 0
        }

        this._a = (a + this._a) | 0
        this._b = (b + this._b) | 0
        this._c = (c + this._c) | 0
        this._d = (d + this._d) | 0
        this._e = (e + this._e) | 0
        this._f = (f + this._f) | 0
        this._g = (g + this._g) | 0
        this._h = (h + this._h) | 0
      }

      Sha256.prototype._hash = function () {
        var H = new Buffer(32)

        H.writeInt32BE(this._a, 0)
        H.writeInt32BE(this._b, 4)
        H.writeInt32BE(this._c, 8)
        H.writeInt32BE(this._d, 12)
        H.writeInt32BE(this._e, 16)
        H.writeInt32BE(this._f, 20)
        H.writeInt32BE(this._g, 24)
        H.writeInt32BE(this._h, 28)

        return H
      }

      module.exports = Sha256

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"buffer":72,"inherits":41}],66:[function(require,module,exports){
    (function (Buffer){
      var inherits = require('inherits')
      var SHA512 = require('./sha512')
      var Hash = require('./hash')

      var W = new Array(160)

      function Sha384 () {
        this.init()
        this._w = W

        Hash.call(this, 128, 112)
      }

      inherits(Sha384, SHA512)

      Sha384.prototype.init = function () {
        this._ah = 0xcbbb9d5d
        this._bh = 0x629a292a
        this._ch = 0x9159015a
        this._dh = 0x152fecd8
        this._eh = 0x67332667
        this._fh = 0x8eb44a87
        this._gh = 0xdb0c2e0d
        this._hh = 0x47b5481d

        this._al = 0xc1059ed8
        this._bl = 0x367cd507
        this._cl = 0x3070dd17
        this._dl = 0xf70e5939
        this._el = 0xffc00b31
        this._fl = 0x68581511
        this._gl = 0x64f98fa7
        this._hl = 0xbefa4fa4

        return this
      }

      Sha384.prototype._hash = function () {
        var H = new Buffer(48)

        function writeInt64BE (h, l, offset) {
          H.writeInt32BE(h, offset)
          H.writeInt32BE(l, offset + 4)
        }

        writeInt64BE(this._ah, this._al, 0)
        writeInt64BE(this._bh, this._bl, 8)
        writeInt64BE(this._ch, this._cl, 16)
        writeInt64BE(this._dh, this._dl, 24)
        writeInt64BE(this._eh, this._el, 32)
        writeInt64BE(this._fh, this._fl, 40)

        return H
      }

      module.exports = Sha384

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"./sha512":67,"buffer":72,"inherits":41}],67:[function(require,module,exports){
    (function (Buffer){
      var inherits = require('inherits')
      var Hash = require('./hash')

      var K = [
        0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
        0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
        0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
        0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
        0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
        0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
        0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
        0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
        0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
        0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
        0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
        0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
        0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
        0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
        0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
        0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
        0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
        0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
        0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
        0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
        0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
        0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
        0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
        0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
        0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
        0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
        0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
        0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
        0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
        0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
        0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
        0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
        0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
        0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
        0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
        0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
        0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
        0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
        0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
        0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
      ]

      var W = new Array(160)

      function Sha512 () {
        this.init()
        this._w = W

        Hash.call(this, 128, 112)
      }

      inherits(Sha512, Hash)

      Sha512.prototype.init = function () {
        this._ah = 0x6a09e667
        this._bh = 0xbb67ae85
        this._ch = 0x3c6ef372
        this._dh = 0xa54ff53a
        this._eh = 0x510e527f
        this._fh = 0x9b05688c
        this._gh = 0x1f83d9ab
        this._hh = 0x5be0cd19

        this._al = 0xf3bcc908
        this._bl = 0x84caa73b
        this._cl = 0xfe94f82b
        this._dl = 0x5f1d36f1
        this._el = 0xade682d1
        this._fl = 0x2b3e6c1f
        this._gl = 0xfb41bd6b
        this._hl = 0x137e2179

        return this
      }

      function Ch (x, y, z) {
        return z ^ (x & (y ^ z))
      }

      function maj (x, y, z) {
        return (x & y) | (z & (x | y))
      }

      function sigma0 (x, xl) {
        return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25)
      }

      function sigma1 (x, xl) {
        return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23)
      }

      function Gamma0 (x, xl) {
        return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7)
      }

      function Gamma0l (x, xl) {
        return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25)
      }

      function Gamma1 (x, xl) {
        return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6)
      }

      function Gamma1l (x, xl) {
        return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26)
      }

      function getCarry (a, b) {
        return (a >>> 0) < (b >>> 0) ? 1 : 0
      }

      Sha512.prototype._update = function (M) {
        var W = this._w

        var ah = this._ah | 0
        var bh = this._bh | 0
        var ch = this._ch | 0
        var dh = this._dh | 0
        var eh = this._eh | 0
        var fh = this._fh | 0
        var gh = this._gh | 0
        var hh = this._hh | 0

        var al = this._al | 0
        var bl = this._bl | 0
        var cl = this._cl | 0
        var dl = this._dl | 0
        var el = this._el | 0
        var fl = this._fl | 0
        var gl = this._gl | 0
        var hl = this._hl | 0

        for (var i = 0; i < 32; i += 2) {
          W[i] = M.readInt32BE(i * 4)
          W[i + 1] = M.readInt32BE(i * 4 + 4)
        }
        for (; i < 160; i += 2) {
          var xh = W[i - 15 * 2]
          var xl = W[i - 15 * 2 + 1]
          var gamma0 = Gamma0(xh, xl)
          var gamma0l = Gamma0l(xl, xh)

          xh = W[i - 2 * 2]
          xl = W[i - 2 * 2 + 1]
          var gamma1 = Gamma1(xh, xl)
          var gamma1l = Gamma1l(xl, xh)

          // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
          var Wi7h = W[i - 7 * 2]
          var Wi7l = W[i - 7 * 2 + 1]

          var Wi16h = W[i - 16 * 2]
          var Wi16l = W[i - 16 * 2 + 1]

          var Wil = (gamma0l + Wi7l) | 0
          var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0
          Wil = (Wil + gamma1l) | 0
          Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0
          Wil = (Wil + Wi16l) | 0
          Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0

          W[i] = Wih
          W[i + 1] = Wil
        }

        for (var j = 0; j < 160; j += 2) {
          Wih = W[j]
          Wil = W[j + 1]

          var majh = maj(ah, bh, ch)
          var majl = maj(al, bl, cl)

          var sigma0h = sigma0(ah, al)
          var sigma0l = sigma0(al, ah)
          var sigma1h = sigma1(eh, el)
          var sigma1l = sigma1(el, eh)

          // t1 = h + sigma1 + ch + K[j] + W[j]
          var Kih = K[j]
          var Kil = K[j + 1]

          var chh = Ch(eh, fh, gh)
          var chl = Ch(el, fl, gl)

          var t1l = (hl + sigma1l) | 0
          var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0
          t1l = (t1l + chl) | 0
          t1h = (t1h + chh + getCarry(t1l, chl)) | 0
          t1l = (t1l + Kil) | 0
          t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0
          t1l = (t1l + Wil) | 0
          t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0

          // t2 = sigma0 + maj
          var t2l = (sigma0l + majl) | 0
          var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0

          hh = gh
          hl = gl
          gh = fh
          gl = fl
          fh = eh
          fl = el
          el = (dl + t1l) | 0
          eh = (dh + t1h + getCarry(el, dl)) | 0
          dh = ch
          dl = cl
          ch = bh
          cl = bl
          bh = ah
          bl = al
          al = (t1l + t2l) | 0
          ah = (t1h + t2h + getCarry(al, t1l)) | 0
        }

        this._al = (this._al + al) | 0
        this._bl = (this._bl + bl) | 0
        this._cl = (this._cl + cl) | 0
        this._dl = (this._dl + dl) | 0
        this._el = (this._el + el) | 0
        this._fl = (this._fl + fl) | 0
        this._gl = (this._gl + gl) | 0
        this._hl = (this._hl + hl) | 0

        this._ah = (this._ah + ah + getCarry(this._al, al)) | 0
        this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0
        this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0
        this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0
        this._eh = (this._eh + eh + getCarry(this._el, el)) | 0
        this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0
        this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0
        this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0
      }

      Sha512.prototype._hash = function () {
        var H = new Buffer(64)

        function writeInt64BE (h, l, offset) {
          H.writeInt32BE(h, offset)
          H.writeInt32BE(l, offset + 4)
        }

        writeInt64BE(this._ah, this._al, 0)
        writeInt64BE(this._bh, this._bl, 8)
        writeInt64BE(this._ch, this._cl, 16)
        writeInt64BE(this._dh, this._dl, 24)
        writeInt64BE(this._eh, this._el, 32)
        writeInt64BE(this._fh, this._fl, 40)
        writeInt64BE(this._gh, this._gl, 48)
        writeInt64BE(this._hh, this._hl, 56)

        return H
      }

      module.exports = Sha512

    }).call(this,require("buffer").Buffer)
  },{"./hash":60,"buffer":72,"inherits":41}],68:[function(require,module,exports){
    var isHexPrefixed = require('is-hex-prefixed');

    /**
     * Removes '0x' from a given `String` is present
     * @param {String} str the string value
     * @return {String|Optional} a string by pass if necessary
     */
    module.exports = function stripHexPrefix(str) {
      if (typeof str !== 'string') {
        return str;
      }

      return isHexPrefixed(str) ? str.slice(2) : str;
    }

  },{"is-hex-prefixed":42}],69:[function(require,module,exports){
    (function (global){
      'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

      /*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
      function compare(a, b) {
        if (a === b) {
          return 0;
        }

        var x = a.length;
        var y = b.length;

        for (var i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }

        if (x < y) {
          return -1;
        }
        if (y < x) {
          return 1;
        }
        return 0;
      }
      function isBuffer(b) {
        if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
          return global.Buffer.isBuffer(b);
        }
        return !!(b != null && b._isBuffer);
      }

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

      var util = require('util/');
      var hasOwn = Object.prototype.hasOwnProperty;
      var pSlice = Array.prototype.slice;
      var functionsHaveNames = (function () {
        return function foo() {}.name === 'foo';
      }());
      function pToString (obj) {
        return Object.prototype.toString.call(obj);
      }
      function isView(arrbuf) {
        if (isBuffer(arrbuf)) {
          return false;
        }
        if (typeof global.ArrayBuffer !== 'function') {
          return false;
        }
        if (typeof ArrayBuffer.isView === 'function') {
          return ArrayBuffer.isView(arrbuf);
        }
        if (!arrbuf) {
          return false;
        }
        if (arrbuf instanceof DataView) {
          return true;
        }
        if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
          return true;
        }
        return false;
      }
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

      var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

      var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
      function getName(func) {
        if (!util.isFunction(func)) {
          return;
        }
        if (functionsHaveNames) {
          return func.name;
        }
        var str = func.toString();
        var match = str.match(regex);
        return match && match[1];
      }
      assert.AssertionError = function AssertionError(options) {
        this.name = 'AssertionError';
        this.actual = options.actual;
        this.expected = options.expected;
        this.operator = options.operator;
        if (options.message) {
          this.message = options.message;
          this.generatedMessage = false;
        } else {
          this.message = getMessage(this);
          this.generatedMessage = true;
        }
        var stackStartFunction = options.stackStartFunction || fail;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, stackStartFunction);
        } else {
          // non v8 browsers so we can have a stacktrace
          var err = new Error();
          if (err.stack) {
            var out = err.stack;

            // try to strip useless frames
            var fn_name = getName(stackStartFunction);
            var idx = out.indexOf('\n' + fn_name);
            if (idx >= 0) {
              // once we have located the function frame
              // we need to strip out everything before it (and its line)
              var next_line = out.indexOf('\n', idx + 1);
              out = out.substring(next_line + 1);
            }

            this.stack = out;
          }
        }
      };

// assert.AssertionError instanceof Error
      util.inherits(assert.AssertionError, Error);

      function truncate(s, n) {
        if (typeof s === 'string') {
          return s.length < n ? s : s.slice(0, n);
        } else {
          return s;
        }
      }
      function inspect(something) {
        if (functionsHaveNames || !util.isFunction(something)) {
          return util.inspect(something);
        }
        var rawname = getName(something);
        var name = rawname ? ': ' + rawname : '';
        return '[Function' +  name + ']';
      }
      function getMessage(self) {
        return truncate(inspect(self.actual), 128) + ' ' +
          self.operator + ' ' +
          truncate(inspect(self.expected), 128);
      }

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

      function fail(actual, expected, message, operator, stackStartFunction) {
        throw new assert.AssertionError({
          message: message,
          actual: actual,
          expected: expected,
          operator: operator,
          stackStartFunction: stackStartFunction
        });
      }

// EXTENSION! allows for well behaved errors defined elsewhere.
      assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

      function ok(value, message) {
        if (!value) fail(value, true, message, '==', assert.ok);
      }
      assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

      assert.equal = function equal(actual, expected, message) {
        if (actual != expected) fail(actual, expected, message, '==', assert.equal);
      };

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

      assert.notEqual = function notEqual(actual, expected, message) {
        if (actual == expected) {
          fail(actual, expected, message, '!=', assert.notEqual);
        }
      };

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

      assert.deepEqual = function deepEqual(actual, expected, message) {
        if (!_deepEqual(actual, expected, false)) {
          fail(actual, expected, message, 'deepEqual', assert.deepEqual);
        }
      };

      assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
        if (!_deepEqual(actual, expected, true)) {
          fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
        }
      };

      function _deepEqual(actual, expected, strict, memos) {
        // 7.1. All identical values are equivalent, as determined by ===.
        if (actual === expected) {
          return true;
        } else if (isBuffer(actual) && isBuffer(expected)) {
          return compare(actual, expected) === 0;

          // 7.2. If the expected value is a Date object, the actual value is
          // equivalent if it is also a Date object that refers to the same time.
        } else if (util.isDate(actual) && util.isDate(expected)) {
          return actual.getTime() === expected.getTime();

          // 7.3 If the expected value is a RegExp object, the actual value is
          // equivalent if it is also a RegExp object with the same source and
          // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
        } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
          return actual.source === expected.source &&
            actual.global === expected.global &&
            actual.multiline === expected.multiline &&
            actual.lastIndex === expected.lastIndex &&
            actual.ignoreCase === expected.ignoreCase;

          // 7.4. Other pairs that do not both pass typeof value == 'object',
          // equivalence is determined by ==.
        } else if ((actual === null || typeof actual !== 'object') &&
          (expected === null || typeof expected !== 'object')) {
          return strict ? actual === expected : actual == expected;

          // If both values are instances of typed arrays, wrap their underlying
          // ArrayBuffers in a Buffer each to increase performance
          // This optimization requires the arrays to have the same type as checked by
          // Object.prototype.toString (aka pToString). Never perform binary
          // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
          // bit patterns are not identical.
        } else if (isView(actual) && isView(expected) &&
          pToString(actual) === pToString(expected) &&
          !(actual instanceof Float32Array ||
            actual instanceof Float64Array)) {
          return compare(new Uint8Array(actual.buffer),
            new Uint8Array(expected.buffer)) === 0;

          // 7.5 For all other Object pairs, including Array objects, equivalence is
          // determined by having the same number of owned properties (as verified
          // with Object.prototype.hasOwnProperty.call), the same set of keys
          // (although not necessarily the same order), equivalent values for every
          // corresponding key, and an identical 'prototype' property. Note: this
          // accounts for both named and indexed properties on Arrays.
        } else if (isBuffer(actual) !== isBuffer(expected)) {
          return false;
        } else {
          memos = memos || {actual: [], expected: []};

          var actualIndex = memos.actual.indexOf(actual);
          if (actualIndex !== -1) {
            if (actualIndex === memos.expected.indexOf(expected)) {
              return true;
            }
          }

          memos.actual.push(actual);
          memos.expected.push(expected);

          return objEquiv(actual, expected, strict, memos);
        }
      }

      function isArguments(object) {
        return Object.prototype.toString.call(object) == '[object Arguments]';
      }

      function objEquiv(a, b, strict, actualVisitedObjects) {
        if (a === null || a === undefined || b === null || b === undefined)
          return false;
        // if one is a primitive, the other must be same
        if (util.isPrimitive(a) || util.isPrimitive(b))
          return a === b;
        if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
          return false;
        var aIsArgs = isArguments(a);
        var bIsArgs = isArguments(b);
        if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
          return false;
        if (aIsArgs) {
          a = pSlice.call(a);
          b = pSlice.call(b);
          return _deepEqual(a, b, strict);
        }
        var ka = objectKeys(a);
        var kb = objectKeys(b);
        var key, i;
        // having the same number of owned properties (keys incorporates
        // hasOwnProperty)
        if (ka.length !== kb.length)
          return false;
        //the same set of keys (although not necessarily the same order),
        ka.sort();
        kb.sort();
        //~~~cheap key test
        for (i = ka.length - 1; i >= 0; i--) {
          if (ka[i] !== kb[i])
            return false;
        }
        //equivalent values for every corresponding key, and
        //~~~possibly expensive deep test
        for (i = ka.length - 1; i >= 0; i--) {
          key = ka[i];
          if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
            return false;
        }
        return true;
      }

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

      assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
        if (_deepEqual(actual, expected, false)) {
          fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
        }
      };

      assert.notDeepStrictEqual = notDeepStrictEqual;
      function notDeepStrictEqual(actual, expected, message) {
        if (_deepEqual(actual, expected, true)) {
          fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
        }
      }


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

      assert.strictEqual = function strictEqual(actual, expected, message) {
        if (actual !== expected) {
          fail(actual, expected, message, '===', assert.strictEqual);
        }
      };

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

      assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
        if (actual === expected) {
          fail(actual, expected, message, '!==', assert.notStrictEqual);
        }
      };

      function expectedException(actual, expected) {
        if (!actual || !expected) {
          return false;
        }

        if (Object.prototype.toString.call(expected) == '[object RegExp]') {
          return expected.test(actual);
        }

        try {
          if (actual instanceof expected) {
            return true;
          }
        } catch (e) {
          // Ignore.  The instanceof check doesn't work for arrow functions.
        }

        if (Error.isPrototypeOf(expected)) {
          return false;
        }

        return expected.call({}, actual) === true;
      }

      function _tryBlock(block) {
        var error;
        try {
          block();
        } catch (e) {
          error = e;
        }
        return error;
      }

      function _throws(shouldThrow, block, expected, message) {
        var actual;

        if (typeof block !== 'function') {
          throw new TypeError('"block" argument must be a function');
        }

        if (typeof expected === 'string') {
          message = expected;
          expected = null;
        }

        actual = _tryBlock(block);

        message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
          (message ? ' ' + message : '.');

        if (shouldThrow && !actual) {
          fail(actual, expected, 'Missing expected exception' + message);
        }

        var userProvidedMessage = typeof message === 'string';
        var isUnwantedException = !shouldThrow && util.isError(actual);
        var isUnexpectedException = !shouldThrow && actual && !expected;

        if ((isUnwantedException &&
          userProvidedMessage &&
          expectedException(actual, expected)) ||
          isUnexpectedException) {
          fail(actual, expected, 'Got unwanted exception' + message);
        }

        if ((shouldThrow && actual && expected &&
          !expectedException(actual, expected)) || (!shouldThrow && actual)) {
          throw actual;
        }
      }

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

      assert.throws = function(block, /*optional*/error, /*optional*/message) {
        _throws(true, block, error, message);
      };

// EXTENSION! This is annoying to write outside this module.
      assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
        _throws(false, block, error, message);
      };

      assert.ifError = function(err) { if (err) throw err; };

      var objectKeys = Object.keys || function (obj) {
        var keys = [];
        for (var key in obj) {
          if (hasOwn.call(obj, key)) keys.push(key);
        }
        return keys;
      };

    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{"util/":100}],70:[function(require,module,exports){
    'use strict'

    exports.byteLength = byteLength
    exports.toByteArray = toByteArray
    exports.fromByteArray = fromByteArray

    var lookup = []
    var revLookup = []
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i]
      revLookup[code.charCodeAt(i)] = i
    }

    revLookup['-'.charCodeAt(0)] = 62
    revLookup['_'.charCodeAt(0)] = 63

    function placeHoldersCount (b64) {
      var len = b64.length
      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
    }

    function byteLength (b64) {
      // base64 is 4/3 + up to two characters of the original data
      return (b64.length * 3 / 4) - placeHoldersCount(b64)
    }

    function toByteArray (b64) {
      var i, l, tmp, placeHolders, arr
      var len = b64.length
      placeHolders = placeHoldersCount(b64)

      arr = new Arr((len * 3 / 4) - placeHolders)

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len

      var L = 0

      for (i = 0; i < l; i += 4) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
        arr[L++] = (tmp >> 16) & 0xFF
        arr[L++] = (tmp >> 8) & 0xFF
        arr[L++] = tmp & 0xFF
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
        arr[L++] = tmp & 0xFF
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
        arr[L++] = (tmp >> 8) & 0xFF
        arr[L++] = tmp & 0xFF
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp
      var output = []
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
        output.push(tripletToBase64(tmp))
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      var tmp
      var len = uint8.length
      var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
      var output = ''
      var parts = []
      var maxChunkLength = 16383 // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1]
        output += lookup[tmp >> 2]
        output += lookup[(tmp << 4) & 0x3F]
        output += '=='
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
        output += lookup[tmp >> 10]
        output += lookup[(tmp >> 4) & 0x3F]
        output += lookup[(tmp << 2) & 0x3F]
        output += '='
      }

      parts.push(output)

      return parts.join('')
    }

  },{}],71:[function(require,module,exports){

  },{}],72:[function(require,module,exports){
    /*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
    /* eslint-disable no-proto */

    'use strict'

    var base64 = require('base64-js')
    var ieee754 = require('ieee754')

    exports.Buffer = Buffer
    exports.SlowBuffer = SlowBuffer
    exports.INSPECT_MAX_BYTES = 50

    var K_MAX_LENGTH = 0x7fffffff
    exports.kMaxLength = K_MAX_LENGTH

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Print warning and recommend using `buffer` v4.x which has an Object
     *               implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * We report that the browser does not support typed arrays if the are not subclassable
     * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
     * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
     * for __proto__ and has a buggy typed array implementation.
     */
    Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

    if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
      typeof console.error === 'function') {
      console.error(
        'This browser lacks typed array (Uint8Array) support which is required by ' +
        '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
      )
    }

    function typedArraySupport () {
      // Can typed array instances can be augmented?
      try {
        var arr = new Uint8Array(1)
        arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
        return arr.foo() === 42
      } catch (e) {
        return false
      }
    }

    function createBuffer (length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('Invalid typed array length')
      }
      // Return an augmented `Uint8Array` instance
      var buf = new Uint8Array(length)
      buf.__proto__ = Buffer.prototype
      return buf
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(arg)
      }
      return from(arg, encodingOrOffset, length)
    }

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
      Object.defineProperty(Buffer, Symbol.species, {
        value: null,
        configurable: true,
        enumerable: false,
        writable: false
      })
    }

    Buffer.poolSize = 8192 // not used by this implementation

    function from (value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (value instanceof ArrayBuffer) {
        return fromArrayBuffer(value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(value, encodingOrOffset)
      }

      return fromObject(value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length)
    }

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
    Buffer.prototype.__proto__ = Uint8Array.prototype
    Buffer.__proto__ = Uint8Array

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (size, fill, encoding) {
      assertSize(size)
      if (size <= 0) {
        return createBuffer(size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(size).fill(fill, encoding)
          : createBuffer(size).fill(fill)
      }
      return createBuffer(size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(size, fill, encoding)
    }

    function allocUnsafe (size) {
      assertSize(size)
      return createBuffer(size < 0 ? 0 : checked(size) | 0)
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(size)
    }
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(size)
    }

    function fromString (string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8'
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0
      var buf = createBuffer(length)

      var actual = buf.write(string, encoding)

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual)
      }

      return buf
    }

    function fromArrayLike (array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0
      var buf = createBuffer(length)
      for (var i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255
      }
      return buf
    }

    function fromArrayBuffer (array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      var buf
      if (byteOffset === undefined && length === undefined) {
        buf = new Uint8Array(array)
      } else if (length === undefined) {
        buf = new Uint8Array(array, byteOffset)
      } else {
        buf = new Uint8Array(array, byteOffset, length)
      }

      // Return an augmented `Uint8Array` instance
      buf.__proto__ = Buffer.prototype
      return buf
    }

    function fromObject (obj) {
      if (Buffer.isBuffer(obj)) {
        var len = checked(obj.length) | 0
        var buf = createBuffer(len)

        if (buf.length === 0) {
          return buf
        }

        obj.copy(buf, 0, 0, len)
        return buf
      }

      if (obj) {
        if (isArrayBufferView(obj) || 'length' in obj) {
          if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
            return createBuffer(0)
          }
          return fromArrayLike(obj)
        }

        if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= K_MAX_LENGTH) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
          'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
      }
      return length | 0
    }

    function SlowBuffer (length) {
      if (+length != length) { // eslint-disable-line eqeqeq
        length = 0
      }
      return Buffer.alloc(+length)
    }

    Buffer.isBuffer = function isBuffer (b) {
      return b != null && b._isBuffer === true
    }

    Buffer.compare = function compare (a, b) {
      if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length
      var y = b.length

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i]
          y = b[i]
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    }

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    }

    Buffer.concat = function concat (list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i
      if (length === undefined) {
        length = 0
        for (i = 0; i < list.length; ++i) {
          length += list[i].length
        }
      }

      var buffer = Buffer.allocUnsafe(length)
      var pos = 0
      for (i = 0; i < list.length; ++i) {
        var buf = list[i]
        if (!Buffer.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos)
        pos += buf.length
      }
      return buffer
    }

    function byteLength (string, encoding) {
      if (Buffer.isBuffer(string)) {
        return string.length
      }
      if (isArrayBufferView(string) || string instanceof ArrayBuffer) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string
      }

      var len = string.length
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase()
            loweredCase = true
        }
      }
    }
    Buffer.byteLength = byteLength

    function slowToString (encoding, start, end) {
      var loweredCase = false

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0
      start >>>= 0

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8'

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase()
            loweredCase = true
        }
      }
    }

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
    Buffer.prototype._isBuffer = true

    function swap (b, n, m) {
      var i = b[n]
      b[n] = b[m]
      b[m] = i
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1)
      }
      return this
    }

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3)
        swap(this, i + 1, i + 2)
      }
      return this
    }

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7)
        swap(this, i + 1, i + 6)
        swap(this, i + 2, i + 5)
        swap(this, i + 3, i + 4)
      }
      return this
    }

    Buffer.prototype.toString = function toString () {
      var length = this.length
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    }

    Buffer.prototype.equals = function equals (b) {
      if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    }

    Buffer.prototype.inspect = function inspect () {
      var str = ''
      var max = exports.INSPECT_MAX_BYTES
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
        if (this.length > max) str += ' ... '
      }
      return '<Buffer ' + str + '>'
    }

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!Buffer.isBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0
      }
      if (end === undefined) {
        end = target ? target.length : 0
      }
      if (thisStart === undefined) {
        thisStart = 0
      }
      if (thisEnd === undefined) {
        thisEnd = this.length
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0
      end >>>= 0
      thisStart >>>= 0
      thisEnd >>>= 0

      if (this === target) return 0

      var x = thisEnd - thisStart
      var y = end - start
      var len = Math.min(x, y)

      var thisCopy = this.slice(thisStart, thisEnd)
      var targetCopy = target.slice(start, end)

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i]
          y = targetCopy[i]
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    }

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset
        byteOffset = 0
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000
      }
      byteOffset = +byteOffset  // Coerce to Number.
      if (numberIsNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1)
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding)
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (Buffer.isBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF // Search for a byte value [0-255]
        if (typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1
      var arrLength = arr.length
      var valLength = val.length

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase()
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
          encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2
          arrLength /= 2
          valLength /= 2
          byteOffset /= 2
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i
      if (dir) {
        var foundIndex = -1
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex
            foundIndex = -1
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
        for (i = byteOffset; i >= 0; i--) {
          var found = true
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    }

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    }

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    }

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0
      var remaining = buf.length - offset
      if (!length) {
        length = remaining
      } else {
        length = Number(length)
        if (length > remaining) {
          length = remaining
        }
      }

      // must be an even number of digits
      var strLen = string.length
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16)
        if (numberIsNaN(parsed)) return i
        buf[offset + i] = parsed
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8'
        length = this.length
        offset = 0
        // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset
        length = this.length
        offset = 0
        // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset >>> 0
        if (isFinite(length)) {
          length = length >>> 0
          if (encoding === undefined) encoding = 'utf8'
        } else {
          encoding = length
          length = undefined
        }
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset
      if (length === undefined || length > remaining) length = remaining

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8'

      var loweredCase = false
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase()
            loweredCase = true
        }
      }
    }

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    }

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf)
      } else {
        return base64.fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end)
      var res = []

      var i = start
      while (i < end) {
        var firstByte = buf[i]
        var codePoint = null
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
            : (firstByte > 0xBF) ? 2
              : 1

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte
              }
              break
            case 2:
              secondByte = buf[i + 1]
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint
                }
              }
              break
            case 3:
              secondByte = buf[i + 1]
              thirdByte = buf[i + 2]
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint
                }
              }
              break
            case 4:
              secondByte = buf[i + 1]
              thirdByte = buf[i + 2]
              fourthByte = buf[i + 3]
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD
          bytesPerSequence = 1
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000
          res.push(codePoint >>> 10 & 0x3FF | 0xD800)
          codePoint = 0xDC00 | codePoint & 0x3FF
        }

        res.push(codePoint)
        i += bytesPerSequence
      }

      return decodeCodePointsArray(res)
    }

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = ''
      var i = 0
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        )
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = ''
      end = Math.min(buf.length, end)

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F)
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = ''
      end = Math.min(buf.length, end)

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i])
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length

      if (!start || start < 0) start = 0
      if (!end || end < 0 || end > len) end = len

      var out = ''
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i])
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end)
      var res = ''
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length
      start = ~~start
      end = end === undefined ? len : ~~end

      if (start < 0) {
        start += len
        if (start < 0) start = 0
      } else if (start > len) {
        start = len
      }

      if (end < 0) {
        end += len
        if (end < 0) end = 0
      } else if (end > len) {
        end = len
      }

      if (end < start) end = start

      var newBuf = this.subarray(start, end)
      // Return an augmented `Uint8Array` instance
      newBuf.__proto__ = Buffer.prototype
      return newBuf
    }

    /*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) checkOffset(offset, byteLength, this.length)

      var val = this[offset]
      var mul = 1
      var i = 0
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul
      }

      return val
    }

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length)
      }

      var val = this[offset + --byteLength]
      var mul = 1
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul
      }

      return val
    }

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 1, this.length)
      return this[offset]
    }

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 2, this.length)
      return this[offset] | (this[offset + 1] << 8)
    }

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 2, this.length)
      return (this[offset] << 8) | this[offset + 1]
    }

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)

      return ((this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16)) +
        (this[offset + 3] * 0x1000000)
    }

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
          (this[offset + 2] << 8) |
          this[offset + 3])
    }

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) checkOffset(offset, byteLength, this.length)

      var val = this[offset]
      var mul = 1
      var i = 0
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul
      }
      mul *= 0x80

      if (val >= mul) val -= Math.pow(2, 8 * byteLength)

      return val
    }

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) checkOffset(offset, byteLength, this.length)

      var i = byteLength
      var mul = 1
      var val = this[offset + --i]
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul
      }
      mul *= 0x80

      if (val >= mul) val -= Math.pow(2, 8 * byteLength)

      return val
    }

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 1, this.length)
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    }

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 2, this.length)
      var val = this[offset] | (this[offset + 1] << 8)
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    }

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 2, this.length)
      var val = this[offset + 1] | (this[offset] << 8)
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    }

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    }

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    }

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)
      return ieee754.read(this, offset, true, 23, 4)
    }

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 4, this.length)
      return ieee754.read(this, offset, false, 23, 4)
    }

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 8, this.length)
      return ieee754.read(this, offset, true, 52, 8)
    }

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) checkOffset(offset, 8, this.length)
      return ieee754.read(this, offset, false, 52, 8)
    }

    function checkInt (buf, value, offset, ext, max, min) {
      if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1
        checkInt(this, value, offset, byteLength, maxBytes, 0)
      }

      var mul = 1
      var i = 0
      this[offset] = value & 0xFF
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF
      }

      return offset + byteLength
    }

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1
        checkInt(this, value, offset, byteLength, maxBytes, 0)
      }

      var i = byteLength - 1
      var mul = 1
      this[offset + i] = value & 0xFF
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF
      }

      return offset + byteLength
    }

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
      this[offset] = (value & 0xff)
      return offset + 1
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      return offset + 2
    }

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
      this[offset] = (value >>> 8)
      this[offset + 1] = (value & 0xff)
      return offset + 2
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
      this[offset + 3] = (value >>> 24)
      this[offset + 2] = (value >>> 16)
      this[offset + 1] = (value >>> 8)
      this[offset] = (value & 0xff)
      return offset + 4
    }

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
      this[offset] = (value >>> 24)
      this[offset + 1] = (value >>> 16)
      this[offset + 2] = (value >>> 8)
      this[offset + 3] = (value & 0xff)
      return offset + 4
    }

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        var limit = Math.pow(2, (8 * byteLength) - 1)

        checkInt(this, value, offset, byteLength, limit - 1, -limit)
      }

      var i = 0
      var mul = 1
      var sub = 0
      this[offset] = value & 0xFF
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
      }

      return offset + byteLength
    }

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        var limit = Math.pow(2, (8 * byteLength) - 1)

        checkInt(this, value, offset, byteLength, limit - 1, -limit)
      }

      var i = byteLength - 1
      var mul = 1
      var sub = 0
      this[offset + i] = value & 0xFF
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
      }

      return offset + byteLength
    }

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
      if (value < 0) value = 0xff + value + 1
      this[offset] = (value & 0xff)
      return offset + 1
    }

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      return offset + 2
    }

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
      this[offset] = (value >>> 8)
      this[offset + 1] = (value & 0xff)
      return offset + 2
    }

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      this[offset + 2] = (value >>> 16)
      this[offset + 3] = (value >>> 24)
      return offset + 4
    }

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
      if (value < 0) value = 0xffffffff + value + 1
      this[offset] = (value >>> 24)
      this[offset + 1] = (value >>> 16)
      this[offset + 2] = (value >>> 8)
      this[offset + 3] = (value & 0xff)
      return offset + 4
    }

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
      }
      ieee754.write(buf, value, offset, littleEndian, 23, 4)
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    }

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    }

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
      }
      ieee754.write(buf, value, offset, littleEndian, 52, 8)
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    }

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    }

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0
      if (!end && end !== 0) end = this.length
      if (targetStart >= target.length) targetStart = target.length
      if (!targetStart) targetStart = 0
      if (end > 0 && end < start) end = start

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start
      }

      var len = end - start
      var i

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start]
        }
      } else if (len < 1000) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start]
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        )
      }

      return len
    }

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start
          start = 0
          end = this.length
        } else if (typeof end === 'string') {
          encoding = end
          end = this.length
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0)
          if (code < 256) {
            val = code
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0
      end = end === undefined ? this.length : end >>> 0

      if (!val) val = 0

      var i
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val
        }
      } else {
        var bytes = Buffer.isBuffer(val)
          ? val
          : new Buffer(val, encoding)
        var len = bytes.length
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len]
        }
      }

      return this
    }

// HELPER FUNCTIONS
// ================

    var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = str.trim().replace(INVALID_BASE64_RE, '')
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '='
      }
      return str
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity
      var codePoint
      var length = string.length
      var leadSurrogate = null
      var bytes = []

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i)

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
              continue
            }

            // valid lead
            leadSurrogate = codePoint

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
            leadSurrogate = codePoint
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        }

        leadSurrogate = null

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint)
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          )
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          )
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          )
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = []
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF)
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo
      var byteArray = []
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i)
        hi = c >> 8
        lo = c % 256
        byteArray.push(lo)
        byteArray.push(hi)
      }

      return byteArray
    }

    function base64ToBytes (str) {
      return base64.toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i]
      }
      return i
    }

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
    function isArrayBufferView (obj) {
      return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
    }

    function numberIsNaN (obj) {
      return obj !== obj // eslint-disable-line no-self-compare
    }

  },{"base64-js":70,"ieee754":75}],73:[function(require,module,exports){
    (function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

      function isArray(arg) {
        if (Array.isArray) {
          return Array.isArray(arg);
        }
        return objectToString(arg) === '[object Array]';
      }
      exports.isArray = isArray;

      function isBoolean(arg) {
        return typeof arg === 'boolean';
      }
      exports.isBoolean = isBoolean;

      function isNull(arg) {
        return arg === null;
      }
      exports.isNull = isNull;

      function isNullOrUndefined(arg) {
        return arg == null;
      }
      exports.isNullOrUndefined = isNullOrUndefined;

      function isNumber(arg) {
        return typeof arg === 'number';
      }
      exports.isNumber = isNumber;

      function isString(arg) {
        return typeof arg === 'string';
      }
      exports.isString = isString;

      function isSymbol(arg) {
        return typeof arg === 'symbol';
      }
      exports.isSymbol = isSymbol;

      function isUndefined(arg) {
        return arg === void 0;
      }
      exports.isUndefined = isUndefined;

      function isRegExp(re) {
        return objectToString(re) === '[object RegExp]';
      }
      exports.isRegExp = isRegExp;

      function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
      }
      exports.isObject = isObject;

      function isDate(d) {
        return objectToString(d) === '[object Date]';
      }
      exports.isDate = isDate;

      function isError(e) {
        return (objectToString(e) === '[object Error]' || e instanceof Error);
      }
      exports.isError = isError;

      function isFunction(arg) {
        return typeof arg === 'function';
      }
      exports.isFunction = isFunction;

      function isPrimitive(arg) {
        return arg === null ||
          typeof arg === 'boolean' ||
          typeof arg === 'number' ||
          typeof arg === 'string' ||
          typeof arg === 'symbol' ||  // ES6 symbol
          typeof arg === 'undefined';
      }
      exports.isPrimitive = isPrimitive;

      exports.isBuffer = Buffer.isBuffer;

      function objectToString(o) {
        return Object.prototype.toString.call(o);
      }

    }).call(this,{"isBuffer":require("../../is-buffer/index.js")})
  },{"../../is-buffer/index.js":77}],74:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    function EventEmitter() {
      this._events = this._events || {};
      this._maxListeners = this._maxListeners || undefined;
    }
    module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function(n) {
      if (!isNumber(n) || n < 0 || isNaN(n))
        throw TypeError('n must be a positive number');
      this._maxListeners = n;
      return this;
    };

    EventEmitter.prototype.emit = function(type) {
      var er, handler, len, args, i, listeners;

      if (!this._events)
        this._events = {};

      // If there is no 'error' event listener then throw.
      if (type === 'error') {
        if (!this._events.error ||
          (isObject(this._events.error) && !this._events.error.length)) {
          er = arguments[1];
          if (er instanceof Error) {
            throw er; // Unhandled 'error' event
          } else {
            // At least give some kind of context to the user
            var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
            err.context = er;
            throw err;
          }
        }
      }

      handler = this._events[type];

      if (isUndefined(handler))
        return false;

      if (isFunction(handler)) {
        switch (arguments.length) {
          // fast cases
          case 1:
            handler.call(this);
            break;
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            args = Array.prototype.slice.call(arguments, 1);
            handler.apply(this, args);
        }
      } else if (isObject(handler)) {
        args = Array.prototype.slice.call(arguments, 1);
        listeners = handler.slice();
        len = listeners.length;
        for (i = 0; i < len; i++)
          listeners[i].apply(this, args);
      }

      return true;
    };

    EventEmitter.prototype.addListener = function(type, listener) {
      var m;

      if (!isFunction(listener))
        throw TypeError('listener must be a function');

      if (!this._events)
        this._events = {};

      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (this._events.newListener)
        this.emit('newListener', type,
          isFunction(listener.listener) ?
            listener.listener : listener);

      if (!this._events[type])
      // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;
      else if (isObject(this._events[type]))
      // If we've already got an array, just append.
        this._events[type].push(listener);
      else
      // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];

      // Check for listener leak
      if (isObject(this._events[type]) && !this._events[type].warned) {
        if (!isUndefined(this._maxListeners)) {
          m = this._maxListeners;
        } else {
          m = EventEmitter.defaultMaxListeners;
        }

        if (m && m > 0 && this._events[type].length > m) {
          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
            'leak detected. %d listeners added. ' +
            'Use emitter.setMaxListeners() to increase limit.',
            this._events[type].length);
          if (typeof console.trace === 'function') {
            // not supported in IE 10
            console.trace();
          }
        }
      }

      return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function(type, listener) {
      if (!isFunction(listener))
        throw TypeError('listener must be a function');

      var fired = false;

      function g() {
        this.removeListener(type, g);

        if (!fired) {
          fired = true;
          listener.apply(this, arguments);
        }
      }

      g.listener = listener;
      this.on(type, g);

      return this;
    };

// emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener = function(type, listener) {
      var list, position, length, i;

      if (!isFunction(listener))
        throw TypeError('listener must be a function');

      if (!this._events || !this._events[type])
        return this;

      list = this._events[type];
      length = list.length;
      position = -1;

      if (list === listener ||
        (isFunction(list.listener) && list.listener === listener)) {
        delete this._events[type];
        if (this._events.removeListener)
          this.emit('removeListener', type, listener);

      } else if (isObject(list)) {
        for (i = length; i-- > 0;) {
          if (list[i] === listener ||
            (list[i].listener && list[i].listener === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (list.length === 1) {
          list.length = 0;
          delete this._events[type];
        } else {
          list.splice(position, 1);
        }

        if (this._events.removeListener)
          this.emit('removeListener', type, listener);
      }

      return this;
    };

    EventEmitter.prototype.removeAllListeners = function(type) {
      var key, listeners;

      if (!this._events)
        return this;

      // not listening for removeListener, no need to emit
      if (!this._events.removeListener) {
        if (arguments.length === 0)
          this._events = {};
        else if (this._events[type])
          delete this._events[type];
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        for (key in this._events) {
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = {};
        return this;
      }

      listeners = this._events[type];

      if (isFunction(listeners)) {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        while (listeners.length)
          this.removeListener(type, listeners[listeners.length - 1]);
      }
      delete this._events[type];

      return this;
    };

    EventEmitter.prototype.listeners = function(type) {
      var ret;
      if (!this._events || !this._events[type])
        ret = [];
      else if (isFunction(this._events[type]))
        ret = [this._events[type]];
      else
        ret = this._events[type].slice();
      return ret;
    };

    EventEmitter.prototype.listenerCount = function(type) {
      if (this._events) {
        var evlistener = this._events[type];

        if (isFunction(evlistener))
          return 1;
        else if (evlistener)
          return evlistener.length;
      }
      return 0;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      return emitter.listenerCount(type);
    };

    function isFunction(arg) {
      return typeof arg === 'function';
    }

    function isNumber(arg) {
      return typeof arg === 'number';
    }

    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }

    function isUndefined(arg) {
      return arg === void 0;
    }

  },{}],75:[function(require,module,exports){
    exports.read = function (buffer, offset, isLE, mLen, nBytes) {
      var e, m
      var eLen = nBytes * 8 - mLen - 1
      var eMax = (1 << eLen) - 1
      var eBias = eMax >> 1
      var nBits = -7
      var i = isLE ? (nBytes - 1) : 0
      var d = isLE ? -1 : 1
      var s = buffer[offset + i]

      i += d

      e = s & ((1 << (-nBits)) - 1)
      s >>= (-nBits)
      nBits += eLen
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1)
      e >>= (-nBits)
      nBits += mLen
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen)
        e = e - eBias
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c
      var eLen = nBytes * 8 - mLen - 1
      var eMax = (1 << eLen) - 1
      var eBias = eMax >> 1
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
      var i = isLE ? 0 : (nBytes - 1)
      var d = isLE ? 1 : -1
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

      value = Math.abs(value)

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0
        e = eMax
      } else {
        e = Math.floor(Math.log(value) / Math.LN2)
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--
          c *= 2
        }
        if (e + eBias >= 1) {
          value += rt / c
        } else {
          value += rt * Math.pow(2, 1 - eBias)
        }
        if (value * c >= 2) {
          e++
          c /= 2
        }

        if (e + eBias >= eMax) {
          m = 0
          e = eMax
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen)
          e = e + eBias
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
          e = 0
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m
      eLen += mLen
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128
    }

  },{}],76:[function(require,module,exports){
    arguments[4][41][0].apply(exports,arguments)
  },{"dup":41}],77:[function(require,module,exports){
    /*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
    module.exports = function (obj) {
      return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
    }

    function isBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

// For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
    }

  },{}],78:[function(require,module,exports){
    var toString = {}.toString;

    module.exports = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

  },{}],79:[function(require,module,exports){
    (function (process){
      'use strict';

      if (!process.version ||
        process.version.indexOf('v0.') === 0 ||
        process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
        module.exports = nextTick;
      } else {
        module.exports = process.nextTick;
      }

      function nextTick(fn, arg1, arg2, arg3) {
        if (typeof fn !== 'function') {
          throw new TypeError('"callback" argument must be a function');
        }
        var len = arguments.length;
        var args, i;
        switch (len) {
          case 0:
          case 1:
            return process.nextTick(fn);
          case 2:
            return process.nextTick(function afterTickOne() {
              fn.call(null, arg1);
            });
          case 3:
            return process.nextTick(function afterTickTwo() {
              fn.call(null, arg1, arg2);
            });
          case 4:
            return process.nextTick(function afterTickThree() {
              fn.call(null, arg1, arg2, arg3);
            });
          default:
            args = new Array(len - 1);
            i = 0;
            while (i < args.length) {
              args[i++] = arguments[i];
            }
            return process.nextTick(function afterTick() {
              fn.apply(null, args);
            });
        }
      }

    }).call(this,require('_process'))
  },{"_process":80}],80:[function(require,module,exports){
// shim for using process in browser
    var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

    var cachedSetTimeout;
    var cachedClearTimeout;

    function defaultSetTimout() {
      throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
      throw new Error('clearTimeout has not been defined');
    }
    (function () {
      try {
        if (typeof setTimeout === 'function') {
          cachedSetTimeout = setTimeout;
        } else {
          cachedSetTimeout = defaultSetTimout;
        }
      } catch (e) {
        cachedSetTimeout = defaultSetTimout;
      }
      try {
        if (typeof clearTimeout === 'function') {
          cachedClearTimeout = clearTimeout;
        } else {
          cachedClearTimeout = defaultClearTimeout;
        }
      } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
      }
    } ())
    function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
      }
      // if setTimeout wasn't available but was latter defined
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
      }
      try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
      } catch(e){
        try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
          return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
          // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
          return cachedSetTimeout.call(this, fun, 0);
        }
      }


    }
    function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
      }
      // if clearTimeout wasn't available but was latter defined
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
      }
      try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
      } catch (e){
        try {
          // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
          return cachedClearTimeout.call(null, marker);
        } catch (e){
          // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
          // Some versions of I.E. have different rules for clearTimeout vs setTimeout
          return cachedClearTimeout.call(this, marker);
        }
      }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
      if (!draining || !currentQueue) {
        return;
      }
      draining = false;
      if (currentQueue.length) {
        queue = currentQueue.concat(queue);
      } else {
        queueIndex = -1;
      }
      if (queue.length) {
        drainQueue();
      }
    }

    function drainQueue() {
      if (draining) {
        return;
      }
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
          if (currentQueue) {
            currentQueue[queueIndex].run();
          }
        }
        queueIndex = -1;
        len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
    }

    process.nextTick = function (fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
          args[i - 1] = arguments[i];
        }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
      }
    };

// v8 likes predictible objects
    function Item(fun, array) {
      this.fun = fun;
      this.array = array;
    }
    Item.prototype.run = function () {
      this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;
    process.prependListener = noop;
    process.prependOnceListener = noop;

    process.listeners = function (name) { return [] }

    process.binding = function (name) {
      throw new Error('process.binding is not supported');
    };

    process.cwd = function () { return '/' };
    process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
    };
    process.umask = function() { return 0; };

  },{}],81:[function(require,module,exports){
    module.exports = require('./lib/_stream_duplex.js');

  },{"./lib/_stream_duplex.js":82}],82:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

    'use strict';

    /*<replacement>*/

    var processNextTick = require('process-nextick-args');
    /*</replacement>*/

    /*<replacement>*/
    var objectKeys = Object.keys || function (obj) {
      var keys = [];
      for (var key in obj) {
        keys.push(key);
      }return keys;
    };
    /*</replacement>*/

    module.exports = Duplex;

    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    var Readable = require('./_stream_readable');
    var Writable = require('./_stream_writable');

    util.inherits(Duplex, Readable);

    var keys = objectKeys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
    }

    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);

      Readable.call(this, options);
      Writable.call(this, options);

      if (options && options.readable === false) this.readable = false;

      if (options && options.writable === false) this.writable = false;

      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

      this.once('end', onend);
    }

// the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended) return;

      // no more data can be written.
      // But allow more writes to happen in this tick.
      processNextTick(onEndNT, this);
    }

    function onEndNT(self) {
      self.end();
    }

    Object.defineProperty(Duplex.prototype, 'destroyed', {
      get: function () {
        if (this._readableState === undefined || this._writableState === undefined) {
          return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set: function (value) {
        // we ignore the value if the stream
        // has not been initialized yet
        if (this._readableState === undefined || this._writableState === undefined) {
          return;
        }

        // backward compatibility, the user is explicitly
        // managing destroyed
        this._readableState.destroyed = value;
        this._writableState.destroyed = value;
      }
    });

    Duplex.prototype._destroy = function (err, cb) {
      this.push(null);
      this.end();

      processNextTick(cb, err);
    };

    function forEach(xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
  },{"./_stream_readable":84,"./_stream_writable":86,"core-util-is":73,"inherits":76,"process-nextick-args":79}],83:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

    'use strict';

    module.exports = PassThrough;

    var Transform = require('./_stream_transform');

    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    util.inherits(PassThrough, Transform);

    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);

      Transform.call(this, options);
    }

    PassThrough.prototype._transform = function (chunk, encoding, cb) {
      cb(null, chunk);
    };
  },{"./_stream_transform":85,"core-util-is":73,"inherits":76}],84:[function(require,module,exports){
    (function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

      'use strict';

      /*<replacement>*/

      var processNextTick = require('process-nextick-args');
      /*</replacement>*/

      module.exports = Readable;

      /*<replacement>*/
      var isArray = require('isarray');
      /*</replacement>*/

      /*<replacement>*/
      var Duplex;
      /*</replacement>*/

      Readable.ReadableState = ReadableState;

      /*<replacement>*/
      var EE = require('events').EventEmitter;

      var EElistenerCount = function (emitter, type) {
        return emitter.listeners(type).length;
      };
      /*</replacement>*/

      /*<replacement>*/
      var Stream = require('./internal/streams/stream');
      /*</replacement>*/

// TODO(bmeurer): Change this back to const once hole checks are
// properly optimized away early in Ignition+TurboFan.
      /*<replacement>*/
      var Buffer = require('safe-buffer').Buffer;
      var OurUint8Array = global.Uint8Array || function () {};
      function _uint8ArrayToBuffer(chunk) {
        return Buffer.from(chunk);
      }
      function _isUint8Array(obj) {
        return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
      }
      /*</replacement>*/

      /*<replacement>*/
      var util = require('core-util-is');
      util.inherits = require('inherits');
      /*</replacement>*/

      /*<replacement>*/
      var debugUtil = require('util');
      var debug = void 0;
      if (debugUtil && debugUtil.debuglog) {
        debug = debugUtil.debuglog('stream');
      } else {
        debug = function () {};
      }
      /*</replacement>*/

      var BufferList = require('./internal/streams/BufferList');
      var destroyImpl = require('./internal/streams/destroy');
      var StringDecoder;

      util.inherits(Readable, Stream);

      var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

      function prependListener(emitter, event, fn) {
        // Sadly this is not cacheable as some libraries bundle their own
        // event emitter implementation with them.
        if (typeof emitter.prependListener === 'function') {
          return emitter.prependListener(event, fn);
        } else {
          // This is a hack to make sure that our error handler is attached before any
          // userland ones.  NEVER DO THIS. This is here only because this code needs
          // to continue to work with older versions of Node.js that do not include
          // the prependListener() method. The goal is to eventually remove this hack.
          if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
        }
      }

      function ReadableState(options, stream) {
        Duplex = Duplex || require('./_stream_duplex');

        options = options || {};

        // object stream flag. Used to make read(n) ignore n and to
        // make all the buffer merging and length checks go away
        this.objectMode = !!options.objectMode;

        if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

        // the point at which it stops calling _read() to fill the buffer
        // Note: 0 is a valid value, means "don't call _read preemptively ever"
        var hwm = options.highWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16 * 1024;
        this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

        // cast to ints.
        this.highWaterMark = Math.floor(this.highWaterMark);

        // A linked list is used to store data chunks instead of an array because the
        // linked list can remove elements from the beginning faster than
        // array.shift()
        this.buffer = new BufferList();
        this.length = 0;
        this.pipes = null;
        this.pipesCount = 0;
        this.flowing = null;
        this.ended = false;
        this.endEmitted = false;
        this.reading = false;

        // a flag to be able to tell if the event 'readable'/'data' is emitted
        // immediately, or on a later tick.  We set this to true at first, because
        // any actions that shouldn't happen until "later" should generally also
        // not happen before the first read call.
        this.sync = true;

        // whenever we return null, then we set a flag to say
        // that we're awaiting a 'readable' event emission.
        this.needReadable = false;
        this.emittedReadable = false;
        this.readableListening = false;
        this.resumeScheduled = false;

        // has it been destroyed
        this.destroyed = false;

        // Crypto is kind of old and crusty.  Historically, its default string
        // encoding is 'binary' so we have to make this configurable.
        // Everything else in the universe uses 'utf8', though.
        this.defaultEncoding = options.defaultEncoding || 'utf8';

        // the number of writers that are awaiting a drain event in .pipe()s
        this.awaitDrain = 0;

        // if true, a maybeReadMore has been scheduled
        this.readingMore = false;

        this.decoder = null;
        this.encoding = null;
        if (options.encoding) {
          if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
          this.decoder = new StringDecoder(options.encoding);
          this.encoding = options.encoding;
        }
      }

      function Readable(options) {
        Duplex = Duplex || require('./_stream_duplex');

        if (!(this instanceof Readable)) return new Readable(options);

        this._readableState = new ReadableState(options, this);

        // legacy
        this.readable = true;

        if (options) {
          if (typeof options.read === 'function') this._read = options.read;

          if (typeof options.destroy === 'function') this._destroy = options.destroy;
        }

        Stream.call(this);
      }

      Object.defineProperty(Readable.prototype, 'destroyed', {
        get: function () {
          if (this._readableState === undefined) {
            return false;
          }
          return this._readableState.destroyed;
        },
        set: function (value) {
          // we ignore the value if the stream
          // has not been initialized yet
          if (!this._readableState) {
            return;
          }

          // backward compatibility, the user is explicitly
          // managing destroyed
          this._readableState.destroyed = value;
        }
      });

      Readable.prototype.destroy = destroyImpl.destroy;
      Readable.prototype._undestroy = destroyImpl.undestroy;
      Readable.prototype._destroy = function (err, cb) {
        this.push(null);
        cb(err);
      };

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
      Readable.prototype.push = function (chunk, encoding) {
        var state = this._readableState;
        var skipChunkCheck;

        if (!state.objectMode) {
          if (typeof chunk === 'string') {
            encoding = encoding || state.defaultEncoding;
            if (encoding !== state.encoding) {
              chunk = Buffer.from(chunk, encoding);
              encoding = '';
            }
            skipChunkCheck = true;
          }
        } else {
          skipChunkCheck = true;
        }

        return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
      };

// Unshift should *always* be something directly out of read()
      Readable.prototype.unshift = function (chunk) {
        return readableAddChunk(this, chunk, null, true, false);
      };

      function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
        var state = stream._readableState;
        if (chunk === null) {
          state.reading = false;
          onEofChunk(stream, state);
        } else {
          var er;
          if (!skipChunkCheck) er = chunkInvalid(state, chunk);
          if (er) {
            stream.emit('error', er);
          } else if (state.objectMode || chunk && chunk.length > 0) {
            if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
              chunk = _uint8ArrayToBuffer(chunk);
            }

            if (addToFront) {
              if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
            } else if (state.ended) {
              stream.emit('error', new Error('stream.push() after EOF'));
            } else {
              state.reading = false;
              if (state.decoder && !encoding) {
                chunk = state.decoder.write(chunk);
                if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
              } else {
                addChunk(stream, state, chunk, false);
              }
            }
          } else if (!addToFront) {
            state.reading = false;
          }
        }

        return needMoreData(state);
      }

      function addChunk(stream, state, chunk, addToFront) {
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
        maybeReadMore(stream, state);
      }

      function chunkInvalid(state, chunk) {
        var er;
        if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
          er = new TypeError('Invalid non-string/buffer chunk');
        }
        return er;
      }

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
      function needMoreData(state) {
        return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
      }

      Readable.prototype.isPaused = function () {
        return this._readableState.flowing === false;
      };

// backwards compatibility.
      Readable.prototype.setEncoding = function (enc) {
        if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
        this._readableState.decoder = new StringDecoder(enc);
        this._readableState.encoding = enc;
        return this;
      };

// Don't raise the hwm > 8MB
      var MAX_HWM = 0x800000;
      function computeNewHighWaterMark(n) {
        if (n >= MAX_HWM) {
          n = MAX_HWM;
        } else {
          // Get the next highest power of 2 to prevent increasing hwm excessively in
          // tiny amounts
          n--;
          n |= n >>> 1;
          n |= n >>> 2;
          n |= n >>> 4;
          n |= n >>> 8;
          n |= n >>> 16;
          n++;
        }
        return n;
      }

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
      function howMuchToRead(n, state) {
        if (n <= 0 || state.length === 0 && state.ended) return 0;
        if (state.objectMode) return 1;
        if (n !== n) {
          // Only flow one buffer at a time
          if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
        }
        // If we're asking for more than the current hwm, then raise the hwm.
        if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
        if (n <= state.length) return n;
        // Don't have enough
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        }
        return state.length;
      }

// you can override either this method, or the async _read(n) below.
      Readable.prototype.read = function (n) {
        debug('read', n);
        n = parseInt(n, 10);
        var state = this._readableState;
        var nOrig = n;

        if (n !== 0) state.emittedReadable = false;

        // if we're doing read(0) to trigger a readable event, but we
        // already have a bunch of data in the buffer, then just trigger
        // the 'readable' event and move on.
        if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
          debug('read: emitReadable', state.length, state.ended);
          if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
          return null;
        }

        n = howMuchToRead(n, state);

        // if we've ended, and we're now clear, then finish it up.
        if (n === 0 && state.ended) {
          if (state.length === 0) endReadable(this);
          return null;
        }

        // All the actual chunk generation logic needs to be
        // *below* the call to _read.  The reason is that in certain
        // synthetic stream cases, such as passthrough streams, _read
        // may be a completely synchronous operation which may change
        // the state of the read buffer, providing enough data when
        // before there was *not* enough.
        //
        // So, the steps are:
        // 1. Figure out what the state of things will be after we do
        // a read from the buffer.
        //
        // 2. If that resulting state will trigger a _read, then call _read.
        // Note that this may be asynchronous, or synchronous.  Yes, it is
        // deeply ugly to write APIs this way, but that still doesn't mean
        // that the Readable class should behave improperly, as streams are
        // designed to be sync/async agnostic.
        // Take note if the _read call is sync or async (ie, if the read call
        // has returned yet), so that we know whether or not it's safe to emit
        // 'readable' etc.
        //
        // 3. Actually pull the requested chunks out of the buffer and return.

        // if we need a readable event, then we need to do some reading.
        var doRead = state.needReadable;
        debug('need readable', doRead);

        // if we currently have less than the highWaterMark, then also read some
        if (state.length === 0 || state.length - n < state.highWaterMark) {
          doRead = true;
          debug('length less than watermark', doRead);
        }

        // however, if we've ended, then there's no point, and if we're already
        // reading, then it's unnecessary.
        if (state.ended || state.reading) {
          doRead = false;
          debug('reading or ended', doRead);
        } else if (doRead) {
          debug('do read');
          state.reading = true;
          state.sync = true;
          // if the length is currently zero, then we *need* a readable event.
          if (state.length === 0) state.needReadable = true;
          // call internal read method
          this._read(state.highWaterMark);
          state.sync = false;
          // If _read pushed data synchronously, then `reading` will be false,
          // and we need to re-evaluate how much data we can return to the user.
          if (!state.reading) n = howMuchToRead(nOrig, state);
        }

        var ret;
        if (n > 0) ret = fromList(n, state);else ret = null;

        if (ret === null) {
          state.needReadable = true;
          n = 0;
        } else {
          state.length -= n;
        }

        if (state.length === 0) {
          // If we have nothing in the buffer, then we want to know
          // as soon as we *do* get something into the buffer.
          if (!state.ended) state.needReadable = true;

          // If we tried to read() past the EOF, then emit end on the next tick.
          if (nOrig !== n && state.ended) endReadable(this);
        }

        if (ret !== null) this.emit('data', ret);

        return ret;
      };

      function onEofChunk(stream, state) {
        if (state.ended) return;
        if (state.decoder) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length) {
            state.buffer.push(chunk);
            state.length += state.objectMode ? 1 : chunk.length;
          }
        }
        state.ended = true;

        // emit 'readable' now to make sure it gets picked up.
        emitReadable(stream);
      }

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
      function emitReadable(stream) {
        var state = stream._readableState;
        state.needReadable = false;
        if (!state.emittedReadable) {
          debug('emitReadable', state.flowing);
          state.emittedReadable = true;
          if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
        }
      }

      function emitReadable_(stream) {
        debug('emit readable');
        stream.emit('readable');
        flow(stream);
      }

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
      function maybeReadMore(stream, state) {
        if (!state.readingMore) {
          state.readingMore = true;
          processNextTick(maybeReadMore_, stream, state);
        }
      }

      function maybeReadMore_(stream, state) {
        var len = state.length;
        while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
          debug('maybeReadMore read 0');
          stream.read(0);
          if (len === state.length)
          // didn't get any data, stop spinning.
            break;else len = state.length;
        }
        state.readingMore = false;
      }

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
      Readable.prototype._read = function (n) {
        this.emit('error', new Error('_read() is not implemented'));
      };

      Readable.prototype.pipe = function (dest, pipeOpts) {
        var src = this;
        var state = this._readableState;

        switch (state.pipesCount) {
          case 0:
            state.pipes = dest;
            break;
          case 1:
            state.pipes = [state.pipes, dest];
            break;
          default:
            state.pipes.push(dest);
            break;
        }
        state.pipesCount += 1;
        debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

        var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

        var endFn = doEnd ? onend : unpipe;
        if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

        dest.on('unpipe', onunpipe);
        function onunpipe(readable, unpipeInfo) {
          debug('onunpipe');
          if (readable === src) {
            if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
              unpipeInfo.hasUnpiped = true;
              cleanup();
            }
          }
        }

        function onend() {
          debug('onend');
          dest.end();
        }

        // when the dest drains, it reduces the awaitDrain counter
        // on the source.  This would be more elegant with a .once()
        // handler in flow(), but adding and removing repeatedly is
        // too slow.
        var ondrain = pipeOnDrain(src);
        dest.on('drain', ondrain);

        var cleanedUp = false;
        function cleanup() {
          debug('cleanup');
          // cleanup event handlers once the pipe is broken
          dest.removeListener('close', onclose);
          dest.removeListener('finish', onfinish);
          dest.removeListener('drain', ondrain);
          dest.removeListener('error', onerror);
          dest.removeListener('unpipe', onunpipe);
          src.removeListener('end', onend);
          src.removeListener('end', unpipe);
          src.removeListener('data', ondata);

          cleanedUp = true;

          // if the reader is waiting for a drain event from this
          // specific writer, then it would cause it to never start
          // flowing again.
          // So, if this is awaiting a drain, then we just call it now.
          // If we don't know, then assume that we are waiting for one.
          if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
        }

        // If the user pushes more data while we're writing to dest then we'll end up
        // in ondata again. However, we only want to increase awaitDrain once because
        // dest will only emit one 'drain' event for the multiple writes.
        // => Introduce a guard on increasing awaitDrain.
        var increasedAwaitDrain = false;
        src.on('data', ondata);
        function ondata(chunk) {
          debug('ondata');
          increasedAwaitDrain = false;
          var ret = dest.write(chunk);
          if (false === ret && !increasedAwaitDrain) {
            // If the user unpiped during `dest.write()`, it is possible
            // to get stuck in a permanently paused state if that write
            // also returned false.
            // => Check whether `dest` is still a piping destination.
            if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
              debug('false write response, pause', src._readableState.awaitDrain);
              src._readableState.awaitDrain++;
              increasedAwaitDrain = true;
            }
            src.pause();
          }
        }

        // if the dest has an error, then stop piping into it.
        // however, don't suppress the throwing behavior for this.
        function onerror(er) {
          debug('onerror', er);
          unpipe();
          dest.removeListener('error', onerror);
          if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
        }

        // Make sure our error handler is attached before userland ones.
        prependListener(dest, 'error', onerror);

        // Both close and finish should trigger unpipe, but only once.
        function onclose() {
          dest.removeListener('finish', onfinish);
          unpipe();
        }
        dest.once('close', onclose);
        function onfinish() {
          debug('onfinish');
          dest.removeListener('close', onclose);
          unpipe();
        }
        dest.once('finish', onfinish);

        function unpipe() {
          debug('unpipe');
          src.unpipe(dest);
        }

        // tell the dest that it's being piped to
        dest.emit('pipe', src);

        // start the flow if it hasn't been started already.
        if (!state.flowing) {
          debug('pipe resume');
          src.resume();
        }

        return dest;
      };

      function pipeOnDrain(src) {
        return function () {
          var state = src._readableState;
          debug('pipeOnDrain', state.awaitDrain);
          if (state.awaitDrain) state.awaitDrain--;
          if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
            state.flowing = true;
            flow(src);
          }
        };
      }

      Readable.prototype.unpipe = function (dest) {
        var state = this._readableState;
        var unpipeInfo = { hasUnpiped: false };

        // if we're not piping anywhere, then do nothing.
        if (state.pipesCount === 0) return this;

        // just one destination.  most common case.
        if (state.pipesCount === 1) {
          // passed in one, but it's not the right one.
          if (dest && dest !== state.pipes) return this;

          if (!dest) dest = state.pipes;

          // got a match.
          state.pipes = null;
          state.pipesCount = 0;
          state.flowing = false;
          if (dest) dest.emit('unpipe', this, unpipeInfo);
          return this;
        }

        // slow case. multiple pipe destinations.

        if (!dest) {
          // remove all.
          var dests = state.pipes;
          var len = state.pipesCount;
          state.pipes = null;
          state.pipesCount = 0;
          state.flowing = false;

          for (var i = 0; i < len; i++) {
            dests[i].emit('unpipe', this, unpipeInfo);
          }return this;
        }

        // try to find the right one.
        var index = indexOf(state.pipes, dest);
        if (index === -1) return this;

        state.pipes.splice(index, 1);
        state.pipesCount -= 1;
        if (state.pipesCount === 1) state.pipes = state.pipes[0];

        dest.emit('unpipe', this, unpipeInfo);

        return this;
      };

// set up data events if they are asked for
// Ensure readable listeners eventually get something
      Readable.prototype.on = function (ev, fn) {
        var res = Stream.prototype.on.call(this, ev, fn);

        if (ev === 'data') {
          // Start flowing on next tick if stream isn't explicitly paused
          if (this._readableState.flowing !== false) this.resume();
        } else if (ev === 'readable') {
          var state = this._readableState;
          if (!state.endEmitted && !state.readableListening) {
            state.readableListening = state.needReadable = true;
            state.emittedReadable = false;
            if (!state.reading) {
              processNextTick(nReadingNextTick, this);
            } else if (state.length) {
              emitReadable(this);
            }
          }
        }

        return res;
      };
      Readable.prototype.addListener = Readable.prototype.on;

      function nReadingNextTick(self) {
        debug('readable nexttick read 0');
        self.read(0);
      }

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
      Readable.prototype.resume = function () {
        var state = this._readableState;
        if (!state.flowing) {
          debug('resume');
          state.flowing = true;
          resume(this, state);
        }
        return this;
      };

      function resume(stream, state) {
        if (!state.resumeScheduled) {
          state.resumeScheduled = true;
          processNextTick(resume_, stream, state);
        }
      }

      function resume_(stream, state) {
        if (!state.reading) {
          debug('resume read 0');
          stream.read(0);
        }

        state.resumeScheduled = false;
        state.awaitDrain = 0;
        stream.emit('resume');
        flow(stream);
        if (state.flowing && !state.reading) stream.read(0);
      }

      Readable.prototype.pause = function () {
        debug('call pause flowing=%j', this._readableState.flowing);
        if (false !== this._readableState.flowing) {
          debug('pause');
          this._readableState.flowing = false;
          this.emit('pause');
        }
        return this;
      };

      function flow(stream) {
        var state = stream._readableState;
        debug('flow', state.flowing);
        while (state.flowing && stream.read() !== null) {}
      }

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
      Readable.prototype.wrap = function (stream) {
        var state = this._readableState;
        var paused = false;

        var self = this;
        stream.on('end', function () {
          debug('wrapped end');
          if (state.decoder && !state.ended) {
            var chunk = state.decoder.end();
            if (chunk && chunk.length) self.push(chunk);
          }

          self.push(null);
        });

        stream.on('data', function (chunk) {
          debug('wrapped data');
          if (state.decoder) chunk = state.decoder.write(chunk);

          // don't skip over falsy values in objectMode
          if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

          var ret = self.push(chunk);
          if (!ret) {
            paused = true;
            stream.pause();
          }
        });

        // proxy all the other methods.
        // important when wrapping filters and duplexes.
        for (var i in stream) {
          if (this[i] === undefined && typeof stream[i] === 'function') {
            this[i] = function (method) {
              return function () {
                return stream[method].apply(stream, arguments);
              };
            }(i);
          }
        }

        // proxy certain important events.
        for (var n = 0; n < kProxyEvents.length; n++) {
          stream.on(kProxyEvents[n], self.emit.bind(self, kProxyEvents[n]));
        }

        // when we try to consume some more bytes, simply unpause the
        // underlying stream.
        self._read = function (n) {
          debug('wrapped _read', n);
          if (paused) {
            paused = false;
            stream.resume();
          }
        };

        return self;
      };

// exposed for testing purposes only.
      Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
      function fromList(n, state) {
        // nothing buffered
        if (state.length === 0) return null;

        var ret;
        if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
          // read it all, truncate the list
          if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
          state.buffer.clear();
        } else {
          // read part of list
          ret = fromListPartial(n, state.buffer, state.decoder);
        }

        return ret;
      }

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
      function fromListPartial(n, list, hasStrings) {
        var ret;
        if (n < list.head.data.length) {
          // slice is the same for buffers and strings
          ret = list.head.data.slice(0, n);
          list.head.data = list.head.data.slice(n);
        } else if (n === list.head.data.length) {
          // first chunk is a perfect match
          ret = list.shift();
        } else {
          // result spans more than one buffer
          ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
        }
        return ret;
      }

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
      function copyFromBufferString(n, list) {
        var p = list.head;
        var c = 1;
        var ret = p.data;
        n -= ret.length;
        while (p = p.next) {
          var str = p.data;
          var nb = n > str.length ? str.length : n;
          if (nb === str.length) ret += str;else ret += str.slice(0, n);
          n -= nb;
          if (n === 0) {
            if (nb === str.length) {
              ++c;
              if (p.next) list.head = p.next;else list.head = list.tail = null;
            } else {
              list.head = p;
              p.data = str.slice(nb);
            }
            break;
          }
          ++c;
        }
        list.length -= c;
        return ret;
      }

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
      function copyFromBuffer(n, list) {
        var ret = Buffer.allocUnsafe(n);
        var p = list.head;
        var c = 1;
        p.data.copy(ret);
        n -= p.data.length;
        while (p = p.next) {
          var buf = p.data;
          var nb = n > buf.length ? buf.length : n;
          buf.copy(ret, ret.length - n, 0, nb);
          n -= nb;
          if (n === 0) {
            if (nb === buf.length) {
              ++c;
              if (p.next) list.head = p.next;else list.head = list.tail = null;
            } else {
              list.head = p;
              p.data = buf.slice(nb);
            }
            break;
          }
          ++c;
        }
        list.length -= c;
        return ret;
      }

      function endReadable(stream) {
        var state = stream._readableState;

        // If we get here before consuming all the bytes, then that is a
        // bug in node.  Should never happen.
        if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

        if (!state.endEmitted) {
          state.ended = true;
          processNextTick(endReadableNT, state, stream);
        }
      }

      function endReadableNT(state, stream) {
        // Check that we didn't get one last unshift.
        if (!state.endEmitted && state.length === 0) {
          state.endEmitted = true;
          stream.readable = false;
          stream.emit('end');
        }
      }

      function forEach(xs, f) {
        for (var i = 0, l = xs.length; i < l; i++) {
          f(xs[i], i);
        }
      }

      function indexOf(xs, x) {
        for (var i = 0, l = xs.length; i < l; i++) {
          if (xs[i] === x) return i;
        }
        return -1;
      }
    }).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{"./_stream_duplex":82,"./internal/streams/BufferList":87,"./internal/streams/destroy":88,"./internal/streams/stream":89,"_process":80,"core-util-is":73,"events":74,"inherits":76,"isarray":78,"process-nextick-args":79,"safe-buffer":94,"string_decoder/":96,"util":71}],85:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

    'use strict';

    module.exports = Transform;

    var Duplex = require('./_stream_duplex');

    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    util.inherits(Transform, Duplex);

    function TransformState(stream) {
      this.afterTransform = function (er, data) {
        return afterTransform(stream, er, data);
      };

      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
      this.writeencoding = null;
    }

    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;

      var cb = ts.writecb;

      if (!cb) {
        return stream.emit('error', new Error('write callback called multiple times'));
      }

      ts.writechunk = null;
      ts.writecb = null;

      if (data !== null && data !== undefined) stream.push(data);

      cb(er);

      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }

    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);

      Duplex.call(this, options);

      this._transformState = new TransformState(this);

      var stream = this;

      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;

      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;

      if (options) {
        if (typeof options.transform === 'function') this._transform = options.transform;

        if (typeof options.flush === 'function') this._flush = options.flush;
      }

      // When the writable side finishes, then flush out anything remaining.
      this.once('prefinish', function () {
        if (typeof this._flush === 'function') this._flush(function (er, data) {
          done(stream, er, data);
        });else done(stream);
      });
    }

    Transform.prototype.push = function (chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function (chunk, encoding, cb) {
      throw new Error('_transform() is not implemented');
    };

    Transform.prototype._write = function (chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
      }
    };

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
    Transform.prototype._read = function (n) {
      var ts = this._transformState;

      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };

    Transform.prototype._destroy = function (err, cb) {
      var _this = this;

      Duplex.prototype._destroy.call(this, err, function (err2) {
        cb(err2);
        _this.emit('close');
      });
    };

    function done(stream, er, data) {
      if (er) return stream.emit('error', er);

      if (data !== null && data !== undefined) stream.push(data);

      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var ts = stream._transformState;

      if (ws.length) throw new Error('Calling transform done when ws.length != 0');

      if (ts.transforming) throw new Error('Calling transform done when still transforming');

      return stream.push(null);
    }
  },{"./_stream_duplex":82,"core-util-is":73,"inherits":76}],86:[function(require,module,exports){
    (function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

      'use strict';

      /*<replacement>*/

      var processNextTick = require('process-nextick-args');
      /*</replacement>*/

      module.exports = Writable;

      /* <replacement> */
      function WriteReq(chunk, encoding, cb) {
        this.chunk = chunk;
        this.encoding = encoding;
        this.callback = cb;
        this.next = null;
      }

// It seems a linked list but it is not
// there will be only 2 of these for each stream
      function CorkedRequest(state) {
        var _this = this;

        this.next = null;
        this.entry = null;
        this.finish = function () {
          onCorkedFinish(_this, state);
        };
      }
      /* </replacement> */

      /*<replacement>*/
      var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
      /*</replacement>*/

      /*<replacement>*/
      var Duplex;
      /*</replacement>*/

      Writable.WritableState = WritableState;

      /*<replacement>*/
      var util = require('core-util-is');
      util.inherits = require('inherits');
      /*</replacement>*/

      /*<replacement>*/
      var internalUtil = {
        deprecate: require('util-deprecate')
      };
      /*</replacement>*/

      /*<replacement>*/
      var Stream = require('./internal/streams/stream');
      /*</replacement>*/

      /*<replacement>*/
      var Buffer = require('safe-buffer').Buffer;
      var OurUint8Array = global.Uint8Array || function () {};
      function _uint8ArrayToBuffer(chunk) {
        return Buffer.from(chunk);
      }
      function _isUint8Array(obj) {
        return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
      }
      /*</replacement>*/

      var destroyImpl = require('./internal/streams/destroy');

      util.inherits(Writable, Stream);

      function nop() {}

      function WritableState(options, stream) {
        Duplex = Duplex || require('./_stream_duplex');

        options = options || {};

        // object stream flag to indicate whether or not this stream
        // contains buffers or objects.
        this.objectMode = !!options.objectMode;

        if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

        // the point at which write() starts returning false
        // Note: 0 is a valid value, means that we always return false if
        // the entire buffer is not flushed immediately on write()
        var hwm = options.highWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16 * 1024;
        this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

        // cast to ints.
        this.highWaterMark = Math.floor(this.highWaterMark);

        // if _final has been called
        this.finalCalled = false;

        // drain event flag.
        this.needDrain = false;
        // at the start of calling end()
        this.ending = false;
        // when end() has been called, and returned
        this.ended = false;
        // when 'finish' is emitted
        this.finished = false;

        // has it been destroyed
        this.destroyed = false;

        // should we decode strings into buffers before passing to _write?
        // this is here so that some node-core streams can optimize string
        // handling at a lower level.
        var noDecode = options.decodeStrings === false;
        this.decodeStrings = !noDecode;

        // Crypto is kind of old and crusty.  Historically, its default string
        // encoding is 'binary' so we have to make this configurable.
        // Everything else in the universe uses 'utf8', though.
        this.defaultEncoding = options.defaultEncoding || 'utf8';

        // not an actual buffer we keep track of, but a measurement
        // of how much we're waiting to get pushed to some underlying
        // socket or file.
        this.length = 0;

        // a flag to see when we're in the middle of a write.
        this.writing = false;

        // when true all writes will be buffered until .uncork() call
        this.corked = 0;

        // a flag to be able to tell if the onwrite cb is called immediately,
        // or on a later tick.  We set this to true at first, because any
        // actions that shouldn't happen until "later" should generally also
        // not happen before the first write call.
        this.sync = true;

        // a flag to know if we're processing previously buffered items, which
        // may call the _write() callback in the same tick, so that we don't
        // end up in an overlapped onwrite situation.
        this.bufferProcessing = false;

        // the callback that's passed to _write(chunk,cb)
        this.onwrite = function (er) {
          onwrite(stream, er);
        };

        // the callback that the user supplies to write(chunk,encoding,cb)
        this.writecb = null;

        // the amount that is being written when _write is called.
        this.writelen = 0;

        this.bufferedRequest = null;
        this.lastBufferedRequest = null;

        // number of pending user-supplied write callbacks
        // this must be 0 before 'finish' can be emitted
        this.pendingcb = 0;

        // emit prefinish if the only thing we're waiting for is _write cbs
        // This is relevant for synchronous Transform streams
        this.prefinished = false;

        // True if the error was already emitted and should not be thrown again
        this.errorEmitted = false;

        // count buffered requests
        this.bufferedRequestCount = 0;

        // allocate the first CorkedRequest, there is always
        // one allocated and free to use, and we maintain at most two
        this.corkedRequestsFree = new CorkedRequest(this);
      }

      WritableState.prototype.getBuffer = function getBuffer() {
        var current = this.bufferedRequest;
        var out = [];
        while (current) {
          out.push(current);
          current = current.next;
        }
        return out;
      };

      (function () {
        try {
          Object.defineProperty(WritableState.prototype, 'buffer', {
            get: internalUtil.deprecate(function () {
              return this.getBuffer();
            }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
          });
        } catch (_) {}
      })();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
      var realHasInstance;
      if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
        realHasInstance = Function.prototype[Symbol.hasInstance];
        Object.defineProperty(Writable, Symbol.hasInstance, {
          value: function (object) {
            if (realHasInstance.call(this, object)) return true;

            return object && object._writableState instanceof WritableState;
          }
        });
      } else {
        realHasInstance = function (object) {
          return object instanceof this;
        };
      }

      function Writable(options) {
        Duplex = Duplex || require('./_stream_duplex');

        // Writable ctor is applied to Duplexes, too.
        // `realHasInstance` is necessary because using plain `instanceof`
        // would return false, as no `_writableState` property is attached.

        // Trying to use the custom `instanceof` for Writable here will also break the
        // Node.js LazyTransform implementation, which has a non-trivial getter for
        // `_writableState` that would lead to infinite recursion.
        if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
          return new Writable(options);
        }

        this._writableState = new WritableState(options, this);

        // legacy.
        this.writable = true;

        if (options) {
          if (typeof options.write === 'function') this._write = options.write;

          if (typeof options.writev === 'function') this._writev = options.writev;

          if (typeof options.destroy === 'function') this._destroy = options.destroy;

          if (typeof options.final === 'function') this._final = options.final;
        }

        Stream.call(this);
      }

// Otherwise people can pipe Writable streams, which is just wrong.
      Writable.prototype.pipe = function () {
        this.emit('error', new Error('Cannot pipe, not readable'));
      };

      function writeAfterEnd(stream, cb) {
        var er = new Error('write after end');
        // TODO: defer error events consistently everywhere, not just the cb
        stream.emit('error', er);
        processNextTick(cb, er);
      }

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
      function validChunk(stream, state, chunk, cb) {
        var valid = true;
        var er = false;

        if (chunk === null) {
          er = new TypeError('May not write null values to stream');
        } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
          er = new TypeError('Invalid non-string/buffer chunk');
        }
        if (er) {
          stream.emit('error', er);
          processNextTick(cb, er);
          valid = false;
        }
        return valid;
      }

      Writable.prototype.write = function (chunk, encoding, cb) {
        var state = this._writableState;
        var ret = false;
        var isBuf = _isUint8Array(chunk) && !state.objectMode;

        if (isBuf && !Buffer.isBuffer(chunk)) {
          chunk = _uint8ArrayToBuffer(chunk);
        }

        if (typeof encoding === 'function') {
          cb = encoding;
          encoding = null;
        }

        if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

        if (typeof cb !== 'function') cb = nop;

        if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
          state.pendingcb++;
          ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
        }

        return ret;
      };

      Writable.prototype.cork = function () {
        var state = this._writableState;

        state.corked++;
      };

      Writable.prototype.uncork = function () {
        var state = this._writableState;

        if (state.corked) {
          state.corked--;

          if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
        }
      };

      Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
        // node::ParseEncoding() requires lower case.
        if (typeof encoding === 'string') encoding = encoding.toLowerCase();
        if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
        this._writableState.defaultEncoding = encoding;
        return this;
      };

      function decodeChunk(state, chunk, encoding) {
        if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
          chunk = Buffer.from(chunk, encoding);
        }
        return chunk;
      }

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
      function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
        if (!isBuf) {
          var newChunk = decodeChunk(state, chunk, encoding);
          if (chunk !== newChunk) {
            isBuf = true;
            encoding = 'buffer';
            chunk = newChunk;
          }
        }
        var len = state.objectMode ? 1 : chunk.length;

        state.length += len;

        var ret = state.length < state.highWaterMark;
        // we must ensure that previous needDrain will not be reset to false.
        if (!ret) state.needDrain = true;

        if (state.writing || state.corked) {
          var last = state.lastBufferedRequest;
          state.lastBufferedRequest = {
            chunk: chunk,
            encoding: encoding,
            isBuf: isBuf,
            callback: cb,
            next: null
          };
          if (last) {
            last.next = state.lastBufferedRequest;
          } else {
            state.bufferedRequest = state.lastBufferedRequest;
          }
          state.bufferedRequestCount += 1;
        } else {
          doWrite(stream, state, false, len, chunk, encoding, cb);
        }

        return ret;
      }

      function doWrite(stream, state, writev, len, chunk, encoding, cb) {
        state.writelen = len;
        state.writecb = cb;
        state.writing = true;
        state.sync = true;
        if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
      }

      function onwriteError(stream, state, sync, er, cb) {
        --state.pendingcb;

        if (sync) {
          // defer the callback if we are being called synchronously
          // to avoid piling up things on the stack
          processNextTick(cb, er);
          // this can emit finish, and it will always happen
          // after error
          processNextTick(finishMaybe, stream, state);
          stream._writableState.errorEmitted = true;
          stream.emit('error', er);
        } else {
          // the caller expect this to happen before if
          // it is async
          cb(er);
          stream._writableState.errorEmitted = true;
          stream.emit('error', er);
          // this can emit finish, but finish must
          // always follow error
          finishMaybe(stream, state);
        }
      }

      function onwriteStateUpdate(state) {
        state.writing = false;
        state.writecb = null;
        state.length -= state.writelen;
        state.writelen = 0;
      }

      function onwrite(stream, er) {
        var state = stream._writableState;
        var sync = state.sync;
        var cb = state.writecb;

        onwriteStateUpdate(state);

        if (er) onwriteError(stream, state, sync, er, cb);else {
          // Check if we're actually ready to finish, but don't emit yet
          var finished = needFinish(state);

          if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
            clearBuffer(stream, state);
          }

          if (sync) {
            /*<replacement>*/
            asyncWrite(afterWrite, stream, state, finished, cb);
            /*</replacement>*/
          } else {
            afterWrite(stream, state, finished, cb);
          }
        }
      }

      function afterWrite(stream, state, finished, cb) {
        if (!finished) onwriteDrain(stream, state);
        state.pendingcb--;
        cb();
        finishMaybe(stream, state);
      }

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
      function onwriteDrain(stream, state) {
        if (state.length === 0 && state.needDrain) {
          state.needDrain = false;
          stream.emit('drain');
        }
      }

// if there's something in the buffer waiting, then process it
      function clearBuffer(stream, state) {
        state.bufferProcessing = true;
        var entry = state.bufferedRequest;

        if (stream._writev && entry && entry.next) {
          // Fast case, write everything using _writev()
          var l = state.bufferedRequestCount;
          var buffer = new Array(l);
          var holder = state.corkedRequestsFree;
          holder.entry = entry;

          var count = 0;
          var allBuffers = true;
          while (entry) {
            buffer[count] = entry;
            if (!entry.isBuf) allBuffers = false;
            entry = entry.next;
            count += 1;
          }
          buffer.allBuffers = allBuffers;

          doWrite(stream, state, true, state.length, buffer, '', holder.finish);

          // doWrite is almost always async, defer these to save a bit of time
          // as the hot path ends with doWrite
          state.pendingcb++;
          state.lastBufferedRequest = null;
          if (holder.next) {
            state.corkedRequestsFree = holder.next;
            holder.next = null;
          } else {
            state.corkedRequestsFree = new CorkedRequest(state);
          }
        } else {
          // Slow case, write chunks one-by-one
          while (entry) {
            var chunk = entry.chunk;
            var encoding = entry.encoding;
            var cb = entry.callback;
            var len = state.objectMode ? 1 : chunk.length;

            doWrite(stream, state, false, len, chunk, encoding, cb);
            entry = entry.next;
            // if we didn't call the onwrite immediately, then
            // it means that we need to wait until it does.
            // also, that means that the chunk and cb are currently
            // being processed, so move the buffer counter past them.
            if (state.writing) {
              break;
            }
          }

          if (entry === null) state.lastBufferedRequest = null;
        }

        state.bufferedRequestCount = 0;
        state.bufferedRequest = entry;
        state.bufferProcessing = false;
      }

      Writable.prototype._write = function (chunk, encoding, cb) {
        cb(new Error('_write() is not implemented'));
      };

      Writable.prototype._writev = null;

      Writable.prototype.end = function (chunk, encoding, cb) {
        var state = this._writableState;

        if (typeof chunk === 'function') {
          cb = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          cb = encoding;
          encoding = null;
        }

        if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

        // .end() fully uncorks
        if (state.corked) {
          state.corked = 1;
          this.uncork();
        }

        // ignore unnecessary end() calls.
        if (!state.ending && !state.finished) endWritable(this, state, cb);
      };

      function needFinish(state) {
        return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
      }
      function callFinal(stream, state) {
        stream._final(function (err) {
          state.pendingcb--;
          if (err) {
            stream.emit('error', err);
          }
          state.prefinished = true;
          stream.emit('prefinish');
          finishMaybe(stream, state);
        });
      }
      function prefinish(stream, state) {
        if (!state.prefinished && !state.finalCalled) {
          if (typeof stream._final === 'function') {
            state.pendingcb++;
            state.finalCalled = true;
            processNextTick(callFinal, stream, state);
          } else {
            state.prefinished = true;
            stream.emit('prefinish');
          }
        }
      }

      function finishMaybe(stream, state) {
        var need = needFinish(state);
        if (need) {
          prefinish(stream, state);
          if (state.pendingcb === 0) {
            state.finished = true;
            stream.emit('finish');
          }
        }
        return need;
      }

      function endWritable(stream, state, cb) {
        state.ending = true;
        finishMaybe(stream, state);
        if (cb) {
          if (state.finished) processNextTick(cb);else stream.once('finish', cb);
        }
        state.ended = true;
        stream.writable = false;
      }

      function onCorkedFinish(corkReq, state, err) {
        var entry = corkReq.entry;
        corkReq.entry = null;
        while (entry) {
          var cb = entry.callback;
          state.pendingcb--;
          cb(err);
          entry = entry.next;
        }
        if (state.corkedRequestsFree) {
          state.corkedRequestsFree.next = corkReq;
        } else {
          state.corkedRequestsFree = corkReq;
        }
      }

      Object.defineProperty(Writable.prototype, 'destroyed', {
        get: function () {
          if (this._writableState === undefined) {
            return false;
          }
          return this._writableState.destroyed;
        },
        set: function (value) {
          // we ignore the value if the stream
          // has not been initialized yet
          if (!this._writableState) {
            return;
          }

          // backward compatibility, the user is explicitly
          // managing destroyed
          this._writableState.destroyed = value;
        }
      });

      Writable.prototype.destroy = destroyImpl.destroy;
      Writable.prototype._undestroy = destroyImpl.undestroy;
      Writable.prototype._destroy = function (err, cb) {
        this.end();
        cb(err);
      };
    }).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{"./_stream_duplex":82,"./internal/streams/destroy":88,"./internal/streams/stream":89,"_process":80,"core-util-is":73,"inherits":76,"process-nextick-args":79,"safe-buffer":94,"util-deprecate":97}],87:[function(require,module,exports){
    'use strict';

    /*<replacement>*/

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Buffer = require('safe-buffer').Buffer;
    /*</replacement>*/

    function copyBuffer(src, target, offset) {
      src.copy(target, offset);
    }

    module.exports = function () {
      function BufferList() {
        _classCallCheck(this, BufferList);

        this.head = null;
        this.tail = null;
        this.length = 0;
      }

      BufferList.prototype.push = function push(v) {
        var entry = { data: v, next: null };
        if (this.length > 0) this.tail.next = entry;else this.head = entry;
        this.tail = entry;
        ++this.length;
      };

      BufferList.prototype.unshift = function unshift(v) {
        var entry = { data: v, next: this.head };
        if (this.length === 0) this.tail = entry;
        this.head = entry;
        ++this.length;
      };

      BufferList.prototype.shift = function shift() {
        if (this.length === 0) return;
        var ret = this.head.data;
        if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
        --this.length;
        return ret;
      };

      BufferList.prototype.clear = function clear() {
        this.head = this.tail = null;
        this.length = 0;
      };

      BufferList.prototype.join = function join(s) {
        if (this.length === 0) return '';
        var p = this.head;
        var ret = '' + p.data;
        while (p = p.next) {
          ret += s + p.data;
        }return ret;
      };

      BufferList.prototype.concat = function concat(n) {
        if (this.length === 0) return Buffer.alloc(0);
        if (this.length === 1) return this.head.data;
        var ret = Buffer.allocUnsafe(n >>> 0);
        var p = this.head;
        var i = 0;
        while (p) {
          copyBuffer(p.data, ret, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      };

      return BufferList;
    }();
  },{"safe-buffer":94}],88:[function(require,module,exports){
    'use strict';

    /*<replacement>*/

    var processNextTick = require('process-nextick-args');
    /*</replacement>*/

// undocumented cb() API, needed for core, not for public API
    function destroy(err, cb) {
      var _this = this;

      var readableDestroyed = this._readableState && this._readableState.destroyed;
      var writableDestroyed = this._writableState && this._writableState.destroyed;

      if (readableDestroyed || writableDestroyed) {
        if (cb) {
          cb(err);
        } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
          processNextTick(emitErrorNT, this, err);
        }
        return;
      }

      // we set destroyed to true before firing error callbacks in order
      // to make it re-entrance safe in case destroy() is called within callbacks

      if (this._readableState) {
        this._readableState.destroyed = true;
      }

      // if this is a duplex stream mark the writable part as destroyed as well
      if (this._writableState) {
        this._writableState.destroyed = true;
      }

      this._destroy(err || null, function (err) {
        if (!cb && err) {
          processNextTick(emitErrorNT, _this, err);
          if (_this._writableState) {
            _this._writableState.errorEmitted = true;
          }
        } else if (cb) {
          cb(err);
        }
      });
    }

    function undestroy() {
      if (this._readableState) {
        this._readableState.destroyed = false;
        this._readableState.reading = false;
        this._readableState.ended = false;
        this._readableState.endEmitted = false;
      }

      if (this._writableState) {
        this._writableState.destroyed = false;
        this._writableState.ended = false;
        this._writableState.ending = false;
        this._writableState.finished = false;
        this._writableState.errorEmitted = false;
      }
    }

    function emitErrorNT(self, err) {
      self.emit('error', err);
    }

    module.exports = {
      destroy: destroy,
      undestroy: undestroy
    };
  },{"process-nextick-args":79}],89:[function(require,module,exports){
    module.exports = require('events').EventEmitter;

  },{"events":74}],90:[function(require,module,exports){
    module.exports = require('./readable').PassThrough

  },{"./readable":91}],91:[function(require,module,exports){
    exports = module.exports = require('./lib/_stream_readable.js');
    exports.Stream = exports;
    exports.Readable = exports;
    exports.Writable = require('./lib/_stream_writable.js');
    exports.Duplex = require('./lib/_stream_duplex.js');
    exports.Transform = require('./lib/_stream_transform.js');
    exports.PassThrough = require('./lib/_stream_passthrough.js');

  },{"./lib/_stream_duplex.js":82,"./lib/_stream_passthrough.js":83,"./lib/_stream_readable.js":84,"./lib/_stream_transform.js":85,"./lib/_stream_writable.js":86}],92:[function(require,module,exports){
    module.exports = require('./readable').Transform

  },{"./readable":91}],93:[function(require,module,exports){
    module.exports = require('./lib/_stream_writable.js');

  },{"./lib/_stream_writable.js":86}],94:[function(require,module,exports){
    arguments[4][53][0].apply(exports,arguments)
  },{"buffer":72,"dup":53}],95:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    module.exports = Stream;

    var EE = require('events').EventEmitter;
    var inherits = require('inherits');

    inherits(Stream, EE);
    Stream.Readable = require('readable-stream/readable.js');
    Stream.Writable = require('readable-stream/writable.js');
    Stream.Duplex = require('readable-stream/duplex.js');
    Stream.Transform = require('readable-stream/transform.js');
    Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
    Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

    function Stream() {
      EE.call(this);
    }

    Stream.prototype.pipe = function(dest, options) {
      var source = this;

      function ondata(chunk) {
        if (dest.writable) {
          if (false === dest.write(chunk) && source.pause) {
            source.pause();
          }
        }
      }

      source.on('data', ondata);

      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }

      dest.on('drain', ondrain);

      // If the 'end' option is not supplied, dest.end() will be called when
      // source gets the 'end' or 'close' events.  Only dest.end() once.
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on('end', onend);
        source.on('close', onclose);
      }

      var didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;

        dest.end();
      }


      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;

        if (typeof dest.destroy === 'function') dest.destroy();
      }

      // don't leave dangling pipes when there are errors.
      function onerror(er) {
        cleanup();
        if (EE.listenerCount(this, 'error') === 0) {
          throw er; // Unhandled stream error in pipe.
        }
      }

      source.on('error', onerror);
      dest.on('error', onerror);

      // remove all the event listeners that were added.
      function cleanup() {
        source.removeListener('data', ondata);
        dest.removeListener('drain', ondrain);

        source.removeListener('end', onend);
        source.removeListener('close', onclose);

        source.removeListener('error', onerror);
        dest.removeListener('error', onerror);

        source.removeListener('end', cleanup);
        source.removeListener('close', cleanup);

        dest.removeListener('close', cleanup);
      }

      source.on('end', cleanup);
      source.on('close', cleanup);

      dest.on('close', cleanup);

      dest.emit('pipe', source);

      // Allow for unix-like usage: A.pipe(B).pipe(C)
      return dest;
    };

  },{"events":74,"inherits":76,"readable-stream/duplex.js":81,"readable-stream/passthrough.js":90,"readable-stream/readable.js":91,"readable-stream/transform.js":92,"readable-stream/writable.js":93}],96:[function(require,module,exports){
    'use strict';

    var Buffer = require('safe-buffer').Buffer;

    var isEncoding = Buffer.isEncoding || function (encoding) {
      encoding = '' + encoding;
      switch (encoding && encoding.toLowerCase()) {
        case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
        return true;
        default:
          return false;
      }
    };

    function _normalizeEncoding(enc) {
      if (!enc) return 'utf8';
      var retried;
      while (true) {
        switch (enc) {
          case 'utf8':
          case 'utf-8':
            return 'utf8';
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return 'utf16le';
          case 'latin1':
          case 'binary':
            return 'latin1';
          case 'base64':
          case 'ascii':
          case 'hex':
            return enc;
          default:
            if (retried) return; // undefined
            enc = ('' + enc).toLowerCase();
            retried = true;
        }
      }
    };

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
    function normalizeEncoding(enc) {
      var nenc = _normalizeEncoding(enc);
      if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
      return nenc || enc;
    }

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
    exports.StringDecoder = StringDecoder;
    function StringDecoder(encoding) {
      this.encoding = normalizeEncoding(encoding);
      var nb;
      switch (this.encoding) {
        case 'utf16le':
          this.text = utf16Text;
          this.end = utf16End;
          nb = 4;
          break;
        case 'utf8':
          this.fillLast = utf8FillLast;
          nb = 4;
          break;
        case 'base64':
          this.text = base64Text;
          this.end = base64End;
          nb = 3;
          break;
        default:
          this.write = simpleWrite;
          this.end = simpleEnd;
          return;
      }
      this.lastNeed = 0;
      this.lastTotal = 0;
      this.lastChar = Buffer.allocUnsafe(nb);
    }

    StringDecoder.prototype.write = function (buf) {
      if (buf.length === 0) return '';
      var r;
      var i;
      if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === undefined) return '';
        i = this.lastNeed;
        this.lastNeed = 0;
      } else {
        i = 0;
      }
      if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
      return r || '';
    };

    StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
    StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
    StringDecoder.prototype.fillLast = function (buf) {
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
      this.lastNeed -= buf.length;
    };

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
    function utf8CheckByte(byte) {
      if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
      return -1;
    }

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
    function utf8CheckIncomplete(self, buf, i) {
      var j = buf.length - 1;
      if (j < i) return 0;
      var nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) self.lastNeed = nb - 1;
        return nb;
      }
      if (--j < i) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) self.lastNeed = nb - 2;
        return nb;
      }
      if (--j < i) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) {
          if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
        }
        return nb;
      }
      return 0;
    }

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
    function utf8CheckExtraBytes(self, buf, p) {
      if ((buf[0] & 0xC0) !== 0x80) {
        self.lastNeed = 0;
        return '\ufffd'.repeat(p);
      }
      if (self.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 0xC0) !== 0x80) {
          self.lastNeed = 1;
          return '\ufffd'.repeat(p + 1);
        }
        if (self.lastNeed > 2 && buf.length > 2) {
          if ((buf[2] & 0xC0) !== 0x80) {
            self.lastNeed = 2;
            return '\ufffd'.repeat(p + 2);
          }
        }
      }
    }

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
    function utf8FillLast(buf) {
      var p = this.lastTotal - this.lastNeed;
      var r = utf8CheckExtraBytes(this, buf, p);
      if (r !== undefined) return r;
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, p, 0, buf.length);
      this.lastNeed -= buf.length;
    }

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
    function utf8Text(buf, i) {
      var total = utf8CheckIncomplete(this, buf, i);
      if (!this.lastNeed) return buf.toString('utf8', i);
      this.lastTotal = total;
      var end = buf.length - (total - this.lastNeed);
      buf.copy(this.lastChar, 0, end);
      return buf.toString('utf8', i, end);
    }

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
    function utf8End(buf) {
      var r = buf && buf.length ? this.write(buf) : '';
      if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
      return r;
    }

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
    function utf16Text(buf, i) {
      if ((buf.length - i) % 2 === 0) {
        var r = buf.toString('utf16le', i);
        if (r) {
          var c = r.charCodeAt(r.length - 1);
          if (c >= 0xD800 && c <= 0xDBFF) {
            this.lastNeed = 2;
            this.lastTotal = 4;
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
            return r.slice(0, -1);
          }
        }
        return r;
      }
      this.lastNeed = 1;
      this.lastTotal = 2;
      this.lastChar[0] = buf[buf.length - 1];
      return buf.toString('utf16le', i, buf.length - 1);
    }

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
    function utf16End(buf) {
      var r = buf && buf.length ? this.write(buf) : '';
      if (this.lastNeed) {
        var end = this.lastTotal - this.lastNeed;
        return r + this.lastChar.toString('utf16le', 0, end);
      }
      return r;
    }

    function base64Text(buf, i) {
      var n = (buf.length - i) % 3;
      if (n === 0) return buf.toString('base64', i);
      this.lastNeed = 3 - n;
      this.lastTotal = 3;
      if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
      } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
      }
      return buf.toString('base64', i, buf.length - n);
    }

    function base64End(buf) {
      var r = buf && buf.length ? this.write(buf) : '';
      if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
      return r;
    }

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
    function simpleWrite(buf) {
      return buf.toString(this.encoding);
    }

    function simpleEnd(buf) {
      return buf && buf.length ? this.write(buf) : '';
    }
  },{"safe-buffer":94}],97:[function(require,module,exports){
    (function (global){

      /**
       * Module exports.
       */

      module.exports = deprecate;

      /**
       * Mark that a method should not be used.
       * Returns a modified function which warns once by default.
       *
       * If `localStorage.noDeprecation = true` is set, then it is a no-op.
       *
       * If `localStorage.throwDeprecation = true` is set, then deprecated functions
       * will throw an Error when invoked.
       *
       * If `localStorage.traceDeprecation = true` is set, then deprecated functions
       * will invoke `console.trace()` instead of `console.error()`.
       *
       * @param {Function} fn - the function to deprecate
       * @param {String} msg - the string to print to the console when `fn` is invoked
       * @returns {Function} a new "deprecated" version of `fn`
       * @api public
       */

      function deprecate (fn, msg) {
        if (config('noDeprecation')) {
          return fn;
        }

        var warned = false;
        function deprecated() {
          if (!warned) {
            if (config('throwDeprecation')) {
              throw new Error(msg);
            } else if (config('traceDeprecation')) {
              console.trace(msg);
            } else {
              console.warn(msg);
            }
            warned = true;
          }
          return fn.apply(this, arguments);
        }

        return deprecated;
      }

      /**
       * Checks `localStorage` for boolean values for the given `name`.
       *
       * @param {String} name
       * @returns {Boolean}
       * @api private
       */

      function config (name) {
        // accessing global.localStorage can trigger a DOMException in sandboxed iframes
        try {
          if (!global.localStorage) return false;
        } catch (_) {
          return false;
        }
        var val = global.localStorage[name];
        if (null == val) return false;
        return String(val).toLowerCase() === 'true';
      }

    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{}],98:[function(require,module,exports){
    arguments[4][41][0].apply(exports,arguments)
  },{"dup":41}],99:[function(require,module,exports){
    module.exports = function isBuffer(arg) {
      return arg && typeof arg === 'object'
        && typeof arg.copy === 'function'
        && typeof arg.fill === 'function'
        && typeof arg.readUInt8 === 'function';
    }
  },{}],100:[function(require,module,exports){
    (function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

      var formatRegExp = /%[sdj%]/g;
      exports.format = function(f) {
        if (!isString(f)) {
          var objects = [];
          for (var i = 0; i < arguments.length; i++) {
            objects.push(inspect(arguments[i]));
          }
          return objects.join(' ');
        }

        var i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function(x) {
          if (x === '%%') return '%';
          if (i >= len) return x;
          switch (x) {
            case '%s': return String(args[i++]);
            case '%d': return Number(args[i++]);
            case '%j':
              try {
                return JSON.stringify(args[i++]);
              } catch (_) {
                return '[Circular]';
              }
            default:
              return x;
          }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
          if (isNull(x) || !isObject(x)) {
            str += ' ' + x;
          } else {
            str += ' ' + inspect(x);
          }
        }
        return str;
      };


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
      exports.deprecate = function(fn, msg) {
        // Allow for deprecating things in the process of starting up.
        if (isUndefined(global.process)) {
          return function() {
            return exports.deprecate(fn, msg).apply(this, arguments);
          };
        }

        if (process.noDeprecation === true) {
          return fn;
        }

        var warned = false;
        function deprecated() {
          if (!warned) {
            if (process.throwDeprecation) {
              throw new Error(msg);
            } else if (process.traceDeprecation) {
              console.trace(msg);
            } else {
              console.error(msg);
            }
            warned = true;
          }
          return fn.apply(this, arguments);
        }

        return deprecated;
      };


      var debugs = {};
      var debugEnviron;
      exports.debuglog = function(set) {
        if (isUndefined(debugEnviron))
          debugEnviron = process.env.NODE_DEBUG || '';
        set = set.toUpperCase();
        if (!debugs[set]) {
          if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
            var pid = process.pid;
            debugs[set] = function() {
              var msg = exports.format.apply(exports, arguments);
              console.error('%s %d: %s', set, pid, msg);
            };
          } else {
            debugs[set] = function() {};
          }
        }
        return debugs[set];
      };


      /**
       * Echos the value of a value. Trys to print the value out
       * in the best way possible given the different types.
       *
       * @param {Object} obj The object to print out.
       * @param {Object} opts Optional options object that alters the output.
       */
      /* legacy: obj, showHidden, depth, colors*/
      function inspect(obj, opts) {
        // default options
        var ctx = {
          seen: [],
          stylize: stylizeNoColor
        };
        // legacy...
        if (arguments.length >= 3) ctx.depth = arguments[2];
        if (arguments.length >= 4) ctx.colors = arguments[3];
        if (isBoolean(opts)) {
          // legacy...
          ctx.showHidden = opts;
        } else if (opts) {
          // got an "options" object
          exports._extend(ctx, opts);
        }
        // set default options
        if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
        if (isUndefined(ctx.depth)) ctx.depth = 2;
        if (isUndefined(ctx.colors)) ctx.colors = false;
        if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
        if (ctx.colors) ctx.stylize = stylizeWithColor;
        return formatValue(ctx, obj, ctx.depth);
      }
      exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
      inspect.colors = {
        'bold' : [1, 22],
        'italic' : [3, 23],
        'underline' : [4, 24],
        'inverse' : [7, 27],
        'white' : [37, 39],
        'grey' : [90, 39],
        'black' : [30, 39],
        'blue' : [34, 39],
        'cyan' : [36, 39],
        'green' : [32, 39],
        'magenta' : [35, 39],
        'red' : [31, 39],
        'yellow' : [33, 39]
      };

// Don't use 'blue' not visible on cmd.exe
      inspect.styles = {
        'special': 'cyan',
        'number': 'yellow',
        'boolean': 'yellow',
        'undefined': 'grey',
        'null': 'bold',
        'string': 'green',
        'date': 'magenta',
        // "name": intentionally not styling
        'regexp': 'red'
      };


      function stylizeWithColor(str, styleType) {
        var style = inspect.styles[styleType];

        if (style) {
          return '\u001b[' + inspect.colors[style][0] + 'm' + str +
            '\u001b[' + inspect.colors[style][1] + 'm';
        } else {
          return str;
        }
      }


      function stylizeNoColor(str, styleType) {
        return str;
      }


      function arrayToHash(array) {
        var hash = {};

        array.forEach(function(val, idx) {
          hash[val] = true;
        });

        return hash;
      }


      function formatValue(ctx, value, recurseTimes) {
        // Provide a hook for user-specified inspect functions.
        // Check that value is an object with an inspect function on it
        if (ctx.customInspect &&
          value &&
          isFunction(value.inspect) &&
          // Filter out the util module, it's inspect function is special
          value.inspect !== exports.inspect &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
          var ret = value.inspect(recurseTimes, ctx);
          if (!isString(ret)) {
            ret = formatValue(ctx, ret, recurseTimes);
          }
          return ret;
        }

        // Primitive types cannot have properties
        var primitive = formatPrimitive(ctx, value);
        if (primitive) {
          return primitive;
        }

        // Look up the keys of the object.
        var keys = Object.keys(value);
        var visibleKeys = arrayToHash(keys);

        if (ctx.showHidden) {
          keys = Object.getOwnPropertyNames(value);
        }

        // IE doesn't make error fields non-enumerable
        // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
        if (isError(value)
          && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
          return formatError(value);
        }

        // Some type of object without properties can be shortcutted.
        if (keys.length === 0) {
          if (isFunction(value)) {
            var name = value.name ? ': ' + value.name : '';
            return ctx.stylize('[Function' + name + ']', 'special');
          }
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
          }
          if (isDate(value)) {
            return ctx.stylize(Date.prototype.toString.call(value), 'date');
          }
          if (isError(value)) {
            return formatError(value);
          }
        }

        var base = '', array = false, braces = ['{', '}'];

        // Make Array say that they are Array
        if (isArray(value)) {
          array = true;
          braces = ['[', ']'];
        }

        // Make functions say that they are functions
        if (isFunction(value)) {
          var n = value.name ? ': ' + value.name : '';
          base = ' [Function' + n + ']';
        }

        // Make RegExps say that they are RegExps
        if (isRegExp(value)) {
          base = ' ' + RegExp.prototype.toString.call(value);
        }

        // Make dates with properties first say the date
        if (isDate(value)) {
          base = ' ' + Date.prototype.toUTCString.call(value);
        }

        // Make error with message first say the error
        if (isError(value)) {
          base = ' ' + formatError(value);
        }

        if (keys.length === 0 && (!array || value.length == 0)) {
          return braces[0] + base + braces[1];
        }

        if (recurseTimes < 0) {
          if (isRegExp(value)) {
            return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
          } else {
            return ctx.stylize('[Object]', 'special');
          }
        }

        ctx.seen.push(value);

        var output;
        if (array) {
          output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
        } else {
          output = keys.map(function(key) {
            return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
          });
        }

        ctx.seen.pop();

        return reduceToSingleString(output, base, braces);
      }


      function formatPrimitive(ctx, value) {
        if (isUndefined(value))
          return ctx.stylize('undefined', 'undefined');
        if (isString(value)) {
          var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
            .replace(/'/g, "\\'")
            .replace(/\\"/g, '"') + '\'';
          return ctx.stylize(simple, 'string');
        }
        if (isNumber(value))
          return ctx.stylize('' + value, 'number');
        if (isBoolean(value))
          return ctx.stylize('' + value, 'boolean');
        // For some reason typeof null is "object", so special case here.
        if (isNull(value))
          return ctx.stylize('null', 'null');
      }


      function formatError(value) {
        return '[' + Error.prototype.toString.call(value) + ']';
      }


      function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
        var output = [];
        for (var i = 0, l = value.length; i < l; ++i) {
          if (hasOwnProperty(value, String(i))) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              String(i), true));
          } else {
            output.push('');
          }
        }
        keys.forEach(function(key) {
          if (!key.match(/^\d+$/)) {
            output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              key, true));
          }
        });
        return output;
      }


      function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
        var name, str, desc;
        desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
        if (desc.get) {
          if (desc.set) {
            str = ctx.stylize('[Getter/Setter]', 'special');
          } else {
            str = ctx.stylize('[Getter]', 'special');
          }
        } else {
          if (desc.set) {
            str = ctx.stylize('[Setter]', 'special');
          }
        }
        if (!hasOwnProperty(visibleKeys, key)) {
          name = '[' + key + ']';
        }
        if (!str) {
          if (ctx.seen.indexOf(desc.value) < 0) {
            if (isNull(recurseTimes)) {
              str = formatValue(ctx, desc.value, null);
            } else {
              str = formatValue(ctx, desc.value, recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
              if (array) {
                str = str.split('\n').map(function(line) {
                  return '  ' + line;
                }).join('\n').substr(2);
              } else {
                str = '\n' + str.split('\n').map(function(line) {
                  return '   ' + line;
                }).join('\n');
              }
            }
          } else {
            str = ctx.stylize('[Circular]', 'special');
          }
        }
        if (isUndefined(name)) {
          if (array && key.match(/^\d+$/)) {
            return str;
          }
          name = JSON.stringify('' + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = ctx.stylize(name, 'name');
          } else {
            name = name.replace(/'/g, "\\'")
              .replace(/\\"/g, '"')
              .replace(/(^"|"$)/g, "'");
            name = ctx.stylize(name, 'string');
          }
        }

        return name + ': ' + str;
      }


      function reduceToSingleString(output, base, braces) {
        var numLinesEst = 0;
        var length = output.reduce(function(prev, cur) {
          numLinesEst++;
          if (cur.indexOf('\n') >= 0) numLinesEst++;
          return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
        }, 0);

        if (length > 60) {
          return braces[0] +
            (base === '' ? '' : base + '\n ') +
            ' ' +
            output.join(',\n  ') +
            ' ' +
            braces[1];
        }

        return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
      }


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
      function isArray(ar) {
        return Array.isArray(ar);
      }
      exports.isArray = isArray;

      function isBoolean(arg) {
        return typeof arg === 'boolean';
      }
      exports.isBoolean = isBoolean;

      function isNull(arg) {
        return arg === null;
      }
      exports.isNull = isNull;

      function isNullOrUndefined(arg) {
        return arg == null;
      }
      exports.isNullOrUndefined = isNullOrUndefined;

      function isNumber(arg) {
        return typeof arg === 'number';
      }
      exports.isNumber = isNumber;

      function isString(arg) {
        return typeof arg === 'string';
      }
      exports.isString = isString;

      function isSymbol(arg) {
        return typeof arg === 'symbol';
      }
      exports.isSymbol = isSymbol;

      function isUndefined(arg) {
        return arg === void 0;
      }
      exports.isUndefined = isUndefined;

      function isRegExp(re) {
        return isObject(re) && objectToString(re) === '[object RegExp]';
      }
      exports.isRegExp = isRegExp;

      function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
      }
      exports.isObject = isObject;

      function isDate(d) {
        return isObject(d) && objectToString(d) === '[object Date]';
      }
      exports.isDate = isDate;

      function isError(e) {
        return isObject(e) &&
          (objectToString(e) === '[object Error]' || e instanceof Error);
      }
      exports.isError = isError;

      function isFunction(arg) {
        return typeof arg === 'function';
      }
      exports.isFunction = isFunction;

      function isPrimitive(arg) {
        return arg === null ||
          typeof arg === 'boolean' ||
          typeof arg === 'number' ||
          typeof arg === 'string' ||
          typeof arg === 'symbol' ||  // ES6 symbol
          typeof arg === 'undefined';
      }
      exports.isPrimitive = isPrimitive;

      exports.isBuffer = require('./support/isBuffer');

      function objectToString(o) {
        return Object.prototype.toString.call(o);
      }


      function pad(n) {
        return n < 10 ? '0' + n.toString(10) : n.toString(10);
      }


      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
        'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
      function timestamp() {
        var d = new Date();
        var time = [pad(d.getHours()),
          pad(d.getMinutes()),
          pad(d.getSeconds())].join(':');
        return [d.getDate(), months[d.getMonth()], time].join(' ');
      }


// log is just a thin wrapper to console.log that prepends a timestamp
      exports.log = function() {
        console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
      };


      /**
       * Inherit the prototype methods from one constructor into another.
       *
       * The Function.prototype.inherits from lang.js rewritten as a standalone
       * function (not on Function.prototype). NOTE: If this file is to be loaded
       * during bootstrapping this function needs to be rewritten using some native
       * functions as prototype setup using normal JavaScript does not work as
       * expected during bootstrapping (see mirror.js in r114903).
       *
       * @param {function} ctor Constructor function which needs to inherit the
       *     prototype.
       * @param {function} superCtor Constructor function to inherit prototype from.
       */
      exports.inherits = require('inherits');

      exports._extend = function(origin, add) {
        // Don't do anything if add isn't an object
        if (!add || !isObject(add)) return origin;

        var keys = Object.keys(add);
        var i = keys.length;
        while (i--) {
          origin[keys[i]] = add[keys[i]];
        }
        return origin;
      };

      function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      }

    }).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
  },{"./support/isBuffer":99,"_process":80,"inherits":98}]},{},[1])(1)
});

!function(a){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=a();else if("function"==typeof define&&define.amd)define([],a);else{var b;b="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,b.ethers=a()}}(function(){var a;return function(){function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}return a}()({1:[function(a,b,c){"use strict";function d(a){var b={};for(var c in a)b[c]=a[c];return b}function e(a,b,c){function j(c,e){return function(){var f={},j=Array.prototype.slice.call(arguments);if(j.length===c.inputs.types.length+1&&"object"==typeof j[j.length-1]){f=d(j.pop());for(var m in f)if(!i[m])throw new Error("unknown transaction override "+m)}["data","to"].forEach(function(a){if(null!=f[a])throw new Error("cannot override "+a)});var n=c.apply(b,j);switch(f.to=a,f.data=n.data,n.type){case"call":if(e)return Promise.resolve(new g.bigNumberify(0));["gasLimit","gasPrice","value"].forEach(function(a){if(null!=f[a])throw new Error("call cannot override "+a)});var o=null;return null==f.from&&k&&k.getAddress?(o=k.getAddress(),o instanceof Promise||(o=Promise.resolve(o))):o=Promise.resolve(null),o.then(function(a){return a&&(f.from=g.getAddress(a)),l.call(f)}).then(function(b){try{var d=n.parse(b)}catch(e){throw"0x"===b&&c.outputs.types.length>0&&h.throwError("call exception",h.CALL_EXCEPTION,{address:a,method:n.signature,value:j}),e}return 1===c.outputs.types.length&&(d=d[0]),d});case"transaction":if(!k)return Promise.reject(new Error("missing signer"));if(null!=f.from)throw new Error("transaction cannot override from");if(e)return k&&k.estimateGas?k.estimateGas(f):l.estimateGas(f);if(k.sendTransaction)return k.sendTransaction(f);if(!k.sign)return Promise.reject(new Error("custom signer does not support signing"));null==f.gasLimit&&(f.gasLimit=k.defaultGasLimit||2e6);var p=null;if(f.nonce)p=Promise.resolve(f.nonce);else if(k.getTransactionCount)p=k.getTransactionCount(),p instanceof Promise||(p=Promise.resolve(p));else{var q=k.getAddress();q instanceof Promise||(q=Promise.resolve(q)),p=q.then(function(a){return l.getTransactionCount(a,"pending")})}var r=null;return r=f.gasPrice?Promise.resolve(f.gasPrice):l.getGasPrice(),Promise.all([p,r]).then(function(a){return f.nonce=a[0],f.gasPrice=a[1],k.sign(f)}).then(function(a){return l.sendTransaction(a)})}}}if(!(this instanceof e))throw new Error("missing new");if(b instanceof f||(b=new f(b)),!c)throw new Error("missing signer or provider");var k=c,l=null;c.provider?l=c.provider:(l=c,k=null),g.defineProperty(this,"address",a),g.defineProperty(this,"interface",b),g.defineProperty(this,"signer",k),g.defineProperty(this,"provider",l);var m=l.resolveName(a),n={};g.defineProperty(this,"estimate",n);var o={};g.defineProperty(this,"functions",o);var p={};g.defineProperty(this,"events",p),Object.keys(b.functions).forEach(function(a){var c=b.functions[a],d=j(c,!1);null==this[a]?g.defineProperty(this,a,d):console.log("WARNING: Multiple definitions for "+c),null==o[c]&&(g.defineProperty(o,a,d),g.defineProperty(n,a,j(c,!0)))},this),Object.keys(b.events).forEach(function(a){function c(b){m.then(function(f){if(f==b.address)try{var g=d.parse(b.topics,b.data);b.args=g,b.event=a,b.parse=d.parse,b.removeListener=function(){l.removeListener(d.topics,c)},b.getBlock=function(){return l.getBlock(b.blockHash)},b.getTransaction=function(){return l.getTransaction(b.transactionHash)},b.getTransactionReceipt=function(){return l.getTransactionReceipt(b.transactionHash)},b.eventSignature=d.signature,e.apply(b,Array.prototype.slice.call(g))}catch(h){console.log(h)}})}var d=b.events[a],e=null,f={enumerable:!0,get:function(){return e},set:function(a){a||(a=null),!a&&e?l.removeListener(d.topics,c):a&&!e&&l.on(d.topics,c),e=a}},g="on"+a.toLowerCase();null==this[g]&&Object.defineProperty(this,g,f),Object.defineProperty(p,a,f)},this)}var f=a("./interface.js"),g=function(){return{defineProperty:a("../utils/properties.js").defineProperty,getAddress:a("../utils/address.js").getAddress,bigNumberify:a("../utils/bignumber.js").bigNumberify,hexlify:a("../utils/convert.js").hexlify}}(),h=a("../utils/errors"),i={data:!0,from:!0,gasLimit:!0,gasPrice:!0,nonce:!0,to:!0,value:!0};g.defineProperty(e.prototype,"connect",function(a){return new e(this.address,this["interface"],a)}),g.defineProperty(e,"getDeployTransaction",function(a,b){b instanceof f||(b=new f(b));var c=Array.prototype.slice.call(arguments);return c.splice(1,1),{data:b.deployFunction.apply(b,c).bytecode}}),b.exports=e},{"../utils/address.js":56,"../utils/bignumber.js":57,"../utils/convert.js":61,"../utils/errors":63,"../utils/properties.js":70,"./interface.js":3}],2:[function(a,b,c){"use strict";var d=a("./contract.js"),e=a("./interface.js");b.exports={Contract:d,Interface:e}},{"./contract.js":1,"./interface.js":3}],3:[function(a,b,c){"use strict";function d(a){var b=[],c=[];return a.forEach(function(a){if(null!=a.components){if("tuple"!==a.type.substring(0,5))throw new Error("internal error; report on GitHub");var e="",f=a.type.indexOf("[");f>=0&&(e=a.type.substring(f));var g=d(a.components);b.push({name:a.name||null,names:g.names}),c.push("tuple("+g.types.join(",")+")"+e)}else b.push(a.name||null),c.push(a.type)}),{names:b,types:c}}function e(a,b){for(var c in b)l.defineProperty(a,c,b[c]);return a}function f(){}function g(){}function h(){}function i(a){l.defineProperty(this,"indexed",!0),l.defineProperty(this,"hash",a)}function j(){}function k(a){function b(a){switch(a.type){case"constructor":var b=function(){var b=d(a.inputs),c=function(c){l.isHexString(c)||m.throwError("invalid contract bytecode",m.INVALID_ARGUMENT,{arg:"bytecode",type:typeof c,value:c});var d=Array.prototype.slice.call(arguments,1);d.length<b.types.length?m.throwError("missing constructor argument",m.MISSING_ARGUMENT,{arg:b.names[d.length]||"unknown",count:d.length,expectedCount:b.types.length}):d.length>b.types.length&&m.throwError("too many constructor arguments",m.UNEXPECTED_ARGUMENT,{count:d.length,expectedCount:b.types.length});try{var g=l.coder.encode(a.inputs,d)}catch(h){m.throwError("invalid constructor argument",m.INVALID_ARGUMENT,{arg:h.arg,reason:h.reason,value:h.value})}var i={bytecode:c+g.substring(2),type:"deploy"};return e(new f,i)};return l.defineFrozen(c,"inputs",b),l.defineProperty(c,"payable",null==a.payable||!!a.payable),c}();q||(q=b);break;case"function":var b=function(){var b=d(a.inputs),c=d(a.outputs),f="("+b.types.join(",")+")";f=f.replace(/tuple/g,""),f=a.name+f;var h=function(b){try{return l.coder.decode(a.outputs,l.arrayify(b))}catch(c){m.throwError("invalid data for function output",m.INVALID_ARGUMENT,{arg:"data",errorArg:c.arg,errorValue:c.value,value:b,reason:c.reason})}},i=l.keccak256(l.toUtf8Bytes(f)).substring(0,10),j=function(){var c={name:a.name,signature:f,sighash:i,type:a.constant?"call":"transaction"},d=Array.prototype.slice.call(arguments,0);d.length<b.types.length?m.throwError("missing input argument",m.MISSING_ARGUMENT,{arg:b.names[d.length]||"unknown",count:d.length,expectedCount:b.types.length,name:a.name}):d.length>b.types.length&&m.throwError("too many input arguments",m.UNEXPECTED_ARGUMENT,{count:d.length,expectedCount:b.types.length});try{var j=l.coder.encode(a.inputs,d)}catch(k){m.throwError("invalid input argument",m.INVALID_ARGUMENT,{arg:k.arg,reason:k.reason,value:k.value})}return c.data=i+j.substring(2),c.parse=h,e(new g,c)};return l.defineFrozen(j,"inputs",b),l.defineFrozen(j,"outputs",c),l.defineProperty(j,"payable",null==a.payable||!!a.payable),l.defineProperty(j,"parseResult",h),l.defineProperty(j,"signature",f),l.defineProperty(j,"sighash",i),j}();a.name&&null==o[a.name]&&l.defineProperty(o,a.name,b),null==o[b.signature]&&l.defineProperty(o,b.signature,b);break;case"event":var b=function(){var b=d(a.inputs),c="("+b.types.join(",")+")";c=c.replace(/tuple/g,""),c=a.name+c;var f={anonymous:!!a.anonymous,name:a.name,signature:c,type:"event"};f.parse=function(b,c){null==c&&(c=b,b=null),null==b||a.anonymous||(b=b.slice(1));var d=[],e=[],f=[];if(a.inputs.forEach(function(a,b){a.indexed?"string"===a.type||"bytes"===a.type||a.type.indexOf("[")>=0||"tuple"===a.type.substring(0,5)?(d.push({type:"bytes32",name:a.name||""}),f.push(!0)):(d.push(a),f.push(!1)):(e.push(a),f.push(!1))}),null!=b)var g=l.coder.decode(d,l.concat(b));var h=l.coder.decode(e,l.arrayify(c)),k=new j,m=0,n=0;return a.inputs.forEach(function(a,c){a.indexed?null==b?k[c]=new i(null):f[c]?k[c]=new i(g[n++]):k[c]=g[n++]:k[c]=h[m++],a.name&&(k[a.name]=k[c])}),k.length=a.inputs.length,k};var g=e(new h,f);return l.defineFrozen(g,"topics",[l.keccak256(l.toUtf8Bytes(c))]),l.defineFrozen(g,"inputs",b),g}();a.name&&null==p[a.name]&&l.defineProperty(p,a.name,b),null==o[b.signature]&&l.defineProperty(o,b.signature,b);break;case"fallback":break;default:console.log("WARNING: unsupported ABI type - "+a.type)}}if(!(this instanceof k))throw new Error("missing new");if("string"==typeof a)try{a=JSON.parse(a)}catch(c){m.throwError("could not parse ABI JSON",m.INVALID_ARGUMENT,{arg:"abi",errorMessage:c.message,value:a})}var n=[];a.forEach(function(a){"string"==typeof a&&(a=l.parseSignature(a)),n.push(a)}),l.defineFrozen(this,"abi",n);var o={},p={},q=null;l.defineProperty(this,"functions",o),l.defineProperty(this,"events",p),n.forEach(b,this),q||b({type:"constructor",inputs:[]}),l.defineProperty(this,"deployFunction",q)}var l=function(){var b=a("../utils/abi-coder"),c=a("../utils/convert"),d=a("../utils/properties"),e=a("../utils/utf8");return{defineFrozen:d.defineFrozen,defineProperty:d.defineProperty,coder:b.defaultCoder,parseSignature:b.parseSignature,arrayify:c.arrayify,concat:c.concat,isHexString:c.isHexString,toUtf8Bytes:e.toUtf8Bytes,keccak256:a("../utils/keccak256")}}(),m=a("../utils/errors");l.defineProperty(k.prototype,"parseTransaction",function(a){var b=a.data.substring(0,10).toLowerCase();for(var c in this.functions)if(c.indexOf("(")!==-1){var d=this.functions[c];if(d.sighash===b){var e=l.coder.decode(d.inputs.types,"0x"+a.data.substring(10));return{args:e,signature:d.signature,sighash:d.sighash,parse:d.parseResult,value:a.value}}}return null}),b.exports=k},{"../utils/abi-coder":55,"../utils/convert":61,"../utils/errors":63,"../utils/keccak256":67,"../utils/properties":70,"../utils/utf8":76}],4:[function(a,b,c){"use strict";var d=a("./package.json").version,e=a("./contracts"),f=a("./providers"),g=a("./utils/errors"),h=a("./utils"),i=a("./wallet");b.exports={Wallet:i.Wallet,HDNode:i.HDNode,SigningKey:i.SigningKey,Contract:e.Contract,Interface:e.Interface,networks:f.networks,providers:f,errors:g,utils:h,version:d}},{"./contracts":2,"./package.json":45,"./providers":49,"./utils":66,"./utils/errors":63,"./wallet":78}],5:[function(b,c,d){"use strict";!function(b){function e(a){return parseInt(a)===a}function f(a){if(!e(a.length))return!1;for(var b=0;b<a.length;b++)if(!e(a[b])||a[b]<0||a[b]>255)return!1;return!0}function g(a,b){if(a.buffer&&ArrayBuffer.isView(a)&&"Uint8Array"===a.name)return b&&(a=a.slice?a.slice():Array.prototype.slice.call(a)),a;if(Array.isArray(a)){if(!f(a))throw new Error("Array contains invalid value: "+a);return new Uint8Array(a)}if(e(a.length)&&f(a))return new Uint8Array(a);throw new Error("unsupported array-like object")}function h(a){return new Uint8Array(a)}function i(a,b,c,d,e){null==d&&null==e||(a=a.slice?a.slice(d,e):Array.prototype.slice.call(a,d,e)),b.set(a,c)}function j(a){for(var b=[],c=0;c<a.length;c+=4)b.push(a[c]<<24|a[c+1]<<16|a[c+2]<<8|a[c+3]);return b}function k(a){a=g(a,!0);var b=16-a.length%16,c=h(a.length+b);i(a,c);for(var d=a.length;d<c.length;d++)c[d]=b;return c}function l(a){if(a=g(a,!0),a.length<16)throw new Error("PKCS#7 invalid length");var b=a[a.length-1];if(b>16)throw new Error("PKCS#7 padding byte out of range");for(var c=a.length-b,d=0;d<b;d++)if(a[c+d]!==b)throw new Error("PKCS#7 invalid padding byte");var e=h(c);return i(a,e,0,0,c),e}var m=function(){function a(a){var b=[],c=0;for(a=encodeURI(a);c<a.length;){var d=a.charCodeAt(c++);37===d?(b.push(parseInt(a.substr(c,2),16)),c+=2):b.push(d)}return g(b)}function b(a){for(var b=[],c=0;c<a.length;){var d=a[c];d<128?(b.push(String.fromCharCode(d)),c++):d>191&&d<224?(b.push(String.fromCharCode((31&d)<<6|63&a[c+1])),c+=2):(b.push(String.fromCharCode((15&d)<<12|(63&a[c+1])<<6|63&a[c+2])),c+=3)}return b.join("")}return{toBytes:a,fromBytes:b}}(),n=function(){function a(a){for(var b=[],c=0;c<a.length;c+=2)b.push(parseInt(a.substr(c,2),16));return b}function b(a){for(var b=[],d=0;d<a.length;d++){var e=a[d];b.push(c[(240&e)>>4]+c[15&e])}return b.join("")}var c="0123456789abcdef";return{toBytes:a,fromBytes:b}}(),o={16:10,24:12,32:14},p=[1,2,4,8,16,32,64,128,27,54,108,216,171,77,154,47,94,188,99,198,151,53,106,212,179,125,250,239,197,145],q=[99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22],r=[82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125],s=[3328402341,4168907908,4000806809,4135287693,4294111757,3597364157,3731845041,2445657428,1613770832,33620227,3462883241,1445669757,3892248089,3050821474,1303096294,3967186586,2412431941,528646813,2311702848,4202528135,4026202645,2992200171,2387036105,4226871307,1101901292,3017069671,1604494077,1169141738,597466303,1403299063,3832705686,2613100635,1974974402,3791519004,1033081774,1277568618,1815492186,2118074177,4126668546,2211236943,1748251740,1369810420,3521504564,4193382664,3799085459,2883115123,1647391059,706024767,134480908,2512897874,1176707941,2646852446,806885416,932615841,168101135,798661301,235341577,605164086,461406363,3756188221,3454790438,1311188841,2142417613,3933566367,302582043,495158174,1479289972,874125870,907746093,3698224818,3025820398,1537253627,2756858614,1983593293,3084310113,2108928974,1378429307,3722699582,1580150641,327451799,2790478837,3117535592,0,3253595436,1075847264,3825007647,2041688520,3059440621,3563743934,2378943302,1740553945,1916352843,2487896798,2555137236,2958579944,2244988746,3151024235,3320835882,1336584933,3992714006,2252555205,2588757463,1714631509,293963156,2319795663,3925473552,67240454,4269768577,2689618160,2017213508,631218106,1269344483,2723238387,1571005438,2151694528,93294474,1066570413,563977660,1882732616,4059428100,1673313503,2008463041,2950355573,1109467491,537923632,3858759450,4260623118,3218264685,2177748300,403442708,638784309,3287084079,3193921505,899127202,2286175436,773265209,2479146071,1437050866,4236148354,2050833735,3362022572,3126681063,840505643,3866325909,3227541664,427917720,2655997905,2749160575,1143087718,1412049534,999329963,193497219,2353415882,3354324521,1807268051,672404540,2816401017,3160301282,369822493,2916866934,3688947771,1681011286,1949973070,336202270,2454276571,201721354,1210328172,3093060836,2680341085,3184776046,1135389935,3294782118,965841320,831886756,3554993207,4068047243,3588745010,2345191491,1849112409,3664604599,26054028,2983581028,2622377682,1235855840,3630984372,2891339514,4092916743,3488279077,3395642799,4101667470,1202630377,268961816,1874508501,4034427016,1243948399,1546530418,941366308,1470539505,1941222599,2546386513,3421038627,2715671932,3899946140,1042226977,2521517021,1639824860,227249030,260737669,3765465232,2084453954,1907733956,3429263018,2420656344,100860677,4160157185,470683154,3261161891,1781871967,2924959737,1773779408,394692241,2579611992,974986535,664706745,3655459128,3958962195,731420851,571543859,3530123707,2849626480,126783113,865375399,765172662,1008606754,361203602,3387549984,2278477385,2857719295,1344809080,2782912378,59542671,1503764984,160008576,437062935,1707065306,3622233649,2218934982,3496503480,2185314755,697932208,1512910199,504303377,2075177163,2824099068,1841019862,739644986],t=[2781242211,2230877308,2582542199,2381740923,234877682,3184946027,2984144751,1418839493,1348481072,50462977,2848876391,2102799147,434634494,1656084439,3863849899,2599188086,1167051466,2636087938,1082771913,2281340285,368048890,3954334041,3381544775,201060592,3963727277,1739838676,4250903202,3930435503,3206782108,4149453988,2531553906,1536934080,3262494647,484572669,2923271059,1783375398,1517041206,1098792767,49674231,1334037708,1550332980,4098991525,886171109,150598129,2481090929,1940642008,1398944049,1059722517,201851908,1385547719,1699095331,1587397571,674240536,2704774806,252314885,3039795866,151914247,908333586,2602270848,1038082786,651029483,1766729511,3447698098,2682942837,454166793,2652734339,1951935532,775166490,758520603,3000790638,4004797018,4217086112,4137964114,1299594043,1639438038,3464344499,2068982057,1054729187,1901997871,2534638724,4121318227,1757008337,0,750906861,1614815264,535035132,3363418545,3988151131,3201591914,1183697867,3647454910,1265776953,3734260298,3566750796,3903871064,1250283471,1807470800,717615087,3847203498,384695291,3313910595,3617213773,1432761139,2484176261,3481945413,283769337,100925954,2180939647,4037038160,1148730428,3123027871,3813386408,4087501137,4267549603,3229630528,2315620239,2906624658,3156319645,1215313976,82966005,3747855548,3245848246,1974459098,1665278241,807407632,451280895,251524083,1841287890,1283575245,337120268,891687699,801369324,3787349855,2721421207,3431482436,959321879,1469301956,4065699751,2197585534,1199193405,2898814052,3887750493,724703513,2514908019,2696962144,2551808385,3516813135,2141445340,1715741218,2119445034,2872807568,2198571144,3398190662,700968686,3547052216,1009259540,2041044702,3803995742,487983883,1991105499,1004265696,1449407026,1316239930,504629770,3683797321,168560134,1816667172,3837287516,1570751170,1857934291,4014189740,2797888098,2822345105,2754712981,936633572,2347923833,852879335,1133234376,1500395319,3084545389,2348912013,1689376213,3533459022,3762923945,3034082412,4205598294,133428468,634383082,2949277029,2398386810,3913789102,403703816,3580869306,2297460856,1867130149,1918643758,607656988,4049053350,3346248884,1368901318,600565992,2090982877,2632479860,557719327,3717614411,3697393085,2249034635,2232388234,2430627952,1115438654,3295786421,2865522278,3633334344,84280067,33027830,303828494,2747425121,1600795957,4188952407,3496589753,2434238086,1486471617,658119965,3106381470,953803233,334231800,3005978776,857870609,3151128937,1890179545,2298973838,2805175444,3056442267,574365214,2450884487,550103529,1233637070,4289353045,2018519080,2057691103,2399374476,4166623649,2148108681,387583245,3664101311,836232934,3330556482,3100665960,3280093505,2955516313,2002398509,287182607,3413881008,4238890068,3597515707,975967766],u=[1671808611,2089089148,2006576759,2072901243,4061003762,1807603307,1873927791,3310653893,810573872,16974337,1739181671,729634347,4263110654,3613570519,2883997099,1989864566,3393556426,2191335298,3376449993,2106063485,4195741690,1508618841,1204391495,4027317232,2917941677,3563566036,2734514082,2951366063,2629772188,2767672228,1922491506,3227229120,3082974647,4246528509,2477669779,644500518,911895606,1061256767,4144166391,3427763148,878471220,2784252325,3845444069,4043897329,1905517169,3631459288,827548209,356461077,67897348,3344078279,593839651,3277757891,405286936,2527147926,84871685,2595565466,118033927,305538066,2157648768,3795705826,3945188843,661212711,2999812018,1973414517,152769033,2208177539,745822252,439235610,455947803,1857215598,1525593178,2700827552,1391895634,994932283,3596728278,3016654259,695947817,3812548067,795958831,2224493444,1408607827,3513301457,0,3979133421,543178784,4229948412,2982705585,1542305371,1790891114,3410398667,3201918910,961245753,1256100938,1289001036,1491644504,3477767631,3496721360,4012557807,2867154858,4212583931,1137018435,1305975373,861234739,2241073541,1171229253,4178635257,33948674,2139225727,1357946960,1011120188,2679776671,2833468328,1374921297,2751356323,1086357568,2408187279,2460827538,2646352285,944271416,4110742005,3168756668,3066132406,3665145818,560153121,271589392,4279952895,4077846003,3530407890,3444343245,202643468,322250259,3962553324,1608629855,2543990167,1154254916,389623319,3294073796,2817676711,2122513534,1028094525,1689045092,1575467613,422261273,1939203699,1621147744,2174228865,1339137615,3699352540,577127458,712922154,2427141008,2290289544,1187679302,3995715566,3100863416,339486740,3732514782,1591917662,186455563,3681988059,3762019296,844522546,978220090,169743370,1239126601,101321734,611076132,1558493276,3260915650,3547250131,2901361580,1655096418,2443721105,2510565781,3828863972,2039214713,3878868455,3359869896,928607799,1840765549,2374762893,3580146133,1322425422,2850048425,1823791212,1459268694,4094161908,3928346602,1706019429,2056189050,2934523822,135794696,3134549946,2022240376,628050469,779246638,472135708,2800834470,3032970164,3327236038,3894660072,3715932637,1956440180,522272287,1272813131,3185336765,2340818315,2323976074,1888542832,1044544574,3049550261,1722469478,1222152264,50660867,4127324150,236067854,1638122081,895445557,1475980887,3117443513,2257655686,3243809217,489110045,2662934430,3778599393,4162055160,2561878936,288563729,1773916777,3648039385,2391345038,2493985684,2612407707,505560094,2274497927,3911240169,3460925390,1442818645,678973480,3749357023,2358182796,2717407649,2306869641,219617805,3218761151,3862026214,1120306242,1756942440,1103331905,2578459033,762796589,252780047,2966125488,1425844308,3151392187,372911126],v=[1667474886,2088535288,2004326894,2071694838,4075949567,1802223062,1869591006,3318043793,808472672,16843522,1734846926,724270422,4278065639,3621216949,2880169549,1987484396,3402253711,2189597983,3385409673,2105378810,4210693615,1499065266,1195886990,4042263547,2913856577,3570689971,2728590687,2947541573,2627518243,2762274643,1920112356,3233831835,3082273397,4261223649,2475929149,640051788,909531756,1061110142,4160160501,3435941763,875846760,2779116625,3857003729,4059105529,1903268834,3638064043,825316194,353713962,67374088,3351728789,589522246,3284360861,404236336,2526454071,84217610,2593830191,117901582,303183396,2155911963,3806477791,3958056653,656894286,2998062463,1970642922,151591698,2206440989,741110872,437923380,454765878,1852748508,1515908788,2694904667,1381168804,993742198,3604373943,3014905469,690584402,3823320797,791638366,2223281939,1398011302,3520161977,0,3991743681,538992704,4244381667,2981218425,1532751286,1785380564,3419096717,3200178535,960056178,1246420628,1280103576,1482221744,3486468741,3503319995,4025428677,2863326543,4227536621,1128514950,1296947098,859002214,2240123921,1162203018,4193849577,33687044,2139062782,1347481760,1010582648,2678045221,2829640523,1364325282,2745433693,1077985408,2408548869,2459086143,2644360225,943212656,4126475505,3166494563,3065430391,3671750063,555836226,269496352,4294908645,4092792573,3537006015,3452783745,202118168,320025894,3974901699,1600119230,2543297077,1145359496,387397934,3301201811,2812801621,2122220284,1027426170,1684319432,1566435258,421079858,1936954854,1616945344,2172753945,1330631070,3705438115,572679748,707427924,2425400123,2290647819,1179044492,4008585671,3099120491,336870440,3739122087,1583276732,185277718,3688593069,3772791771,842159716,976899700,168435220,1229577106,101059084,606366792,1549591736,3267517855,3553849021,2897014595,1650632388,2442242105,2509612081,3840161747,2038008818,3890688725,3368567691,926374254,1835907034,2374863873,3587531953,1313788572,2846482505,1819063512,1448540844,4109633523,3941213647,1701162954,2054852340,2930698567,134748176,3132806511,2021165296,623210314,774795868,471606328,2795958615,3031746419,3334885783,3907527627,3722280097,1953799400,522133822,1263263126,3183336545,2341176845,2324333839,1886425312,1044267644,3048588401,1718004428,1212733584,50529542,4143317495,235803164,1633788866,892690282,1465383342,3115962473,2256965911,3250673817,488449850,2661202215,3789633753,4177007595,2560144171,286339874,1768537042,3654906025,2391705863,2492770099,2610673197,505291324,2273808917,3924369609,3469625735,1431699370,673740880,3755965093,2358021891,2711746649,2307489801,218961690,3217021541,3873845719,1111672452,1751693520,1094828930,2576986153,757954394,252645662,2964376443,1414855848,3149649517,370555436],w=[1374988112,2118214995,437757123,975658646,1001089995,530400753,2902087851,1273168787,540080725,2910219766,2295101073,4110568485,1340463100,3307916247,641025152,3043140495,3736164937,632953703,1172967064,1576976609,3274667266,2169303058,2370213795,1809054150,59727847,361929877,3211623147,2505202138,3569255213,1484005843,1239443753,2395588676,1975683434,4102977912,2572697195,666464733,3202437046,4035489047,3374361702,2110667444,1675577880,3843699074,2538681184,1649639237,2976151520,3144396420,4269907996,4178062228,1883793496,2403728665,2497604743,1383856311,2876494627,1917518562,3810496343,1716890410,3001755655,800440835,2261089178,3543599269,807962610,599762354,33778362,3977675356,2328828971,2809771154,4077384432,1315562145,1708848333,101039829,3509871135,3299278474,875451293,2733856160,92987698,2767645557,193195065,1080094634,1584504582,3178106961,1042385657,2531067453,3711829422,1306967366,2438237621,1908694277,67556463,1615861247,429456164,3602770327,2302690252,1742315127,2968011453,126454664,3877198648,2043211483,2709260871,2084704233,4169408201,0,159417987,841739592,504459436,1817866830,4245618683,260388950,1034867998,908933415,168810852,1750902305,2606453969,607530554,202008497,2472011535,3035535058,463180190,2160117071,1641816226,1517767529,470948374,3801332234,3231722213,1008918595,303765277,235474187,4069246893,766945465,337553864,1475418501,2943682380,4003061179,2743034109,4144047775,1551037884,1147550661,1543208500,2336434550,3408119516,3069049960,3102011747,3610369226,1113818384,328671808,2227573024,2236228733,3535486456,2935566865,3341394285,496906059,3702665459,226906860,2009195472,733156972,2842737049,294930682,1206477858,2835123396,2700099354,1451044056,573804783,2269728455,3644379585,2362090238,2564033334,2801107407,2776292904,3669462566,1068351396,742039012,1350078989,1784663195,1417561698,4136440770,2430122216,775550814,2193862645,2673705150,1775276924,1876241833,3475313331,3366754619,270040487,3902563182,3678124923,3441850377,1851332852,3969562369,2203032232,3868552805,2868897406,566021896,4011190502,3135740889,1248802510,3936291284,699432150,832877231,708780849,3332740144,899835584,1951317047,4236429990,3767586992,866637845,4043610186,1106041591,2144161806,395441711,1984812685,1139781709,3433712980,3835036895,2664543715,1282050075,3240894392,1181045119,2640243204,25965917,4203181171,4211818798,3009879386,2463879762,3910161971,1842759443,2597806476,933301370,1509430414,3943906441,3467192302,3076639029,3776767469,2051518780,2631065433,1441952575,404016761,1942435775,1408749034,1610459739,3745345300,2017778566,3400528769,3110650942,941896748,3265478751,371049330,3168937228,675039627,4279080257,967311729,135050206,3635733660,1683407248,2076935265,3576870512,1215061108,3501741890],x=[1347548327,1400783205,3273267108,2520393566,3409685355,4045380933,2880240216,2471224067,1428173050,4138563181,2441661558,636813900,4233094615,3620022987,2149987652,2411029155,1239331162,1730525723,2554718734,3781033664,46346101,310463728,2743944855,3328955385,3875770207,2501218972,3955191162,3667219033,768917123,3545789473,692707433,1150208456,1786102409,2029293177,1805211710,3710368113,3065962831,401639597,1724457132,3028143674,409198410,2196052529,1620529459,1164071807,3769721975,2226875310,486441376,2499348523,1483753576,428819965,2274680428,3075636216,598438867,3799141122,1474502543,711349675,129166120,53458370,2592523643,2782082824,4063242375,2988687269,3120694122,1559041666,730517276,2460449204,4042459122,2706270690,3446004468,3573941694,533804130,2328143614,2637442643,2695033685,839224033,1973745387,957055980,2856345839,106852767,1371368976,4181598602,1033297158,2933734917,1179510461,3046200461,91341917,1862534868,4284502037,605657339,2547432937,3431546947,2003294622,3182487618,2282195339,954669403,3682191598,1201765386,3917234703,3388507166,0,2198438022,1211247597,2887651696,1315723890,4227665663,1443857720,507358933,657861945,1678381017,560487590,3516619604,975451694,2970356327,261314535,3535072918,2652609425,1333838021,2724322336,1767536459,370938394,182621114,3854606378,1128014560,487725847,185469197,2918353863,3106780840,3356761769,2237133081,1286567175,3152976349,4255350624,2683765030,3160175349,3309594171,878443390,1988838185,3704300486,1756818940,1673061617,3403100636,272786309,1075025698,545572369,2105887268,4174560061,296679730,1841768865,1260232239,4091327024,3960309330,3497509347,1814803222,2578018489,4195456072,575138148,3299409036,446754879,3629546796,4011996048,3347532110,3252238545,4270639778,915985419,3483825537,681933534,651868046,2755636671,3828103837,223377554,2607439820,1649704518,3270937875,3901806776,1580087799,4118987695,3198115200,2087309459,2842678573,3016697106,1003007129,2802849917,1860738147,2077965243,164439672,4100872472,32283319,2827177882,1709610350,2125135846,136428751,3874428392,3652904859,3460984630,3572145929,3593056380,2939266226,824852259,818324884,3224740454,930369212,2801566410,2967507152,355706840,1257309336,4148292826,243256656,790073846,2373340630,1296297904,1422699085,3756299780,3818836405,457992840,3099667487,2135319889,77422314,1560382517,1945798516,788204353,1521706781,1385356242,870912086,325965383,2358957921,2050466060,2388260884,2313884476,4006521127,901210569,3990953189,1014646705,1503449823,1062597235,2031621326,3212035895,3931371469,1533017514,350174575,2256028891,2177544179,1052338372,741876788,1606591296,1914052035,213705253,2334669897,1107234197,1899603969,3725069491,2631447780,2422494913,1635502980,1893020342,1950903388,1120974935],y=[2807058932,1699970625,2764249623,1586903591,1808481195,1173430173,1487645946,59984867,4199882800,1844882806,1989249228,1277555970,3623636965,3419915562,1149249077,2744104290,1514790577,459744698,244860394,3235995134,1963115311,4027744588,2544078150,4190530515,1608975247,2627016082,2062270317,1507497298,2200818878,567498868,1764313568,3359936201,2305455554,2037970062,1047239e3,1910319033,1337376481,2904027272,2892417312,984907214,1243112415,830661914,861968209,2135253587,2011214180,2927934315,2686254721,731183368,1750626376,4246310725,1820824798,4172763771,3542330227,48394827,2404901663,2871682645,671593195,3254988725,2073724613,145085239,2280796200,2779915199,1790575107,2187128086,472615631,3029510009,4075877127,3802222185,4107101658,3201631749,1646252340,4270507174,1402811438,1436590835,3778151818,3950355702,3963161475,4020912224,2667994737,273792366,2331590177,104699613,95345982,3175501286,2377486676,1560637892,3564045318,369057872,4213447064,3919042237,1137477952,2658625497,1119727848,2340947849,1530455833,4007360968,172466556,266959938,516552836,0,2256734592,3980931627,1890328081,1917742170,4294704398,945164165,3575528878,958871085,3647212047,2787207260,1423022939,775562294,1739656202,3876557655,2530391278,2443058075,3310321856,547512796,1265195639,437656594,3121275539,719700128,3762502690,387781147,218828297,3350065803,2830708150,2848461854,428169201,122466165,3720081049,1627235199,648017665,4122762354,1002783846,2117360635,695634755,3336358691,4234721005,4049844452,3704280881,2232435299,574624663,287343814,612205898,1039717051,840019705,2708326185,793451934,821288114,1391201670,3822090177,376187827,3113855344,1224348052,1679968233,2361698556,1058709744,752375421,2431590963,1321699145,3519142200,2734591178,188127444,2177869557,3727205754,2384911031,3215212461,2648976442,2450346104,3432737375,1180849278,331544205,3102249176,4150144569,2952102595,2159976285,2474404304,766078933,313773861,2570832044,2108100632,1668212892,3145456443,2013908262,418672217,3070356634,2594734927,1852171925,3867060991,3473416636,3907448597,2614737639,919489135,164948639,2094410160,2997825956,590424639,2486224549,1723872674,3157750862,3399941250,3501252752,3625268135,2555048196,3673637356,1343127501,4130281361,3599595085,2957853679,1297403050,81781910,3051593425,2283490410,532201772,1367295589,3926170974,895287692,1953757831,1093597963,492483431,3528626907,1446242576,1192455638,1636604631,209336225,344873464,1015671571,669961897,3375740769,3857572124,2973530695,3747192018,1933530610,3464042516,935293895,3454686199,2858115069,1863638845,3683022916,4085369519,3292445032,875313188,1080017571,3279033885,621591778,1233856572,2504130317,24197544,3017672716,3835484340,3247465558,2220981195,3060847922,1551124588,1463996600],z=[4104605777,1097159550,396673818,660510266,2875968315,2638606623,4200115116,3808662347,821712160,1986918061,3430322568,38544885,3856137295,718002117,893681702,1654886325,2975484382,3122358053,3926825029,4274053469,796197571,1290801793,1184342925,3556361835,2405426947,2459735317,1836772287,1381620373,3196267988,1948373848,3764988233,3385345166,3263785589,2390325492,1480485785,3111247143,3780097726,2293045232,548169417,3459953789,3746175075,439452389,1362321559,1400849762,1685577905,1806599355,2174754046,137073913,1214797936,1174215055,3731654548,2079897426,1943217067,1258480242,529487843,1437280870,3945269170,3049390895,3313212038,923313619,679998e3,3215307299,57326082,377642221,3474729866,2041877159,133361907,1776460110,3673476453,96392454,878845905,2801699524,777231668,4082475170,2330014213,4142626212,2213296395,1626319424,1906247262,1846563261,562755902,3708173718,1040559837,3871163981,1418573201,3294430577,114585348,1343618912,2566595609,3186202582,1078185097,3651041127,3896688048,2307622919,425408743,3371096953,2081048481,1108339068,2216610296,0,2156299017,736970802,292596766,1517440620,251657213,2235061775,2933202493,758720310,265905162,1554391400,1532285339,908999204,174567692,1474760595,4002861748,2610011675,3234156416,3693126241,2001430874,303699484,2478443234,2687165888,585122620,454499602,151849742,2345119218,3064510765,514443284,4044981591,1963412655,2581445614,2137062819,19308535,1928707164,1715193156,4219352155,1126790795,600235211,3992742070,3841024952,836553431,1669664834,2535604243,3323011204,1243905413,3141400786,4180808110,698445255,2653899549,2989552604,2253581325,3252932727,3004591147,1891211689,2487810577,3915653703,4237083816,4030667424,2100090966,865136418,1229899655,953270745,3399679628,3557504664,4118925222,2061379749,3079546586,2915017791,983426092,2022837584,1607244650,2118541908,2366882550,3635996816,972512814,3283088770,1568718495,3499326569,3576539503,621982671,2895723464,410887952,2623762152,1002142683,645401037,1494807662,2595684844,1335535747,2507040230,4293295786,3167684641,367585007,3885750714,1865862730,2668221674,2960971305,2763173681,1059270954,2777952454,2724642869,1320957812,2194319100,2429595872,2815956275,77089521,3973773121,3444575871,2448830231,1305906550,4021308739,2857194700,2516901860,3518358430,1787304780,740276417,1699839814,1592394909,2352307457,2272556026,188821243,1729977011,3687994002,274084841,3594982253,3613494426,2701949495,4162096729,322734571,2837966542,1640576439,484830689,1202797690,3537852828,4067639125,349075736,3342319475,4157467219,4255800159,1030690015,1155237496,2951971274,1757691577,607398968,2738905026,499347990,3794078908,1011452712,227885567,2818666809,213114376,3034881240,1455525988,3414450555,850817237,1817998408,3092726480],A=[0,235474187,470948374,303765277,941896748,908933415,607530554,708780849,1883793496,2118214995,1817866830,1649639237,1215061108,1181045119,1417561698,1517767529,3767586992,4003061179,4236429990,4069246893,3635733660,3602770327,3299278474,3400528769,2430122216,2664543715,2362090238,2193862645,2835123396,2801107407,3035535058,3135740889,3678124923,3576870512,3341394285,3374361702,3810496343,3977675356,4279080257,4043610186,2876494627,2776292904,3076639029,3110650942,2472011535,2640243204,2403728665,2169303058,1001089995,899835584,666464733,699432150,59727847,226906860,530400753,294930682,1273168787,1172967064,1475418501,1509430414,1942435775,2110667444,1876241833,1641816226,2910219766,2743034109,2976151520,3211623147,2505202138,2606453969,2302690252,2269728455,3711829422,3543599269,3240894392,3475313331,3843699074,3943906441,4178062228,4144047775,1306967366,1139781709,1374988112,1610459739,1975683434,2076935265,1775276924,1742315127,1034867998,866637845,566021896,800440835,92987698,193195065,429456164,395441711,1984812685,2017778566,1784663195,1683407248,1315562145,1080094634,1383856311,1551037884,101039829,135050206,437757123,337553864,1042385657,807962610,573804783,742039012,2531067453,2564033334,2328828971,2227573024,2935566865,2700099354,3001755655,3168937228,3868552805,3902563182,4203181171,4102977912,3736164937,3501741890,3265478751,3433712980,1106041591,1340463100,1576976609,1408749034,2043211483,2009195472,1708848333,1809054150,832877231,1068351396,766945465,599762354,159417987,126454664,361929877,463180190,2709260871,2943682380,3178106961,3009879386,2572697195,2538681184,2236228733,2336434550,3509871135,3745345300,3441850377,3274667266,3910161971,3877198648,4110568485,4211818798,2597806476,2497604743,2261089178,2295101073,2733856160,2902087851,3202437046,2968011453,3936291284,3835036895,4136440770,4169408201,3535486456,3702665459,3467192302,3231722213,2051518780,1951317047,1716890410,1750902305,1113818384,1282050075,1584504582,1350078989,168810852,67556463,371049330,404016761,841739592,1008918595,775550814,540080725,3969562369,3801332234,4035489047,4269907996,3569255213,3669462566,3366754619,3332740144,2631065433,2463879762,2160117071,2395588676,2767645557,2868897406,3102011747,3069049960,202008497,33778362,270040487,504459436,875451293,975658646,675039627,641025152,2084704233,1917518562,1615861247,1851332852,1147550661,1248802510,1484005843,1451044056,933301370,967311729,733156972,632953703,260388950,25965917,328671808,496906059,1206477858,1239443753,1543208500,1441952575,2144161806,1908694277,1675577880,1842759443,3610369226,3644379585,3408119516,3307916247,4011190502,3776767469,4077384432,4245618683,2809771154,2842737049,3144396420,3043140495,2673705150,2438237621,2203032232,2370213795],B=[0,185469197,370938394,487725847,741876788,657861945,975451694,824852259,1483753576,1400783205,1315723890,1164071807,1950903388,2135319889,1649704518,1767536459,2967507152,3152976349,2801566410,2918353863,2631447780,2547432937,2328143614,2177544179,3901806776,3818836405,4270639778,4118987695,3299409036,3483825537,3535072918,3652904859,2077965243,1893020342,1841768865,1724457132,1474502543,1559041666,1107234197,1257309336,598438867,681933534,901210569,1052338372,261314535,77422314,428819965,310463728,3409685355,3224740454,3710368113,3593056380,3875770207,3960309330,4045380933,4195456072,2471224067,2554718734,2237133081,2388260884,3212035895,3028143674,2842678573,2724322336,4138563181,4255350624,3769721975,3955191162,3667219033,3516619604,3431546947,3347532110,2933734917,2782082824,3099667487,3016697106,2196052529,2313884476,2499348523,2683765030,1179510461,1296297904,1347548327,1533017514,1786102409,1635502980,2087309459,2003294622,507358933,355706840,136428751,53458370,839224033,957055980,605657339,790073846,2373340630,2256028891,2607439820,2422494913,2706270690,2856345839,3075636216,3160175349,3573941694,3725069491,3273267108,3356761769,4181598602,4063242375,4011996048,3828103837,1033297158,915985419,730517276,545572369,296679730,446754879,129166120,213705253,1709610350,1860738147,1945798516,2029293177,1239331162,1120974935,1606591296,1422699085,4148292826,4233094615,3781033664,3931371469,3682191598,3497509347,3446004468,3328955385,2939266226,2755636671,3106780840,2988687269,2198438022,2282195339,2501218972,2652609425,1201765386,1286567175,1371368976,1521706781,1805211710,1620529459,2105887268,1988838185,533804130,350174575,164439672,46346101,870912086,954669403,636813900,788204353,2358957921,2274680428,2592523643,2441661558,2695033685,2880240216,3065962831,3182487618,3572145929,3756299780,3270937875,3388507166,4174560061,4091327024,4006521127,3854606378,1014646705,930369212,711349675,560487590,272786309,457992840,106852767,223377554,1678381017,1862534868,1914052035,2031621326,1211247597,1128014560,1580087799,1428173050,32283319,182621114,401639597,486441376,768917123,651868046,1003007129,818324884,1503449823,1385356242,1333838021,1150208456,1973745387,2125135846,1673061617,1756818940,2970356327,3120694122,2802849917,2887651696,2637442643,2520393566,2334669897,2149987652,3917234703,3799141122,4284502037,4100872472,3309594171,3460984630,3545789473,3629546796,2050466060,1899603969,1814803222,1730525723,1443857720,1560382517,1075025698,1260232239,575138148,692707433,878443390,1062597235,243256656,91341917,409198410,325965383,3403100636,3252238545,3704300486,3620022987,3874428392,3990953189,4042459122,4227665663,2460449204,2578018489,2226875310,2411029155,3198115200,3046200461,2827177882,2743944855],C=[0,218828297,437656594,387781147,875313188,958871085,775562294,590424639,1750626376,1699970625,1917742170,2135253587,1551124588,1367295589,1180849278,1265195639,3501252752,3720081049,3399941250,3350065803,3835484340,3919042237,4270507174,4085369519,3102249176,3051593425,2734591178,2952102595,2361698556,2177869557,2530391278,2614737639,3145456443,3060847922,2708326185,2892417312,2404901663,2187128086,2504130317,2555048196,3542330227,3727205754,3375740769,3292445032,3876557655,3926170974,4246310725,4027744588,1808481195,1723872674,1910319033,2094410160,1608975247,1391201670,1173430173,1224348052,59984867,244860394,428169201,344873464,935293895,984907214,766078933,547512796,1844882806,1627235199,2011214180,2062270317,1507497298,1423022939,1137477952,1321699145,95345982,145085239,532201772,313773861,830661914,1015671571,731183368,648017665,3175501286,2957853679,2807058932,2858115069,2305455554,2220981195,2474404304,2658625497,3575528878,3625268135,3473416636,3254988725,3778151818,3963161475,4213447064,4130281361,3599595085,3683022916,3432737375,3247465558,3802222185,4020912224,4172763771,4122762354,3201631749,3017672716,2764249623,2848461854,2331590177,2280796200,2431590963,2648976442,104699613,188127444,472615631,287343814,840019705,1058709744,671593195,621591778,1852171925,1668212892,1953757831,2037970062,1514790577,1463996600,1080017571,1297403050,3673637356,3623636965,3235995134,3454686199,4007360968,3822090177,4107101658,4190530515,2997825956,3215212461,2830708150,2779915199,2256734592,2340947849,2627016082,2443058075,172466556,122466165,273792366,492483431,1047239e3,861968209,612205898,695634755,1646252340,1863638845,2013908262,1963115311,1446242576,1530455833,1277555970,1093597963,1636604631,1820824798,2073724613,1989249228,1436590835,1487645946,1337376481,1119727848,164948639,81781910,331544205,516552836,1039717051,821288114,669961897,719700128,2973530695,3157750862,2871682645,2787207260,2232435299,2283490410,2667994737,2450346104,3647212047,3564045318,3279033885,3464042516,3980931627,3762502690,4150144569,4199882800,3070356634,3121275539,2904027272,2686254721,2200818878,2384911031,2570832044,2486224549,3747192018,3528626907,3310321856,3359936201,3950355702,3867060991,4049844452,4234721005,1739656202,1790575107,2108100632,1890328081,1402811438,1586903591,1233856572,1149249077,266959938,48394827,369057872,418672217,1002783846,919489135,567498868,752375421,209336225,24197544,376187827,459744698,945164165,895287692,574624663,793451934,1679968233,1764313568,2117360635,1933530610,1343127501,1560637892,1243112415,1192455638,3704280881,3519142200,3336358691,3419915562,3907448597,3857572124,4075877127,4294704398,3029510009,3113855344,2927934315,2744104290,2159976285,2377486676,2594734927,2544078150],D=[0,151849742,303699484,454499602,607398968,758720310,908999204,1059270954,1214797936,1097159550,1517440620,1400849762,1817998408,1699839814,2118541908,2001430874,2429595872,2581445614,2194319100,2345119218,3034881240,3186202582,2801699524,2951971274,3635996816,3518358430,3399679628,3283088770,4237083816,4118925222,4002861748,3885750714,1002142683,850817237,698445255,548169417,529487843,377642221,227885567,77089521,1943217067,2061379749,1640576439,1757691577,1474760595,1592394909,1174215055,1290801793,2875968315,2724642869,3111247143,2960971305,2405426947,2253581325,2638606623,2487810577,3808662347,3926825029,4044981591,4162096729,3342319475,3459953789,3576539503,3693126241,1986918061,2137062819,1685577905,1836772287,1381620373,1532285339,1078185097,1229899655,1040559837,923313619,740276417,621982671,439452389,322734571,137073913,19308535,3871163981,4021308739,4104605777,4255800159,3263785589,3414450555,3499326569,3651041127,2933202493,2815956275,3167684641,3049390895,2330014213,2213296395,2566595609,2448830231,1305906550,1155237496,1607244650,1455525988,1776460110,1626319424,2079897426,1928707164,96392454,213114376,396673818,514443284,562755902,679998e3,865136418,983426092,3708173718,3557504664,3474729866,3323011204,4180808110,4030667424,3945269170,3794078908,2507040230,2623762152,2272556026,2390325492,2975484382,3092726480,2738905026,2857194700,3973773121,3856137295,4274053469,4157467219,3371096953,3252932727,3673476453,3556361835,2763173681,2915017791,3064510765,3215307299,2156299017,2307622919,2459735317,2610011675,2081048481,1963412655,1846563261,1729977011,1480485785,1362321559,1243905413,1126790795,878845905,1030690015,645401037,796197571,274084841,425408743,38544885,188821243,3613494426,3731654548,3313212038,3430322568,4082475170,4200115116,3780097726,3896688048,2668221674,2516901860,2366882550,2216610296,3141400786,2989552604,2837966542,2687165888,1202797690,1320957812,1437280870,1554391400,1669664834,1787304780,1906247262,2022837584,265905162,114585348,499347990,349075736,736970802,585122620,972512814,821712160,2595684844,2478443234,2293045232,2174754046,3196267988,3079546586,2895723464,2777952454,3537852828,3687994002,3234156416,3385345166,4142626212,4293295786,3841024952,3992742070,174567692,57326082,410887952,292596766,777231668,660510266,1011452712,893681702,1108339068,1258480242,1343618912,1494807662,1715193156,1865862730,1948373848,2100090966,2701949495,2818666809,3004591147,3122358053,2235061775,2352307457,2535604243,2653899549,3915653703,3764988233,4219352155,4067639125,3444575871,3294430577,3746175075,3594982253,836553431,953270745,600235211,718002117,367585007,484830689,133361907,251657213,2041877159,1891211689,1806599355,1654886325,1568718495,1418573201,1335535747,1184342925],E=function(a){
    if(!(this instanceof E))throw Error("AES must be instanitated with `new`");Object.defineProperty(this,"key",{value:g(a,!0)}),this._prepare()};E.prototype._prepare=function(){var a=o[this.key.length];if(null==a)throw new Error("invalid key size (must be 16, 24 or 32 bytes)");this._Ke=[],this._Kd=[];for(var b=0;b<=a;b++)this._Ke.push([0,0,0,0]),this._Kd.push([0,0,0,0]);for(var c,d=4*(a+1),e=this.key.length/4,f=j(this.key),b=0;b<e;b++)c=b>>2,this._Ke[c][b%4]=f[b],this._Kd[a-c][b%4]=f[b];for(var g,h=0,i=e;i<d;){if(g=f[e-1],f[0]^=q[g>>16&255]<<24^q[g>>8&255]<<16^q[255&g]<<8^q[g>>24&255]^p[h]<<24,h+=1,8!=e)for(var b=1;b<e;b++)f[b]^=f[b-1];else{for(var b=1;b<e/2;b++)f[b]^=f[b-1];g=f[e/2-1],f[e/2]^=q[255&g]^q[g>>8&255]<<8^q[g>>16&255]<<16^q[g>>24&255]<<24;for(var b=e/2+1;b<e;b++)f[b]^=f[b-1]}for(var k,l,b=0;b<e&&i<d;)k=i>>2,l=i%4,this._Ke[k][l]=f[b],this._Kd[a-k][l]=f[b++],i++}for(var k=1;k<a;k++)for(var l=0;l<4;l++)g=this._Kd[k][l],this._Kd[k][l]=A[g>>24&255]^B[g>>16&255]^C[g>>8&255]^D[255&g]},E.prototype.encrypt=function(a){if(16!=a.length)throw new Error("invalid plaintext size (must be 16 bytes)");for(var b=this._Ke.length-1,c=[0,0,0,0],d=j(a),e=0;e<4;e++)d[e]^=this._Ke[0][e];for(var f=1;f<b;f++){for(var e=0;e<4;e++)c[e]=s[d[e]>>24&255]^t[d[(e+1)%4]>>16&255]^u[d[(e+2)%4]>>8&255]^v[255&d[(e+3)%4]]^this._Ke[f][e];d=c.slice()}for(var g,i=h(16),e=0;e<4;e++)g=this._Ke[b][e],i[4*e]=255&(q[d[e]>>24&255]^g>>24),i[4*e+1]=255&(q[d[(e+1)%4]>>16&255]^g>>16),i[4*e+2]=255&(q[d[(e+2)%4]>>8&255]^g>>8),i[4*e+3]=255&(q[255&d[(e+3)%4]]^g);return i},E.prototype.decrypt=function(a){if(16!=a.length)throw new Error("invalid ciphertext size (must be 16 bytes)");for(var b=this._Kd.length-1,c=[0,0,0,0],d=j(a),e=0;e<4;e++)d[e]^=this._Kd[0][e];for(var f=1;f<b;f++){for(var e=0;e<4;e++)c[e]=w[d[e]>>24&255]^x[d[(e+3)%4]>>16&255]^y[d[(e+2)%4]>>8&255]^z[255&d[(e+1)%4]]^this._Kd[f][e];d=c.slice()}for(var g,i=h(16),e=0;e<4;e++)g=this._Kd[b][e],i[4*e]=255&(r[d[e]>>24&255]^g>>24),i[4*e+1]=255&(r[d[(e+3)%4]>>16&255]^g>>16),i[4*e+2]=255&(r[d[(e+2)%4]>>8&255]^g>>8),i[4*e+3]=255&(r[255&d[(e+1)%4]]^g);return i};var F=function(a){if(!(this instanceof F))throw Error("AES must be instanitated with `new`");this.description="Electronic Code Block",this.name="ecb",this._aes=new E(a)};F.prototype.encrypt=function(a){if(a=g(a),a.length%16!==0)throw new Error("invalid plaintext size (must be multiple of 16 bytes)");for(var b=h(a.length),c=h(16),d=0;d<a.length;d+=16)i(a,c,0,d,d+16),c=this._aes.encrypt(c),i(c,b,d);return b},F.prototype.decrypt=function(a){if(a=g(a),a.length%16!==0)throw new Error("invalid ciphertext size (must be multiple of 16 bytes)");for(var b=h(a.length),c=h(16),d=0;d<a.length;d+=16)i(a,c,0,d,d+16),c=this._aes.decrypt(c),i(c,b,d);return b};var G=function(a,b){if(!(this instanceof G))throw Error("AES must be instanitated with `new`");if(this.description="Cipher Block Chaining",this.name="cbc",b){if(16!=b.length)throw new Error("invalid initialation vector size (must be 16 bytes)")}else b=h(16);this._lastCipherblock=g(b,!0),this._aes=new E(a)};G.prototype.encrypt=function(a){if(a=g(a),a.length%16!==0)throw new Error("invalid plaintext size (must be multiple of 16 bytes)");for(var b=h(a.length),c=h(16),d=0;d<a.length;d+=16){i(a,c,0,d,d+16);for(var e=0;e<16;e++)c[e]^=this._lastCipherblock[e];this._lastCipherblock=this._aes.encrypt(c),i(this._lastCipherblock,b,d)}return b},G.prototype.decrypt=function(a){if(a=g(a),a.length%16!==0)throw new Error("invalid ciphertext size (must be multiple of 16 bytes)");for(var b=h(a.length),c=h(16),d=0;d<a.length;d+=16){i(a,c,0,d,d+16),c=this._aes.decrypt(c);for(var e=0;e<16;e++)b[d+e]=c[e]^this._lastCipherblock[e];i(a,this._lastCipherblock,0,d,d+16)}return b};var H=function(a,b,c){if(!(this instanceof H))throw Error("AES must be instanitated with `new`");if(this.description="Cipher Feedback",this.name="cfb",b){if(16!=b.length)throw new Error("invalid initialation vector size (must be 16 size)")}else b=h(16);c||(c=1),this.segmentSize=c,this._shiftRegister=g(b,!0),this._aes=new E(a)};H.prototype.encrypt=function(a){if(a.length%this.segmentSize!=0)throw new Error("invalid plaintext size (must be segmentSize bytes)");for(var b,c=g(a,!0),d=0;d<c.length;d+=this.segmentSize){b=this._aes.encrypt(this._shiftRegister);for(var e=0;e<this.segmentSize;e++)c[d+e]^=b[e];i(this._shiftRegister,this._shiftRegister,0,this.segmentSize),i(c,this._shiftRegister,16-this.segmentSize,d,d+this.segmentSize)}return c},H.prototype.decrypt=function(a){if(a.length%this.segmentSize!=0)throw new Error("invalid ciphertext size (must be segmentSize bytes)");for(var b,c=g(a,!0),d=0;d<c.length;d+=this.segmentSize){b=this._aes.encrypt(this._shiftRegister);for(var e=0;e<this.segmentSize;e++)c[d+e]^=b[e];i(this._shiftRegister,this._shiftRegister,0,this.segmentSize),i(a,this._shiftRegister,16-this.segmentSize,d,d+this.segmentSize)}return c};var I=function(a,b){if(!(this instanceof I))throw Error("AES must be instanitated with `new`");if(this.description="Output Feedback",this.name="ofb",b){if(16!=b.length)throw new Error("invalid initialation vector size (must be 16 bytes)")}else b=h(16);this._lastPrecipher=g(b,!0),this._lastPrecipherIndex=16,this._aes=new E(a)};I.prototype.encrypt=function(a){for(var b=g(a,!0),c=0;c<b.length;c++)16===this._lastPrecipherIndex&&(this._lastPrecipher=this._aes.encrypt(this._lastPrecipher),this._lastPrecipherIndex=0),b[c]^=this._lastPrecipher[this._lastPrecipherIndex++];return b},I.prototype.decrypt=I.prototype.encrypt;var J=function(a){if(!(this instanceof J))throw Error("Counter must be instanitated with `new`");0===a||a||(a=1),"number"==typeof a?(this._counter=h(16),this.setValue(a)):this.setBytes(a)};J.prototype.setValue=function(a){if("number"!=typeof a||parseInt(a)!=a)throw new Error("invalid counter value (must be an integer)");for(var b=15;b>=0;--b)this._counter[b]=a%256,a>>=8},J.prototype.setBytes=function(a){if(a=g(a,!0),16!=a.length)throw new Error("invalid counter bytes size (must be 16 bytes)");this._counter=a},J.prototype.increment=function(){for(var a=15;a>=0;a--){if(255!==this._counter[a]){this._counter[a]++;break}this._counter[a]=0}};var K=function(a,b){if(!(this instanceof K))throw Error("AES must be instanitated with `new`");this.description="Counter",this.name="ctr",b instanceof J||(b=new J(b)),this._counter=b,this._remainingCounter=null,this._remainingCounterIndex=16,this._aes=new E(a)};K.prototype.encrypt=function(a){for(var b=g(a,!0),c=0;c<b.length;c++)16===this._remainingCounterIndex&&(this._remainingCounter=this._aes.encrypt(this._counter._counter),this._remainingCounterIndex=0,this._counter.increment()),b[c]^=this._remainingCounter[this._remainingCounterIndex++];return b},K.prototype.decrypt=K.prototype.encrypt;var L={AES:E,Counter:J,ModeOfOperation:{ecb:F,cbc:G,cfb:H,ofb:I,ctr:K},utils:{hex:n,utf8:m},padding:{pkcs7:{pad:k,strip:l}},_arrayTest:{coerceArray:g,createArray:h,copyArray:i}};"undefined"!=typeof d?c.exports=L:"function"==typeof a&&a.amd?a(L):(b.aesjs&&(L._aesjs=b.aesjs),b.aesjs=L)}(this)},{}],6:[function(a,b,c){!function(b,c){"use strict";function d(a,b){if(!a)throw new Error(b||"Assertion failed")}function e(a,b){a.super_=b;var c=function(){};c.prototype=b.prototype,a.prototype=new c,a.prototype.constructor=a}function f(a,b,c){return f.isBN(a)?a:(this.negative=0,this.words=null,this.length=0,this.red=null,void(null!==a&&("le"!==b&&"be"!==b||(c=b,b=10),this._init(a||0,b||10,c||"be"))))}function g(a,b,c){for(var d=0,e=Math.min(a.length,c),f=b;f<e;f++){var g=a.charCodeAt(f)-48;d<<=4,d|=g>=49&&g<=54?g-49+10:g>=17&&g<=22?g-17+10:15&g}return d}function h(a,b,c,d){for(var e=0,f=Math.min(a.length,c),g=b;g<f;g++){var h=a.charCodeAt(g)-48;e*=d,e+=h>=49?h-49+10:h>=17?h-17+10:h}return e}function i(a){for(var b=new Array(a.bitLength()),c=0;c<b.length;c++){var d=c/26|0,e=c%26;b[c]=(a.words[d]&1<<e)>>>e}return b}function j(a,b,c){c.negative=b.negative^a.negative;var d=a.length+b.length|0;c.length=d,d=d-1|0;var e=0|a.words[0],f=0|b.words[0],g=e*f,h=67108863&g,i=g/67108864|0;c.words[0]=h;for(var j=1;j<d;j++){for(var k=i>>>26,l=67108863&i,m=Math.min(j,b.length-1),n=Math.max(0,j-a.length+1);n<=m;n++){var o=j-n|0;e=0|a.words[o],f=0|b.words[n],g=e*f+l,k+=g/67108864|0,l=67108863&g}c.words[j]=0|l,i=0|k}return 0!==i?c.words[j]=0|i:c.length--,c.strip()}function k(a,b,c){c.negative=b.negative^a.negative,c.length=a.length+b.length;for(var d=0,e=0,f=0;f<c.length-1;f++){var g=e;e=0;for(var h=67108863&d,i=Math.min(f,b.length-1),j=Math.max(0,f-a.length+1);j<=i;j++){var k=f-j,l=0|a.words[k],m=0|b.words[j],n=l*m,o=67108863&n;g=g+(n/67108864|0)|0,o=o+h|0,h=67108863&o,g=g+(o>>>26)|0,e+=g>>>26,g&=67108863}c.words[f]=h,d=g,g=e}return 0!==d?c.words[f]=d:c.length--,c.strip()}function l(a,b,c){var d=new m;return d.mulp(a,b,c)}function m(a,b){this.x=a,this.y=b}function n(a,b){this.name=a,this.p=new f(b,16),this.n=this.p.bitLength(),this.k=new f(1).iushln(this.n).isub(this.p),this.tmp=this._tmp()}function o(){n.call(this,"k256","ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f")}function p(){n.call(this,"p224","ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001")}function q(){n.call(this,"p192","ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff")}function r(){n.call(this,"25519","7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed")}function s(a){if("string"==typeof a){var b=f._prime(a);this.m=b.p,this.prime=b}else d(a.gtn(1),"modulus must be greater than 1"),this.m=a,this.prime=null}function t(a){s.call(this,a),this.shift=this.m.bitLength(),this.shift%26!==0&&(this.shift+=26-this.shift%26),this.r=new f(1).iushln(this.shift),this.r2=this.imod(this.r.sqr()),this.rinv=this.r._invmp(this.m),this.minv=this.rinv.mul(this.r).isubn(1).div(this.m),this.minv=this.minv.umod(this.r),this.minv=this.r.sub(this.minv)}"object"==typeof b?b.exports=f:c.BN=f,f.BN=f,f.wordSize=26;var u;try{u=a("buffer").Buffer}catch(v){}f.isBN=function(a){return a instanceof f||null!==a&&"object"==typeof a&&a.constructor.wordSize===f.wordSize&&Array.isArray(a.words)},f.max=function(a,b){return a.cmp(b)>0?a:b},f.min=function(a,b){return a.cmp(b)<0?a:b},f.prototype._init=function(a,b,c){if("number"==typeof a)return this._initNumber(a,b,c);if("object"==typeof a)return this._initArray(a,b,c);"hex"===b&&(b=16),d(b===(0|b)&&b>=2&&b<=36),a=a.toString().replace(/\s+/g,"");var e=0;"-"===a[0]&&e++,16===b?this._parseHex(a,e):this._parseBase(a,b,e),"-"===a[0]&&(this.negative=1),this.strip(),"le"===c&&this._initArray(this.toArray(),b,c)},f.prototype._initNumber=function(a,b,c){a<0&&(this.negative=1,a=-a),a<67108864?(this.words=[67108863&a],this.length=1):a<4503599627370496?(this.words=[67108863&a,a/67108864&67108863],this.length=2):(d(a<9007199254740992),this.words=[67108863&a,a/67108864&67108863,1],this.length=3),"le"===c&&this._initArray(this.toArray(),b,c)},f.prototype._initArray=function(a,b,c){if(d("number"==typeof a.length),a.length<=0)return this.words=[0],this.length=1,this;this.length=Math.ceil(a.length/3),this.words=new Array(this.length);for(var e=0;e<this.length;e++)this.words[e]=0;var f,g,h=0;if("be"===c)for(e=a.length-1,f=0;e>=0;e-=3)g=a[e]|a[e-1]<<8|a[e-2]<<16,this.words[f]|=g<<h&67108863,this.words[f+1]=g>>>26-h&67108863,h+=24,h>=26&&(h-=26,f++);else if("le"===c)for(e=0,f=0;e<a.length;e+=3)g=a[e]|a[e+1]<<8|a[e+2]<<16,this.words[f]|=g<<h&67108863,this.words[f+1]=g>>>26-h&67108863,h+=24,h>=26&&(h-=26,f++);return this.strip()},f.prototype._parseHex=function(a,b){this.length=Math.ceil((a.length-b)/6),this.words=new Array(this.length);for(var c=0;c<this.length;c++)this.words[c]=0;var d,e,f=0;for(c=a.length-6,d=0;c>=b;c-=6)e=g(a,c,c+6),this.words[d]|=e<<f&67108863,this.words[d+1]|=e>>>26-f&4194303,f+=24,f>=26&&(f-=26,d++);c+6!==b&&(e=g(a,b,c+6),this.words[d]|=e<<f&67108863,this.words[d+1]|=e>>>26-f&4194303),this.strip()},f.prototype._parseBase=function(a,b,c){this.words=[0],this.length=1;for(var d=0,e=1;e<=67108863;e*=b)d++;d--,e=e/b|0;for(var f=a.length-c,g=f%d,i=Math.min(f,f-g)+c,j=0,k=c;k<i;k+=d)j=h(a,k,k+d,b),this.imuln(e),this.words[0]+j<67108864?this.words[0]+=j:this._iaddn(j);if(0!==g){var l=1;for(j=h(a,k,a.length,b),k=0;k<g;k++)l*=b;this.imuln(l),this.words[0]+j<67108864?this.words[0]+=j:this._iaddn(j)}},f.prototype.copy=function(a){a.words=new Array(this.length);for(var b=0;b<this.length;b++)a.words[b]=this.words[b];a.length=this.length,a.negative=this.negative,a.red=this.red},f.prototype.clone=function(){var a=new f(null);return this.copy(a),a},f.prototype._expand=function(a){for(;this.length<a;)this.words[this.length++]=0;return this},f.prototype.strip=function(){for(;this.length>1&&0===this.words[this.length-1];)this.length--;return this._normSign()},f.prototype._normSign=function(){return 1===this.length&&0===this.words[0]&&(this.negative=0),this},f.prototype.inspect=function(){return(this.red?"<BN-R: ":"<BN: ")+this.toString(16)+">"};var w=["","0","00","000","0000","00000","000000","0000000","00000000","000000000","0000000000","00000000000","000000000000","0000000000000","00000000000000","000000000000000","0000000000000000","00000000000000000","000000000000000000","0000000000000000000","00000000000000000000","000000000000000000000","0000000000000000000000","00000000000000000000000","000000000000000000000000","0000000000000000000000000"],x=[0,0,25,16,12,11,10,9,8,8,7,7,7,7,6,6,6,6,6,6,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],y=[0,0,33554432,43046721,16777216,48828125,60466176,40353607,16777216,43046721,1e7,19487171,35831808,62748517,7529536,11390625,16777216,24137569,34012224,47045881,64e6,4084101,5153632,6436343,7962624,9765625,11881376,14348907,17210368,20511149,243e5,28629151,33554432,39135393,45435424,52521875,60466176];f.prototype.toString=function(a,b){a=a||10,b=0|b||1;var c;if(16===a||"hex"===a){c="";for(var e=0,f=0,g=0;g<this.length;g++){var h=this.words[g],i=(16777215&(h<<e|f)).toString(16);f=h>>>24-e&16777215,c=0!==f||g!==this.length-1?w[6-i.length]+i+c:i+c,e+=2,e>=26&&(e-=26,g--)}for(0!==f&&(c=f.toString(16)+c);c.length%b!==0;)c="0"+c;return 0!==this.negative&&(c="-"+c),c}if(a===(0|a)&&a>=2&&a<=36){var j=x[a],k=y[a];c="";var l=this.clone();for(l.negative=0;!l.isZero();){var m=l.modn(k).toString(a);l=l.idivn(k),c=l.isZero()?m+c:w[j-m.length]+m+c}for(this.isZero()&&(c="0"+c);c.length%b!==0;)c="0"+c;return 0!==this.negative&&(c="-"+c),c}d(!1,"Base should be between 2 and 36")},f.prototype.toNumber=function(){var a=this.words[0];return 2===this.length?a+=67108864*this.words[1]:3===this.length&&1===this.words[2]?a+=4503599627370496+67108864*this.words[1]:this.length>2&&d(!1,"Number can only safely store up to 53 bits"),0!==this.negative?-a:a},f.prototype.toJSON=function(){return this.toString(16)},f.prototype.toBuffer=function(a,b){return d("undefined"!=typeof u),this.toArrayLike(u,a,b)},f.prototype.toArray=function(a,b){return this.toArrayLike(Array,a,b)},f.prototype.toArrayLike=function(a,b,c){var e=this.byteLength(),f=c||Math.max(1,e);d(e<=f,"byte array longer than desired length"),d(f>0,"Requested array length <= 0"),this.strip();var g,h,i="le"===b,j=new a(f),k=this.clone();if(i){for(h=0;!k.isZero();h++)g=k.andln(255),k.iushrn(8),j[h]=g;for(;h<f;h++)j[h]=0}else{for(h=0;h<f-e;h++)j[h]=0;for(h=0;!k.isZero();h++)g=k.andln(255),k.iushrn(8),j[f-h-1]=g}return j},Math.clz32?f.prototype._countBits=function(a){return 32-Math.clz32(a)}:f.prototype._countBits=function(a){var b=a,c=0;return b>=4096&&(c+=13,b>>>=13),b>=64&&(c+=7,b>>>=7),b>=8&&(c+=4,b>>>=4),b>=2&&(c+=2,b>>>=2),c+b},f.prototype._zeroBits=function(a){if(0===a)return 26;var b=a,c=0;return 0===(8191&b)&&(c+=13,b>>>=13),0===(127&b)&&(c+=7,b>>>=7),0===(15&b)&&(c+=4,b>>>=4),0===(3&b)&&(c+=2,b>>>=2),0===(1&b)&&c++,c},f.prototype.bitLength=function(){var a=this.words[this.length-1],b=this._countBits(a);return 26*(this.length-1)+b},f.prototype.zeroBits=function(){if(this.isZero())return 0;for(var a=0,b=0;b<this.length;b++){var c=this._zeroBits(this.words[b]);if(a+=c,26!==c)break}return a},f.prototype.byteLength=function(){return Math.ceil(this.bitLength()/8)},f.prototype.toTwos=function(a){return 0!==this.negative?this.abs().inotn(a).iaddn(1):this.clone()},f.prototype.fromTwos=function(a){return this.testn(a-1)?this.notn(a).iaddn(1).ineg():this.clone()},f.prototype.isNeg=function(){return 0!==this.negative},f.prototype.neg=function(){return this.clone().ineg()},f.prototype.ineg=function(){return this.isZero()||(this.negative^=1),this},f.prototype.iuor=function(a){for(;this.length<a.length;)this.words[this.length++]=0;for(var b=0;b<a.length;b++)this.words[b]=this.words[b]|a.words[b];return this.strip()},f.prototype.ior=function(a){return d(0===(this.negative|a.negative)),this.iuor(a)},f.prototype.or=function(a){return this.length>a.length?this.clone().ior(a):a.clone().ior(this)},f.prototype.uor=function(a){return this.length>a.length?this.clone().iuor(a):a.clone().iuor(this)},f.prototype.iuand=function(a){var b;b=this.length>a.length?a:this;for(var c=0;c<b.length;c++)this.words[c]=this.words[c]&a.words[c];return this.length=b.length,this.strip()},f.prototype.iand=function(a){return d(0===(this.negative|a.negative)),this.iuand(a)},f.prototype.and=function(a){return this.length>a.length?this.clone().iand(a):a.clone().iand(this)},f.prototype.uand=function(a){return this.length>a.length?this.clone().iuand(a):a.clone().iuand(this)},f.prototype.iuxor=function(a){var b,c;this.length>a.length?(b=this,c=a):(b=a,c=this);for(var d=0;d<c.length;d++)this.words[d]=b.words[d]^c.words[d];if(this!==b)for(;d<b.length;d++)this.words[d]=b.words[d];return this.length=b.length,this.strip()},f.prototype.ixor=function(a){return d(0===(this.negative|a.negative)),this.iuxor(a)},f.prototype.xor=function(a){return this.length>a.length?this.clone().ixor(a):a.clone().ixor(this)},f.prototype.uxor=function(a){return this.length>a.length?this.clone().iuxor(a):a.clone().iuxor(this)},f.prototype.inotn=function(a){d("number"==typeof a&&a>=0);var b=0|Math.ceil(a/26),c=a%26;this._expand(b),c>0&&b--;for(var e=0;e<b;e++)this.words[e]=67108863&~this.words[e];return c>0&&(this.words[e]=~this.words[e]&67108863>>26-c),this.strip()},f.prototype.notn=function(a){return this.clone().inotn(a)},f.prototype.setn=function(a,b){d("number"==typeof a&&a>=0);var c=a/26|0,e=a%26;return this._expand(c+1),b?this.words[c]=this.words[c]|1<<e:this.words[c]=this.words[c]&~(1<<e),this.strip()},f.prototype.iadd=function(a){var b;if(0!==this.negative&&0===a.negative)return this.negative=0,b=this.isub(a),this.negative^=1,this._normSign();if(0===this.negative&&0!==a.negative)return a.negative=0,b=this.isub(a),a.negative=1,b._normSign();var c,d;this.length>a.length?(c=this,d=a):(c=a,d=this);for(var e=0,f=0;f<d.length;f++)b=(0|c.words[f])+(0|d.words[f])+e,this.words[f]=67108863&b,e=b>>>26;for(;0!==e&&f<c.length;f++)b=(0|c.words[f])+e,this.words[f]=67108863&b,e=b>>>26;if(this.length=c.length,0!==e)this.words[this.length]=e,this.length++;else if(c!==this)for(;f<c.length;f++)this.words[f]=c.words[f];return this},f.prototype.add=function(a){var b;return 0!==a.negative&&0===this.negative?(a.negative=0,b=this.sub(a),a.negative^=1,b):0===a.negative&&0!==this.negative?(this.negative=0,b=a.sub(this),this.negative=1,b):this.length>a.length?this.clone().iadd(a):a.clone().iadd(this)},f.prototype.isub=function(a){if(0!==a.negative){a.negative=0;var b=this.iadd(a);return a.negative=1,b._normSign()}if(0!==this.negative)return this.negative=0,this.iadd(a),this.negative=1,this._normSign();var c=this.cmp(a);if(0===c)return this.negative=0,this.length=1,this.words[0]=0,this;var d,e;c>0?(d=this,e=a):(d=a,e=this);for(var f=0,g=0;g<e.length;g++)b=(0|d.words[g])-(0|e.words[g])+f,f=b>>26,this.words[g]=67108863&b;for(;0!==f&&g<d.length;g++)b=(0|d.words[g])+f,f=b>>26,this.words[g]=67108863&b;if(0===f&&g<d.length&&d!==this)for(;g<d.length;g++)this.words[g]=d.words[g];return this.length=Math.max(this.length,g),d!==this&&(this.negative=1),this.strip()},f.prototype.sub=function(a){return this.clone().isub(a)};var z=function(a,b,c){var d,e,f,g=a.words,h=b.words,i=c.words,j=0,k=0|g[0],l=8191&k,m=k>>>13,n=0|g[1],o=8191&n,p=n>>>13,q=0|g[2],r=8191&q,s=q>>>13,t=0|g[3],u=8191&t,v=t>>>13,w=0|g[4],x=8191&w,y=w>>>13,z=0|g[5],A=8191&z,B=z>>>13,C=0|g[6],D=8191&C,E=C>>>13,F=0|g[7],G=8191&F,H=F>>>13,I=0|g[8],J=8191&I,K=I>>>13,L=0|g[9],M=8191&L,N=L>>>13,O=0|h[0],P=8191&O,Q=O>>>13,R=0|h[1],S=8191&R,T=R>>>13,U=0|h[2],V=8191&U,W=U>>>13,X=0|h[3],Y=8191&X,Z=X>>>13,$=0|h[4],_=8191&$,aa=$>>>13,ba=0|h[5],ca=8191&ba,da=ba>>>13,ea=0|h[6],fa=8191&ea,ga=ea>>>13,ha=0|h[7],ia=8191&ha,ja=ha>>>13,ka=0|h[8],la=8191&ka,ma=ka>>>13,na=0|h[9],oa=8191&na,pa=na>>>13;c.negative=a.negative^b.negative,c.length=19,d=Math.imul(l,P),e=Math.imul(l,Q),e=e+Math.imul(m,P)|0,f=Math.imul(m,Q);var qa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(qa>>>26)|0,qa&=67108863,d=Math.imul(o,P),e=Math.imul(o,Q),e=e+Math.imul(p,P)|0,f=Math.imul(p,Q),d=d+Math.imul(l,S)|0,e=e+Math.imul(l,T)|0,e=e+Math.imul(m,S)|0,f=f+Math.imul(m,T)|0;var ra=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(ra>>>26)|0,ra&=67108863,d=Math.imul(r,P),e=Math.imul(r,Q),e=e+Math.imul(s,P)|0,f=Math.imul(s,Q),d=d+Math.imul(o,S)|0,e=e+Math.imul(o,T)|0,e=e+Math.imul(p,S)|0,f=f+Math.imul(p,T)|0,d=d+Math.imul(l,V)|0,e=e+Math.imul(l,W)|0,e=e+Math.imul(m,V)|0,f=f+Math.imul(m,W)|0;var sa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(sa>>>26)|0,sa&=67108863,d=Math.imul(u,P),e=Math.imul(u,Q),e=e+Math.imul(v,P)|0,f=Math.imul(v,Q),d=d+Math.imul(r,S)|0,e=e+Math.imul(r,T)|0,e=e+Math.imul(s,S)|0,f=f+Math.imul(s,T)|0,d=d+Math.imul(o,V)|0,e=e+Math.imul(o,W)|0,e=e+Math.imul(p,V)|0,f=f+Math.imul(p,W)|0,d=d+Math.imul(l,Y)|0,e=e+Math.imul(l,Z)|0,e=e+Math.imul(m,Y)|0,f=f+Math.imul(m,Z)|0;var ta=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(ta>>>26)|0,ta&=67108863,d=Math.imul(x,P),e=Math.imul(x,Q),e=e+Math.imul(y,P)|0,f=Math.imul(y,Q),d=d+Math.imul(u,S)|0,e=e+Math.imul(u,T)|0,e=e+Math.imul(v,S)|0,f=f+Math.imul(v,T)|0,d=d+Math.imul(r,V)|0,e=e+Math.imul(r,W)|0,e=e+Math.imul(s,V)|0,f=f+Math.imul(s,W)|0,d=d+Math.imul(o,Y)|0,e=e+Math.imul(o,Z)|0,e=e+Math.imul(p,Y)|0,f=f+Math.imul(p,Z)|0,d=d+Math.imul(l,_)|0,e=e+Math.imul(l,aa)|0,e=e+Math.imul(m,_)|0,f=f+Math.imul(m,aa)|0;var ua=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(ua>>>26)|0,ua&=67108863,d=Math.imul(A,P),e=Math.imul(A,Q),e=e+Math.imul(B,P)|0,f=Math.imul(B,Q),d=d+Math.imul(x,S)|0,e=e+Math.imul(x,T)|0,e=e+Math.imul(y,S)|0,f=f+Math.imul(y,T)|0,d=d+Math.imul(u,V)|0,e=e+Math.imul(u,W)|0,e=e+Math.imul(v,V)|0,f=f+Math.imul(v,W)|0,d=d+Math.imul(r,Y)|0,e=e+Math.imul(r,Z)|0,e=e+Math.imul(s,Y)|0,f=f+Math.imul(s,Z)|0,d=d+Math.imul(o,_)|0,e=e+Math.imul(o,aa)|0,e=e+Math.imul(p,_)|0,f=f+Math.imul(p,aa)|0,d=d+Math.imul(l,ca)|0,e=e+Math.imul(l,da)|0,e=e+Math.imul(m,ca)|0,f=f+Math.imul(m,da)|0;var va=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(va>>>26)|0,va&=67108863,d=Math.imul(D,P),e=Math.imul(D,Q),e=e+Math.imul(E,P)|0,f=Math.imul(E,Q),d=d+Math.imul(A,S)|0,e=e+Math.imul(A,T)|0,e=e+Math.imul(B,S)|0,f=f+Math.imul(B,T)|0,d=d+Math.imul(x,V)|0,e=e+Math.imul(x,W)|0,e=e+Math.imul(y,V)|0,f=f+Math.imul(y,W)|0,d=d+Math.imul(u,Y)|0,e=e+Math.imul(u,Z)|0,e=e+Math.imul(v,Y)|0,f=f+Math.imul(v,Z)|0,d=d+Math.imul(r,_)|0,e=e+Math.imul(r,aa)|0,e=e+Math.imul(s,_)|0,f=f+Math.imul(s,aa)|0,d=d+Math.imul(o,ca)|0,e=e+Math.imul(o,da)|0,e=e+Math.imul(p,ca)|0,f=f+Math.imul(p,da)|0,d=d+Math.imul(l,fa)|0,e=e+Math.imul(l,ga)|0,e=e+Math.imul(m,fa)|0,f=f+Math.imul(m,ga)|0;var wa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(wa>>>26)|0,wa&=67108863,d=Math.imul(G,P),e=Math.imul(G,Q),e=e+Math.imul(H,P)|0,f=Math.imul(H,Q),d=d+Math.imul(D,S)|0,e=e+Math.imul(D,T)|0,e=e+Math.imul(E,S)|0,f=f+Math.imul(E,T)|0,d=d+Math.imul(A,V)|0,e=e+Math.imul(A,W)|0,e=e+Math.imul(B,V)|0,f=f+Math.imul(B,W)|0,d=d+Math.imul(x,Y)|0,e=e+Math.imul(x,Z)|0,e=e+Math.imul(y,Y)|0,f=f+Math.imul(y,Z)|0,d=d+Math.imul(u,_)|0,e=e+Math.imul(u,aa)|0,e=e+Math.imul(v,_)|0,f=f+Math.imul(v,aa)|0,d=d+Math.imul(r,ca)|0,e=e+Math.imul(r,da)|0,e=e+Math.imul(s,ca)|0,f=f+Math.imul(s,da)|0,d=d+Math.imul(o,fa)|0,e=e+Math.imul(o,ga)|0,e=e+Math.imul(p,fa)|0,f=f+Math.imul(p,ga)|0,d=d+Math.imul(l,ia)|0,e=e+Math.imul(l,ja)|0,e=e+Math.imul(m,ia)|0,f=f+Math.imul(m,ja)|0;var xa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(xa>>>26)|0,xa&=67108863,d=Math.imul(J,P),e=Math.imul(J,Q),e=e+Math.imul(K,P)|0,f=Math.imul(K,Q),d=d+Math.imul(G,S)|0,e=e+Math.imul(G,T)|0,e=e+Math.imul(H,S)|0,f=f+Math.imul(H,T)|0,d=d+Math.imul(D,V)|0,e=e+Math.imul(D,W)|0,e=e+Math.imul(E,V)|0,f=f+Math.imul(E,W)|0,d=d+Math.imul(A,Y)|0,e=e+Math.imul(A,Z)|0,e=e+Math.imul(B,Y)|0,f=f+Math.imul(B,Z)|0,d=d+Math.imul(x,_)|0,e=e+Math.imul(x,aa)|0,e=e+Math.imul(y,_)|0,f=f+Math.imul(y,aa)|0,d=d+Math.imul(u,ca)|0,e=e+Math.imul(u,da)|0,e=e+Math.imul(v,ca)|0,f=f+Math.imul(v,da)|0,d=d+Math.imul(r,fa)|0,e=e+Math.imul(r,ga)|0,e=e+Math.imul(s,fa)|0,f=f+Math.imul(s,ga)|0,d=d+Math.imul(o,ia)|0,e=e+Math.imul(o,ja)|0,e=e+Math.imul(p,ia)|0,f=f+Math.imul(p,ja)|0,d=d+Math.imul(l,la)|0,e=e+Math.imul(l,ma)|0,e=e+Math.imul(m,la)|0,f=f+Math.imul(m,ma)|0;var ya=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(ya>>>26)|0,ya&=67108863,d=Math.imul(M,P),e=Math.imul(M,Q),e=e+Math.imul(N,P)|0,f=Math.imul(N,Q),d=d+Math.imul(J,S)|0,e=e+Math.imul(J,T)|0,e=e+Math.imul(K,S)|0,f=f+Math.imul(K,T)|0,d=d+Math.imul(G,V)|0,e=e+Math.imul(G,W)|0,e=e+Math.imul(H,V)|0,f=f+Math.imul(H,W)|0,d=d+Math.imul(D,Y)|0,e=e+Math.imul(D,Z)|0,e=e+Math.imul(E,Y)|0,f=f+Math.imul(E,Z)|0,d=d+Math.imul(A,_)|0,e=e+Math.imul(A,aa)|0,e=e+Math.imul(B,_)|0,f=f+Math.imul(B,aa)|0,d=d+Math.imul(x,ca)|0,e=e+Math.imul(x,da)|0,e=e+Math.imul(y,ca)|0,f=f+Math.imul(y,da)|0,d=d+Math.imul(u,fa)|0,e=e+Math.imul(u,ga)|0,e=e+Math.imul(v,fa)|0,f=f+Math.imul(v,ga)|0,d=d+Math.imul(r,ia)|0,e=e+Math.imul(r,ja)|0,e=e+Math.imul(s,ia)|0,f=f+Math.imul(s,ja)|0,d=d+Math.imul(o,la)|0,e=e+Math.imul(o,ma)|0,e=e+Math.imul(p,la)|0,f=f+Math.imul(p,ma)|0,d=d+Math.imul(l,oa)|0,e=e+Math.imul(l,pa)|0,e=e+Math.imul(m,oa)|0,f=f+Math.imul(m,pa)|0;var za=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(za>>>26)|0,za&=67108863,d=Math.imul(M,S),e=Math.imul(M,T),e=e+Math.imul(N,S)|0,f=Math.imul(N,T),d=d+Math.imul(J,V)|0,e=e+Math.imul(J,W)|0,e=e+Math.imul(K,V)|0,f=f+Math.imul(K,W)|0,d=d+Math.imul(G,Y)|0,e=e+Math.imul(G,Z)|0,e=e+Math.imul(H,Y)|0,f=f+Math.imul(H,Z)|0,d=d+Math.imul(D,_)|0,e=e+Math.imul(D,aa)|0,e=e+Math.imul(E,_)|0,f=f+Math.imul(E,aa)|0,d=d+Math.imul(A,ca)|0,e=e+Math.imul(A,da)|0,e=e+Math.imul(B,ca)|0,f=f+Math.imul(B,da)|0,d=d+Math.imul(x,fa)|0,e=e+Math.imul(x,ga)|0,e=e+Math.imul(y,fa)|0,f=f+Math.imul(y,ga)|0,d=d+Math.imul(u,ia)|0,e=e+Math.imul(u,ja)|0,e=e+Math.imul(v,ia)|0,f=f+Math.imul(v,ja)|0,d=d+Math.imul(r,la)|0,e=e+Math.imul(r,ma)|0,e=e+Math.imul(s,la)|0,f=f+Math.imul(s,ma)|0,d=d+Math.imul(o,oa)|0,e=e+Math.imul(o,pa)|0,e=e+Math.imul(p,oa)|0,f=f+Math.imul(p,pa)|0;var Aa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Aa>>>26)|0,Aa&=67108863,d=Math.imul(M,V),e=Math.imul(M,W),e=e+Math.imul(N,V)|0,f=Math.imul(N,W),d=d+Math.imul(J,Y)|0,e=e+Math.imul(J,Z)|0,e=e+Math.imul(K,Y)|0,f=f+Math.imul(K,Z)|0,d=d+Math.imul(G,_)|0,e=e+Math.imul(G,aa)|0,e=e+Math.imul(H,_)|0,f=f+Math.imul(H,aa)|0,d=d+Math.imul(D,ca)|0,e=e+Math.imul(D,da)|0,e=e+Math.imul(E,ca)|0,f=f+Math.imul(E,da)|0,d=d+Math.imul(A,fa)|0,e=e+Math.imul(A,ga)|0,e=e+Math.imul(B,fa)|0,f=f+Math.imul(B,ga)|0,d=d+Math.imul(x,ia)|0,e=e+Math.imul(x,ja)|0,e=e+Math.imul(y,ia)|0,f=f+Math.imul(y,ja)|0,d=d+Math.imul(u,la)|0,e=e+Math.imul(u,ma)|0,e=e+Math.imul(v,la)|0,f=f+Math.imul(v,ma)|0,d=d+Math.imul(r,oa)|0,e=e+Math.imul(r,pa)|0,e=e+Math.imul(s,oa)|0,f=f+Math.imul(s,pa)|0;var Ba=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Ba>>>26)|0,Ba&=67108863,d=Math.imul(M,Y),e=Math.imul(M,Z),e=e+Math.imul(N,Y)|0,f=Math.imul(N,Z),d=d+Math.imul(J,_)|0,e=e+Math.imul(J,aa)|0,e=e+Math.imul(K,_)|0,f=f+Math.imul(K,aa)|0,d=d+Math.imul(G,ca)|0,e=e+Math.imul(G,da)|0,e=e+Math.imul(H,ca)|0,f=f+Math.imul(H,da)|0,d=d+Math.imul(D,fa)|0,e=e+Math.imul(D,ga)|0,e=e+Math.imul(E,fa)|0,f=f+Math.imul(E,ga)|0,d=d+Math.imul(A,ia)|0,e=e+Math.imul(A,ja)|0,e=e+Math.imul(B,ia)|0,f=f+Math.imul(B,ja)|0,d=d+Math.imul(x,la)|0,e=e+Math.imul(x,ma)|0,e=e+Math.imul(y,la)|0,f=f+Math.imul(y,ma)|0,d=d+Math.imul(u,oa)|0,e=e+Math.imul(u,pa)|0,e=e+Math.imul(v,oa)|0,f=f+Math.imul(v,pa)|0;var Ca=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Ca>>>26)|0,Ca&=67108863,d=Math.imul(M,_),e=Math.imul(M,aa),e=e+Math.imul(N,_)|0,f=Math.imul(N,aa),d=d+Math.imul(J,ca)|0,e=e+Math.imul(J,da)|0,e=e+Math.imul(K,ca)|0,f=f+Math.imul(K,da)|0,d=d+Math.imul(G,fa)|0,e=e+Math.imul(G,ga)|0,e=e+Math.imul(H,fa)|0,f=f+Math.imul(H,ga)|0,d=d+Math.imul(D,ia)|0,e=e+Math.imul(D,ja)|0,e=e+Math.imul(E,ia)|0,f=f+Math.imul(E,ja)|0,d=d+Math.imul(A,la)|0,e=e+Math.imul(A,ma)|0,e=e+Math.imul(B,la)|0,f=f+Math.imul(B,ma)|0,d=d+Math.imul(x,oa)|0,e=e+Math.imul(x,pa)|0,e=e+Math.imul(y,oa)|0,f=f+Math.imul(y,pa)|0;var Da=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Da>>>26)|0,Da&=67108863,d=Math.imul(M,ca),e=Math.imul(M,da),e=e+Math.imul(N,ca)|0,f=Math.imul(N,da),d=d+Math.imul(J,fa)|0,e=e+Math.imul(J,ga)|0,e=e+Math.imul(K,fa)|0,f=f+Math.imul(K,ga)|0,d=d+Math.imul(G,ia)|0,e=e+Math.imul(G,ja)|0,e=e+Math.imul(H,ia)|0,f=f+Math.imul(H,ja)|0,d=d+Math.imul(D,la)|0,e=e+Math.imul(D,ma)|0,e=e+Math.imul(E,la)|0,f=f+Math.imul(E,ma)|0,d=d+Math.imul(A,oa)|0,e=e+Math.imul(A,pa)|0,e=e+Math.imul(B,oa)|0,f=f+Math.imul(B,pa)|0;var Ea=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Ea>>>26)|0,Ea&=67108863,d=Math.imul(M,fa),e=Math.imul(M,ga),e=e+Math.imul(N,fa)|0,f=Math.imul(N,ga),d=d+Math.imul(J,ia)|0,e=e+Math.imul(J,ja)|0,e=e+Math.imul(K,ia)|0,f=f+Math.imul(K,ja)|0,d=d+Math.imul(G,la)|0,e=e+Math.imul(G,ma)|0,e=e+Math.imul(H,la)|0,f=f+Math.imul(H,ma)|0,d=d+Math.imul(D,oa)|0,e=e+Math.imul(D,pa)|0,e=e+Math.imul(E,oa)|0,f=f+Math.imul(E,pa)|0;var Fa=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Fa>>>26)|0,Fa&=67108863,d=Math.imul(M,ia),e=Math.imul(M,ja),e=e+Math.imul(N,ia)|0,f=Math.imul(N,ja),d=d+Math.imul(J,la)|0,e=e+Math.imul(J,ma)|0,e=e+Math.imul(K,la)|0,f=f+Math.imul(K,ma)|0,d=d+Math.imul(G,oa)|0,e=e+Math.imul(G,pa)|0,e=e+Math.imul(H,oa)|0,f=f+Math.imul(H,pa)|0;var Ga=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Ga>>>26)|0,Ga&=67108863,d=Math.imul(M,la),e=Math.imul(M,ma),e=e+Math.imul(N,la)|0,f=Math.imul(N,ma),d=d+Math.imul(J,oa)|0,e=e+Math.imul(J,pa)|0,e=e+Math.imul(K,oa)|0,f=f+Math.imul(K,pa)|0;var Ha=(j+d|0)+((8191&e)<<13)|0;j=(f+(e>>>13)|0)+(Ha>>>26)|0,Ha&=67108863,d=Math.imul(M,oa),e=Math.imul(M,pa),e=e+Math.imul(N,oa)|0,f=Math.imul(N,pa);var Ia=(j+d|0)+((8191&e)<<13)|0;return j=(f+(e>>>13)|0)+(Ia>>>26)|0,Ia&=67108863,i[0]=qa,i[1]=ra,i[2]=sa,i[3]=ta,i[4]=ua,i[5]=va,i[6]=wa,i[7]=xa,i[8]=ya,i[9]=za,i[10]=Aa,i[11]=Ba,i[12]=Ca,i[13]=Da,i[14]=Ea,i[15]=Fa,i[16]=Ga,i[17]=Ha,i[18]=Ia,0!==j&&(i[19]=j,c.length++),c};Math.imul||(z=j),f.prototype.mulTo=function(a,b){var c,d=this.length+a.length;return c=10===this.length&&10===a.length?z(this,a,b):d<63?j(this,a,b):d<1024?k(this,a,b):l(this,a,b)},m.prototype.makeRBT=function(a){for(var b=new Array(a),c=f.prototype._countBits(a)-1,d=0;d<a;d++)b[d]=this.revBin(d,c,a);return b},m.prototype.revBin=function(a,b,c){if(0===a||a===c-1)return a;for(var d=0,e=0;e<b;e++)d|=(1&a)<<b-e-1,a>>=1;return d},m.prototype.permute=function(a,b,c,d,e,f){for(var g=0;g<f;g++)d[g]=b[a[g]],e[g]=c[a[g]]},m.prototype.transform=function(a,b,c,d,e,f){this.permute(f,a,b,c,d,e);for(var g=1;g<e;g<<=1)for(var h=g<<1,i=Math.cos(2*Math.PI/h),j=Math.sin(2*Math.PI/h),k=0;k<e;k+=h)for(var l=i,m=j,n=0;n<g;n++){var o=c[k+n],p=d[k+n],q=c[k+n+g],r=d[k+n+g],s=l*q-m*r;r=l*r+m*q,q=s,c[k+n]=o+q,d[k+n]=p+r,c[k+n+g]=o-q,d[k+n+g]=p-r,n!==h&&(s=i*l-j*m,m=i*m+j*l,l=s)}},m.prototype.guessLen13b=function(a,b){var c=1|Math.max(b,a),d=1&c,e=0;for(c=c/2|0;c;c>>>=1)e++;return 1<<e+1+d},m.prototype.conjugate=function(a,b,c){if(!(c<=1))for(var d=0;d<c/2;d++){var e=a[d];a[d]=a[c-d-1],a[c-d-1]=e,e=b[d],b[d]=-b[c-d-1],b[c-d-1]=-e}},m.prototype.normalize13b=function(a,b){for(var c=0,d=0;d<b/2;d++){var e=8192*Math.round(a[2*d+1]/b)+Math.round(a[2*d]/b)+c;a[d]=67108863&e,c=e<67108864?0:e/67108864|0}return a},m.prototype.convert13b=function(a,b,c,e){for(var f=0,g=0;g<b;g++)f+=0|a[g],c[2*g]=8191&f,
    f>>>=13,c[2*g+1]=8191&f,f>>>=13;for(g=2*b;g<e;++g)c[g]=0;d(0===f),d(0===(f&-8192))},m.prototype.stub=function(a){for(var b=new Array(a),c=0;c<a;c++)b[c]=0;return b},m.prototype.mulp=function(a,b,c){var d=2*this.guessLen13b(a.length,b.length),e=this.makeRBT(d),f=this.stub(d),g=new Array(d),h=new Array(d),i=new Array(d),j=new Array(d),k=new Array(d),l=new Array(d),m=c.words;m.length=d,this.convert13b(a.words,a.length,g,d),this.convert13b(b.words,b.length,j,d),this.transform(g,f,h,i,d,e),this.transform(j,f,k,l,d,e);for(var n=0;n<d;n++){var o=h[n]*k[n]-i[n]*l[n];i[n]=h[n]*l[n]+i[n]*k[n],h[n]=o}return this.conjugate(h,i,d),this.transform(h,i,m,f,d,e),this.conjugate(m,f,d),this.normalize13b(m,d),c.negative=a.negative^b.negative,c.length=a.length+b.length,c.strip()},f.prototype.mul=function(a){var b=new f(null);return b.words=new Array(this.length+a.length),this.mulTo(a,b)},f.prototype.mulf=function(a){var b=new f(null);return b.words=new Array(this.length+a.length),l(this,a,b)},f.prototype.imul=function(a){return this.clone().mulTo(a,this)},f.prototype.imuln=function(a){d("number"==typeof a),d(a<67108864);for(var b=0,c=0;c<this.length;c++){var e=(0|this.words[c])*a,f=(67108863&e)+(67108863&b);b>>=26,b+=e/67108864|0,b+=f>>>26,this.words[c]=67108863&f}return 0!==b&&(this.words[c]=b,this.length++),this},f.prototype.muln=function(a){return this.clone().imuln(a)},f.prototype.sqr=function(){return this.mul(this)},f.prototype.isqr=function(){return this.imul(this.clone())},f.prototype.pow=function(a){var b=i(a);if(0===b.length)return new f(1);for(var c=this,d=0;d<b.length&&0===b[d];d++,c=c.sqr());if(++d<b.length)for(var e=c.sqr();d<b.length;d++,e=e.sqr())0!==b[d]&&(c=c.mul(e));return c},f.prototype.iushln=function(a){d("number"==typeof a&&a>=0);var b,c=a%26,e=(a-c)/26,f=67108863>>>26-c<<26-c;if(0!==c){var g=0;for(b=0;b<this.length;b++){var h=this.words[b]&f,i=(0|this.words[b])-h<<c;this.words[b]=i|g,g=h>>>26-c}g&&(this.words[b]=g,this.length++)}if(0!==e){for(b=this.length-1;b>=0;b--)this.words[b+e]=this.words[b];for(b=0;b<e;b++)this.words[b]=0;this.length+=e}return this.strip()},f.prototype.ishln=function(a){return d(0===this.negative),this.iushln(a)},f.prototype.iushrn=function(a,b,c){d("number"==typeof a&&a>=0);var e;e=b?(b-b%26)/26:0;var f=a%26,g=Math.min((a-f)/26,this.length),h=67108863^67108863>>>f<<f,i=c;if(e-=g,e=Math.max(0,e),i){for(var j=0;j<g;j++)i.words[j]=this.words[j];i.length=g}if(0===g);else if(this.length>g)for(this.length-=g,j=0;j<this.length;j++)this.words[j]=this.words[j+g];else this.words[0]=0,this.length=1;var k=0;for(j=this.length-1;j>=0&&(0!==k||j>=e);j--){var l=0|this.words[j];this.words[j]=k<<26-f|l>>>f,k=l&h}return i&&0!==k&&(i.words[i.length++]=k),0===this.length&&(this.words[0]=0,this.length=1),this.strip()},f.prototype.ishrn=function(a,b,c){return d(0===this.negative),this.iushrn(a,b,c)},f.prototype.shln=function(a){return this.clone().ishln(a)},f.prototype.ushln=function(a){return this.clone().iushln(a)},f.prototype.shrn=function(a){return this.clone().ishrn(a)},f.prototype.ushrn=function(a){return this.clone().iushrn(a)},f.prototype.testn=function(a){d("number"==typeof a&&a>=0);var b=a%26,c=(a-b)/26,e=1<<b;if(this.length<=c)return!1;var f=this.words[c];return!!(f&e)},f.prototype.imaskn=function(a){d("number"==typeof a&&a>=0);var b=a%26,c=(a-b)/26;if(d(0===this.negative,"imaskn works only with positive numbers"),this.length<=c)return this;if(0!==b&&c++,this.length=Math.min(c,this.length),0!==b){var e=67108863^67108863>>>b<<b;this.words[this.length-1]&=e}return this.strip()},f.prototype.maskn=function(a){return this.clone().imaskn(a)},f.prototype.iaddn=function(a){return d("number"==typeof a),d(a<67108864),a<0?this.isubn(-a):0!==this.negative?1===this.length&&(0|this.words[0])<a?(this.words[0]=a-(0|this.words[0]),this.negative=0,this):(this.negative=0,this.isubn(a),this.negative=1,this):this._iaddn(a)},f.prototype._iaddn=function(a){this.words[0]+=a;for(var b=0;b<this.length&&this.words[b]>=67108864;b++)this.words[b]-=67108864,b===this.length-1?this.words[b+1]=1:this.words[b+1]++;return this.length=Math.max(this.length,b+1),this},f.prototype.isubn=function(a){if(d("number"==typeof a),d(a<67108864),a<0)return this.iaddn(-a);if(0!==this.negative)return this.negative=0,this.iaddn(a),this.negative=1,this;if(this.words[0]-=a,1===this.length&&this.words[0]<0)this.words[0]=-this.words[0],this.negative=1;else for(var b=0;b<this.length&&this.words[b]<0;b++)this.words[b]+=67108864,this.words[b+1]-=1;return this.strip()},f.prototype.addn=function(a){return this.clone().iaddn(a)},f.prototype.subn=function(a){return this.clone().isubn(a)},f.prototype.iabs=function(){return this.negative=0,this},f.prototype.abs=function(){return this.clone().iabs()},f.prototype._ishlnsubmul=function(a,b,c){var e,f=a.length+c;this._expand(f);var g,h=0;for(e=0;e<a.length;e++){g=(0|this.words[e+c])+h;var i=(0|a.words[e])*b;g-=67108863&i,h=(g>>26)-(i/67108864|0),this.words[e+c]=67108863&g}for(;e<this.length-c;e++)g=(0|this.words[e+c])+h,h=g>>26,this.words[e+c]=67108863&g;if(0===h)return this.strip();for(d(h===-1),h=0,e=0;e<this.length;e++)g=-(0|this.words[e])+h,h=g>>26,this.words[e]=67108863&g;return this.negative=1,this.strip()},f.prototype._wordDiv=function(a,b){var c=this.length-a.length,d=this.clone(),e=a,g=0|e.words[e.length-1],h=this._countBits(g);c=26-h,0!==c&&(e=e.ushln(c),d.iushln(c),g=0|e.words[e.length-1]);var i,j=d.length-e.length;if("mod"!==b){i=new f(null),i.length=j+1,i.words=new Array(i.length);for(var k=0;k<i.length;k++)i.words[k]=0}var l=d.clone()._ishlnsubmul(e,1,j);0===l.negative&&(d=l,i&&(i.words[j]=1));for(var m=j-1;m>=0;m--){var n=67108864*(0|d.words[e.length+m])+(0|d.words[e.length+m-1]);for(n=Math.min(n/g|0,67108863),d._ishlnsubmul(e,n,m);0!==d.negative;)n--,d.negative=0,d._ishlnsubmul(e,1,m),d.isZero()||(d.negative^=1);i&&(i.words[m]=n)}return i&&i.strip(),d.strip(),"div"!==b&&0!==c&&d.iushrn(c),{div:i||null,mod:d}},f.prototype.divmod=function(a,b,c){if(d(!a.isZero()),this.isZero())return{div:new f(0),mod:new f(0)};var e,g,h;return 0!==this.negative&&0===a.negative?(h=this.neg().divmod(a,b),"mod"!==b&&(e=h.div.neg()),"div"!==b&&(g=h.mod.neg(),c&&0!==g.negative&&g.iadd(a)),{div:e,mod:g}):0===this.negative&&0!==a.negative?(h=this.divmod(a.neg(),b),"mod"!==b&&(e=h.div.neg()),{div:e,mod:h.mod}):0!==(this.negative&a.negative)?(h=this.neg().divmod(a.neg(),b),"div"!==b&&(g=h.mod.neg(),c&&0!==g.negative&&g.isub(a)),{div:h.div,mod:g}):a.length>this.length||this.cmp(a)<0?{div:new f(0),mod:this}:1===a.length?"div"===b?{div:this.divn(a.words[0]),mod:null}:"mod"===b?{div:null,mod:new f(this.modn(a.words[0]))}:{div:this.divn(a.words[0]),mod:new f(this.modn(a.words[0]))}:this._wordDiv(a,b)},f.prototype.div=function(a){return this.divmod(a,"div",!1).div},f.prototype.mod=function(a){return this.divmod(a,"mod",!1).mod},f.prototype.umod=function(a){return this.divmod(a,"mod",!0).mod},f.prototype.divRound=function(a){var b=this.divmod(a);if(b.mod.isZero())return b.div;var c=0!==b.div.negative?b.mod.isub(a):b.mod,d=a.ushrn(1),e=a.andln(1),f=c.cmp(d);return f<0||1===e&&0===f?b.div:0!==b.div.negative?b.div.isubn(1):b.div.iaddn(1)},f.prototype.modn=function(a){d(a<=67108863);for(var b=(1<<26)%a,c=0,e=this.length-1;e>=0;e--)c=(b*c+(0|this.words[e]))%a;return c},f.prototype.idivn=function(a){d(a<=67108863);for(var b=0,c=this.length-1;c>=0;c--){var e=(0|this.words[c])+67108864*b;this.words[c]=e/a|0,b=e%a}return this.strip()},f.prototype.divn=function(a){return this.clone().idivn(a)},f.prototype.egcd=function(a){d(0===a.negative),d(!a.isZero());var b=this,c=a.clone();b=0!==b.negative?b.umod(a):b.clone();for(var e=new f(1),g=new f(0),h=new f(0),i=new f(1),j=0;b.isEven()&&c.isEven();)b.iushrn(1),c.iushrn(1),++j;for(var k=c.clone(),l=b.clone();!b.isZero();){for(var m=0,n=1;0===(b.words[0]&n)&&m<26;++m,n<<=1);if(m>0)for(b.iushrn(m);m-- >0;)(e.isOdd()||g.isOdd())&&(e.iadd(k),g.isub(l)),e.iushrn(1),g.iushrn(1);for(var o=0,p=1;0===(c.words[0]&p)&&o<26;++o,p<<=1);if(o>0)for(c.iushrn(o);o-- >0;)(h.isOdd()||i.isOdd())&&(h.iadd(k),i.isub(l)),h.iushrn(1),i.iushrn(1);b.cmp(c)>=0?(b.isub(c),e.isub(h),g.isub(i)):(c.isub(b),h.isub(e),i.isub(g))}return{a:h,b:i,gcd:c.iushln(j)}},f.prototype._invmp=function(a){d(0===a.negative),d(!a.isZero());var b=this,c=a.clone();b=0!==b.negative?b.umod(a):b.clone();for(var e=new f(1),g=new f(0),h=c.clone();b.cmpn(1)>0&&c.cmpn(1)>0;){for(var i=0,j=1;0===(b.words[0]&j)&&i<26;++i,j<<=1);if(i>0)for(b.iushrn(i);i-- >0;)e.isOdd()&&e.iadd(h),e.iushrn(1);for(var k=0,l=1;0===(c.words[0]&l)&&k<26;++k,l<<=1);if(k>0)for(c.iushrn(k);k-- >0;)g.isOdd()&&g.iadd(h),g.iushrn(1);b.cmp(c)>=0?(b.isub(c),e.isub(g)):(c.isub(b),g.isub(e))}var m;return m=0===b.cmpn(1)?e:g,m.cmpn(0)<0&&m.iadd(a),m},f.prototype.gcd=function(a){if(this.isZero())return a.abs();if(a.isZero())return this.abs();var b=this.clone(),c=a.clone();b.negative=0,c.negative=0;for(var d=0;b.isEven()&&c.isEven();d++)b.iushrn(1),c.iushrn(1);for(;;){for(;b.isEven();)b.iushrn(1);for(;c.isEven();)c.iushrn(1);var e=b.cmp(c);if(e<0){var f=b;b=c,c=f}else if(0===e||0===c.cmpn(1))break;b.isub(c)}return c.iushln(d)},f.prototype.invm=function(a){return this.egcd(a).a.umod(a)},f.prototype.isEven=function(){return 0===(1&this.words[0])},f.prototype.isOdd=function(){return 1===(1&this.words[0])},f.prototype.andln=function(a){return this.words[0]&a},f.prototype.bincn=function(a){d("number"==typeof a);var b=a%26,c=(a-b)/26,e=1<<b;if(this.length<=c)return this._expand(c+1),this.words[c]|=e,this;for(var f=e,g=c;0!==f&&g<this.length;g++){var h=0|this.words[g];h+=f,f=h>>>26,h&=67108863,this.words[g]=h}return 0!==f&&(this.words[g]=f,this.length++),this},f.prototype.isZero=function(){return 1===this.length&&0===this.words[0]},f.prototype.cmpn=function(a){var b=a<0;if(0!==this.negative&&!b)return-1;if(0===this.negative&&b)return 1;this.strip();var c;if(this.length>1)c=1;else{b&&(a=-a),d(a<=67108863,"Number is too big");var e=0|this.words[0];c=e===a?0:e<a?-1:1}return 0!==this.negative?0|-c:c},f.prototype.cmp=function(a){if(0!==this.negative&&0===a.negative)return-1;if(0===this.negative&&0!==a.negative)return 1;var b=this.ucmp(a);return 0!==this.negative?0|-b:b},f.prototype.ucmp=function(a){if(this.length>a.length)return 1;if(this.length<a.length)return-1;for(var b=0,c=this.length-1;c>=0;c--){var d=0|this.words[c],e=0|a.words[c];if(d!==e){d<e?b=-1:d>e&&(b=1);break}}return b},f.prototype.gtn=function(a){return 1===this.cmpn(a)},f.prototype.gt=function(a){return 1===this.cmp(a)},f.prototype.gten=function(a){return this.cmpn(a)>=0},f.prototype.gte=function(a){return this.cmp(a)>=0},f.prototype.ltn=function(a){return this.cmpn(a)===-1},f.prototype.lt=function(a){return this.cmp(a)===-1},f.prototype.lten=function(a){return this.cmpn(a)<=0},f.prototype.lte=function(a){return this.cmp(a)<=0},f.prototype.eqn=function(a){return 0===this.cmpn(a)},f.prototype.eq=function(a){return 0===this.cmp(a)},f.red=function(a){return new s(a)},f.prototype.toRed=function(a){return d(!this.red,"Already a number in reduction context"),d(0===this.negative,"red works only with positives"),a.convertTo(this)._forceRed(a)},f.prototype.fromRed=function(){return d(this.red,"fromRed works only with numbers in reduction context"),this.red.convertFrom(this)},f.prototype._forceRed=function(a){return this.red=a,this},f.prototype.forceRed=function(a){return d(!this.red,"Already a number in reduction context"),this._forceRed(a)},f.prototype.redAdd=function(a){return d(this.red,"redAdd works only with red numbers"),this.red.add(this,a)},f.prototype.redIAdd=function(a){return d(this.red,"redIAdd works only with red numbers"),this.red.iadd(this,a)},f.prototype.redSub=function(a){return d(this.red,"redSub works only with red numbers"),this.red.sub(this,a)},f.prototype.redISub=function(a){return d(this.red,"redISub works only with red numbers"),this.red.isub(this,a)},f.prototype.redShl=function(a){return d(this.red,"redShl works only with red numbers"),this.red.shl(this,a)},f.prototype.redMul=function(a){return d(this.red,"redMul works only with red numbers"),this.red._verify2(this,a),this.red.mul(this,a)},f.prototype.redIMul=function(a){return d(this.red,"redMul works only with red numbers"),this.red._verify2(this,a),this.red.imul(this,a)},f.prototype.redSqr=function(){return d(this.red,"redSqr works only with red numbers"),this.red._verify1(this),this.red.sqr(this)},f.prototype.redISqr=function(){return d(this.red,"redISqr works only with red numbers"),this.red._verify1(this),this.red.isqr(this)},f.prototype.redSqrt=function(){return d(this.red,"redSqrt works only with red numbers"),this.red._verify1(this),this.red.sqrt(this)},f.prototype.redInvm=function(){return d(this.red,"redInvm works only with red numbers"),this.red._verify1(this),this.red.invm(this)},f.prototype.redNeg=function(){return d(this.red,"redNeg works only with red numbers"),this.red._verify1(this),this.red.neg(this)},f.prototype.redPow=function(a){return d(this.red&&!a.red,"redPow(normalNum)"),this.red._verify1(this),this.red.pow(this,a)};var A={k256:null,p224:null,p192:null,p25519:null};n.prototype._tmp=function(){var a=new f(null);return a.words=new Array(Math.ceil(this.n/13)),a},n.prototype.ireduce=function(a){var b,c=a;do this.split(c,this.tmp),c=this.imulK(c),c=c.iadd(this.tmp),b=c.bitLength();while(b>this.n);var d=b<this.n?-1:c.ucmp(this.p);return 0===d?(c.words[0]=0,c.length=1):d>0?c.isub(this.p):c.strip(),c},n.prototype.split=function(a,b){a.iushrn(this.n,0,b)},n.prototype.imulK=function(a){return a.imul(this.k)},e(o,n),o.prototype.split=function(a,b){for(var c=4194303,d=Math.min(a.length,9),e=0;e<d;e++)b.words[e]=a.words[e];if(b.length=d,a.length<=9)return a.words[0]=0,void(a.length=1);var f=a.words[9];for(b.words[b.length++]=f&c,e=10;e<a.length;e++){var g=0|a.words[e];a.words[e-10]=(g&c)<<4|f>>>22,f=g}f>>>=22,a.words[e-10]=f,0===f&&a.length>10?a.length-=10:a.length-=9},o.prototype.imulK=function(a){a.words[a.length]=0,a.words[a.length+1]=0,a.length+=2;for(var b=0,c=0;c<a.length;c++){var d=0|a.words[c];b+=977*d,a.words[c]=67108863&b,b=64*d+(b/67108864|0)}return 0===a.words[a.length-1]&&(a.length--,0===a.words[a.length-1]&&a.length--),a},e(p,n),e(q,n),e(r,n),r.prototype.imulK=function(a){for(var b=0,c=0;c<a.length;c++){var d=19*(0|a.words[c])+b,e=67108863&d;d>>>=26,a.words[c]=e,b=d}return 0!==b&&(a.words[a.length++]=b),a},f._prime=function B(a){if(A[a])return A[a];var B;if("k256"===a)B=new o;else if("p224"===a)B=new p;else if("p192"===a)B=new q;else{if("p25519"!==a)throw new Error("Unknown prime "+a);B=new r}return A[a]=B,B},s.prototype._verify1=function(a){d(0===a.negative,"red works only with positives"),d(a.red,"red works only with red numbers")},s.prototype._verify2=function(a,b){d(0===(a.negative|b.negative),"red works only with positives"),d(a.red&&a.red===b.red,"red works only with red numbers")},s.prototype.imod=function(a){return this.prime?this.prime.ireduce(a)._forceRed(this):a.umod(this.m)._forceRed(this)},s.prototype.neg=function(a){return a.isZero()?a.clone():this.m.sub(a)._forceRed(this)},s.prototype.add=function(a,b){this._verify2(a,b);var c=a.add(b);return c.cmp(this.m)>=0&&c.isub(this.m),c._forceRed(this)},s.prototype.iadd=function(a,b){this._verify2(a,b);var c=a.iadd(b);return c.cmp(this.m)>=0&&c.isub(this.m),c},s.prototype.sub=function(a,b){this._verify2(a,b);var c=a.sub(b);return c.cmpn(0)<0&&c.iadd(this.m),c._forceRed(this)},s.prototype.isub=function(a,b){this._verify2(a,b);var c=a.isub(b);return c.cmpn(0)<0&&c.iadd(this.m),c},s.prototype.shl=function(a,b){return this._verify1(a),this.imod(a.ushln(b))},s.prototype.imul=function(a,b){return this._verify2(a,b),this.imod(a.imul(b))},s.prototype.mul=function(a,b){return this._verify2(a,b),this.imod(a.mul(b))},s.prototype.isqr=function(a){return this.imul(a,a.clone())},s.prototype.sqr=function(a){return this.mul(a,a)},s.prototype.sqrt=function(a){if(a.isZero())return a.clone();var b=this.m.andln(3);if(d(b%2===1),3===b){var c=this.m.add(new f(1)).iushrn(2);return this.pow(a,c)}for(var e=this.m.subn(1),g=0;!e.isZero()&&0===e.andln(1);)g++,e.iushrn(1);d(!e.isZero());var h=new f(1).toRed(this),i=h.redNeg(),j=this.m.subn(1).iushrn(1),k=this.m.bitLength();for(k=new f(2*k*k).toRed(this);0!==this.pow(k,j).cmp(i);)k.redIAdd(i);for(var l=this.pow(k,e),m=this.pow(a,e.addn(1).iushrn(1)),n=this.pow(a,e),o=g;0!==n.cmp(h);){for(var p=n,q=0;0!==p.cmp(h);q++)p=p.redSqr();d(q<o);var r=this.pow(l,new f(1).iushln(o-q-1));m=m.redMul(r),l=r.redSqr(),n=n.redMul(l),o=q}return m},s.prototype.invm=function(a){var b=a._invmp(this.m);return 0!==b.negative?(b.negative=0,this.imod(b).redNeg()):this.imod(b)},s.prototype.pow=function(a,b){if(b.isZero())return new f(1).toRed(this);if(0===b.cmpn(1))return a.clone();var c=4,d=new Array(1<<c);d[0]=new f(1).toRed(this),d[1]=a;for(var e=2;e<d.length;e++)d[e]=this.mul(d[e-1],a);var g=d[0],h=0,i=0,j=b.bitLength()%26;for(0===j&&(j=26),e=b.length-1;e>=0;e--){for(var k=b.words[e],l=j-1;l>=0;l--){var m=k>>l&1;g!==d[0]&&(g=this.sqr(g)),0!==m||0!==h?(h<<=1,h|=m,i++,(i===c||0===e&&0===l)&&(g=this.mul(g,d[h]),i=0,h=0)):i=0}j=26}return g},s.prototype.convertTo=function(a){var b=a.umod(this.m);return b===a?b.clone():b},s.prototype.convertFrom=function(a){var b=a.clone();return b.red=null,b},f.mont=function(a){return new t(a)},e(t,s),t.prototype.convertTo=function(a){return this.imod(a.ushln(this.shift))},t.prototype.convertFrom=function(a){var b=this.imod(a.mul(this.rinv));return b.red=null,b},t.prototype.imul=function(a,b){if(a.isZero()||b.isZero())return a.words[0]=0,a.length=1,a;var c=a.imul(b),d=c.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),e=c.isub(d).iushrn(this.shift),f=e;return e.cmp(this.m)>=0?f=e.isub(this.m):e.cmpn(0)<0&&(f=e.iadd(this.m)),f._forceRed(this)},t.prototype.mul=function(a,b){if(a.isZero()||b.isZero())return new f(0)._forceRed(this);var c=a.mul(b),d=c.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m),e=c.isub(d).iushrn(this.shift),g=e;return e.cmp(this.m)>=0?g=e.isub(this.m):e.cmpn(0)<0&&(g=e.iadd(this.m)),g._forceRed(this)},t.prototype.invm=function(a){var b=this.imod(a._invmp(this.m).mul(this.r2));return b._forceRed(this)}}("undefined"==typeof b||b,this)},{buffer:8}],7:[function(a,b,c){var d=a("../../utils").randomBytes;b.exports=function(a){return d(a)}},{"../../utils":66}],8:[function(a,b,c){},{}],9:[function(a,b,c){"use strict";var d=c;d.version=a("../package.json").version,d.utils=a("./elliptic/utils"),d.rand=a("brorand"),d.hmacDRBG=a("./elliptic/hmac-drbg"),d.curve=a("./elliptic/curve"),d.curves=a("./elliptic/curves"),d.ec=a("./elliptic/ec"),d.eddsa=a("./elliptic/eddsa")},{"../package.json":23,"./elliptic/curve":12,"./elliptic/curves":15,"./elliptic/ec":16,"./elliptic/eddsa":19,"./elliptic/hmac-drbg":20,"./elliptic/utils":22,brorand:7}],10:[function(a,b,c){"use strict";function d(a,b){this.type=a,this.p=new f(b.p,16),this.red=b.prime?f.red(b.prime):f.mont(this.p),this.zero=new f(0).toRed(this.red),this.one=new f(1).toRed(this.red),this.two=new f(2).toRed(this.red),this.n=b.n&&new f(b.n,16),this.g=b.g&&this.pointFromJSON(b.g,b.gRed),this._wnafT1=new Array(4),this._wnafT2=new Array(4),this._wnafT3=new Array(4),this._wnafT4=new Array(4);var c=this.n&&this.p.div(this.n);!c||c.cmpn(100)>0?this.redN=null:(this._maxwellTrick=!0,this.redN=this.n.toRed(this.red))}function e(a,b){this.curve=a,this.type=b,this.precomputed=null}var f=a("bn.js"),g=a("../../elliptic"),h=g.utils,i=h.getNAF,j=h.getJSF,k=h.assert;b.exports=d,d.prototype.point=function(){throw new Error("Not implemented")},d.prototype.validate=function(){throw new Error("Not implemented")},d.prototype._fixedNafMul=function(a,b){k(a.precomputed);var c=a._getDoubles(),d=i(b,1),e=(1<<c.step+1)-(c.step%2===0?2:1);e/=3;for(var f=[],g=0;g<d.length;g+=c.step){for(var h=0,b=g+c.step-1;b>=g;b--)h=(h<<1)+d[b];f.push(h)}for(var j=this.jpoint(null,null,null),l=this.jpoint(null,null,null),m=e;m>0;m--){for(var g=0;g<f.length;g++){var h=f[g];h===m?l=l.mixedAdd(c.points[g]):h===-m&&(l=l.mixedAdd(c.points[g].neg()))}j=j.add(l)}return j.toP()},d.prototype._wnafMul=function(a,b){var c=4,d=a._getNAFPoints(c);c=d.wnd;for(var e=d.points,f=i(b,c),g=this.jpoint(null,null,null),h=f.length-1;h>=0;h--){for(var b=0;h>=0&&0===f[h];h--)b++;if(h>=0&&b++,g=g.dblp(b),h<0)break;var j=f[h];k(0!==j),g="affine"===a.type?j>0?g.mixedAdd(e[j-1>>1]):g.mixedAdd(e[-j-1>>1].neg()):j>0?g.add(e[j-1>>1]):g.add(e[-j-1>>1].neg())}return"affine"===a.type?g.toP():g},d.prototype._wnafMulAdd=function(a,b,c,d,e){for(var f=this._wnafT1,g=this._wnafT2,h=this._wnafT3,k=0,l=0;l<d;l++){var m=b[l],n=m._getNAFPoints(a);f[l]=n.wnd,g[l]=n.points}for(var l=d-1;l>=1;l-=2){var o=l-1,p=l;if(1===f[o]&&1===f[p]){var q=[b[o],null,null,b[p]];0===b[o].y.cmp(b[p].y)?(q[1]=b[o].add(b[p]),q[2]=b[o].toJ().mixedAdd(b[p].neg())):0===b[o].y.cmp(b[p].y.redNeg())?(q[1]=b[o].toJ().mixedAdd(b[p]),q[2]=b[o].add(b[p].neg())):(q[1]=b[o].toJ().mixedAdd(b[p]),q[2]=b[o].toJ().mixedAdd(b[p].neg()));var r=[-3,-1,-5,-7,0,7,5,1,3],s=j(c[o],c[p]);k=Math.max(s[0].length,k),h[o]=new Array(k),h[p]=new Array(k);for(var t=0;t<k;t++){var u=0|s[0][t],v=0|s[1][t];h[o][t]=r[3*(u+1)+(v+1)],h[p][t]=0,g[o]=q}}else h[o]=i(c[o],f[o]),h[p]=i(c[p],f[p]),k=Math.max(h[o].length,k),k=Math.max(h[p].length,k)}for(var w=this.jpoint(null,null,null),x=this._wnafT4,l=k;l>=0;l--){for(var y=0;l>=0;){for(var z=!0,t=0;t<d;t++)x[t]=0|h[t][l],0!==x[t]&&(z=!1);if(!z)break;y++,l--}if(l>=0&&y++,w=w.dblp(y),l<0)break;for(var t=0;t<d;t++){var m,A=x[t];0!==A&&(A>0?m=g[t][A-1>>1]:A<0&&(m=g[t][-A-1>>1].neg()),w="affine"===m.type?w.mixedAdd(m):w.add(m))}}for(var l=0;l<d;l++)g[l]=null;return e?w:w.toP()},d.BasePoint=e,e.prototype.eq=function(){throw new Error("Not implemented")},e.prototype.validate=function(){return this.curve.validate(this)},d.prototype.decodePoint=function(a,b){a=h.toArray(a,b);var c=this.p.byteLength();if((4===a[0]||6===a[0]||7===a[0])&&a.length-1===2*c){6===a[0]?k(a[a.length-1]%2===0):7===a[0]&&k(a[a.length-1]%2===1);var d=this.point(a.slice(1,1+c),a.slice(1+c,1+2*c));return d}if((2===a[0]||3===a[0])&&a.length-1===c)return this.pointFromX(a.slice(1,1+c),3===a[0]);throw new Error("Unknown point format")},e.prototype.encodeCompressed=function(a){return this.encode(a,!0)},e.prototype._encode=function(a){var b=this.curve.p.byteLength(),c=this.getX().toArray("be",b);return a?[this.getY().isEven()?2:3].concat(c):[4].concat(c,this.getY().toArray("be",b))},e.prototype.encode=function(a,b){return h.encode(this._encode(b),a)},e.prototype.precompute=function(a){if(this.precomputed)return this;var b={doubles:null,naf:null,beta:null};return b.naf=this._getNAFPoints(8),b.doubles=this._getDoubles(4,a),b.beta=this._getBeta(),this.precomputed=b,this},e.prototype._hasDoubles=function(a){if(!this.precomputed)return!1;var b=this.precomputed.doubles;return!!b&&b.points.length>=Math.ceil((a.bitLength()+1)/b.step)},e.prototype._getDoubles=function(a,b){if(this.precomputed&&this.precomputed.doubles)return this.precomputed.doubles;for(var c=[this],d=this,e=0;e<b;e+=a){for(var f=0;f<a;f++)d=d.dbl();c.push(d)}return{step:a,points:c}},e.prototype._getNAFPoints=function(a){if(this.precomputed&&this.precomputed.naf)return this.precomputed.naf;for(var b=[this],c=(1<<a)-1,d=1===c?null:this.dbl(),e=1;e<c;e++)b[e]=b[e-1].add(d);return{wnd:a,points:b}},e.prototype._getBeta=function(){return null},e.prototype.dblp=function(a){for(var b=this,c=0;c<a;c++)b=b.dbl();return b}},{"../../elliptic":9,"bn.js":6}],11:[function(a,b,c){b.exports={}},{}],12:[function(a,b,c){"use strict";var d=c;d.base=a("./base"),d["short"]=a("./short"),d.mont=a("./mont"),d.edwards=a("./edwards")},{"./base":10,"./edwards":11,"./mont":13,"./short":14}],13:[function(a,b,c){arguments[4][11][0].apply(c,arguments)},{dup:11}],14:[function(a,b,c){"use strict";function d(a){k.call(this,"short",a),this.a=new i(a.a,16).toRed(this.red),this.b=new i(a.b,16).toRed(this.red),this.tinv=this.two.redInvm(),this.zeroA=0===this.a.fromRed().cmpn(0),this.threeA=0===this.a.fromRed().sub(this.p).cmpn(-3),this.endo=this._getEndomorphism(a),this._endoWnafT1=new Array(4),this._endoWnafT2=new Array(4)}function e(a,b,c,d){k.BasePoint.call(this,a,"affine"),null===b&&null===c?(this.x=null,this.y=null,this.inf=!0):(this.x=new i(b,16),this.y=new i(c,16),d&&(this.x.forceRed(this.curve.red),this.y.forceRed(this.curve.red)),this.x.red||(this.x=this.x.toRed(this.curve.red)),this.y.red||(this.y=this.y.toRed(this.curve.red)),this.inf=!1)}function f(a,b,c,d){k.BasePoint.call(this,a,"jacobian"),null===b&&null===c&&null===d?(this.x=this.curve.one,this.y=this.curve.one,this.z=new i(0)):(this.x=new i(b,16),this.y=new i(c,16),this.z=new i(d,16)),this.x.red||(this.x=this.x.toRed(this.curve.red)),this.y.red||(this.y=this.y.toRed(this.curve.red)),this.z.red||(this.z=this.z.toRed(this.curve.red)),this.zOne=this.z===this.curve.one}var g=a("../curve"),h=a("../../elliptic"),i=a("bn.js"),j=a("inherits"),k=g.base,l=h.utils.assert;j(d,k),b.exports=d,d.prototype._getEndomorphism=function(a){if(this.zeroA&&this.g&&this.n&&1===this.p.modn(3)){var b,c;if(a.beta)b=new i(a.beta,16).toRed(this.red);else{var d=this._getEndoRoots(this.p);b=d[0].cmp(d[1])<0?d[0]:d[1],b=b.toRed(this.red)}if(a.lambda)c=new i(a.lambda,16);else{var e=this._getEndoRoots(this.n);0===this.g.mul(e[0]).x.cmp(this.g.x.redMul(b))?c=e[0]:(c=e[1],l(0===this.g.mul(c).x.cmp(this.g.x.redMul(b))))}var f;return f=a.basis?a.basis.map(function(a){return{a:new i(a.a,16),b:new i(a.b,16)}}):this._getEndoBasis(c),{beta:b,lambda:c,basis:f}}},d.prototype._getEndoRoots=function(a){var b=a===this.p?this.red:i.mont(a),c=new i(2).toRed(b).redInvm(),d=c.redNeg(),e=new i(3).toRed(b).redNeg().redSqrt().redMul(c),f=d.redAdd(e).fromRed(),g=d.redSub(e).fromRed();return[f,g]},d.prototype._getEndoBasis=function(a){for(var b,c,d,e,f,g,h,j,k,l=this.n.ushrn(Math.floor(this.n.bitLength()/2)),m=a,n=this.n.clone(),o=new i(1),p=new i(0),q=new i(0),r=new i(1),s=0;0!==m.cmpn(0);){var t=n.div(m);j=n.sub(t.mul(m)),k=q.sub(t.mul(o));var u=r.sub(t.mul(p));if(!d&&j.cmp(l)<0)b=h.neg(),c=o,d=j.neg(),e=k;else if(d&&2===++s)break;h=j,n=m,m=j,q=o,o=k,r=p,p=u}f=j.neg(),g=k;var v=d.sqr().add(e.sqr()),w=f.sqr().add(g.sqr());return w.cmp(v)>=0&&(f=b,g=c),d.negative&&(d=d.neg(),e=e.neg()),f.negative&&(f=f.neg(),g=g.neg()),[{a:d,b:e},{a:f,b:g}]},d.prototype._endoSplit=function(a){var b=this.endo.basis,c=b[0],d=b[1],e=d.b.mul(a).divRound(this.n),f=c.b.neg().mul(a).divRound(this.n),g=e.mul(c.a),h=f.mul(d.a),i=e.mul(c.b),j=f.mul(d.b),k=a.sub(g).sub(h),l=i.add(j).neg();return{k1:k,k2:l}},d.prototype.pointFromX=function(a,b){a=new i(a,16),a.red||(a=a.toRed(this.red));var c=a.redSqr().redMul(a).redIAdd(a.redMul(this.a)).redIAdd(this.b),d=c.redSqrt();if(0!==d.redSqr().redSub(c).cmp(this.zero))throw new Error("invalid point");var e=d.fromRed().isOdd();return(b&&!e||!b&&e)&&(d=d.redNeg()),this.point(a,d)},d.prototype.validate=function(a){if(a.inf)return!0;var b=a.x,c=a.y,d=this.a.redMul(b),e=b.redSqr().redMul(b).redIAdd(d).redIAdd(this.b);return 0===c.redSqr().redISub(e).cmpn(0)},d.prototype._endoWnafMulAdd=function(a,b,c){for(var d=this._endoWnafT1,e=this._endoWnafT2,f=0;f<a.length;f++){var g=this._endoSplit(b[f]),h=a[f],i=h._getBeta();g.k1.negative&&(g.k1.ineg(),h=h.neg(!0)),g.k2.negative&&(g.k2.ineg(),i=i.neg(!0)),d[2*f]=h,d[2*f+1]=i,e[2*f]=g.k1,e[2*f+1]=g.k2}for(var j=this._wnafMulAdd(1,d,e,2*f,c),k=0;k<2*f;k++)d[k]=null,e[k]=null;return j},j(e,k.BasePoint),d.prototype.point=function(a,b,c){return new e(this,a,b,c)},d.prototype.pointFromJSON=function(a,b){return e.fromJSON(this,a,b)},e.prototype._getBeta=function(){if(this.curve.endo){var a=this.precomputed;if(a&&a.beta)return a.beta;var b=this.curve.point(this.x.redMul(this.curve.endo.beta),this.y);if(a){var c=this.curve,d=function(a){return c.point(a.x.redMul(c.endo.beta),a.y)};a.beta=b,b.precomputed={beta:null,naf:a.naf&&{wnd:a.naf.wnd,points:a.naf.points.map(d)},doubles:a.doubles&&{step:a.doubles.step,points:a.doubles.points.map(d)}}}return b}},e.prototype.toJSON=function(){return this.precomputed?[this.x,this.y,this.precomputed&&{doubles:this.precomputed.doubles&&{step:this.precomputed.doubles.step,points:this.precomputed.doubles.points.slice(1)},naf:this.precomputed.naf&&{wnd:this.precomputed.naf.wnd,points:this.precomputed.naf.points.slice(1)}}]:[this.x,this.y]},e.fromJSON=function(a,b,c){function d(b){return a.point(b[0],b[1],c)}"string"==typeof b&&(b=JSON.parse(b));var e=a.point(b[0],b[1],c);if(!b[2])return e;var f=b[2];return e.precomputed={beta:null,doubles:f.doubles&&{step:f.doubles.step,points:[e].concat(f.doubles.points.map(d))},naf:f.naf&&{wnd:f.naf.wnd,points:[e].concat(f.naf.points.map(d))}},e},e.prototype.inspect=function(){return this.isInfinity()?"<EC Point Infinity>":"<EC Point x: "+this.x.fromRed().toString(16,2)+" y: "+this.y.fromRed().toString(16,2)+">"},e.prototype.isInfinity=function(){return this.inf},e.prototype.add=function(a){if(this.inf)return a;if(a.inf)return this;if(this.eq(a))return this.dbl();if(this.neg().eq(a))return this.curve.point(null,null);if(0===this.x.cmp(a.x))return this.curve.point(null,null);var b=this.y.redSub(a.y);0!==b.cmpn(0)&&(b=b.redMul(this.x.redSub(a.x).redInvm()));var c=b.redSqr().redISub(this.x).redISub(a.x),d=b.redMul(this.x.redSub(c)).redISub(this.y);return this.curve.point(c,d)},e.prototype.dbl=function(){if(this.inf)return this;var a=this.y.redAdd(this.y);if(0===a.cmpn(0))return this.curve.point(null,null);var b=this.curve.a,c=this.x.redSqr(),d=a.redInvm(),e=c.redAdd(c).redIAdd(c).redIAdd(b).redMul(d),f=e.redSqr().redISub(this.x.redAdd(this.x)),g=e.redMul(this.x.redSub(f)).redISub(this.y);return this.curve.point(f,g)},e.prototype.getX=function(){return this.x.fromRed()},e.prototype.getY=function(){return this.y.fromRed()},e.prototype.mul=function(a){return a=new i(a,16),this._hasDoubles(a)?this.curve._fixedNafMul(this,a):this.curve.endo?this.curve._endoWnafMulAdd([this],[a]):this.curve._wnafMul(this,a)},e.prototype.mulAdd=function(a,b,c){var d=[this,b],e=[a,c];return this.curve.endo?this.curve._endoWnafMulAdd(d,e):this.curve._wnafMulAdd(1,d,e,2)},e.prototype.jmulAdd=function(a,b,c){var d=[this,b],e=[a,c];return this.curve.endo?this.curve._endoWnafMulAdd(d,e,!0):this.curve._wnafMulAdd(1,d,e,2,!0)},e.prototype.eq=function(a){return this===a||this.inf===a.inf&&(this.inf||0===this.x.cmp(a.x)&&0===this.y.cmp(a.y))},e.prototype.neg=function(a){if(this.inf)return this;var b=this.curve.point(this.x,this.y.redNeg());if(a&&this.precomputed){var c=this.precomputed,d=function(a){return a.neg()};b.precomputed={naf:c.naf&&{wnd:c.naf.wnd,points:c.naf.points.map(d)},doubles:c.doubles&&{step:c.doubles.step,points:c.doubles.points.map(d)}}}return b},e.prototype.toJ=function(){if(this.inf)return this.curve.jpoint(null,null,null);var a=this.curve.jpoint(this.x,this.y,this.curve.one);return a},j(f,k.BasePoint),d.prototype.jpoint=function(a,b,c){return new f(this,a,b,c)},f.prototype.toP=function(){if(this.isInfinity())return this.curve.point(null,null);var a=this.z.redInvm(),b=a.redSqr(),c=this.x.redMul(b),d=this.y.redMul(b).redMul(a);return this.curve.point(c,d)},f.prototype.neg=function(){return this.curve.jpoint(this.x,this.y.redNeg(),this.z)},f.prototype.add=function(a){if(this.isInfinity())return a;if(a.isInfinity())return this;var b=a.z.redSqr(),c=this.z.redSqr(),d=this.x.redMul(b),e=a.x.redMul(c),f=this.y.redMul(b.redMul(a.z)),g=a.y.redMul(c.redMul(this.z)),h=d.redSub(e),i=f.redSub(g);if(0===h.cmpn(0))return 0!==i.cmpn(0)?this.curve.jpoint(null,null,null):this.dbl();var j=h.redSqr(),k=j.redMul(h),l=d.redMul(j),m=i.redSqr().redIAdd(k).redISub(l).redISub(l),n=i.redMul(l.redISub(m)).redISub(f.redMul(k)),o=this.z.redMul(a.z).redMul(h);return this.curve.jpoint(m,n,o)},f.prototype.mixedAdd=function(a){if(this.isInfinity())return a.toJ();if(a.isInfinity())return this;var b=this.z.redSqr(),c=this.x,d=a.x.redMul(b),e=this.y,f=a.y.redMul(b).redMul(this.z),g=c.redSub(d),h=e.redSub(f);if(0===g.cmpn(0))return 0!==h.cmpn(0)?this.curve.jpoint(null,null,null):this.dbl();var i=g.redSqr(),j=i.redMul(g),k=c.redMul(i),l=h.redSqr().redIAdd(j).redISub(k).redISub(k),m=h.redMul(k.redISub(l)).redISub(e.redMul(j)),n=this.z.redMul(g);
    return this.curve.jpoint(l,m,n)},f.prototype.dblp=function(a){if(0===a)return this;if(this.isInfinity())return this;if(!a)return this.dbl();if(this.curve.zeroA||this.curve.threeA){for(var b=this,c=0;c<a;c++)b=b.dbl();return b}for(var d=this.curve.a,e=this.curve.tinv,f=this.x,g=this.y,h=this.z,i=h.redSqr().redSqr(),j=g.redAdd(g),c=0;c<a;c++){var k=f.redSqr(),l=j.redSqr(),m=l.redSqr(),n=k.redAdd(k).redIAdd(k).redIAdd(d.redMul(i)),o=f.redMul(l),p=n.redSqr().redISub(o.redAdd(o)),q=o.redISub(p),r=n.redMul(q);r=r.redIAdd(r).redISub(m);var s=j.redMul(h);c+1<a&&(i=i.redMul(m)),f=p,h=s,j=r}return this.curve.jpoint(f,j.redMul(e),h)},f.prototype.dbl=function(){return this.isInfinity()?this:this.curve.zeroA?this._zeroDbl():this.curve.threeA?this._threeDbl():this._dbl()},f.prototype._zeroDbl=function(){var a,b,c;if(this.zOne){var d=this.x.redSqr(),e=this.y.redSqr(),f=e.redSqr(),g=this.x.redAdd(e).redSqr().redISub(d).redISub(f);g=g.redIAdd(g);var h=d.redAdd(d).redIAdd(d),i=h.redSqr().redISub(g).redISub(g),j=f.redIAdd(f);j=j.redIAdd(j),j=j.redIAdd(j),a=i,b=h.redMul(g.redISub(i)).redISub(j),c=this.y.redAdd(this.y)}else{var k=this.x.redSqr(),l=this.y.redSqr(),m=l.redSqr(),n=this.x.redAdd(l).redSqr().redISub(k).redISub(m);n=n.redIAdd(n);var o=k.redAdd(k).redIAdd(k),p=o.redSqr(),q=m.redIAdd(m);q=q.redIAdd(q),q=q.redIAdd(q),a=p.redISub(n).redISub(n),b=o.redMul(n.redISub(a)).redISub(q),c=this.y.redMul(this.z),c=c.redIAdd(c)}return this.curve.jpoint(a,b,c)},f.prototype._threeDbl=function(){var a,b,c;if(this.zOne){var d=this.x.redSqr(),e=this.y.redSqr(),f=e.redSqr(),g=this.x.redAdd(e).redSqr().redISub(d).redISub(f);g=g.redIAdd(g);var h=d.redAdd(d).redIAdd(d).redIAdd(this.curve.a),i=h.redSqr().redISub(g).redISub(g);a=i;var j=f.redIAdd(f);j=j.redIAdd(j),j=j.redIAdd(j),b=h.redMul(g.redISub(i)).redISub(j),c=this.y.redAdd(this.y)}else{var k=this.z.redSqr(),l=this.y.redSqr(),m=this.x.redMul(l),n=this.x.redSub(k).redMul(this.x.redAdd(k));n=n.redAdd(n).redIAdd(n);var o=m.redIAdd(m);o=o.redIAdd(o);var p=o.redAdd(o);a=n.redSqr().redISub(p),c=this.y.redAdd(this.z).redSqr().redISub(l).redISub(k);var q=l.redSqr();q=q.redIAdd(q),q=q.redIAdd(q),q=q.redIAdd(q),b=n.redMul(o.redISub(a)).redISub(q)}return this.curve.jpoint(a,b,c)},f.prototype._dbl=function(){var a=this.curve.a,b=this.x,c=this.y,d=this.z,e=d.redSqr().redSqr(),f=b.redSqr(),g=c.redSqr(),h=f.redAdd(f).redIAdd(f).redIAdd(a.redMul(e)),i=b.redAdd(b);i=i.redIAdd(i);var j=i.redMul(g),k=h.redSqr().redISub(j.redAdd(j)),l=j.redISub(k),m=g.redSqr();m=m.redIAdd(m),m=m.redIAdd(m),m=m.redIAdd(m);var n=h.redMul(l).redISub(m),o=c.redAdd(c).redMul(d);return this.curve.jpoint(k,n,o)},f.prototype.trpl=function(){if(!this.curve.zeroA)return this.dbl().add(this);var a=this.x.redSqr(),b=this.y.redSqr(),c=this.z.redSqr(),d=b.redSqr(),e=a.redAdd(a).redIAdd(a),f=e.redSqr(),g=this.x.redAdd(b).redSqr().redISub(a).redISub(d);g=g.redIAdd(g),g=g.redAdd(g).redIAdd(g),g=g.redISub(f);var h=g.redSqr(),i=d.redIAdd(d);i=i.redIAdd(i),i=i.redIAdd(i),i=i.redIAdd(i);var j=e.redIAdd(g).redSqr().redISub(f).redISub(h).redISub(i),k=b.redMul(j);k=k.redIAdd(k),k=k.redIAdd(k);var l=this.x.redMul(h).redISub(k);l=l.redIAdd(l),l=l.redIAdd(l);var m=this.y.redMul(j.redMul(i.redISub(j)).redISub(g.redMul(h)));m=m.redIAdd(m),m=m.redIAdd(m),m=m.redIAdd(m);var n=this.z.redAdd(g).redSqr().redISub(c).redISub(h);return this.curve.jpoint(l,m,n)},f.prototype.mul=function(a,b){return a=new i(a,b),this.curve._wnafMul(this,a)},f.prototype.eq=function(a){if("affine"===a.type)return this.eq(a.toJ());if(this===a)return!0;var b=this.z.redSqr(),c=a.z.redSqr();if(0!==this.x.redMul(c).redISub(a.x.redMul(b)).cmpn(0))return!1;var d=b.redMul(this.z),e=c.redMul(a.z);return 0===this.y.redMul(e).redISub(a.y.redMul(d)).cmpn(0)},f.prototype.eqXToP=function(a){var b=this.z.redSqr(),c=a.toRed(this.curve.red).redMul(b);if(0===this.x.cmp(c))return!0;for(var d=a.clone(),e=this.curve.redN.redMul(b);;){if(d.iadd(this.curve.n),d.cmp(this.curve.p)>=0)return!1;if(c.redIAdd(e),0===this.x.cmp(c))return!0}return!1},f.prototype.inspect=function(){return this.isInfinity()?"<EC JPoint Infinity>":"<EC JPoint x: "+this.x.toString(16,2)+" y: "+this.y.toString(16,2)+" z: "+this.z.toString(16,2)+">"},f.prototype.isInfinity=function(){return 0===this.z.cmpn(0)}},{"../../elliptic":9,"../curve":12,"bn.js":6,inherits:37}],15:[function(a,b,c){"use strict";function d(a){"short"===a.type?this.curve=new h.curve["short"](a):"edwards"===a.type?this.curve=new h.curve.edwards(a):this.curve=new h.curve.mont(a),this.g=this.curve.g,this.n=this.curve.n,this.hash=a.hash,i(this.g.validate(),"Invalid curve"),i(this.g.mul(this.n).isInfinity(),"Invalid curve, G*N != O")}function e(a,b){Object.defineProperty(f,a,{configurable:!0,enumerable:!0,get:function(){var c=new d(b);return Object.defineProperty(f,a,{configurable:!0,enumerable:!0,value:c}),c}})}var f=c,g=a("hash.js"),h=a("../elliptic"),i=h.utils.assert;f.PresetCurve=d,e("p192",{type:"short",prime:"p192",p:"ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff",a:"ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc",b:"64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1",n:"ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831",hash:g.sha256,gRed:!1,g:["188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012","07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811"]}),e("p224",{type:"short",prime:"p224",p:"ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001",a:"ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe",b:"b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4",n:"ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d",hash:g.sha256,gRed:!1,g:["b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21","bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34"]}),e("p256",{type:"short",prime:null,p:"ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff",a:"ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc",b:"5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b",n:"ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551",hash:g.sha256,gRed:!1,g:["6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296","4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5"]}),e("p384",{type:"short",prime:null,p:"ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 ffffffff",a:"ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 fffffffc",b:"b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f 5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef",n:"ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 f4372ddf 581a0db2 48b0a77a ecec196a ccc52973",hash:g.sha384,gRed:!1,g:["aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 5502f25d bf55296c 3a545e38 72760ab7","3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 0a60b1ce 1d7e819d 7a431d7c 90ea0e5f"]}),e("p521",{type:"short",prime:null,p:"000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",a:"000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffc",b:"00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b 99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd 3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00",n:"000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409",hash:g.sha512,gRed:!1,g:["000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66","00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 3fad0761 353c7086 a272c240 88be9476 9fd16650"]}),e("curve25519",{type:"mont",prime:"p25519",p:"7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",a:"76d06",b:"1",n:"1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",hash:g.sha256,gRed:!1,g:["9"]}),e("ed25519",{type:"edwards",prime:"p25519",p:"7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",a:"-1",c:"1",d:"52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3",n:"1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",hash:g.sha256,gRed:!1,g:["216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a","6666666666666666666666666666666666666666666666666666666666666658"]});var j;try{j=a("./precomputed/secp256k1")}catch(k){j=void 0}e("secp256k1",{type:"short",prime:"k256",p:"ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f",a:"0",b:"7",n:"ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141",h:"1",hash:g.sha256,beta:"7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",lambda:"5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72",basis:[{a:"3086d221a7d46bcde86c90e49284eb15",b:"-e4437ed6010e88286f547fa90abfe4c3"},{a:"114ca50f7a8e2f3f657c1108d9d44cfd8",b:"3086d221a7d46bcde86c90e49284eb15"}],gRed:!1,g:["79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798","483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8",j]})},{"../elliptic":9,"./precomputed/secp256k1":21,"hash.js":24}],16:[function(a,b,c){"use strict";function d(a){return this instanceof d?("string"==typeof a&&(h(f.curves.hasOwnProperty(a),"Unknown curve "+a),a=f.curves[a]),a instanceof f.curves.PresetCurve&&(a={curve:a}),this.curve=a.curve.curve,this.n=this.curve.n,this.nh=this.n.ushrn(1),this.g=this.curve.g,this.g=a.curve.g,this.g.precompute(a.curve.n.bitLength()+1),void(this.hash=a.hash||a.curve.hash)):new d(a)}var e=a("bn.js"),f=a("../../elliptic"),g=f.utils,h=g.assert,i=a("./key"),j=a("./signature");b.exports=d,d.prototype.keyPair=function(a){return new i(this,a)},d.prototype.keyFromPrivate=function(a,b){return i.fromPrivate(this,a,b)},d.prototype.keyFromPublic=function(a,b){return i.fromPublic(this,a,b)},d.prototype.genKeyPair=function(a){a||(a={});for(var b=new f.hmacDRBG({hash:this.hash,pers:a.pers,entropy:a.entropy||f.rand(this.hash.hmacStrength),nonce:this.n.toArray()}),c=this.n.byteLength(),d=this.n.sub(new e(2));;){var g=new e(b.generate(c));if(!(g.cmp(d)>0))return g.iaddn(1),this.keyFromPrivate(g)}},d.prototype._truncateToN=function(a,b){var c=8*a.byteLength()-this.n.bitLength();return c>0&&(a=a.ushrn(c)),!b&&a.cmp(this.n)>=0?a.sub(this.n):a},d.prototype.sign=function(a,b,c,d){"object"==typeof c&&(d=c,c=null),d||(d={}),b=this.keyFromPrivate(b,c),a=this._truncateToN(new e(a,16));for(var g=this.n.byteLength(),h=b.getPrivate().toArray("be",g),i=a.toArray("be",g),k=new f.hmacDRBG({hash:this.hash,entropy:h,nonce:i,pers:d.pers,persEnc:d.persEnc}),l=this.n.sub(new e(1)),m=0;!0;m++){var n=d.k?d.k(m):new e(k.generate(this.n.byteLength()));if(n=this._truncateToN(n,!0),!(n.cmpn(1)<=0||n.cmp(l)>=0)){var o=this.g.mul(n);if(!o.isInfinity()){var p=o.getX(),q=p.umod(this.n);if(0!==q.cmpn(0)){var r=n.invm(this.n).mul(q.mul(b.getPrivate()).iadd(a));if(r=r.umod(this.n),0!==r.cmpn(0)){var s=(o.getY().isOdd()?1:0)|(0!==p.cmp(q)?2:0);return d.canonical&&r.cmp(this.nh)>0&&(r=this.n.sub(r),s^=1),new j({r:q,s:r,recoveryParam:s})}}}}}},d.prototype.verify=function(a,b,c,d){a=this._truncateToN(new e(a,16)),c=this.keyFromPublic(c,d),b=new j(b,"hex");var f=b.r,g=b.s;if(f.cmpn(1)<0||f.cmp(this.n)>=0)return!1;if(g.cmpn(1)<0||g.cmp(this.n)>=0)return!1;var h=g.invm(this.n),i=h.mul(a).umod(this.n),k=h.mul(f).umod(this.n);if(!this.curve._maxwellTrick){var l=this.g.mulAdd(i,c.getPublic(),k);return!l.isInfinity()&&0===l.getX().umod(this.n).cmp(f)}var l=this.g.jmulAdd(i,c.getPublic(),k);return!l.isInfinity()&&l.eqXToP(f)},d.prototype.recoverPubKey=function(a,b,c,d){h((3&c)===c,"The recovery param is more than two bits"),b=new j(b,d);var f=this.n,g=new e(a),i=b.r,k=b.s,l=1&c,m=c>>1;if(i.cmp(this.curve.p.umod(this.curve.n))>=0&&m)throw new Error("Unable to find sencond key candinate");i=m?this.curve.pointFromX(i.add(this.curve.n),l):this.curve.pointFromX(i,l);var n=b.r.invm(f),o=f.sub(g).mul(n).umod(f),p=k.mul(n).umod(f);return this.g.mulAdd(o,i,p)},d.prototype.getKeyRecoveryParam=function(a,b,c,d){if(b=new j(b,d),null!==b.recoveryParam)return b.recoveryParam;for(var e=0;e<4;e++){var f;try{f=this.recoverPubKey(a,b,e)}catch(a){continue}if(f.eq(c))return e}throw new Error("Unable to find valid recovery factor")}},{"../../elliptic":9,"./key":17,"./signature":18,"bn.js":6}],17:[function(a,b,c){"use strict";function d(a,b){this.ec=a,this.priv=null,this.pub=null,b.priv&&this._importPrivate(b.priv,b.privEnc),b.pub&&this._importPublic(b.pub,b.pubEnc)}var e=a("bn.js"),f=a("../../elliptic"),g=f.utils,h=g.assert;b.exports=d,d.fromPublic=function(a,b,c){return b instanceof d?b:new d(a,{pub:b,pubEnc:c})},d.fromPrivate=function(a,b,c){return b instanceof d?b:new d(a,{priv:b,privEnc:c})},d.prototype.validate=function(){var a=this.getPublic();return a.isInfinity()?{result:!1,reason:"Invalid public key"}:a.validate()?a.mul(this.ec.curve.n).isInfinity()?{result:!0,reason:null}:{result:!1,reason:"Public key * N != O"}:{result:!1,reason:"Public key is not a point"}},d.prototype.getPublic=function(a,b){return"string"==typeof a&&(b=a,a=null),this.pub||(this.pub=this.ec.g.mul(this.priv)),b?this.pub.encode(b,a):this.pub},d.prototype.getPrivate=function(a){return"hex"===a?this.priv.toString(16,2):this.priv},d.prototype._importPrivate=function(a,b){this.priv=new e(a,b||16),this.priv=this.priv.umod(this.ec.curve.n)},d.prototype._importPublic=function(a,b){return a.x||a.y?("mont"===this.ec.curve.type?h(a.x,"Need x coordinate"):"short"!==this.ec.curve.type&&"edwards"!==this.ec.curve.type||h(a.x&&a.y,"Need both x and y coordinate"),void(this.pub=this.ec.curve.point(a.x,a.y))):void(this.pub=this.ec.curve.decodePoint(a,b))},d.prototype.derive=function(a){return a.mul(this.priv).getX()},d.prototype.sign=function(a,b,c){return this.ec.sign(a,this,b,c)},d.prototype.verify=function(a,b){return this.ec.verify(a,b,this)},d.prototype.inspect=function(){return"<Key priv: "+(this.priv&&this.priv.toString(16,2))+" pub: "+(this.pub&&this.pub.inspect())+" >"}},{"../../elliptic":9,"bn.js":6}],18:[function(a,b,c){"use strict";function d(a,b){return a instanceof d?a:void(this._importDER(a,b)||(l(a.r&&a.s,"Signature without r or s"),this.r=new i(a.r,16),this.s=new i(a.s,16),void 0===a.recoveryParam?this.recoveryParam=null:this.recoveryParam=a.recoveryParam))}function e(){this.place=0}function f(a,b){var c=a[b.place++];if(!(128&c))return c;for(var d=15&c,e=0,f=0,g=b.place;f<d;f++,g++)e<<=8,e|=a[g];return b.place=g,e}function g(a){for(var b=0,c=a.length-1;!a[b]&&!(128&a[b+1])&&b<c;)b++;return 0===b?a:a.slice(b)}function h(a,b){if(b<128)return void a.push(b);var c=1+(Math.log(b)/Math.LN2>>>3);for(a.push(128|c);--c;)a.push(b>>>(c<<3)&255);a.push(b)}var i=a("bn.js"),j=a("../../elliptic"),k=j.utils,l=k.assert;b.exports=d,d.prototype._importDER=function(a,b){a=k.toArray(a,b);var c=new e;if(48!==a[c.place++])return!1;var d=f(a,c);if(d+c.place!==a.length)return!1;if(2!==a[c.place++])return!1;var g=f(a,c),h=a.slice(c.place,g+c.place);if(c.place+=g,2!==a[c.place++])return!1;var j=f(a,c);if(a.length!==j+c.place)return!1;var l=a.slice(c.place,j+c.place);return 0===h[0]&&128&h[1]&&(h=h.slice(1)),0===l[0]&&128&l[1]&&(l=l.slice(1)),this.r=new i(h),this.s=new i(l),this.recoveryParam=null,!0},d.prototype.toDER=function(a){var b=this.r.toArray(),c=this.s.toArray();for(128&b[0]&&(b=[0].concat(b)),128&c[0]&&(c=[0].concat(c)),b=g(b),c=g(c);!(c[0]||128&c[1]);)c=c.slice(1);var d=[2];h(d,b.length),d=d.concat(b),d.push(2),h(d,c.length);var e=d.concat(c),f=[48];return h(f,e.length),f=f.concat(e),k.encode(f,a)}},{"../../elliptic":9,"bn.js":6}],19:[function(a,b,c){arguments[4][11][0].apply(c,arguments)},{dup:11}],20:[function(a,b,c){"use strict";function d(a){if(!(this instanceof d))return new d(a);this.hash=a.hash,this.predResist=!!a.predResist,this.outLen=this.hash.outSize,this.minEntropy=a.minEntropy||this.hash.hmacStrength,this.reseed=null,this.reseedInterval=null,this.K=null,this.V=null;var b=g.toArray(a.entropy,a.entropyEnc),c=g.toArray(a.nonce,a.nonceEnc),e=g.toArray(a.pers,a.persEnc);h(b.length>=this.minEntropy/8,"Not enough entropy. Minimum is: "+this.minEntropy+" bits"),this._init(b,c,e)}var e=a("hash.js"),f=a("../elliptic"),g=f.utils,h=g.assert;b.exports=d,d.prototype._init=function(a,b,c){var d=a.concat(b).concat(c);this.K=new Array(this.outLen/8),this.V=new Array(this.outLen/8);for(var e=0;e<this.V.length;e++)this.K[e]=0,this.V[e]=1;this._update(d),this.reseed=1,this.reseedInterval=281474976710656},d.prototype._hmac=function(){return new e.hmac(this.hash,this.K)},d.prototype._update=function(a){var b=this._hmac().update(this.V).update([0]);a&&(b=b.update(a)),this.K=b.digest(),this.V=this._hmac().update(this.V).digest(),a&&(this.K=this._hmac().update(this.V).update([1]).update(a).digest(),this.V=this._hmac().update(this.V).digest())},d.prototype.reseed=function(a,b,c,d){"string"!=typeof b&&(d=c,c=b,b=null),a=g.toBuffer(a,b),c=g.toBuffer(c,d),h(a.length>=this.minEntropy/8,"Not enough entropy. Minimum is: "+this.minEntropy+" bits"),this._update(a.concat(c||[])),this.reseed=1},d.prototype.generate=function(a,b,c,d){if(this.reseed>this.reseedInterval)throw new Error("Reseed is required");"string"!=typeof b&&(d=c,c=b,b=null),c&&(c=g.toArray(c,d),this._update(c));for(var e=[];e.length<a;)this.V=this._hmac().update(this.V).digest(),e=e.concat(this.V);var f=e.slice(0,a);return this._update(c),this.reseed++,g.encode(f,b)}},{"../elliptic":9,"hash.js":24}],21:[function(a,b,c){b.exports=void 0},{}],22:[function(a,b,c){"use strict";function d(a,b){if(Array.isArray(a))return a.slice();if(!a)return[];var c=[];if("string"!=typeof a){for(var d=0;d<a.length;d++)c[d]=0|a[d];return c}if(b){if("hex"===b){a=a.replace(/[^a-z0-9]+/gi,""),a.length%2!==0&&(a="0"+a);for(var d=0;d<a.length;d+=2)c.push(parseInt(a[d]+a[d+1],16))}}else for(var d=0;d<a.length;d++){var e=a.charCodeAt(d),f=e>>8,g=255&e;f?c.push(f,g):c.push(g)}return c}function e(a){return 1===a.length?"0"+a:a}function f(a){for(var b="",c=0;c<a.length;c++)b+=e(a[c].toString(16));return b}function g(a,b){for(var c=[],d=1<<b+1,e=a.clone();e.cmpn(1)>=0;){var f;if(e.isOdd()){var g=e.andln(d-1);f=g>(d>>1)-1?(d>>1)-g:g,e.isubn(f)}else f=0;c.push(f);for(var h=0!==e.cmpn(0)&&0===e.andln(d-1)?b+1:1,i=1;i<h;i++)c.push(0);e.iushrn(h)}return c}function h(a,b){var c=[[],[]];a=a.clone(),b=b.clone();for(var d=0,e=0;a.cmpn(-d)>0||b.cmpn(-e)>0;){var f=a.andln(3)+d&3,g=b.andln(3)+e&3;3===f&&(f=-1),3===g&&(g=-1);var h;if(0===(1&f))h=0;else{var i=a.andln(7)+d&7;h=3!==i&&5!==i||2!==g?f:-f}c[0].push(h);var j;if(0===(1&g))j=0;else{var i=b.andln(7)+e&7;j=3!==i&&5!==i||2!==f?g:-g}c[1].push(j),2*d===h+1&&(d=1-d),2*e===j+1&&(e=1-e),a.iushrn(1),b.iushrn(1)}return c}function i(a,b,c){var d="_"+b;a.prototype[b]=function(){return void 0!==this[d]?this[d]:this[d]=c.call(this)}}function j(a){return"string"==typeof a?l.toArray(a,"hex"):a}function k(a){return new m(a,"hex","le")}var l=c,m=a("bn.js");l.assert=function(a,b){if(!a)throw new Error(b||"Assertion failed")},l.toArray=d,l.zero2=e,l.toHex=f,l.encode=function(a,b){return"hex"===b?f(a):a},l.getNAF=g,l.getJSF=h,l.cachedProperty=i,l.parseBytes=j,l.intFromLE=k},{"bn.js":6}],23:[function(a,b,c){b.exports={version:"6.3.3"}},{}],24:[function(a,b,c){var d=c;d.utils=a("./hash/utils"),d.common=a("./hash/common"),d.sha=a("./hash/sha"),d.ripemd=a("./hash/ripemd"),d.hmac=a("./hash/hmac"),d.sha1=d.sha.sha1,d.sha256=d.sha.sha256,d.sha224=d.sha.sha224,d.sha384=d.sha.sha384,d.sha512=d.sha.sha512,d.ripemd160=d.ripemd.ripemd160},{"./hash/common":25,"./hash/hmac":26,"./hash/ripemd":27,"./hash/sha":28,"./hash/utils":35}],25:[function(a,b,c){"use strict";function d(){this.pending=null,this.pendingTotal=0,this.blockSize=this.constructor.blockSize,this.outSize=this.constructor.outSize,this.hmacStrength=this.constructor.hmacStrength,this.padLength=this.constructor.padLength/8,this.endian="big",this._delta8=this.blockSize/8,this._delta32=this.blockSize/32}var e=a("./utils"),f=a("minimalistic-assert");c.BlockHash=d,d.prototype.update=function(a,b){if(a=e.toArray(a,b),this.pending?this.pending=this.pending.concat(a):this.pending=a,this.pendingTotal+=a.length,this.pending.length>=this._delta8){a=this.pending;var c=a.length%this._delta8;this.pending=a.slice(a.length-c,a.length),0===this.pending.length&&(this.pending=null),a=e.join32(a,0,a.length-c,this.endian);for(var d=0;d<a.length;d+=this._delta32)this._update(a,d,d+this._delta32)}return this},d.prototype.digest=function(a){return this.update(this._pad()),f(null===this.pending),this._digest(a)},d.prototype._pad=function(){var a=this.pendingTotal,b=this._delta8,c=b-(a+this.padLength)%b,d=new Array(c+this.padLength);d[0]=128;for(var e=1;e<c;e++)d[e]=0;if(a<<=3,"big"===this.endian){for(var f=8;f<this.padLength;f++)d[e++]=0;d[e++]=0,d[e++]=0,d[e++]=0,d[e++]=0,d[e++]=a>>>24&255,d[e++]=a>>>16&255,d[e++]=a>>>8&255,d[e++]=255&a}else for(d[e++]=255&a,d[e++]=a>>>8&255,d[e++]=a>>>16&255,d[e++]=a>>>24&255,d[e++]=0,d[e++]=0,d[e++]=0,d[e++]=0,f=8;f<this.padLength;f++)d[e++]=0;return d}},{"./utils":35,"minimalistic-assert":39}],26:[function(a,b,c){"use strict";function d(a,b,c){return this instanceof d?(this.Hash=a,this.blockSize=a.blockSize/8,this.outSize=a.outSize/8,this.inner=null,this.outer=null,void this._init(e.toArray(b,c))):new d(a,b,c)}var e=a("./utils"),f=a("minimalistic-assert");b.exports=d,d.prototype._init=function(a){a.length>this.blockSize&&(a=(new this.Hash).update(a).digest()),f(a.length<=this.blockSize);for(var b=a.length;b<this.blockSize;b++)a.push(0);for(b=0;b<a.length;b++)a[b]^=54;for(this.inner=(new this.Hash).update(a),b=0;b<a.length;b++)a[b]^=106;this.outer=(new this.Hash).update(a)},d.prototype.update=function(a,b){return this.inner.update(a,b),this},d.prototype.digest=function(a){return this.outer.update(this.inner.digest()),this.outer.digest(a)}},{"./utils":35,"minimalistic-assert":39}],27:[function(a,b,c){b.exports={ripemd160:null}},{}],28:[function(a,b,c){"use strict";c.sha1=a("./sha/1"),c.sha224=a("./sha/224"),c.sha256=a("./sha/256"),c.sha384=a("./sha/384"),c.sha512=a("./sha/512")},{"./sha/1":29,"./sha/224":30,"./sha/256":31,"./sha/384":32,"./sha/512":33}],29:[function(a,b,c){arguments[4][11][0].apply(c,arguments)},{dup:11}],30:[function(a,b,c){arguments[4][11][0].apply(c,arguments)},{dup:11}],31:[function(a,b,c){"use strict";function d(){return this instanceof d?(r.call(this),this.h=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],this.k=s,void(this.W=new Array(64))):new d}var e=a("../utils"),f=a("../common"),g=a("./common"),h=a("minimalistic-assert"),i=e.sum32,j=e.sum32_4,k=e.sum32_5,l=g.ch32,m=g.maj32,n=g.s0_256,o=g.s1_256,p=g.g0_256,q=g.g1_256,r=f.BlockHash,s=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];e.inherits(d,r),b.exports=d,d.blockSize=512,d.outSize=256,d.hmacStrength=192,d.padLength=64,d.prototype._update=function(a,b){for(var c=this.W,d=0;d<16;d++)c[d]=a[b+d];for(;d<c.length;d++)c[d]=j(q(c[d-2]),c[d-7],p(c[d-15]),c[d-16]);var e=this.h[0],f=this.h[1],g=this.h[2],r=this.h[3],s=this.h[4],t=this.h[5],u=this.h[6],v=this.h[7];for(h(this.k.length===c.length),d=0;d<c.length;d++){var w=k(v,o(s),l(s,t,u),this.k[d],c[d]),x=i(n(e),m(e,f,g));v=u,u=t,t=s,s=i(r,w),r=g,g=f,f=e,e=i(w,x)}this.h[0]=i(this.h[0],e),this.h[1]=i(this.h[1],f),this.h[2]=i(this.h[2],g),this.h[3]=i(this.h[3],r),this.h[4]=i(this.h[4],s),this.h[5]=i(this.h[5],t),this.h[6]=i(this.h[6],u),this.h[7]=i(this.h[7],v)},d.prototype._digest=function(a){return"hex"===a?e.toHex32(this.h,"big"):e.split32(this.h,"big")}},{"../common":25,"../utils":35,"./common":34,"minimalistic-assert":39}],32:[function(a,b,c){arguments[4][11][0].apply(c,arguments)},{dup:11}],33:[function(a,b,c){"use strict";function d(){return this instanceof d?(E.call(this),this.h=[1779033703,4089235720,3144134277,2227873595,1013904242,4271175723,2773480762,1595750129,1359893119,2917565137,2600822924,725511199,528734635,4215389547,1541459225,327033209],this.k=F,void(this.W=new Array(160))):new d}function e(a,b,c,d,e){var f=a&c^~a&e;return f<0&&(f+=4294967296),f}function f(a,b,c,d,e,f){var g=b&d^~b&f;return g<0&&(g+=4294967296),g}function g(a,b,c,d,e){var f=a&c^a&e^c&e;return f<0&&(f+=4294967296),f}function h(a,b,c,d,e,f){var g=b&d^b&f^d&f;return g<0&&(g+=4294967296),g}function i(a,b){var c=t(a,b,28),d=t(b,a,2),e=t(b,a,7),f=c^d^e;return f<0&&(f+=4294967296),f}function j(a,b){var c=u(a,b,28),d=u(b,a,2),e=u(b,a,7),f=c^d^e;return f<0&&(f+=4294967296),f}function k(a,b){var c=t(a,b,14),d=t(a,b,18),e=t(b,a,9),f=c^d^e;return f<0&&(f+=4294967296),f}function l(a,b){var c=u(a,b,14),d=u(a,b,18),e=u(b,a,9),f=c^d^e;return f<0&&(f+=4294967296),f}function m(a,b){var c=t(a,b,1),d=t(a,b,8),e=v(a,b,7),f=c^d^e;return f<0&&(f+=4294967296),f}function n(a,b){var c=u(a,b,1),d=u(a,b,8),e=w(a,b,7),f=c^d^e;return f<0&&(f+=4294967296),f}function o(a,b){var c=t(a,b,19),d=t(b,a,29),e=v(a,b,6),f=c^d^e;return f<0&&(f+=4294967296),f}function p(a,b){var c=u(a,b,19),d=u(b,a,29),e=w(a,b,6),f=c^d^e;return f<0&&(f+=4294967296),f}var q=a("../utils"),r=a("../common"),s=a("minimalistic-assert"),t=q.rotr64_hi,u=q.rotr64_lo,v=q.shr64_hi,w=q.shr64_lo,x=q.sum64,y=q.sum64_hi,z=q.sum64_lo,A=q.sum64_4_hi,B=q.sum64_4_lo,C=q.sum64_5_hi,D=q.sum64_5_lo,E=r.BlockHash,F=[1116352408,3609767458,1899447441,602891725,3049323471,3964484399,3921009573,2173295548,961987163,4081628472,1508970993,3053834265,2453635748,2937671579,2870763221,3664609560,3624381080,2734883394,310598401,1164996542,607225278,1323610764,1426881987,3590304994,1925078388,4068182383,2162078206,991336113,2614888103,633803317,3248222580,3479774868,3835390401,2666613458,4022224774,944711139,264347078,2341262773,604807628,2007800933,770255983,1495990901,1249150122,1856431235,1555081692,3175218132,1996064986,2198950837,2554220882,3999719339,2821834349,766784016,2952996808,2566594879,3210313671,3203337956,3336571891,1034457026,3584528711,2466948901,113926993,3758326383,338241895,168717936,666307205,1188179964,773529912,1546045734,1294757372,1522805485,1396182291,2643833823,1695183700,2343527390,1986661051,1014477480,2177026350,1206759142,2456956037,344077627,2730485921,1290863460,2820302411,3158454273,3259730800,3505952657,3345764771,106217008,3516065817,3606008344,3600352804,1432725776,4094571909,1467031594,275423344,851169720,430227734,3100823752,506948616,1363258195,659060556,3750685593,883997877,3785050280,958139571,3318307427,1322822218,3812723403,1537002063,2003034995,1747873779,3602036899,1955562222,1575990012,2024104815,1125592928,2227730452,2716904306,2361852424,442776044,2428436474,593698344,2756734187,3733110249,3204031479,2999351573,3329325298,3815920427,3391569614,3928383900,3515267271,566280711,3940187606,3454069534,4118630271,4000239992,116418474,1914138554,174292421,2731055270,289380356,3203993006,460393269,320620315,685471733,587496836,852142971,1086792851,1017036298,365543100,1126000580,2618297676,1288033470,3409855158,1501505948,4234509866,1607167915,987167468,1816402316,1246189591];q.inherits(d,E),b.exports=d,d.blockSize=1024,d.outSize=512,d.hmacStrength=192,d.padLength=128,d.prototype._prepareBlock=function(a,b){for(var c=this.W,d=0;d<32;d++)c[d]=a[b+d];for(;d<c.length;d+=2){var e=o(c[d-4],c[d-3]),f=p(c[d-4],c[d-3]),g=c[d-14],h=c[d-13],i=m(c[d-30],c[d-29]),j=n(c[d-30],c[d-29]),k=c[d-32],l=c[d-31];c[d]=A(e,f,g,h,i,j,k,l),c[d+1]=B(e,f,g,h,i,j,k,l)}},d.prototype._update=function(a,b){this._prepareBlock(a,b);var c=this.W,d=this.h[0],m=this.h[1],n=this.h[2],o=this.h[3],p=this.h[4],q=this.h[5],r=this.h[6],t=this.h[7],u=this.h[8],v=this.h[9],w=this.h[10],A=this.h[11],B=this.h[12],E=this.h[13],F=this.h[14],G=this.h[15];s(this.k.length===c.length);for(var H=0;H<c.length;H+=2){var I=F,J=G,K=k(u,v),L=l(u,v),M=e(u,v,w,A,B,E),N=f(u,v,w,A,B,E),O=this.k[H],P=this.k[H+1],Q=c[H],R=c[H+1],S=C(I,J,K,L,M,N,O,P,Q,R),T=D(I,J,K,L,M,N,O,P,Q,R);I=i(d,m),J=j(d,m),K=g(d,m,n,o,p,q),L=h(d,m,n,o,p,q);var U=y(I,J,K,L),V=z(I,J,K,L);F=B,G=E,B=w,E=A,w=u,A=v,u=y(r,t,S,T),v=z(t,t,S,T),r=p,t=q,p=n,q=o,n=d,o=m,d=y(S,T,U,V),m=z(S,T,U,V)}x(this.h,0,d,m),x(this.h,2,n,o),x(this.h,4,p,q),x(this.h,6,r,t),x(this.h,8,u,v),x(this.h,10,w,A),x(this.h,12,B,E),x(this.h,14,F,G)},d.prototype._digest=function(a){return"hex"===a?q.toHex32(this.h,"big"):q.split32(this.h,"big")}},{"../common":25,"../utils":35,"minimalistic-assert":39}],34:[function(a,b,c){"use strict";function d(a,b,c,d){return 0===a?e(b,c,d):1===a||3===a?g(b,c,d):2===a?f(b,c,d):void 0}function e(a,b,c){return a&b^~a&c}function f(a,b,c){return a&b^a&c^b&c}function g(a,b,c){return a^b^c}function h(a){return m(a,2)^m(a,13)^m(a,22)}function i(a){return m(a,6)^m(a,11)^m(a,25)}function j(a){return m(a,7)^m(a,18)^a>>>3}function k(a){return m(a,17)^m(a,19)^a>>>10}var l=a("../utils"),m=l.rotr32;c.ft_1=d,c.ch32=e,c.maj32=f,c.p32=g,c.s0_256=h,c.s1_256=i,c.g0_256=j,c.g1_256=k},{"../utils":35}],35:[function(a,b,c){"use strict";function d(a,b){if(Array.isArray(a))return a.slice();if(!a)return[];var c=[];if("string"==typeof a)if(b){if("hex"===b)for(a=a.replace(/[^a-z0-9]+/gi,""),a.length%2!==0&&(a="0"+a),d=0;d<a.length;d+=2)c.push(parseInt(a[d]+a[d+1],16))}else for(var d=0;d<a.length;d++){var e=a.charCodeAt(d),f=e>>8,g=255&e;f?c.push(f,g):c.push(g)}else for(d=0;d<a.length;d++)c[d]=0|a[d];return c}function e(a){for(var b="",c=0;c<a.length;c++)b+=h(a[c].toString(16));return b}function f(a){var b=a>>>24|a>>>8&65280|a<<8&16711680|(255&a)<<24;return b>>>0}function g(a,b){for(var c="",d=0;d<a.length;d++){var e=a[d];"little"===b&&(e=f(e)),c+=i(e.toString(16))}return c}function h(a){return 1===a.length?"0"+a:a}function i(a){return 7===a.length?"0"+a:6===a.length?"00"+a:5===a.length?"000"+a:4===a.length?"0000"+a:3===a.length?"00000"+a:2===a.length?"000000"+a:1===a.length?"0000000"+a:a}function j(a,b,c,d){var e=c-b;C(e%4===0);for(var f=new Array(e/4),g=0,h=b;g<f.length;g++,h+=4){var i;i="big"===d?a[h]<<24|a[h+1]<<16|a[h+2]<<8|a[h+3]:a[h+3]<<24|a[h+2]<<16|a[h+1]<<8|a[h],f[g]=i>>>0}return f}function k(a,b){for(var c=new Array(4*a.length),d=0,e=0;d<a.length;d++,e+=4){var f=a[d];"big"===b?(c[e]=f>>>24,c[e+1]=f>>>16&255,c[e+2]=f>>>8&255,c[e+3]=255&f):(c[e+3]=f>>>24,c[e+2]=f>>>16&255,c[e+1]=f>>>8&255,c[e]=255&f)}return c}function l(a,b){return a>>>b|a<<32-b}function m(a,b){return a<<b|a>>>32-b}function n(a,b){return a+b>>>0}function o(a,b,c){return a+b+c>>>0}function p(a,b,c,d){return a+b+c+d>>>0}function q(a,b,c,d,e){return a+b+c+d+e>>>0}function r(a,b,c,d){var e=a[b],f=a[b+1],g=d+f>>>0,h=(g<d?1:0)+c+e;a[b]=h>>>0,a[b+1]=g}function s(a,b,c,d){var e=b+d>>>0,f=(e<b?1:0)+a+c;return f>>>0}function t(a,b,c,d){var e=b+d;return e>>>0}function u(a,b,c,d,e,f,g,h){var i=0,j=b;j=j+d>>>0,i+=j<b?1:0,j=j+f>>>0,i+=j<f?1:0,j=j+h>>>0,i+=j<h?1:0;var k=a+c+e+g+i;return k>>>0}function v(a,b,c,d,e,f,g,h){var i=b+d+f+h;return i>>>0}function w(a,b,c,d,e,f,g,h,i,j){var k=0,l=b;l=l+d>>>0,k+=l<b?1:0,l=l+f>>>0,k+=l<f?1:0,l=l+h>>>0,k+=l<h?1:0,l=l+j>>>0,k+=l<j?1:0;var m=a+c+e+g+i+k;return m>>>0}function x(a,b,c,d,e,f,g,h,i,j){var k=b+d+f+h+j;return k>>>0}function y(a,b,c){var d=b<<32-c|a>>>c;return d>>>0;
  }function z(a,b,c){var d=a<<32-c|b>>>c;return d>>>0}function A(a,b,c){return a>>>c}function B(a,b,c){var d=a<<32-c|b>>>c;return d>>>0}var C=a("minimalistic-assert"),D=a("inherits");c.inherits=D,c.toArray=d,c.toHex=e,c.htonl=f,c.toHex32=g,c.zero2=h,c.zero8=i,c.join32=j,c.split32=k,c.rotr32=l,c.rotl32=m,c.sum32=n,c.sum32_3=o,c.sum32_4=p,c.sum32_5=q,c.sum64=r,c.sum64_hi=s,c.sum64_lo=t,c.sum64_4_hi=u,c.sum64_4_lo=v,c.sum64_5_hi=w,c.sum64_5_lo=x,c.rotr64_hi=y,c.rotr64_lo=z,c.shr64_hi=A,c.shr64_lo=B},{inherits:36,"minimalistic-assert":39}],36:[function(a,b,c){"function"==typeof Object.create?b.exports=function(a,b){a.super_=b,a.prototype=Object.create(b.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}})}:b.exports=function(a,b){a.super_=b;var c=function(){};c.prototype=b.prototype,a.prototype=new c,a.prototype.constructor=a}},{}],37:[function(a,b,c){arguments[4][36][0].apply(c,arguments)},{dup:36}],38:[function(a,b,c){(function(a,c){!function(){"use strict";function d(a,b,c){this.blocks=[],this.s=[],this.padding=b,this.outputBits=c,this.reset=!0,this.block=0,this.start=0,this.blockCount=1600-(a<<1)>>5,this.byteCount=this.blockCount<<2,this.outputBlocks=c>>5,this.extraBytes=(31&c)>>3;for(var d=0;d<50;++d)this.s[d]=0}var e="object"==typeof window?window:{},f=!e.JS_SHA3_NO_NODE_JS&&"object"==typeof a&&a.versions&&a.versions.node;f&&(e=c);for(var g=!e.JS_SHA3_NO_COMMON_JS&&"object"==typeof b&&b.exports,h="0123456789abcdef".split(""),i=[31,7936,2031616,520093696],j=[1,256,65536,16777216],k=[6,1536,393216,100663296],l=[0,8,16,24],m=[1,0,32898,0,32906,2147483648,2147516416,2147483648,32907,0,2147483649,0,2147516545,2147483648,32777,2147483648,138,0,136,0,2147516425,0,2147483658,0,2147516555,0,139,2147483648,32905,2147483648,32771,2147483648,32770,2147483648,128,2147483648,32778,0,2147483658,2147483648,2147516545,2147483648,32896,2147483648,2147483649,0,2147516424,2147483648],n=[224,256,384,512],o=[128,256],p=["hex","buffer","arrayBuffer","array"],q=function(a,b,c){return function(e){return new d(a,b,a).update(e)[c]()}},r=function(a,b,c){return function(e,f){return new d(a,b,f).update(e)[c]()}},s=function(a,b){var c=q(a,b,"hex");c.create=function(){return new d(a,b,a)},c.update=function(a){return c.create().update(a)};for(var e=0;e<p.length;++e){var f=p[e];c[f]=q(a,b,f)}return c},t=function(a,b){var c=r(a,b,"hex");c.create=function(c){return new d(a,b,c)},c.update=function(a,b){return c.create(b).update(a)};for(var e=0;e<p.length;++e){var f=p[e];c[f]=r(a,b,f)}return c},u=[{name:"keccak",padding:j,bits:n,createMethod:s},{name:"sha3",padding:k,bits:n,createMethod:s},{name:"shake",padding:i,bits:o,createMethod:t}],v={},w=[],x=0;x<u.length;++x)for(var y=u[x],z=y.bits,A=0;A<z.length;++A){var B=y.name+"_"+z[A];w.push(B),v[B]=y.createMethod(z[A],y.padding)}d.prototype.update=function(a){var b="string"!=typeof a;b&&a.constructor===ArrayBuffer&&(a=new Uint8Array(a));for(var c,d,e=a.length,f=this.blocks,g=this.byteCount,h=this.blockCount,i=0,j=this.s;i<e;){if(this.reset)for(this.reset=!1,f[0]=this.block,c=1;c<h+1;++c)f[c]=0;if(b)for(c=this.start;i<e&&c<g;++i)f[c>>2]|=a[i]<<l[3&c++];else for(c=this.start;i<e&&c<g;++i)d=a.charCodeAt(i),d<128?f[c>>2]|=d<<l[3&c++]:d<2048?(f[c>>2]|=(192|d>>6)<<l[3&c++],f[c>>2]|=(128|63&d)<<l[3&c++]):d<55296||d>=57344?(f[c>>2]|=(224|d>>12)<<l[3&c++],f[c>>2]|=(128|d>>6&63)<<l[3&c++],f[c>>2]|=(128|63&d)<<l[3&c++]):(d=65536+((1023&d)<<10|1023&a.charCodeAt(++i)),f[c>>2]|=(240|d>>18)<<l[3&c++],f[c>>2]|=(128|d>>12&63)<<l[3&c++],f[c>>2]|=(128|d>>6&63)<<l[3&c++],f[c>>2]|=(128|63&d)<<l[3&c++]);if(this.lastByteIndex=c,c>=g){for(this.start=c-g,this.block=f[h],c=0;c<h;++c)j[c]^=f[c];C(j),this.reset=!0}else this.start=c}return this},d.prototype.finalize=function(){var a=this.blocks,b=this.lastByteIndex,c=this.blockCount,d=this.s;if(a[b>>2]|=this.padding[3&b],this.lastByteIndex===this.byteCount)for(a[0]=a[c],b=1;b<c+1;++b)a[b]=0;for(a[c-1]|=2147483648,b=0;b<c;++b)d[b]^=a[b];C(d)},d.prototype.toString=d.prototype.hex=function(){this.finalize();for(var a,b=this.blockCount,c=this.s,d=this.outputBlocks,e=this.extraBytes,f=0,g=0,i="";g<d;){for(f=0;f<b&&g<d;++f,++g)a=c[f],i+=h[a>>4&15]+h[15&a]+h[a>>12&15]+h[a>>8&15]+h[a>>20&15]+h[a>>16&15]+h[a>>28&15]+h[a>>24&15];g%b===0&&(C(c),f=0)}return e&&(a=c[f],e>0&&(i+=h[a>>4&15]+h[15&a]),e>1&&(i+=h[a>>12&15]+h[a>>8&15]),e>2&&(i+=h[a>>20&15]+h[a>>16&15])),i},d.prototype.arrayBuffer=function(){this.finalize();var a,b=this.blockCount,c=this.s,d=this.outputBlocks,e=this.extraBytes,f=0,g=0,h=this.outputBits>>3;a=e?new ArrayBuffer(d+1<<2):new ArrayBuffer(h);for(var i=new Uint32Array(a);g<d;){for(f=0;f<b&&g<d;++f,++g)i[g]=c[f];g%b===0&&C(c)}return e&&(i[f]=c[f],a=a.slice(0,h)),a},d.prototype.buffer=d.prototype.arrayBuffer,d.prototype.digest=d.prototype.array=function(){this.finalize();for(var a,b,c=this.blockCount,d=this.s,e=this.outputBlocks,f=this.extraBytes,g=0,h=0,i=[];h<e;){for(g=0;g<c&&h<e;++g,++h)a=h<<2,b=d[g],i[a]=255&b,i[a+1]=b>>8&255,i[a+2]=b>>16&255,i[a+3]=b>>24&255;h%c===0&&C(d)}return f&&(a=h<<2,b=d[g],f>0&&(i[a]=255&b),f>1&&(i[a+1]=b>>8&255),f>2&&(i[a+2]=b>>16&255)),i};var C=function(a){var b,c,d,e,f,g,h,i,j,k,l,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,$,_,aa,ba,ca,da,ea,fa,ga,ha,ia,ja,ka;for(d=0;d<48;d+=2)e=a[0]^a[10]^a[20]^a[30]^a[40],f=a[1]^a[11]^a[21]^a[31]^a[41],g=a[2]^a[12]^a[22]^a[32]^a[42],h=a[3]^a[13]^a[23]^a[33]^a[43],i=a[4]^a[14]^a[24]^a[34]^a[44],j=a[5]^a[15]^a[25]^a[35]^a[45],k=a[6]^a[16]^a[26]^a[36]^a[46],l=a[7]^a[17]^a[27]^a[37]^a[47],n=a[8]^a[18]^a[28]^a[38]^a[48],o=a[9]^a[19]^a[29]^a[39]^a[49],b=n^(g<<1|h>>>31),c=o^(h<<1|g>>>31),a[0]^=b,a[1]^=c,a[10]^=b,a[11]^=c,a[20]^=b,a[21]^=c,a[30]^=b,a[31]^=c,a[40]^=b,a[41]^=c,b=e^(i<<1|j>>>31),c=f^(j<<1|i>>>31),a[2]^=b,a[3]^=c,a[12]^=b,a[13]^=c,a[22]^=b,a[23]^=c,a[32]^=b,a[33]^=c,a[42]^=b,a[43]^=c,b=g^(k<<1|l>>>31),c=h^(l<<1|k>>>31),a[4]^=b,a[5]^=c,a[14]^=b,a[15]^=c,a[24]^=b,a[25]^=c,a[34]^=b,a[35]^=c,a[44]^=b,a[45]^=c,b=i^(n<<1|o>>>31),c=j^(o<<1|n>>>31),a[6]^=b,a[7]^=c,a[16]^=b,a[17]^=c,a[26]^=b,a[27]^=c,a[36]^=b,a[37]^=c,a[46]^=b,a[47]^=c,b=k^(e<<1|f>>>31),c=l^(f<<1|e>>>31),a[8]^=b,a[9]^=c,a[18]^=b,a[19]^=c,a[28]^=b,a[29]^=c,a[38]^=b,a[39]^=c,a[48]^=b,a[49]^=c,p=a[0],q=a[1],V=a[11]<<4|a[10]>>>28,W=a[10]<<4|a[11]>>>28,D=a[20]<<3|a[21]>>>29,E=a[21]<<3|a[20]>>>29,ha=a[31]<<9|a[30]>>>23,ia=a[30]<<9|a[31]>>>23,R=a[40]<<18|a[41]>>>14,S=a[41]<<18|a[40]>>>14,J=a[2]<<1|a[3]>>>31,K=a[3]<<1|a[2]>>>31,r=a[13]<<12|a[12]>>>20,s=a[12]<<12|a[13]>>>20,X=a[22]<<10|a[23]>>>22,Y=a[23]<<10|a[22]>>>22,F=a[33]<<13|a[32]>>>19,G=a[32]<<13|a[33]>>>19,ja=a[42]<<2|a[43]>>>30,ka=a[43]<<2|a[42]>>>30,ba=a[5]<<30|a[4]>>>2,ca=a[4]<<30|a[5]>>>2,L=a[14]<<6|a[15]>>>26,M=a[15]<<6|a[14]>>>26,t=a[25]<<11|a[24]>>>21,u=a[24]<<11|a[25]>>>21,Z=a[34]<<15|a[35]>>>17,$=a[35]<<15|a[34]>>>17,H=a[45]<<29|a[44]>>>3,I=a[44]<<29|a[45]>>>3,z=a[6]<<28|a[7]>>>4,A=a[7]<<28|a[6]>>>4,da=a[17]<<23|a[16]>>>9,ea=a[16]<<23|a[17]>>>9,N=a[26]<<25|a[27]>>>7,O=a[27]<<25|a[26]>>>7,v=a[36]<<21|a[37]>>>11,w=a[37]<<21|a[36]>>>11,_=a[47]<<24|a[46]>>>8,aa=a[46]<<24|a[47]>>>8,T=a[8]<<27|a[9]>>>5,U=a[9]<<27|a[8]>>>5,B=a[18]<<20|a[19]>>>12,C=a[19]<<20|a[18]>>>12,fa=a[29]<<7|a[28]>>>25,ga=a[28]<<7|a[29]>>>25,P=a[38]<<8|a[39]>>>24,Q=a[39]<<8|a[38]>>>24,x=a[48]<<14|a[49]>>>18,y=a[49]<<14|a[48]>>>18,a[0]=p^~r&t,a[1]=q^~s&u,a[10]=z^~B&D,a[11]=A^~C&E,a[20]=J^~L&N,a[21]=K^~M&O,a[30]=T^~V&X,a[31]=U^~W&Y,a[40]=ba^~da&fa,a[41]=ca^~ea&ga,a[2]=r^~t&v,a[3]=s^~u&w,a[12]=B^~D&F,a[13]=C^~E&G,a[22]=L^~N&P,a[23]=M^~O&Q,a[32]=V^~X&Z,a[33]=W^~Y&$,a[42]=da^~fa&ha,a[43]=ea^~ga&ia,a[4]=t^~v&x,a[5]=u^~w&y,a[14]=D^~F&H,a[15]=E^~G&I,a[24]=N^~P&R,a[25]=O^~Q&S,a[34]=X^~Z&_,a[35]=Y^~$&aa,a[44]=fa^~ha&ja,a[45]=ga^~ia&ka,a[6]=v^~x&p,a[7]=w^~y&q,a[16]=F^~H&z,a[17]=G^~I&A,a[26]=P^~R&J,a[27]=Q^~S&K,a[36]=Z^~_&T,a[37]=$^~aa&U,a[46]=ha^~ja&ba,a[47]=ia^~ka&ca,a[8]=x^~p&r,a[9]=y^~q&s,a[18]=H^~z&B,a[19]=I^~A&C,a[28]=R^~J&L,a[29]=S^~K&M,a[38]=_^~T&V,a[39]=aa^~U&W,a[48]=ja^~ba&da,a[49]=ka^~ca&ea,a[0]^=m[d],a[1]^=m[d+1]};if(g)b.exports=v;else for(var x=0;x<w.length;++x)e[w[x]]=v[w[x]]}()}).call(this,a("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:40}],39:[function(a,b,c){function d(a,b){if(!a)throw new Error(b||"Assertion failed")}b.exports=d,d.equal=function(a,b,c){if(a!=b)throw new Error(c||"Assertion failed: "+a+" != "+b)}},{}],40:[function(a,b,c){function d(){throw new Error("setTimeout has not been defined")}function e(){throw new Error("clearTimeout has not been defined")}function f(a){if(l===setTimeout)return setTimeout(a,0);if((l===d||!l)&&setTimeout)return l=setTimeout,setTimeout(a,0);try{return l(a,0)}catch(b){try{return l.call(null,a,0)}catch(b){return l.call(this,a,0)}}}function g(a){if(m===clearTimeout)return clearTimeout(a);if((m===e||!m)&&clearTimeout)return m=clearTimeout,clearTimeout(a);try{return m(a)}catch(b){try{return m.call(null,a)}catch(b){return m.call(this,a)}}}function h(){q&&o&&(q=!1,o.length?p=o.concat(p):r=-1,p.length&&i())}function i(){if(!q){var a=f(h);q=!0;for(var b=p.length;b;){for(o=p,p=[];++r<b;)o&&o[r].run();r=-1,b=p.length}o=null,q=!1,g(a)}}function j(a,b){this.fun=a,this.array=b}function k(){}var l,m,n=b.exports={};!function(){try{l="function"==typeof setTimeout?setTimeout:d}catch(a){l=d}try{m="function"==typeof clearTimeout?clearTimeout:e}catch(a){m=e}}();var o,p=[],q=!1,r=-1;n.nextTick=function(a){var b=new Array(arguments.length-1);if(arguments.length>1)for(var c=1;c<arguments.length;c++)b[c-1]=arguments[c];p.push(new j(a,b)),1!==p.length||q||f(i)},j.prototype.run=function(){this.fun.apply(null,this.array)},n.title="browser",n.browser=!0,n.env={},n.argv=[],n.version="",n.versions={},n.on=k,n.addListener=k,n.once=k,n.off=k,n.removeListener=k,n.removeAllListeners=k,n.emit=k,n.prependListener=k,n.prependOnceListener=k,n.listeners=function(a){return[]},n.binding=function(a){throw new Error("process.binding is not supported")},n.cwd=function(){return"/"},n.chdir=function(a){throw new Error("process.chdir is not supported")},n.umask=function(){return 0}},{}],41:[function(b,c,d){"use strict";!function(b){function e(a){function b(a){for(var b=0,m=a.length;m>=64;){var n,o,p,q,r,s=d,t=e,u=f,v=g,w=h,x=i,y=j,z=k;for(o=0;o<16;o++)p=b+4*o,l[o]=(255&a[p])<<24|(255&a[p+1])<<16|(255&a[p+2])<<8|255&a[p+3];for(o=16;o<64;o++)n=l[o-2],q=(n>>>17|n<<15)^(n>>>19|n<<13)^n>>>10,n=l[o-15],r=(n>>>7|n<<25)^(n>>>18|n<<14)^n>>>3,l[o]=(q+l[o-7]|0)+(r+l[o-16]|0)|0;for(o=0;o<64;o++)q=(((w>>>6|w<<26)^(w>>>11|w<<21)^(w>>>25|w<<7))+(w&x^~w&y)|0)+(z+(c[o]+l[o]|0)|0)|0,r=((s>>>2|s<<30)^(s>>>13|s<<19)^(s>>>22|s<<10))+(s&t^s&u^t&u)|0,z=y,y=x,x=w,w=v+q|0,v=u,u=t,t=s,s=q+r|0;d=d+s|0,e=e+t|0,f=f+u|0,g=g+v|0,h=h+w|0,i=i+x|0,j=j+y|0,k=k+z|0,b+=64,m-=64}}var c=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298],d=1779033703,e=3144134277,f=1013904242,g=2773480762,h=1359893119,i=2600822924,j=528734635,k=1541459225,l=new Array(64);b(a);var m,n=a.length%64,o=a.length/536870912|0,p=a.length<<3,q=n<56?56:120,r=a.slice(a.length-n,a.length);for(r.push(128),m=n+1;m<q;m++)r.push(0);return r.push(o>>>24&255),r.push(o>>>16&255),r.push(o>>>8&255),r.push(o>>>0&255),r.push(p>>>24&255),r.push(p>>>16&255),r.push(p>>>8&255),r.push(p>>>0&255),b(r),[d>>>24&255,d>>>16&255,d>>>8&255,d>>>0&255,e>>>24&255,e>>>16&255,e>>>8&255,e>>>0&255,f>>>24&255,f>>>16&255,f>>>8&255,f>>>0&255,g>>>24&255,g>>>16&255,g>>>8&255,g>>>0&255,h>>>24&255,h>>>16&255,h>>>8&255,h>>>0&255,i>>>24&255,i>>>16&255,i>>>8&255,i>>>0&255,j>>>24&255,j>>>16&255,j>>>8&255,j>>>0&255,k>>>24&255,k>>>16&255,k>>>8&255,k>>>0&255]}function f(a,b,c){function d(){for(var a=g-1;a>=g-4;a--){if(h[a]++,h[a]<=255)return;h[a]=0}}a=a.length<=64?a:e(a);var f,g=64+b.length+4,h=new Array(g),i=new Array(64),j=[];for(f=0;f<64;f++)h[f]=54;for(f=0;f<a.length;f++)h[f]^=a[f];for(f=0;f<b.length;f++)h[64+f]=b[f];for(f=g-4;f<g;f++)h[f]=0;for(f=0;f<64;f++)i[f]=92;for(f=0;f<a.length;f++)i[f]^=a[f];for(;c>=32;)d(),j=j.concat(e(i.concat(e(h)))),c-=32;return c>0&&(d(),j=j.concat(e(i.concat(e(h))).slice(0,c))),j}function g(a,b,c,d,e){var f;for(k(a,16*(2*c-1),e,0,16),f=0;f<2*c;f++)j(a,16*f,e,16),i(e,d),k(e,0,a,b+16*f,16);for(f=0;f<c;f++)k(a,b+2*f*16,a,16*f,16);for(f=0;f<c;f++)k(a,b+16*(2*f+1),a,16*(f+c),16)}function h(a,b){return a<<b|a>>>32-b}function i(a,b){k(a,0,b,0,16);for(var c=8;c>0;c-=2)b[4]^=h(b[0]+b[12],7),b[8]^=h(b[4]+b[0],9),b[12]^=h(b[8]+b[4],13),b[0]^=h(b[12]+b[8],18),b[9]^=h(b[5]+b[1],7),b[13]^=h(b[9]+b[5],9),b[1]^=h(b[13]+b[9],13),b[5]^=h(b[1]+b[13],18),b[14]^=h(b[10]+b[6],7),b[2]^=h(b[14]+b[10],9),b[6]^=h(b[2]+b[14],13),b[10]^=h(b[6]+b[2],18),b[3]^=h(b[15]+b[11],7),b[7]^=h(b[3]+b[15],9),b[11]^=h(b[7]+b[3],13),b[15]^=h(b[11]+b[7],18),b[1]^=h(b[0]+b[3],7),b[2]^=h(b[1]+b[0],9),b[3]^=h(b[2]+b[1],13),b[0]^=h(b[3]+b[2],18),b[6]^=h(b[5]+b[4],7),b[7]^=h(b[6]+b[5],9),b[4]^=h(b[7]+b[6],13),b[5]^=h(b[4]+b[7],18),b[11]^=h(b[10]+b[9],7),b[8]^=h(b[11]+b[10],9),b[9]^=h(b[8]+b[11],13),b[10]^=h(b[9]+b[8],18),b[12]^=h(b[15]+b[14],7),b[13]^=h(b[12]+b[15],9),b[14]^=h(b[13]+b[12],13),b[15]^=h(b[14]+b[13],18);for(c=0;c<16;++c)a[c]+=b[c]}function j(a,b,c,d){for(var e=0;e<d;e++)c[e]^=a[b+e]}function k(a,b,c,d,e){for(;e--;)c[d++]=a[b++]}function l(a){if(!a||"number"!=typeof a.length)return!1;for(var b=0;b<a.length;b++){if("number"!=typeof a[b])return!1;var c=parseInt(a[b]);if(c!=a[b]||c<0||c>=256)return!1}return!0}function m(a,b){var c=parseInt(a);if(a!=c)throw new Error("invalid "+b);return c}function n(a,b,c,d,e,h,i){if(!i)throw new Error("missing callback");if(c=m(c,"N"),d=m(d,"r"),e=m(e,"p"),h=m(h,"dkLen"),0===c||0!==(c&c-1))throw new Error("N must be power of 2");if(c>o/128/d)throw new Error("N too large");if(d>o/128/e)throw new Error("r too large");if(!l(a))throw new Error("password must be an array or buffer");if(!l(b))throw new Error("salt must be an array or buffer");for(var n=f(a,b,128*e*d),p=new Uint32Array(32*e*d),q=0;q<p.length;q++){var r=4*q;p[q]=(255&n[r+3])<<24|(255&n[r+2])<<16|(255&n[r+1])<<8|(255&n[r+0])<<0}var s,t,u=new Uint32Array(64*d),v=new Uint32Array(32*d*c),w=32*d,x=new Uint32Array(16),y=new Uint32Array(16),z=e*c*2,A=0,B=null,C=!1,D=0,E=0,F=parseInt(1e3/d),G="undefined"!=typeof setImmediate?setImmediate:setTimeout,H=function(){if(C)return i(new Error("cancelled"),A/z);switch(D){case 0:t=32*E*d,k(p,t,u,0,w),D=1,s=0;case 1:var b=c-s;b>F&&(b=F);for(var l=0;l<b;l++)k(u,0,v,(s+l)*w,w),g(u,w,d,x,y);s+=b,A+=b;var m=parseInt(1e3*A/z);if(m!==B){if(C=i(null,A/z))break;B=m}if(s<c)break;s=0,D=2;case 2:var b=c-s;b>F&&(b=F);for(var l=0;l<b;l++){var o=16*(2*d-1),q=u[o]&c-1;j(v,q*w,u,w),g(u,w,d,x,y)}s+=b,A+=b;var m=parseInt(1e3*A/z);if(m!==B){if(C=i(null,A/z))break;B=m}if(s<c)break;if(k(u,0,p,t,w),E++,E<e){D=0;break}n=[];for(var l=0;l<p.length;l++)n.push(p[l]>>0&255),n.push(p[l]>>8&255),n.push(p[l]>>16&255),n.push(p[l]>>24&255);var r=f(a,n,h);return i(null,1,r)}G(H)};H()}var o=2147483647;"undefined"!=typeof d?c.exports=n:"function"==typeof a&&a.amd?a(n):b&&(b.scrypt&&(b._scrypt=b.scrypt),b.scrypt=n)}(this)},{}],42:[function(a,b,c){(function(a,b){!function(b,c){"use strict";function d(a){return p[o]=e.apply(c,a),o++}function e(a){var b=[].slice.call(arguments,1);return function(){"function"==typeof a?a.apply(c,b):new Function(""+a)()}}function f(a){if(q)setTimeout(e(f,a),0);else{var b=p[a];if(b){q=!0;try{b()}finally{g(a),q=!1}}}}function g(a){delete p[a]}function h(){n=function(){var b=d(arguments);return a.nextTick(e(f,b)),b}}function i(){if(b.postMessage&&!b.importScripts){var a=!0,c=b.onmessage;return b.onmessage=function(){a=!1},b.postMessage("","*"),b.onmessage=c,a}}function j(){var a="setImmediate$"+Math.random()+"$",c=function(c){c.source===b&&"string"==typeof c.data&&0===c.data.indexOf(a)&&f(+c.data.slice(a.length))};b.addEventListener?b.addEventListener("message",c,!1):b.attachEvent("onmessage",c),n=function(){var c=d(arguments);return b.postMessage(a+c,"*"),c}}function k(){var a=new MessageChannel;a.port1.onmessage=function(a){var b=a.data;f(b)},n=function(){var b=d(arguments);return a.port2.postMessage(b),b}}function l(){var a=r.documentElement;n=function(){var b=d(arguments),c=r.createElement("script");return c.onreadystatechange=function(){f(b),c.onreadystatechange=null,a.removeChild(c),c=null},a.appendChild(c),b}}function m(){n=function(){var a=d(arguments);return setTimeout(e(f,a),0),a}}if(!b.setImmediate){var n,o=1,p={},q=!1,r=b.document,s=Object.getPrototypeOf&&Object.getPrototypeOf(b);s=s&&s.setTimeout?s:b,"[object process]"==={}.toString.call(b.process)?h():i()?j():b.MessageChannel?k():r&&"onreadystatechange"in r.createElement("script")?l():m(),s.setImmediate=n,s.clearImmediate=g}}("undefined"==typeof self?"undefined"==typeof b?this:b:self)}).call(this,a("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:40}],43:[function(a,b,c){(function(a){var c;if(a.crypto&&crypto.getRandomValues){var d=new Uint8Array(16);c=function(){return crypto.getRandomValues(d),d}}if(!c){var e=new Array(16);c=function(){for(var a,b=0;b<16;b++)0===(3&b)&&(a=4294967296*Math.random()),e[b]=a>>>((3&b)<<3)&255;return e}}b.exports=c}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],44:[function(a,b,c){function d(a,b,c){var d=b&&c||0,e=0;for(b=b||[],a.toLowerCase().replace(/[0-9a-f]{2}/g,function(a){e<16&&(b[d+e++]=j[a])});e<16;)b[d+e++]=0;return b}function e(a,b){var c=b||0,d=i;return d[a[c++]]+d[a[c++]]+d[a[c++]]+d[a[c++]]+"-"+d[a[c++]]+d[a[c++]]+"-"+d[a[c++]]+d[a[c++]]+"-"+d[a[c++]]+d[a[c++]]+"-"+d[a[c++]]+d[a[c++]]+d[a[c++]]+d[a[c++]]+d[a[c++]]+d[a[c++]]}function f(a,b,c){var d=b&&c||0,f=b||[];a=a||{};var g=void 0!==a.clockseq?a.clockseq:n,h=void 0!==a.msecs?a.msecs:(new Date).getTime(),i=void 0!==a.nsecs?a.nsecs:p+1,j=h-o+(i-p)/1e4;if(j<0&&void 0===a.clockseq&&(g=g+1&16383),(j<0||h>o)&&void 0===a.nsecs&&(i=0),i>=1e4)throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");o=h,p=i,n=g,h+=122192928e5;var k=(1e4*(268435455&h)+i)%4294967296;f[d++]=k>>>24&255,f[d++]=k>>>16&255,f[d++]=k>>>8&255,f[d++]=255&k;var l=h/4294967296*1e4&268435455;f[d++]=l>>>8&255,f[d++]=255&l,f[d++]=l>>>24&15|16,f[d++]=l>>>16&255,f[d++]=g>>>8|128,f[d++]=255&g;for(var q=a.node||m,r=0;r<6;r++)f[d+r]=q[r];return b?b:e(f)}function g(a,b,c){var d=b&&c||0;"string"==typeof a&&(b="binary"==a?new Array(16):null,a=null),a=a||{};var f=a.random||(a.rng||h)();if(f[6]=15&f[6]|64,f[8]=63&f[8]|128,b)for(var g=0;g<16;g++)b[d+g]=f[g];return b||e(f)}for(var h=a("./rng"),i=[],j={},k=0;k<256;k++)i[k]=(k+256).toString(16).substr(1),j[i[k]]=k;var l=h(),m=[1|l[0],l[1],l[2],l[3],l[4],l[5]],n=16383&(l[6]<<8|l[7]),o=0,p=0,q=g;q.v1=f,q.v4=g,q.parse=d,q.unparse=e,b.exports=q},{"./rng":43}],45:[function(a,b,c){b.exports={version:"3.0.21"}},{}],46:[function(a,b,c){"use strict";try{b.exports.XMLHttpRequest=XMLHttpRequest}catch(d){console.log("Warning: XMLHttpRequest is not defined"),b.exports.XMLHttpRequest=null}},{}],47:[function(a,b,c){"use strict";function d(a){var b=[];for(var c in a)if(null!=a[c]){var d=j.hexlify(a[c]);({gasLimit:!0,gasPrice:!0,nonce:!0,value:!0})[c]&&(d=j.hexStripZeros(d)),b.push(c+"="+d)}return b.join("&")}function e(a,b){i.call(this,a);var c=null;switch(this.name){case"homestead":c="https://api.etherscan.io";break;case"ropsten":c="https://api-ropsten.etherscan.io";break;case"rinkeby":c="https://api-rinkeby.etherscan.io";break;case"kovan":c="https://api-kovan.etherscan.io";break;default:throw new Error("unsupported network")}j.defineProperty(this,"baseUrl",c),j.defineProperty(this,"apiKey",b||null)}function f(a){if(0==a.status&&("No records found"===a.message||"No transactions found"===a.message))return a.result;if(1!=a.status||"OK"!=a.message){var b=new Error("invalid response");throw b.result=JSON.stringify(a),b}return a.result}function g(a){if("2.0"!=a.jsonrpc){var b=new Error("invalid response");throw b.result=JSON.stringify(a),b}if(a.error){var b=new Error(a.error.message||"unknown error");throw a.error.code&&(b.code=a.error.code),a.error.data&&(b.data=a.error.data),b}return a.result}function h(a){if("pending"===a)throw new Error("pending not supported");return"latest"===a?a:parseInt(a.substring(2),16)}var i=a("./provider.js"),j=function(){var b=a("../utils/convert.js");return{defineProperty:a("../utils/properties.js").defineProperty,hexlify:b.hexlify,hexStripZeros:b.hexStripZeros}}();i.inherits(e),j.defineProperty(e.prototype,"_call",function(){}),j.defineProperty(e.prototype,"_callProxy",function(){}),j.defineProperty(e.prototype,"perform",function(a,b){b||(b={});var c=this.baseUrl,e="";switch(this.apiKey&&(e+="&apikey="+this.apiKey),a){case"getBlockNumber":return c+="/api?module=proxy&action=eth_blockNumber"+e,i.fetchJSON(c,null,g);case"getGasPrice":return c+="/api?module=proxy&action=eth_gasPrice"+e,i.fetchJSON(c,null,g);case"getBalance":return c+="/api?module=account&action=balance&address="+b.address,c+="&tag="+b.blockTag+e,i.fetchJSON(c,null,f);case"getTransactionCount":return c+="/api?module=proxy&action=eth_getTransactionCount&address="+b.address,c+="&tag="+b.blockTag+e,i.fetchJSON(c,null,g);case"getCode":return c+="/api?module=proxy&action=eth_getCode&address="+b.address,c+="&tag="+b.blockTag+e,i.fetchJSON(c,null,g);case"getStorageAt":return c+="/api?module=proxy&action=eth_getStorageAt&address="+b.address,c+="&position="+b.position,c+="&tag="+b.blockTag+e,i.fetchJSON(c,null,g);case"sendTransaction":return c+="/api?module=proxy&action=eth_sendRawTransaction&hex="+b.signedTransaction,c+=e,i.fetchJSON(c,null,g);case"getBlock":if(b.blockTag)return c+="/api?module=proxy&action=eth_getBlockByNumber&tag="+b.blockTag,c+="&boolean=false",c+=e,i.fetchJSON(c,null,g);throw new Error("getBlock by blockHash not implmeneted");case"getTransaction":return c+="/api?module=proxy&action=eth_getTransactionByHash&txhash="+b.transactionHash,c+=e,i.fetchJSON(c,null,g);case"getTransactionReceipt":return c+="/api?module=proxy&action=eth_getTransactionReceipt&txhash="+b.transactionHash,c+=e,i.fetchJSON(c,null,g);case"call":var j=d(b.transaction);return j&&(j="&"+j),c+="/api?module=proxy&action=eth_call"+j,c+=e,i.fetchJSON(c,null,g);case"estimateGas":var j=d(b.transaction);return j&&(j="&"+j),c+="/api?module=proxy&action=eth_estimateGas&"+j,c+=e,i.fetchJSON(c,null,g);case"getLogs":c+="/api?module=logs&action=getLogs";try{if(b.filter.fromBlock&&(c+="&fromBlock="+h(b.filter.fromBlock)),b.filter.toBlock&&(c+="&toBlock="+h(b.filter.toBlock)),b.filter.address&&(c+="&address="+b.filter.address),b.filter.topics&&b.filter.topics.length>0){if(b.filter.topics.length>1)throw new Error("unsupported topic format");var k=b.filter.topics[0];if("string"!=typeof k||66!==k.length)throw new Error("unsupported topic0 format");c+="&topic0="+k}}catch(l){return Promise.reject(l)}c+=e;var m=this;return i.fetchJSON(c,null,f).then(function(a){var b={},c=Promise.resolve();return a.forEach(function(a){c=c.then(function(){if(null==a.blockHash)return a.blockHash=b[a.transactionHash],null==a.blockHash?m.getTransaction(a.transactionHash).then(function(c){b[a.transactionHash]=c.blockHash,a.blockHash=c.blockHash}):void 0})}),c.then(function(){return a})});case"getEtherPrice":return"homestead"!==this.name?Promise.resolve(0):(c+="/api?module=stats&action=ethprice",c+=e,i.fetchJSON(c,null,f).then(function(a){return parseFloat(a.ethusd)}))}return Promise.reject(new Error("not implemented - "+a))}),j.defineProperty(e.prototype,"getHistory",function(a,b,c){var d=this.baseUrl,e="";return this.apiKey&&(e+="&apikey="+this.apiKey),null==b&&(b=0),null==c&&(c=99999999),this.resolveName(a).then(function(a){return d+="/api?module=account&action=txlist&address="+a,d+="&startblock="+b,d+="&endblock="+c,d+="&sort=asc",i.fetchJSON(d,null,f).then(function(a){var b=[];return a.forEach(function(a){["contractAddress","to"].forEach(function(b){""==a[b]&&delete a[b]}),null==a.creates&&null!=a.contractAddress&&(a.creates=a.contractAddress);var c=i._formatters.checkTransactionResponse(a);a.timeStamp&&(c.timestamp=parseInt(a.timeStamp)),b.push(c)}),b})})}),b.exports=e},{"../utils/convert.js":61,"../utils/properties.js":70,"./provider.js":53}],48:[function(a,b,c){"use strict";function d(a){if(0===a.length)throw new Error("no providers");var b={};if(["chainId","ensAddress","name","testnet"].forEach(function(c){for(var d=1;d<a.length;d++)if(a[0][c]!==a[d][c])throw new Error("incompatible providers - "+c+" mismatch");b[c]=a[0][c]}),!(this instanceof d))throw new Error("missing new");f.call(this,b),a=a.slice(0),Object.defineProperty(this,"providers",{get:function(){return a.slice(0)}})}var e=a("inherits"),f=a("./provider.js"),g=function(){return{defineProperty:a("../utils/properties.js").defineProperty}}();e(d,f),g.defineProperty(d.prototype,"perform",function(a,b){var c=this.providers;return new Promise(function(d,e){function f(){if(!c.length)return void e(g);var h=c.shift();h.perform(a,b).then(function(a){d(a)},function(a){g||(g=a),f()})}var g=null;f()})}),b.exports=d},{"../utils/properties.js":70,"./provider.js":53,inherits:37}],49:[function(a,b,c){"use strict";function d(a){return new g([new i(a),new f(a)])}var e=a("./provider"),f=a("./etherscan-provider"),g=a("./fallback-provider"),h=a("./ipc-provider"),i=a("./infura-provider"),j=a("./json-rpc-provider"),k=a("./web3-provider"),c={EtherscanProvider:f,FallbackProvider:g,InfuraProvider:i,JsonRpcProvider:j,Web3Provider:k,isProvider:e.isProvider,networks:e.networks,getDefaultProvider:d,Provider:e};h&&(c.IpcProvider=h),b.exports=c},{"./etherscan-provider":47,"./fallback-provider":48,"./infura-provider":50,"./ipc-provider":62,"./json-rpc-provider":51,"./provider":53,"./web3-provider":54}],50:[function(a,b,c){"use strict";function d(a,b){h.checkNew(this,d),a=e.getNetwork(a);var c=null;switch(a.name){case"homestead":c="mainnet.infura.io";break;case"ropsten":c="ropsten.infura.io";break;case"rinkeby":c="rinkeby.infura.io";break;case"kovan":c="kovan.infura.io";break;default:throw new Error("unsupported network")}var i="https://"+c+"/"+(b||"");f.call(this,i,a),g.defineProperty(this,"apiAccessToken",b||null)}var e=a("./provider"),f=a("./json-rpc-provider"),g=function(){return{defineProperty:a("../utils/properties").defineProperty}}(),h=a("../utils/errors");f.inherits(d),g.defineProperty(d.prototype,"_startPending",function(){console.log("WARNING: INFURA does not support pending filters")}),g.defineProperty(d.prototype,"_stopPending",function(){}),g.defineProperty(d.prototype,"getSigner",function(a){h.throwError("INFURA does not support signing",h.UNSUPPORTED_OPERATION,{operation:"getSigner"})}),g.defineProperty(d.prototype,"listAccounts",function(){return Promise.resolve([])}),b.exports=d},{"../utils/errors":63,"../utils/properties":70,"./json-rpc-provider":51,"./provider":53}],51:[function(a,b,c){"use strict";function d(a){return new Promise(function(b){setTimeout(function(){b()},a)})}function e(a){if(a.error){var b=new Error(a.error.message);throw b.code=a.error.code,b.data=a.error.data,b}return a.result}function f(a){var b={};for(var c in a)b[c]=k.hexlify(a[c]);return["gasLimit","gasPrice","nonce","value"].forEach(function(a){b[a]&&(b[a]=k.hexStripZeros(b[a]))}),null!=b.gasLimit&&null==b.gas&&(b.gas=b.gasLimit,delete b.gasLimit),b}function g(a){return a?a.toLowerCase():a}function h(a,b){l.checkNew(this,h),k.defineProperty(this,"provider",a),b?(k.defineProperty(this,"address",b),k.defineProperty(this,"_syncAddress",!0)):(Object.defineProperty(this,"address",{enumerable:!0,get:function(){l.throwError("no sync sync address available; use getAddress",l.UNSUPPORTED_OPERATION,{operation:"address"})}}),k.defineProperty(this,"_syncAddress",!1))}function i(a,b){if(l.checkNew(this,i),1==arguments.length)if("string"==typeof a)try{b=j.getNetwork(a),a=null}catch(c){}else a&&null==a.url&&(b=a,a=null);j.call(this,b),a||(a="http://localhost:8545"),k.defineProperty(this,"url",a)}var j=a("./provider.js"),k=function(){var b=a("../utils/convert");return{defineProperty:a("../utils/properties").defineProperty,hexlify:b.hexlify,isHexString:b.isHexString,hexStripZeros:b.hexStripZeros,toUtf8Bytes:a("../utils/utf8").toUtf8Bytes,getAddress:a("../utils/address").getAddress}}(),l=a("../utils/errors");k.defineProperty(h.prototype,"getAddress",function(){return this._syncAddress?Promise.resolve(this.address):this.provider.send("eth_accounts",[]).then(function(a){return 0===a.length&&l.throwError("no accounts",l.UNSUPPORTED_OPERATION,{operation:"getAddress"}),k.getAddress(a[0])})}),k.defineProperty(h.prototype,"getBalance",function(a){var b=this.provider;return this.getAddress().then(function(c){return b.getBalance(c,a)})}),k.defineProperty(h.prototype,"getTransactionCount",function(a){var b=this.provider;return this.getAddress().then(function(c){return b.getTransactionCount(c,a)})}),k.defineProperty(h.prototype,"sendTransaction",function(a){var b=this.provider;return a=f(a),this.getAddress().then(function(c){return a.from=c.toLowerCase(),b.send("eth_sendTransaction",[a]).then(function(a){return new Promise(function(c,d){function e(){b.getTransaction(a).then(function(d){return d?(d.wait=function(){return b.waitForTransaction(a)},void c(d)):void setTimeout(e,1e3)})}e()})})})}),k.defineProperty(h.prototype,"signMessage",function(a){var b=this.provider,c="string"==typeof a?k.toUtf8Bytes(a):a;return this.getAddress().then(function(a){return b.send("eth_sign",[a.toLowerCase(),k.hexlify(c)])})}),k.defineProperty(h.prototype,"unlock",function(a){var b=this.provider;return this.getAddress().then(function(c){return b.send("personal_unlockAccount",[c.toLowerCase(),a,null])})}),j.inherits(i),k.defineProperty(i.prototype,"getSigner",function(a){return new h(this,a)}),k.defineProperty(i.prototype,"listAccounts",function(){return this.send("eth_accounts",[]).then(function(a){return a.forEach(function(b,c){a[c]=k.getAddress(b)}),a})}),k.defineProperty(i.prototype,"send",function(a,b){var c={method:a,params:b,id:42,jsonrpc:"2.0"};return j.fetchJSON(this.url,JSON.stringify(c),e)}),k.defineProperty(i.prototype,"perform",function(a,b){switch(a){case"getBlockNumber":return this.send("eth_blockNumber",[]);case"getGasPrice":return this.send("eth_gasPrice",[]);case"getBalance":return this.send("eth_getBalance",[g(b.address),b.blockTag]);case"getTransactionCount":return this.send("eth_getTransactionCount",[g(b.address),b.blockTag]);case"getCode":return this.send("eth_getCode",[g(b.address),b.blockTag]);case"getStorageAt":return this.send("eth_getStorageAt",[g(b.address),b.position,b.blockTag]);case"sendTransaction":return this.send("eth_sendRawTransaction",[b.signedTransaction]);case"getBlock":return b.blockTag?this.send("eth_getBlockByNumber",[b.blockTag,!1]):b.blockHash?this.send("eth_getBlockByHash",[b.blockHash,!1]):Promise.reject(new Error("invalid block tag or block hash"));case"getTransaction":return this.send("eth_getTransactionByHash",[b.transactionHash]);case"getTransactionReceipt":return this.send("eth_getTransactionReceipt",[b.transactionHash]);case"call":return this.send("eth_call",[f(b.transaction),"latest"]);case"estimateGas":return this.send("eth_estimateGas",[f(b.transaction)]);case"getLogs":return b.filter&&null!=b.filter.address&&(b.filter.address=g(b.filter.address)),this.send("eth_getLogs",[b.filter])}return Promise.reject(new Error("not implemented - "+a))}),k.defineProperty(i.prototype,"_startPending",function(){
    if(null==this._pendingFilter){var a=this,b=this.send("eth_newPendingTransactionFilter",[]);this._pendingFilter=b,b.then(function(c){function e(){a.send("eth_getFilterChanges",[c]).then(function(c){if(a._pendingFilter==b){var e=Promise.resolve();return c.forEach(function(b){a._emitted["t:"+b.toLowerCase()]="pending",e=e.then(function(){return a.getTransaction(b).then(function(b){a.emit("pending",b)})})}),e.then(function(){return d(1e3)})}}).then(function(){return a._pendingFilter!=b?void a.send("eth_uninstallFilter",[filterIf]):void setTimeout(function(){e()},0)})}return e(),c})}}),k.defineProperty(i.prototype,"_stopPending",function(){this._pendingFilter=null}),k.defineProperty(i,"_hexlifyTransaction",function(a){return f(a)}),b.exports=i},{"../utils/address":56,"../utils/convert":61,"../utils/errors":63,"../utils/properties":70,"../utils/utf8":76,"./provider.js":53}],52:[function(a,b,c){b.exports={unspecified:{chainId:0,name:"unspecified"},homestead:{chainId:1,ensAddress:"0x314159265dd8dbb310642f98f50c066173c1259b",name:"homestead"},mainnet:{chainId:1,ensAddress:"0x314159265dd8dbb310642f98f50c066173c1259b",name:"homestead"},morden:{chainId:2,name:"morden"},ropsten:{chainId:3,ensAddress:"0x112234455c3a32fd11230c42e7bccd4a84e02010",name:"ropsten"},testnet:{chainId:3,ensAddress:"0x112234455c3a32fd11230c42e7bccd4a84e02010",name:"ropsten"},rinkeby:{chainId:4,name:"rinkeby"},kovan:{chainId:42,name:"kovan"},classic:{chainId:61,name:"classic"}}},{}],53:[function(a,b,c){"use strict";function d(a){var b={};for(var c in a)b[c]=a[c];return b}function e(a,b){var c={};for(var d in a)try{var e=a[d](b[d]);void 0!==e&&(c[d]=e)}catch(f){throw f.checkKey=d,f.checkValue=b[d],f}return c}function f(a,b){return function(c){return null==c?b:a(c)}}function g(a,b){return function(c){return c?a(c):b}}function h(a){return function(b){if(!Array.isArray(b))throw new Error("not an array");var c=[];return b.forEach(function(b){c.push(a(b))}),c}}function i(a){if(!F.isHexString(a)||66!==a.length)throw new Error("invalid hash - "+a);return a}function j(a){return F.bigNumberify(a).toNumber()}function k(a){var b=F.bigNumberify(a);try{b=b.toNumber()}catch(c){b=null}return b}function l(a){if("boolean"==typeof a)return a;if("string"==typeof a){if("true"===a)return!0;if("false"===a)return!1}throw new Error("invaid boolean - "+a)}function m(a){if(!F.isHexString(a))throw new Error("invalid uint256");for(;a.length<66;)a="0x0"+a.substring(2);return a}function n(a){if(null==a)return"latest";if("earliest"===a)return"0x0";if("latest"===a||"pending"===a)return a;if("number"==typeof a)return F.hexStripZeros(F.hexlify(a));if(F.isHexString(a))return F.hexStripZeros(a);throw new Error("invalid blockTag")}function o(a){return null!=a.author&&null==a.miner&&(a.miner=a.author),e(H,a)}function p(a){if(null!=a.gas&&null==a.gasLimit&&(a.gasLimit=a.gas),a.to&&F.bigNumberify(a.to).isZero()&&(a.to="0x0000000000000000000000000000000000000000"),null!=a.input&&null==a.data&&(a.data=a.input),null==a.to&&null==a.creates&&(a.creates=F.getContractAddress(a)),!a.raw&&a.v&&a.r&&a.s){var b=[F.stripZeros(F.hexlify(a.nonce)),F.stripZeros(F.hexlify(a.gasPrice)),F.stripZeros(F.hexlify(a.gasLimit)),a.to||"0x",F.stripZeros(F.hexlify(a.value||"0x")),F.hexlify(a.data||"0x"),F.stripZeros(F.hexlify(a.v||"0x")),F.stripZeros(F.hexlify(a.r)),F.stripZeros(F.hexlify(a.s))];a.raw=F.RLP.encode(b)}var c=e(I,a),d=a.networkId;return F.isHexString(d)&&(d=F.bigNumberify(d).toNumber()),"number"!=typeof d&&null!=c.v&&(d=(c.v-35)/2,d<0&&(d=0),d=parseInt(d)),"number"!=typeof d&&(d=0),c.networkId=d,c.blockHash&&"x"===c.blockHash.replace(/0/g,"")&&(c.blockHash=null),c}function q(a){return e(J,a)}function r(a){return e(K,a)}function s(a){var b=(a.status,a.root,e(L,a));return b.logs.forEach(function(a,b){null==a.transactionLogIndex&&(a.transactionLogIndex=b)}),null!=a.status&&(b.byzantium=!0),b}function t(a){return Array.isArray(a)?a.forEach(function(a){t(a)}):null!=a&&i(a),a}function u(a){return e(M,a)}function v(a){return e(N,a)}function w(a){function b(){e.getBlockNumber().then(function(a){if(a!==f){null===f&&(f=a-1);for(var b=f+1;b<=a;b++)e._emitted.block<b&&(e._emitted.block=b,Object.keys(e._emitted).forEach(function(a){"block"!==a&&e._emitted[a]>b+12&&delete e._emitted[a]})),e.emit("block",b);var c={};Object.keys(d).forEach(function(b){var d=B(b);"transaction"===d.type?e.getTransaction(d.hash).then(function(a){a&&null!=a.blockNumber&&(e._emitted["t:"+a.hash.toLowerCase()]=a.blockNumber,e.emit(d.hash,a))}):"address"===d.type?(g[d.address]&&(c[d.address]=g[d.address]),e.getBalance(d.address,"latest").then(function(a){var b=g[d.address];b&&a.eq(b)||(g[d.address]=a,e.emit(d.address,a))})):"topic"===d.type&&e.getLogs({fromBlock:f+1,toBlock:a,topics:d.topic}).then(function(a){0!==a.length&&a.forEach(function(a){e._emitted["b:"+a.blockHash.toLowerCase()]=a.blockNumber,e._emitted["t:"+a.transactionHash.toLowerCase()]=a.blockNumber,e.emit(d.topic,a)})})}),f=a,g=c}}),e.doPoll()}if(!(this instanceof w))throw new Error("missing new");a=w.getNetwork(a);var c=null;a.ensAddress&&(c=F.getAddress(a.ensAddress)),F.defineProperty(this,"chainId",a.chainId),F.defineProperty(this,"ensAddress",c),F.defineProperty(this,"name",a.name);var d={};F.defineProperty(this,"_events",d),F.defineProperty(this,"_emitted",{block:-1});var e=this,f=null,g={};F.defineProperty(this,"resetEventsBlock",function(a){f=a,e.doPoll()});var h=4e3,i=null;Object.defineProperty(this,"polling",{get:function(){return null!=i},set:function(a){setTimeout(function(){a&&!i?i=setInterval(b,h):!a&&i&&(clearInterval(i),i=null)},0)}}),Object.defineProperty(this,"pollingInterval",{get:function(){return h},set:function(a){if("number"!=typeof a||a<=0||parseInt(a)!=a)throw new Error("invalid polling interval");h=a,i&&(clearInterval(i),i=setInterval(b,h))}})}function x(a){return function(b){C(b,a),F.defineProperty(b,"inherits",x(b))}}function y(a,b){return new Promise(function(c,d){function e(){b().then(function(b){if(b||a())c(b);else{f++;var d=500+250*parseInt(Math.random()*(1<<f));d>1e4&&(d=1e4),setTimeout(e,d)}},function(a){d(a)})}var f=0;e()})}function z(a,b){if(Array.isArray(a)){var c=[];return a.forEach(function(a){c.push(z(a,b))}),c}return b(a)}function A(a){try{return"address:"+F.getAddress(a)}catch(b){}if("block"===a)return"block";if("pending"===a)return"pending";if(F.isHexString(a)){if(66===a.length)return"tx:"+a}else if(Array.isArray(a)){a=z(a,function(a){return null==a&&(a="0x"),a});try{return"topic:"+F.RLP.encode(a)}catch(b){console.log(b)}}throw new Error("invalid event - "+a)}function B(a){if("tx:"===a.substring(0,3))return{type:"transaction",hash:a.substring(3)};if("block"===a)return{type:"block"};if("pending"===a)return{type:"pending"};if("address:"===a.substring(0,8))return{type:"address",address:a.substring(8)};if("topic:"===a.substring(0,6))try{var b=F.RLP.decode(a.substring(6));return b=z(b,function(a){return"0x"===a&&(a=null),a}),{type:"topic",topic:b}}catch(c){console.log(c)}throw new Error("invalid event string")}var C=a("inherits"),D=a("xmlhttprequest").XMLHttpRequest,E=a("./networks.json"),F=function(){var b=a("../utils/convert"),c=a("../utils/utf8");return{defineProperty:a("../utils/properties").defineProperty,getAddress:a("../utils/address").getAddress,getContractAddress:a("../utils/contract-address").getContractAddress,bigNumberify:a("../utils/bignumber").bigNumberify,arrayify:b.arrayify,hexlify:b.hexlify,isHexString:b.isHexString,concat:b.concat,hexStripZeros:b.hexStripZeros,stripZeros:b.stripZeros,base64:a("../utils/base64"),namehash:a("../utils/namehash"),toUtf8String:c.toUtf8String,toUtf8Bytes:c.toUtf8Bytes,RLP:a("../utils/rlp")}}(),G=a("../utils/errors"),H={hash:i,parentHash:i,number:j,timestamp:j,nonce:f(F.hexlify),difficulty:k,gasLimit:F.bigNumberify,gasUsed:F.bigNumberify,miner:F.getAddress,extraData:F.hexlify,transactions:f(h(i))},I={hash:i,blockHash:f(i,null),blockNumber:f(j,null),transactionIndex:f(j,null),from:F.getAddress,gasPrice:F.bigNumberify,gasLimit:F.bigNumberify,to:f(F.getAddress,null),value:F.bigNumberify,nonce:j,data:F.hexlify,r:f(m),s:f(m),v:f(j),creates:f(F.getAddress,null),raw:f(F.hexlify)},J={from:f(F.getAddress),nonce:f(j),gasLimit:f(F.bigNumberify),gasPrice:f(F.bigNumberify),to:f(F.getAddress),value:f(F.bigNumberify),data:f(F.hexlify)},K={transactionLogIndex:f(j),transactionIndex:j,blockNumber:j,transactionHash:i,address:F.getAddress,topics:h(i),data:F.hexlify,logIndex:j,blockHash:i},L={contractAddress:f(F.getAddress,null),transactionIndex:j,root:f(i),gasUsed:F.bigNumberify,logsBloom:f(F.hexlify),blockHash:i,transactionHash:i,logs:h(r),blockNumber:j,cumulativeGasUsed:F.bigNumberify,status:f(j)},M={fromBlock:f(n,void 0),toBlock:f(n,void 0),address:f(F.getAddress,void 0),topics:f(t,void 0)},N={blockNumber:f(j),blockHash:f(i),transactionIndex:j,removed:f(l),address:F.getAddress,data:g(F.hexlify,"0x"),topics:h(i),transactionHash:i,logIndex:j};F.defineProperty(w,"inherits",x(w)),F.defineProperty(w,"getNetwork",function(a){if("string"==typeof a){if(a=E[a],!a)throw new Error("unknown network")}else null==a&&(a=E.homestead);if("number"!=typeof a.chainId)throw new Error("invalid chainId");return a}),F.defineProperty(w,"networks",E),F.defineProperty(w,"fetchJSON",function(a,b,c){var d=[];if("object"==typeof a&&null!=a.url&&null!=a.user&&null!=a.password){"https:"!==a.url.substring(0,6)&&a.forceInsecure!==!0&&G.throwError("basic authentication requires a secure https url",G.INVALID_ARGUMENT,{arg:"url",url:a.url,user:a.user,password:"[REDACTED]"});var e=a.user+":"+a.password;d.push({key:"Authorization",value:"Basic "+F.base64.encode(F.toUtf8Bytes(e))}),a=a.url}return new Promise(function(e,f){var g=new D;b?(g.open("POST",a,!0),d.push({key:"Content-Type",value:"application/json"})):g.open("GET",a,!0),d.forEach(function(a){g.setRequestHeader(a.key,a.value)}),g.onreadystatechange=function(){if(4===g.readyState){try{var d=JSON.parse(g.responseText)}catch(h){var i=new Error("invalid json response");return i.orginialError=h,i.responseText=g.responseText,i.url=a,void f(i)}if(c)try{d=c(d)}catch(h){return h.url=a,h.body=b,h.responseText=g.responseText,void f(h)}if(200!=g.status){var h=new Error("invalid response - "+g.status);return h.statusCode=g.statusCode,void f(h)}e(d)}},g.onerror=function(a){f(a)};try{b?g.send(b):g.send()}catch(h){var i=new Error("connection error");i.error=h,f(i)}})}),F.defineProperty(w.prototype,"waitForTransaction",function(a,b){var c=this;return new Promise(function(d,e){function f(a){g&&clearTimeout(g),d(a)}var g=null;c.once(a,f),"number"==typeof b&&b>0&&(g=setTimeout(function(){c.removeListener(a,f),e(new Error("timeout"))},b))})}),F.defineProperty(w.prototype,"getBlockNumber",function(){try{return this.perform("getBlockNumber").then(function(a){var b=parseInt(a);if(b!=a)throw new Error("invalid response - getBlockNumber");return b})}catch(a){return Promise.reject(a)}}),F.defineProperty(w.prototype,"getGasPrice",function(){try{return this.perform("getGasPrice").then(function(a){return F.bigNumberify(a)})}catch(a){return Promise.reject(a)}}),F.defineProperty(w.prototype,"getBalance",function(a,b){var c=this;return this.resolveName(a).then(function(a){var d={address:a,blockTag:n(b)};return c.perform("getBalance",d).then(function(a){return F.bigNumberify(a)})})}),F.defineProperty(w.prototype,"getTransactionCount",function(a,b){var c=this;return this.resolveName(a).then(function(a){var d={address:a,blockTag:n(b)};return c.perform("getTransactionCount",d).then(function(a){var b=parseInt(a);if(b!=a)throw new Error("invalid response - getTransactionCount");return b})})}),F.defineProperty(w.prototype,"getCode",function(a,b){var c=this;return this.resolveName(a).then(function(a){var d={address:a,blockTag:n(b)};return c.perform("getCode",d).then(function(a){return F.hexlify(a)})})}),F.defineProperty(w.prototype,"getStorageAt",function(a,b,c){var d=this;return this.resolveName(a).then(function(a){var e={address:a,blockTag:n(c),position:F.hexStripZeros(F.hexlify(b))};return d.perform("getStorageAt",e).then(function(a){return F.hexlify(a)})})}),F.defineProperty(w.prototype,"sendTransaction",function(a){try{var b={signedTransaction:F.hexlify(a)};return this.perform("sendTransaction",b).then(function(a){if(a=F.hexlify(a),66!==a.length)throw new Error("invalid response - sendTransaction");return a})}catch(c){return Promise.reject(c)}}),F.defineProperty(w.prototype,"call",function(a){var b=this;return this._resolveNames(a,["to","from"]).then(function(a){var c={transaction:q(a)};return b.perform("call",c).then(function(a){return F.hexlify(a)})})}),F.defineProperty(w.prototype,"estimateGas",function(a){var b=this;return this._resolveNames(a,["to","from"]).then(function(a){var c={transaction:q(a)};return b.perform("estimateGas",c).then(function(a){return F.bigNumberify(a)})})}),F.defineProperty(w.prototype,"getBlock",function(a){var b=this;try{var c=F.hexlify(a);if(66===c.length)return y(function(){return null==b._emitted["b:"+c.toLowerCase()]},function(){return b.perform("getBlock",{blockHash:c}).then(function(a){return null==a?null:o(a)})})}catch(d){}try{var e=n(a);return y(function(){if(F.isHexString(e)){var a=parseInt(e.substring(2),16);return a>b._emitted.block}return!0},function(){return b.perform("getBlock",{blockTag:e}).then(function(a){return null==a?null:o(a)})})}catch(d){}return Promise.reject(new Error("invalid block hash or block tag"))}),F.defineProperty(w.prototype,"getTransaction",function(a){var b=this;try{var c={transactionHash:i(a)};return y(function(){return null==b._emitted["t:"+a.toLowerCase()]},function(){return b.perform("getTransaction",c).then(function(a){return null!=a&&(a=p(a)),a})})}catch(d){return Promise.reject(d)}}),F.defineProperty(w.prototype,"getTransactionReceipt",function(a){var b=this;try{var c={transactionHash:i(a)};return y(function(){return null==b._emitted["t:"+a.toLowerCase()]},function(){return b.perform("getTransactionReceipt",c).then(function(a){return null!=a&&(a=s(a)),a})})}catch(d){return Promise.reject(d)}}),F.defineProperty(w.prototype,"getLogs",function(a){var b=this;return this._resolveNames(a,["address"]).then(function(a){var c={filter:u(a)};return b.perform("getLogs",c).then(function(a){return h(v)(a)})})}),F.defineProperty(w.prototype,"getEtherPrice",function(){try{return this.perform("getEtherPrice",{}).then(function(a){return a})}catch(a){return Promise.reject(a)}}),F.defineProperty(w.prototype,"_resolveNames",function(a,b){var c=[],e=d(a);return b.forEach(function(a){void 0!==e[a]&&c.push(this.resolveName(e[a]).then(function(b){e[a]=b}))},this),Promise.all(c).then(function(){return e})}),F.defineProperty(w.prototype,"_getResolver",function(a){var b=F.namehash(a),c="0x0178b8bf"+b.substring(2),d={to:this.ensAddress,data:c};return this.call(d).then(function(a){return 66!=a.length?null:F.getAddress("0x"+a.substring(26))})}),F.defineProperty(w.prototype,"resolveName",function(a){try{return Promise.resolve(F.getAddress(a))}catch(b){}if(!this.ensAddress)throw new Error("network does not have ENS deployed");var c=this,d=F.namehash(a);return this._getResolver(a).then(function(a){var b="0x3b3b57de"+d.substring(2),e={to:a,data:b};return c.call(e)}).then(function(a){if(66!=a.length)return null;var b=F.getAddress("0x"+a.substring(26));return"0x0000000000000000000000000000000000000000"===b?null:b})}),F.defineProperty(w.prototype,"lookupAddress",function(a){if(!this.ensAddress)throw new Error("network does not have ENS deployed");a=F.getAddress(a);var b=a.substring(2)+".addr.reverse",c=F.namehash(b),d=this;return this._getResolver(b).then(function(a){if(!a)return null;var b="0x691f3431"+c.substring(2),e={to:a,data:b};return d.call(e)}).then(function(b){if(b=b.substring(2),b.length<64)return null;if(b=b.substring(64),b.length<64)return null;var c=F.bigNumberify("0x"+b.substring(0,64)).toNumber();if(b=b.substring(64),2*c>b.length)return null;var e=F.toUtf8String("0x"+b.substring(0,2*c));return d.resolveName(e).then(function(b){return b!=a?null:e})})}),F.defineProperty(w.prototype,"doPoll",function(){}),F.defineProperty(w.prototype,"perform",function(a,b){return Promise.reject(new Error("not implemented - "+a))}),F.defineProperty(w.prototype,"_startPending",function(){console.log("WARNING: this provider does not support pending events")}),F.defineProperty(w.prototype,"_stopPending",function(){}),F.defineProperty(w.prototype,"on",function(a,b){var c=A(a);this._events[c]||(this._events[c]=[]),this._events[c].push({eventName:a,listener:b,type:"on"}),"pending"===c&&this._startPending(),this.polling=!0}),F.defineProperty(w.prototype,"once",function(a,b){var c=A(a);this._events[c]||(this._events[c]=[]),this._events[c].push({eventName:a,listener:b,type:"once"}),"pending"===c&&this._startPending(),this.polling=!0}),F.defineProperty(w.prototype,"emit",function(a){var b=A(a),c=Array.prototype.slice.call(arguments,1),d=this._events[b];if(d){for(var e=0;e<d.length;e++){var f=d[e];"once"===f.type&&(d.splice(e,1),e--);try{f.listener.apply(this,c)}catch(g){console.log("Event Listener Error: "+g.message)}}0===d.length&&(delete this._events[b],"pending"===b&&this._stopPending()),0===this.listenerCount()&&(this.polling=!1)}}),F.defineProperty(w.prototype,"listenerCount",function(a){if(!a){var b=0;for(var c in this._events)b+=this._events[c].length;return b}var d=this._events[A(a)];return d?d.length:0}),F.defineProperty(w.prototype,"listeners",function(a){var b=this._events[A(a)];if(!b)return 0;for(var c=[],d=0;d<b.length;d++)c.push(b[d].listener);return c}),F.defineProperty(w.prototype,"removeAllListeners",function(a){delete this._events[A(a)],0===this.listenerCount()&&(this.polling=!1)}),F.defineProperty(w.prototype,"removeListener",function(a,b){var c=A(a),d=this._events[c];if(!d)return 0;for(var e=0;e<d.length;e++)if(d[e].listener===b){d.splice(e,1);break}0===d.length&&this.removeAllListeners(a)}),F.defineProperty(w,"_formatters",{checkTransactionResponse:p}),b.exports=w},{"../utils/address":56,"../utils/base64":58,"../utils/bignumber":57,"../utils/contract-address":60,"../utils/convert":61,"../utils/errors":63,"../utils/namehash":68,"../utils/properties":70,"../utils/rlp":71,"../utils/utf8":76,"./networks.json":52,inherits:37,xmlhttprequest:46}],54:[function(a,b,c){"use strict";function d(a,b){g.checkNew(this,d);var c=a.host||a.path||"unknown";null==b&&(b="homestead"),e.call(this,c,b),f.defineProperty(this,"_web3Provider",a)}var e=(a("./provider"),a("./json-rpc-provider")),f=function(){return{defineProperty:a("../utils/properties").defineProperty}}(),g=a("../utils/errors");e.inherits(d),f.defineProperty(d.prototype,"send",function(a,b){"eth_sign"==a&&this._web3Provider.isMetaMask&&(a="personal_sign",b=[b[1],b[0]]);var c=this._web3Provider;return new Promise(function(d,e){var f={method:a,params:b,id:42,jsonrpc:"2.0"};c.sendAsync(f,function(a,b){if(a)return void e(a);if(b.error){var a=new Error(b.error.message);return a.code=b.error.code,a.data=b.error.data,void e(a)}d(b.result)})})}),b.exports=d},{"../utils/errors":63,"../utils/properties":70,"./json-rpc-provider":51,"./provider":53}],55:[function(a,b,c){"use strict";function d(a){return a.match(/^uint($|[^1-9])/)?a="uint256"+a.substring(4):a.match(/^int($|[^1-9])/)&&(a="int256"+a.substring(3)),a}function e(a,b){function c(b){throw new Error('unexpected character "'+a[b]+'" at position '+b+' in "'+a+'"')}for(var e={type:"",name:"",state:{allowType:!0}},f=e,g=0;g<a.length;g++){var h=a[g];switch(h){case"(":f.state.allowParams||c(g),delete f.state.allowType,f.type=d(f.type),f.components=[{type:"",name:"",parent:f,state:{allowType:!0}}],f=f.components[0];break;case")":delete f.state,f.type=d(f.type);var i=f;f=f.parent,f||c(g),delete i.parent,delete f.state.allowParams,f.state.allowName=!0,f.state.allowArray=!0;break;case",":delete f.state,f.type=d(f.type);var j={type:"",name:"",parent:f.parent,state:{allowType:!0}};f.parent.components.push(j),delete f.parent,f=j;break;case" ":f.state.allowType&&""!==f.type&&(f.type=d(f.type),delete f.state.allowType,f.state.allowName=!0,f.state.allowParams=!0),f.state.allowName&&""!==f.name&&(b&&"indexed"===f.name?(f.indexed=!0,f.name=""):delete f.state.allowName);break;case"[":f.state.allowArray||c(g),f.type+=h,delete f.state.allowArray,delete f.state.allowName,f.state.readArray=!0;break;case"]":f.state.readArray||c(g),f.type+=h,delete f.state.readArray,f.state.allowArray=!0,f.state.allowName=!0;break;default:f.state.allowType?(f.type+=h,f.state.allowParams=!0,f.state.allowArray=!0):f.state.allowName?(f.name+=h,delete f.state.allowArray):f.state.readArray?f.type+=h:c(g)}}if(f.parent)throw new Error("unexpected eof");return delete e.state,e.type=d(e.type),e}function f(a){var b={anonymous:!1,inputs:[],type:"event"},c=a.match(A);if(!c)throw new Error("invalid event: "+a);if(b.name=c[1].trim(),p(c[2]).forEach(function(a){a=e(a,!0),a.indexed=!!a.indexed,b.inputs.push(a)}),c[3].split(" ").forEach(function(a){switch(a){case"anonymous":b.anonymous=!0;break;case"":break;default:console.log("unknown modifier: "+mdifier)}}),b.name&&!b.name.match(B))throw new Error('invalid identifier: "'+result.name+'"');return b}function g(a){var b={constant:!1,inputs:[],outputs:[],payable:!1,type:"function"},c=a.split(" returns "),d=c[0].match(A);if(!d)throw new Error("invalid signature");if(b.name=d[1].trim(),!b.name.match(B))throw new Error('invalid identifier: "'+d[1]+'"');if(p(d[2]).forEach(function(a){b.inputs.push(e(a))}),d[3].split(" ").forEach(function(a){switch(a){case"constant":b.constant=!0;break;case"payable":b.payable=!0;break;case"pure":b.constant=!0,b.stateMutability="pure";break;case"view":b.constant=!0,b.stateMutability="view";break;case"":break;default:console.log("unknown modifier: "+a)}}),c.length>1){var f=c[1].match(A);if(""!=f[1].trim()||""!=f[3].trim())throw new Error("unexpected tokens");p(f[2]).forEach(function(a){b.outputs.push(e(a))})}return b}function h(a){if("string"==typeof a)return a=a.replace(/\(/g," (").replace(/\)/g,") ").replace(/\s+/g," "),a=a.trim(),"event "===a.substring(0,6)?f(a.substring(6).trim()):("function "===a.substring(0,9)&&(a=a.substring(9)),g(a.trim()));throw new Error("unknown fragment")}function i(a){var b=parseInt(32*Math.ceil(a.length/32)),c=new Uint8Array(b-a.length);return u.concat([E.encode(a.length),a,c])}function j(a,b,c){a.length<b+32&&v.throwError("insufficient data for dynamicBytes length",v.INVALID_ARGUMENT,{arg:c,coderType:"dynamicBytes",value:u.hexlify(a.slice(b,b+32))});var d=E.decode(a,b).value;try{d=d.toNumber()}catch(e){v.throwError("dynamic bytes count too large",v.INVALID_ARGUMENT,{arg:c,coderType:"dynamicBytes",value:d.toString()})}return a.length<b+32+d&&v.throwError("insufficient data for dynamicBytes type",v.INVALID_ARGUMENT,{arg:c,coderType:"dynamicBytes",value:u.hexlify(a.slice(b,b+32+d))}),{consumed:parseInt(32+32*Math.ceil(d/32)),value:a.slice(b+32,b+32+d)}}function k(a){return parseInt(32*Math.ceil(a/32))}function l(a,b){if(Array.isArray(b));else if(b&&"object"==typeof b){var c=[];a.forEach(function(a){c.push(b[a.localName])}),b=c}else v.throwError("invalid tuple value",v.INVALID_ARGUMENT,{coderType:"tuple",type:typeof b,value:b});a.length!==b.length&&v.throwError("types/value length mismatch",v.INVALID_ARGUMENT,{coderType:"tuple",value:b});var d=[];a.forEach(function(a,c){d.push({dynamic:a.dynamic,value:a.encode(b[c])})});var e=0,f=0;d.forEach(function(a,b){a.dynamic?(e+=32,f+=k(a.value.length)):e+=k(a.value.length)});var g=0,h=e,i=new Uint8Array(e+f);return d.forEach(function(a,b){a.dynamic?(i.set(E.encode(h),g),g+=32,i.set(a.value,h),h+=k(a.value.length)):(i.set(a.value,g),g+=k(a.value.length))}),i}function m(a,b,c){var d=c,e=0,f=[];return a.forEach(function(a){if(a.dynamic){var g=E.decode(b,c),h=a.decode(b,d+g.value.toNumber());h.consumed=g.consumed}else var h=a.decode(b,c);void 0!=h.value&&f.push(h.value),c+=h.consumed,e+=h.consumed}),a.forEach(function(a,b){var c=a.localName;c&&("object"==typeof c&&(c=c.name),c&&("length"===c&&(c="_length"),null==f[c]&&(f[c]=f[b])))}),{value:f,consumed:e}}function n(a,b,c,d){var e=b.type+"["+(c>=0?c:"")+"]";return{coder:b,localName:d,length:c,name:"array",type:e,encode:function(a){Array.isArray(a)||v.throwError("expected array value",v.INVALID_ARGUMENT,{arg:d,coderType:"array",type:typeof a,value:a});var e=c,f=new Uint8Array(0);e===-1&&(e=a.length,f=E.encode(e)),e!==a.length&&error.throwError("array value length mismatch",v.INVALID_ARGUMENT,{arg:d,coderType:"array",count:a.length,expectedCount:e,value:a});var g=[];return a.forEach(function(a){g.push(b)}),u.concat([f,l(g,a)])},decode:function(f,g){var h=0,i=c;if(i===-1){try{var j=E.decode(f,g)}catch(k){v.throwError("insufficient data for dynamic array length",v.INVALID_ARGUMENT,{arg:d,coderType:"array",value:k.value})}try{i=j.value.toNumber()}catch(k){v.throwError("array count too large",v.INVALID_ARGUMENT,{arg:d,coderType:"array",value:j.value.toString()})}h+=j.consumed,g+=j.consumed}for(var l=[],n=0;n<i;n++)l.push(b);var o=m(l,f,g);return o.consumed+=h,o.value=a(e,o.value),o},dynamic:c===-1||b.dynamic}}function o(a,b,c){var d=!1,e=[];b.forEach(function(a){a.dynamic&&(d=!0),e.push(a.type)});var f="tuple("+e.join(",")+")";return{coders:b,localName:c,name:"tuple",type:f,encode:function(a){return l(b,a)},decode:function(c,d){var e=m(b,c,d);return e.value=a(f,e.value),e},dynamic:d}}function p(a){for(var b=[],c="",d=0,e=0;e<a.length;e++){var f=a[e];if(","===f&&0===d)b.push(c),c="";else if(c+=f,"("===f)d++;else if(")"===f&&(d--,d===-1))throw new Error("unbalanced parenthsis")}return b.push(c),b}function q(a,b,c){b||(b=[]);var d=[];return b.forEach(function(b){d.push(r(a,b))}),o(a,d,c)}function r(a,b){var c=K[b.type];if(c)return c(a,b.name);var d=b.type.match(x);if(d){var e=parseInt(d[2]||256);return(0===e||e>256||e%8!==0)&&v.throwError("invalid "+d[1]+" bit length",v.INVALID_ARGUMENT,{arg:"param",value:b}),D(a,e/8,"int"===d[1],b.name)}var d=b.type.match(w);if(d){var e=parseInt(d[1]);return(0===e||e>32)&&v.throwError("invalid bytes length",v.INVALID_ARGUMENT,{arg:"param",value:b}),G(a,e,b.name)}var d=b.type.match(y);if(d){var e=parseInt(d[2]||-1);return b.type=d[1],n(a,r(a,b),e,b.name)}return"tuple"===b.type.substring(0,5)?q(a,b.components,b.name):""===type?C(a):void v.throwError("invalid type",v.INVALID_ARGUMENT,{arg:"type",value:type})}function s(a){if(!(this instanceof s))throw new Error("missing new");a||(a=z),u.defineProperty(this,"coerceFunc",a)}function t(a,b){b&&("tuple"===a.type.substring(0,5)&&"string"!=typeof b&&(a.components.length!=b.names.length&&v.throwError("names/types length mismatch",v.INVALID_ARGUMENT,{count:{names:b.names.length,types:a.components.length},value:{names:b.names,types:a.components}}),b.names.forEach(function(b,c){t(a.components[c],b)}),b=b.name||""),a.name||"string"!=typeof b||(a.name=b))}var u=function(){var b=a("../utils/convert.js"),c=a("../utils/utf8.js");return{defineProperty:a("../utils/properties.js").defineProperty,arrayify:b.arrayify,padZeros:b.padZeros,bigNumberify:a("../utils/bignumber.js").bigNumberify,getAddress:a("../utils/address").getAddress,concat:b.concat,toUtf8Bytes:c.toUtf8Bytes,toUtf8String:c.toUtf8String,hexlify:b.hexlify}}(),v=a("./errors"),w=new RegExp(/^bytes([0-9]*)$/),x=new RegExp(/^(u?int)([0-9]*)$/),y=new RegExp(/^(.*)\[([0-9]*)\]$/),z=function(a,b){var c=a.match(x);return c&&parseInt(c[2])<=48?b.toNumber():b},A=new RegExp("^([^)(]*)\\((.*)\\)([^)(]*)$"),B=new RegExp("^[A-Za-z_][A-Za-z0-9_]*$"),C=function(a){return{name:"null",type:"",encode:function(a){return u.arrayify([])},decode:function(b,c){if(c>b.length)throw new Error("invalid null");return{consumed:0,value:a("null",void 0)}},dynamic:!1}},D=function(a,b,c,d){var e=(c?"int":"uint")+8*b;return{localName:d,name:e,type:e,encode:function(a){try{a=u.bigNumberify(a)}catch(e){v.throwError("invalid number value",v.INVALID_ARGUMENT,{arg:d,type:typeof a,value:a})}return a=a.toTwos(8*b).maskn(8*b),c&&(a=a.fromTwos(8*b).toTwos(256)),u.padZeros(u.arrayify(a),32)},decode:function(f,g){f.length<g+32&&v.throwError("insufficient data for "+e+" type",v.INVALID_ARGUMENT,{arg:d,coderType:e,value:u.hexlify(f.slice(g,g+32))});var h=32-b,i=u.bigNumberify(f.slice(g+h,g+32));return i=c?i.fromTwos(8*b):i.maskn(8*b),{consumed:32,value:a(e,i)}}}},E=D(function(a,b){return b},32,!1),F=function(a,b){return{localName:b,name:"bool",type:"bool",encode:function(a){return E.encode(a?1:0)},decode:function(c,d){try{var e=E.decode(c,d)}catch(f){throw"insufficient data for uint256 type"===f.reason&&v.throwError("insufficient data for boolean type",v.INVALID_ARGUMENT,{arg:b,coderType:"boolean",value:f.value}),f}return{consumed:e.consumed,value:a("boolean",!e.value.isZero())}}}},G=function(a,b,c){var d="bytes"+b;return{localName:c,name:d,type:d,encode:function(a){try{a=u.arrayify(a)}catch(e){v.throwError("invalid "+d+" value",v.INVALID_ARGUMENT,{arg:c,type:typeof a,value:e.value})}if(32===b)return a;var f=new Uint8Array(32);return f.set(a),f},decode:function(e,f){return e.length<f+32&&v.throwError("insufficient data for "+d+" type",v.INVALID_ARGUMENT,{arg:c,coderType:d,value:u.hexlify(e.slice(f,f+32))}),{consumed:32,value:a(d,u.hexlify(e.slice(f,f+b)))}}}},H=function(a,b){return{localName:b,name:"address",type:"address",encode:function(a){try{a=u.arrayify(u.getAddress(a))}catch(c){v.throwError("invalid address",v.INVALID_ARGUMENT,{arg:b,type:typeof a,value:a})}var d=new Uint8Array(32);return d.set(a,12),d},decode:function(c,d){return c.length<d+32&&v.throwError("insufficuent data for address type",v.INVALID_ARGUMENT,{arg:b,coderType:"address",value:u.hexlify(c.slice(d,d+32))}),{consumed:32,value:a("address",u.getAddress(u.hexlify(c.slice(d+12,d+32))))}}}},I=function(a,b){return{localName:b,name:"bytes",type:"bytes",encode:function(a){try{a=u.arrayify(a)}catch(c){v.throwError("invalid bytes value",v.INVALID_ARGUMENT,{arg:b,type:typeof a,value:c.value})}return i(a)},decode:function(c,d){var e=j(c,d,b);return e.value=a("bytes",u.hexlify(e.value)),e},dynamic:!0}},J=function(a,b){return{localName:b,name:"string",type:"string",encode:function(a){return"string"!=typeof a&&v.throwError("invalid string value",v.INVALID_ARGUMENT,{arg:b,type:typeof a,value:a}),i(u.toUtf8Bytes(a))},decode:function(c,d){var e=j(c,d,b);return e.value=a("string",u.toUtf8String(e.value)),e},dynamic:!0}},K={address:H,bool:F,string:J,bytes:I};u.defineProperty(s.prototype,"encode",function(a,b,c){arguments.length<3&&(c=b,b=a,a=[]),b.length!==c.length&&v.throwError("types/values length mismatch",v.INVALID_ARGUMENT,{count:{types:b.length,values:c.length},value:{types:b,values:c}});var d=[];return b.forEach(function(b,c){"string"==typeof b&&(b=e(b)),t(b,a[c]),d.push(r(this.coerceFunc,b))},this),u.hexlify(o(this.coerceFunc,d).encode(c))}),u.defineProperty(s.prototype,"decode",function(a,b,c){arguments.length<3&&(c=b,b=a,a=[]),c=u.arrayify(c);var d=[];return b.forEach(function(b,c){"string"==typeof b&&(b=e(b)),t(b,a[c]),d.push(r(this.coerceFunc,b))},this),o(this.coerceFunc,d).decode(c,0).value}),u.defineProperty(s,"defaultCoder",new s),u.defineProperty(s,"parseSignature",h),b.exports=s},{"../utils/address":56,"../utils/bignumber.js":57,"../utils/convert.js":61,"../utils/properties.js":70,"../utils/utf8.js":76,"./errors":63}],56:[function(a,b,c){function d(a){"string"==typeof a&&a.match(/^0x[0-9A-Fa-f]{40}$/)||i("invalid address",{input:a}),a=a.toLowerCase();for(var b=a.substring(2).split(""),c=0;c<b.length;c++)b[c]=b[c].charCodeAt(0);b=h.arrayify(j(b)),a=a.substring(2).split("");for(var c=0;c<40;c+=2)b[c>>1]>>4>=8&&(a[c]=a[c].toUpperCase()),(15&b[c>>1])>=8&&(a[c+1]=a[c+1].toUpperCase());return"0x"+a.join("")}function e(a){return Math.log10?Math.log10(a):Math.log(a)/Math.LN10}function f(a,b){var c=null;if("string"!=typeof a&&i("invalid address",{input:a}),a.match(/^(0x)?[0-9a-fA-F]{40}$/))"0x"!==a.substring(0,2)&&(a="0x"+a),c=d(a),a.match(/([A-F].*[a-f])|([a-f].*[A-F])/)&&c!==a&&i("invalid address checksum",{input:a,expected:c});else if(a.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)){for(a.substring(2,4)!==l(a)&&i("invalid address icap checksum",{
    input:a}),c=new g(a.substring(4),36).toString(16);c.length<40;)c="0"+c;c=d("0x"+c)}else i("invalid address",{input:a});if(b){for(var e=new g(c.substring(2),16).toString(36).toUpperCase();e.length<30;)e="0"+e;return"XE"+l("XE00"+e)+e}return c}var g=a("bn.js"),h=a("./convert"),i=a("./throw-error"),j=a("./keccak256"),k=9007199254740991,l=function(){for(var a={},b=0;b<10;b++)a[String(b)]=String(b);for(var b=0;b<26;b++)a[String.fromCharCode(65+b)]=String(10+b);var c=Math.floor(e(k));return function(b){b=b.toUpperCase(),b=b.substring(4)+b.substring(0,2)+"00";for(var d=b.split(""),e=0;e<d.length;e++)d[e]=a[d[e]];for(d=d.join("");d.length>=c;){var f=d.substring(0,c);d=parseInt(f,10)%97+d.substring(f.length)}for(var g=String(98-parseInt(d,10)%97);g.length<2;)g="0"+g;return g}}();b.exports={getAddress:f}},{"./convert":61,"./keccak256":67,"./throw-error":74,"bn.js":6}],57:[function(a,b,c){function d(a){if(!(this instanceof d))throw new Error("missing new");i.isHexString(a)?("0x"==a&&(a="0x0"),a=new g(a.substring(2),16)):"string"==typeof a&&"-"===a[0]&&i.isHexString(a.substring(1))?a=new g(a.substring(3),16).mul(d.constantNegativeOne._bn):"string"==typeof a&&a.match(/^-?[0-9]*$/)?(""==a&&(a="0"),a=new g(a)):"number"==typeof a&&parseInt(a)==a?a=new g(a):g.isBN(a)||(e(a)?a=a._bn:i.isArrayish(a)?a=new g(i.hexlify(a).substring(2),16):j("invalid BigNumber value",{input:a})),h(this,"_bn",a)}function e(a){return a._bn&&a._bn.mod}function f(a){return e(a)?a:new d(a)}var g=a("bn.js"),h=a("./properties").defineProperty,i=a("./convert"),j=a("./throw-error");h(d,"constantNegativeOne",f(-1)),h(d,"constantZero",f(0)),h(d,"constantOne",f(1)),h(d,"constantTwo",f(2)),h(d,"constantWeiPerEther",f(new g("1000000000000000000"))),h(d.prototype,"fromTwos",function(a){return new d(this._bn.fromTwos(a))}),h(d.prototype,"toTwos",function(a){return new d(this._bn.toTwos(a))}),h(d.prototype,"add",function(a){return new d(this._bn.add(f(a)._bn))}),h(d.prototype,"sub",function(a){return new d(this._bn.sub(f(a)._bn))}),h(d.prototype,"div",function(a){return new d(this._bn.div(f(a)._bn))}),h(d.prototype,"mul",function(a){return new d(this._bn.mul(f(a)._bn))}),h(d.prototype,"mod",function(a){return new d(this._bn.mod(f(a)._bn))}),h(d.prototype,"pow",function(a){return new d(this._bn.pow(f(a)._bn))}),h(d.prototype,"maskn",function(a){return new d(this._bn.maskn(a))}),h(d.prototype,"eq",function(a){return this._bn.eq(f(a)._bn)}),h(d.prototype,"lt",function(a){return this._bn.lt(f(a)._bn)}),h(d.prototype,"lte",function(a){return this._bn.lte(f(a)._bn)}),h(d.prototype,"gt",function(a){return this._bn.gt(f(a)._bn)}),h(d.prototype,"gte",function(a){return this._bn.gte(f(a)._bn)}),h(d.prototype,"isZero",function(){return this._bn.isZero()}),h(d.prototype,"toNumber",function(a){return this._bn.toNumber()}),h(d.prototype,"toString",function(){return this._bn.toString(10)}),h(d.prototype,"toHexString",function(){var a=this._bn.toString(16);return a.length%2&&(a="0"+a),"0x"+a}),b.exports={isBigNumber:e,bigNumberify:f,BigNumber:d}},{"./convert":61,"./properties":70,"./throw-error":74,"bn.js":6}],58:[function(a,b,c){"use strict";var d=a("./convert");b.exports={decode:function(a){a=atob(a);for(var b=[],c=0;c<a.length;c++)b.push(a.charCodeAt(c));return d.arrayify(b)},encode:function(a){a=d.arrayify(a);for(var b="",c=0;c<a.length;c++)b+=String.fromCharCode(a[c]);return btoa(b)}}},{"./convert":61}],59:[function(a,b,c){(function(c){"use strict";function d(a){if(a<=0||a>1024||parseInt(a)!=a)throw new Error("invalid length");var b=new Uint8Array(a);return g.getRandomValues(b),e.arrayify(b)}var e=a("./convert"),f=a("./properties").defineProperty,g=c.crypto||c.msCrypto;g&&g.getRandomValues||(console.log("WARNING: Missing strong random number source; using weak randomBytes"),g={getRandomValues:function(a){for(var b=0;b<20;b++)for(var c=0;c<a.length;c++)b?a[c]^=parseInt(256*Math.random()):a[c]=parseInt(256*Math.random());return a},_weakCrypto:!0}),g._weakCrypto===!0&&f(d,"_weakCrypto",!0),b.exports=d}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./convert":61,"./properties":70}],60:[function(a,b,c){function d(a){if(!a.from)throw new Error("missing from address");var b=a.nonce;return e("0x"+g(h.encode([e(a.from),f.stripZeros(f.hexlify(b,"nonce"))])).substring(26))}var e=a("./address").getAddress,f=a("./convert"),g=a("./keccak256"),h=a("./rlp");b.exports={getContractAddress:d}},{"./address":56,"./convert":61,"./keccak256":67,"./rlp":71}],61:[function(a,b,c){function d(a){return a.slice?a:(a.slice=function(){var b=Array.prototype.slice.call(arguments);return new Uint8Array(Array.prototype.slice.apply(a,b))},a)}function e(a){if(!a||parseInt(a.length)!=a.length||"string"==typeof a)return!1;for(var b=0;b<a.length;b++){var c=a[b];if(c<0||c>=256||parseInt(c)!=c)return!1}return!0}function f(a){if(null==a&&o.throwError("cannot convert null value to array",o.INVALID_ARGUMENT,{arg:"value",value:a}),a&&a.toHexString&&(a=a.toHexString()),j(a)){a=a.substring(2),a.length%2&&(a="0"+a);for(var b=[],c=0;c<a.length;c+=2)b.push(parseInt(a.substr(c,2),16));return d(new Uint8Array(b))}return"string"==typeof a&&(a.match(/^[0-9a-fA-F]*$/)&&o.throwError("hex string must have 0x prefix",o.INVALID_ARGUMENT,{arg:"value",value:a}),o.throwError("invalid hexidecimal string",o.INVALID_ARGUMENT,{arg:"value",value:a})),e(a)?d(new Uint8Array(a)):void o.throwError("invalid arrayify value",{arg:"value",value:a,type:typeof a})}function g(a){for(var b=[],c=0,e=0;e<a.length;e++){var g=f(a[e]);b.push(g),c+=g.length}for(var h=new Uint8Array(c),i=0,e=0;e<b.length;e++)h.set(b[e],i),i+=b[e].length;return d(h)}function h(a){if(a=f(a),0===a.length)return a;for(var b=0;0===a[b];)b++;return b&&(a=a.slice(b)),a}function i(a,b){if(a=f(a),b<a.length)throw new Error("cannot pad");var c=new Uint8Array(b);return c.set(a,b-a.length),d(c)}function j(a,b){return!("string"!=typeof a||!a.match(/^0x[0-9A-Fa-f]*$/))&&(!b||a.length===2+2*b)}function k(a){if(a&&a.toHexString)return a.toHexString();if("number"==typeof a){a<0&&o.throwError("cannot hexlify negative value",o.INVALID_ARG,{arg:"value",value:a});for(var b="";a;)b=p[15&a]+b,a=parseInt(a/16);return b.length?(b.length%2&&(b="0"+b),"0x"+b):"0x00"}if(j(a))return a.length%2&&(a="0x0"+a.substring(2)),a;if(e(a)){for(var c=[],d=0;d<a.length;d++){var f=a[d];c.push(p[(240&f)>>4]+p[15&f])}return"0x"+c.join("")}o.throwError("invalid hexlify value",{arg:"value",value:a})}function l(a){for(;a.length>3&&"0x0"===a.substring(0,3);)a="0x"+a.substring(3);return a}function m(a,b){for(;a.length<2*b+2;)a="0x0"+a.substring(2);return a}function n(a){if(a=f(a),65!==a.length)throw new Error("invalid signature");var b=a[64];return 27!==b&&28!==b&&(b=27+b%2),{r:k(a.slice(0,32)),s:k(a.slice(32,64)),v:b}}var o=(a("./properties.js").defineProperty,a("./errors")),p="0123456789abcdef";b.exports={arrayify:f,isArrayish:e,concat:g,padZeros:i,stripZeros:h,splitSignature:n,hexlify:k,isHexString:j,hexStripZeros:l,hexZeroPad:m}},{"./errors":63,"./properties.js":70}],62:[function(a,b,c){b.exports=void 0},{}],63:[function(a,b,c){"use strict";var d=a("./properties").defineProperty,e={};["UNKNOWN_ERROR","NOT_IMPLEMENTED","MISSING_NEW","CALL_EXCEPTION","INVALID_ARGUMENT","MISSING_ARGUMENT","UNEXPECTED_ARGUMENT","UNSUPPORTED_OPERATION"].forEach(function(a){d(e,a,a)}),d(e,"throwError",function(a,b,c){b||(b=e.UNKNOWN_ERROR),c||(c={});var d=[];Object.keys(c).forEach(function(a){try{d.push(a+"="+JSON.stringify(c[a]))}catch(b){d.push(a+"="+JSON.stringify(c[a].toString()))}});var f=a;d.length&&(a+=" ("+d.join(", ")+")");var g=new Error(a);throw g.reason=f,g.code=b,Object.keys(c).forEach(function(a){g[a]=c[a]}),g}),d(e,"checkNew",function(a,b){a instanceof b||e.throwError("missing new",e.MISSING_NEW,{name:b.name})}),b.exports=e},{"./properties":70}],64:[function(a,b,c){"use strict";function d(a){return a.buffer||(a=h.arrayify(a)),new f.hmac(g.createSha256,a)}function e(a){return a.buffer||(a=h.arrayify(a)),new f.hmac(g.createSha512,a)}var f=a("hash.js"),g=a("./sha2.js"),h=a("./convert.js");b.exports={createSha256Hmac:d,createSha512Hmac:e}},{"./convert.js":61,"./sha2.js":72,"hash.js":24}],65:[function(a,b,c){"use strict";function d(a){return e(f.toUtf8Bytes(a))}var e=a("./keccak256"),f=a("./utf8");b.exports=d},{"./keccak256":67,"./utf8":76}],66:[function(a,b,c){"use strict";var d=a("./address"),e=a("./abi-coder"),f=a("./base64"),g=a("./bignumber"),h=a("./contract-address"),i=a("./convert"),j=a("./id"),k=a("./keccak256"),l=a("./namehash"),m=a("./sha2").sha256,n=a("./solidity"),o=a("./random-bytes"),p=a("./properties"),q=a("./rlp"),r=a("./utf8"),s=a("./units");b.exports={AbiCoder:e,RLP:q,defineProperty:p.defineProperty,etherSymbol:"Îž",arrayify:i.arrayify,concat:i.concat,padZeros:i.padZeros,stripZeros:i.stripZeros,base64:f,bigNumberify:g.bigNumberify,BigNumber:g.BigNumber,hexlify:i.hexlify,toUtf8Bytes:r.toUtf8Bytes,toUtf8String:r.toUtf8String,namehash:l,id:j,getAddress:d.getAddress,getContractAddress:h.getContractAddress,formatEther:s.formatEther,parseEther:s.parseEther,formatUnits:s.formatUnits,parseUnits:s.parseUnits,keccak256:k,sha256:m,randomBytes:o,solidityPack:n.pack,solidityKeccak256:n.keccak256,soliditySha256:n.sha256,splitSignature:i.splitSignature}},{"./abi-coder":55,"./address":56,"./base64":58,"./bignumber":57,"./contract-address":60,"./convert":61,"./id":65,"./keccak256":67,"./namehash":68,"./properties":70,"./random-bytes":59,"./rlp":71,"./sha2":72,"./solidity":73,"./units":75,"./utf8":76}],67:[function(a,b,c){"use strict";function d(a){return a=f.arrayify(a),"0x"+e.keccak_256(a)}var e=a("js-sha3"),f=a("./convert.js");b.exports=d},{"./convert.js":61,"js-sha3":38}],68:[function(a,b,c){"use strict";function d(a,b){if(a=a.toLowerCase(),!a.match(j))throw new Error("contains invalid UseSTD3ASCIIRules characters");for(var c=h,d=0;a.length&&(!b||d<b);){var k=a.match(i),l=f.toUtf8Bytes(k[3]);c=g(e.concat([c,g(l)])),a=k[2]||"",d++}return e.hexlify(c)}var e=a("./convert"),f=a("./utf8"),g=a("./keccak256"),h=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],i=new RegExp("^((.*)\\.)?([^.]+)$"),j=new RegExp("^[a-z0-9.-]*$");b.exports=d},{"./convert":61,"./keccak256":67,"./utf8":76}],69:[function(a,b,c){"use strict";function d(a,b,c,d,f){var g,h=1,i=new Uint8Array(d),j=new Uint8Array(b.length+4);j.set(b);for(var k,l,m=1;m<=h;m++){j[b.length]=m>>24&255,j[b.length+1]=m>>16&255,j[b.length+2]=m>>8&255,j[b.length+3]=255&m;var n=f(a).update(j).digest();g||(g=n.length,l=new Uint8Array(g),h=Math.ceil(d/g),k=d-(h-1)*g),l.set(n);for(var o=1;o<c;o++){n=f(a).update(n).digest();for(var p=0;p<g;p++)l[p]^=n[p]}var q=(m-1)*g,r=m===h?k:g;i.set(e.arrayify(l).slice(0,r),q)}return e.arrayify(i)}var e=a("./convert");b.exports=d},{"./convert":61}],70:[function(a,b,c){"use strict";function d(a,b,c){Object.defineProperty(a,b,{enumerable:!0,value:c,writable:!1})}function e(a,b,c){var d=JSON.stringify(c);Object.defineProperty(a,b,{enumerable:!0,get:function(){return JSON.parse(d)}})}b.exports={defineFrozen:e,defineProperty:d}},{}],71:[function(a,b,c){function d(a){for(var b=[];a;)b.unshift(255&a),a>>=8;return b}function e(a,b,c){for(var d=0,e=0;e<c;e++)d=256*d+a[b+e];return d}function f(a){if(Array.isArray(a)){var b=[];if(a.forEach(function(a){b=b.concat(f(a))}),b.length<=55)return b.unshift(192+b.length),b;var c=d(b.length);return c.unshift(247+c.length),c.concat(b)}if(a=[].slice.call(k.arrayify(a)),1===a.length&&a[0]<=127)return a;if(a.length<=55)return a.unshift(128+a.length),a;var c=d(a.length);return c.unshift(183+c.length),c.concat(a)}function g(a){return k.hexlify(f(a))}function h(a,b,c,d){for(var e=[];c<b+1+d;){var f=i(a,c);if(e.push(f.result),c+=f.consumed,c>b+1+d)throw new Error("invalid rlp")}return{consumed:1+d,result:e}}function i(a,b){if(0===a.length)throw new Error("invalid rlp data");if(a[b]>=248){var c=a[b]-247;if(b+1+c>a.length)throw new Error("too short");var d=e(a,b+1,c);if(b+1+c+d>a.length)throw new Error("to short");return h(a,b,b+1+c,c+d)}if(a[b]>=192){var d=a[b]-192;if(b+1+d>a.length)throw new Error("invalid rlp data");return h(a,b,b+1,d)}if(a[b]>=184){var c=a[b]-183;if(b+1+c>a.length)throw new Error("invalid rlp data");var d=e(a,b+1,c);if(b+1+c+d>a.length)throw new Error("invalid rlp data");var f=k.hexlify(a.slice(b+1+c,b+1+c+d));return{consumed:1+c+d,result:f}}if(a[b]>=128){var d=a[b]-128;if(b+1+d>a.offset)throw new Error("invlaid rlp data");var f=k.hexlify(a.slice(b+1,b+1+d));return{consumed:1+d,result:f}}return{consumed:1,result:k.hexlify(a[b])}}function j(a){a=k.arrayify(a);var b=i(a,0);if(b.consumed!==a.length)throw new Error("invalid rlp data");return b.result}var k=a("./convert.js");b.exports={encode:g,decode:j}},{"./convert.js":61}],72:[function(a,b,c){"use strict";function d(a){return a=g.arrayify(a),"0x"+f.sha256().update(a).digest("hex")}function e(a){return a=g.arrayify(a),"0x"+f.sha512().update(a).digest("hex")}var f=a("hash.js"),g=a("./convert.js");b.exports={sha256:d,sha512:e,createSha256:f.sha256,createSha512:f.sha512}},{"./convert.js":61,"hash.js":24}],73:[function(a,b,c){"use strict";function d(a,b,c){switch(a){case"address":return c?i.padZeros(b,32):i.arrayify(b);case"string":return j.toUtf8Bytes(b);case"bytes":return i.arrayify(b);case"bool":return b=b?"0x01":"0x00",c?i.padZeros(b,32):i.arrayify(b)}var e=a.match(n);if(e){var f=("int"===e[1],parseInt(e[2]||"256"));if(f%8!=0||0===f||f>256)throw new Error("invalid number type - "+a);return c&&(f=256),b=h(b).toTwos(f),i.padZeros(b,f/8)}if(e=a.match(m)){var f=e[1];if(f!=parseInt(f)||0===f||f>32)throw new Error("invalid number type - "+a);if(f=parseInt(f),i.arrayify(b).byteLength!==f)throw new Error("invalid value for "+a);return c?(b+p).substring(0,66):b}if(e=a.match(o)){var g=e[1],k=parseInt(e[2]||b.length);if(k!=b.length)throw new Error("invalid value for "+a);var l=[];return b.forEach(function(a){a=d(g,a,!0),l.push(a)}),i.concat(l)}throw new Error("unknown type - "+a)}function e(a,b){if(a.length!=b.length)throw new Error("type/value count mismatch");var c=[];return a.forEach(function(a,e){c.push(d(a,b[e]))}),i.hexlify(i.concat(c))}function f(a,b){return k(e(a,b))}function g(a,b){return l(e(a,b))}var h=a("./bignumber").bigNumberify,i=a("./convert"),j=(a("./address").getAddress,a("./utf8")),k=a("./keccak256"),l=a("./sha2").sha256,m=new RegExp("^bytes([0-9]+)$"),n=new RegExp("^(u?int)([0-9]*)$"),o=new RegExp("^(.*)\\[([0-9]*)\\]$"),p="0000000000000000000000000000000000000000000000000000000000000000";b.exports={pack:e,keccak256:f,sha256:g}},{"./address":56,"./bignumber":57,"./convert":61,"./keccak256":67,"./sha2":72,"./utf8":76}],74:[function(a,b,c){"use strict";function d(a,b){var c=new Error(a);for(var d in b)c[d]=b[d];throw c}b.exports=d},{}],75:[function(a,b,c){function d(a,b,c){"object"!=typeof b||c||(c=b,b=void 0),null==b&&(b=18);var d=m(b);a=h(a),c||(c={});var e=a.lt(j);e&&(a=a.mul(k));for(var f=a.mod(d.tenPower).toString(10);f.length<d.decimals;)f="0"+f;c.pad||(f=f.match(/^([0-9]*[1-9]|0)(0*)/)[1]);var g=a.div(d.tenPower).toString(10);c.commify&&(g=g.replace(/\B(?=(\d{3})+(?!\d))/g,","));var a=g+"."+f;return e&&(a="-"+a),a}function e(a,b){null==b&&(b=18);var c=m(b);"string"==typeof a&&a.match(/^-?[0-9.,]+$/)||i("invalid value",{input:a});var a=a.replace(/,/g,""),d="-"===a.substring(0,1);d&&(a=a.substring(1)),"."===a&&i("invalid value",{input:a});var e=a.split(".");e.length>2&&i("too many decimal points",{input:a});var f=e[0],g=e[1];for(f||(f="0"),g||(g="0"),g.length>c.decimals&&i("too many decimal places",{input:a,decimals:g.length});g.length<c.decimals;)g+="0";f=h(f),g=h(g);var j=f.mul(c.tenPower).add(g);return d&&(j=j.mul(k)),j}function f(a,b){return d(a,18,b)}function g(a){return e(a,18)}var h=a("./bignumber.js").bigNumberify,i=a("./throw-error"),j=new h(0),k=new h((-1)),l=["wei","kwei","Mwei","Gwei","szabo","finny","ether"],m=function(){function a(a){return{decimals:a.length-1,tenPower:h(a)}}var b={},c="1";return l.forEach(function(d){var e=a(c);b[d.toLowerCase()]=e,b[String(e.decimals)]=e,c+="000"}),function(c){var d=b[String(c).toLowerCase()];if(!d&&"number"==typeof c&&parseInt(c)==c&&c>=0&&c<=256){for(var e="1",f=0;f<c;f++)e+="0";d=a(e)}return d||i("invalid unitType",{unitType:c}),d}}();b.exports={formatEther:f,parseEther:g,formatUnits:d,parseUnits:e}},{"./bignumber.js":57,"./throw-error":74}],76:[function(a,b,c){function d(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);e<128?b[c++]=e:e<2048?(b[c++]=e>>6|192,b[c++]=63&e|128):55296==(64512&e)&&d+1<a.length&&56320==(64512&a.charCodeAt(d+1))?(e=65536+((1023&e)<<10)+(1023&a.charCodeAt(++d)),b[c++]=e>>18|240,b[c++]=e>>12&63|128,b[c++]=e>>6&63|128,b[c++]=63&e|128):(b[c++]=e>>12|224,b[c++]=e>>6&63|128,b[c++]=63&e|128)}return f.arrayify(b)}function e(a){a=f.arrayify(a);for(var b="",c=0;c<a.length;){var d=a[c++];if(d>>7!=0){if(d>>6!=2){var e=null;if(d>>5==6)e=1;else if(d>>4==14)e=2;else if(d>>3==30)e=3;else if(d>>2==62)e=4;else{if(d>>1!=126)continue;e=5}if(c+e>a.length){for(;c<a.length&&a[c]>>6==2;c++);if(c!=a.length)continue;return b}var g,h=d&(1<<8-e-1)-1;for(g=0;g<e;g++){var i=a[c++];if(i>>6!=2)break;h=h<<6|63&i}g==e?h<=65535?b+=String.fromCharCode(h):(h-=65536,b+=String.fromCharCode((h>>10&1023)+55296,(1023&h)+56320)):c--}}else b+=String.fromCharCode(d)}return b}var f=a("./convert.js");b.exports={toUtf8Bytes:d,toUtf8String:e}},{"./convert.js":61}],77:[function(a,b,c){function d(a){return(1<<a)-1<<8-a}function e(a){return(1<<a)-1}function f(a,b,c,d){if(!(this instanceof f))throw new Error("missing new");m.defineProperty(this,"_keyPair",a),m.defineProperty(this,"privateKey",m.hexlify(a.priv.toArray("be",32))),m.defineProperty(this,"publicKey","0x"+a.getPublic(!0,"hex")),m.defineProperty(this,"chainCode",m.hexlify(b)),m.defineProperty(this,"index",c),m.defineProperty(this,"depth",d)}function g(a,b){if(b)if(b.normalize)b=b.normalize("NFKD");else for(var c=0;c<b.length;c++){var d=b.charCodeAt(c);if(d<32||d>127)throw new Error("passwords with non-ASCII characters not supported in this environment")}else b="";a=m.toUtf8Bytes(a,"NFKD");var e=m.toUtf8Bytes("mnemonic"+b,"NFKD");return m.hexlify(m.pbkdf2(a,e,2048,64,m.createSha512Hmac))}function h(a){var b=a.toLowerCase().split(" ");if(b.length%3!==0)throw new Error("invalid mnemonic");for(var c=m.arrayify(new Uint8Array(Math.ceil(11*b.length/8))),e=0,f=0;f<b.length;f++){var g=l.indexOf(b[f]);if(g===-1)throw new Error("invalid mnemonic");for(var h=0;h<11;h++)g&1<<10-h&&(c[e>>3]|=1<<7-e%8),e++}var i=32*b.length/3,j=b.length/3,k=d(j),n=m.arrayify(m.sha256(c.slice(0,i/8)))[0];if(n&=k,n!==(c[c.length-1]&k))throw new Error("invalid checksum");return m.hexlify(c.slice(0,i/8))}function i(a){if(a=m.arrayify(a),a.length%4!==0||a.length<16||a.length>32)throw new Error("invalid entropy");for(var b=[0],c=11,f=0;f<a.length;f++)c>8?(b[b.length-1]<<=8,b[b.length-1]|=a[f],c-=8):(b[b.length-1]<<=c,b[b.length-1]|=a[f]>>8-c,b.push(a[f]&e(8-c)),c+=3);var g=m.arrayify(m.sha256(a))[0],h=a.length/4;g&=d(h),b[b.length-1]<<=h,b[b.length-1]|=g>>8-h;for(var f=0;f<b.length;f++)b[f]=l[b[f]];return b.join(" ")}function j(a){try{return h(a),!0}catch(b){}return!1}var k=new(a("elliptic").ec)("secp256k1"),l=function(){var b=a("./words.json");return b.replace(/([A-Z])/g," $1").toLowerCase().substring(1).split(" ")}(),m=function(){var b=a("../utils/convert.js"),c=a("../utils/sha2"),d=a("../utils/hmac");return{defineProperty:a("../utils/properties.js").defineProperty,arrayify:b.arrayify,bigNumberify:a("../utils/bignumber.js").bigNumberify,hexlify:b.hexlify,toUtf8Bytes:a("../utils/utf8.js").toUtf8Bytes,sha256:c.sha256,createSha512Hmac:d.createSha512Hmac,pbkdf2:a("../utils/pbkdf2.js")}}(),n=m.toUtf8Bytes("Bitcoin seed"),o=2147483648;m.defineProperty(f.prototype,"_derive",function(a){if(!this.privateKey){if(a>=o)throw new Error("cannot derive child of neutered node");throw new Error("not implemented")}var b=new Uint8Array(37);a&o?b.set(m.arrayify(this.privateKey),1):b.set(this._keyPair.getPublic().encode(null,!0));for(var c=24;c>=0;c-=8)b[33+(c>>3)]=a>>24-c&255;var d=m.arrayify(m.createSha512Hmac(this.chainCode).update(b).digest()),e=m.bigNumberify(d.slice(0,32)),g=(d.slice(32),e.add("0x"+this._keyPair.getPrivate("hex")).mod("0x"+k.curve.n.toString(16)));return new f(k.keyFromPrivate(m.arrayify(g)),d.slice(32),a,this.depth+1)}),m.defineProperty(f.prototype,"derivePath",function(a){var b=a.split("/");if(0===b.length||"m"===b[0]&&0!==this.depth)throw new Error("invalid path");"m"===b[0]&&b.shift();for(var c=this,d=0;d<b.length;d++){var e=b[d];if(e.match(/^[0-9]+'$/)){var f=parseInt(e.substring(0,e.length-1));if(f>=o)throw new Error("invalid path index - "+e);c=c._derive(o+f)}else{if(!e.match(/^[0-9]+$/))throw new Error("invlaid path component - "+e);var f=parseInt(e);if(f>=o)throw new Error("invalid path index - "+e);c=c._derive(f)}}return c}),m.defineProperty(f,"fromMnemonic",function(a){return h(a),f.fromSeed(g(a))}),m.defineProperty(f,"fromSeed",function(a){if(a=m.arrayify(a),a.length<16||a.length>64)throw new Error("invalid seed");var b=m.arrayify(m.createSha512Hmac(n).update(a).digest());return new f(k.keyFromPrivate(b.slice(0,32)),b.slice(32),0,0,0)}),b.exports={fromMnemonic:f.fromMnemonic,fromSeed:f.fromSeed,mnemonicToEntropy:h,entropyToMnemonic:i,mnemonicToSeed:g,isValidMnemonic:j}},{"../utils/bignumber.js":57,"../utils/convert.js":61,"../utils/hmac":64,"../utils/pbkdf2.js":69,"../utils/properties.js":70,"../utils/sha2":72,"../utils/utf8.js":76,"./words.json":82,elliptic:9}],78:[function(a,b,c){"use strict";var d=a("./wallet"),e=a("./hdnode"),f=a("./signing-key");b.exports={HDNode:e,Wallet:d,SigningKey:f}},{"./hdnode":77,"./signing-key":80,"./wallet":81}],79:[function(a,b,c){"use strict";function d(a){return"string"==typeof a&&"0x"!==a.substring(0,2)&&(a="0x"+a),m.arrayify(a)}function e(a,b){for(a=String(a);a.length<b;)a="0"+a;return a}function f(a){return"string"==typeof a?m.toUtf8Bytes(a,"NFKC"):m.arrayify(a,"password")}function g(a,b){for(var c=a,d=b.toLowerCase().split("/"),e=0;e<d.length;e++){var f=null;for(var g in c)if(g.toLowerCase()===d[e]){f=c[g];break}if(null===f)return null;c=f}return c}var h=a("aes-js"),i=a("scrypt-js"),j=a("uuid"),k=a("../utils/hmac"),l=a("../utils/pbkdf2"),m=a("../utils"),n=a("./signing-key"),o=a("./hdnode"),p="m/44'/60'/0'/0/0",q={};m.defineProperty(q,"isCrowdsaleWallet",function(a){try{var b=JSON.parse(a)}catch(c){return!1}return b.encseed&&b.ethaddr}),m.defineProperty(q,"isValidWallet",function(a){try{var b=JSON.parse(a)}catch(c){return!1}return!(!b.version||parseInt(b.version)!==b.version||3!==parseInt(b.version))}),m.defineProperty(q,"decryptCrowdsale",function(a,b){var c=JSON.parse(a);b=f(b);var e=m.getAddress(g(c,"ethaddr")),i=d(g(c,"encseed"));if(!i||i.length%16!==0)throw new Error("invalid encseed");var j=l(b,b,2e3,32,k.createSha256Hmac).slice(0,16),o=i.slice(0,16),p=i.slice(16),q=new h.ModeOfOperation.cbc(j,o),r=m.arrayify(q.decrypt(p));r=h.padding.pkcs7.strip(r);for(var s="",t=0;t<r.length;t++)s+=String.fromCharCode(r[t]);var u=m.toUtf8Bytes(s),v=new n(m.keccak256(u));if(v.address!==e)throw new Error("corrupt crowdsale wallet");return v}),m.defineProperty(q,"decrypt",function(a,b,c){var e=JSON.parse(a);b=f(b);var j=function(a,b){var c=g(e,"crypto/cipher");if("aes-128-ctr"===c){var f=d(g(e,"crypto/cipherparams/iv"),"crypto/cipherparams/iv"),i=new h.Counter(f),j=new h.ModeOfOperation.ctr(a,i);return d(j.decrypt(b))}return null},q=function(a,b){return m.keccak256(m.concat([a,b]))},r=function(a,b){var c=d(g(e,"crypto/ciphertext")),f=m.hexlify(q(a.slice(16,32),c)).substring(2);if(f!==g(e,"crypto/mac").toLowerCase())return b(new Error("invalid password")),null;var i=j(a.slice(0,16),c),k=a.slice(32,64);if(!i)return b(new Error("unsupported cipher")),null;var l=new n(i);if(l.address!==m.getAddress(e.address))return b(new Error("address mismatch")),null;if("0.1"===g(e,"x-ethers/version")){var r=d(g(e,"x-ethers/mnemonicCiphertext"),"x-ethers/mnemonicCiphertext"),s=d(g(e,"x-ethers/mnemonicCounter"),"x-ethers/mnemonicCounter"),t=new h.Counter(s),u=new h.ModeOfOperation.ctr(k,t),v=g(e,"x-ethers/path")||p,w=d(u.decrypt(r)),x=o.entropyToMnemonic(w);if(o.fromMnemonic(x).derivePath(v).privateKey!=m.hexlify(i))return b(new Error("mnemonic mismatch")),null;l.mnemonic=x,l.path=v}return l};return new Promise(function(a,f){var h=g(e,"crypto/kdf");if(h&&"string"==typeof h)if("scrypt"===h.toLowerCase()){var j=d(g(e,"crypto/kdfparams/salt"),"crypto/kdfparams/salt"),m=parseInt(g(e,"crypto/kdfparams/n")),n=parseInt(g(e,"crypto/kdfparams/r")),o=parseInt(g(e,"crypto/kdfparams/p"));if(!m||!n||!o)return void f(new Error("unsupported key-derivation function parameters"));if(0!==(m&m-1))return void f(new Error("unsupported key-derivation function parameter value for N"));var p=parseInt(g(e,"crypto/kdfparams/dklen"));if(32!==p)return void f(new Error("unsupported key-derivation derived-key length"));i(b,j,m,n,o,64,function(b,e,g){if(b)b.progress=e,f(b);else if(g){g=d(g);var h=r(g,f);if(!h)return;c&&c(1),a(h)}else if(c)return c(e)})}else if("pbkdf2"===h.toLowerCase()){var j=d(g(e,"crypto/kdfparams/salt"),"crypto/kdfparams/salt"),q=null,s=g(e,"crypto/kdfparams/prf");if("hmac-sha256"===s)q=k.createSha256Hmac;else{if("hmac-sha512"!==s)return void f(new Error("unsupported prf"));q=k.createSha512Hmac}var t=parseInt(g(e,"crypto/kdfparams/c")),p=parseInt(g(e,"crypto/kdfparams/dklen"));if(32!==p)return void f(new Error("unsupported key-derivation derived-key length"));var u=l(b,j,t,p,q),v=r(u,f);if(!v)return;a(v)}else f(new Error("unsupported key-derivation function"));else f(new Error("unsupported key-derivation function"))})}),m.defineProperty(q,"encrypt",function(a,b,c,g){if("function"!=typeof c||g||(g=c,c={}),c||(c={}),a instanceof n&&(a=a.privateKey),a=d(a,"private key"),32!==a.length)throw new Error("invalid private key");b=f(b);var k=c.entropy;if(c.mnemonic)if(k){if(o.entropyToMnemonic(k)!==c.mnemonic)throw new Error("entropy and mnemonic mismatch")}else k=o.mnemonicToEntropy(c.mnemonic);k&&(k=d(k,"entropy"));var l=c.path;k&&!l&&(l=p);var q=c.client;q||(q="ethers.js");var r=c.salt;r=r?d(r,"salt"):m.randomBytes(32);var s=null;if(c.iv){if(s=d(c.iv,"iv"),16!==s.length)throw new Error("invalid iv")}else s=m.randomBytes(16);var t=c.uuid;if(t){if(t=d(t,"uuid"),16!==t.length)throw new Error("invalid uuid")}else t=m.randomBytes(16);var u=1<<17,v=8,w=1;return c.scrypt&&(c.scrypt.N&&(u=c.scrypt.N),c.scrypt.r&&(v=c.scrypt.r),c.scrypt.p&&(w=c.scrypt.p)),new Promise(function(c,f){i(b,r,u,v,w,64,function(b,i,l){if(b)b.progress=i,f(b);else if(l){l=d(l);var o=l.slice(0,16),p=l.slice(16,32),x=l.slice(32,64),y=new n(a).address,z=new h.Counter(s),A=new h.ModeOfOperation.ctr(o,z),B=m.arrayify(A.encrypt(a)),C=m.keccak256(m.concat([p,B])),D={address:y.substring(2).toLowerCase(),id:j.v4({random:t}),version:3,Crypto:{cipher:"aes-128-ctr",cipherparams:{iv:m.hexlify(s).substring(2)},ciphertext:m.hexlify(B).substring(2),kdf:"scrypt",kdfparams:{salt:m.hexlify(r).substring(2),n:u,dklen:32,p:w,r:v},mac:C.substring(2)}};if(k){var E=m.randomBytes(16),F=new h.Counter(E),G=new h.ModeOfOperation.ctr(x,F),H=m.arrayify(G.encrypt(k)),I=new Date,J=I.getUTCFullYear()+"-"+e(I.getUTCMonth()+1,2)+"-"+e(I.getUTCDate(),2)+"T"+e(I.getUTCHours(),2)+"-"+e(I.getUTCMinutes(),2)+"-"+e(I.getUTCSeconds(),2)+".0Z";D["x-ethers"]={client:q,gethFilename:"UTC--"+J+"--"+D.address,mnemonicCounter:m.hexlify(E).substring(2),mnemonicCiphertext:m.hexlify(H).substring(2),version:"0.1"}}g&&g(1),c(JSON.stringify(D))}else if(g)return g(i)})})}),b.exports=q},{"../utils":66,"../utils/hmac":64,"../utils/pbkdf2":69,"./hdnode":77,"./signing-key":80,"aes-js":5,"scrypt-js":41,uuid:44}],80:[function(a,b,c){"use strict";function d(a){g.checkNew(this,d);try{a=f.arrayify(a),32!==a.length&&g.throwError("exactly 32 bytes required",g.INVALID_ARGUMENT,{value:a})}catch(b){var c={arg:"privateKey",reason:b.reason,value:"[REDACTED]"};b.value&&("number"==typeof b.value.length&&(c.length=b.value.length),c.type=typeof b.value),g.throwError("invalid private key",b.code,c)}f.defineProperty(this,"privateKey",f.hexlify(a));var h=e.keyFromPrivate(a);f.defineProperty(this,"publicKey","0x"+h.getPublic(!0,"hex"));var i=d.publicKeyToAddress("0x"+h.getPublic(!1,"hex"));f.defineProperty(this,"address",i),f.defineProperty(this,"signDigest",function(a){var b=h.sign(f.arrayify(a),{canonical:!0});return{recoveryParam:b.recoveryParam,r:"0x"+b.r.toString(16),s:"0x"+b.s.toString(16)}})}var e=new(a("elliptic").ec)("secp256k1"),f=function(){var b=a("../utils/convert");return{defineProperty:a("../utils/properties").defineProperty,arrayify:b.arrayify,hexlify:b.hexlify,getAddress:a("../utils/address").getAddress,keccak256:a("../utils/keccak256")}}(),g=a("../utils/errors");f.defineProperty(d,"recover",function(a,b,c,g){var h={r:f.arrayify(b),s:f.arrayify(c)},i=e.recoverPubKey(f.arrayify(a),h,g);return d.publicKeyToAddress("0x"+i.encode("hex",!1))}),f.defineProperty(d,"getPublicKey",function(a,b){if(a=f.arrayify(a),b=!!b,32===a.length){var c=e.keyFromPrivate(a);return"0x"+c.getPublic(b,"hex")}if(33===a.length){var c=e.keyFromPublic(a);return"0x"+c.getPublic(b,"hex")}if(65===a.length){var c=e.keyFromPublic(a);return"0x"+c.getPublic(b,"hex")}throw new Error("invalid value")}),f.defineProperty(d,"publicKeyToAddress",function(a){return a="0x"+d.getPublicKey(a,!1).slice(4),f.getAddress("0x"+f.keccak256(a).substring(26))}),b.exports=d},{"../utils/address":56,"../utils/convert":61,"../utils/errors":63,"../utils/keccak256":67,"../utils/properties":70,elliptic:9}],81:[function(a,b,c){"use strict";function d(a,b){g.checkNew(this,d);var c=a;a instanceof j||(c=new j(a)),f.defineProperty(this,"privateKey",c.privateKey),Object.defineProperty(this,"provider",{enumerable:!0,get:function(){return b},set:function(a){b=a}}),b&&(this.provider=b);var e=15e5;Object.defineProperty(this,"defaultGasLimit",{enumerable:!0,get:function(){return e},set:function(a){if("number"!=typeof a)throw new Error("invalid defaultGasLimit");e=a}}),f.defineProperty(this,"address",c.address),f.defineProperty(this,"sign",function(a){var b=a.chainId;null==b&&this.provider&&(b=this.provider.chainId),b||(b=0);var d=[];l.forEach(function(b){var c=a[b.name]||[];if(c=f.arrayify(f.hexlify(c),b.name),b.length&&c.length!==b.length&&c.length>0){var e=new Error("invalid "+b.name);throw e.reason="wrong length",e.value=c,e}if(b.maxLength&&(c=f.stripZeros(c),c.length>b.maxLength)){var e=new Error("invalid "+b.name);throw e.reason="too long",e.value=c,e}d.push(f.hexlify(c))}),b&&(d.push(f.hexlify(b)),d.push("0x"),d.push("0x"));var e=f.keccak256(f.RLP.encode(d)),g=c.signDigest(e),h=27+g.recoveryParam;return b&&(d.pop(),d.pop(),d.pop(),h+=2*b+8),d.push(f.hexlify(h)),d.push(g.r),d.push(g.s),f.RLP.encode(d)})}var e=a("scrypt-js"),f=function(){var b=a("../utils/convert");return{defineProperty:a("../utils/properties").defineProperty,arrayify:b.arrayify,concat:b.concat,hexlify:b.hexlify,stripZeros:b.stripZeros,hexZeroPad:b.hexZeroPad,bigNumberify:a("../utils/bignumber").bigNumberify,toUtf8Bytes:a("../utils/utf8").toUtf8Bytes,getAddress:a("../utils/address").getAddress,keccak256:a("../utils/keccak256"),randomBytes:a("../utils").randomBytes,RLP:a("../utils/rlp")}}(),g=a("../utils/errors"),h=a("./hdnode"),i=a("./secret-storage"),j=a("./signing-key");a("setimmediate");var k="m/44'/60'/0'/0/0",l=[{name:"nonce",maxLength:32},{name:"gasPrice",maxLength:32},{name:"gasLimit",maxLength:32},{name:"to",length:20},{name:"value",maxLength:32},{name:"data"}];f.defineProperty(d,"parseTransaction",function(a){a=f.hexlify(a,"rawTransaction");var b=f.RLP.decode(a);if(9!==b.length)throw new Error("invalid transaction");var c=[],d={};l.forEach(function(a,e){d[a.name]=b[e],c.push(b[e])}),d.to&&("0x"==d.to?delete d.to:d.to=f.getAddress(d.to)),["gasPrice","gasLimit","nonce","value"].forEach(function(a){d[a]&&(0===d[a].length?d[a]=f.bigNumberify(0):d[a]=f.bigNumberify(d[a]))}),d.nonce?d.nonce=d.nonce.toNumber():d.nonce=0;var e=f.arrayify(b[6]),g=f.arrayify(b[7]),h=f.arrayify(b[8]);
    if(e.length>=1&&g.length>=1&&g.length<=32&&h.length>=1&&h.length<=32){d.v=f.bigNumberify(e).toNumber(),d.r=b[7],d.s=b[8];var i=(d.v-35)/2;i<0&&(i=0),i=parseInt(i),d.chainId=i;var k=d.v-27;i&&(c.push(f.hexlify(i)),c.push("0x"),c.push("0x"),k-=2*i+8);var m=f.keccak256(f.RLP.encode(c));try{d.from=j.recover(m,g,h,k)}catch(n){console.log(n)}}return d}),f.defineProperty(d.prototype,"getAddress",function(){return this.address}),f.defineProperty(d.prototype,"getBalance",function(a){if(!this.provider)throw new Error("missing provider");return this.provider.getBalance(this.address,a)}),f.defineProperty(d.prototype,"getTransactionCount",function(a){if(!this.provider)throw new Error("missing provider");return this.provider.getTransactionCount(this.address,a)}),f.defineProperty(d.prototype,"estimateGas",function(a){if(!this.provider)throw new Error("missing provider");var b={};return["from","to","data","value"].forEach(function(c){null!=a[c]&&(b[c]=a[c])}),null==a.from&&(b.from=this.address),this.provider.estimateGas(b)}),f.defineProperty(d.prototype,"sendTransaction",function(a){if(!this.provider)throw new Error("missing provider");if(!a||"object"!=typeof a)throw new Error("invalid transaction object");var b=a.gasLimit;null==b&&(b=this.defaultGasLimit);var c=this,e=null;e=a.gasPrice?Promise.resolve(a.gasPrice):this.provider.getGasPrice();var g=null;g=a.nonce?Promise.resolve(a.nonce):this.provider.getTransactionCount(c.address,"pending");var h=this.provider.chainId,i=null;i=a.to?this.provider.resolveName(a.to):Promise.resolve(void 0);var j=f.hexlify(a.data||"0x"),k=f.hexlify(a.value||0);return Promise.all([e,g,i]).then(function(a){var e=c.sign({to:a[2],data:j,gasLimit:b,gasPrice:a[0],nonce:a[1],value:k,chainId:h});return c.provider.sendTransaction(e).then(function(a){var b=d.parseTransaction(e);return b.hash=a,b.wait=function(){return c.provider.waitForTransaction(a)},b})})}),f.defineProperty(d.prototype,"send",function(a,b,c){return c||(c={}),this.sendTransaction({to:a,gasLimit:c.gasLimit,gasPrice:c.gasPrice,nonce:c.nonce,value:b})}),f.defineProperty(d,"hashMessage",function(a){var b=f.concat([f.toUtf8Bytes("Ethereum Signed Message:\n"),f.toUtf8Bytes(String(a.length)),"string"==typeof a?f.toUtf8Bytes(a):a]);return f.keccak256(b)}),f.defineProperty(d.prototype,"signMessage",function(a){var b=new j(this.privateKey),c=b.signDigest(d.hashMessage(a));return f.hexZeroPad(c.r,32)+f.hexZeroPad(c.s,32).substring(2)+(c.recoveryParam?"1c":"1b")}),f.defineProperty(d,"verifyMessage",function(a,b){if(b=f.hexlify(b),132!=b.length)throw new Error("invalid signature");var c=d.hashMessage(a),e=parseInt(b.substring(130),16);if(e>=27&&(e-=27),e<0)throw new Error("invalid signature");return j.recover(c,b.substring(0,66),"0x"+b.substring(66,130),e)}),f.defineProperty(d.prototype,"encrypt",function(a,b,c){if("function"!=typeof b||c||(c=b,b={}),c&&"function"!=typeof c)throw new Error("invalid callback");if(b||(b={}),this.mnemonic){var d={};for(var e in b)d[e]=b[e];b=d,b.mnemonic=this.mnemonic,b.path=this.path}return i.encrypt(this.privateKey,a,b,c)}),f.defineProperty(d,"isEncryptedWallet",function(a){return i.isValidWallet(a)||i.isCrowdsaleWallet(a)}),f.defineProperty(d,"createRandom",function(a){var b=f.randomBytes(16);a||(a={}),a.extraEntropy&&(b=f.keccak256(f.concat([b,a.extraEntropy])).substring(0,34));var c=h.entropyToMnemonic(b);return d.fromMnemonic(c,a.path)}),f.defineProperty(d,"fromEncryptedWallet",function(a,b,c){if(c&&"function"!=typeof c)throw new Error("invalid callback");return new Promise(function(e,g){if(i.isCrowdsaleWallet(a))try{var h=i.decryptCrowdsale(a,b);e(new d(h))}catch(j){g(j)}else i.isValidWallet(a)?i.decrypt(a,b,c).then(function(a){var b=new d(a);a.mnemonic&&a.path&&(f.defineProperty(b,"mnemonic",a.mnemonic),f.defineProperty(b,"path",a.path)),e(b)},function(a){g(a)}):g("invalid wallet JSON")})}),f.defineProperty(d,"fromMnemonic",function(a,b){b||(b=k);var c=h.fromMnemonic(a).derivePath(b),e=new d(c.privateKey);return f.defineProperty(e,"mnemonic",a),f.defineProperty(e,"path",b),e}),f.defineProperty(d,"fromBrainWallet",function(a,b,c){if(c&&"function"!=typeof c)throw new Error("invalid callback");return a="string"==typeof a?f.toUtf8Bytes(a,"NFKC"):f.arrayify(a,"password"),b="string"==typeof b?f.toUtf8Bytes(b,"NFKC"):f.arrayify(b,"password"),new Promise(function(g,h){e(b,a,1<<18,8,1,32,function(a,b,e){if(a)h(a);else if(e)g(new d(f.hexlify(e)));else if(c)return c(b)})})}),b.exports=d},{"../utils":66,"../utils/address":56,"../utils/bignumber":57,"../utils/convert":61,"../utils/errors":63,"../utils/keccak256":67,"../utils/properties":70,"../utils/rlp":71,"../utils/utf8":76,"./hdnode":77,"./secret-storage":79,"./signing-key":80,"scrypt-js":41,setimmediate:42}],82:[function(a,b,c){b.exports="AbandonAbilityAbleAboutAboveAbsentAbsorbAbstractAbsurdAbuseAccessAccidentAccountAccuseAchieveAcidAcousticAcquireAcrossActActionActorActressActualAdaptAddAddictAddressAdjustAdmitAdultAdvanceAdviceAerobicAffairAffordAfraidAgainAgeAgentAgreeAheadAimAirAirportAisleAlarmAlbumAlcoholAlertAlienAllAlleyAllowAlmostAloneAlphaAlreadyAlsoAlterAlwaysAmateurAmazingAmongAmountAmusedAnalystAnchorAncientAngerAngleAngryAnimalAnkleAnnounceAnnualAnotherAnswerAntennaAntiqueAnxietyAnyApartApologyAppearAppleApproveAprilArchArcticAreaArenaArgueArmArmedArmorArmyAroundArrangeArrestArriveArrowArtArtefactArtistArtworkAskAspectAssaultAssetAssistAssumeAsthmaAthleteAtomAttackAttendAttitudeAttractAuctionAuditAugustAuntAuthorAutoAutumnAverageAvocadoAvoidAwakeAwareAwayAwesomeAwfulAwkwardAxisBabyBachelorBaconBadgeBagBalanceBalconyBallBambooBananaBannerBarBarelyBargainBarrelBaseBasicBasketBattleBeachBeanBeautyBecauseBecomeBeefBeforeBeginBehaveBehindBelieveBelowBeltBenchBenefitBestBetrayBetterBetweenBeyondBicycleBidBikeBindBiologyBirdBirthBitterBlackBladeBlameBlanketBlastBleakBlessBlindBloodBlossomBlouseBlueBlurBlushBoardBoatBodyBoilBombBoneBonusBookBoostBorderBoringBorrowBossBottomBounceBoxBoyBracketBrainBrandBrassBraveBreadBreezeBrickBridgeBriefBrightBringBriskBroccoliBrokenBronzeBroomBrotherBrownBrushBubbleBuddyBudgetBuffaloBuildBulbBulkBulletBundleBunkerBurdenBurgerBurstBusBusinessBusyButterBuyerBuzzCabbageCabinCableCactusCageCakeCallCalmCameraCampCanCanalCancelCandyCannonCanoeCanvasCanyonCapableCapitalCaptainCarCarbonCardCargoCarpetCarryCartCaseCashCasinoCastleCasualCatCatalogCatchCategoryCattleCaughtCauseCautionCaveCeilingCeleryCementCensusCenturyCerealCertainChairChalkChampionChangeChaosChapterChargeChaseChatCheapCheckCheeseChefCherryChestChickenChiefChildChimneyChoiceChooseChronicChuckleChunkChurnCigarCinnamonCircleCitizenCityCivilClaimClapClarifyClawClayCleanClerkCleverClickClientCliffClimbClinicClipClockClogCloseClothCloudClownClubClumpClusterClutchCoachCoastCoconutCodeCoffeeCoilCoinCollectColorColumnCombineComeComfortComicCommonCompanyConcertConductConfirmCongressConnectConsiderControlConvinceCookCoolCopperCopyCoralCoreCornCorrectCostCottonCouchCountryCoupleCourseCousinCoverCoyoteCrackCradleCraftCramCraneCrashCraterCrawlCrazyCreamCreditCreekCrewCricketCrimeCrispCriticCropCrossCrouchCrowdCrucialCruelCruiseCrumbleCrunchCrushCryCrystalCubeCultureCupCupboardCuriousCurrentCurtainCurveCushionCustomCuteCycleDadDamageDampDanceDangerDaringDashDaughterDawnDayDealDebateDebrisDecadeDecemberDecideDeclineDecorateDecreaseDeerDefenseDefineDefyDegreeDelayDeliverDemandDemiseDenialDentistDenyDepartDependDepositDepthDeputyDeriveDescribeDesertDesignDeskDespairDestroyDetailDetectDevelopDeviceDevoteDiagramDialDiamondDiaryDiceDieselDietDifferDigitalDignityDilemmaDinnerDinosaurDirectDirtDisagreeDiscoverDiseaseDishDismissDisorderDisplayDistanceDivertDivideDivorceDizzyDoctorDocumentDogDollDolphinDomainDonateDonkeyDonorDoorDoseDoubleDoveDraftDragonDramaDrasticDrawDreamDressDriftDrillDrinkDripDriveDropDrumDryDuckDumbDuneDuringDustDutchDutyDwarfDynamicEagerEagleEarlyEarnEarthEasilyEastEasyEchoEcologyEconomyEdgeEditEducateEffortEggEightEitherElbowElderElectricElegantElementElephantElevatorEliteElseEmbarkEmbodyEmbraceEmergeEmotionEmployEmpowerEmptyEnableEnactEndEndlessEndorseEnemyEnergyEnforceEngageEngineEnhanceEnjoyEnlistEnoughEnrichEnrollEnsureEnterEntireEntryEnvelopeEpisodeEqualEquipEraEraseErodeErosionErrorEruptEscapeEssayEssenceEstateEternalEthicsEvidenceEvilEvokeEvolveExactExampleExcessExchangeExciteExcludeExcuseExecuteExerciseExhaustExhibitExileExistExitExoticExpandExpectExpireExplainExposeExpressExtendExtraEyeEyebrowFabricFaceFacultyFadeFaintFaithFallFalseFameFamilyFamousFanFancyFantasyFarmFashionFatFatalFatherFatigueFaultFavoriteFeatureFebruaryFederalFeeFeedFeelFemaleFenceFestivalFetchFeverFewFiberFictionFieldFigureFileFilmFilterFinalFindFineFingerFinishFireFirmFirstFiscalFishFitFitnessFixFlagFlameFlashFlatFlavorFleeFlightFlipFloatFlockFloorFlowerFluidFlushFlyFoamFocusFogFoilFoldFollowFoodFootForceForestForgetForkFortuneForumForwardFossilFosterFoundFoxFragileFrameFrequentFreshFriendFringeFrogFrontFrostFrownFrozenFruitFuelFunFunnyFurnaceFuryFutureGadgetGainGalaxyGalleryGameGapGarageGarbageGardenGarlicGarmentGasGaspGateGatherGaugeGazeGeneralGeniusGenreGentleGenuineGestureGhostGiantGiftGiggleGingerGiraffeGirlGiveGladGlanceGlareGlassGlideGlimpseGlobeGloomGloryGloveGlowGlueGoatGoddessGoldGoodGooseGorillaGospelGossipGovernGownGrabGraceGrainGrantGrapeGrassGravityGreatGreenGridGriefGritGroceryGroupGrowGruntGuardGuessGuideGuiltGuitarGunGymHabitHairHalfHammerHamsterHandHappyHarborHardHarshHarvestHatHaveHawkHazardHeadHealthHeartHeavyHedgehogHeightHelloHelmetHelpHenHeroHiddenHighHillHintHipHireHistoryHobbyHockeyHoldHoleHolidayHollowHomeHoneyHoodHopeHornHorrorHorseHospitalHostHotelHourHoverHubHugeHumanHumbleHumorHundredHungryHuntHurdleHurryHurtHusbandHybridIceIconIdeaIdentifyIdleIgnoreIllIllegalIllnessImageImitateImmenseImmuneImpactImposeImproveImpulseInchIncludeIncomeIncreaseIndexIndicateIndoorIndustryInfantInflictInformInhaleInheritInitialInjectInjuryInmateInnerInnocentInputInquiryInsaneInsectInsideInspireInstallIntactInterestIntoInvestInviteInvolveIronIslandIsolateIssueItemIvoryJacketJaguarJarJazzJealousJeansJellyJewelJobJoinJokeJourneyJoyJudgeJuiceJumpJungleJuniorJunkJustKangarooKeenKeepKetchupKeyKickKidKidneyKindKingdomKissKitKitchenKiteKittenKiwiKneeKnifeKnockKnowLabLabelLaborLadderLadyLakeLampLanguageLaptopLargeLaterLatinLaughLaundryLavaLawLawnLawsuitLayerLazyLeaderLeafLearnLeaveLectureLeftLegLegalLegendLeisureLemonLendLengthLensLeopardLessonLetterLevelLiarLibertyLibraryLicenseLifeLiftLightLikeLimbLimitLinkLionLiquidListLittleLiveLizardLoadLoanLobsterLocalLockLogicLonelyLongLoopLotteryLoudLoungeLoveLoyalLuckyLuggageLumberLunarLunchLuxuryLyricsMachineMadMagicMagnetMaidMailMainMajorMakeMammalManManageMandateMangoMansionManualMapleMarbleMarchMarginMarineMarketMarriageMaskMassMasterMatchMaterialMathMatrixMatterMaximumMazeMeadowMeanMeasureMeatMechanicMedalMediaMelodyMeltMemberMemoryMentionMenuMercyMergeMeritMerryMeshMessageMetalMethodMiddleMidnightMilkMillionMimicMindMinimumMinorMinuteMiracleMirrorMiseryMissMistakeMixMixedMixtureMobileModelModifyMomMomentMonitorMonkeyMonsterMonthMoonMoralMoreMorningMosquitoMotherMotionMotorMountainMouseMoveMovieMuchMuffinMuleMultiplyMuscleMuseumMushroomMusicMustMutualMyselfMysteryMythNaiveNameNapkinNarrowNastyNationNatureNearNeckNeedNegativeNeglectNeitherNephewNerveNestNetNetworkNeutralNeverNewsNextNiceNightNobleNoiseNomineeNoodleNormalNorthNoseNotableNoteNothingNoticeNovelNowNuclearNumberNurseNutOakObeyObjectObligeObscureObserveObtainObviousOccurOceanOctoberOdorOffOfferOfficeOftenOilOkayOldOliveOlympicOmitOnceOneOnionOnlineOnlyOpenOperaOpinionOpposeOptionOrangeOrbitOrchardOrderOrdinaryOrganOrientOriginalOrphanOstrichOtherOutdoorOuterOutputOutsideOvalOvenOverOwnOwnerOxygenOysterOzonePactPaddlePagePairPalacePalmPandaPanelPanicPantherPaperParadeParentParkParrotPartyPassPatchPathPatientPatrolPatternPausePavePaymentPeacePeanutPearPeasantPelicanPenPenaltyPencilPeoplePepperPerfectPermitPersonPetPhonePhotoPhrasePhysicalPianoPicnicPicturePiecePigPigeonPillPilotPinkPioneerPipePistolPitchPizzaPlacePlanetPlasticPlatePlayPleasePledgePluckPlugPlungePoemPoetPointPolarPolePolicePondPonyPoolPopularPortionPositionPossiblePostPotatoPotteryPovertyPowderPowerPracticePraisePredictPreferPreparePresentPrettyPreventPricePridePrimaryPrintPriorityPrisonPrivatePrizeProblemProcessProduceProfitProgramProjectPromoteProofPropertyProsperProtectProudProvidePublicPuddingPullPulpPulsePumpkinPunchPupilPuppyPurchasePurityPurposePursePushPutPuzzlePyramidQualityQuantumQuarterQuestionQuickQuitQuizQuoteRabbitRaccoonRaceRackRadarRadioRailRainRaiseRallyRampRanchRandomRangeRapidRareRateRatherRavenRawRazorReadyRealReasonRebelRebuildRecallReceiveRecipeRecordRecycleReduceReflectReformRefuseRegionRegretRegularRejectRelaxReleaseReliefRelyRemainRememberRemindRemoveRenderRenewRentReopenRepairRepeatReplaceReportRequireRescueResembleResistResourceResponseResultRetireRetreatReturnReunionRevealReviewRewardRhythmRibRibbonRiceRichRideRidgeRifleRightRigidRingRiotRippleRiskRitualRivalRiverRoadRoastRobotRobustRocketRomanceRoofRookieRoomRoseRotateRoughRoundRouteRoyalRubberRudeRugRuleRunRunwayRuralSadSaddleSadnessSafeSailSaladSalmonSalonSaltSaluteSameSampleSandSatisfySatoshiSauceSausageSaveSayScaleScanScareScatterSceneSchemeSchoolScienceScissorsScorpionScoutScrapScreenScriptScrubSeaSearchSeasonSeatSecondSecretSectionSecuritySeedSeekSegmentSelectSellSeminarSeniorSenseSentenceSeriesServiceSessionSettleSetupSevenShadowShaftShallowShareShedShellSheriffShieldShiftShineShipShiverShockShoeShootShopShortShoulderShoveShrimpShrugShuffleShySiblingSickSideSiegeSightSignSilentSilkSillySilverSimilarSimpleSinceSingSirenSisterSituateSixSizeSkateSketchSkiSkillSkinSkirtSkullSlabSlamSleepSlenderSliceSlideSlightSlimSloganSlotSlowSlushSmallSmartSmileSmokeSmoothSnackSnakeSnapSniffSnowSoapSoccerSocialSockSodaSoftSolarSoldierSolidSolutionSolveSomeoneSongSoonSorrySortSoulSoundSoupSourceSouthSpaceSpareSpatialSpawnSpeakSpecialSpeedSpellSpendSphereSpiceSpiderSpikeSpinSpiritSplitSpoilSponsorSpoonSportSpotSpraySpreadSpringSpySquareSqueezeSquirrelStableStadiumStaffStageStairsStampStandStartStateStaySteakSteelStemStepStereoStickStillStingStockStomachStoneStoolStoryStoveStrategyStreetStrikeStrongStruggleStudentStuffStumbleStyleSubjectSubmitSubwaySuccessSuchSuddenSufferSugarSuggestSuitSummerSunSunnySunsetSuperSupplySupremeSureSurfaceSurgeSurpriseSurroundSurveySuspectSustainSwallowSwampSwapSwarmSwearSweetSwiftSwimSwingSwitchSwordSymbolSymptomSyrupSystemTableTackleTagTailTalentTalkTankTapeTargetTaskTasteTattooTaxiTeachTeamTellTenTenantTennisTentTermTestTextThankThatThemeThenTheoryThereTheyThingThisThoughtThreeThriveThrowThumbThunderTicketTideTigerTiltTimberTimeTinyTipTiredTissueTitleToastTobaccoTodayToddlerToeTogetherToiletTokenTomatoTomorrowToneTongueTonightToolToothTopTopicToppleTorchTornadoTortoiseTossTotalTouristTowardTowerTownToyTrackTradeTrafficTragicTrainTransferTrapTrashTravelTrayTreatTreeTrendTrialTribeTrickTriggerTrimTripTrophyTroubleTruckTrueTrulyTrumpetTrustTruthTryTubeTuitionTumbleTunaTunnelTurkeyTurnTurtleTwelveTwentyTwiceTwinTwistTwoTypeTypicalUglyUmbrellaUnableUnawareUncleUncoverUnderUndoUnfairUnfoldUnhappyUniformUniqueUnitUniverseUnknownUnlockUntilUnusualUnveilUpdateUpgradeUpholdUponUpperUpsetUrbanUrgeUsageUseUsedUsefulUselessUsualUtilityVacantVacuumVagueValidValleyValveVanVanishVaporVariousVastVaultVehicleVelvetVendorVentureVenueVerbVerifyVersionVeryVesselVeteranViableVibrantViciousVictoryVideoViewVillageVintageViolinVirtualVirusVisaVisitVisualVitalVividVocalVoiceVoidVolcanoVolumeVoteVoyageWageWagonWaitWalkWallWalnutWantWarfareWarmWarriorWashWaspWasteWaterWaveWayWealthWeaponWearWeaselWeatherWebWeddingWeekendWeirdWelcomeWestWetWhaleWhatWheatWheelWhenWhereWhipWhisperWideWidthWifeWildWillWinWindowWineWingWinkWinnerWinterWireWisdomWiseWishWitnessWolfWomanWonderWoodWoolWordWorkWorldWorryWorthWrapWreckWrestleWristWriteWrongYardYearYellowYouYoungYouthZebraZeroZoneZoo"},{}]},{},[4])(4)});
