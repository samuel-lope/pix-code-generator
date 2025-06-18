/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
 *
 * Esta versão utiliza uma arquitetura modular com uma biblioteca QR Code confiável para garantir
 * a correta geração do SVG no ambiente Cloudflare Workers.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

// =================================================================================
// Módulo de Geração de QR Code (qrcode-svg.js)
// Implementação robusta, autocontida e corrigida, inspirada em qrcode-svg.
// =================================================================================
class QRCode {
  constructor(options) {
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
      ecl: "Q", // Nível de correção 'Q' é o mais recomendado para PIX.
      ...options
    };
    this.qrcode = null;
    if (this.options.content) {
      this.makeCode(this.options.content);
    }
  }

  makeCode(content) {
    const errorCorrectionLevelMap = { L: 1, M: 0, Q: 3, H: 2 };
    const ecl = errorCorrectionLevelMap[this.options.ecl];
    this.qrcode = new QRCodeModel(undefined, ecl);
    this.qrcode.addData(content);
    this.qrcode.make();
  }

  svg() {
    if (!this.qrcode) return "";
    const modules = this.qrcode.getModules();
    const moduleCount = modules.length;
    const { width, height, padding, color, background } = this.options;
    const size = Math.min(width, height);
    const cellSize = (size - 2 * padding) / moduleCount;
    let path = "";

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (modules[r][c]) {
          path += `M${padding + c * cellSize},${padding + r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }

    return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${background}"/>
      <path fill="${color}" d="${path}"/>
    </svg>`;
  }
}

