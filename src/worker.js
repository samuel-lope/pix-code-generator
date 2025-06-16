/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code).
 *
 * Este worker expõe um endpoint que aceita requisições POST com dados em JSON
 * para gerar uma string de payload PIX estático, formatada de acordo com o
 * manual de padrões do Banco Central do Brasil.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 *
 * Exemplo de Body (JSON) para a requisição:
 * {
 * "pixKey": "a9f8b412-3e2c-4b6d-8a6e-4f5a6b1c2d3e", // Sua chave PIX (aleatória, CPF, CNPJ, etc.)
 * "merchantName": "Nome do Comerciante", // Seu nome ou da sua empresa (até 25 caracteres)
 * "merchantCity": "SAO PAULO", // Cidade do comerciante (até 15 caracteres)
 * "amount": "10.50", // Valor do PIX (opcional)
 * "txid": "TXIDUNICO123", // ID da transação (opcional, máximo 25 caracteres alfanuméricos)
 * "description": "Pagamento do pedido 123" // Descrição/infoAdicional (opcional)
 * }
 *
 * Exemplo de como testar com cURL:
 * curl -X POST 'SUA_URL_DO_WORKER/pix/code/generator' \
 * -H 'Content-Type: application/json' \
 * -d '{
 * "pixKey": "a9f8b412-3e2c-4b6d-8a6e-4f5a6b1c2d3e",
 * "merchantName": "Nome do Comerciante",
 * "merchantCity": "SAO PAULO",
 * "amount": "10.50",
 * "txid": "TXID12345",
 * "description": "Pedido 123"
 * }'
 */
// primeiro teste 16-06-2025
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  // Roteamento simples para o endpoint
  if (pathname === '/pix/code/generator' && request.method === 'POST') {
    try {
      const data = await request.json();

      // Validação dos campos obrigatórios
      const requiredFields = ['pixKey', 'merchantName', 'merchantCity'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return new Response(JSON.stringify({ error: `O campo '${field}' é obrigatório.` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Geração do payload PIX
      const pixPayload = generatePixPayload(data);

      return new Response(JSON.stringify({ pixCopiaECola: pixPayload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({ error: 'Corpo da requisição não é um JSON válido.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Erro inesperado:', error);
      return new Response(JSON.stringify({ error: 'Ocorreu um erro interno.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Resposta para rotas não encontradas
  return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Formata um campo individual do payload PIX (ID + Tamanho + Valor).
 * @param {string} id - O ID do campo (ex: '00', '26', '53').
 * @param {string} value - O valor do campo.
 * @returns {string} O campo formatado.
 */
function formatField(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Calcula o CRC16-CCITT-FALSE para o payload PIX.
 * @param {string} payload - O payload PIX sem o campo do CRC.
 * @returns {string} O valor do CRC16 formatado como uma string hexadecimal de 4 caracteres.
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
 * @returns {string} A string do "Pix Copia e Cola".
 */
function generatePixPayload(data) {
  const {
    pixKey,
    description,
    merchantName,
    merchantCity,
    txid = '***',
    amount
  } = data;

  // Validações de tamanho dos campos
  if (merchantName.length > 25) {
    throw new Error("O nome do comerciante (merchantName) não pode exceder 25 caracteres.");
  }
  if (merchantCity.length > 15) {
    throw new Error("A cidade do comerciante (merchantCity) não pode exceder 15 caracteres.");
  }
  if (txid.length > 25) {
      throw new Error("O ID da transação (txid) não pode exceder 25 caracteres.");
  }


  // --- Montagem do Payload ---

  // ID 00: Payload Format Indicator (Fixo: "01")
  let payload = formatField('00', '01');

  // ID 26: Merchant Account Information
  // Contém informações do PIX
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', pixKey);
  const desc = description ? formatField('02', description) : '';
  payload += formatField('26', `${gui}${key}${desc}`);

  // ID 52: Merchant Category Code (Fixo: "0000" para "Não informado")
  payload += formatField('52', '0000');

  // ID 53: Transaction Currency (Fixo: "986" para BRL)
  payload += formatField('53', '986');

  // ID 54: Transaction Amount (Opcional)
  if (amount) {
    const formattedAmount = parseFloat(amount).toFixed(2);
    payload += formatField('54', formattedAmount);
  }

  // ID 58: Country Code (Fixo: "BR")
  payload += formatField('58', 'BR');

  // ID 59: Merchant Name
  payload += formatField('59', merchantName);

  // ID 60: Merchant City
  payload += formatField('60', merchantCity);

  // ID 62: Additional Data Field Template
  // Contém o TXID
  const formattedTxid = formatField('05', txid);
  payload += formatField('62', formattedTxid);

  // ID 63: CRC16
  // O CRC é calculado sobre todo o payload, incluindo o "6304"
  const payloadWithCrcId = payload + '6304';
  const crc = calculateCRC16(payloadWithCrcId);
  payload += `6304${crc}`;

  return payload;
}
