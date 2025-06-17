# pix-code-generator
Código para criar código PIX (copia e cola) usando Workers da Cloudflare.

Endpoint POST para gerar QrCode: https://api.sl.app.br/pix/code/generator

Exemplo de payload JSON enviado:
```json
{
  "pixKey": "pix.efi@sa.arq.br",
  "merchantName": "SAMUELLOPES",
  "merchantCity": "NOVOGAMA",
  "amount": "0.00",
  "txid": "TXIDUNICO123",
  "description": "opcional"
}
```
Exemplo cURL:
```cURL
curl --location 'api.sl.app.br/pix/code/generator' \
--header 'Content-Type: application/json' \
--data-raw '{
  "pixKey": "pix.efi@sa.arq.br",
  "merchantName": "SAMUELLOPES",
  "merchantCity": "NOVOGAMA",
  "amount": "0.00",
  "txid": "TXIDUNICO123",
  "description": ""
}
'
```
