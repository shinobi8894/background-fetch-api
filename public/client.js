import { html, render as litRender } from '/lit/lit-html.js';

const app = document.querySelector('.app');
let state = { items: [], currentlyPlayingId: '', };

function template({ items, currentlyPlayingId }) {
  const currentlyPlaying = currentlyPlayingId && items.find(item => item.id === currentlyPlayingId);
  
  return html`
    <div class="podcasts">
      ${state.items.map(item => {
        let buttonClass;
        let buttonClickListener;
        
        if (item.state === 'stored') {
          buttonClass
          buttonClickListener = onDeleteButtonClick;
        }
    
        return html`
          <section class="podcast" data-podcast-id=${item.id}>
            <button class="podcast-titles" @click=${onPodcastClick}>
              <h2 class="podcast-title">${item.title}</h2>
              <p class="podcast-subtitle">${item.subtitle}</p>
            </button>

            <button class="action-button">
              <svg viewBox="0 0 39 39">
                <title>TODO</title>
                <path class="action-dl action-on" d="M26.5,18.5v7h-14v-7h-2v7a2,2,0,0,0,2,2h14a2,2,0,0,0,2-2v-7Zm-6,.67,2.59-2.58L24.5,18l-5,5-5-5,1.41-1.41,2.59,2.58V9.5h2Z"/>
                <circle class="action-progress action-off" cx="19.5" cy="19.5" r="18" fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="3"/>
                <path class="action-abort action-off" d="M19.5,9.5a10,10,0,1,0,10,10A10,10,0,0,0,19.5,9.5Zm5,13.59L23.09,24.5,19.5,20.91,15.91,24.5,14.5,23.09l3.59-3.59L14.5,15.91l1.41-1.41,3.59,3.59,3.59-3.59,1.41,1.41L20.91,19.5Z"/>
                <path class="action-del action-off" d="M13.5,26.5a2,2,0,0,0,2,2h8a2,2,0,0,0,2-2v-12h-12Zm13-15H23l-1-1H17l-1,1H12.5v2h14Z"/>
                <path class="action-error action-off" d="M18.5,22.5h2v2h-2Zm0-8h2v6h-2Zm1-5a10,10,0,1,0,10,10A10,10,0,0,0,19.49,9.5Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,19.5,27.5Z"/>
              </svg>
            </button>

            ${/*
              item.state === 'stored' ?
                html`<button @click=${onDeleteButtonClick}>Delete</button>`
              : item.state === 'fetching' ?
                `Fetching ${Math.round(item.progress * 100)}`
              : item.state === 'failed' ?
                'Failed'
              :
                html`<button @click=${onDownloadButtonClick}>Download</button>`
            */ undefined}
          </section>
        `;
      })}
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
