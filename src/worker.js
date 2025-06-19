/**
 * Cloudflare Worker para gerar um payload de PIX Copia e Cola (BR Code) e o código HTML do QR Code.
 *
 * Esta versão definitiva utiliza a funcionalidade Browser Rendering da Cloudflare para executar a biblioteca
 * qrcode.js num ambiente de navegador headless, garantindo a correta geração da imagem do QR Code.
 *
 * Endpoint: /pix/code/generator
 * Método: POST
 */

export default {
  /**
   * @param {Request} request
   * @param {{RENDER_HTML: Fetcher}} env - Contém a associação do Browser Rendering.
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
            return new Response(JSON.stringify({ error: `O campo '${field}' é obrigatório.` }), { status: 400, headers: corsHeaders() });
          }
        }

        const pixPayload = generatePixPayload(data);
        
        let qrCodeHtml = null;
        let browser = null;
        try {
          console.log("Worker: Lançando navegador headless...");
          // A associação 'RENDER_HTML' foi definida no wrangler.jsonc
          browser = await env.RENDER_HTML.launch();
          const page = await browser.newPage();
          
          // HTML que será renderizado no navegador headless.
          // Ele carrega a biblioteca qrcode.js e gera o QR Code.
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>body { margin: 0; }</style>
              </head>
              <body>
                <div id="qrcode"></div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                <script>
                  new QRCode(document.getElementById('qrcode'), {
                    text: "${pixPayload}",
                    width: 256,
                    height: 256,
                    correctLevel : QRCode.CorrectLevel.Q // Nível de correção 'Q' para alta legibilidade
                  });
                </script>
              </body>
            </html>
          `;

          await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
          
          // Aguarda o seletor da imagem gerada pela biblioteca
          await page.waitForSelector('#qrcode img');
          
          // Extrai o código HTML da tag <img> gerada
          const qrElement = await page.$('#qrcode');
          qrCodeHtml = await qrElement.innerHTML();
          console.log("Worker: HTML do QR Code extraído com sucesso.");

        } catch (e) {
            console.error("Worker: Falha CRÍTICA na renderização do navegador:", e.message, e.stack);
            // qrCodeHtml continuará null, mas a requisição não falhará
        } finally {
            if (browser) {
                await browser.close();
                console.log("Worker: Navegador headless fechado.");
            }
        }
        
        const responsePayload = {
          pixCopiaECola: pixPayload,
          qrCodeHtml: qrCodeHtml // Retorna o HTML da imagem <img src="data:image/png;base64,...">
        };

        return new Response(JSON.stringify(responsePayload), { status: 200, headers: corsHeaders() });

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
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(null, { headers });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json;charset=UTF-8'
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
      if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ polynomial);
      else crc <<= 1;
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
    if (description.length > maxDescLength) throw new Error(`A descrição é muito longa para a chave PIX fornecida. Máximo de ${maxDescLength} caracteres.`);
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

