// Renders src/reviews.json into the ratings section of index.html (between the reviews:start / reviews:end markers).
// Usage: npm run build:reviews
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('./reviews.json', import.meta.url), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const card = r => `        <li class="rcard" data-site="${r.site === 'Booking.com' ? 'booking' : 'lekkeslaap'}">
          <p class="rcard__src"><span>${esc(r.site)}</span>${r.score ? `<span class="rcard__score">${esc(r.score)}</span>` : ''}</p>
          <blockquote class="rcard__q"><p>${esc(r.text)}</p></blockquote>
          <p class="rcard__by"><strong>${esc(r.name)}</strong><span>${esc(r.detail)}${r.translated ? ', translated' : ''}</span></p>
        </li>`;

const html = `<!-- reviews:start -->\n${data.reviews.map(card).join('\n')}\n        <!-- reviews:end -->`;
const file = new URL('../index.html', import.meta.url);
let page = fs.readFileSync(file, 'utf8');
const a = page.indexOf('<!-- reviews:start -->');
const b = page.indexOf('<!-- reviews:end -->');
if (a < 0 || b < 0) throw new Error('reviews markers not found in index.html');
page = page.slice(0, a) + html + page.slice(b + '<!-- reviews:end -->'.length);
fs.writeFileSync(file, page);
console.log('rendered', data.reviews.length, 'review cards');
