import { html, render as litRender } from '/lit/lit-html.js';

const app = document.querySelector('.app');
let state;

const template = (state) => html`
  <div class="podcasts">
    ${state.items.map(item => html`
      <section class="podcast" data-id=${item.id}>
        <h2 class="podcast-title">${item.title}</h2>
        <p class="podcast-desc">${item.subtitle}</p>
        <img class="podcast-img" src=${item.image} width="100" height="100">
        ${item.state === 'stored' ?
          html`<audio src=${item.src}>`
          :
          html`<button>Download</button>`
        }
      </section>
    `)}
  </div>
`;

let renderPending;

function render() {
  if (renderPending) return renderPending;

  renderPending = (async function() {
    await Promise.resolve();
    litRender(template(state), app);
    renderPending = undefined;
  })();

  return renderPending;
}

async function getInitialState() {
  const response = await fetch('/feed');
  const dom = new DOMParser().parseFromString(await response.text(), 'text/xml');
  const itemPromises = [...dom.querySelectorAll('item')].map(async domItem => {
    const src = domItem.querySelector('origEnclosureLink').textContent;
    const id = /\/([^\/]+)\.mp3$/.exec(src)[1];
    
    return {
      src,
      id: /\/([^\/]+)\.mp3$/.exec(src)[1],
      title: domItem.querySelector('title').textContent,
      subtitle: domItem.querySelector('subtitle').textContent,
      image: new URL(domItem.querySelector('image').getAttribute('href'), 'https://developers.google.com/').href,
      duration: domItem.querySelector('duration').textContent,
      size: Number(domItem.querySelector('enclosure').getAttribute('length')),
      state: await caches.has(`podcast-${id}`).then(stored => stored ? 'stored' : 'not-stored'),
      progress: 0,
    };
  });

  return {
    items: await Promise.all(itemPromises),
  }
}

async function updateItem(id, update) {
  const index = state.items.findIndex(item => item.id === id);
  if (index === -1) return;

  state = {...state};
  state.items = state.items.slice();

  state.items[index] = {
    ...state.items[index],
    ...update,
  };

  render();
}

async function monitorBgFetch(bgFetch) {
  updateItem(bgFetch);

  function listener() {
    const update = {};

    if (bgFetch.result === '') {
      update.state = 'fetching';
      update.progress = downloaded / downloadTotal;
    } else if (bgFetch.result === 'success') {
      // Using BroadcastChannel to detect when it's fully stored
      update.state = 'fetching';
      update.progress = 1;
    } else { // Failure
      update.state = 'failed';
    }

    updateItem(bgFetch.id, update);
  };

  bgFetch.addEventListener('progress', listener);
  const channel = new BroadcastChannel(bgFetch.id);

  channel.onmessage = (event) => {
    if (!event.data.stored) return;
    bgFetch.removeEventListener('progress', listener);
    channel.close();
    updateItem(bgFetch.id, { state: 'stored' });
  };
}

async function checkOngoingFetches() {
  const reg = await navigator.serviceWorker.ready;
  const ids = await reg.backgroundFetch.getIds();

  ids.filter(id => id.startsWith('podcast-')).forEach(async (id) => {
    monitorBgFetch(await reg.backgroundFetch.get(id));
  });
}

async function init() {
  navigator.serviceWorker.register('/sw.js');
  state = await getInitialState();
  render();
  checkOngoingFetches();
}


init();
