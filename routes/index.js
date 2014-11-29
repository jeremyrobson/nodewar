exports.init = function(app) {

    var validate_session = function(cookie, success, failure) {
        console.log("--------------SESSION VALIDATION--------------------");
        console.log(cookie);
        
        var user;
        if (cookie.username && cookie.sessionid)
            user = app.game.get_user(cookie.username);
        
        if (user && user.sessionid == cookie.sessionid) success(user); //already in session
        else failure();  //no session
    };

    app.get(["/", "/index", "/login"], function(req, res) {       
        validate_session(req.cookies, function(user) {
            res.redirect("/client");
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
        validate_session(req.cookies, function(user) {
            console.log(user.username + " is logging out");
            app.game.remove_user(user.username);
            res.render("logout", "");
        }, function() {
            res.render("login", {"header":"error", "data":"Not logged in!"});
        });
    });
    
    app.get("/client", function(req, res) {
        var query = req.query;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;
        
        if (ajaxdata && ajaxdata.header == "getusers") {
            success = function(user) {
                app.game.get_users(function(users) {
                    res.send({"header":"users", "data":users});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "chattext") {
            success = function(user) {
                console.log("GOT MESSAGE", ajaxdata.data);
                app.game.push_message(user.username, ajaxdata.data);
                res.send({"header":"chattext", "data":"success"}); //finish request
            };
        }
        else if (ajaxdata && ajaxdata.header == "getmessages") {
            success = function(user) {
                console.log("USER REQUESTED MESSAGES");
                app.game.pop_messages(user, function(text) {
                    console.log("SENDING MESSAGE", text);
                    res.send({"header":"chattext", "data":text});
                });
            };
        }
        else //if no ajaxdata, send userdata
            success = function(user) {
                app.game.push_message("SYSTEM", "Welcome to nodewar1 chat.");
                res.render("client", {userdata:JSON.stringify(user)});
            };
        
        validate_session(req.cookies, success, function() {
            res.render("login", {"header":"error", "data":"Not logged in!"});
        });
    });
    
    app.get("/user", function(req, res) {
        var query = req.query;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;

        if (ajaxdata && ajaxdata.header == "addunit") {
            success = function(user) {
                app.game.create_unit(user, function(newunit) {
                    if (newunit) res.send({"header":"newunit", "data":newunit});
                    else res.send({"header":"error", "data":"Cannot add more units."});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "getparty") {
            success = function(user) {
                app.game.get_party(user, function(party) {
                    res.send({"header":"party", "data":party});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "removeunit") {
            console.log(ajaxdata.data);
            success = function(user) {
                res.send(ajaxdata.data);
            };
        }
        else //if no ajaxdata, send userdata
            success = function(user) {
                res.render("user", {userdata:JSON.stringify(user)});
            };

        validate_session(req.cookies, success, function() {
            res.render("login", {"header":"error", "data":"Your session has expired!"});
        });
    });
    
    app.get("/equip", function(req, res) {
        var query = req.query;
        var index = query.unitindex;
        
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;
        if (ajaxdata && ajaxdata.header == "additem") {
            success = function(user) {
                var unit = (user) ? user.party.unitlist[index] : null;
                app.game.create_item(unit, function(newitem) {
                    if (newitem) res.send({"header":"newitem", "data":newitem});
                    else res.send({"header":"error", "data":"Cannot add more items."});
                }); 
            };
        }
        else if (ajaxdata && ajaxdata.header == "getitems") {
            success = function(user) {
                var unit = (user) ? user.party.unitlist[index] : null;
                app.game.get_items(unit, function(itemlist) {
                    res.send({"header":"itemlist", "data":itemlist});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "dropitem") {
            success = function(user) {
                app.game.get_party(user, function(party) {
                    res.send(party);
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "removeitem") {
            console.log(ajaxdata.data);
            success = function(user) {
                res.send(ajaxdata.data);
            };
        }
        else //if no ajaxdata, send unitdata and unitindex
            success = function(user) {
                var unit = (user) ? user.party.unitlist[index] : null;
                res.render("equip", {unitdata: JSON.stringify(unit), unitindex: index});
            };
        validate_session(cookie, success, function() {
            res.render("login", {"header":"error", "data":"Your session has expired!"});
        });
    });
};
