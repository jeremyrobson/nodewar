var game;
Array.prototype.pop_random = function() { var r = Math.floor(Math.random() * this.length); return this.splice(r, 1)[0]; };
function rand(min, max) { return Math.floor(Math.random() * (max - min)) + min; }
var Item = function() {
    this._id = 0;
};
var Unit = function(color) {
    this._id = rand(100000,1000000);
    this.color = color;
    
    var stats = [4,5,6,7,8,9];
    
    this.hp = stats.pop_random() * 10;
    this.pwr = stats.pop_random();
    this.def = stats.pop_random();
    this.agl = stats.pop_random();
    this.mag = stats.pop_random();
    this.range = stats.pop_random();
    
    this.at = 0;
    this.equip = [
        new Item(),
        new Item(),
        new Item()
    ];
};
Unit.prototype.move = function(dest) {
    this.x = dest.x & 15;
    this.y = dest.y & 15;
};
var Party = function(color) {
    this._id = 0;
    this.units = [
        //new Unit(color),
        //new Unit(color),
        //new Unit(color),
        //new Unit(color),
        new Unit(color)
    ];
};
var User = function(username) {
    this._id = 0;
    this.username = username;
    this.color = "rgb(" + rand(0,256) + "," + rand(50,256) + "," + rand(50,256) + ")";
    this.party = new Party(this.color);
};
var Battle = function(user1, user2) {
    var self = this;
    
    this.history = [];
    this.tile = [];
    for (var x=0;x<16;x++) {
        this.tile[x] = [];
        for (var y=0;y<16;y++) {
            this.tile[x][y] = {
                "type": "grass",
                "unit": null
            };
        }
    }
    
    this.units = user1.party.units.concat(user2.party.units);
    var positionlist = [];
    for (var x=0; x<16; x++) {
        for (var y=0; y<16; y++) {
            positionlist.push({"x":x,"y":y});
        }
    }
    this.units.forEach(function(unit) {
        var r = rand(0, positionlist.length);
        var p = positionlist.splice(r, 1)[0];
        unit.x = p.x;
        unit.y = p.y;
        self.tile[unit.x][unit.y].unit = unit;
    });
};
Battle.prototype.move_unit = function(unit, dest) {
    this.tile[unit.x][unit.y].unit = null;
    unit.move(dest);
    this.history.push({"type":"move","actor":unit,"dest":dest});
    this.tile[unit.x][unit.y].unit = unit;
};
Battle.prototype.get_move = function(p, q) {
    var move = {"x":p.x,"y":p.y};
    var angle = Math.atan2(q.x-p.x,q.y-p.y);
    try {
        while (this.tile[move.x][move.y].unit) {
            var dx = Math.round(Math.sin(angle));
            var dy = Math.round(Math.cos(angle));
            move.x += dx;
            if (dx == 0) move.y += dy;
        }
    } catch(e) {
        console.log(e);
        console.log(move.x, move.y);
    }
    return move;
};
Battle.prototype.get_target = function(unit, enemy) {
    return this.units.filter(function(u) {
        if (enemy && u.hp > 0 && unit.color != u.color) return u;
        if (!enemy && u.hp > 0 && unit.color == u.color) return u;
    }).map(function(u) {
        var x = unit.x - u.x;
        var y = unit.y - u.y;
        var d = Math.sqrt(x*x + y*y);
        return { "unit": u, "distance": d };
    }).sort(function(a,b) { return a.distance-b.distance; })[0];
};
Battle.prototype.get_next_turn = function() {
    var activeunit = null;
    while (!activeunit) {
        this.units.filter(function(unit) {
            if (unit.hp > 0) return unit;
        }).forEach(function(unit) {
            unit.at += unit.agl;
        });
        this.units.sort(function(a, b) { return b.at - a.at; });
        if (this.units[0].at >= 100) activeunit = this.units[0];
    }
    return activeunit;
};
Battle.prototype.invoke_action = function(actor, target) {
    var damage = Math.round(actor.pwr * (100-target.def)/100);
    if (damage < 0) damage = 0;
    target.hp -= actor.pwr;
    this.history.push({"type":"action", "actor":actor, "target":target, "damage":damage});
    if (target.hp <= 0)
        target.color = "rgb(0,0,0)";
};
Battle.prototype.turn = function() {
    if (this.target.distance > this.activeunit.range) {
        var dest = this.get_move(this.activeunit, this.target.unit);
        this.move_unit(this.activeunit, dest);
    }
    else
        this.invoke_action(this.activeunit, this.target.unit);
};
Battle.prototype.end_battle = function() {
    console.log("battle over!");
    console.log(this.history);
    window.clearInterval(interval);
};
Battle.prototype.loop = function() {
    if (this.activeunit) {
        if (this.activeunit.at <= 0) {
            this.activeunit = null;
            this.target = null;
        }
        else {
            this.target = this.get_target(this.activeunit, true);
            if (this.target) this.turn();
            else this.end_battle();
            
            this.activeunit.at = 0;
        }
    }
    else
        this.activeunit = this.get_next_turn();
};
Battle.prototype.draw = function(ctx) {
    for (var x=0;x<16;x++) {
        for (var y=0;y<16;y++) {
            ctx.fillStyle = "rgb(50,125,75)";
            ctx.fillRect(x*32,y*32,31,31);
        }
    }
    if (this.activeunit) {
        ctx.fillStyle = "rgba(0,255,255,0.75)";
        ctx.fillRect(this.activeunit.x*32, this.activeunit.y*32, 32, 32);
    }
    
    if (this.target) {
        ctx.fillStyle = "rgba(0,255,0,0.75)";
        ctx.fillRect(this.target.unit.x*32,this.target.unit.y*32,32,32);
    }
    
    this.units.forEach(function(unit) {
        ctx.fillStyle = unit.color;
        ctx.fillRect(unit.x * 32 + 8, unit.y * 32 - 16, 16, 32);
    });
};
