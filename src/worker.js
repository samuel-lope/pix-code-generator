/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e o código SVG do QR Code.
 *
 * Esta versão definitiva utiliza uma implementação completa e robusta do gerador de QRCode
 * para garantir a correta geração do SVG no ambiente Cloudflare Workers.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

// =================================================================================
// Módulo de Geração de QR Code (qrcode.js)
// Implementação completa, robusta e autocontida.
// Fonte: Adaptado de qrcode-generator (https://github.com/kazuhikoarase/qrcode-generator)
// =================================================================================
const QRCode = (function() {
  var r = function(t, e) {
    this.typeNumber = t, this.errorCorrectLevel = e, this.modules = null, this.moduleCount = 0, this.dataCache = null, this.dataList = []
  };
  r.prototype = {
    addData: function(t, e) {
      e = e || "Byte";
      var i;
      switch (e) {
        case "Numeric":
          i = new o(t);
          break;
        case "Alphanumeric":
          i = new n(t);
          break;
        case "Byte":
          i = new s(t);
          break;
        case "Kanji":
          i = new a(t);
          break;
        default:
          throw new Error("mode:" + e)
      }
      this.dataList.push(i), this.dataCache = null
    },
    isDark: function(t, e) {
      if (t < 0 || this.moduleCount <= t || e < 0 || this.moduleCount <= e) throw new Error(t + "," + e);
      return this.modules[t][e]
    },
    getModuleCount: function() {
      return this.moduleCount
    },
    make: function() {
      if (this.typeNumber < 1) {
        var t;
        for (t = 1; t < 40; t++) {
          for (var e = g.getRSBlocks(t, this.errorCorrectLevel), i = new h, r = 0, o = 0; o < e.length; o++) r += e[o].dataCount;
          for (o = 0; o < this.dataList.length; o++) {
            var n = this.dataList[o];
            i.put(n.mode, 4), i.put(n.getLength(), u.getLengthInBits(n.mode, t)), n.write(i)
          }
          if (i.getLengthInBits() <= 8 * r) break
        }
        this.typeNumber = t
      }
      this.makeImpl(!1, this.getBestMaskPattern())
    },
    makeImpl: function(t, e) {
      this.moduleCount = 4 * this.typeNumber + 17, this.modules = function(t) {
        for (var e = new Array(t), i = 0; i < t; i++) {
          e[i] = new Array(t);
          for (var r = 0; r < t; r++) e[i][r] = null
        }
        return e
      }(this.moduleCount), this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(t, e), this.typeNumber >= 7 && this.setupTypeNumber(t), null == this.dataCache && (this.dataCache = r.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)), this.mapData(this.dataCache, e)
    },
    setupPositionProbePattern: function(t, e) {
      for (var i = -1; i <= 7; i++)
        if (!(t + i <= -1 || this.moduleCount <= t + i))
          for (var r = -1; r <= 7; r++) e + r <= -1 || this.moduleCount <= e + r || (0 <= i && i <= 6 && (0 == r || 6 == r) || 0 <= r && r <= 6 && (0 == i || 6 == i) || 2 <= i && i <= 4 && 2 <= r && r <= 4 ? this.modules[t + i][e + r] = !0 : this.modules[t + i][e + r] = !1)
    },
    getBestMaskPattern: function() {
      for (var t = 0, e = 0, i = 0; i < 8; i++) {
        this.makeImpl(!0, i);
        var r = u.getLostPoint(this);
        (0 == i || t > r) && (t = r, e = i)
      }
      return e
    },
    createSvgTag: function(t) {
      var e = {};
      "object" == typeof t && (e = t, t = e.cellSize);
      t = t || 2;
      var i = e.margin || 4 * t,
        r = this.getModuleCount(),
        o = i + r * t + i,
        n = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="' + o + 'px" height="' + o + 'px" viewBox="0 0 ' + o + " " + o + '" version="1.1" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + o + '" height="' + o + '" fill="#ffffff" stroke="none"/><g fill="#000000" stroke="none">';
      for (var s = 0; s < r; s++)
        for (var a = 0; a < r; a++) this.isDark(s, a) && (n += '<rect x="' + (i + a * t) + '" y="' + (i + s * t) + '" width="' + t + '" height="' + t + '"/>');
      return n += "</g></svg>"
    },
    setupTimingPattern: function() {
      for (var t = 8; t < this.moduleCount - 8; t++) null == this.modules[t][6] && (this.modules[t][6] = t % 2 == 0);
      for (var e = 8; e < this.moduleCount - 8; e++) null == this.modules[6][e] && (this.modules[6][e] = e % 2 == 0)
    },
    setupPositionAdjustPattern: function() {
      for (var t = u.getPatternPosition(this.typeNumber), e = 0; e < t.length; e++)
        for (var i = 0; i < t.length; i++) {
          var r = t[e],
            o = t[i];
          if (null == this.modules[r][o])
            for (var n = -2; n <= 2; n++)
              for (var s = -2; s <= 2; s++) - 2 == n || 2 == n || -2 == s || 2 == s || 0 == n && 0 == s ? this.modules[r + n][o + s] = !0 : this.modules[r + n][o + s] = !1
        }
    },
    setupTypeNumber: function(t) {
      for (var e = u.getBCHTypeNumber(this.typeNumber), i = 0; i < 18; i++) {
        var r = !t && 1 == (e >> i & 1);
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = r
      }
      for (i = 0; i < 18; i++) {
        r = !t && 1 == (e >> i & 1);
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = r
      }
    },
    setupTypeInfo: function(t, e) {
      for (var i = u.getBCHTypeInfo(this.errorCorrectLevel << 3 | e), r = 0; r < 15; r++) {
        var o = !t && 1 == (i >> r & 1);
        r < 6 ? this.modules[r][8] = o : r < 8 ? this.modules[r + 1][8] = o : this.modules[this.moduleCount - 15 + r][8] = o
      }
      for (r = 0; r < 15; r++) {
        o = !t && 1 == (i >> r & 1);
        r < 8 ? this.modules[8][this.moduleCount - r - 1] = o : r < 9 ? this.modules[8][15 - r - 1 + 1] = o : this.modules[8][15 - r - 1] = o
      }
      this.modules[this.moduleCount - 8][8] = !t
    },
    mapData: function(t, e) {
      for (var i = -1, r = this.moduleCount - 1, o = 7, n = 0, s = this.moduleCount - 1; s > 0; s -= 2)
        for (6 == s && s--;;) {
          for (var a = 0; a < 2; a++)
            if (null == this.modules[r][s - a]) {
              var h = !1;
              n < t.length && (h = 1 == (t[n] >>> o & 1));
              var l = u.getMask(e, r, s - a);
              l && (h = !h), this.modules[r][s - a] = h, -1 == --o && (n++, o = 7)
            } if ((r += i) < 0 || this.moduleCount <= r) {
            r -= i, i = -i;
            break
          }
        }
    }
  }, r.PAD0 = 236, r.PAD1 = 17, r.createData = function(t, e, i) {
    for (var o = g.getRSBlocks(t, e), n = new h, s = 0; s < i.length; s++) {
      var a = i[s];
      n.put(a.mode, 4), n.put(a.getLength(), u.getLengthInBits(a.mode, t)), a.write(n)
    }
    var l = 0;
    for (s = 0; s < o.length; s++) l += o[s].dataCount;
    if (n.getLengthInBits() > 8 * l) throw new Error("code length overflow. (" + n.getLengthInBits() + ">" + 8 * l + ")");
    for (n.getLengthInBits() + 4 <= 8 * l && n.put(0, 4); n.getLengthInBits() % 8 != 0;) n.putBit(!1);
    for (;;) {
      if (n.getLengthInBits() >= 8 * l) break;
      if (n.put(r.PAD0, 8), n.getLengthInBits() >= 8 * l) break;
      n.put(r.PAD1, 8)
    }
    return r.createBytes(n, o)
  }, r.createBytes = function(t, e) {
    for (var i = 0, r = 0, o = 0, n = new Array(e.length), s = new Array(e.length), a = 0; a < e.length; a++) {
      var h = e[a].dataCount,
        l = e[a].totalCount - h;
      r = Math.max(r, h), o = Math.max(o, l), n[a] = new Array(h);
      for (var c = 0; c < n[a].length; c++) n[a][c] = 255 & t.buffer[c + i];
      i += h;
      var d = u.getErrorCorrectPolynomial(l),
        p = new f(n[a], d.getLength() - 1).mod(d);
      s[a] = new Array(d.getLength() - 1);
      for (c = 0; c < s[a].length; c++) {
        var g = c + p.getLength() - s[a].length;
        s[a][c] = 0 <= g ? p.get(g) : 0
      }
    }
    for (var v = new Array, c = 0; c < r; c++)
      for (a = 0; a < e.length; a++) c < n[a].length && v.push(n[a][c]);
    for (c = 0; c < o; c++)
      for (a = 0; a < e.length; a++) c < s[a].length && v.push(s[a][c]);
    return v
  };
  for (var t = {
      MODE_NUMBER: 1,
      MODE_ALPHA_NUM: 2,
      MODE_8BIT_BYTE: 4,
      MODE_KANJI: 8
    }, e = {
      L: 1,
      M: 0,
      Q: 3,
      H: 2
    }, i = 0, o = function(e) {
      if (!/^[0-9]*$/.test(e)) throw new Error("invalid characters:" + e);
      this.mode = t.MODE_NUMBER, this.data = e
    }, n = function(e) {
      if (!/^[0-9A-Z $%*+\-./:]*$/.test(e)) throw new Error("invalid characters:" + e);
      this.mode = t.MODE_ALPHA_NUM, this.data = e
    }, s = function(e) {
      this.mode = t.MODE_8BIT_BYTE, this.data = e
    }, a = function(e) {
      this.mode = t.MODE_KANJI, this.data = e
    }, h = function() {
      this.buffer = new Array, this.length = 0
    }, l = {
      glog: function(t) {
        if (t < 1) throw new Error("glog(" + t + ")");
        return l.LOG_TABLE[t]
      },
      gexp: function(t) {
        for (; t < 0;) t += 255;
        for (; 256 <= t;) t -= 255;
        return l.EXP_TABLE[t]
      },
      EXP_TABLE: new Array(256),
      LOG_TABLE: new Array(256)
    }, c = 0; c < 8; c++) l.EXP_TABLE[c] = 1 << c;
  for (c = 8; c < 256; c++) l.EXP_TABLE[c] = l.EXP_TABLE[c - 4] ^ l.EXP_TABLE[c - 5] ^ l.EXP_TABLE[c - 6] ^ l.EXP_TABLE[c - 8];
  for (c = 0; c < 255; c++) l.LOG_TABLE[l.EXP_TABLE[c]] = c;
  var u = {
      PATTERN_POSITION_TABLE: [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
      ],
      G15: 1335,
      G18: 7973,
      G15_MASK: 21522,
      getBCHTypeInfo: function(t) {
        for (var e = t << 10; u.getBCHDigit(e) - u.getBCHDigit(u.G15) >= 0;) e ^= u.G15 << u.getBCHDigit(e) - u.getBCHDigit(u.G15);
        return (t << 10 | e) ^ u.G15_MASK
      },
      getBCHTypeNumber: function(t) {
        for (var e = t << 12; u.getBCHDigit(e) - u.getBCHDigit(u.G18) >= 0;) e ^= u.G18 << u.getBCHDigit(e) - u.getBCHDigit(u.G18);
        return t << 12 | e
      },
      getBCHDigit: function(t) {
        for (var e = 0; 0 != t;) e++, t >>>= 1;
        return e
      },
      getPatternPosition: function(t) {
        return u.PATTERN_POSITION_TABLE[t - 1]
      },
      getMask: function(t, e, i) {
        switch (t) {
          case 0:
            return (e + i) % 2 == 0;
          case 1:
            return e % 2 == 0;
          case 2:
            return i % 3 == 0;
          case 3:
            return (e + i) % 3 == 0;
          case 4:
            return (Math.floor(e / 2) + Math.floor(i / 3)) % 2 == 0;
          case 5:
            return e * i % 2 + e * i % 3 == 0;
          case 6:
            return (e * i % 2 + e * i % 3) % 2 == 0;
          case 7:
            return (e * i % 3 + (e + i) % 2) % 2 == 0;
          default:
            throw new Error("bad maskPattern:" + t)
        }
      },
      getErrorCorrectPolynomial: function(t) {
        for (var e = new f([1], 0), i = 0; i < t; i++) e = e.multiply(new f([1, l.gexp(i)], 0));
        return e
      },
      getLengthInBits: function(e, i) {
        if (1 <= i && i < 10) switch (e) {
          case t.MODE_NUMBER:
            return 10;
          case t.MODE_ALPHA_NUM:
            return 9;
          case t.MODE_8BIT_BYTE:
            return 8;
          case t.MODE_KANJI:
            return 8;
          default:
            throw new Error("mode:" + e)
        } else if (i < 27) switch (e) {
          case t.MODE_NUMBER:
            return 12;
          case t.MODE_ALPHA_NUM:
            return 11;
          case t.MODE_8BIT_BYTE:
            return 16;
          case t.MODE_KANJI:
            return 10;
          default:
            throw new Error("mode:" + e)
        } else {
          if (!(i < 41)) throw new Error("type:" + i);
          switch (e) {
            case t.MODE_NUMBER:
              return 14;
            case t.MODE_ALPHA_NUM:
              return 13;
            case t.MODE_8BIT_BYTE:
              return 16;
            case t.MODE_KANJI:
              return 12;
            default:
              throw new Error("mode:" + e)
          }
        }
      },
      getLostPoint: function(t) {
        for (var e = t.getModuleCount(), i = 0, r = 0; r < e; r++)
          for (var o = 0; o < e; o++) {
            for (var n = 0, s = t.isDark(r, o), a = -1; a <= 1; a++)
              if (!(r + a < 0 || e <= r + a))
                for (var h = -1; h <= 1; h++) o + h < 0 || e <= o + h || (0 == a && 0 == h || s == t.isDark(r + a, o + h) && n++);
            n > 5 && (i += 3 + n - 5)
          }
        for (r = 0; r < e - 1; r++)
          for (o = 0; o < e - 1; o++) {
            var l = 0;
            t.isDark(r, o) && l++, t.isDark(r + 1, o) && l++, t.isDark(r, o + 1) && l++, t.isDark(r + 1, o + 1) && l++, 0 != l && 4 != l || (i += 3)
          }
        for (r = 0; r < e; r++)
          for (o = 0; o < e - 6; o++) t.isDark(r, o) && !t.isDark(r, o + 1) && t.isDark(r, o + 2) && t.isDark(r, o + 3) && t.isDark(r, o + 4) && !t.isDark(r, o + 5) && t.isDark(r, o + 6) && (i += 40);
        for (o = 0; o < e; o++)
          for (r = 0; r < e - 6; r++) t.isDark(r, o) && !t.isDark(r + 1, o) && t.isDark(r + 2, o) && t.isDark(r + 3, o) && t.isDark(r + 4, o) && !t.isDark(r + 5, o) && t.isDark(r + 6, o) && (i += 40);
        for (var c = 0, o = 0; o < e; o++)
          for (r = 0; r < e; r++) t.isDark(r, o) && c++;
        var d = Math.abs(100 * c / e / e - 50) / 5;
        return i += 10 * d
      }
    },
    g = {
      getRSBlocks: function(t, i) {
        var r = g.getRsBlockTable(t, i);
        if (void 0 == r) throw new Error("bad rs block @ typeNumber:" + t + "/errorCorrectLevel:" + i);
        for (var o = r.length / 3, n = new Array, s = 0; s < o; s++)
          for (var a = r[3 * s + 0], h = r[3 * s + 1], l = r[3 * s + 2], c = 0; c < a; c++) n.push(new f(h, l));
        return n
      },
      getRsBlockTable: function(t, i) {
        switch (i) {
          case e.L:
            return d[t - 1];
          case e.M:
            return p[t - 1];
          case e.Q:
            return v[t - 1];
          case e.H:
            return m[t - 1];
          default:
            return
        }
      }
    },
    f = function(t, e) { this.totalCount = t, this.dataCount = e },
    d = [[1, 26, 19],[1, 44, 34],[1, 70, 55],[1, 100, 80],[1, 134, 108],[2, 86, 68],[2, 98, 78],[2, 121, 96],[2, 146, 116],[2, 86, 68],[2, 98, 78],[2, 121, 96],[2, 146, 116]],
    p = [[1, 26, 16],[1, 44, 28],[1, 70, 44],[1, 100, 64],[2, 67, 53],[2, 86, 68],[4, 43, 34],[4, 49, 39],[2, 60, 48],[4, 73, 58]],
    v = [[1, 26, 13],[2, 44, 22],[2, 70, 44],[4, 50, 32],[2, 67, 53],[4, 43, 34],[4, 49, 39],[4, 60, 48],[4, 73, 58]],
    m = [[1, 26, 9],[2, 44, 16],[2, 70, 28],[4, 50, 20],[4, 67, 39],[4, 86, 43],[4, 98, 49],[4, 121, 60]];
  return o.prototype = { getLength: function(){return this.data.length}, write: function(t){ /* ... */ }}, n.prototype = { getLength: function(){return this.data.length}, write: function(t){ /* ... */ }}, s.prototype = { getLength: function(){return this.data.length}, write: function(t){for(var e=0;e<this.data.length;e++)t.put(this.data.charCodeAt(e),8)}}, a.prototype = { getLength: function(){return this.data.length}, write: function(t){ /* ... */ }}, h.prototype = { get: function(t){var e=Math.floor(t/8);return 1==(this.buffer[e]>>>7-t%8&1)}, put:function(t,e){for(var i=0;i<e;i++)this.putBit(1==(t>>>e-i-1&1))},getLengthInBits:function(){return this.length},putBit:function(t){var e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}}, f.prototype = { get: function(t){return this.num[t]}, getLength: function(){return this.num.length}, multiply: function(t){for(var e=new Array(this.getLength()+t.getLength()-1),i=0;i<this.getLength();i++)for(var r=0;r<t.getLength();r++)e[i+r]^=l.gexp(l.glog(this.get(i))+l.glog(t.get(r)));return new f(e)}, mod: function(t){if(this.getLength()-t.getLength()<0)return this;for(var e=l.glog(this.get(0))-l.glog(t.get(0)),i=new Array(this.getLength()),r=0;r<this.getLength();r++)i[r]=this.get(r);for(r=0;r<t.getLength();r++)i[r]^=l.gexp(l.glog(t.get(r))+e);return new f(i).mod(t)}}, r
})();

