export const selectAll = 'SELECT * FROM users;'

export const selectById = `
    SELECT * 
    FROM users
    WHERE id = $1;
`