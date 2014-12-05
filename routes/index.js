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
        app.game.push_message([req.user], "SYSTEM", "Welcome to nodewar1 chat.");
        var users = app.game.get_users();
        app.game.push_message(users, "SYSTEM", req.user.username + " entered the chat.");
        res.render("client", {userdata:JSON.stringify(req.user)});
    });
    
    function get_data(username, unitindex, itemindex) {
        var user = app.game.get_user(username);
        var unit = (user && user.party.unitlist[unitindex]) ? user.party.unitlist[unitindex] : null;
        var item = (unit && unit.equip[itemindex]) ? unit.equip[itemindex] : null;
        
        return {
            userdata: JSON.stringify(user),
            unitdata: JSON.stringify(unit),
            itemdata: JSON.stringify(item),
            unitindex: unitindex || -1,
            itemindex: itemindex || -1
        };
    }
    
    app.get(["/user/:user", "/user/:user/unit/:unit", "/user/:user/unit/:unit/item/:item"], function(req, res) {
        console.log(req.params, req.query);
        
        var data = get_data(req.params.user, req.params.unit, req.params.itemindex);
        
        if (req.params.itemindex) //better way to do this?
            res.render("equip", data);
        else if (req.params.unit)
            res.render("unit", data);
        else if (req.params.user)
            res.render("user", data);
        else
            res.send("There was an error parsing the url.");
    });
    
    app.get(["/ajax"], function(req, res) {
        var query = req.query;
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : 0; //todo: move to middleware 
        
        //chat
        if (ajaxdata && ajaxdata.header == "ping") {
            req.user.lastping = req.user.duration;
            var users = app.game.get_users();
            var usernames = users.map(function(a) {return a.username; });
            var battles = app.game.get_battles();
            var battlenames = battles.map(function(a) {return a.name; });
            var messagetext = app.game.pop_messages(req.user);
            res.send({"header":"update", "data":{"usernames": usernames, "battlenames":battlenames, "text":messagetext}});
        }
        else if (ajaxdata && ajaxdata.header == "createbattle") {
            app.game.create_battle(user, function(battle) {
                res.send({"header":"message", "data":battle});
            });
        }
        else if (ajaxdata && ajaxdata.header == "chattext") {
            console.log("GOT MESSAGE", ajaxdata.data);
            var users = app.game.get_users();
            app.game.push_message(users, req.user.username, ajaxdata.data);
            res.send({"header":"chattext", "data":"message sent"}); //finish request
        }
    
        //units
        else if (ajaxdata && ajaxdata.header == "addunit") {
            app.game.create_unit(req.user, function(newunit) {
                if (newunit) res.send({"header":"newunit", "data":newunit});
                else res.send({"header":"error", "data":"Cannot add more units."});
            });
        }
        else if (ajaxdata && ajaxdata.header == "getdata") {
            var data = get_data(req.user.username, ajaxdata.data.unitindex, ajaxdata.data.itemindex);
            res.send({"header":"data", "data":data});
        }
        else if (ajaxdata && ajaxdata.header == "removeunit") {
            console.log(ajaxdata.data);
            res.send(ajaxdata.data);
        }
        
        //items
        else if (ajaxdata && ajaxdata.header == "additem") {
            app.game.create_item(unit, function(newitem) {
                if (newitem) res.send({"header":"newitem", "data":newitem});
                else res.send({"header":"error", "data":"Cannot add more items."});
            }); 
        }
        else if (ajaxdata && ajaxdata.header == "dropitem") {
            app.game.get_party(req.user, function(party) {
                res.send(party);
            });
        }
        else if (ajaxdata && ajaxdata.header == "removeitem") {
            console.log(ajaxdata.data);
            res.send(ajaxdata.data);
        }
        else
            res.send({"header":"error", "data": "FUCK!"});
    });
};
