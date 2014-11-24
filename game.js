var users = [];
var parties = [];
var units = [];
var items = [];

var Item = function(doc) {
    this.name = doc.name;
    this.unitid = doc.unitid;
    items.push(this);
};

Item.prototype.to_json = function() {
    return {
        name: this.name,
        unitid: this.unitid
    };
};

var Unit = function(doc) {
    this.name = doc.name;
    this._id = doc._id;
    this.userid = doc.userid;
    this.partyid = doc.partyid;
    this.equip = [];
    for (var i=0;i<6;i++) {
        var newitem = new Item({"name":"DEFAULT ITEM","unitid":"blah"});
        this.equip.push(newitem); //todo
    }
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

var create_unit = function(db, user, callback) {
    console.log("-----------------CREATING UNIT----------------------");
    console.log(user);
    db.add_data("unitcollection", get_unit_template(user), function(docs) {
        var newunit = new Unit(docs[0]);
        callback(newunit);
    });
};

var Party = function(data, unitlist) {
    this._id = data._id;
    this.userid = data.userid;
    this.unitlist = unitlist;
    parties.push(this);
};

/*
Party.prototype.to_json = function() {
    return {
        "userid": this.userid
    };
};
*/

var load_units = function(db, userid, partyid, callback) {
    db.find("unitcollection", {"partyid": partyid}, function(docs) {
        var unitlist = docs.map(function(doc) { return new Unit(doc, userid, partyid); });
        callback(unitlist);
    });
};

var get_party_template = function(user) {
    return {
        "userid": user._id,
        "gp": 1000
    };
};

var create_party = function(db, userid, callback) {
    db.add_data("partycollection", get_party_template(userid), function(docs) {
        var newparty = new Party(docs[0]);
        parties.push(newparty);
        callback(newparty);
    });
};

var load_party = function(db, userid, callback) {
    db.find("partycollection", {"userid": userid}, function(docs) {
        if (docs.length == 0) { //party not found
            console.log("***CREATING NEW PARTY BECAUSE userid WAS NOT FOUND IN partycollection***");
            create_party(db, userid, function(newparty) {
                var party = new Party(docs[0], []);
                callback(party);
            });
        }
        else {
            var party = new Party(docs[0]);
            load_units(db, userid, docs[0]._id, function(unitlist) {
                var party = new Party(docs[0], unitlist);
                callback(party);
            });
        }
    });
};

var User = function(doc, party) {
    this.username = doc.username;
    this._id = doc._id;
    this.sessionid = "";
    this.party = party;
    users.push(this);
    console.log("-----------------CURRENT USERS----------------------");
    console.log(users);
};

var create_user = function(db, username, password, callback) {
    db.add_data("usercollection", {"username":username, "password":password}, function(docs) {
        var newuser = new User(docs[0]);
        callback(newuser);
    });
};

var find_user = function(username) {
    return users.filter(function(a) { return username == a.username; })[0];
};

var remove_user = function(username) {
    console.log("-------------------REMOVING USER---------------------");
    var index = users.map(function(a) { return a.username; }).indexOf(username);
    if (index >= 0) users.splice(index, 1);
    console.log(users);
};

var get_user = function(username) {
    return users.filter(function(a) { return a.username == username; })[0];
};

var validate_user = function(db, username, password, success, failure) {
    db.find("usercollection", {"username": username}, function(docs) {
        if (docs[0] && docs[0].password == password) {
            load_party(db, docs[0]._id, function(party) {
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

module.exports = {
    create_unit: create_unit,
    create_party: create_party,
    load_party: load_party,
    create_user: create_user,
    find_user: find_user,
    remove_user: remove_user,
    get_user: get_user,
    //get_party: get_party,
    validate_user: validate_user,
    users: users
};
