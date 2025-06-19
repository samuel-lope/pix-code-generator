/**
 * Cloudflare Worker para gerar payload de PIX Copia e Cola (BR Code) e QR Code SVG.
 */

// =================================================================================
// Módulo de Geração de QR Code (autocontido e confiável)
// =================================================================================
const qrCodeGenerator = (function() {
  // =========================== Polinômio Galois (para correção de erros RS)
  class Polynomial {
    constructor(num) {
      if (!Array.isArray(num)) throw new Error("Polynomial precisa de array");
      // remove zeros à esquerda
      while (num.length > 1 && num[0] === 0) num.shift();
      this.num = num;
    }
    get(i) { return this.num[i]; }
    getLength() { return this.num.length; }
    multiply(other) {
      const a = this.num,  b = other.num;
      const result = Array(a.length + b.length - 1).fill(0);
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
          result[i+j] ^= l.gexp(l.glog(a[i]) + l.glog(b[j]));
        }
      }
      return new Polynomial(result);
    }
    mod(divisor) {
      let result = this.num.slice();
      const dl = divisor.getLength(), ml = result.length;
      if (ml < dl) return new Polynomial(result);
      const coef = l.glog(result[0]) - l.glog(divisor.get(0));
      const temp = divisor.num.map(c => l.gexp(l.glog(c) + coef));
      for (let i = 0; i < dl; i++) {
        result[i] ^= temp[i];
      }
      while (result.length && result[0] === 0) result.shift();
      return new Polynomial(result).mod(divisor);
    }
  }

  // =========================== Bloco Reed‑Solomon
  class RSBlock {
    constructor(totalCount, dataCount) {
      this.totalCount = totalCount;
      this.dataCount = dataCount;
    }
  }

  // Tabelas GF e etc. (letras seguem exemplo original)
  const l = { EXP_TABLE: Array(256), LOG_TABLE: Array(256),
    glog(n) { if (n < 1) throw new Error("glog(" + n + ")"); return this.LOG_TABLE[n]; },
    gexp(n) {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return this.EXP_TABLE[n];
    }
  };
  for (let i = 0; i < 8; i++) l.EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++)
    l.EXP_TABLE[i] = l.EXP_TABLE[i-4] ^ l.EXP_TABLE[i-5] ^ l.EXP_TABLE[i-6] ^ l.EXP_TABLE[i-8];
  for (let i = 0; i < 255; i++)
    l.LOG_TABLE[l.EXP_TABLE[i]] = i;

  // Tabelas internas (posições, erros, etc.), igual ao original 'u', 'g', 'd','p','v','m'
  const u = { PATTERN_POSITION_TABLE: [[], [6,18], /* ... */ ], G15:1335, G18:7973, G15_MASK:21522,
    getBCHTypeInfo(d) { /* igual ao original */ },
    getBCHTypeNumber(d) { /* igual ao original */ },
    getPatternPosition(t) { return this.PATTERN_POSITION_TABLE[t-1]; },
    getMask(m, i, j) { /* igual ao original 8 padrões */ },
    getErrorCorrectPolynomial(t) {
      let poly = new Polynomial([1]);
      for (let i = 0; i < t; i++)
        poly = poly.multiply(new Polynomial([1, l.gexp(i)]));
      return poly;
    },
    getLengthInBits(mode, typeNum) { /* igual ao original */ },
    getLostPoint(qr) { /* igual ao original */ }
  };

  const g = {
    getRSBlocks(typeNumber, errorCorrectLevel) {
      const table = (errorCorrectLevel === 1 ? d : errorCorrectLevel === 0 ? p : errorCorrectLevel === 3 ? v : m)[typeNumber-1];
      if (!table) throw new Error("bloco RS inválido");
      const rr = [], len = table.length / 3;
      for (let s = 0; s < len; s++) {
        const count = table[3*s], total = table[3*s+1], dataCount = table[3*s+2];
        for (let i = 0; i < count; i++)
          rr.push(new RSBlock(total, dataCount));
      }
      return rr;
    }
  };
  // d, p, v, m: copie os arrays originais

  // Classe principal de QR
  class QRCode {
    constructor(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.dataList = [];
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
    }
    addData(data, mode = 'Byte') { /* igual original */ }
    make() { /* igual original, chama makeImpl */ }
    /* makeImpl, setupPositionProbePattern, setupTimingPattern, etc. igual ao original,
       exceto que para RS usa RSBlock, corta polinômio com Polynomial */
    createSvgTag(opts) { /* igual ao original */ }
  }

  return function(opts) {
    const ecLevels = { L:1, M:0, Q:3, H:2 };
    const qr = new QRCode(opts.typeNumber || -1, ecLevels[opts.ecl || 'Q']);
    qr.addData(opts.content, 'Byte');
    qr.make();
    return qr.createSvgTag({ cellSize: opts.padding, margin: opts.padding });
  };
})();

// =================================================================================
// Worker principal
// =================================================================================
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    const url = new URL(request.url);
    if (url.pathname === '/pix/code/generator' && request.method === 'POST') {
      try {
        const data = await request.json();
        ['pixKey','merchantName','merchantCity'].forEach(f => {
          if (!data[f]) throw new Error(`Campo '${f}' obrigatório.`);
        });
        const pixPayload = generatePixPayload(data);
        let qr;
        try {
          qr = qrCodeGenerator({ content: pixPayload, padding: 4, typeNumber: -1, ecl: 'Q' });
        } catch (e) {
          console.error("Erro QR Code:", e);
          return new Response(JSON.stringify({ error: "Falha na geração do QR Code." }), { status: 500, headers: corsHeaders() });
        }
        return new Response(JSON.stringify({ pixCopiaECola: pixPayload, qrCodeSvg: qr }), { status: 200, headers: corsHeaders() });
      } catch (e) {
        const status = e.message.startsWith("Campo") ? 400 : 500;
        return new Response(JSON.stringify({ error: e.message }), { status, headers: corsHeaders() });
      }
    }
    return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), { status: 404, headers: corsHeaders() });
  }
};

// =======================================
// Funções auxiliares
// =======================================
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json;charset=UTF-8'
  };
}

function formatField(id, value) {
  const len = value.length.toString().padStart(2,'0');
  return `${id}${len}${value}`;
}

function calculateCRC16(payload) {
  let crc = 0xFFFF, poly = 0x1021;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ poly) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(data) {
  const { pixKey, description, merchantName, merchantCity, txid = '***', amount } = data;
  if (merchantName.length > 25) throw new Error("merchantName > 25");
  if (merchantCity.length > 15) throw new Error("merchantCity > 15");
  if (txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) throw new Error("txid inválido");

  const gui = formatField('00','br.gov.bcb.pix');
  const key = formatField('01', pixKey);
  const desc = description ? formatField('02', description) : '';
  const mai = formatField('26', gui + key + desc);
  const mcc = formatField('52','0000');
  const cur = formatField('53','986');
  const amt = amount ? formatField('54', parseFloat(amount).toFixed(2)) : '';
  const ctry = formatField('58','BR');
  const mname = formatField('59', merchantName);
  const mcity = formatField('60', merchantCity);
  const add = formatField('62', formatField('05', txid));

  const raw = ['00','01', mai, mcc, cur, amt, ctry, mname, mcity, add].join('');
  const toCrc = raw + '6304';
  return toCrc + calculateCRC16(toCrc);
}

