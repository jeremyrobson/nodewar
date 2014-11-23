var users = [];
var parties = [];
var units = [];
var items = [];

var Item = function(unitid) {
    this.unitid = unitid;
    this.name = Math.random();
    items.push(this);
};

var Unit = function(userid, partyid) {
    this.name = Math.random();
    this.equip = [];
    for (var i=0;i<6;i++) {
        var newitem = new Item();
        this.equip.push(newitem._id);
    }
    units.push({
        "userid": userid,
        "partyid": partyid,
        "equip": this.equip
    });
};

var add_unit = function(userid) {
    
};

var Party = function(data) {
    this.id = data._id;
    this.userid = data.userid;
    this.units = [];
    parties.push({
        "userid": data.userid,
        "units": this.units
    });
};

/*
Party.prototype.to_json = function() {
    return {
        "userid": this.userid
    };
};
*/

var load_units = function(db, party, callback) {
    db.find("unitcollection", {"partyid": this._id}, function(docs) {
        party.units = docs; //fix
        callback();
    });
};

var create_party = function(db, userid, callback) {
    db.add_data("partycollection", {"userid": userid}, function(docs) {
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
                callback(newparty);
            });
        }
        else {
            var party = new Party(docs[0]); //todo: choose from multiple parties?
            load_units(db, party, function() {
                callback(party);
            });
        }
    });
};

var create_user = function(db, username, password, callback) {
    db.add_data("usercollection", {"username":username, "password":password}, function() {
        callback();
    });
};

var add_user = function(username, sessionid, partyid) {
    users.push({"username":username, "sessionid": sessionid});
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

module.exports = {
    create_party: create_party,
    load_party: load_party,
    create_user: create_user,
    add_user: add_user,
    find_user: find_user,
    remove_user: remove_user,
    get_user: get_user,
    //get_party: get_party,
    users: users
};
