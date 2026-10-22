// Resolve once the download is clearly working (bytes arriving or complete) or has failed.
// chrome.downloads.download() only reports that a download was queued, not that the server allowed it.
const watchDownload = (id) =>
  new Promise((resolve) => {
    const done = (result) => {
      chrome.downloads.onChanged.removeListener(onChanged);
      clearTimeout(timer);
      resolve(result);
    };
    const check = ([item]) => {
      if (item?.state === "interrupted") done({ ok: false, error: item.error });
      else if (item?.state === "complete" || item?.bytesReceived > 0) done({ ok: true });
    };
    const onChanged = (delta) => {
      if (delta.id === id) chrome.downloads.search({ id }, check);
    };
    const timer = setTimeout(() => done({ ok: true }), 10000);
    chrome.downloads.onChanged.addListener(onChanged);
    chrome.downloads.search({ id }, check);
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "download") return;
  chrome.downloads.download(
    { url: message.url, filename: message.filename.replace(/[\\/:*?"<>|]/g, "_") },
    (id) => {
      if (id === undefined) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message });
        return;
      }
      watchDownload(id).then(sendResponse);
    },
  );
  return true;
});
