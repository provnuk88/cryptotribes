const stripe = jest.fn(() => ({
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ id: 'session_mock', url: 'http://stripe.mock/session' })
    }
  },
  webhooks: {
    constructEvent: jest.fn(() => ({}))
  }
}));

module.exports = stripe;
