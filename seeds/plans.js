/* eslint-disable */
exports.seed = function(knex) {
  if (process.env.NODE_ENV !== 'test') return

  return knex('plans').del()
    .then(function () {
      return knex('plans').insert([
        { name: 'Starter Pack', price: 200, credits: 200 },
        { name: 'Advanced Pack', price: 2000, credits: 2000 },
        { name: 'Super Subscription', price: 5000, credits: 8000, periodicity: '1 month' },
      ]);
    });
};
