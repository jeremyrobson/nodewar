var db = require("./database"),
uuid = require('node-uuid');

var battles = [];
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
    db.find("itemcollection", {"unitid": {"$in": unitids}}, function(docs) {
        var itemlist = docs.map(function(doc) { return new Item(doc); });
        callback(itemlist);
    });
};

var Unit = function(doc, userid, partyid) {
    this.name = doc.name;
    this._id = doc._id;
    this.userid = userid || doc.userid;
    this.partyid = partyid || doc.partyid;
    this.equip = doc.equip || [];
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

var Party = function(doc, unitlist) {
    this._id = doc._id;
    this.userid = doc.userid;
    this.unitlist = unitlist;
    parties.push(this);
};

Party.prototype.to_json = function() {
    return {
        "userid": this.userid
    };
};

var load_units = function(userid, partyid, callback) {
    db.find("unitcollection", {"partyid": partyid}, function(docs) {
        var unitlist = [];
        var unitids = docs.map(function(a) { return a._id; }); //get list of all unitids with partyid
        load_items(unitids, function(itemlist) { //query itemcollection for ALL unitids
            docs.forEach(function(doc) { //sort items into respective units
                doc.equip = itemlist.filter(function(item) {
                    return doc._id.equals(item.unitid); //match unit._id and item.unitid
                });
                unitlist.push(new Unit(doc, userid, partyid));
            });
            callback(unitlist);
        });
    });
};

var get_party_template = function(userid) {
    return {
        "userid": userid,
        "gp": 1000
    };
};

var create_party = function(userid, callback) {
    console.log("***CREATING NEW PARTY BECAUSE userid WAS NOT FOUND IN partycollection***");
    db.add_data("partycollection", get_party_template(userid), function(docs) {
        var newparty = new Party(docs[0], []);
        parties.push(newparty);
        callback(newparty);
    });
};

var load_party = function(userid, callback) {
    db.find("partycollection", {"userid": userid}, function(docs) {
        if (docs.length == 0) { //party not found
            create_party(userid, function(newparty) {
                var party = new Party(docs[0], []);
                callback(party);
            });
        }
        else {
            load_units(userid, docs[0]._id, function(unitlist) {
                var party = new Party(docs[0], unitlist);
                callback(party);
            });
        }
    });
};

var User = function(doc, party) {
    this.username = doc.username;
    this._id = doc._id;
    this.sessionid = uuid.v1();
    this.party = party;
    this.messages = [];
    this.duration = 0;
    this.lastping = 0;
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
    console.log("Current users: ", users);
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
            failure(401); //password incorrect
        else
            failure(400); //user does not exist
    });
};

exports.get_users = function() {
    return users;
};

var Battle = function(user) {
    this._id = uuid.v1();
    this.userid = user._id;
    this.name = user.username + this._id;
    user.battle = this;
};

exports.create_battle = function(user, callback) {
    var battle = new Battle(user);
    callback(battle);
};

exports.get_battles = function() {
    return battles;
};

exports.push_message = function(userlist, name, message) {
    userlist.forEach(function(user) {
        user.messages.push(name+": "+message+"\n\r");
    });
};

exports.pop_messages = function(user) {
    var text = user.messages.join("");
    user.messages = [];
    return text;
};

exports.init = function(callback) {
    db.connect(function() {
        callback();
    });
};

exports.loop = function() {
    users.forEach(function(a) {
        a.duration++;
        if (a.duration > a.lastping + 20) {
            exports.push_message(users, "SYSTEM", a.username + " has timed out and been disconnected.");
            exports.remove_user(a.username);
        }
    });
};
