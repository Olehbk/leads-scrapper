class BaseScraper {
  constructor(name) {
    this.name = name;
  }

  // Must return an array of raw platform objects
  async fetchPosts() {
    throw new Error(`${this.name} scraper must implement fetchPosts()`);
  }

  // Must normalise a raw post to the common lead shape
  normalisePost(rawPost) {
    throw new Error(`${this.name} scraper must implement normalisePost()`);
  }

  // Must filter posts by age and relevance
  filterPosts(posts, maxAgeHours) {
    throw new Error(`${this.name} scraper must implement filterPosts()`);
  }

  // Returns true if the post auto-qualifies as Tier 1
  isHighSignal(post) {
    throw new Error(`${this.name} scraper must implement isHighSignal()`);
  }

  // Common shape all scrapers must produce:
  // {
  //   source: string,
  //   external_id: string,   -- unique platform ID
  //   title: string,
  //   body: string,
  //   author: string,
  //   url: string,
  //   subreddit: string|null,
  //   score: number,
  //   created_at: number,    -- unix timestamp
  // }
}

module.exports = BaseScraper;
