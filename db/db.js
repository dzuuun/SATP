const {createPool} = require('mysql');

const pool = createPool({

    password: '',
    user: 'root',
    database: 'satp',
    host: 'localhost',
    port: '3306'

});
 

module.exports = pool;