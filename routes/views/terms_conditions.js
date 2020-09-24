exports = module.exports = function (req, res) {
	res.locals.raw = req.query.raw;
    res.render('terms_conditions');
}