# API PIX-code-generator 0.0.2 beta
Código para criar código PIX (copia e cola) usando Workers da Cloudflare.

Endpoint POST para gerar QrCode: https://api.sl.app.br/v2/pix

Exemplo de payload JSON enviado:
```json
{
  "pixKey": "eee344f8cbde4f7f@sa.arq.br",
  "description": "PAGAMENTO AVULSO",
  "merchantName": "SAMUEL LOPES",
  "merchantCity": "NOVO GAMA",
  "amount": "1.00",
  "txid": "c2cddaTXID",
  "qrECL": "Q",
  "qrCellSize": 8,
  "qrMargin": 2
}
```
Exemplo cURL:
```
curl --location 'api.sl.app.br/pix/code/generator' \
--header 'Content-Type: application/json' \
--data-raw '{
  "pixKey": "eee344f8cbde4f7f@sa.arq.br",
  "description": "PAGAMENTO AVULSO",
  "merchantName": "SAMUEL LOPES",
  "merchantCity": "NOVO GAMA",
  "amount": "1.00",
  "txid": "c2cddaTXID",
  "qrECL": "Q",
  "qrCellSize": 8,
  "qrMargin": 2
}'

```
Functional 20-06-2025