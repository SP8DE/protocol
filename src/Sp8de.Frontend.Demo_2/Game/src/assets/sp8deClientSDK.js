// if (window !== undefined) window.sp8deClientSDK = new Sp8deClientSDK();
// else global.sp8deClientSDK = new Sp8deClientSDK();
// window.Transform = require('browser-stream')
// console.log(Transform)
// window.global=window
window.EthJS = require('ethereumjs-util');
window.privateKeyGenerator = require('ethers');
let Buffer = require('buffer').Buffer,
  nameKeysField = 'Wallets',
  nameUserField = 'user';
// window.Transform = require('browser-stream')

/**
 * @class Sp8deClientSDK
 * */
export class Sp8deClientSDK {
  constructor(eth = undefined, privateKeyGenerator = undefined) {
    EthJS = !eth ? window.EthJS.Util : eth;
    privateKeyGenerator = !privateKeyGenerator ? window.ethers : privateKeyGenerator;
  }

  /**
   * @description Returns a new private key
   * @memberOf Sp8deClientSDK
   * @return {number} A public key of 66 characters long
   * */
  generatePrivateKey() {
    return privateKeyGenerator.Wallet.createRandom().privateKey;
  };

  /**
   * @description Returns a new wallet
   * @memberOf Sp8deClientSDK
   * @return {object} Object contains wallet
   * */
  generateWallet() {
    return privateKeyGenerator.Wallet.createRandom();
  };

  /**
   * @description Returns a new wallet
   * @memberOf Sp8deClientSDK
   * @param {object} wallet - object with wallet
   * @param {string} password
   * @return {promise} promise with json
   * */
  encryptWallet(wallet, password) {
    return wallet.encrypt(password);
  };

  /**
   * @description Returns a new wallet
   * @memberOf Sp8deClientSDK
   * @param {string}  wallet - Encrypted JSON with wallet
   * @param {string} password
   * @return {promise} promise with json
   * */
  decryptWallet(wallet, password) {
    return privateKeyGenerator.Wallet.fromEncryptedWallet(wallet, password);
  };

  /**
   * @description Returns the public key obtains from the private key
   * @memberOf Sp8deClientSDK
   * @param {string} privateKey - private key
   * @return {string} A public key of 42 characters long
   * */
  getPubKey(privateKey) {
    if (!privateKey) {
      throw error('Invalid parameter');
    }
    return EthJS.addHexPrefix(EthJS.privateToAddress(privateKey).toString('hex'))
  };

  /**
   * @description Returns an array of random numbers from seed-array (use mt19937 algorithm)
   * @memberOf Sp8deClientSDK
   * @param {{array: array, min: number, max: number, count: number}} parameters - {array: [], min: number, max: number, count: number}
   * @return {number[]} An array of length given by a "count" containing random numbers
   * */
  getRandomFromArray(parameters) {
    let rand = new mt19937(),
      result = [];
    if (parameters.array === undefined ||
      !Array.isArray(parameters.array) ||
      parameters.min === undefined ||
      parameters.max === undefined) {
      throw error('Invalid parameters');
    }
    rand.init_by_array(parameters.array, parameters.array.length);
    for (let i = 0; i < parameters.count; i++) {
      result.push(AccessoryFunctions.getRandomIntInclusive(rand.random(), parameters.min, parameters.max))
    }
    return result;
  };

  /**
   * @description Returns a random number to use as a seed
   * @memberOf Sp8deClientSDK
   * @return {number} Random seed number. Length 9-10
   * */
  generateSeed() {
    let rnd = new Uint32Array(1);
    window.crypto.getRandomValues(rnd);
    return rnd[0];
  };

  /**
   * @description Signs a message from privateKey, seed, nonce. Returns message signed with private key.
   * @memberOf Sp8deClientSDK
   * @param {{privateKey: string, seed: number, nonce: number}} parameters - {privateKey: string, seed: number, nonce: number}
   * @return {string} Message signed with private key
   * */
  signMessage(parameters) {
    if (parameters.privateKey === undefined ||
      parameters.seed === undefined ||
      parameters.nonce === undefined) {
      throw error('Invalid parameters', parameters);
    }
    let pubKey = this.getPubKey(parameters.privateKey),
      message = `${pubKey};${parameters.seed};${parameters.nonce}`,
      hashMessage = EthJS.hashPersonalMessage(EthJS.toBuffer(message)),
      signed = EthJS.ecsign(hashMessage, EthJS.toBuffer(parameters.privateKey)),
      tx = signed.r.toString('hex') + signed.s.toString('hex') + EthJS.stripHexPrefix(EthJS.intToHex(signed.v));
    return EthJS.addHexPrefix(tx);
  };

