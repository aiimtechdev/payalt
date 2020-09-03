exports = module.exports = function (req, res, next) {
    var code = req.query.code;
    res.render('coinbase_oauth',{code: code});
}