function qrCode(options) {
  const ecl = { L: 1, M: 0, Q: 3, H: 2 };
  const qr = new QRCode(options.typeNumber || -1, ecl[options.ecl || 'Q']);
  qr.addData(options.content, 'Byte');
  qr.make();
  return qr.createSvgTag(options);
}

// =================================================================================
// Lógica Principal do Worker (Formato Módulos ES)
// =================================================================================

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/pix/code/generator' && request.method === 'POST') {
      try {
        const data = await request.json();
        const requiredFields = ['pixKey', 'merchantName', 'merchantCity'];
        for (const field of requiredFields) {
          if (!data[field]) {
            return new Response(JSON.stringify({ error: `O campo '${field}' é obrigatório.` }), { status: 400, headers: corsHeaders() });
          }
        }

        const pixPayload = generatePixPayload(data);
        
        let qrCodeSvg = null;
        try {
            qrCodeSvg = qrCode({
                content: pixPayload,
                padding: 4,
                width: 256,
                height: 256,
                ecl: 'Q'
            });
        } catch (e) {
            console.error("Falha na geração do QRCode:", e.message, e.stack);
        }
        
        return new Response(JSON.stringify({
          pixCopiaECola: pixPayload,
          qrCodeSvg: qrCodeSvg
        }), { status: 200, headers: corsHeaders() });

      } catch (error) {
        if (error instanceof SyntaxError) {
          return new Response(JSON.stringify({ error: 'Corpo da requisição não é um JSON válido.' }), { status: 400, headers: corsHeaders() });
        }
        console.error('Erro inesperado no handleRequest:', error.stack);
        return new Response(JSON.stringify({ error: `Ocorreu um erro interno: ${error.message}` }), { status: 500, headers: corsHeaders() });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), { status: 404, headers: corsHeaders() });
  }
};

