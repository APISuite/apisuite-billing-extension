/* eslint-disable */
exports.seed = function(knex) {
  if (process.env.NODE_ENV !== 'test') return

  return knex('packages').del()
    .then(function () {
      return knex('packages').insert([
        { name: 'Starter Pack', price: 200.55, credits: 200.1 },
        { name: 'Advanced Pack', price: 2000, credits: 2000 },
        { name: 'Super Subscription', price: 5000, credits: 8000 },
      ]);
    });
};
