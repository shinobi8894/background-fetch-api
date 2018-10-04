import { html, render as litRender } from '/lit/lit-html.js';

const app = document.querySelector('.app');

const template = (items) => html`
  ${items.map(item => html`
    <section class="podcast">
      <h2>${item.title}</h2>
    <p>${item.subtitle}</p>
    <p>${item.id}</p>
    <img src=${item.image} width="100" height="100">
    </section>
    
  `)}
`;

function render(items) {
  litRender(template(items), app);
}

async function fetchFeed() {
  const response = await fetch('/feed');
  const dom = new DOMParser().parseFromString(await response.text(), 'text/xml');
  return [...dom.querySelectorAll('item')].map(domItem => {
    const src = domItem.querySelector('origEnclosureLink').textContent;
    
    return {
      src,
      id: /\/([^\/]+)\.mp3$/.exec(src)[1],
      title: domItem.querySelector('title').textContent,
      subtitle: domItem.querySelector('subtitle').textContent,
      image: new URL(domItem.querySelector('image').getAttribute('href'), 'https://developers.google.com/').href,
      duration: domItem.querySelector('duration').textContent,
      size: Number(domItem.querySelector('enclosure').getAttribute('length')),
    };
  });
}

fetchFeed().then(items => render(items));

navigator.serviceWorker.register('/sw.js');