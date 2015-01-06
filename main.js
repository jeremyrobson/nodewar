var game;
Array.prototype.pop_random = function() { var r = Math.floor(Math.random() * this.length); return this.splice(r, 1)[0]; };
function randint(min, max) { return Math.floor(Math.random() * (max - min)) + min; }
var TileTypes = {
    "sky": {
        color: "rgb(100,200,255)"
    },
    "grass": {
        color: "rgb(50,125,75)"
    }
};
function draw_tile(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*20,y*15,19,14);
}
var Tile = function(type, x, y) {
    this.type = type;
    this.unit = null;
    this.x = x;
    this.y = y;
};
Tile.prototype.draw = function(ctx) {
    draw_tile(ctx,this.x,this.y,TileTypes[this.type].color);
};
var Map = function() {
    var heights = [];
    heights[0] = [randint(12,24),randint(12,24)];
    for (var i=1; i<6; i++) {
        heights[i] = [];
        var max = Math.pow(2,i);
        for (var x=0;x<max;x++)
            heights[i][x] = heights[i-1][Math.floor(x/2)] + randint(0,3) - 1;
    }

    this.height = [];
    for (var x=0;x<32;x++) {
        this.height[x] = {
            unit: null,
            x: x,
            y: heights[5][x]
        };
    }
    this.tile = [];
    for (var x=0;x<32;x++) {
        this.tile[x] = [];
        for (var y=0;y<this.height[x].y;y++) {
            this.tile[x][y] = new Tile("sky", x, y);
        }
        for (var y=this.height[x].y; y<32; y++) {
            this.tile[x][y] = new Tile("grass", x, y);
        }
    }
};
Map.prototype.move_unit = function(unit, x) {
    if (this.height[unit.x] && this.height[unit.x].unit)
        this.height[unit.x].unit = null; //remove unit from current tile
        
    this.height[x].unit = unit; //move unit to new tile
    unit.x = x;
    unit.y = this.height[x].y;
};
Map.prototype.draw = function(ctx) {
    for (var x=0;x<32;x++) {
        for (var y=0;y<32;y++) {
            this.tile[x][y].draw(ctx);
        }
    }
};
var Item = function(name, range, spread) {
    this._id = 0;
    this.name = name;
    this.range = range;
    this.spread = spread;
};
var Unit = function(ai, color) {
    this._id = randint(100000,1000000);
    this.ai = ai;
    this.color = color;
    
    var stats = [4,5,6,7,8,9];
    
    this.hp = stats.pop_random() * 10;
    this.pwr = stats.pop_random();
    this.def = stats.pop_random();
    this.agl = stats.pop_random();
    this.mag = stats.pop_random();
    this.moverange = stats.pop_random();
    
    this.at = 0;
    this.equip = [
        new Item("Sword", 1, 1),
        new Item("Bow", 5, 1),
        new Item("Fire", 3, 2)
    ];
};
Unit.prototype.move = function(dest) {
    this.x = dest.x & 15;
    this.y = dest.y & 15;
};
Unit.prototype.get_equip = function(name) {
    return this.equip.filter(function(e) {
        return e.name == name;
    })[0];
};
var Party = function(ai, color) {
    this._id = 0;
    this.units = [
        //new Unit(color),
        //new Unit(color),
        //new Unit(color),
        //new Unit(color),
        new Unit(ai, color)
    ];
};
var User = function(username, ai) {
    this._id = 0;
    this.username = username;
    this.ai = ai;
    
    this.color = (ai=="cpu") ? "rgb(255,0,0)" : "rgb(0,255,0)";
    this.party = new Party(ai, this.color);
};
var Battle = function(user1, user2) {
    var self = this;
    
    this.history = [];
    this.map = new Map();
    
    this.units = user1.party.units.concat(user2.party.units);
    var positionlist = [];
    for (var x=0; x<32; x++)
        positionlist.push(x);

    this.units.forEach(function(unit) {
        var r = randint(0, positionlist.length);
        var x = positionlist.splice(r, 1)[0];
        self.map.move_unit(unit, x);
    });
    
    $(".menulevel1").click(function() {
        self.movelist = null;
        self.rangelist = null;
        
        var option1 = $("input[name=menulevel1]:checked").val();
        if (option1=="move" && self.selunit) {
            $("#menu2").hide();
            self.movelist = self.get_move_list(self.selunit);
        }
        else if (option1=="act" && self.selunit) {
            $("#menu2").empty();
            self.selunit.equip.forEach(function(e, i) {
                $("<input />").attr({type:"radio", id: "menulevel2radio"+i, name:"menulevel2", value:e.name}).click(function() {
                    var actionname = $("input[name=menulevel2]:checked").val();
                    self.selaction = self.selunit.get_equip(actionname);
                    self.rangelist = self.get_range_list(self.selunit, self.selaction);
                }).appendTo("#menu2");
                $("<label>").attr({"for": "menulevel2radio"+i}).html(e.name).appendTo("#menu2");
                $("#menu2").show();
            });
        }
        else
            $("#menu2").hide();
    });
    $("#menulevel1button0").click(function () {
        self.selunit.at -= 40;
        self.selunit = null;
        self.activeunit = null;
        $(".menu").hide();
    });
    $("#menulevel1button1").click(function () {
        
        $("#menu3").show();
    });
};
function delegate_yes_no(yes, no) {
    $("#menulevel3button0").click(function() {
        yes();
    });
    $("#menulevel3button1").click(function() {
        no();
    });
}
Battle.prototype.get_move_list = function(u) {
    return [[0,0],[0,1],[1,0],[1,1]];
};
Battle.prototype.get_range_list = function(u, action) {
    var range = action.range;
    console.log(range);
    return [[2,2],[2,3],[3,2],[3,3]];
};
Battle.prototype.get_spread_list = function(action, dest) {
    var spread = action.spread;
    console.log(spread, dest);
    return [[4,4],[4,5],[5,4],[5,5]];
};
Battle.prototype.in_range = function(rangelist, dest) {
    console.log(rangelist, dest);
    return true;
};
Battle.prototype.move_unit = function(unit, dest) {
    if (!this.tile[dest.x][dest.y].unit) {
        this.tile[unit.x][unit.y].unit = null;
        unit.move(dest);
        this.history.push({"type":"move","actor":unit,"dest":dest});
        this.tile[unit.x][unit.y].unit = unit;
        return true;
    }
    return false;
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
        $("#menulevel1radio0").removeAttr("disabled");
        $("#menulevel1radio1").removeAttr("disabled");
    }
    else
        this.activeunit = this.get_next_turn();
};
Battle.prototype.mouse_down = function(mx, my) {
    var self = this;

    var tx = Math.floor(mx/20);
    var ty = Math.floor(my/15);
    this.seltile = this.map.height[tx];
    
    if (!this.selunit) {
        this.selunit = this.seltile.unit;
        if (this.selunit && this.activeunit._id == this.seltile.unit._id)
            $("#menu1").show();
    }
    else if (this.movelist) {
        if (!this.move_unit(this.selunit, this.seltile))
            console.log("cannot move there");
        else {
            $("#menulevel1radio0").prop("checked", false).attr("disabled", "disabled");
            this.movelist = null;
        }
    }
    else if (this.rangelist && !this.spreadlist) {
        if (!this.in_range(this.rangelist, this.seltile))
            console.log("not in range");
        else {
            this.spreadlist = this.get_spread_list(this.selaction, this.seltile);
            delegate_yes_no(function() {
                console.log("yes");
                $("#menulevel1radio1").prop("checked", false).attr("disabled", "disabled");
                self.rangelist = null;
                self.spreadlist = null;
                $("#menu2").hide();
                $("#menu3").hide();
            },
            function() {
                console.log("no");
                self.spreadlist = null;
                $("#menu3").hide();
            });
            $("#menu3").show();
        }
    }
    else if (this.spreadlist) {
        //cancel spread if not in_spread()?
    }
    else {
        this.selunit = null;
        $(".menu").hide();
    }
};
Battle.prototype.draw = function(ctx) {
    this.map.draw(ctx);
    
    if (this.movelist) {
        this.movelist.forEach(function(m) {
            draw_tile(ctx,m[0],m[1],"rgba(0,255,255,0.75)");
        });
    }
    
    if (this.rangelist) {
        this.rangelist.forEach(function(r) {
            draw_tile(ctx,r[0],r[1],"rgba(255,0,0,0.75)");
        });
    }
    
    if (this.spreadlist) {
        this.spreadlist.forEach(function(s) {
            draw_tile(ctx,ctx,s[0],s[1],"rgba(0,255,0,0.75)");
        });
    }
    
    if (this.activeunit)
        draw_tile(ctx,this.activeunit.x,this.activeunit.y,"rgba(200,255,55,0.75)");
    
    if (this.selunit)
        draw_tile(ctx,this.selunit.x,this.selunit.y,"rgba(0,0,255,0.75)");
    
    if (this.target)
        draw_tile(ctx,this.target.unit.x,this.target.unit.y,"rgba(0,255,0,0.75)");
    
    this.units.forEach(function(unit) {
        ctx.fillStyle = unit.color;
        ctx.fillRect(unit.x * 20 + 5, unit.y * 15 - 15, 10, 16);
    });
};
