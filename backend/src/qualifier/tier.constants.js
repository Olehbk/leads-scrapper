const TIERS = {
  '1': {
    label: 'Hot',
    description: 'Explicit request to hire a developer or build something, with budget signals (funded startup, established business, mentions payment)',
    color: 'red',
  },
  '2': {
    label: 'Warm',
    description: 'Clear need or interest expressed, but budget or intent to hire is unclear',
    color: 'yellow',
  },
  '3': {
    label: 'Cold',
    description: 'General discussion, complaint, or wish — no clear intent to hire or pay someone',
    color: 'gray',
  },
};

module.exports = { TIERS };
