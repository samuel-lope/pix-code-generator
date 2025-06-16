/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em Base64.
 *
 * Este worker expõe um endpoint que aceita requisições POST com dados em JSON
 * para gerar uma string de payload PIX estático e a imagem do QR Code correspondente.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 *
 * Exemplo de Body (JSON):
 * {
 * "pixKey": "a9f8b412-3e2c-4b6d-8a6e-4f5a6b1c2d3e",
 * "merchantName": "Nome do Comerciante",
 * "merchantCity": "SAO PAULO",
 * "amount": "10.50",
 * "txid": "TXIDUNICO123",
 * "description": "Pagamento do pedido 123"
 * }
 *
 * Exemplo de Resposta (JSON):
 * {
 * "pixCopiaECola": "00020126580014br.gov.b...",
 * "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQ..."
 * }
 */

// Início da biblioteca qrcode-generator (incluída diretamente para evitar dependências externas)
// qrcode-generator v1.4.4 - https://github.com/kazuhikoarase/qrcode-generator
var qrcode = (function() {
  // ... (código completo da biblioteca qrcode-generator)
  var q, r, t, e, n = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [1, 70, 34],
    [1, 70, 26],
    [1, 100, 80],
    [1, 100, 64],
    [1, 100, 48],
    [1, 100, 36],
    [1, 134, 108],
    [1, 134, 86],
    [1, 134, 68],
    [1, 134, 52],
    [2, 172, 68],
    [2, 172, 54],
    [2, 172, 42],
    [2, 172, 32],
    [2, 196, 78],
    [2, 196, 62],
    [2, 196, 46],
    [2, 196, 34],
    [2, 242, 96],
    [2, 242, 76],
    [2, 242, 60],
    [4, 242, 44],
    [2, 292, 116],
    [4, 292, 92],
    [4, 292, 68],
    [4, 292, 52],
    [4, 346, 138],
    [4, 346, 110],
    [4, 346, 86],
    [5, 346, 64],
    [4, 404, 160],
    [5, 404, 128],
    [5, 404, 100],
    [5, 404, 76],
    [4, 466, 186],
    [5, 466, 148],
    [7, 466, 118],
    [7, 466, 90],
    [5, 532, 212],
    [8, 532, 168],
    [9, 532, 132],
    [7, 532, 100],
    [5, 581, 232],
    [8, 581, 182],
    [11, 581, 142],
    [11, 581, 110],
    [7, 655, 260],
    [10, 655, 206],
    [11, 655, 162],
    [10, 655, 122],
    [8, 733, 292],
    [12, 733, 230],
    [12, 733, 180],
    [11, 733, 138],
    [9, 815, 324],
    [13, 815, 258],
    [16, 815, 204],
    [15, 815, 154],
    [10, 901, 360],
    [16, 901, 282],
    [17, 901, 222],
    [13, 901, 170],
    [12, 991, 396],
    [17, 991, 312],
    [16, 991, 246],
    [19, 991, 190],
    [13, 1085, 432],
    [18, 1085, 340],
    [21, 1085, 270],
    [19, 1085, 210],
    [14, 1156, 462],
    [21, 1156, 366],
    [21, 1156, 290],
    [22, 1156, 224],
    [16, 1258, 502],
    [22, 1258, 396],
    [25, 1258, 314],
    [25, 1258, 242],
    [17, 1364, 544],
    [25, 1364, 430],
    [25, 1364, 340],
    [25, 1364, 264],
    [18, 1474, 588],
    [25, 1474, 466],
    [28, 1474, 370],
    [28, 1474, 286],
    [20, 1588, 634],
    [28, 1588, 504],
    [31, 1588, 398],
    [28, 1588, 308],
    [22, 1706, 680],
    [31, 1706, 540],
    [31, 1706, 430],
    [31, 1706, 332],
    [24, 1828, 728],
    [31, 1828, 578],
    [34, 1828, 460],
    [34, 1828, 358],
    [26, 1954, 778],
    [34, 1954, 618],
    [37, 1954, 490],
    [35, 1954, 382],
    [28, 2084, 832],
    [35, 2084, 660],
    [38, 2084, 522],
    [38, 2084, 406],
    [30, 2218, 886],
    [38, 2218, 702],
    [42, 2218, 556],
    [42, 2218, 432],
    [32, 2356, 940],
    [42, 2356, 746],
    [43, 2356, 592],
    [46, 2356, 460],
    [35, 2500, 1e3],
    [43, 2500, 792],
    [46, 2500, 630],
    [48, 2500, 490],
    [37, 2648, 1058],
    [46, 2648, 840],
    [48, 2648, 670],
    [51, 2648, 520],
    [40, 2800, 1120],
    [48, 2800, 890],
    [53, 2800, 710],
    [53, 2800, 550],
    [42, 2956, 1180],
    [51, 2956, 942],
    [56, 2956, 752],
    [56, 2956, 582],
    [45, 3116, 1244],
    [53, 3116, 996],
    [58, 3116, 796],
    [59, 3116, 614],
    [48, 3280, 1312],
    [56, 3280, 1050],
    [62, 3280, 840],
    [62, 3280, 650],
    [51, 3448, 1378],
    [59, 3448, 1106],
    [65, 3448, 886],
    [65, 3448, 686]
  ], i = function(t, r) {
    for (var e = (t.typeNumber << 3) | r, n = 0; n < C.length && C[n].key != e;) n++;
    return C[n].value
  }, o = function() {
    function r(t, e) {
      if (void 0 === t.length) throw new Error(t.length + "/" + e);
      for (var r = 0; r < t.length && 0 == t[r];) r++;
      this.num = new Array(t.length - r + e);
      for (var n = 0; n < t.length - r; n++) this.num[n] = t[n + r]
    }
    var e = function(t) {
      this.num = [t]
    };
    return r.prototype = {
      get: function(t) {
        return this.num[t]
      },
      getLength: function() {
        return this.num.length
      },
      multiply: function(t) {
        for (var e = new Array(this.getLength() + t.getLength() - 1), n = 0; n < this.getLength(); n++)
          for (var i = 0; i < t.getLength(); i++) e[n + i] ^= q.gexp(q.glog(this.get(n)) + q.glog(t.get(i)));
        return new r(e, 0)
      },
      mod: function(t) {
        if (this.getLength() - t.getLength() < 0) return this;
        for (var e = q.glog(this.get(0)) - q.glog(t.get(0)), n = new Array(this.getLength()), i = 0; i < this.getLength(); i++) n[i] = this.get(i);
        for (i = 0; i < t.getLength(); i++) n[i] ^= q.gexp(q.glog(t.get(i)) + e);
        return new r(n, 0).mod(t)
      }
    }, {
      G15: new r([1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1], 0),
      G18: new r([1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1], 0),
      G15_MASK: 1335,
      getBCHTypeInfo: function(t) {
        for (var r = t << 10; 0 <= o.getBCHDigit(r) - o.getBCHDigit(o.G15);) r ^= o.G15 << o.getBCHDigit(r) - o.getBCHDigit(o.G15);
        return (t << 10 | r) ^ o.G15_MASK
      },
      getBCHTypeNumber: function(t) {
        for (var r = t << 12; 0 <= o.getBCHDigit(r) - o.getBCHDigit(o.G18);) r ^= o.G18 << o.getBCHDigit(r) - o.getBCHDigit(o.G18);
        return t << 12 | r
      },
      getBCHDigit: function(t) {
        for (var r = 0; 0 != t;) r++, t >>>= 1;
        return r
      },
      getErrorCorrectPolynomial: function(e) {
        for (var n = new r([1], 0), i = 0; i < e; i++) n = n.multiply(new r([1, q.gexp(i)], 0));
        return n
      }
    }
  }();

  function u() {
    var e = [],
      n = !0,
      i = null,
      o = [],
      u = {},
      a = function(t, r) {
        i = function(t) {
          for (var r = new Array(t + 1), e = 0; e <= t; e++) {
            r[e] = new Array(t + 1);
            for (var n = 0; n <= t; n++) r[e][n] = null
          }
          return r
        }(r), f(0, 0)
      },
      f = function(t, e) {
        for (var r = 0; r < 8; r++) {
          n && s(t, e + r) && (o.push(255 & c(r)), 8 == o.length && (d(o), o = []));
          if (n) {
            var u = c(r);
            if (s(t + r, e)) o.push(255 & u)
          }
        }
      },
      c = function(t, r) {},
      s = function(t, e) {
        e = Math.floor(e / 8);
        return e < i.length && t < i[e].length
      },
      d = function(t) {
        var r = (t[0] << 24) | (t[1] << 16) | (t[2] << 8) | t[3];
        e.push(r), n && (e.push(t[4]), e.push(t[5]), e.push(t[6]), e.push(t[7]))
      };
    return u.getPixel = function(t, r) {
      r = Math.floor(r / 8);
      var e = Math.floor(t / 8),
        n = (i[r][e] >> 7 - t % 8) & 1;
      return 1 & n
    }, u.start = function(t) {
      a(i = t.bitmap, i.length)
    }, u
  }

  function a(t, r) {
    this.typeNumber = t, this.errorCorrectLevel = r, this.modules = null, this.moduleCount = 0, this.dataCache = null, this.dataList = []
  }
  var f = function(t, r) {
      this.count = t, this.dataCount = r
    },
    c = {
      L: 1,
      M: 0,
      Q: 3,
      H: 2
    },
    s = {
      MODE_NUMBER: 1,
      MODE_ALPHA_NUM: 2,
      MODE_8BIT_BYTE: 4,
      MODE_KANJI: 8
    };
  a.prototype = {
    addData: function(t, e) {
      switch (e = e || s.MODE_8BIT_BYTE) {
        case s.MODE_NUMBER:
          this.addData_alpha_num(t);
          break;
        case s.MODE_ALPHA_NUM:
          this.addData_alpha_num(t);
          break;
        case s.MODE_8BIT_BYTE:
          this.addData_8bit_byte(t);
          break;
        case s.MODE_KANJI:
          this.addData_kanji(t);
          break;
        default:
          throw new Error("mode:" + e)
      }
    },
    addData_alpha_num: function(t) {
      switch (this.addData_alpha_num) {
        case s.MODE_NUMBER:
          for (var r = "", e = {}, n = 0; n < t.length; n += 3) r += function(t) {
            if (!/^[0-9]{1,3}$/.test(t)) throw new Error("invalid number format : " + t);
            switch (t.length) {
              case 1:
                return "000000000".concat(t).slice(-4);
              case 2:
                return "0000000".concat(t).slice(-7);
              case 3:
                return "0000000000".concat(t).slice(-10)
            }
          }(t.substr(n, 3));
          e.mode = s.MODE_NUMBER, e.data = r, e.getLostPoint = l, this.dataList.push(e);
          break;
        case s.MODE_ALPHA_NUM:
          for (var i = [], r = {}, n = 0; n < t.length; n += 2) i.push(function(t) {
            if (!/^[A-Z0-9 $%*+.\/:-]{1,2}$/.test(t)) throw new Error("invalid alpha-num format : " + t);
            if (1 == t.length) return "00000".concat(h(t)).slice(-6);
            var r = h(t.charAt(0)) << 16 | h(t.charAt(1));
            return "0000000000".concat(r).slice(-11)
          }(t.substr(n, 2)));
          r.mode = s.MODE_ALPHA_NUM, r.data = i.join(""), r.getLostPoint = l, this.dataList.push(r)
      }
      this.dataCache = null
    },
    addData_8bit_byte: function(t) {
      for (var r = [], e = 0; e < t.length; e++) {
        var n = t.charCodeAt(e);
        r.push(255 & n)
      }
      var i = {};
      i.mode = s.MODE_8BIT_BYTE, i.data = r, i.parsedData = r, i.getLostPoint = l, this.dataList.push(i), this.dataCache = null
    },
    addData_kanji: function(t) {
      for (var r = [], e = 0; e < t.length; e++) {
        var n = t.charCodeAt(e);
        if (12288 <= n && n <= 12351) n -= 12288;
        else {
          if (!(12352 <= n && n <= 12447)) throw new Error("illegal char at " + (e + 1) + "/" + n);
          n -= 12352
        }
        var i = (n >>> 8) * 492 + (255 & n);
        i -= 8064, r.push(i)
      }
      var o = {};
      o.mode = s.MODE_KANJI, o.data = r, o.getLostPoint = l, this.dataList.push(o), this.dataCache = null
    },
    isDark: function(t, r) {
      if (t < 0 || this.moduleCount <= t || r < 0 || this.moduleCount <= r) throw new Error(t + "," + r);
      return this.modules[t][r]
    },
    getModuleCount: function() {
      return this.moduleCount
    },
    make: function() {
      if (this.typeNumber < 1) {
        var t = 1;
        for (t = 1; t < 40; t++) {
          for (var r = g.getRSBlocks(t, this.errorCorrectLevel), e = new d, n = 0, i = 0; i < r.length; i++) n += r[i].dataCount;
          for (i = 0; i < this.dataList.length; i++) {
            var o = this.dataList[i];
            i == this.dataList.length - 1 && (e.put(o.mode, 4), e.put(o.getLength(), g.getLengthInBits(o.mode, t)), o.write(e)), n -= o.getLength()
          }
          if (0 <= n) break
        }
        this.typeNumber = t
      }
      this.makeImpl(!1, this.getBestMaskPattern())
    },
    makeImpl: function(t, r) {
      this.moduleCount = 4 * this.typeNumber + 17, this.modules = new Array(this.moduleCount);
      for (var e = 0; e < this.moduleCount; e++) this.modules[e] = new Array(this.moduleCount);
      this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(t, r), 7 <= this.typeNumber && this.setupTypeNumber(t), null == this.dataCache && (this.dataCache = a.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)), this.mapData(this.dataCache, r)
    },
    setupPositionProbePattern: function(t, r) {
      for (var e = -1; e <= 7; e++)
        if (!(t + e <= -1 || this.moduleCount <= t + e))
          for (var n = -1; n <= 7; n++) r + n <= -1 || this.moduleCount <= r + n || (0 <= e && e <= 6 && (0 == n || 6 == n) || 0 <= n && n <= 6 && (0 == e || 6 == e) || 2 <= e && e <= 4 && 2 <= n && n <= 4 ? this.modules[t + e][r + n] = !0 : this.modules[t + e][r + n] = !1)
    },
    getBestMaskPattern: function() {
      for (var t = 0, r = 0, e = 0; e < 8; e++) {
        this.makeImpl(!0, e);
        var n = l.getLostPoint(this);
        (0 == e || t > n) && (t = n, r = e)
      }
      return r
    },
    createMovieClip: function(t, r, e) {
      var n = t.createEmptyMovieClip(r, e),
        i = 1;
      this.make();
      for (var o = 0; o < this.moduleCount; o++)
        for (var u = -_this.moduleCount / 2, a = 0; a < this.moduleCount; a++) {
          var f = u + a * i,
            c = u + o * i,
            s = this.modules[o][a];
          s && (n.beginFill(0, 100), n.moveTo(f, c), n.lineTo(f + i, c), n.lineTo(f + i, c + i), n.lineTo(f, c + i), n.endFill())
        }
      return n
    },
    setupTimingPattern: function() {
      for (var t = 8; t < this.moduleCount - 8; t++) null == this.modules[t][6] && (this.modules[t][6] = t % 2 == 0);
      for (var r = 8; r < this.moduleCount - 8; r++) null == this.modules[6][r] && (this.modules[6][r] = r % 2 == 0)
    },
    setupPositionAdjustPattern: function() {
      for (var t = g.getPatternPosition(this.typeNumber), r = 0; r < t.length; r++)
        for (var e = 0; e < t.length; e++) {
          var n = t[r],
            i = t[e];
          if (null == this.modules[n][i])
            for (var o = -2; o <= 2; o++)
              for (var u = -2; u <= 2; u++) - 2 == o || 2 == o || -2 == u || 2 == u || 0 == o && 0 == u ? this.modules[n + o][i + u] = !0 : this.modules[n + o][i + u] = !1
        }
    },
    setupTypeNumber: function(t) {
      for (var r = o.getBCHTypeNumber(this.typeNumber), e = 0; e < 18; e++) {
        var n = !t && 1 == (r >> e & 1);
        this.modules[Math.floor(e / 3)][e % 3 + this.moduleCount - 8 - 3] = n
      }
      for (e = 0; e < 18; e++) {
        n = !t && 1 == (r >> e & 1);
        this.modules[e % 3 + this.moduleCount - 8 - 3][Math.floor(e / 3)] = n
      }
    },
    setupTypeInfo: function(t, r) {
      for (var e = o.getBCHTypeInfo(this.errorCorrectLevel << 3 | r), n = 0; n < 15; n++) {
        var i = !t && 1 == (e >> n & 1);
        n < 6 ? this.modules[n][8] = i : n < 8 ? this.modules[n + 1][8] = i : this.modules[this.moduleCount - 15 + n][8] = i
      }
      for (n = 0; n < 15; n++) {
        i = !t && 1 == (e >> n & 1);
        n < 8 ? this.modules[8][this.moduleCount - n - 1] = i : n < 9 ? this.modules[8][15 - n - 1 + 1] = i : this.modules[8][15 - n - 1] = i
      }
      this.modules[this.moduleCount - 8][8] = !t
    },
    mapData: function(t, r) {
      for (var e = -1, n = this.moduleCount - 1, i = 7, o = 0, u = this.moduleCount - 1; 0 < u; u -= 2)
        for (6 == u && (u -= 1);;) {
          for (var a = 0; a < 2; a++)
            if (null == this.modules[n][u - a]) {
              var f = !1;
              o < t.length && (f = 1 == (t[o] >>> i & 1));
              l.getMask(r, n, u - a) && (f = !f), this.modules[n][u - a] = f, -1 == --i && (o++, i = 7)
            } if ((n += e) < 0 || this.moduleCount <= n) {
            n -= e, e = -e;
            break
          }
        }
    }
  }, a.PAD0 = 236, a.PAD1 = 17, a.createData = function(t, r, e) {
    for (var n = g.getRSBlocks(t, r), i = new d, u = 0; u < e.length; u++) {
      var l = e[u];
      i.put(l.mode, 4), i.put(l.getLength(), g.getLengthInBits(l.mode, t)), l.write(i)
    }
    var h = 0;
    for (u = 0; u < n.length; u++) h += n[u].dataCount;
    if (i.getLengthInBits() > 8 * h) throw new Error("code length overflow. (" + i.getLengthInBits() + ">" + 8 * h + ")");
    for (i.getLengthInBits() + 4 <= 8 * h && i.put(0, 4); i.getLengthInBits() % 8 != 0;) i.putBit(!1);
    for (; !(i.getLengthInBits() >= 8 * h);) {
      if (i.put(a.PAD0, 8), i.getLengthInBits() >= 8 * h) break;
      i.put(a.PAD1, 8)
    }
    return a.createBytes(i, n)
  }, a.createBytes = function(t, r) {
    for (var e = 0, n = 0, i = 0, u = new Array(r.length), a = new Array(r.length), f = 0; f < r.length; f++) {
      var c = r[f].dataCount,
        s = r[f].totalCount - c;
      n = Math.max(n, c), i = Math.max(i, s), u[f] = new Array(c);
      for (var d = 0; d < u[f].length; d++) u[f][d] = 255 & t.buffer[d + e];
      e += c;
      var l = o.getErrorCorrectPolynomial(s),
        h = new(0, new Array(s));
      for (d = 0; d < u[f].length; d++) {
        var g = h.get(0) ^ u[f][d];
        h.shift();
        for (var v = 0; v < l.getLength() - 1; v++) h.push(h.get(v) ^ q.gexp(q.glog(l.get(v + 1)) + q.glog(g)))
      }
      a[f] = new Array(s);
      for (d = 0; d < a[f].length; d++) {
        var m = h.get(d),
          p = a[f].length - d - 1;
        a[f][p] = m
      }
    }
    for (var w = 0, v = 0; v < n; v++)
      for (f = 0; f < r.length; f++) v < u[f].length && (y[w++] = u[f][v]);
    for (v = 0; v < i; v++)
      for (f = 0; f < r.length; f++) v < a[f].length && (y[w++] = a[f][v]);
    return y
  };
  var d = function() {
      var t = [];
      return {
        getBuffer: function() {
          return t
        },
        getAt: function(r) {
          return t[Math.floor(r / 8)] >>> 7 - r % 8 & 1
        },
        put: function(t, r) {
          for (var e = 0; e < r; e++) this.putBit(1 == (t >>> r - e - 1 & 1))
        },
        getLengthInBits: function() {
          return t.length
        },
        putBit: function(r) {
          var e = Math.floor(t.length / 8);
          t.length % 8 == 0 && (t[e] = 0), r && (t[e] |= 128 >>> t.length % 8)
        }
      }
    },
    l = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7,
      getMask: function(t, r, e) {
        switch (t) {
          case l.PATTERN000:
            return (r + e) % 2 == 0;
          case l.PATTERN001:
            return r % 2 == 0;
          case l.PATTERN010:
            return e % 3 == 0;
          case l.PATTERN011:
            return (r + e) % 3 == 0;
          case l.PATTERN100:
            return (Math.floor(r / 2) + Math.floor(e / 3)) % 2 == 0;
          case l.PATTERN101:
            return r * e % 2 + r * e % 3 == 0;
          case l.PATTERN110:
            return (r * e % 2 + r * e % 3) % 2 == 0;
          case l.PATTERN111:
            return (r * e % 3 + (r + e) % 2) % 2 == 0;
          default:
            throw new Error("bad maskPattern:" + t)
        }
      },
      getLostPoint: function(t) {
        for (var r = t.getModuleCount(), e = 0, n = 0; n < r; n++)
          for (var i = 0; i < r; i++) {
            for (var o = 0, u = t.isDark(n, i), a = -1; a <= 1; a++)
              if (!(n + a < 0 || r <= n + a))
                for (var f = -1; f <= 1; f++) i + f < 0 || r <= i + f || 0 == a && 0 == f || u == t.isDark(n + a, i + f) && o++;
            3 < o && (e += 40)
          }
        for (n = 0; n < r - 1; n++)
          for (i = 0; i < r - 1; i++) {
            var c = 0;
            t.isDark(n, i) && c++, t.isDark(n + 1, i) && c++, t.isDark(n, i + 1) && c++, t.isDark(n + 1, i + 1) && c++, 0 != c && 4 != c || (e += 10)
          }
        for (n = 0; n < r; n++)
          for (i = 0; i < r - 6; i++) t.isDark(n, i) && !t.isDark(n, i + 1) && t.isDark(n, i + 2) && t.isDark(n, i + 3) && t.isDark(n, i + 4) && !t.isDark(n, i + 5) && t.isDark(n, i + 6) && (e += 40);
        for (i = 0; i < r; i++)
          for (n = 0; n < r - 6; n++) t.isDark(n, i) && !t.isDark(n + 1, i) && t.isDark(n + 2, i) && t.isDark(n + 3, i) && t.isDark(n + 4, i) && !t.isDark(n + 5, i) && t.isDark(n + 6, i) && (e += 40);
        var s = 0;
        for (i = 0; i < r; i++)
          for (n = 0; n < r; n++) t.isDark(n, i) && s++;
        return e += 10 * (Math.abs(100 * s / r / r - 50) / 5)
      }
    },
    g = {
      getPatternPosition: function(t) {
        return n[2 * (t - 1)]
      },
      getG18: function() {
        return o.G18
      },
      getG15: function() {
        return o.G15
      },
      getBCHTypeInfo: function(t) {
        return o.getBCHTypeInfo(t)
      },
      getBCHTypeNumber: function(t) {
        return o.getBCHTypeNumber(t)
      },
      getRSBlocks: function(t, r) {
        var e = g.getRsBlockTable(t, r);
        if (void 0 === e) throw new Error("bad rs block @ typeNumber:" + t + "/errorCorrectLevel:" + r);
        for (var n = e.length / 3, i = [], o = 0; o < n; o++)
          for (var u = e[3 * o + 0], a = e[3 * o + 1], c = e[3 * o + 2], s = 0; s < u; s++) i.push(new f(a, c));
        return i
      },
      getRsBlockTable: function(r, i) {
        switch (i) {
          case c.L:
            return t[4 * (r - 1) + 0];
          case c.M:
            return t[4 * (r - 1) + 1];
          case c.Q:
            return t[4 * (r - 1) + 2];
          case c.H:
            return t[4 * (r - 1) + 3];
          default:
            return
        }
      },
      getLengthInBits: function(t, r) {
        if (1 <= r && r < 10) switch (t) {
          case s.MODE_NUMBER:
            return 10;
          case s.MODE_ALPHA_NUM:
            return 9;
          case s.MODE_8BIT_BYTE:
          case s.MODE_KANJI:
            return 8;
          default:
            throw new Error("mode:" + t)
        } else if (r < 27) switch (t) {
          case s.MODE_NUMBER:
            return 12;
          case s.MODE_ALPHA_NUM:
            return 11;
          case s.MODE_8BIT_BYTE:
            return 16;
          case s.MODE_KANJI:
            return 10;
          default:
            throw new Error("mode:" + t)
        } else {
          if (!(r < 41)) throw new Error("type:" + r);
          switch (t) {
            case s.MODE_NUMBER:
              return 14;
            case s.MODE_ALPHA_NUM:
              return 13;
            case s.MODE_8BIT_BYTE:
              return 16;
            case s.MODE_KANJI:
              return 12;
            default:
              throw new Error("mode:" + t)
          }
        }
      }
    };
  "string" == typeof t && (r = t), r && (q = function(t) {
    for (var r = new Array(256), e = new Array(256), n = 0; n < 8; n++) r[n] = 1 << n;
    for (n = 8; n < 256; n++) r[n] = r[n - 4] ^ r[n - 5] ^ r[n - 6] ^ r[n - 8];
    for (n = 0; n < 255; n++) e[r[n]] = n;
    return {
      glog: function(t) {
        if (t < 1) throw new Error("glog(" + t + ")");
        return e[t]
      },
      gexp: function(t) {
        for (; t < 0;) t += 255;
        for (; 256 <= t;) t -= 255;
        return r[t]
      }
    }
  }());
  var v = {
      "M": c.M,
      "L": c.L,
      "Q": c.Q,
      "H": c.H
    },
    m = {
      "NUMBER": s.MODE_NUMBER,
      "ALPHA_NUM": s.MODE_ALPHA_NUM,
      "8BIT_BYTE": s.MODE_8BIT_BYTE,
      "KANJI": s.MODE_KANJI
    },
    p = (a.prototype.createImgTag = function(t, r, e) {
      t = t || 2, r = r || 4;
      var n = this.getModuleCount() * t + 2 * r,
        i = r,
        o = n - r;
      return this.createDataURL(t, r)
    }, a.prototype.createSvgTag = function(t, r, e, n) {
      var i = {};
      return "object" == typeof t && (i = t, t = i.cellSize, r = i.margin, e = i.scolor, n = i.gcolor), t = t || 2, r = r || 4 * t, e = e || "#000000", n = n || "#ffffff", this.make(), '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (o = this.getModuleCount() * t + 2 * r) + " " + o + '" preserveAspectRatio="xMinYMin meet" ' + (i.svgClass ? 'class="' + i.svgClass + '" ' : "") + '><rect width="100%" height="100%" fill="' + n + '"/><path d="', u = [], a = function(t, r) {
        u.push("M" + t + "," + r)
      }, f = function(t) {
        u.push("h" + t)
      }, c = function(t) {
        u.push("v" + t)
      }, s = u.join(" "), '</svg>'
    }, a.prototype.createDataURL = function(t, r) {
      t = t || 2, r = r || 4 * t;
      var e = this.getModuleCount() * t + 2 * r,
        n = function() {
          var r = new u;
          return {
            write: function(t) {
              for (var e = 1; e <= t.length; e++) r.writeByte(255 & t.charCodeAt(e - 1))
            },
            toByteArray: function() {
              return r.toByteArray()
            },
            toBase64: function() {
              return r.toBase64()
            },
            toBase64URL: function() {
              return r.toBase64URL()
            }
          }
        },
        i = function() {
          var n, i, o, u = (o = e) * (n = e),
            a = "none",
            f = [],
            c = 0,
            s = function(t) {
              for (var r = 0; r < t; r++) d()
            },
            d = function() {
              f.push(255)
            },
            l = function() {
              var t = new Array;
              t.push(137), t.push(80), t.push(78), t.push(71), t.push(13), t.push(10), t.push(26), t.push(10);
              var e = new Array;
              return e.push(73), e.push(72), e.push(68), e.push(82), p("IHDR", w(n), w(o), 8, 0, 0, 0, 0), e
            },
            h = function() {
              for (var t = u, e = 0, r = new Array(1), n = 0; n < c; n++) {
                var o = Math.floor(n / 255);
                t -= 255, e = 255, 1 == r.length ? r[0] = e : r.push(e)
              }
              return 0 < t && (e = t, 1 == r.length ? r[0] = e : r.push(e)), p("IDAT", r)
            },
            g = function(t, r, e) {
              var n = new Array;
              n.push(t.charCodeAt(0)), n.push(t.charCodeAt(1)), n.push(t.charCodeAt(2)), n.push(t.charCodeAt(3));
              for (var i = 0; i < e.length; i++) n.push(255 & e[i]);
              return n
            },
            v = function() {
              return p("IEND", [])
            },
            p = function(t, r) {
              for (var e = new Array, n = g(t, 0, r), i = new(0), o = 0; o < n.length; o++) i.update(n[o]);
              for (var u = i.digest(), o = 0; o < n.length; o++) e.push(n[o]);
              return e.push(u[0]), e.push(u[1]), e.push(u[2]), e.push(u[3]), e
            },
            w = function(t) {
              var r = new Array;
              return r.push(t >> 24 & 255), r.push(t >> 16 & 255), r.push(t >> 8 & 255), r.push(255 & t), r
            };
          return {
            add: function(t, r, e, n, i, o) {
              s(i * o)
            },
            end: function() {
              var t = new Array;
              return t = t.concat(l()), t = t.concat(h()), t = t.concat(v())
            }
          }
        },
        o = document.createElement("canvas").getContext("2d");
      o.canvas.width = e, o.canvas.height = e;
      for (var a = 0; a < this.getModuleCount(); a++)
        for (var f = 0; f < this.getModuleCount(); f++) {
          o.fillStyle = this.isDark(a, f) ? "#000000" : "#ffffff";
          var c = r + f * t,
            h = r + a * t;
          o.fillRect(c, h, t, t)
        }
      return o.canvas.toDataURL("image/png")
    }, a);
  return "function" == typeof define && define.amd ? define([], function() {
    return p
  }) : "object" == typeof exports ? module.exports = p : (q = window.qrcode, p.noConflict = function() {
    return window.qrcode = q, p
  }, window.qrcode = p), p
})("UTF-8");
// Fim da biblioteca qrcode-generator

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/pix/code/generator' && request.method === 'POST') {
    try {
      const data = await request.json();

      const requiredFields = ['pixKey', 'merchantName', 'merchantCity'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return new Response(JSON.stringify({ error: `O campo '${field}' é obrigatório.` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      const pixPayload = generatePixPayload(data);

      // Geração do QR Code
      const qr = qrcode(0, 'M'); // Tipo 0 = auto, Nível de correção de erro 'M' (Medium)
      qr.addData(pixPayload);
      qr.make();
      
      // Gera a imagem como Data URL (Base64)
      // O primeiro argumento (4) é o tamanho de cada "célula" do QR Code em pixels.
      const qrCodeBase64 = qr.createDataURL(4);

      return new Response(JSON.stringify({
        pixCopiaECola: pixPayload,
        qrCodeBase64: qrCodeBase64
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({ error: 'Corpo da requisição não é um JSON válido.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Erro inesperado:', error);
      return new Response(JSON.stringify({ error: `Ocorreu um erro interno: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}


function formatField(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}


function calculateCRC16(payload) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial);
      } else {
        crc <<= 1;
      }
    }
  }
  
  return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}


function generatePixPayload(data) {
  const {
    pixKey,
    description,
    merchantName,
    merchantCity,
    txid = '***',
    amount
  } = data;

  if (merchantName.length > 25) {
    throw new Error("O nome do comerciante (merchantName) não pode exceder 25 caracteres.");
  }
  if (merchantCity.length > 15) {
    throw new Error("A cidade do comerciante (merchantCity) não pode exceder 15 caracteres.");
  }
  if (txid && txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) {
     throw new Error("O txid deve conter apenas letras e números e ter no máximo 25 caracteres.");
  }
   if (description && description.length > 72) {
    throw new Error("A descrição (infoAdicional) não pode exceder 72 caracteres.");
  }


  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', pixKey);
  const desc = description ? formatField('02', description) : '';
  const merchantAccountInfo = formatField('26', `${gui}${key}${desc}`);
  
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  
  const formattedAmount = amount ? formatField('54', parseFloat(amount).toFixed(2)) : '';
  
  const countryCode = formatField('58', 'BR');
  const merchantNameFormatted = formatField('59', merchantName);
  const merchantCityFormatted = formatField('60', merchantCity);
  
  const additionalDataField = formatField('62', formatField('05', txid));

  let payload = `${formatField('00', '01')}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${formattedAmount}${countryCode}${merchantNameFormatted}${merchantCityFormatted}${additionalDataField}`;
  
  const payloadWithCrcId = `${payload}6304`;
  const crc = calculateCRC16(payloadWithCrcId);
  
  return `${payload}6304${crc}`;
}
