var express = require('express'),
path = require('path'),
cookieParser = require('cookie-parser'),
bodyParser = require('body-parser'),
routes = require('./routes'),
game = require('./game');

var app = express();

var server;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.game = game; //not sure if this is best practice...

function start_server() {
    routes.init(app); //does this call init() for all js files in ./routes folder?
    var server = app.listen(1337, function() {
        console.log('Server running at http://127.0.0.1:1337/');
    });
}

game.init(start_server);
