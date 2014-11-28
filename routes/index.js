exports.init = function(app) {

    app.get(["/", "/index", "/login"], function(req, res) {
        var cookie = req.cookies;
        app.validate_session(cookie, function() {
            res.redirect("http://" + req.headers.host + "/client", []);
        }, function() {
            res.render("login", {});
        });
        
    });

    app.post(["/", "/index", "/login"], function(req, res) {
        var username = req.body.usernameinput;
        var password  = req.body.passwordinput;
        app.game.validate_user(username, password, function(user) { //user found
            res.cookie("username", username);
            res.cookie("sessionid", user.sessionid);
            res.redirect("http://" + req.headers.host + "/client");
        },
        function(errorcode) {
            if (errorcode == 401) //password incorrect
                render(res, pages["login"].template, {"error":"Username/Password incorrect!"});
            else if (errorcode == 400) //user does not exist
                app.game.create_user(username, password, function(user) {
                    res.cookie("username", username);
                    res.cookie("sessionid", user.sessionid);
                    res.redirect("http://" + req.headers.host + "/client");
                });
        });
    });
    
    app.get("/logout", function(req, res) {
        var cookie = req.cookies;
        app.validate_session(cookie, function() {
            console.log(cookie.username + " is logging out");
            app.game.remove_user(cookie.username);
            res.render("logout", "");
        }, function() {
            res.render("login", {"header":"error", "data":"Not logged in!"});
        });
    });
    
    app.get("/client", function(req, res) {
        var cookie = req.cookies;
        var user = app.game.get_user(cookie.username);
        var query = req.query;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;

        if (ajaxdata && ajaxdata.header == "addunit") {
            success = function() {
                app.game.create_unit(user, function(newunit) {
                    if (newunit) res.send({"header":"newunit", "data":newunit});
                    else res.send({"header":"error", "data":"Cannot add more units."});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "getparty") {
            success = function() {
                app.game.get_party(user, function(party) {
                    res.send({"header":"party", "data":party});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "removeunit") {
            console.log(ajaxdata.data);
            success = function() {
                res.send(ajaxdata.data);
            };
        }
        else //if no ajaxdata, send userdata
            success = function() {
                res.render("client", {userdata:JSON.stringify(user)});
            };

        app.validate_session(cookie, success, function() {
            res.render("login", {"header":"error", "data":"Your session has expired!"});
        });
    });
    
    app.get("/equip", function(req, res) {
        var cookie = req.cookies;
        var user = app.game.get_user(cookie.username);
        var query = req.query;
        var index = query.unitindex;
        var unit = (user) ? user.party.unitlist[index] : null;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;
        
        if (ajaxdata && ajaxdata.header == "additem") {
            success = function() {
                app.game.create_item(unit, function(newitem) {
                    if (newitem) res.send({"header":"newitem", "data":newitem});
                    else res.send({"header":"error", "data":"Cannot add more items."});
                }); 
            };
        }
        else if (ajaxdata && ajaxdata.header == "getitems") {
            success = function() {
                app.game.get_items(unit, function(itemlist) {
                    res.send({"header":"itemlist", "data":itemlist});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "dropitem") {
            success = function() {
                app.game.get_party(user, function(party) {
                    res.send(party);
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "removeitem") {
            console.log(ajaxdata.data);
            success = function() {
                res.send(ajaxdata.data);
            };
        }
        else //if no ajaxdata, send unitdata and unitindex
            success = function() {
                res.render("equip", {unitdata: JSON.stringify(unit), unitindex: index});
            };
        app.validate_session(cookie, success, function() {
            res.render("login", {"header":"error", "data":"Your session has expired!"});
        });
    });
};
