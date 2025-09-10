const {createPool} = require('mysql2');

const pool = createPool({

    password: 'Systemx32M3',
    user: 'satp',
    database: 'satp',
    host: 'localhost',
    port: '3306'

});
 

module.exports = pool;