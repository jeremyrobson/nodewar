exports.init = function(app, express) {
    var router = express.Router();

    //must go before middleware
    app.post(["/", "/index", "/login"], function(req, res) {
        var username = req.body.usernameinput;
        var password  = req.body.passwordinput;
        app.game.validate_user(username, password, function(user) { //user found
            res.cookie("username", username);
            res.cookie("sessionid", user.sessionid);
            res.redirect("/client");
        },
        function(errorcode) {
            if (errorcode == 401) //password incorrect
                res.render("login", {"error":"Username/Password incorrect!"});
            else if (errorcode == 400) //user does not exist
                app.game.create_user(username, password, function(user) {
                    res.cookie("username", username);
                    res.cookie("sessionid", user.sessionid);
                    res.redirect("/client");
                });
        });
    });
    
     //routing middleware for user/session verification
    app.use(function(req, res, next) {
        if (req.cookies.username && req.cookies.sessionid)
            req.user = app.game.get_user(req.cookies.username);
        
        if (!req.user)
            res.render("login", {});
        else if (req.user.sessionid != req.cookies.sessionid)
            res.render("login", {"error":"Your session has expired!"});
        else
            next(); //already in session
    });

    app.get(["/", "/index", "/login"], function(req, res) {
        res.redirect("client");
    });
    
    app.get("/logout", function(req, res) {
        console.log(req.user.username + " is logging out.");
        app.game.remove_user(req.user.username);
        res.render("logout", "");
    });
    
    app.get("/client", function(req, res) {
        var query = req.query;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0;
        var success;
        
        if (ajaxdata && ajaxdata.header == "ping") {
            success = function(user) {
                user.lastping = user.duration;
                var users = app.game.get_users();
                var usernames = users.map(function(a) {return a.username; });
                var battles = app.game.get_battles();
                var battlenames = battles.map(function(a) {return a.name; });
                var messagetext = app.game.pop_messages(user);
                res.send({"header":"update", "data":{"usernames": usernames, "battlenames":battlenames, "text":messagetext}});
            };
        }
        else if (ajaxdata && ajaxdata.header == "createbattle") {
            success = function(user) {
                app.game.create_battle(user, function(battle) {
                    res.send({"header":"message", "data":battle});
                });
            };
        }
        else if (ajaxdata && ajaxdata.header == "chattext") {
            success = function(user) {
                console.log("GOT MESSAGE", ajaxdata.data);
                var users = app.game.get_users();
                app.game.push_message(users, user.username, ajaxdata.data);
                res.send({"header":"chattext", "data":"message sent"}); //finish request
            };
        }
        else
            success = function(user) {
                app.game.push_message([user], "SYSTEM", "Welcome to nodewar1 chat.");
                var users = app.game.get_users();
                app.game.push_message(users, "SYSTEM", user.username + " entered the chat.");
                res.render("client", {userdata:JSON.stringify(user)});
            };
        
        success(req.user);
    });
    
    app.get(["/user/:user", "/user/:user/unit/:unit", "/user/:user/unit/:unit/item/:item"], function(req, res) {
        console.log(req.params, req.query);
        var user = app.game.get_user(req.params.user);
        console.log(req.params.user, parseInt(req.params.unit), parseInt(req.params.item));
        var unit = (user && typeof parseInt(req.params.unit) == "number") ? user.party.unitlist[req.params.unit] : null;
        var item = (unit && typeof parseInt(req.params.item) == "number") ? unit.equip[req.params.item] : null;
        
        if (req.params.item)
            res.send(JSON.stringify(item));
        else if (req.params.unit)
            res.send(JSON.stringify(unit));
        else if (req.params.user)
            res.send(JSON.stringify(user));
    });
    
    app.get("/user", function(req, res) {
        console.log("PARAMETERS!!!! ", req.params);
        console.log("WHATTTT PART 2!!!", req.what);
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

        success();
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
                res.send({"header":"itemlist", "data":unit.equip});
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
        
        success();
    });
};
