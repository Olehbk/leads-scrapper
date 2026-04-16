const BaseScraper = require('../base.scraper');
const { SUBREDDITS } = require('./reddit.config');
const redditFilter = require('./reddit.filter');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 1500;
const MAX_PAGES = 10; // cap at 1000 posts per subreddit for date-range mode

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSubredditPage(subreddit, after = null) {
  const params = `limit=100${after ? `&after=${after}` : ''}`;
  const url = `https://www.reddit.com/r/${subreddit}/new.json?${params}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });

  if (res.status === 429) throw new Error('Rate limited by Reddit');
  if (!res.ok) throw new Error(`Reddit returned ${res.status}`);

  const json = await res.json();
  const posts = json?.data?.children?.map(c => c.data) || [];
  const nextAfter = json?.data?.after || null;
  return { posts, nextAfter };
}

async function fetchSubredditNew(subreddit) {
  const { posts } = await fetchSubredditPage(subreddit);
  return posts;
}

class RedditScraper extends BaseScraper {
  constructor() {
    super('reddit');
  }

  async fetchPosts(maxAgeHours = 48) {
    const seen = new Set();
    const allPosts = [];
    const oldestAllowed = Math.floor(Date.now() / 1000) - maxAgeHours * 3600;

    for (const subreddit of SUBREDDITS) {
      let after = null;
      let page = 0;
      let subredditCount = 0;
      try {
        while (page < MAX_PAGES) {
          console.log(`[reddit] Fetching r/${subreddit} page ${page + 1}...`);
          const { posts, nextAfter } = await fetchSubredditPage(subreddit, after);
          if (!posts.length) break;

          for (const post of posts) {
            if (!seen.has(post.id)) {
              seen.add(post.id);
              allPosts.push(post);
              subredditCount++;
            }
          }

          const oldestOnPage = posts[posts.length - 1].created_utc;
          if (oldestOnPage < oldestAllowed || !nextAfter) break;

          after = nextAfter;
          page++;
          await sleep(DELAY_MS);
        }
        console.log(`[reddit] r/${subreddit}: ${subredditCount} posts`);
      } catch (err) {
        console.warn(`[reddit] Failed r/${subreddit}: ${err.message}`);
      }
    }

    console.log(`[reddit] Total: ${allPosts.length} posts across ${SUBREDDITS.length} subreddits`);
    return allPosts;
  }

  normalisePost(raw) {
    return {
      source: 'reddit',
      external_id: `t3_${raw.id}`,
      title: raw.title || '',
      body: raw.selftext || '',
      author: raw.author ? `u/${raw.author}` : '[deleted]',
      url: `https://reddit.com${raw.permalink}`,
      subreddit: raw.subreddit,
      score: raw.score || 0,
      created_at: raw.created_utc,
    };
  }

  async fetchPostsInRange(fromTs) {
    const seen = new Set();
    const allPosts = [];

    for (const subreddit of SUBREDDITS) {
      let after = null;
      let page = 0;
      try {
        while (page < MAX_PAGES) {
          console.log(`[reddit] Fetching r/${subreddit} page ${page + 1}...`);
          const { posts, nextAfter } = await fetchSubredditPage(subreddit, after);
          if (!posts.length) break;

          for (const post of posts) {
            if (!seen.has(post.id)) {
              seen.add(post.id);
              allPosts.push(post);
            }
          }

          const oldestOnPage = posts[posts.length - 1].created_utc;
          if (oldestOnPage < fromTs || !nextAfter) break;

          after = nextAfter;
          page++;
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.warn(`[reddit] Failed r/${subreddit}: ${err.message}`);
      }
    }

    console.log(`[reddit] Total (date range): ${allPosts.length} posts`);
    return allPosts;
  }

  filterPosts(posts, maxAgeHours) {
    return redditFilter.filterPosts(posts, maxAgeHours);
  }

  filterByDateRange(posts, fromTs, toTs) {
    return redditFilter.filterByDateRange(posts, fromTs, toTs);
  }

  isHighSignal(post) {
    return redditFilter.isHighSignal(post);
  }
}

module.exports = RedditScraper;
