const { getSchoolYearById, getSchoolYears, addSchoolYear, updateSchoolYear } = require('./schoolyear.controller');
const router = require('express').Router();

router.post('/add', addSchoolYear);
router.get('/:id', getSchoolYearById);
router.get('/', getSchoolYears);
router.put('/update', updateSchoolYear);

module.exports = router;