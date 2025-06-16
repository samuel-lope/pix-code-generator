/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
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
 * "qrCodeBase64": "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zP..."
 * }
 */

// =================================================================================
// Módulo Lógico: qrCodeGenerator.js
// Biblioteca de QR Code adaptada e encapsulada para funcionar de forma limpa no Worker.
// =================================================================================
const qrCodeGenerator = new(function() {
  // O código da biblioteca qrcode-generator é colocado aqui dentro como uma implementação privada.
  // Original: https://github.com/kazuhikoarase/qrcode-generator
  var qrcode = function() {
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
        for (var t = 1; t <= 40; t++) {
          var e = o.getRSBlocks(t, this.errorCorrectLevel),
            r = new a;
          r.put(4, 4);
          if (this.dataList.length > 0) {
            r.put(this.dataList[0].getLength(), i.getLengthInBits(4, t));
            this.dataList[0].write(r);
          }
          var n = 0;
          for (var u = 0; u < e.length; u++) n += e[u].dataCount;
          if (r.getLengthInBits() <= 8 * n) {
            this.typeNumber = t;
            break
          }
        }
        this.makeImpl(!1, this.getBestMaskPattern())
      },
      makeImpl: function(e, r) {
        this.moduleCount = 4 * this.typeNumber + 17, this.modules = new Array(this.moduleCount);
        for (var n = 0; n < this.moduleCount; n++) this.modules[n] = new Array(this.moduleCount);
        this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(e, r), 7 <= this.typeNumber && this.setupTypeNumber(e), null == this.dataCache && (this.dataCache = t.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)), this.mapData(this.dataCache, r)
      },
      setupPositionProbePattern: function(t, e) {
        for (var r = -1; r <= 7; r++)
          if (!(t + r <= -1 || this.moduleCount <= t + r))
            for (var n = -1; n <= 7; n++) e + n <= -1 || this.moduleCount <= e + n || (0 <= r && r <= 6 && (0 == n || 6 == n) || 0 <= n && n <= 6 && (0 == r || 6 == r) || 2 <= r && r <= 4 && 2 <= n && n <= 4 ? this.modules[t + r][e + n] = !0 : this.modules[t + r][e + n] = !1)
      },
      getBestMaskPattern: function() {
        for (var t = 0, e = 0, r = 0; r < 8; r++) {
          this.makeImpl(!0, r);
          var n = i.getLostPoint(this);
          (0 == r || t > n) && (t = n, e = r)
        }
        return e
      },
      setupTimingPattern: function() {
        for (var t = 8; t < this.moduleCount - 8; t++) null == this.modules[t][6] && (this.modules[t][6] = t % 2 == 0);
        for (var e = 8; e < this.moduleCount - 8; e++) null == this.modules[6][e] && (this.modules[6][e] = e % 2 == 0)
      },
      setupPositionAdjustPattern: function() {
        for (var t = i.getPatternPosition(this.typeNumber), e = 0; e < t.length; e++)
          for (var r = 0; r < t.length; r++) {
            var n = t[e],
              o = t[r];
            if (null == this.modules[n][o])
              for (var a = -2; a <= 2; a++)
                for (var u = -2; u <= 2; u++) - 2 == a || 2 == a || -2 == u || 2 == u || 0 == a && 0 == u ? this.modules[n + a][o + u] = !0 : this.modules[n + a][o + u] = !1
          }
      },
      setupTypeNumber: function(t) {
        for (var e = i.getBCHTypeNumber(this.typeNumber), r = 0; r < 18; r++) {
          var n = !t && 1 == (e >> r & 1);
          this.modules[Math.floor(r / 3)][r % 3 + this.moduleCount - 8 - 3] = n
        }
        for (r = 0; r < 18; r++) {
          n = !t && 1 == (e >> r & 1);
          this.modules[r % 3 + this.moduleCount - 8 - 3][Math.floor(r / 3)] = n
        }
      },
      setupTypeInfo: function(t, e) {
        for (var r = i.getBCHTypeInfo(this.errorCorrectLevel << 3 | e), n = 0; n < 15; n++) {
          var o = !t && 1 == (r >> n & 1);
          n < 6 ? this.modules[n][8] = o : n < 8 ? this.modules[n + 1][8] = o : this.modules[this.moduleCount - 15 + n][8] = o
        }
        for (n = 0; n < 15; n++) {
          o = !t && 1 == (r >> n & 1);
          n < 8 ? this.modules[8][this.moduleCount - n - 1] = o : n < 9 ? this.modules[8][15 - n - 1 + 1] = o : this.modules[8][15 - n - 1] = o
        }
        this.modules[this.moduleCount - 8][8] = !t
      },
      mapData: function(t, e) {
        for (var r = -1, n = this.moduleCount - 1, o = 7, a = 0, u = this.moduleCount - 1; 0 < u; u -= 2)
          for (6 == u && (u -= 1);;) {
            for (var l = 0; l < 2; l++)
              if (null == this.modules[n][u - l]) {
                var f = !1;
                a < t.length && (f = 1 == (t[a] >>> o & 1));
                i.getMask(e, n, u - l) && (f = !f), this.modules[n][u - l] = f, -1 == --o && (a++, o = 7)
              } if ((n += r) < 0 || this.moduleCount <= n) {
              n -= r, r = -r;
              break
            }
          }
      },
      createSvgTag: function(t, e) {
        t = t || 2, e = e || 4 * t;
        var r = this.getModuleCount(),
          n = r * t + 2 * e,
          o = "";
        o += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
        o += ' width="' + n + 'px"', o += ' height="' + n + 'px"', o += ' viewBox="0 0 ' + n + " " + n + '">', o += '<rect width="100%" height="100%" fill="#ffffff"/>', o += '<path d="';
        for (var a = e, i = e, u = 0; u < r; u++) {
          for (var l = 0; l < r; l++) this.isDark(u, l) && (o += "M" + (a + l * t) + " " + (i + u * t) + "h" + t + "v" + t + "h-" + t + "z");
        }
        return o += '" stroke="transparent" fill="#000000"/></svg>'
      }
    };
    t.createData = function(t, e, r) {
      for (var n = o.getRSBlocks(t, e), u = new a, l = 0; l < r.length; l++) {
        var f = r[l];
        u.put(f.mode, 4), u.put(f.getLength(), i.getLengthInBits(f.mode, t)), f.write(u)
      }
      var d = 0;
      for (l = 0; l < n.length; l++) d += n[l].dataCount;
      if (u.getLengthInBits() > 8 * d) throw new Error("code length overflow. (" + u.getLengthInBits() + ">" + 8 * d + ")");
      for (u.getLengthInBits() + 4 <= 8 * d && u.put(0, 4); u.getLengthInBits() % 8 != 0;) u.putBit(!1);
      for (; !(u.getLengthInBits() >= 8 * d);) {
        if (u.put(236, 8), u.getLengthInBits() >= 8 * d) break;
        u.put(17, 8)
      }
      return t.createBytes(u, n)
    };
    t.createBytes = function(t, e) {
      for (var r = 0, n = 0, i = 0, o = new Array(e.length), u = new Array(e.length), l = 0; l < e.length; l++) {
        var f = e[l].dataCount,
          d = e[l].totalCount - f;
        n = Math.max(n, f), i = Math.max(i, d), o[l] = new Array(f);
        for (var c = 0; c < o[l].length; c++) o[l][c] = 255 & t.buffer[c + r];
        r += f;
        var s = g.getErrorCorrectPolynomial(d),
          h = new g(o[l], s.getLength() - 1),
          v = h.mod(s);
        u[l] = new Array(s.getLength() - 1);
        for (c = 0; c < u[l].length; c++) {
          var m = c + v.getLength() - u[l].length;
          u[l][c] = 0 <= m ? v.get(m) : 0
        }
      }
      for (var p = 0, w = new Array(e[0].totalCount), c = 0; c < n; c++)
        for (l = 0; l < e.length; l++) c < o[l].length && (w[p++] = o[l][c]);
      for (c = 0; c < i; c++)
        for (l = 0; l < e.length; l++) c < u[l].length && (w[p++] = u[l][c]);
      return w
    };
    var e = function(t) {
        this.mode = 4, this.data = t
      },
      o = function() {
        var t = [
            [],
            [1, 26, 19],
            [1, 44, 34]
          ],
          e = [
            [],
            [1, 26, 16],
            [1, 44, 28]
          ],
          o = [
            [],
            [1, 26, 13],
            [1, 44, 22]
          ],
          a = [
            [],
            [1, 26, 9],
            [1, 44, 16]
          ],
          i = {
            getRSBlocks: function(n, i) {
              var u = function(r, n) {
                switch (n) {
                  case 1:
                    return t[r - 1];
                  case 0:
                    return e[r - 1];
                  case 3:
                    return o[r - 1];
                  case 2:
                    return a[r - 1]
                }
              }(n, i);
              if ("undefined" == typeof u) throw new Error("bad rs block @ typeNumber:" + n + "/errorCorrectLevel:" + i);
              for (var l = u.length / 3, f = new Array, d = 0; d < l; d++)
                for (var c = u[3 * d], s = u[3 * d + 1], h = u[3 * d + 2], g = 0; g < c; g++) f.push(new v(s, h));
              return f
            }
          };
        return i
      }(),
      a = function() {
        var t = [];
        this.getBuffer = function() {
          return t
        }, this.getAt = function(e) {
          var r = Math.floor(e / 8);
          return 1 == (t[r] >>> 7 - e % 8 & 1)
        }, this.put = function(e, r) {
          for (var n = 0; n < r; n++) this.putBit(1 == (e >>> r - n - 1 & 1))
        }, this.getLengthInBits = function() {
          return t.length
        }, this.putBit = function(e) {
          var r = Math.floor(t.length / 8);
          t.length % 8 == 0 && (t[r] = 0), e && (t[r] |= 128 >>> t.length % 8), t.length++
        }
      },
      i = {
        getLengthInBits: function(t, e) {
          if (1 <= e && e < 10) {
            switch (t) {
              case 1:
                return 10;
              case 2:
                return 9;
              case 4:
              case 8:
                return 8;
              default:
                throw new Error("mode:" + t)
            }
          } else if (e < 27) {
            switch (t) {
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
            }
          } else if (e < 41) {
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
          } else {
            throw new Error("type:" + e)
          }
        },
        getLostPoint: function(t) {
          for (var e = t.getModuleCount(), r = 0, n = 0; n < e; n++)
            for (var o = 0; o < e; o++) {
              for (var a = 0, i = t.isDark(n, o), u = -1; u <= 1; u++)
                if (!(n + u < 0 || e <= n + u))
                  for (var l = -1; l <= 1; l++) o + l < 0 || e <= o + l || 0 == u && 0 == l || i == t.isDark(n + u, o + l) && a++;
              5 < a && (r += 3 + a - 5)
            }
          for (n = 0; n < e - 1; n++)
            for (o = 0; o < e - 1; o++) {
              var f = 0;
              t.isDark(n, o) && f++, t.isDark(n + 1, o) && f++, t.isDark(n, o + 1) && f++, t.isDark(n + 1, o + 1) && f++, 0 != f && 4 != f || (r += 3)
            }
          for (n = 0; n < e; n++)
            for (o = 0; o < e - 6; o++) t.isDark(n, o) && !t.isDark(n, o + 1) && t.isDark(n, o + 2) && t.isDark(n, o + 3) && t.isDark(n, o + 4) && !t.isDark(n, o + 5) && t.isDark(n, o + 6) && (r += 40);
          for (o = 0; o < e; o++)
            for (n = 0; n < e - 6; n++) t.isDark(n, o) && !t.isDark(n + 1, o) && t.isDark(n + 2, o) && t.isDark(n + 3, o) && t.isDark(n + 4, o) && !t.isDark(n + 5, o) && t.isDark(n + 6, o) && (r += 40);
          var d = 0;
          for (o = 0; o < e; o++)
            for (n = 0; n < e; n++) t.isDark(n, o) && d++;
          return r += 10 * (Math.abs(100 * d / e / e - 50) / 5)
        },
        getPatternPosition: function(t) {
          return n[t - 1]
        },
        getBCHTypeNumber: function(t) {
          for (var e = t << 12; 0 <= getBCHDigit(e) - getBCHDigit(119943);) e ^= 119943 << getBCHDigit(e) - getBCHDigit(119943);
          return t << 12 | e
        },
        getBCHTypeInfo: function(t) {
          for (var e = t << 10; 0 <= getBCHDigit(e) - getBCHDigit(537);) e ^= 537 << getBCHDigit(e) - getBCHDigit(537);
          return t << 10 | e ^ 21522
        },
        getMask: function(t, e, r) {
          switch (t) {
            case 0:
              return (e + r) % 2 == 0;
            case 1:
              return e % 2 == 0;
            case 2:
              return r % 3 == 0;
            case 3:
              return (e + r) % 3 == 0;
            case 4:
              return (Math.floor(e / 2) + Math.floor(r / 3)) % 2 == 0;
            case 5:
              return e * r % 2 + e * r % 3 == 0;
            case 6:
              return (e * r % 2 + e * r % 3) % 2 == 0;
            case 7:
              return (e * r % 3 + (e + r) % 2) % 2 == 0;
            default:
              throw new Error("bad maskPattern:" + t)
          }
        }
      },
      n = [
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
        [6, 26, 48, 70]
      ],
      g = function(t, e) {
        this.num = t, this.shf = e
      },
      v = function(t, e) {
        this.totalCount = t, this.dataCount = e
      };
    return e.prototype = {
      getLength: function() {
        return this.data.length
      },
      write: function(t) {
        for (var e = 0; e < this.data.length; e++) t.put(this.data.charCodeAt(e), 8)
      }
    }, g.prototype = {
      get: function(t) {
        return this.num[t + this.shf]
      },
      getLength: function() {
        return this.num.length - this.shf
      },
      multiply: function(t) {
        for (var e = new Array(this.getLength() + t.getLength() - 1), r = 0; r < this.getLength(); r++)
          for (var n = 0; n < t.getLength(); n++) e[r + n] ^= u.gexp(u.glog(this.get(r)) + u.glog(t.get(n)));
        return new g(e, 0)
      },
      mod: function(t) {
        if (this.getLength() - t.getLength() < 0) return this;
        for (var e = u.glog(this.get(0)) - u.glog(t.get(0)), r = new Array(this.getLength()), n = 0; n < this.getLength(); n++) r[n] = this.get(n);
        for (n = 0; n < t.getLength(); n++) r[n] ^= u.gexp(u.glog(t.get(n)) + e);
        return new g(r, 0).mod(t)
      }
    }, u = function() {
      for (var t = new Array(256), e = new Array(255), r = 1, n = 0; n < 255; n++) t[n] = r, e[r] = n, 128 & (r <<= 1) && (r ^= 285);
      for (n = 255; n < 512; n++) t[n] = t[n - 255];
      return {
        glog: function(t) {
          if (t < 1) throw new Error("glog(" + t + ")");
          return e[t]
        },
        gexp: function(e) {
          return t[e]
        }
      }
    }(), t
  };
  this.generateSvgBase64 = function(text) {
    try {
      var qr = new qrcode();
      qr.addData(text);
      qr.make();
      var svgString = qr.createSvgTag(4, 8);
      var svgBase64 = btoa(svgString);
      return `data:image/svg+xml;base64,${svgBase64}`;
    } catch (e) {
      console.error("Erro ao gerar QR Code:", e);
      throw new Error("Falha na geração do QR Code SVG.");
    }
  };
});


