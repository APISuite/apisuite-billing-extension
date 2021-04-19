/* eslint-disable */
exports.seed = function(knex) {
  if (process.env.NODE_ENV !== 'test') return

  return knex('settings').del()
    .then(function () {
      return knex('settings').insert([
        { name: 'default_credits', value: '100' },
      ]);
    });
};
