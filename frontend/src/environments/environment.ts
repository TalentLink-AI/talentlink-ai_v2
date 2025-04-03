// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001',
  auth0: {
    domain: 'dev-zxuicoohweme0r55.us.auth0.com',
    clientId: 'WjTquwIaQfnpUeQ6N081RnkLJMihekqO',
  },
  stripe: {
    publicKey:
      'pk_test_51R6uW2RLnbJDP5CUbe60Ho7FxWeo5PiCi58v9zQXyseJQEEFrZwTtg2GmbGeIETNHWpHomnLJHKyianenkr8R8VE00w9oUCj6Y', // Replace with your Stripe test key
  },
};
