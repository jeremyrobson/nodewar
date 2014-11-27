var http = require('http'),
fs = require('fs'),
qs = require('querystring'),
url = require('url'),
path = require('path'),
jade = require('jade'),
cp = require('cookie'),
uuid = require('node-uuid'),
game = require('./game'),
db = require('./database');

var PATH = process.cwd();
var pagesremaining = 0;
var pages = {};

function render(res, template, locals) {
    //todo: prevent locals from containing escaping chars
    res.writeHead(200, {'Context-Type': 'text/html'});
    res.write(jade.render(template, locals));
    res.end();
}

function redirect(res, address, cookiearray) {
    var headers = [];
    var expiration = " Expires=" + new Date(new Date().getTime()+2*60*1000).toUTCString() + ";"
    cookiearray.forEach(function(c) {
        headers.push(['Set-Cookie', c + expiration]);
    });
    headers.push(['Location',address]);
    res.writeHead(301, headers);
    res.end();
}

function respond(res, data) { //responding to ajax gets
    res.writeHead(200, {"Content-Type": "text/json"}); //, "Access-Control-Allow-Origin": "*"});
    console.log("HERE IS WHAT IM SENDING!!!", data);
    res.end(JSON.stringify(data));
}

function validate_session(cookie, success, failure) {
    console.log("--------------SESSION VALIDATION--------------------");
    console.log(cookie);
    
    var user;
    if (cookie.username && cookie.sessionid)
        user = game.find_user(cookie.username);
    
    if (user && user.sessionid == cookie.sessionid) success(); //already in session
    else failure();  //no session
}

function router(req, res) {
    var cookie = (req.headers.cookie) ? cp.parse(req.headers.cookie) : "";
    var login = function() {
        var get = function(query) {
            validate_session(cookie, function() {
                redirect(res, 'http://' + req.headers.host + '/client', []);
            }, function() {
                render(res, pages["login"].template, "");
            });
        };
        var post = function(data) {
            var username = data.usernameinput;
            var password  = data.passwordinput;
            game.validate_user(db, username, password, function(user) { //user found
                user.sessionid = uuid.v1();
                var cookiearray = ["username=" + username+"; ","sessionid=" + user.sessionid+"; "];
                redirect(res, 'http://' + req.headers.host + '/client', cookiearray);
            },
            function(errorcode) {
                if (errorcode == 401) //password incorrect
                    render(res, pages["login"].template, {"error":"Username/Password incorrect!"});
                else if (errorcode == 400) //user does not exist
                    game.create_user(db, username, password, function(user) {
                        user.sessionid = uuid.v1();
                        var cookiearray = ["username=" + username+"; ","sessionid=" + user.sessionid+"; "];
                        redirect(res, 'http://' + req.headers.host + '/client', cookiearray);
                    });
            });
        };
        return { get: get, post: post };
    };
    
    var logout = function() {
        var get = function(query) {
            validate_session(cookie, function() {
                console.log(cookie.username + " is logging out");
                game.remove_user(cookie.username);
            }, function() {
                render(res, pages["login"].template, {"header":"error", "data":"Not logged in!"});
            });
            render(res, pages["logout"].template, "");
        };
        return { get: get, post: function() {} };
    };
    
    var client = function() {
        var get = function(query, ajaxdata) {
            var user = game.get_user(cookie.username);
            var success;
            if (ajaxdata && ajaxdata.header == "addunit") {
                success = function() {
                    game.create_unit(db, user, function(newunit) {
                        if (newunit) respond(res, {"header":"newunit", "data":newunit});
                        else respond(res, {"header":"error", "data":"Cannot add more units."});
                    });
                };
            }
            else if (ajaxdata && ajaxdata.header == "getparty") {
                success = function() {
                    game.get_party(user, function(party) {
                        respond(res, {"header":"party", "data":party});
                    });
                };
            }
            else if (ajaxdata && ajaxdata.header == "removeunit") {
                console.log(ajaxdata.data);
                success = function() {
                    respond(res, ajaxdata.data);
                };
            }
            else //if no ajaxdata, send userdata
                success = function() {
                    render(res, pages["client"].template, {userdata: JSON.stringify(user)});
                };
            validate_session(cookie, success, function() {
                render(res, pages["login"].template, {"header":"error", "data":"Your session has expired!"});
            });
        };
        var post = function(data) {
            
        };
        return { get: get, post: post };
    };
    
    var equip = function() {
        var get = function(query, ajaxdata) {
            var user = game.get_user(cookie.username);
            var index = query.unitindex;
            var unit = (user) ? user.party.unitlist[index] : null;
            var success;
            if (ajaxdata && ajaxdata.header == "additem") {
                success = function() {
                    game.create_item(db, unit, function(newitem) {
                        if (newitem) respond(res, {"header":"newitem", "data":newitem});
                        else respond(res, {"header":"error", "data":"Cannot add more items."});
                    }); 
                };
            }
            else if (ajaxdata && ajaxdata.header == "getitems") {
                success = function() {
                    game.get_items(unit, function(itemlist) {
                        respond(res, {"header":"itemlist", "data":itemlist});
                    });
                };
            }
            else if (ajaxdata && ajaxdata.header == "dropitem") {
                success = function() {
                    game.get_party(user, function(party) {
                        respond(res, party);
                    });
                };
            }
            else if (ajaxdata && ajaxdata.header == "removeitem") {
                console.log(ajaxdata.data);
                success = function() {
                    respond(res, ajaxdata.data);
                };
            }
            else //if no ajaxdata, send unitdata and unitindex
                success = function() {
                    render(res, pages["equip"].template, {unitdata: JSON.stringify(unit), unitindex: index});
                };
            validate_session(cookie, success, function() {
                render(res, pages["login"].template, {"header":"error", "data":"Your session has expired!"});
            });
        };
        var post = function(data) {
            
        };
        return { get: get, post: post };
    };
    
    return {
        login: login,
        logout: logout,
        client: client,
        equip: equip
    };
}

