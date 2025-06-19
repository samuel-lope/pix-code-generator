// Importa a biblioteca de geração de QR Code SVG, que é agnóstica ao ambiente.
import QRCode from 'qrcode-svg';

/**
 * Manipulador principal de requisições para o Cloudflare Worker.
 * @param {Request} request - O objeto da requisição recebida.
 * @param {object} env - Variáveis de ambiente e segredos.
 * @returns {Promise<Response>} A resposta HTTP a ser enviada ao cliente.
 */
export default {
  async fetch(request, env) {
    // Roteamento: verifica o caminho e o método da requisição.
    const url = new URL(request.url);
    if (url.pathname!== '/pix/code/generator' || request.method!== 'POST') {
      return new Response('Endpoint não encontrado ou método não permitido.', { status: 404 });
    }

    try {
      // Validação do cabeçalho Content-Type.
      if (request.headers.get('content-type')!== 'application/json') {
        return new Response('Requisição inválida. Content-Type deve ser application/json.', { status: 415 });
      }

      const body = await request.json();

      // Validação dos dados de entrada.
      const validationError = validatePixData(body);
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Monta o payload do BR Code.
      const payload = buildPixPayload(body);
      
      // Gera o QR Code como uma string SVG.
      const qrCodeSvg = new QRCode({
        content: payload,
        padding: 4,
        width: 256,
        height: 256,
        color: "#000000",
        background: "#ffffff",
        ecl: "M", // Nível de correção de erro (L, M, Q, H)
        join: true, // Otimiza o SVG usando um único <path>
      }).svg();

      // Retorna a string SVG com o cabeçalho correto.
      return new Response(qrCodeSvg, {
        headers: { 'Content-Type': 'image/svg+xml' },
      });

    } catch (error) {
      // Tratamento de erros genéricos (ex: JSON malformado).
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({ error: 'Corpo da requisição não é um JSON válido.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.error('Erro interno no Worker:', error);
      return new Response('Ocorreu um erro interno no servidor.', { status: 500 });
    }
  },
};

/**
 * Valida os dados recebidos no corpo da requisição.
 * @param {object} data - Os dados do PIX.
 * @returns {string|null} Uma mensagem de erro ou null se os dados forem válidos.
 */
function validatePixData(data) {
  if (!data.pixKey) return 'O campo "pixKey" é obrigatório.';
  if (!data.merchantName) return 'O campo "merchantName" é obrigatório.';
  if (data.merchantName.length > 25) return 'O campo "merchantName" não pode exceder 25 caracteres.';
  if (!data.merchantCity) return 'O campo "merchantCity" é obrigatório.';
  if (data.merchantCity.length > 15) return 'O campo "merchantCity" não pode exceder 15 caracteres.';
  if (data.txid && data.txid.length > 25) return 'O campo "txid" não pode exceder 25 caracteres.';
  if (data.amount &&!/^\d{1,10}\.\d{2}$/.test(data.amount)) return 'O campo "amount" deve estar no formato "123.45".';
  return null;
}

/**
 * Formata um campo individual no padrão TLV (Tag-Length-Value).
 * @param {string} id - O identificador do campo (Tag).
 * @param {string} value - O valor do campo.
 * @returns {string} O campo formatado como TLV.
 */
function formatField(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Constrói a string completa do payload do BR Code a partir dos dados da transação.
 * @param {object} data - Os dados do PIX.
 * @returns {string} O payload completo, incluindo o CRC16.
 */
function buildPixPayload(data) {
  const { pixKey, description, merchantName, merchantCity, txid, amount } = data;

  // ID 26: Merchant Account Information
  let merchantAccountInfo = formatField('00', 'br.gov.bcb.pix');
  merchantAccountInfo += formatField('01', pixKey);
  if (description) {
    merchantAccountInfo += formatField('02', description);
  }

  // ID 62: Additional Data Field Template
  const transactionId = txid || '***';
  const additionalDataField = formatField('05', transactionId);

  // Montagem dos campos principais
  const payloadFields = "";

  if (amount) {
    payloadFields.push(formatField('54', amount));
  }

  payloadFields.push(
    formatField('58', 'BR'), // Country Code
    formatField('59', merchantName), // Merchant Name
    formatField('60', merchantCity), // Merchant City
    formatField('62', additionalDataField)
  );

  let payload = payloadFields.join('');
  payload += '6304'; // Adiciona o ID e o tamanho do CRC16 para o cálculo

  // Calcula e anexa o CRC16
  const crc16 = calculateCRC16(payload).toString(16).toUpperCase().padStart(4, '0');
  
  return payload + crc16;
}

/**
 * Calcula o checksum CRC16-CCITT-FALSE para o payload do PIX.
 * @param {string} data - A string do payload para o cálculo.
 * @returns {number} O valor do CRC16.
 */
function calculateCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000)!== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
  }

  return crc & 0xFFFF;
}

