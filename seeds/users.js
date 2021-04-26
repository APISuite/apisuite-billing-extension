/* eslint-disable */
exports.seed = function(knex) {
  if (process.env.NODE_ENV !== 'test') return

  return knex('users').del()
    .then(function () {
      return knex('users').insert([
        {
          id: 1,
          credits: 700,
        },
        {
          id: 2,
          credits: 10000,
          ppSubscriptionId: 'ppsub',
        },
      ]);
    });
};