function start_server() {
    if (pagesremaining > 0) return;

    http.createServer(function (req, res) {
        var uri = url.parse(req.url, true);
        var params = uri.pathname.split("/").filter(function(a) { if (a!='') return a; });
        var query = uri.query; //ajax jsondata becomes part of GET query!
        var ajaxdata = (query.jsonData) ? JSON.parse(query.jsonData) : "";
        var p = params[0];
        var page = (pages[p]) ? pages[p] : pages['login'];
        var route = router(req, res);
        
        if (req.method == 'GET') {
            var get = route[page.pathname]()['get'];
            get(query, ajaxdata);
        }
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function(data) {
                body += data;
                if (body.length > 1e6) req.connection.destroy();
            });
            req.on('end', function() {
                var data = qs.parse(body);
                route[page.pathname]()['post'](data);
            });
        }
    }).listen(1337, '127.0.0.1');
    console.log('Server running at http://127.0.0.1:1337/');
}

function load_page(pathname, keys, filename) {
    pagesremaining++;
    fs.readFile(path.join(PATH, '\\' + filename), {encoding: 'utf8', flag: 'r'}, function (err, data) {
        if (err) throw err;
        keys.forEach(function(key) {
            pages[key] = {
                filename: filename,
                template: data,
                pathname: pathname
            };
        });
        pagesremaining--;
        start_server();
    });
}

function load_server() {
    load_page("login", ["login"], "login.jade");
    load_page("error", ["error"], "error.html");
    load_page("client", ["client"], "client.jade");
    load_page("equip", ["equip"], "equip.jade");
    load_page("logout", ["logout"], "logout.jade");
}

Object.prototype.keys = function() { var arr = []; for (var key in this) arr.push(key); return arr; };
db.connect(load_server);
