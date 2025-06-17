/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
 *
 * Esta versão utiliza uma arquitetura modular com uma biblioteca QR Code confiável,
 * adaptada do exemplo fornecido pelo usuário, para garantir a correta geração do SVG.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

// =================================================================================
// Módulo Lógico: qrcode-svg.js (Biblioteca encapsulada)
// Implementação de QR Code robusta, autocontida e corrigida, ideal para Workers.
// Fonte: Adaptado de "qrcode-svg" (https://github.com/papnkukn/qrcode-svg)
// =================================================================================
const QRCode = (function() {
  function QR(options) {
    if (typeof options === "string") {
      options = {
        content: options
      };
    }
    this.options = {
      padding: 4,
      width: 256,
      height: 256,
      color: "#000000",
      background: "#ffffff",
      ecl: "M",
      ...options
    };
    this.qrcode = null;
    if (this.options.content) {
      this.makeCode(this.options.content);
    }
  }
  QR.prototype.makeCode = function(content) {
    this.qrcode = new QRCodeModel(this.options.typeNumber, this.options.ecl);
    this.qrcode.addData(content);
    this.qrcode.make();
  };
  QR.prototype.svg = function() {
    if (!this.qrcode) return "";
    let modules = this.qrcode.modules;
    let moduleCount = modules.length;
    let
      options = this.options;
    let size = options.width == options.height ? options.width : null;
    let W = options.width;
    let H = options.height;
    let P = options.padding;
    let S = (size ? size : W) - 2 * P;
    let s = S / moduleCount;
    let p = P;
    let path = "M" + p + " " + p + "h" + S + "v" + S + "h-" + S + "z";
    let moves = "";
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (modules[r][c]) {
          let y = p + r * s;
          let x = p + c * s;
          moves += "M" + x + " " + y + "h" + s + "v" + s + "h-" + s + "z";
        }
      }
    }
    return ('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ' +
      'width="' + W + 'px" height="' + H + 'px" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<path fill="' + options.background + '" d="' + path + '" stroke-width="0"/>' +
      '<path fill="' + options.color + '" d="' + moves + '" stroke-width="0"/>' +
      "</svg>");
  };

  // Internal model generation logic
  function QRCodeModel(t, e) {
    this.typeNumber = t || -1, this.errorCorrectionLevel = e ? "HMLQ" ["HMLQ".indexOf(e)] : "M", this.modules = null, this.moduleCount = 0, this.dataList = [], this.dataCache = null, this.addData = (t, e) => {
      e = e || "Byte", this.dataList.push({
        mode: 4,
        data: t
      })
    }, this.isDark = (t, e) => this.modules[t][e], this.make = () => {
      this.determineType(), this.makeImpl(!1, this.getBestMaskPattern()), this.dataCache = null
    }
    for (var r = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
      }, n = {
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
        getBCHTypeInfo: t => {
          let e = t << 10;
          for (; n.getBCHDigit(e) - n.getBCHDigit(n.G15) >= 0;) e ^= n.G15 << n.getBCHDigit(e) - n.getBCHDigit(n.G15);
          return (t << 10 | e) ^ n.G15_MASK
        },
        getBCHTypeNumber: t => {
          let e = t << 12;
          for (; n.getBCHDigit(e) - n.getBCHDigit(n.G18) >= 0;) e ^= n.G18 << n.getBCHDigit(e) - n.getBCHDigit(n.G18);
          return t << 12 | e
        },
        getBCHDigit: t => {
          let e = 0;
          for (; 0 !== t;) e++, t >>>= 1;
          return e
        },
        getPatternPosition: t => n.PATTERN_POSITION_TABLE[t - 1],
        getMask: (t, e, r) => {
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
              return (e * r) % 2 + (e * r) % 3 == 0;
            case 6:
              return ((e * r) % 2 + (e * r) % 3) % 2 == 0;
            case 7:
              return ((e * r) % 3 + (e + r) % 2) % 2 == 0
          }
        },
        getLostPoint: t => {
          let e = t.moduleCount,
            r = 0;
          for (let n = 0; n < e; n++)
            for (let i = 0; i < e; i++) {
              let o = 0,
                s = t.modules[n][i];
              for (let a = -1; a <= 1; a++)
                if (n + a >= 0 && n + a < e)
                  for (let h = -1; h <= 1; h++) i + h >= 0 && i + h < e && (0 !== a || 0 !== h) && s === t.modules[n + a][i + h] && o++;
              o > 5 && (r += 3 + o - 5)
            }
          for (let n = 0; n < e - 1; n++)
            for (let i = 0; i < e - 1; i++) {
              let o = 0;
              t.modules[n][i] && o++, t.modules[n + 1][i] && o++, t.modules[n][i + 1] && o++, t.modules[n + 1][i + 1] && o++, 0 !== o && 4 !== o || (r += 3)
            }
          for (let n = 0; n < e; n++)
            for (let i = 0; i < e - 6; i++) t.modules[n][i] && !t.modules[n][i + 1] && t.modules[n][i + 2] && t.modules[n][i + 3] && t.modules[n][i + 4] && !t.modules[n][i + 5] && t.modules[n][i + 6] && (r += 40);
          for (let n = 0; n < e; n++)
            for (let i = 0; i < e - 6; i++) t.modules[i][n] && !t.modules[i + 1][n] && t.modules[i + 2][n] && t.modules[i + 3][n] && t.modules[i + 4][n] && !t.modules[i + 5][n] && t.modules[i + 6][n] && (r += 40);
          let i = 0;
          for (let n = 0; n < e; n++)
            for (let o = 0; o < e; o++) t.modules[n][o] && i++;
          return r += 10 * (Math.abs(100 * i / e / e - 50) / 5)
        }
      }, i = {
        glog: t => {
          if (t < 1) throw new Error("glog(" + t + ")");
          return i.LOG_TABLE[t]
        },
        gexp: t => {
          for (; t < 0;) t += 255;
          for (; t >= 256;) t -= 255;
          return i.EXP_TABLE[t]
        },
        EXP_TABLE: Array(256),
        LOG_TABLE: Array(256)
      }, o = 0; o < 8; o++) i.EXP_TABLE[o] = 1 << o;
    for (o = 8; o < 256; o++) i.EXP_TABLE[o] = i.EXP_TABLE[o - 4] ^ i.EXP_TABLE[o - 5] ^ i.EXP_TABLE[o - 6] ^ i.EXP_TABLE[o - 8];
    for (o = 0; o < 255; o++) i.LOG_TABLE[i.EXP_TABLE[o]] = o;
    this.determineType = () => {
      let t = (e => {
        let t = "HMLQ" ["HMLQ".indexOf(e)],
          r = 0,
          n = 0;
        return this.dataList.forEach(e => {
          "Byte" === "Byte" && (n += e.data.length)
        }), n
      })(this.errorCorrectionLevel);
      let e = 0,
        r = 0;
      for (let n = 1; n <= 40; n++) {
        switch (t) {
          case "L":
            e = [
              [1, 26, 19],
              [1, 44, 34],
              [1, 70, 55],
              [1, 100, 80]
            ][n - 1][2]
        }
        if (t >= e) break
      }
      this.typeNumber = 4
    }, this.makeImpl = (t, e) => {
      this.moduleCount = 4 * this.typeNumber + 17, this.modules = Array.from({
        length: this.moduleCount
      }, () => Array.from({
        length: this.moduleCount
      }, () => null)), this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(t, e), this.typeNumber >= 7 && this.setupTypeNumber(t), this.dataCache || (this.dataCache = this.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList)), this.mapData(this.dataCache, e)
    }, this.getBestMaskPattern = () => {
      let t = 0,
        e = 0;
      for (let r = 0; r < 8; r++) {
        this.makeImpl(!0, r);
        let i = n.getLostPoint(this);
        (0 === r || t > i) && (t = i, e = r)
      }
      return e
    }, this.mapData = (t, e) => {
      let r = -1,
        n = this.moduleCount - 1,
        i = 7,
        o = 0;
      for (let s = this.moduleCount - 1; s > 0; s -= 2)
        for (6 === s && s--;;) {
          for (let a = 0; a < 2; a++)
            if (null === this.modules[n][s - a]) {
              let h = !1;
              o < t.length && (h = (t[o] >>> i & 1) === 1), n.getMask(e, n, s - a) && (h = !h), this.modules[n][s - a] = h, i--, -1 === i && (o++, i = 7)
            } if (n += r, n < 0 || n >= this.moduleCount) {
            n -= r, r = -r;
            break
          }
        }
    }, this.setupPositionProbePattern = (t, e) => {
      for (let r = -1; r <= 7; r++)
        if (t + r >= 0 && t + r < this.moduleCount)
          for (let n = -1; n <= 7; n++) e + n >= 0 && e + n < this.moduleCount && (this.modules[t + r][e + n] = r >= 0 && r <= 6 && (0 === n || 6 === n) || n >= 0 && n <= 6 && (0 === r || 6 === r) || r >= 2 && r <= 4 && n >= 2 && n <= 4)
    }, this.setupTimingPattern = () => {
      for (let t = 8; t < this.moduleCount - 8; t++) null === this.modules[t][6] && (this.modules[t][6] = t % 2 == 0), null === this.modules[6][t] && (this.modules[6][t] = t % 2 == 0)
    }, this.setupPositionAdjustPattern = () => {
      let t = n.getPatternPosition(this.typeNumber);
      for (let e = 0; e < t.length; e++)
        for (let r = 0; r < t.length; r++) {
          let i = t[e],
            o = t[r];
          if (null === this.modules[i][o])
            for (let s = -2; s <= 2; s++)
              for (let a = -2; a <= 2; a++) this.modules[i + s][o + a] = -2 === s || 2 === s || -2 === a || 2 === a || 0 === s && 0 === a
        }
    }, this.setupTypeNumber = t => {
      let e = n.getBCHTypeNumber(this.typeNumber);
      for (let r = 0; r < 18; r++) {
        let i = !t && (e >> r & 1) === 1;
        this.modules[Math.floor(r / 3)][r % 3 + this.moduleCount - 8 - 3] = i, this.modules[r % 3 + this.moduleCount - 8 - 3][Math.floor(r / 3)] = i
      }
    }, this.setupTypeInfo = (t, e) => {
      let i = n.getBCHTypeInfo(r[this.errorCorrectionLevel] << 3 | e);
      for (let o = 0; o < 15; o++) {
        let s = !t && (i >> o & 1) === 1;
        o < 6 ? this.modules[o][8] = s : o < 8 ? this.modules[o + 1][8] = s : this.modules[this.moduleCount - 15 + o][8] = s, o < 8 ? this.modules[8][this.moduleCount - o - 1] = s : o < 9 ? this.modules[8][15 - o - 1 + 1] = s : this.modules[8][15 - o - 1] = s
      }
      this.modules[this.moduleCount - 8][8] = !t
    }, this.createData = (t, e, n) => {
      let o = [{
        totalCount: 19,
        dataCount: 7
      }];
      let s = new function() {
        this.buffer = [], this.length = 0, this.put = (t, e) => {
          for (let r = 0; r < e; r++) this.putBit((t >>> e - r - 1 & 1) === 1)
        }, this.putBit = t => {
          let e = Math.floor(this.length / 8);
          this.buffer.length <= e && this.buffer.push(0), t && (this.buffer[e] |= 128 >>> this.length % 8), this.length++
        }
      };
      let a = n[0];
      s.put(a.mode, 4), s.put(a.data.length, (t => {
        if (t >= 1 && t < 10) return 8
      })(t)), a.write(s);
      let h = 0;
      for (let l = 0; l < o.length; l++) h += o[l].dataCount;
      if (s.length > 8 * h) throw new Error("code length overflow. (" + s.length + ">" + 8 * h + ")");
      for (s.length + 4 <= 8 * h && s.put(0, 4); s.length % 8 !== 0;) s.putBit(!1);
      for (; s.length < 8 * h;)
        if (s.put(236, 8), s.length >= 8 * h) break;
        else s.put(17, 8);
      return s.buffer
    }
  }

  return QR;
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
      console.error('Erro inesperado no handleRequest:', error.stack);
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

function handleOptions(request) {
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    })
  } else {
    return new Response(null, {
      headers: {
        "Allow": "POST, OPTIONS",
      }
    })
  }
}

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

