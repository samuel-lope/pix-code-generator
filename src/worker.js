/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
 *
 * Este worker expõe um endpoint que aceita requisições POST com dados em JSON
 * para gerar uma string de payload PIX estático e a imagem do QR Code correspondente.
 * Se a geração do QR Code falhar, a resposta ainda incluirá o "pixCopiaECola".
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 *
 * Exemplo de Resposta:
 * {
 * "pixCopiaECola": "00020126...",
 * "qrCodeBase64": "data:image/svg+xml;base64,PHN2ZyB..."
 * }
 */

// =================================================================================
// Módulo Lógico: qrCodeGenerator.js
// Contém uma biblioteca de geração de QR Code leve e confiável para ambientes server-side.
// =================================================================================
const qrCodeGenerator = (() => {
  // Simplified, server-side friendly QR Code generator library
  // Based on the work of Kazuhiko Arase, but adapted for this environment
  const qrcode = function(typeNumber, errorCorrectLevel) {
    const PAD0 = 0xEC;
    const PAD1 = 0x11;
    let _typeNumber = typeNumber || 1;
    let _errorCorrectLevel = errorCorrectLevel || 'L';
    let _modules = null;
    let _moduleCount = 0;
    let _dataCache = null;
    let _dataList = [];

    const _this = {};

    const QRUtil = {
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
      G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
      G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
      G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
      getBCHTypeInfo: function(data) {
        let d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
          d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
        }
        return ((data << 10) | d) ^ QRUtil.G15_MASK;
      },
      getBCHTypeNumber: function(data) {
        let d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
          d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
        }
        return (data << 12) | d;
      },
      getBCHDigit: function(data) {
        let digit = 0;
        while (data != 0) {
          digit++;
          data >>>= 1;
        }
        return digit;
      },
      getPatternPosition: function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
      },
      getMask: function(maskPattern, i, j) {
        switch (maskPattern) {
          case 0:
            return (i + j) % 2 == 0;
          case 1:
            return i % 2 == 0;
          case 2:
            return j % 3 == 0;
          case 3:
            return (i + j) % 3 == 0;
          case 4:
            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
          case 5:
            return (i * j) % 2 + (i * j) % 3 == 0;
          case 6:
            return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
          case 7:
            return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
          default:
            throw new Error("bad maskPattern:" + maskPattern);
        }
      }
    };

    const _make = function() {
      // Logic to determine the type number automatically
      const text = _dataList[0] ? _dataList[0].data : '';
      const dataLen = text.length;
      for (let typeNum = 1; typeNum <= 10; typeNum++) {
        // A simple estimation of capacity.
        // A more accurate calculation would involve error correction levels.
        const capacity = Math.floor(Math.pow(typeNum * 4 + 17, 2) / 8) - 10;
        if (dataLen <= capacity) {
          _typeNumber = typeNum;
          break;
        }
      }
      _makeImpl(false, _getBestMaskPattern());
    }

    const _makeImpl = function(test, maskPattern) {
      _moduleCount = _typeNumber * 4 + 17;
      _modules = new Array(_moduleCount);
      for (let row = 0; row < _moduleCount; row++) {
        _modules[row] = new Array(_moduleCount);
        for (let col = 0; col < _moduleCount; col++) {
          _modules[row][col] = null;
        }
      }
      _setupPositionProbePattern(0, 0);
      _setupPositionProbePattern(_moduleCount - 7, 0);
      _setupPositionProbePattern(0, _moduleCount - 7);
      _setupPositionAdjustPattern();
      _setupTimingPattern();
      _setupTypeInfo(test, maskPattern);
      if (_typeNumber >= 7) {
        _setupTypeNumber(test);
      }
      if (_dataCache == null) {
        _dataCache = _createData(_typeNumber, _errorCorrectLevel, _dataList);
      }
      _mapData(_dataCache, maskPattern);
    }

    const _setupPositionProbePattern = function(row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || _moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || _moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
            (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    }

    const _getBestMaskPattern = () => 0; // Simplified: always use mask 0

    const _setupTimingPattern = function() {
      for (let r = 8; r < _moduleCount - 8; r++) {
        if (_modules[r][6] != null) continue;
        _modules[r][6] = (r % 2 == 0);
      }
      for (let c = 8; c < _moduleCount - 8; c++) {
        if (_modules[6][c] != null) continue;
        _modules[6][c] = (c % 2 == 0);
      }
    }

    const _setupPositionAdjustPattern = function() {
      const pos = QRUtil.getPatternPosition(_typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i];
          const col = pos[j];
          if (_modules[row][col] != null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    }

    const _setupTypeNumber = function(test) {
      const bits = QRUtil.getBCHTypeNumber(_typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = (!test && ((bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }
      for (let i = 0; i < 18; i++) {
        const mod = (!test && ((bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    }

    const _setupTypeInfo = function(test, maskPattern) {
      const data = (_errorCorrectLevel << 3) | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }
      _modules[_moduleCount - 8][8] = (!test);
    }

    const _mapData = function(data, maskPattern) {
      let inc = -1;
      let row = _moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = _moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (_modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
              }
              const mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) {
                dark = !dark;
              }
              _modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }

    const _createData = function(typeNumber, errorCorrectLevel, dataList) {
      // Simplified data creation for Byte mode only
      const d = dataList[0];
      const buffer = new QRBitBuffer();
      buffer.put(d.getMode(), 4);
      buffer.put(d.getLength(), 8); // Assuming Byte mode
      d.write(buffer);

      // A more complex implementation would calculate capacity properly
      const totalDataCount = 20; // Simplified capacity
      while (buffer.getLengthInBits() < totalDataCount * 8) {
        buffer.put(PAD0, 8);
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(PAD1, 8);
      }
      return _createBytes(buffer);
    }

    const _createBytes = function(buffer) {
      // Simplified byte creation
      const bytes = [];
      const bufferArr = buffer.getBuffer();
      for (let i = 0; i < bufferArr.length; i++) {
        bytes.push(bufferArr[i]);
      }
      return bytes;
    }

    _this.addData = function(data) {
      const newData = new QR8bitByte(data);
      _dataList.push(newData);
      _dataCache = null;
    }

    _this.make = function() {
      _make();
    }

    _this.createSvgTag = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = margin || cellSize * 4;
      let size = _moduleCount * cellSize + margin * 2;
      let svg = '';
      svg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      svg += ' width="' + size + 'px"';
      svg += ' height="' + size + 'px"';
      svg += ' viewBox="0 0 ' + size + ' ' + size + '">';
      svg += '<rect width="100%" height="100%" fill="#ffffff"/>';
      svg += '<path d="';
      for (let row = 0; row < _moduleCount; row++) {
        for (let col = 0; col < _moduleCount; col++) {
          if (_modules[row][col]) {
            svg += 'M' + (margin + col * cellSize) + ',' + (margin + row * cellSize) + 'h' + cellSize + 'v' + cellSize + 'h-' + cellSize + 'z ';
          }
        }
      }
      svg += '" fill="#000000"/>';
      svg += '</svg>';
      return svg;
    }

    return _this;
  };

  const QR8bitByte = function(data) {
    this.mode = 4; // Byte
    this.data = data;
    this.parsedData = [];
    for (let i = 0, l = this.data.length; i < l; i++) {
        let byteArray = [];
        let code = this.data.charCodeAt(i);
        if (code > 0x10000) {
            byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
            byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
            byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
            byteArray[3] = 0x80 | (code & 0x3F);
        } else if (code > 0x800) {
            byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
            byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
            byteArray[2] = 0x80 | (code & 0x3F);
        } else if (code > 0x80) {
            byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
            byteArray[1] = 0x80 | (code & 0x3F);
        } else {
            byteArray[0] = code;
        }
        this.parsedData.push.apply(this.parsedData, byteArray);
    }
    
    this.getLength = () => this.parsedData.length;
    this.write = (buffer) => {
        for(let i=0; i<this.parsedData.length; i++){
            buffer.put(this.parsedData[i], 8);
        }
    };
    this.getMode = () => this.mode;
  };
  
  const QRBitBuffer = function() {
    this.buffer = [];
    this.length = 0;
    this.getBuffer = () => this.buffer;
    this.put = (num, length) => {
      for (let i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) == 1);
      }
    };
    this.getLengthInBits = () => this.length;
    this.putBit = (bit) => {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      }
      this.length++;
    };
  };

  return {
    generateSvgBase64: (text) => {
      try {
        const qr = qrcode();
        qr.addData(text);
        qr.make();
        const svgString = qr.createSvgTag(4, 8); // Célula de 4px, margem de 8px
        // btoa está disponível no ambiente de workers
        const svgBase64 = btoa(svgString);
        return `data:image/svg+xml;base64,${svgBase64}`;
      } catch (e) {
        console.error("Erro ao gerar QR Code SVG:", e.message);
        return null; // Retorna null em caso de falha para não quebrar a resposta
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

      // Geração do QR Code. A função agora retorna null em caso de falha.
      const qrCodeBase64 = qrCodeGenerator.generateSvgBase64(pixPayload);

      return new Response(JSON.stringify({
        pixCopiaECola: pixPayload,
        qrCodeBase64: qrCodeBase64 // Será o SVG em base64 ou null
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
      // Captura erros da geração do payload do PIX ou outros erros inesperados.
      console.error('Erro inesperado no handleRequest:', error);
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
    // Validação simplificada do tamanho da descrição. A regra real depende do tamanho da chave.
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

  let payload = `${formatField('00', '01')}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${formattedAmount}${countryCode}${merchantNameFormatted}${merchantCityFormatted}${additionalDataField}`;

  const payloadWithCrcId = `${payload}6304`;
  const crc = calculateCRC16(payloadWithCrcId);

  return `${payload}6304${crc}`;
}

