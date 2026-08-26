const fs = require('fs');
const QRCode = require('qrcode');

const url = process.argv[2];
const output = process.argv[3] || 'Data/qr-trai-tim.svg';

if (!url) {
  console.error('Usage: node scripts/generate-heart-qr.cjs <url> [output.svg]');
  process.exit(1);
}

const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
const count = qr.modules.size;
const quiet = 4;
const moduleSize = Math.floor(1000 / (count + quiet * 2));
const qrSize = (count + quiet * 2) * moduleSize;
const width = 1200;
const height = qrSize + 250;
const qrX = Math.round((width - qrSize) / 2);
const qrY = 58;
const dataX = qrX + quiet * moduleSize;
const dataY = qrY + quiet * moduleSize;

const parts = [];
const roundedRect = (x, y, size, radius, fill) =>
  `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;

const isFinder = (row, col) =>
  (row < 7 && col < 7) ||
  (row < 7 && col >= count - 7) ||
  (row >= count - 7 && col < 7);

const heart = (x, y, size, fill) => {
  const cx = x + size / 2;
  const top = y + size * .18;
  const bottom = y + size * .88;
  return `<path d="M ${cx} ${bottom} C ${x + size * .08} ${y + size * .58}, ${x + size * .05} ${top}, ${cx} ${y + size * .4} C ${x + size * .95} ${top}, ${x + size * .92} ${y + size * .58}, ${cx} ${bottom} Z" fill="${fill}"/>`;
};

parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
parts.push(`<defs>
  <linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff9fc"/><stop offset="1" stop-color="#ffeaf4"/></linearGradient>
  <linearGradient id="pink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff4b9d"/><stop offset="1" stop-color="#d81770"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
</defs>`);
parts.push(`<rect width="${width}" height="${height}" rx="54" fill="url(#page)"/>`);
parts.push(`<circle cx="180" cy="150" r="105" fill="#ffb6d6" opacity=".22" filter="url(#soft)"/>`);
parts.push(`<circle cx="1035" cy="880" r="130" fill="#ff8fc2" opacity=".16" filter="url(#soft)"/>`);
parts.push(`<rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}" rx="42" fill="#fff" stroke="#f4c3d9" stroke-width="3"/>`);

for (let row = 0; row < count; row++) {
  for (let col = 0; col < count; col++) {
    if (!qr.modules.get(row, col) || isFinder(row, col)) continue;
    const x = dataX + col * moduleSize;
    const y = dataY + row * moduleSize;
    const inset = moduleSize * .025;
    const fill = (row * 3 + col * 5) % 13 === 0 ? '#d91c72' : '#43102f';
    if ((row * 7 + col * 11) % 47 === 0) {
      parts.push(heart(x + inset, y + inset, moduleSize - inset * 2, fill));
    } else {
      parts.push(roundedRect(x + inset, y + inset, moduleSize - inset * 2, moduleSize * .16, fill));
    }
  }
}

for (const [row, col] of [[0, 0], [0, count - 7], [count - 7, 0]]) {
  const x = dataX + col * moduleSize;
  const y = dataY + row * moduleSize;
  parts.push(roundedRect(x, y, moduleSize * 7, moduleSize * .35, '#43102f'));
  parts.push(roundedRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * .18, '#fff'));
  parts.push(roundedRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * .22, '#e2267a'));
}

const logoSize = moduleSize * 4.2;
const logoX = width / 2 - logoSize / 2;
const logoY = qrY + qrSize / 2 - logoSize / 2;
parts.push(`<circle cx="${width / 2}" cy="${logoY + logoSize / 2}" r="${logoSize * .57}" fill="#fff"/>`);
parts.push(`<circle cx="${width / 2}" cy="${logoY + logoSize / 2}" r="${logoSize * .43}" fill="url(#pink)"/>`);
parts.push(heart(logoX + logoSize * .21, logoY + logoSize * .2, logoSize * .58, '#fff'));

const footerY = qrY + qrSize + 78;
parts.push(heart(width / 2 - 21, footerY - 36, 42, '#e2267a'));
parts.push(`<text x="${width / 2}" y="${footerY + 42}" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#43102f">Quét để mở món quà</text>`);
parts.push(`<text x="${width / 2}" y="${footerY + 82}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#a44271">Anh Tuấn dành tặng Quỳnh Nga</text>`);
parts.push('</svg>');

fs.mkdirSync(require('path').dirname(output), { recursive: true });
fs.writeFileSync(output, parts.join('\n'));
console.log(`${output}: ${count}x${count} modules, ${moduleSize}px/module`);
