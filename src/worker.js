/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code).
 *
 * Esta versão foca apenas na geração da string "Copia e Cola",
 * removendo a lógica de geração de QR Code para estabilidade.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    // Lida com requisições pre-flight (CORS)
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
            return new Response(JSON.stringify({
              error: `O campo '${field}' é obrigatório.`
            }), { status: 400, headers: corsHeaders() });
          }
        }

        const pixPayload = generatePixPayload(data);

        return new Response(JSON.stringify({
          pixCopiaECola: pixPayload
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

/**
 * Lida com requisições OPTIONS para CORS.
 * @param {Request} request
 * @returns {Response}
 */
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
    });
  } else {
    return new Response(null, { headers: { "Allow": "POST, OPTIONS" } });
  }
}

/**
 * Retorna os cabeçalhos CORS padrão para as respostas.
 * @returns {HeadersInit}
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

/**
 * Formata um campo individual do payload PIX (ID + Tamanho + Valor).
 * @param {string} id - O ID do campo.
 * @param {string} value - O valor do campo.
 * @returns {string}
 */
function formatField(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Calcula o CRC16-CCITT-FALSE para o payload PIX.
 * @param {string} payload - O payload PIX sem o campo do CRC.
 * @returns {string}
 */
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

/**
 * Gera a string completa do payload PIX a partir dos dados fornecidos.
 * @param {object} data - O objeto com os dados da cobrança.
 * @returns {string}
 */
function generatePixPayload(data) {
  const { pixKey, description, merchantName, merchantCity, txid = '***', amount } = data;

  // Validações de tamanho dos campos
  if (merchantName.length > 25) throw new Error("O nome do comerciante (merchantName) não pode exceder 25 caracteres.");
  if (merchantCity.length > 15) throw new Error("A cidade do comerciante (merchantCity) não pode exceder 15 caracteres.");
  if (txid && txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) throw new Error("O txid deve conter apenas letras e números e ter no máximo 25 caracteres.");
  if (description) {
    const maxDescLength = 99 - 4 - 14 - (4 + pixKey.length) - 4; // Cálculo aproximado
    if (description.length > maxDescLength) {
      throw new Error(`A descrição é muito longa para a chave PIX fornecida. Máximo de ${maxDescLength} caracteres.`);
    }
  }

  // Montagem do payload
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

