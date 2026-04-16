const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function stripHtml(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return `Could not fetch page (HTTP ${res.status})`;
    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 2500);
  } catch (err) {
    return `Could not fetch page: ${err.message}`;
  }
}

async function getRedditHistory(username) {
  try {
    const clean = username.replace(/^u\//, '');
    const url = `https://www.reddit.com/user/${clean}/overview.json?limit=15`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return `Could not fetch history for u/${clean}`;
    const json = await res.json();
    const items = json?.data?.children || [];
    if (items.length === 0) return `No public activity found for u/${clean}`;
    return items.map(item => {
      const d = item.data;
      const type = item.kind === 't3' ? 'post' : 'comment';
      const text = (d.title || d.body || '').slice(0, 120);
      return `[${type}] r/${d.subreddit}: ${text}`;
    }).join('\n');
  } catch (err) {
    return `Could not fetch Reddit history: ${err.message}`;
  }
}

module.exports = { fetchPage, getRedditHistory };
