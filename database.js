var MongoClient = require('mongodb').MongoClient,
Server = require('mongodb').Server;
//CollectionDriver = require('./collectionDriver').CollectionDriver;
var mc = new MongoClient(new Server('localHost', 27017));
var db;

var connect = function(callback) {
    mc.open(function(err, mc) {
        if (!mc) {
            console.log(err);
            process.exit(1);
        }
        db = mc.db("nodewar1");
        console.log("Connected to mongodb");
        callback();
    });
};

var find = function(collectionName, criteria, callback) {
    db.collection(collectionName, function(error, collection) {
        if (error) console.log(error, "Collection not found");
        else collection.find(criteria).toArray(function(error, data) {
            if (error) console.log(error, "Cannot convert data to array");
            callback(data);
        });
    });
};

var get_user = function(criteria, callback) {
    
};

module.exports = {
    connect: connect,
    find: find,
    get_user: get_user
};
