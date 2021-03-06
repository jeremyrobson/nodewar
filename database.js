var MongoClient = require('mongodb').MongoClient,
Server = require('mongodb').Server;
//CollectionDriver = require('./collectionDriver').CollectionDriver;
var mc = new MongoClient(new Server('localHost', 27017));
var db;

var connect = function(callback) {
    mc.open(function(err, mc) {
        if (!mc) {
            process.exit(1); //remove this line if callback is to continue with starting server
            console.log(err);
        }
        else {
            db = mc.db("nodewar1");
            console.log("Connected to mongodb");
        }
        callback(err);
    });
};

var find = function(collectionName, query, callback) {
    db.collection(collectionName, function(error, collection) {
        if (error) console.log(error, "Collection " + collectionName + " not found");
        else collection.find(query).toArray(function(error, data) {
            if (error) console.log(error, "Cannot convert data to array");
            else callback(data);
        });
    });
};

var add_data = function(collectionName, data, callback) {
    //db.createCollection(collectionName, function(error, collection) { });
    db.collection(collectionName, function(error, collection) {
        if (error) console.log(error, "Collection " + collectionName + " not found");
        else collection.insert([data], function(error, docs) {
            if (error) console.log(error, "Cannot insert data into collection");
            else callback(docs);
        });
    });
};

//db.update("usercollection", {"username":username}, {"$set": {"partyid": party._id}}, function() {
    
//});

var update = function(collectionName, query, data, callback) {
    db.collection(collectionName, function(error, collection) {
        if (error) console.log(error, "Collection " + collectionName + " not found");
        else collection.update(query, data, function(error, docs) {
            if (error) console.log(error, "Cannot update collection");
            else callback();
        });
    });
};

module.exports = {
    connect: connect,
    add_data: add_data,
    find: find,
    update: update
};
