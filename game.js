var db = require("./database"),
uuid = require('node-uuid');

var users = [];
var parties = [];
var units = [];
var items = [];

var Item = function(doc) {
    this.name = doc.name;
    this._id = doc._id;
    this.unitid = doc.unitid;
    items.push(this);
};

Item.prototype.to_json = function() {
    return {
        name: this.name,
        unitid: this.unitid
    };
};

var get_item_template = function(unit) {
    return {
        "name": "DEFAULT ITEM",
        "unitid": unit._id
    };
};

exports.create_item = function(unit, callback) {
    if (unit.equip.length < 10) {
        console.log("-----------------CREATING ITEM----------------------");
        console.log("UNIT", unit);
        db.add_data("itemcollection", get_item_template(unit), function(docs) {
            var newitem = new Item(docs[0]);
            unit.equip.push(newitem);
            callback(newitem);
        });
    }
    else //reached maximum items
        callback(false);
};

var load_items = function(unitids, callback) {
    db.find("itemcollection", {"unitid": {"$in": unitids}}, function(itemdocs) {
        var itemlist = itemdocs.map(function(doc) { return new Item(doc); });
        callback(itemlist);
    });
};

exports.get_items = function(unit, callback) {
    callback(unit.equip);
};

var Unit = function(doc, userid, partyid, itemlist) {
    this.name = doc.name;
    this._id = doc._id;
    this.userid = userid || doc.userid;
    this.partyid = partyid || doc.partyid;
    this.equip = itemlist || [];
    units.push(this);
};

Unit.prototype.to_json = function() {
    return {
        name: this.name,
        userid: this.userid,
        partyid: this.partyid
    };
};

var get_unit_template = function(user) {
    return {
        "name": "DEFAULT UNIT",
        "userid": user._id,
        "partyid": user.party._id
    };
};

exports.create_unit = function(user, callback) {
    if (user.party.unitlist.length < 5) {
        console.log("-----------------CREATING UNIT----------------------");
        console.log("USER", user);
        db.add_data("unitcollection", get_unit_template(user), function(docs) {
            var newunit = new Unit(docs[0]);
            user.party.unitlist.push(newunit);
            callback(newunit);
        });
    }
    else //reached maximum users
        callback(false);
};

var Party = function(data, unitlist) {
    this._id = data._id;
    this.userid = data.userid;
    this.unitlist = unitlist;
    parties.push(this);
};

Party.prototype.to_json = function() {
    return {
        "userid": this.userid
    };
};

var load_units = function(userid, partyid, callback) {
    db.find("unitcollection", {"partyid": partyid}, function(unitdocs) {
        var unitids = unitdocs.map(function(a) { return a._id; }); //get list of unitids
        load_items(unitids, function(itemlist) { //query itemcollection for ALL unitids
            unitdocs.forEach(function(a) { //sort items into respective units
                a.equip = itemlist.filter(function(b) {
                    return a._id == b.unitid;
                })
            });
            var unitlist = unitdocs.map(function(doc) { return new Unit(doc, userid, partyid, itemlist); });
            callback(unitlist);
        });
    });
};

var get_party_template = function(user) {
    return {
        "userid": user._id,
        "gp": 1000
    };
};

exports.create_party = function(userid, callback) {
    db.add_data("partycollection", get_party_template(userid), function(docs) {
        var newparty = new Party(docs[0]);
        parties.push(newparty);
        callback(newparty);
    });
};

var load_party = function(userid, callback) {
    db.find("partycollection", {"userid": userid}, function(partydocs) {
        if (partydocs.length == 0) { //party not found
            console.log("***CREATING NEW PARTY BECAUSE userid WAS NOT FOUND IN partycollection***");
            create_party(userid, function(newparty) {
                var party = new Party(partydocs[0], []);
                callback(party);
            });
        }
        else {
            var party = new Party(partydocs[0]);
            load_units(userid, partydocs[0]._id, function(unitlist) {
                var party = new Party(partydocs[0], unitlist);
                callback(party);
            });
        }
    });
};

exports.get_party = function(user, callback) {
    callback(user.party);
};

var User = function(doc, party) {
    this.username = doc.username;
    this._id = doc._id;
    this.sessionid = sessionid = uuid.v1();
    this.party = party;
    this.messages = [];
    users.push(this);
    console.log("-----------------CURRENT USERS----------------------");
    console.log(users);
};

exports.create_user = function(username, password, callback) {
    db.add_data("usercollection", {"username":username, "password":password}, function(docs) {
        var newuser = new User(docs[0]);
        callback(newuser);
    });
};

exports.remove_user = function(username) {
    console.log("-------------------REMOVING USER---------------------");
    var index = users.map(function(a) { return a.username; }).indexOf(username);
    if (index >= 0) users.splice(index, 1);
    console.log(users);
};

exports.get_user = function(username) {
    return users.filter(function(a) { return a.username == username; })[0];
};

exports.validate_user = function(username, password, success, failure) {
    db.find("usercollection", {"username": username}, function(docs) {
        if (docs[0] && docs[0].password == password) {
            load_party(docs[0]._id, function(party) {
                var user = new User(docs[0], party);
                success(user);   
            });
        }
        else if (docs[0] && docs[0].password != password)
            failure(401);
        else
            failure(400);
    });
};

exports.get_users = function(callback) {
    callback(users.map(function(a) { return a.username; }));
};

exports.push_message = function(name, message) {
    users.forEach(function(user) {
        user.messages.push(name+": "+message+"\n\r");
    });
};

exports.pop_messages = function(user, callback) {
    var text = user.messages.join("");
    user.messages = [];
    callback(text);
};

exports.init = function(callback) {
    db.connect(function() {
        callback();
    });
};
