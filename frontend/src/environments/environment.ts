export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001',
  apiUrlJob: 'http://localhost:3003',
  apiUrlpayment: 'http://localhost:3002',
  messagingServiceUrl: 'http://localhost:3004',
  socketUrl: 'ws://localhost:3004',
  auth0: {
    domain: 'dev-zxuicoohweme0r55.us.auth0.com',
    clientId: 'WjTquwIaQfnpUeQ6N081RnkLJMihekqO',
    audience: 'https://api.talentlink.com',
    redirectUri: window.location.origin,
  },
  stripePublishableKey:
    'pk_test_51R6uW2RLnbJDP5CUbe60Ho7FxWeo5PiCi58v9zQXyseJQEEFrZwTtg2GmbGeIETNHWpHomnLJHKyianenkr8R8VE00w9oUCj6Y',
};
