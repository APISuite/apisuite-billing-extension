/* eslint-disable */
exports.seed = function(knex) {
  if (process.env.NODE_ENV !== 'test') return

  return knex('subscriptions').del()
    .then(function () {
      return knex('subscriptions').insert([
        { name: 'Starter Subscription', price: 200, credits: 200, periodicity: '1 month' },
        { name: 'Advanced Pack', price: 2000, credits: 2000, periodicity: '3 months' },
        { name: 'Super Subscription', price: 5000, credits: 8000, periodicity: '1 year' },
      ]);
    });
};
