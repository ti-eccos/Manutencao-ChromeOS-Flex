const crypto = require('node:crypto');
const fs = require('node:fs');

function varint(value) {
  const bytes = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value = Math.floor(value / 128);
  }
  bytes.push(value);
  return Buffer.from(bytes);
}

function field(number, payload) {
  return Buffer.concat([varint((number << 3) | 2), varint(payload.length), payload]);
}

function extensionHash(publicKey) {
  return crypto.createHash('sha256').update(publicKey).digest().subarray(0, 16);
}

function extensionId(hash) {
  return [...hash].map((byte) =>
    String.fromCharCode(97 + (byte >> 4), 97 + (byte & 0x0f))
  ).join('');
}

function main() {
  const [keyPath, inputPath, outputPath, expectedId] = process.argv.slice(2);
  if (!keyPath || !inputPath || !outputPath || !expectedId) {
    throw new Error('Uso: node assinar-crx3.js <chave.pem> <pacote.crx> <saida.crx> <id-esperado>');
  }

  const key = fs.readFileSync(keyPath);
  const privateKey = crypto.createPrivateKey(key);
  const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const idHash = extensionHash(publicKey);
  const actualId = extensionId(idHash);
  if (actualId !== expectedId) {
    throw new Error(`A chave resulta no ID ${actualId}, mas era esperado ${expectedId}.`);
  }

  const source = fs.readFileSync(inputPath);
  let zip;
  if (source.subarray(0, 4).toString() === 'PK\x03\x04') {
    zip = source;
  } else if (source.subarray(0, 4).toString() === 'Cr24' && source.readUInt32LE(4) === 3) {
    const oldHeaderLength = source.readUInt32LE(8);
    zip = source.subarray(12 + oldHeaderLength);
  } else {
    throw new Error('O arquivo de entrada precisa ser um ZIP ou pacote CRX3.');
  }
  if (zip.subarray(0, 4).toString() !== 'PK\x03\x04') {
    throw new Error('O conteúdo ZIP não foi encontrado dentro do CRX.');
  }

  const signedHeaderData = field(1, idHash);
  const signedInput = Buffer.concat([
    Buffer.from('CRX3 SignedData\0', 'binary'),
    Buffer.from([signedHeaderData.length & 0xff, (signedHeaderData.length >> 8) & 0xff,
      (signedHeaderData.length >> 16) & 0xff, (signedHeaderData.length >> 24) & 0xff]),
    signedHeaderData,
    zip,
  ]);
  const signature = crypto.sign('sha256', signedInput, privateKey);
  const proof = Buffer.concat([field(1, publicKey), field(2, signature)]);
  const header = Buffer.concat([field(2, proof), field(10000, signedHeaderData)]);
  const output = Buffer.concat([
    Buffer.from('Cr24'),
    Buffer.from([3, 0, 0, 0]),
    Buffer.from([header.length & 0xff, (header.length >> 8) & 0xff,
      (header.length >> 16) & 0xff, (header.length >> 24) & 0xff]),
    header,
    zip,
  ]);
  fs.writeFileSync(outputPath, output);

  const publicKeyObject = crypto.createPublicKey({ key: publicKey, format: 'der', type: 'spki' });
  if (!crypto.verify('sha256', signedInput, publicKeyObject, signature)) {
    throw new Error('A verificação local da assinatura falhou.');
  }
  process.stdout.write(`CRX3 assinado; ID ${actualId}; ${output.length} bytes.\n`);
}

main();