  /**
   * @description Validates the message. Use sign, nonce, public key and seed. Returns true if the validation was successful.
   * @memberOf Sp8deClientSDK
   * @param {{sign: string, pubKey: string, seed: number, nonce: number}} parameters - {sign: string, pubKey: string, seed: number, nonce: number}
   * @return {boolean} True if successful, false if unsuccessful
   * */
  validateSign(parameters) {
    let hash, msg, newPubKey;
    try {
      if (!parameters.sign) throw new TypeError('Empty parameters.sign');
      if (parameters.sign.length % 2 !== 0) throw new TypeError('Invalid hex string');
      parameters.sign = Buffer.from(AccessoryFunctions.getNakedAddress(parameters.sign), 'hex');
      if (parameters.sign.length !== 65) throw new TypeError('parameters.sign length is not valid');
      parameters.sign[64] = parameters.sign[64] === 0 || parameters.sign[64] === 1 ? parameters.sign[64] + 27 : parameters.sign[64];
      msg = `${parameters.pubKey.toLowerCase()};${parameters.seed};${parameters.nonce}`;
      hash = EthJS.hashPersonalMessage(EthJS.toBuffer(msg));

      newPubKey = EthJS.ecrecover(
        hash,
        parameters.sign[64],
        parameters.sign.slice(0, 32),
        parameters.sign.slice(32, 64)
      );
      if (AccessoryFunctions.getNakedAddress(parameters.pubKey) !== EthJS.pubToAddress(newPubKey).toString('hex')) {
        throw new TypeError('parameters.sign is not valid');
      }
    } catch (e) {
      if (e instanceof SyntaxError) console.error('JSON is not valid');
      else console.error(e);
      return false;
    }
    return true;
  };

  /**
   * @description Add to localstorage to key Wallets in key "User" or root. If user without field "Wallets" add it.
   * @param value {string} Private key
   * @param storageWallets {object | array} optional. Object wallet contained in storage
   * @param storageService {object} optional. Object work with any storage
   */
  addWalletToStorage(value, storageWallets = this.getWalletsInStorage(), storageService = LocalStorageMethods) {
    if (!value) throw error('invalid value');
    if (Array.isArray(storageWallets)) {
      storageWallets.push(value);
      storageService.setItem(nameKeysField, storageWallets);
    } else if (storageWallets) {
      if (!storageWallets[nameKeysField]) {
        storageWallets[nameKeysField] = [];
      }
      storageWallets[nameKeysField].push(value);
      storageService.setItem(nameUserField, storageWallets);
    } else {
      storageService.setItem(nameKeysField, [value]);
    }
  }

  /**
   * @description Removing last private key from array in localstorage
   * @param storageWallets {object | array} optional. Object wallet contained in storage
   * @param storageService {object} optional. Object work with any storage
   */
  removeLastWalletFromStorage(storageWallets = this.getWalletsInStorage(), storageService = LocalStorageMethods) {
    if (!this.isWalletsInStorage(storageWallets)) return;
    if (Array.isArray(storageWallets)) {
      storageWallets.pop();
      storageService.setItem(nameKeysField, storageWallets);
    } else {
      storageWallets[nameKeysField].pop();
      storageService.setItem(nameUserField, storageWallets);
    }
  }

  /**
   * @description Clear array of private keys (delete key from localstorage
   * @param storageWallets {object | array} Object wallet contained in storage)
   * @param storageService {object} Object work with any storage
   */
  clearWalletStorage(storageWallets = this.getWalletsInStorage(), storageService = LocalStorageMethods) {
    if (Array.isArray(storageWallets)) {
      storageService.removeItem(nameKeysField);
    } else {
      delete storageWallets[nameKeysField];
      storageService.setItem(nameUserField, storageWallets);
    }
  }

  /**
   * @description Returns active private key in localstorage
   * @returns {string} Active private key or null if no array
   * @param array {array} optional. Array wallets contained in storage
   */
  getActiveWalletFromStorage(array = this.getWalletsListFromStorage()) {
    return array ? array.pop() : null;
  }

  /**
   * @description Returns array of string contains all private keys from localstorage
   * @param storageWallets {object | array} optional. Object wallet contained in storage
   * @return {string[]} Array of private keys or null if no array
   */
  getWalletsListFromStorage(storageWallets = this.getWalletsInStorage()) {
    if (!this.isWalletsInStorage(storageWallets)) return null;
    if (Array.isArray(storageWallets)) {
      return storageWallets;
    } else if (storageWallets) {
      return storageWallets[nameKeysField];
    } else return null;
  }

  /**
   * @description  Check if there are keys in vault
   * @return {boolean} True if there is, false is not
   * @param storageWallets {object}  optional. User in storage, if it there is
   */
  isWalletsInStorage(storageWallets = this.getWalletsInStorage()) {
    if (!storageWallets) return false;
    if (Array.isArray(storageWallets)) {
      if (!!!storageWallets.length) return false;
    } else {
      if (!storageWallets[nameKeysField] || !!!storageWallets[nameKeysField].length) return false;
    }
    return true;
  }

