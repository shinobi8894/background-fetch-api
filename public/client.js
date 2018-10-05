import { html, render as litRender } from '/lit/lit-html.js';

const app = document.querySelector('.app');
let state = { items: [], currentlyPlayingId: '', };

function template({ items, currentlyPlayingId }) {
  const currentlyPlaying = currentlyPlayingId && items.find(item => item.id === currentlyPlayingId);
  
  return html`
    <div class="podcasts">
      ${state.items.map(item => html`
        <section class="podcast" data-podcast-id=${item.id}>
          <button class="podcast-titles" @click=${onPodcastClick}>
            <h2 class="podcast-title">${item.title}</h2>
            <p class="podcast-subtitle">${item.subtitle}</p>
          </button>
          
          ${
            item.state === 'stored' ?
              html`<button @click=${onDeleteButtonClick}>Delete</button>`
            : item.state === 'fetching' ?
              `Fetching ${Math.round(item.progress * 100)}`
            : item.state === 'failed' ?
              'Failed'
            :
              html`<button @click=${onDownloadButtonClick}>Download</button>`
          }
        </section>
      `)}
    </div>
    ${currentlyPlaying && html`
      <div class="player">
        <audio controls autoplay crossorigin src=${currentlyPlaying.src}></audio>
      </div>
    `}
  `;
}

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

async function getItemsFromFeed(response) {
  const dom = new DOMParser().parseFromString(await response.text(), 'text/xml');
  const itemPromises = [...dom.querySelectorAll('item')].map(async domItem => {
    const src = domItem.querySelector('origEnclosureLink').textContent;
    const id = 'podcast-' + /\/([^\/]+)\.mp3$/.exec(src)[1];
    
    return {
      src,
      id,
      title: domItem.querySelector('title').textContent,
      subtitle: domItem.querySelector('subtitle').textContent,
      duration: domItem.querySelector('duration').textContent,
      size: Number(domItem.querySelector('enclosure').getAttribute('length')),
      state: await caches.has(id).then((stored) => stored ? 'stored' : 'not-stored'),
      progress: 0,
    };
  });

  return Promise.all(itemPromises);
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
  function doUpdate() {
    const update = {};
    console.log(bgFetch);

    if (bgFetch.result === '') {
      update.state = 'fetching';
      update.progress = bgFetch.downloaded / bgFetch.downloadTotal;
    } else if (bgFetch.result === 'success') {
      update.state = 'fetching';
      update.progress = 1;
    } else { // Failure
      update.state = 'failed';
    }

    updateItem(bgFetch.id, update);
  };
  
  doUpdate();

  bgFetch.addEventListener('progress', doUpdate);
  const channel = new BroadcastChannel(bgFetch.id);

  channel.onmessage = (event) => {
    if (!event.data.stored) return;
    bgFetch.removeEventListener('progress', doUpdate);
    channel.close();
    updateItem(bgFetch.id, { state: 'stored' });
  };
}

async function checkOngoingFetches() {
  const reg = await navigator.serviceWorker.ready;
  const ids = await reg.backgroundFetch.getIds();
  console.log(ids);

  ids.filter(id => id.startsWith('podcast-')).forEach(async (id) => {
    monitorBgFetch(await reg.backgroundFetch.get(id));
  });
}

function onDeleteButtonClick(event) {
  const podcastEl = event.target.closest('.podcast');
  const id = podcastEl.getAttribute('data-podcast-id');
  const item = state.items.find(item => item.id === id);
  updateItem(id, { state: 'not-stored' });
  caches.delete(id);
}
  
async function onDownloadButtonClick(event) {
  const podcastEl = event.target.closest('.podcast');
  const id = podcastEl.getAttribute('data-podcast-id');
  const item = state.items.find(item => item.id === id);
  updateItem(id, { state: 'fetching' });
  const reg = await navigator.serviceWorker.ready;
  const bgFetch = await reg.backgroundFetch.fetch(id, [item.src], {
    title: item.title,
    icons: [{ sizes: '300x300', src: item.image }],
    downloadTotal: item.size
  });
  monitorBgFetch(bgFetch);
}
  
function onPodcastClick(event) {
  const podcastEl = event.target.closest('.podcast');
  const id = podcastEl.getAttribute('data-podcast-id');
  
  state = { ...state, currentlyPlayingId: id };
  render();
}

async function init() {
  navigator.serviceWorker.register('/sw.js');
  
  // Look for cached feed
  const cache = await caches.open('dynamic');
  const cachedFeed = await cache.match('/feed');
  
  if (cachedFeed) {
    state = { ...state, items: await getItemsFromFeed(cachedFeed) };
    render();
  }
  
  if ('BackgroundFetchManager' in self) checkOngoingFetches();
  
  const networkFeed = await fetch('/feed');
  
  if (networkFeed.ok) {
    cache.put('/feed', networkFeed.clone());
    const newItems = (await getItemsFromFeed(networkFeed)).filter(item => !state.items.find(i => i.id === item.id));
    
    if (newItems.length > 0) {
      state = {
        ...state,
        items: [...newItems, ...state.items],
      };
      render();
    }
  }
  
}


init();
