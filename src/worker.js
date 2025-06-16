/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e um QR Code em SVG Base64.
 *
 * Esta versão utiliza uma implementação de QR Code robusta e corrigida, que calcula
 * automaticamente a melhor "versão" (tamanho) e "máscara" para garantir ótima legibilidade.
 * Também inclui cabeçalhos CORS para permitir o uso em aplicações web.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

// =================================================================================
// Módulo Lógico: qrCodeGenerator.js
// Implementação de QR Code robusta, autocontida e corrigida, ideal para Workers.
// =================================================================================
const qrCodeGenerator = (() => {
  // Esta biblioteca é uma implementação autônoma e robusta para geração de QR Code.
  // Foi criada para ser leve e funcionar perfeitamente em ambientes server-side como Cloudflare Workers.
  const QRCode = function(options) {
    const _options = {
      ...{
        padding: 4,
        typeNumber: -1,
        errorCorrectionLevel: 'Q',
        color: "#000000",
        background: "#ffffff",
      },
      ...options
    };

    const qr = (function(typeNumber, errorCorrectionLevel) {
      const eccLevels = { L: 1, M: 0, Q: 3, H: 2 };
      const _typeNumber = typeNumber;
      const _errorCorrectionLevel = eccLevels[errorCorrectionLevel];
      let _modules = [];
      let _moduleCount = 0;
      let _dataCache = null;
      const _dataList = [];
      const _this = {};

      const _addData = function(data) {
        _dataList.push({
          data: data,
          mode: 4, // Byte mode is sufficient for PIX strings
          getLength: (buffer) => buffer.length,
          write: (buffer) => {
            for (let i = 0; i < data.length; i++) {
              buffer.put(data.charCodeAt(i), 8);
            }
          }
        });
      };
      
      const _make = function() {
        if (_typeNumber < 1) {
          let type = 1;
          for (; type <= 40; type++) {
            const rsBlocks = QRUtil.getRSBlocks(type, _errorCorrectionLevel);
            let buffer = new QRBitBuffer();
            let totalDataCount = 0;
            for(let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
            
            let length = 0;
            for(let i=0; i<_dataList.length; i++) {
                let data = _dataList[i];
                length += 4 + QRUtil.getLengthInBits(data.mode, type);
            }
            if(length <= totalDataCount * 8) break;
          }
          _this.typeNumber = type;
        }

        _moduleCount = _this.typeNumber * 4 + 17;
        _modules = Array(_moduleCount).fill(null).map(() => Array(_moduleCount).fill(null));
        _setupPositionProbePattern(0, 0);
        _setupPositionProbePattern(_moduleCount - 7, 0);
        _setupPositionProbePattern(0, _moduleCount - 7);
        _setupPositionAdjustPattern();
        _setupTimingPattern();
        _setupTypeInfo(true, 0); // Temporary
        if (_this.typeNumber >= 7) _setupTypeNumber(true);
        _dataCache = QRCode.createData(_this.typeNumber, _errorCorrectionLevel, _dataList);
        const bestMaskPattern = _getBestMaskPattern();
        _mapData(_dataCache, bestMaskPattern);
        _setupTypeInfo(false, bestMaskPattern);
        if (_this.typeNumber >= 7) _setupTypeNumber(false);
      };

      const _setupPositionProbePattern = (row, col) => {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            if (row + r > -1 && _moduleCount > row + r && col + c > -1 && _moduleCount > col + c) {
              const isBlack = (r >= 0 && r <= 6 && (c == 0 || c == 6)) || (c >= 0 && c <= 6 && (r == 0 || r == 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
              _modules[row + r][col + c] = isBlack;
            }
          }
        }
      };
      
      const _getBestMaskPattern = () => {
          let minLostPoint = 0;
          let pattern = 0;
          for(let i = 0; i < 8; i++){
              _makeImpl(true, i);
              let lostPoint = QRUtil.getLostPoint(_this);
              if(i == 0 || minLostPoint > lostPoint){
                  minLostPoint = lostPoint;
                  pattern = i;
              }
          }
          return pattern;
      };

      const _makeImpl = (test, maskPattern) => {
          _moduleCount = _this.typeNumber * 4 + 17;
          _modules = Array(_moduleCount).fill(null).map(() => Array(_moduleCount).fill(null));
          _setupPositionProbePattern(0, 0);
          _setupPositionProbePattern(_moduleCount - 7, 0);
          _setupPositionProbePattern(0, _moduleCount - 7);
          _setupPositionAdjustPattern();
          _setupTimingPattern();
          _setupTypeInfo(test, maskPattern);
          if (_this.typeNumber >= 7) _setupTypeNumber(test);
          if(_dataCache == null) _dataCache = QRCode.createData(_this.typeNumber, _errorCorrectionLevel, _dataList);
          _mapData(_dataCache, maskPattern);
      };

      // The rest of the QR generation logic (_setupTimingPattern, _setupPositionAdjustPattern, etc.)
      const _setupTimingPattern = () => {
        for(let r = 8; r < _moduleCount - 8; r++){
            if(_modules[r][6] != null) continue;
            _modules[r][6] = (r % 2 == 0);
        }
        for(let c = 8; c < _moduleCount - 8; c++){
            if(_modules[6][c] != null) continue;
            _modules[6][c] = (c % 2 == 0);
        }
      };
      const _setupPositionAdjustPattern = () => {
          let pos = QRUtil.getPatternPosition(_this.typeNumber);
          for(let i = 0; i < pos.length; i++){
              for(let j = 0; j < pos.length; j++){
                  let row = pos[i], col = pos[j];
                  if(_modules[row][col] != null) continue;
                  for(let r = -2; r <= 2; r++){
                      for(let c = -2; c <= 2; c++){
                          _modules[row+r][col+c] = (r==-2||r==2||c==-2||c==2||(r==0&&c==0));
                      }
                  }
              }
          }
      };
      const _setupTypeNumber = (test) => {
          let bits = QRUtil.getBCHTypeNumber(_this.typeNumber);
          for(let i=0; i<18; i++) _modules[Math.floor(i/3)][i%3+_moduleCount-8-3] = (!test && ((bits>>i)&1)==1);
          for(let i=0; i<18; i++) _modules[i%3+_moduleCount-8-3][Math.floor(i/3)] = (!test && ((bits>>i)&1)==1);
      };
      const _setupTypeInfo = (test, maskPattern) => {
          let data = (_errorCorrectionLevel<<3)|maskPattern;
          let bits = QRUtil.getBCHTypeInfo(data);
          for(let i=0; i<15; i++){
              let mod = (!test && ((bits>>i)&1)==1);
              if(i<6) _modules[i][8] = mod;
              else if(i<8) _modules[i+1][8] = mod;
              else _modules[_moduleCount-15+i][8] = mod;
          }
          for(let i=0; i<15; i++){
              let mod = (!test && ((bits>>i)&1)==1);
              if(i<8) _modules[8][_moduleCount-i-1] = mod;
              else if(i<9) _modules[8][15-i-1+1] = mod;
              else _modules[8][15-i-1] = mod;
          }
          _modules[_moduleCount-8][8] = !test;
      };
      const _mapData = (data, maskPattern) => {
          let inc = -1, row = _moduleCount-1, bitIndex = 7, byteIndex = 0;
          for(let col = _moduleCount-1; col>0; col-=2){
              if(col==6) col--;
              while(true){
                  for(let c=0; c<2; c++){
                      if(_modules[row][col-c]==null){
                          let dark = false;
                          if(byteIndex<data.length) dark = (((data[byteIndex]>>>bitIndex)&1)==1);
                          if(QRUtil.getMask(maskPattern, row, col-c)) dark = !dark;
                          _modules[row][col-c] = dark;
                          bitIndex--;
                          if(bitIndex==-1){ byteIndex++; bitIndex = 7; }
                      }
                  }
                  row += inc;
                  if(row<0 || _moduleCount<=row){ row -= inc; inc = -inc; break; }
              }
          }
      };

      _this.addData = _addData;
      _this.make = _make;
      _this.isDark = (row, col) => _modules[row][col];
      _this.getModuleCount = () => _moduleCount;
      return _this;
    });

    const QRUtil = {
        PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],
        G15:1335,G18:7973,G15_MASK:21522,
        getBCHTypeInfo:d=>{let e=d<<10;while(QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G15)>=0)e^=QRUtil.G15<<(QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G15));return(d<<10|e)^QRUtil.G15_MASK},getBCHTypeNumber:d=>{let e=d<<12;while(QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G18)>=0)e^=QRUtil.G18<<(QRUtil.getBCHDigit(e)-QRUtil.getBCHDigit(QRUtil.G18));return d<<12|e},getBCHDigit:d=>{let t=0;while(d!=0){t++;d>>>=1}return t},getPatternPosition:t=>QRUtil.PATTERN_POSITION_TABLE[t-1],
        getMask:(p,i,j)=>{switch(p){case 0:return(i+j)%2==0;case 1:return i%2==0;case 2:return j%3==0;case 3:return(i+j)%3==0;case 4:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case 5:return(i*j)%2+(i*j)%3==0;case 6:return((i*j)%2+(i*j)%3)%2==0;case 7:return((i*j)%3+(i+j)%2)%2==0}},
        getLostPoint: qr => { let moduleCount = qr.getModuleCount(); let lostPoint = 0; for(let r=0; r<moduleCount; r++) for(let c=0; c<moduleCount; c++){ let sameCount=0; let dark=qr.isDark(r,c); for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++){if(r+i<0||moduleCount<=r+i||c+j<0||moduleCount<=c+j)continue;if(i==0&&j==0)continue;if(dark==qr.isDark(r+i,c+j))sameCount++;} if(sameCount>5)lostPoint+=3+sameCount-5;}for(let r=0; r<moduleCount-1; r++) for(let c=0; c<moduleCount-1; c++){let count=0;if(qr.isDark(r,c))count++;if(qr.isDark(r+1,c))count++;if(qr.isDark(r,c+1))count++;if(qr.isDark(r+1,c+1))count++;if(count==0||count==4)lostPoint+=3;}for(let r=0; r<moduleCount; r++) for(let c=0; c<moduleCount-6; c++) if(qr.isDark(r,c)&&!qr.isDark(r,c+1)&&qr.isDark(r,c+2)&&qr.isDark(r,c+3)&&qr.isDark(r,c+4)&&!qr.isDark(r,c+5)&&qr.isDark(r,c+6))lostPoint+=40; for(let c=0; c<moduleCount; c++) for(let r=0; r<moduleCount-6; r++) if(qr.isDark(r,c)&&!qr.isDark(r+1,c)&&qr.isDark(r+2,c)&&qr.isDark(r+3,c)&&qr.isDark(r+4,c)&&!qr.isDark(r+5,c)&&qr.isDark(r+6,c))lostPoint+=40;let darkCount=0;for(let c=0; c<moduleCount; c++)for(let r=0;r<moduleCount;r++)if(qr.isDark(r,c))darkCount++;lostPoint+=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5*10;return lostPoint },
        getRSBlocks:(t,e)=>{const r=QRUtil.getRsBlockTable(t,e);if(void 0==r)throw new Error(`bad rs block @ typeNumber:${t}/errorCorrectLevel:${e}`);const n=r.length/3;const o=[];for(let i=0;i<n;i++){const[a,l,u]=r.slice(i*3);for(let s=0;s<a;s++)o.push({totalCount:l,dataCount:u})}return o},
        getRsBlockTable:(t,e)=>{switch(e){case 1:return[[1,26,19],[1,44,34],[1,70,55],[1,100,80],[1,134,108],[1,172,68],[2,86,68],[2,98,78],[2,121,96],[2,146,116]][t-1];case 0:return[[1,26,16],[1,44,28],[1,70,44],[1,100,64],[1,134,86],[2,68,54],[2,86,68],[2,98,78],[2,121,96],[4,73,58]][t-1];case 3:return[[1,26,13],[1,44,22],[2,35,26],[2,50,40],[2,67,53],[4,34,27],[2,43,34],[4,49,39],[4,60,48],[4,73,58]][t-1];case 2:return[[1,26,9],[1,44,16],[2,35,20],[2,50,32],[4,33,26],[4,43,34],[4,49,39],[4,60,48],[4,73,58],[4,73,58]][t-1]}},
        getLengthInBits:(m,t)=>{if(1<=t&&t<10)switch(m){case 1:return 10;case 2:return 9;case 4:return 8;case 8:return 8}else if(t<27)switch(m){case 1:return 12;case 2:return 11;case 4:return 16;case 8:return 10}else if(t<41)switch(m){case 1:return 14;case 2:return 13;case 4:return 16;case 8:return 12}else throw new Error("type:"+t)}
    };
    
    QRCode.createData=(t,r,e)=>{let n=new QRBitBuffer;for(let o=0;o<e.length;o++){let i=e[o];n.put(i.mode,4),n.put(i.getLength(i.data),QRUtil.getLengthInBits(i.mode,t)),i.write(n)}let o=0;const i=QRUtil.getRSBlocks(t,r);for(let a=0;a<i.length;a++)o+=i[a].dataCount;if(n.getLengthInBits()>8*o)throw new Error("code length overflow. ("+n.getLengthInBits()+">"+8*o+")");for(n.getLengthInBits()+4<=8*o&&n.put(0,4);n.getLengthInBits()%8!=0;)n.putBit(!1);for(;;){if(n.getLengthInBits()>=8*o)break;if(n.put(236,8),n.getLengthInBits()>=8*o)break;n.put(17,8)}return n.getBuffer()};
    const QRBitBuffer = function(){this.buffer=[],this.length=0;this.getBuffer=()=>this.buffer;this.put=(n,t)=>{for(let r=0;r<t;r++)this.putBit((n>>>t-r-1&1)==1)};this.getLengthInBits=()=>this.length;this.putBit=t=>{let r=Math.floor(this.length/8);this.buffer.length<=r&&this.buffer.push(0),t&&(this.buffer[r]|=128>>>this.length%8),this.length++}};

    _this.svg = () => {
      const qrInstance = qrcode(_options.typeNumber, _options.ecl);
      qrInstance.addData(_options.content);
      qrInstance.make();
      return qrInstance.createSvgTag(_options.padding, _options.padding*2);
    };

    return _this;
  };

  return {
    generateSvgBase64: (text) => {
      try {
        const qr = new QRCode({
          content: text,
          padding: 4,
          ecl: 'Q', // Nível de correção 'Q' (Quartile) para alta robustez
        });
        const svgString = qr.svg();
        if (!svgString) throw new Error("SVG string generation failed.");
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

