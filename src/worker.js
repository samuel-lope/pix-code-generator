// Cloudflare Worker - Geração de PIX Copia e Cola + QRCode SVG em Base64

import { encode } from 'base64-arraybuffer';

// Módulo simples para gerar o payload do PIX Copia e Cola
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

  if (merchantName.length > 25) throw new Error("O merchantName não pode ter mais de 25 caracteres.");
  if (merchantCity.length > 15) throw new Error("O merchantCity não pode ter mais de 15 caracteres.");
  if (txid && txid !== '***' && !/^[a-zA-Z0-9]{1,25}$/.test(txid)) throw new Error("txid inválido.");

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

// Módulo gerador de QRCode (Baseado em qrcode-generator, versão simplificada para Worker)
function generateQRCodeSVG(content) {
  const QRCode = require('qrcode-generator');
  const qr = QRCode(0, 'Q');
  qr.addData(content);
  qr.make();

  const svgTag = qr.createSvgTag({ scalable: true });
  return svgTag;
}

// Helper: Converte SVG para Base64
function svgToBase64(svg) {
  const encoder = new TextEncoder();
  const svgBuffer = encoder.encode(svg);
  return btoa(String.fromCharCode(...svgBuffer));
}

// Headers CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json;charset=UTF-8'
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method === 'POST' && new URL(request.url).pathname === '/pix/code/generator') {
      try {
        const data = await request.json();
        const requiredFields = ['pixKey', 'merchantName', 'merchantCity'];
        for (const field of requiredFields) {
          if (!data[field]) {
            return new Response(JSON.stringify({ error: `Campo '${field}' é obrigatório.` }), { status: 400, headers: corsHeaders() });
          }
        }

        const pixPayload = generatePixPayload(data);

        const svg = generateQRCodeSVG(pixPayload);
        const svgBase64 = 'data:image/svg+xml;base64,' + svgToBase64(svg);

        return new Response(JSON.stringify({
          pixCopiaECola: pixPayload,
          svgQrCode: svgBase64
        }), { status: 200, headers: corsHeaders() });

      } catch (err) {
        console.error('Erro:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders() });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado.' }), { status: 404, headers: corsHeaders() });
  }
};

