var express = require('express'),
path = require('path'),
cookieParser = require('cookie-parser'),
bodyParser = require('body-parser'),
routes = require('./routes'),
game = require('./game');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.game = game; //not sure if this is best practice...

var server, interval;

//use fs to load unit/item templates

function start_server() {
    routes.init(app, express);
    var server = app.listen(1337, function() {
        //interval = setInterval(app.game.loop, 1000);
        console.log('Server running at http://127.0.0.1:1337/');
    });
}

game.init(start_server);
