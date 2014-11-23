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

function validate_session(cookie, success, failure) {
    console.log("--------------SESSION VALIDATION--------------------");
    console.log(cookie);
    
    var user;
    if (cookie.username && cookie.sessionid)
        user = game.find_user(cookie.username);
    
    if (user && user.sessionid == cookie.sessionid)
        success(); //already in session
    else
        failure();  //no session
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
            db.find("usercollection", {"username": username}, function(userlist) {
                if (userlist[0] && userlist[0].password == password) {
                    var sessionid = uuid.v1();
                    var cookiearray = ["username=" + username+"; ","sessionid=" + sessionid+"; "];
                    game.load_party(db, userlist[0]._id, function(party) {
                        console.log(party);
                        game.add_user(username, sessionid, party);
                        redirect(res, 'http://' + req.headers.host + '/client', cookiearray);
                        
                        //db.update("usercollection", {"username":username}, {"$set": {"partyid": party._id}}, function() {
                            
                        //});
                    });
                }
                else if (userlist[0] && userlist[0].password != password)
                    render(res, pages["login"].template, {"error":"Username/Password incorrect!"});
                else
                    game.create_user(db, username, password, function() {
                        var sessionid = uuid.v1();
                        var cookiearray = ["username=" + username+"; ","sessionid=" + sessionid+"; "];
                        game.add_user(username, sessionid, null);
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
                render(res, pages["login"].template, {"error":"Not logged in!"});
            });
            render(res, pages["logout"].template, "");
        };
        return { get: get, post: function() {} };
    };
    
    var client = function() {
        var get = function(query) {
            var fn;
            if (query && query.command == "adduser")
                fn = function() { console.log("ADDDDDDDDDDDDDUNNNNNNNNNNNIT"); };
            else
                fn = function() {
                    var user = game.get_user(cookie.username);
                    render(res, pages["client"].template, {"userdata": JSON.stringify(user, undefined, 2)});
                };
            validate_session(cookie, fn, function() {
                render(res, pages["login"].template, {"error":"Not logged in!"});
            });
        };
        var post = function(data) {
            
        };
        return { get: get, post: post };
    };
    
    var user = function() {
        var get = function(query) {
            
        };
        var post = function(data) {
            
        };
        return { get: get, post: post };
    };
    
    return {
        login: login,
        logout: logout,
        client: client
    };
}

function start_server() {
    if (pagesremaining > 0) return;

    http.createServer(function (req, res) {
        var uri = url.parse(req.url, true);
        var params = uri.pathname.split("/").filter(function(a) { if (a!='') return a; });
        var query = (uri.query.jsonData) ? JSON.parse(uri.query.jsonData) : {};
        var p = params[0];
        var page = (pages[p]) ? pages[p] : pages['login'];
        console.log(req.method + " ... " + p + " ... " +  page.route);
        
        var route = router(req, res);
        
        if (req.method == 'GET') {
            var get = route[page.route]()['get'];
            get(query);
        }
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function(data) {
                body += data;
                if (body.length > 1e6) req.connection.destroy();
            });
            req.on('end', function() {
                var data = qs.parse(body);
                route[page.route]()['post'](data);
            });
        }
    }).listen(1337, '127.0.0.1');
    console.log('Server running at http://127.0.0.1:1337/');
}

function load_page(route, keys, filename) {
    pagesremaining++;
    fs.readFile(path.join(PATH, '\\' + filename), {encoding: 'utf8', flag: 'r'}, function (err, data) {
        if (err) throw err;
        keys.forEach(function(key) {
            pages[key] = {
                filename: filename,
                template: data,
                route: route
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
    load_page("logout", ["logout"], "logout.jade");
}

Object.prototype.keys = function() { var arr = []; for (var key in this) arr.push(key); return arr; };
db.connect(load_server);
