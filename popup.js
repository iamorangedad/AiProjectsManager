document.getElementById('openCanvas')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') })
})