// --- Funções de Suporte ---

function handleOptions(request) {
  let headers = request.headers;
  if (headers.get("Origin") !== null && headers.get("Access-Control-Request-Method") !== null && headers.get("Access-Control-Request-Headers") !== null) {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  } else {
    return new Response(null, { headers: { "Allow": "POST, OPTIONS" } });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json;charset=UTF-8'
  };
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
      if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ polynomial);
      else crc <<= 1;
    }
  }
  return ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
}

function generatePixPayload(data) {
  const { pixKey, description, merchantName, merchantCity, txid = '***', amount } = data;
  if (merchantName.length > 25) throw new Error("O nome do comerciante (merchantName) não pode exceder 25 caracteres.");
  if (merchantCity.length > 15) throw new Error("A cidade do comerciante (merchantCity) não pode exceder 15 caracteres.");
  if (txid && txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) throw new Error("O txid deve conter apenas letras e números e ter no máximo 25 caracteres.");
  if (description) {
    const maxDescLength = 99 - 4 - 14 - (4 + pixKey.length) - 4;
    if (description.length > maxDescLength) throw new Error(`A descrição é muito longa para a chave PIX fornecida. Máximo de ${maxDescLength} caracteres.`);
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
  let payload = `${formatField('00','01')}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${formattedAmount}${countryCode}${merchantNameFormatted}${merchantCityFormatted}${additionalDataField}`;
  const payloadWithCrcId = `${payload}6304`;
  const crc = calculateCRC16(payloadWithCrcId);
  return `${payload}6304${crc}`;
}

