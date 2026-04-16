const { KEYWORDS, HIGH_SIGNAL_PHRASES } = require('./reddit.config');

function isWithinAgeLimit(post, maxAgeHours) {
  const ageMs = Date.now() - post.created_at * 1000;
  return ageMs <= maxAgeHours * 60 * 60 * 1000;
}

function containsKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function isHighSignal(post) {
  const text = `${post.title} ${post.body}`.toLowerCase();
  return HIGH_SIGNAL_PHRASES.some(phrase => text.includes(phrase.toLowerCase()));
}

// Reject posts where the author is advertising their own services
function isFreelancerAdvert(post) {
  const title = (post.title || '').toLowerCase();
  return title.startsWith('[for hire]') || title.startsWith('for hire') || title.startsWith('[for hire -');
}

function filterPosts(posts, maxAgeHours) {
  let tooOld = 0, freelancer = 0, noKeyword = 0, passed = 0;

  const result = posts.filter(post => {
    if (!isWithinAgeLimit(post, maxAgeHours)) { tooOld++; return false; }
    if (isFreelancerAdvert(post)) { freelancer++; return false; }
    if (!containsKeyword(post.title) && !containsKeyword(post.body)) { noKeyword++; return false; }
    passed++;
    return true;
  });

  console.log(`[filter] ${posts.length} posts → too old: ${tooOld}, freelancer adverts: ${freelancer}, no keyword match: ${noKeyword}, passed: ${passed}`);
  return result;
}

function filterByDateRange(posts, fromTs, toTs) {
  return posts.filter(post => {
    if (post.created_at < fromTs || post.created_at > toTs) return false;
    if (isFreelancerAdvert(post)) return false;
    if (!containsKeyword(post.title) && !containsKeyword(post.body)) return false;
    return true;
  });
}

module.exports = { filterPosts, filterByDateRange, isHighSignal };
