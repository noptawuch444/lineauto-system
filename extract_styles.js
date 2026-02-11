
const fs = require('fs');
const content = fs.readFileSync('temp_index.js', 'utf8');

const searchTerms = [
    'Lotto Gold',
    'EDITION',
    'สถานะระบบ',
    'ดาวน์โหลดที่เลือก',
    'brand-logo'
];

searchTerms.forEach(term => {
    const index = content.indexOf(term);
    if (index !== -1) {
        console.log(`\n--- Match for "${term}" ---`);
        const start = Math.max(0, index - 500);
        const end = Math.min(content.length, index + 500);
        const match = content.substring(start, end);
        console.log(match);
    } else {
        console.log(`\n--- No match for "${term}" ---`);
    }
});