// =================================================================================
// Lógica Principal do Worker
// =================================================================================

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
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
            headers: {
              'Content-Type': 'application/json'
            },
          });
        }
      }

      const pixPayload = generatePixPayload(data);

      // Geração do QR Code usando o módulo encapsulado
      const qrCodeBase64 = qrCodeGenerator.generateSvgBase64(pixPayload);

      return new Response(JSON.stringify({
        pixCopiaECola: pixPayload,
        qrCodeBase64: qrCodeBase64
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
      });

    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({
          error: 'Corpo da requisição não é um JSON válido.'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
        });
      }
      console.error('Erro inesperado:', error);
      return new Response(JSON.stringify({
        error: `Ocorreu um erro interno: ${error.message}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        },
      });
    }
  }

  return new Response(JSON.stringify({
    error: 'Endpoint não encontrado.'
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json'
    },
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
  if (description) {
    const maxDescLength = 99 - 4 - 14 - (4 + pixKey.length) - 4;
    if (description.length > maxDescLength) {
       throw new Error(`A descrição é muito longa para a chave fornecida. Máximo de ${maxDescLength} caracteres.`);
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

  let payload = `${formatField('00', '01')}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${formattedAmount}${countryCode}${merchantNameFormatted}${merchantCityFormatted}${additionalDataField}`;

  const payloadWithCrcId = `${payload}6304`;
  const crc = calculateCRC16(payloadWithCrcId);

  return `${payload}6304${crc}`;
}

