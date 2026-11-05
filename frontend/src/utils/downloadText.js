export function downloadText(text, filename, mime = 'text/plain;charset=utf-8', includeBom = true) {
  let url, link;
  try {
    url = URL.createObjectURL(new Blob(includeBom ? ['\uFEFF', text] : [text], { type: mime }));
    link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
  } finally {
    link?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
