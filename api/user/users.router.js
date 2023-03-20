const { createUser, getUserByUserId, getUsers} = require('./users.controller');
const router = require('express').Router();

router.post('/register', createUser);
router.get('/:id', getUserByUserId);
router.get('/', getUsers);
// router.put('/update', updateUser);
// router.delete('/delete', deleteUser);
// router.post('/login', login);
// router.put('/update/password', updateUserPassword);

module.exports = router;