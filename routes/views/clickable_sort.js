exports = module.exports = function (req, res) {
    var dbConn = require('../db');
    var dbo = dbConn.getDb();
    var user_data;
    var mysort = "";
    var column_name, sort_type, send_contents = "";
    var action = req.query.action;
    if (action == "sortable")
    {
        column_name = req.query.column_name;
        sort_type = req.query.sort_type;

        if (sort_type == "asc")
        {
            console.log("Ascending...");
            dbo.collection("transaction").find({}, {"sort": [column_name, 'asc']}).toArray(function (err, result) {
                if (err)
                    throw err;
                result.forEach(function (index, res) {
                    send_contents += "<tr>" +
                            "<td>" + index.date + "</td>" +
                            "<td>" + index.platform + "</td>" +
                            "<td>" + index.currency + "</td>" +
                            "<td>" + index.page + "</td>" +
                            "</tr>";
                });
                res.send(send_contents);
            });
        }
        else if (sort_type == "desc")
        {
            console.log("Descending...");
            console.log(column_name);
            dbo.collection("transaction").find({}).sort(-column_name).toArray(function (err, result) {
                if (err)
                    throw err;
                result.forEach(function (index, res) {
                    console.log(result);
                    send_contents += "<tr>" +
                            "<td>" + index.date + "</td>" +
                            "<td>" + index.platform + "</td>" +
                            "<td>" + index.currency + "</td>" +
                            "<td>" + index.page + "</td>" +
                            "</tr>";
                });
                res.send(send_contents);
            });
        }
    }
}