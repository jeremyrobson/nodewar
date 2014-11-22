var users = [];
var parties = [];
var units = [];
var items = [];

var Item = function() {
    this.id = Math.random();
    this.name = Math.random();
    items.push(this);
};

var Unit = function() {
    this.id = Math.random();
    this.name = Math.random();
    this.equip = [];
    for (var i=0;i<6;i++) {
        var newitem = new Item();
        this.equip.push(newitem.id);
    }
    units.push({
        "id": this.id,
        "equip": this.equip
    });
};

var Party = function() {
    this.id = Math.random();
    this.units = [];
    for (var i=0;i<5;i++) {
        var newunit = new Unit();
        this.units.push(newunit.id);
    }
    parties.push({
        "id": this.id,
        "units": this.units
    });
};


var create_party = function() {
    var newparty = new Party();

    return newparty;
};

var add_user = function(username, sessionid, partyid) {
    users.push({"username":username, "sessionid": sessionid, "partyid": partyid});
}

var find_user = function(username) {
    return users.filter(function(a) { return username == a.username; })[0];
}

var remove_user = function(username) {
    console.log("--------------------removing user------------------");
    var index = users.map(function(a) { return a.username; }).indexOf(username);
    if (index >= 0) users.splice(index, 1);
    console.log(users);
}

module.exports = {
    create_party: create_party,
    add_user: add_user,
    find_user: find_user,
    remove_user: remove_user,
    users: users
};
