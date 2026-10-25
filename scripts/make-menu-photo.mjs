import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1240">
<rect width="900" height="1240" fill="#f7f3e8"/>
<rect x="40" y="40" width="820" height="1160" fill="none" stroke="#7a2e1f" stroke-width="6"/>
<text x="450" y="140" font-size="58" font-family="Georgia, serif" text-anchor="middle" fill="#7a2e1f">ANNA RASA</text>
<text x="450" y="196" font-size="30" font-family="Georgia, serif" text-anchor="middle" fill="#3c3c3c">Tiffin and Thali &#183; Velachery, Chennai</text>
<text x="90" y="290" font-size="34" font-family="Georgia, serif" fill="#7a2e1f">STARTERS</text>
<text x="90" y="345" font-size="30" font-family="Georgia, serif" fill="#222">Podi Bonda (3 pieces) ............ Rs. 160</text>
<text x="90" y="395" font-size="30" font-family="Georgia, serif" fill="#222">Medu Vada (4 pieces) ............. Rs. 140</text>
<text x="90" y="445" font-size="30" font-family="Georgia, serif" fill="#222">Crispy Murukku Sundal ............ Rs. 150</text>
<text x="90" y="545" font-size="34" font-family="Georgia, serif" fill="#7a2e1f">MAINS</text>
<text x="90" y="600" font-size="30" font-family="Georgia, serif" fill="#222">Karimeen Pollichathu ............. Rs. 640</text>
<text x="90" y="650" font-size="30" font-family="Georgia, serif" fill="#222">Chettinad Chicken Curry .......... Rs. 420</text>
<text x="90" y="700" font-size="30" font-family="Georgia, serif" fill="#222">Sambar Rice and Ghee Roast ....... Rs. 260</text>
<text x="90" y="800" font-size="34" font-family="Georgia, serif" fill="#7a2e1f">THALI</text>
<text x="90" y="855" font-size="30" font-family="Georgia, serif" fill="#222">Veg Unlimited Meals .............. Rs. 220</text>
<text x="90" y="905" font-size="30" font-family="Georgia, serif" fill="#222">Non Veg Unlimited Meals .......... Rs. 340</text>
<text x="90" y="955" font-size="30" font-family="Georgia, serif" fill="#222">Wedday Special Sappadu ........... Rs. 520</text>
<text x="90" y="1060" font-size="28" font-family="Georgia, serif" fill="#3c3c3c">Open 7.00 am to 10.30 pm, all seven days</text>
<text x="90" y="1110" font-size="28" font-family="Georgia, serif" fill="#3c3c3c">Plot 14, Velachery Main Road, Chennai 600042</text>
<text x="90" y="1160" font-size="28" font-family="Georgia, serif" fill="#3c3c3c">Call 044 2778 1190 to book a table</text>
</svg>`;

const png = await sharp(Buffer.from(svg))
  .resize(760, 1040)
  .modulate({ brightness: 0.98 })
  .jpeg({ quality: 82 })
  .toBuffer();

await sharp(png).toFile('public/samples/menu-photo.jpg');
console.log('wrote public/samples/menu-photo.jpg', png.length, 'bytes');
