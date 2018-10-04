import { html, render as litRender } from '/lit/lit-html.js';

function render(items) {
  
}

async function fetchFeed() {
  const response = await fetch('/feed');
  const dom = new DOMParser().parseFromString(await response.text(), 'text/xml');
  const items = [...dom.querySelectorAll('item')].map(domItem => ({
    title: domItem.querySelector('title').textContent
  }));
}

fetchFeed();
