var users = [];
var parties = [];
var units = [];
var items = [];

var Item = function() {
    this._id = Math.random();
    this.name = Math.random();
    items.push(this);
};

var Unit = function() {
    this._id = Math.random();
    this.name = Math.random();
    this.equip = [];
    for (var i=0;i<6;i++) {
        var newitem = new Item();
        this.equip.push(newitem._id);
    }
    units.push({
        "_id": this._id,
        "equip": this.equip
    });
};

var Party = function() {
    this.units = [];
    for (var i=0;i<5;i++) {
        var newunit = new Unit();
        this.units.push(newunit._id);
    }
    parties.push({
        "units": this.units
    });
};


var create_party = function(db, callback) {
    var newparty = new Party();
    db.add_data("partycollection", newparty, function(docs) {
        newparty._id = docs[0]._id;
        parties.push(newparty);
        callback(newparty);
    });
};

var load_party = function(db, partyid, callback) {
    if (!partyid) { //user has no partyid
        console.log("***CREATING NEW PARTY BECAUSE PARTYID WAS UNDEFINED***");
        create_party(db, function(newparty) {
            callback(newparty);
        });
    }
    else
        db.find("partycollection", {"_id": partyid}, function(data) {
            if (data.length == 0) { //partyid not found
                console.log("***CREATING NEW PARTY BECAUSE PARTYID WAS NOT FOUND IN DB***");
                create_party(db, function(newparty) {
                    callback(newparty);
                });
            }
            else
                callback(data[0]); //partyid found
        });
};

var add_user = function(username, sessionid, partyid) {
    users.push({"username":username, "sessionid": sessionid, "partyid": partyid});
    console.log("-------------------CURRENT USERS------------------------");
    console.log(users);
};

var find_user = function(username) {
    return users.filter(function(a) { return username == a.username; })[0];
};

var remove_user = function(username) {
    console.log("--------------------REMOVING USER-----------------------");
    var index = users.map(function(a) { return a.username; }).indexOf(username);
    if (index >= 0) users.splice(index, 1);
    console.log(users);
};

var get_user = function(username) {
    return users.filter(function(a) { return a.username == username; })[0];
};

var add_party = function(party) {
    parties.push(party);
};

var get_party = function(partyid) {
    return parties.filter(function(a) { return a._id == partyid; })[0];
};

module.exports = {
    create_party: create_party,
    load_party: load_party,
    add_user: add_user,
    find_user: find_user,
    remove_user: remove_user,
    get_user: get_user,
    add_party: add_party,
    get_party: get_party,
    users: users
};