  getWalletsInStorage(storageService = LocalStorageMethods) {
    const userKeys = storageService.getItem(nameUserField),
      Wallets = storageService.getItem(nameKeysField) ? storageService.getItem(nameKeysField) : null;
    return userKeys ? userKeys : Wallets;
  }

  getTrezorHash(msg) {
    return EthJS.sha3(
      Buffer.concat([
        EthJS.toBuffer('\u0019Ethereum Signed Message:\n'),
        AccessoryFunctions.getTrezorLenBuf(msg.length),
        EthJS.toBuffer(msg)
      ])
    );
  };
}

/*
*
* Local storage methods
*
* */
class LocalStorageMethods {
  static setItem(key, value) {
    if (!localStorage) throw new Error('Does not localstorage in global');
    localStorage.setItem(key, JSON.stringify(value));
  }

  static getItem(key) {
    if (!localStorage) throw new Error('Does not localstorage in global');
    return JSON.parse(localStorage.getItem(key));
  }

  static removeItem(key) {
    if (!localStorage) throw new Error('Does not localstorage in global');
    localStorage.removeItem(key);
  }

  static clear() {
    if (!localStorage) throw new Error('Does not localstorage in global');
    localStorage.clear();
  }
}

/*
*
* Accessory functions for methods
*
*/
class AccessoryFunctions {
  static getNakedAddress(address) {
    return address.toLowerCase().replace('0x', '');
  };

  static getTrezorLenBuf(msgLen) {
    if (msgLen < 253) return Buffer.from([msgLen & 0xff]);
    else if (msgLen < 0x10000)
      return Buffer.from([253, msgLen & 0xff, (msgLen >> 8) & 0xff]);
    else {
      return Buffer.from([
        254,
        msgLen & 0xff,
        (msgLen >> 8) & 0xff,
        (msgLen >> 16) & 0xff,
        (msgLen >> 24) & 0xff
      ]);
    }
  };

  static getRandomIntInclusive(rnd, min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(rnd * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
  };
}

/*
*
* mt19937 methods
*
*/

class mt19937 {
  constructor(seed) {
    if (seed == undefined) {
      seed = new Date().getTime();
    }
    /* Period parameters */
    this.N = 624;
    this.M = 397;
    this.MATRIX_A = 0x9908b0df;
    /* constant vector a */
    this.UPPER_MASK = 0x80000000;
    /* most significant w-r bits */
    this.LOWER_MASK = 0x7fffffff;
    /* least significant r bits */

    this.mt = new Array(this.N);
    /* the array for the state vector */
    this.mti = this.N + 1;
    /* mti==N+1 means mt[N] is not initialized */

    this.init_genrand(seed);
  }

  init_genrand(s) {
    this.mt[0] = s >>> 0;
    for (this.mti = 1; this.mti < this.N; this.mti++) {
      s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array mt[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      this.mt[this.mti] >>>= 0;
      /* for >32 bit machines */
    }
  }

  init_by_array(init_key, key_length) {
    var i, j, k;
    this.init_genrand(19650218);
    i = 1;
    j = 0;
    k = (this.N > key_length ? this.N : key_length);
    for (; k; k--) {
      var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30)
      this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j;
      /* non linear */
      this.mt[i] >>>= 0;
      /* for WORDSIZE > 32 machines */
      i++;
      j++;
      if (i >= this.N) {
        this.mt[0] = this.mt[this.N - 1];
        i = 1;
      }
      if (j >= key_length) j = 0;
    }
    for (k = this.N - 1; k; k--) {
      var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i;
      /* non linear */
      this.mt[i] >>>= 0;
      /* for WORDSIZE > 32 machines */
      i++;
      if (i >= this.N) {
        this.mt[0] = this.mt[this.N - 1];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
    /* MSB is 1; assuring non-zero initial array */
  }

  random() {
    return this.genrand_int32() * (1.0 / 4294967296.0);
    /* divided by 2^32 */
  }

  genrand_int32() {
    var y;
    var mag01 = new Array(0x0, this.MATRIX_A);
    /* mag01[x] = x * MATRIX_A  for x=0,1 */

    if (this.mti >= this.N) { /* generate N words at one time */
      var kk;

      if (this.mti == this.N + 1) /* if init_genrand() has not been called, */
        this.init_genrand(5489);
      /* a default initial seed is used */

      for (kk = 0; kk < this.N - this.M; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < this.N - 1; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
      this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

      this.mti = 0;
    }

    y = this.mt[this.mti++];

    /* Tempering */
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
  }
}



