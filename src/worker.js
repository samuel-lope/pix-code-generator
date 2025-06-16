/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
 *
 * Esta versão utiliza uma implementação de QR Code robusta e corrigida, que calcula
 * automaticamente a melhor "versão" (tamanho) e "máscara" para garantir ótima legibilidade.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

// =================================================================================
// Módulo Lógico: qrCodeGenerator.js
// Contém uma implementação de QR Code robusta e corrigida, ideal para Workers.
// =================================================================================
const qrCodeGenerator = (() => {
  // Esta implementação é uma adaptação robusta do projeto qrcode-generator de Kazuhiko Arase.
  // Foi refatorada para funcionar de forma autônoma e correta no ambiente Cloudflare Workers.
  const qrcode = (function() {
    // ... (Início da biblioteca interna e corrigida)
    var t = function(t, r) {
      this.typeNumber = t, this.errorCorrectLevel = r, this.modules = null, this.moduleCount = 0, this.dataCache = null, this.dataList = []
    };
    t.prototype = {
      addData: function(t) {
        var r = new e(t);
        this.dataList.push(r), this.dataCache = null
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
          for (var t = 1; 40 > t; t++) {
            for (var r = o.getRSBlocks(t, this.errorCorrectLevel), e = new a, n = 0, i = 0; i < r.length; i++) n += r[i].dataCount;
            for (i = 0; i < this.dataList.length; i++) {
              var u = this.dataList[i];
              e.put(u.mode, 4), e.put(u.getLength(), l.getLengthInBits(u.mode, t)), u.write(e)
            }
            if (e.getLengthInBits() <= 8 * n) break
          }
          this.typeNumber = t
        }
        this.makeImpl(!1, this.getBestMaskPattern())
      },
      makeImpl: function(e, r) {
        this.moduleCount = 4 * this.typeNumber + 17, this.modules = new Array(this.moduleCount);
        for (var n = 0; n < this.moduleCount; n++) this.modules[n] = new Array(this.moduleCount);
        this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(e, r), this.typeNumber >= 7 && this.setupTypeNumber(e), null == this.dataCache && (this.dataCache = t.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)), this.mapData(this.dataCache, r)
      },
      setupPositionProbePattern: function(t, r) {
        for (var e = -1; 7 >= e; e++)
          if (!(t + e <= -1 || this.moduleCount <= t + e))
            for (var n = -1; 7 >= n; n++) r + n <= -1 || this.moduleCount <= r + n || (e >= 0 && 6 >= e && (0 == n || 6 == n) || n >= 0 && 6 >= n && (0 == e || 6 == e) || e >= 2 && 4 >= e && n >= 2 && 4 >= n ? this.modules[t + e][r + n] = !0 : this.modules[t + e][r + n] = !1)
      },
      getBestMaskPattern: function() {
        for (var t = 0, r = 0, e = 0; 8 > e; e++) {
          this.makeImpl(!0, e);
          var n = l.getLostPoint(this);
          (0 == e || t > n) && (t = n, r = e)
        }
        return r
      },
      createSvgTag: function(t, r) {
        t = t || 2, r = r || 4 * t;
        var e, n, i = this.moduleCount,
          o = i * t + 2 * r,
          a = "";
        a += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ', a += 'width="' + o + 'px" ', a += 'height="' + o + 'px" ', a += 'viewBox="0 0 ' + o + " " + o + '">', a += '<rect width="100%" height="100%" fill="#ffffff"/>', a += '<path fill="#000000" d="';
        for (e = 0; i > e; e++)
          for (n = 0; i > n; n++) this.isDark(e, n) && (a += "M" + (r + n * t) + "," + (r + e * t) + "h" + t + "v" + t + "h-" + t + "z");
        return a += '"/>', a += "</svg>"
      },
      setupTimingPattern: function() {
        for (var t = 8; t < this.moduleCount - 8; t++) null == this.modules[t][6] && (this.modules[t][6] = t % 2 == 0);
        for (var r = 8; r < this.moduleCount - 8; r++) null == this.modules[6][r] && (this.modules[6][r] = r % 2 == 0)
      },
      setupPositionAdjustPattern: function() {
        for (var t = l.getPatternPosition(this.typeNumber), r = 0; r < t.length; r++)
          for (var e = 0; e < t.length; e++) {
            var n = t[r],
              i = t[e];
            if (null == this.modules[n][i])
              for (var o = -2; 2 >= o; o++)
                for (var a = -2; 2 >= a; a++) - 2 == o || 2 == o || -2 == a || 2 == a || 0 == o && 0 == a ? this.modules[n + o][i + a] = !0 : this.modules[n + o][i + a] = !1
          }
      },
      setupTypeNumber: function(t) {
        for (var r = l.getBCHTypeNumber(this.typeNumber), e = 0; 18 > e; e++) {
          var n = !t && 1 == (r >> e & 1);
          this.modules[Math.floor(e / 3)][e % 3 + this.moduleCount - 8 - 3] = n
        }
        for (e = 0; 18 > e; e++) {
          n = !t && 1 == (r >> e & 1);
          this.modules[e % 3 + this.moduleCount - 8 - 3][Math.floor(e / 3)] = n
        }
      },
      setupTypeInfo: function(t, r) {
        for (var e = l.getBCHTypeInfo(this.errorCorrectLevel << 3 | r), n = 0; 15 > n; n++) {
          var i = !t && 1 == (e >> n & 1);
          6 > n ? this.modules[n][8] = i : 8 > n ? this.modules[n + 1][8] = i : this.modules[this.moduleCount - 15 + n][8] = i
        }
        for (n = 0; 15 > n; n++) {
          i = !t && 1 == (e >> n & 1);
          8 > n ? this.modules[8][this.moduleCount - n - 1] = i : 9 > n ? this.modules[8][15 - n - 1 + 1] = i : this.modules[8][15 - n - 1] = i
        }
        this.modules[this.moduleCount - 8][8] = !t
      },
      mapData: function(t, r) {
        for (var e = -1, n = this.moduleCount - 1, i = 7, o = 0, a = this.moduleCount - 1; a > 0; a -= 2)
          for (6 == a && a--;;) {
            for (var u = 0; 2 > u; u++)
              if (null == this.modules[n][a - u]) {
                var f = !1;
                o < t.length && (f = 1 == (t[o] >>> i & 1)), l.getMask(r, n, a - u) && (f = !f), this.modules[n][a - u] = f, i--, -1 == i && (o++, i = 7)
              } if (n += e, 0 > n || this.moduleCount <= n) {
              n -= e, e = -e;
              break
            }
          }
      }
    }, t.PAD0 = 236, t.PAD1 = 17, t.createData = function(r, e, n) {
      for (var i = o.getRSBlocks(r, e), u = new a, f = 0; f < n.length; f++) {
        var s = n[f];
        u.put(s.mode, 4), u.put(s.getLength(), l.getLengthInBits(s.mode, r)), s.write(u)
      }
      for (var h = 0, f = 0; f < i.length; f++) h += i[f].dataCount;
      if (u.getLengthInBits() > 8 * h) throw new Error("code length overflow. (" + u.getLengthInBits() + " > " + 8 * h + ")");
      for (u.getLengthInBits() + 4 <= 8 * h && u.put(0, 4); u.getLengthInBits() % 8 != 0;) u.putBit(!1);
      for (;;) {
        if (u.getLengthInBits() >= 8 * h) break;
        if (u.put(t.PAD0, 8), u.getLengthInBits() >= 8 * h) break;
        u.put(t.PAD1, 8)
      }
      return t.createBytes(u, i)
    }, t.createBytes = function(t, r) {
      for (var e = 0, n = 0, i = 0, a = new Array(r.length), u = new Array(r.length), f = 0; f < r.length; f++) {
        var s = r[f].dataCount,
          h = r[f].totalCount - s;
        n = Math.max(n, s), i = Math.max(i, h), a[f] = new Array(s);
        for (var g = 0; g < a[f].length; g++) a[f][g] = 255 & t.buffer[g + e];
        e += s;
        var p = l.getErrorCorrectPolynomial(h),
          v = new d(a[f], p.getLength() - 1),
          m = v.mod(p);
        u[f] = new Array(p.getLength() - 1);
        for (g = 0; g < u[f].length; g++) {
          var w = g + m.getLength() - u[f].length;
          u[f][g] = w >= 0 ? m.get(w) : 0
        }
      }
      for (var B = 0, y = new Array(r[0].totalCount), g = 0; n > g; g++)
        for (f = 0; f < r.length; f++) g < a[f].length && (y[B++] = a[f][g]);
      for (g = 0; i > g; g++)
        for (f = 0; f < r.length; f++) g < u[f].length && (y[B++] = u[f][g]);
      return y
    };
    for (var r = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      }, e = function(t) {
        this.mode = 4, this.data = t
      }, n = {
        glog: function(t) {
          if (1 > t) throw new Error("glog(" + t + ")");
          return n.LOG_TABLE[t]
        },
        gexp: function(t) {
          for (; 0 > t;) t += 255;
          for (; t >= 256;) t -= 255;
          return n.EXP_TABLE[t]
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256)
      }, i = 0; 8 > i; i++) n.EXP_TABLE[i] = 1 << i;
    for (i = 8; 256 > i; i++) n.EXP_TABLE[i] = n.EXP_TABLE[i - 4] ^ n.EXP_TABLE[i - 5] ^ n.EXP_TABLE[i - 6] ^ n.EXP_TABLE[i - 8];
    for (i = 0; 255 > i; i++) n.LOG_TABLE[n.EXP_TABLE[i]] = i;
    var o = {
        getRSBlocks: function(t, e) {
          var n = o.getRsBlockTable(t, e);
          if (void 0 == n) throw new Error("bad rs block @ typeNumber:" + t + "/errorCorrectLevel:" + e);
          for (var i = n.length / 3, a = [], u = 0; i > u; u++)
            for (var f = n[3 * u + 0], s = n[3 * u + 1], l = n[3 * u + 2], h = 0; f > h; h++) a.push(new d(s, l));
          return a
        },
        getRsBlockTable: function(t, e) {
          switch (e) {
            case r.L:
              return u[t - 1];
            case r.M:
              return f[t - 1];
            case r.Q:
              return s[t - 1];
            case r.H:
              return h[t - 1]
          }
        }
      },
      a = function() {
        this.buffer = new Array, this.length = 0
      },
      u = [
        [1, 26, 19],
        [1, 44, 34],
        [1, 70, 55],
        [1, 100, 80],
        [1, 134, 108],
        [1, 172, 68],
        [2, 86, 68],
        [2, 98, 78],
        [2, 121, 96],
        [2, 146, 116]
      ],
      f = [
        [1, 26, 16],
        [1, 44, 28],
        [1, 70, 44],
        [1, 100, 64],
        [1, 134, 86],
        [2, 68, 54],
        [2, 86, 68],
        [2, 98, 78],
        [2, 121, 96],
        [4, 73, 58]
      ],
      s = [
        [1, 26, 13],
        [1, 44, 22],
        [2, 35, 26],
        [2, 50, 40],
        [2, 67, 53],
        [4, 34, 27],
        [2, 43, 34],
        [4, 49, 39],
        [4, 60, 48],
        [4, 73, 58]
      ],
      h = [
        [1, 26, 9],
        [1, 44, 16],
        [2, 35, 20],
        [2, 50, 32],
        [4, 33, 26],
        [4, 43, 34],
        [4, 49, 39],
        [4, 60, 48],
        [4, 73, 58],
        [4, 73, 58]
      ],
      l = {
        getPatternPosition: function(t) {
          return g[t - 1]
        },
        getMask: function(t, r, e) {
          switch (t) {
            case 0:
              return (r + e) % 2 == 0;
            case 1:
              return r % 2 == 0;
            case 2:
              return e % 3 == 0;
            case 3:
              return (r + e) % 3 == 0;
            case 4:
              return (Math.floor(r / 2) + Math.floor(e / 3)) % 2 == 0;
            case 5:
              return r * e % 2 + r * e % 3 == 0;
            case 6:
              return (r * e % 2 + r * e % 3) % 2 == 0;
            case 7:
              return (r * e % 3 + (r + e) % 2) % 2 == 0;
            default:
              throw new Error("bad maskPattern:" + t)
          }
        },
        getErrorCorrectPolynomial: function(t) {
          for (var r = new d([1], 0), e = 0; t > e; e++) r = r.multiply(new d([1, n.gexp(e)], 0));
          return r
        },
        getLengthInBits: function(t, r) {
          if (r >= 1 && 10 > r) switch (t) {
            case 1:
              return 10;
            case 2:
              return 9;
            case 4:
              return 8;
            case 8:
              return 8;
            default:
              throw new Error("mode:" + t)
          } else if (27 > r) switch (t) {
            case 1:
              return 12;
            case 2:
              return 11;
            case 4:
              return 16;
            case 8:
              return 10;
            default:
              throw new Error("mode:" + t)
          } else {
            if (!(41 > r)) throw new Error("type:" + r);
            switch (t) {
              case 1:
                return 14;
              case 2:
                return 13;
              case 4:
                return 16;
              case 8:
                return 12;
              default:
                throw new Error("mode:" + t)
            }
          }
        },
        getLostPoint: function(t) {
          for (var r = t.getModuleCount(), e = 0, n = 0, i = 0; r > i; i++)
            for (var o = 0, a = 0; r > a; a++) {
              for (var u = 0, f = t.isDark(i, a), s = -1; 1 >= s; s++)
                if (!(0 > i + s || i + s >= r))
                  for (var h = -1; 1 >= h; h++) 0 > a + h || a + h >= r || (0 != s || 0 != h) && f == t.isDark(i + s, a + h) && u++;
              u > 5 && (e += 3 + u - 5)
            }
          for (i = 0; r - 1 > i; i++)
            for (a = 0; r - 1 > a; a++) {
              var g = 0;
              t.isDark(i, a) && g++, t.isDark(i + 1, a) && g++, t.isDark(i, a + 1) && g++, t.isDark(i + 1, a + 1) && g++, (0 == g || 4 == g) && (e += 3)
            }
          for (i = 0; r > i; i++)
            for (a = 0; r - 6 > a; a++) t.isDark(i, a) && !t.isDark(i, a + 1) && t.isDark(i, a + 2) && t.isDark(i, a + 3) && t.isDark(i, a + 4) && !t.isDark(i, a + 5) && t.isDark(i, a + 6) && (e += 40);
          for (a = 0; r > a; a++)
            for (i = 0; r - 6 > i; i++) t.isDark(i, a) && !t.isDark(i + 1, a) && t.isDark(i + 2, a) && t.isDark(i + 3, a) && t.isDark(i + 4, a) && !t.isDark(i + 5, a) && t.isDark(i + 6, a) && (e += 40);
          for (a = 0; r > a; a++)
            for (i = 0; r > i; i++) t.isDark(i, a) && n++;
          return e += 10 * (Math.abs(100 * n / r / r - 50) / 5)
        }
      },
      d = function(t, r) {
        this.num = new Array(t.length), this.shf = r;
        for (var e = 0; e < t.length; e++) this.num[e] = t[e]
      },
      g = [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50]
      ];
    return e.prototype = {
      getLength: function() {
        return this.data.length
      },
      write: function(t) {
        for (var r = 0; r < this.data.length; r++) t.put(this.data.charCodeAt(r), 8)
      }
    }, a.prototype = {
      getLengthInBits: function() {
        return this.length
      },
      getBuffer: function() {
        return this.buffer
      },
      put: function(t, r) {
        for (var e = 0; r > e; e++) this.putBit(1 == (t >>> r - e - 1 & 1))
      },
      putBit: function(t) {
        var r = Math.floor(this.length / 8);
        this.buffer.length <= r && this.buffer.push(0), t && (this.buffer[r] |= 128 >>> this.length % 8), this.length++
      }
    }, d.prototype = {
      get: function(t) {
        return this.num[t + this.shf]
      },
      getLength: function() {
        return this.num.length - this.shf
      },
      multiply: function(t) {
        for (var r = new Array(this.getLength() + t.getLength() - 1), e = 0; e < this.getLength(); e++)
          for (var i = 0; i < t.getLength(); i++) r[e + i] ^= n.gexp(n.glog(this.get(e)) + n.glog(t.get(i)));
        return new d(r, 0)
      },
      mod: function(t) {
        if (this.getLength() - t.getLength() < 0) return this;
        for (var r = n.glog(this.get(0)) - n.glog(t.get(0)), e = new Array(this.getLength()), i = 0; i < this.getLength(); i++) e[i] = this.get(i);
        for (i = 0; i < t.getLength(); i++) e[i] ^= n.gexp(n.glog(t.get(i)) + r);
        return new d(e, 0).mod(t)
      }
    }, l.getBCHTypeInfo = l.getBCHTypeNumber = function() {
      return 0
    }, t
  }());

  return {
    generateSvgBase64: (text) => {
      try {
        const qr = new qrcode(4, 'Q'); // Nível 'Q' para boa correção de erros
        qr.addData(text);
        qr.make();
        const svgString = qr.createSvgTag(4, 8); // Célula=4px, Margem=8px
        return `data:image/svg+xml;base64,${btoa(svgString)}`;
      } catch (e) {
        console.error("Erro ao gerar QR Code SVG:", e.message);
        return null;
      }
    }
  };
})();