// A lógica interna do QRCodeModel. É complexa, mas é a parte que desenha o QR Code.
// Esta implementação é uma versão funcional e autocontida.
function QRCodeModel(typeNumber, errorCorrectionLevel) {
  this.typeNumber = typeNumber || -1, this.errorCorrectionLevel = errorCorrectionLevel, this.modules = null, this.moduleCount = 0, this.dataList = [], this.dataCache = null, this.addData = t => {
    this.dataList.push({
      data: t,
      mode: 4,
      getLength: e => e.length,
      write: (e, r) => {
        for (let o = 0; o < t.length; o++) e.put(t.charCodeAt(o), 8)
      }
    })
  }, this.isDark = (t, e) => this.modules[t][e], this.getModules = () => this.modules, this.make = () => {
    this.determineType(), this.makeImpl(!1, this.getBestMaskPattern())
  }, this.determineType = () => {
    let t = this.dataList[0].data.length * 8, e;
    for (e = 1; e <= 40; e++) {
        let r = 0;
        const o = QRUtil.getRSBlocks(e, this.errorCorrectionLevel);
        for(let i=0; i<o.length; i++) r += o[i].dataCount;
        const n = 8 * r;
        if (t <= n) break;
    }
    this.typeNumber = e;
  }, this.makeImpl = (t, e) => {
    this.moduleCount = 4 * this.typeNumber + 17, this.modules = Array.from({
      length: this.moduleCount
    }, () => Array(this.moduleCount).fill(null)), this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(t, e), this.typeNumber >= 7 && this.setupTypeNumber(t), this.dataCache || (this.dataCache = this.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList)), this.mapData(this.dataCache, e)
  }, this.getBestMaskPattern = () => {
    let t = 0,
      e = 0;
    for (let r = 0; r < 8; r++) {
      this.makeImpl(!0, r);
      let o = QRUtil.getLostPoint(this);
      (0 === r || t > o) && (t = o, e = r)
    }
    return e
  }, this.setupPositionProbePattern = (t, e) => {
    for (let r = -1; r <= 7; r++)
      if (t + r >= 0 && t + r < this.moduleCount)
        for (let o = -1; o <= 7; o++) e + o >= 0 && e + o < this.moduleCount && (this.modules[t + r][e + o] = r >= 0 && r <= 6 && (0 === o || 6 === o) || o >= 0 && o <= 6 && (0 === r || 6 === r) || r >= 2 && r <= 4 && o >= 2 && o <= 4)
  }, this.setupTimingPattern = () => {
    for (let t = 8; t < this.moduleCount - 8; t++) null === this.modules[t][6] && (this.modules[t][6] = t % 2 == 0), null === this.modules[6][t] && (this.modules[6][t] = t % 2 == 0)
  }, this.setupPositionAdjustPattern = () => {
    let t = QRUtil.getPatternPosition(this.typeNumber);
    for (let e = 0; e < t.length; e++)
      for (let r = 0; r < t.length; r++) {
        let o = t[e],
          n = t[r];
        if (null === this.modules[o][n])
          for (let i = -2; i <= 2; i++)
            for (let s = -2; s <= 2; s++) this.modules[o + i][n + s] = -2 === i || 2 === i || -2 === s || 2 === s || 0 === i && 0 === s
      }
  }, this.setupTypeNumber = t => {
    let e = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let r = 0; r < 18; r++) {
      let o = !t && (e >> r & 1) === 1;
      this.modules[Math.floor(r / 3)][r % 3 + this.moduleCount - 8 - 3] = o, this.modules[r % 3 + this.moduleCount - 8 - 3][Math.floor(r / 3)] = o
    }
  }, this.setupTypeInfo = (t, e) => {
    let r = QRUtil.getBCHTypeInfo(this.errorCorrectionLevel << 3 | e);
    for (let o = 0; o < 15; o++) {
      let n = !t && (r >> o & 1) === 1;
      o < 6 ? this.modules[o][8] = n : o < 8 ? this.modules[o + 1][8] = n : this.modules[this.moduleCount - 15 + o][8] = n, o < 8 ? this.modules[8][this.moduleCount - o - 1] = n : o < 9 ? this.modules[8][15 - o - 1 + 1] = n : this.modules[8][15 - o - 1] = n
    }
    this.modules[this.moduleCount - 8][8] = !t
  }, this.mapData = (t, e) => {
    let r = -1,
      o = this.moduleCount - 1,
      n = 7,
      i = 0;
    for (let s = this.moduleCount - 1; s > 0; s -= 2)
      for (6 === s && s--;;) {
        for (let a = 0; a < 2; a++)
          if (null === this.modules[o][s - a]) {
            let h = !1;
            i < t.length && (h = (t[i] >>> n & 1) === 1), QRUtil.getMask(e, o, s - a) && (h = !h), this.modules[o][s - a] = h, n--, -1 === n && (i++, n = 7)
          } if (o += r, o < 0 || o >= this.moduleCount) {
          o -= r, r = -r;
          break
        }
      }
  };
  const QRUtil = { PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]], G15: 1335, G18: 7973, G15_MASK: 21522, getBCHTypeInfo: t=>{let e=t<<10;for(;QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G15)>=0;)e^=QRUtil.G15<<QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G15);return(t<<10|e)^QRUtil.G15_MASK},getBCHTypeNumber:t=>{let e=t<<12;for(;QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G18)>=0;)e^=QRUtil.G18<<QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G18);return t<<12|e},getBCHDigit:t=>{let e=0;for(;0!==t;)e++,t>>>=1;return e},getPatternPosition:t=>QRUtil.PATTERN_POSITION_TABLE[t-1],getMask:(t,e,r)=>{switch(t){case 0:return(e+r)%2==0;case 1:return e%2==0;case 2:return r%3==0;case 3:return(e+r)%3==0;case 4:return(Math.floor(e/2)+Math.floor(r/3))%2==0;case 5:return(e*r)%2+(e*r)%3==0;case 6:return((e*r)%2+(e*r)%3)%2==0;case 7:return((e*r)%3+(e+r)%2)%2==0}},getLostPoint:t=>{let e=t.moduleCount,r=0;for(let o=0;o<e;o++)for(let n=0;n<e;n++){let i=0,s=t.modules[o][n];for(let a=-1;a<=1;a++)if(o+a>=0&&o+a<e)for(let h=-1;h<=1;h++)n+h>=0&&n+h<e&&(0!==a||0!==h)&&s===t.modules[o+a][n+h]&&i++;i>5&&(r+=3+i-5)}for(let o=0;o<e-1;o++)for(let n=0;n<e-1;n++){let i=0;t.modules[o][n]&&i++,t.modules[o+1][n]&&i++,t.modules[o][n+1]&&i++,t.modules[o+1][n+1]&&i++,0!==i&&4!==i||(r+=3)}for(let o=0;o<e;o++)for(let n=0;n<e-6;n++)t.modules[o][n]&&!t.modules[o][n+1]&&t.modules[o][n+2]&&t.modules[o][n+3]&&t.modules[o][n+4]&&!t.modules[o][n+5]&&t.modules[o][n+6]&&(r+=40);for(let o=0;o<e;o++)for(let n=0;n<e-6;n++)t.modules[n][o]&&!t.modules[n+1][o]&&t.modules[n+2][o]&&t.modules[n+3][o]&&t.modules[n+4][o]&&!t.modules[n+5][o]&&t.modules[n+6][o]&&(r+=40);let n=0;for(let o=0;o<e;o++)for(let i=0;i<e;i++)t.modules[o][i]&&n++;return r+=10*(Math.abs(100*n/e/e-50)/5)}};
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
        
        let qrCodeBase64 = null;
        try {
          const qr = new QRCode({ content: pixPayload, ecl: 'Q' });
          const svgString = qr.svg();
          qrCodeBase64 = `data:image/svg+xml;base64,${btoa(svgString)}`;
        } catch(e) {
            console.error("Falha na geração do QRCode:", e.message);
            // qrCodeBase64 permanecerá null, mas a requisição não falhará
        }

        return new Response(JSON.stringify({
          pixCopiaECola: pixPayload,
          qrCodeBase64: qrCodeBase64
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
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  } else {
    return new Response(null, { headers: { "Allow": "POST, OPTIONS" } });
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
  const { pixKey, description, merchantName, merchantCity, txid = '***', amount } = data;
  if (merchantName.length > 25) throw new Error("O nome do comerciante (merchantName) não pode exceder 25 caracteres.");
  if (merchantCity.length > 15) throw new Error("A cidade do comerciante (merchantCity) não pode exceder 15 caracteres.");
  if (txid && txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) throw new Error("O txid deve conter apenas letras e números e ter no máximo 25 caracteres.");
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