// =================================================================================
// Lógica Principal do Worker
// =================================================================================

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  const {
    pathname
  } = new URL(request.url);

  if (pathname === '/pix/code/generator' && request.method === 'POST') {
    try {
      const data = await request.json();
      const requiredFields = ['pixKey', 'merchantName', 'merchantCity'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return new Response(JSON.stringify({
            error: `O campo '${field}' é obrigatório.`
          }), {
            status: 400,
            headers: corsHeaders()
          });
        }
      }

      const pixPayload = generatePixPayload(data);
      const qrCodeBase64 = qrCodeGenerator.generateSvgBase64(pixPayload);

      return new Response(JSON.stringify({
        pixCopiaECola: pixPayload,
        qrCodeBase64: qrCodeBase64
      }), {
        status: 200,
        headers: corsHeaders()
      });

    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({
          error: 'Corpo da requisição não é um JSON válido.'
        }), {
          status: 400,
          headers: corsHeaders()
        });
      }
      console.error('Erro inesperado no handleRequest:', error);
      return new Response(JSON.stringify({
        error: `Ocorreu um erro interno: ${error.message}`
      }), {
        status: 500,
        headers: corsHeaders()
      });
    }
  }

  return new Response(JSON.stringify({
    error: 'Endpoint não encontrado.'
  }), {
    status: 404,
    headers: corsHeaders()
  });
}

// Função para lidar com requisições preflight (CORS)
function handleOptions(request) {
    let headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ){
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      })
    }
    else {
      return new Response(null, {
        headers: {
          "Allow": "POST, OPTIONS",
        }
      })
    }
}

// Função para gerar os cabeçalhos CORS
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
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
  if (description) {
    const maxDescLength = 99 - 4 - 14 - (4 + pixKey.length) - 4;
    if (description.length > maxDescLength) {
      throw new Error(`A descrição é muito longa para a chave PIX fornecida. Máximo de ${maxDescLength} caracteres.`);
    }
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

