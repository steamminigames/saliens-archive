if (!URL) {
    throw new Error("can't support non-webbrowser since URL does not exist");
}

var time = function time() {
    return (Date.now() / 1000) | 0;
}

var InitialData = {
    _planets: {},
    score: '0',
    level: 1,
    bosses_fought: 0,
    planets_visited: 0,
    cheated: false,
    planets_done: 0
}

// https://github.com/steam-minigames/SteamDatabase-SalienCheat-2018/blob/master/cheat.php#L528
var ScoreTable = [
    0,       // Level 1
    1200,    // Level 2
    2400,    // Level 3
    4800,    // Level 4
    12000,   // Level 5
    30000,   // Level 6
    72000,   // Level 7
    180000,  // Level 8
    450000,  // Level 9
    1200000, // Level 10
    2400000, // Level 11
    3600000, // Level 12
    4800000, // Level 13
    6000000, // Level 14
    7200000, // Level 15
    8400000, // Level 16
    9600000, // Level 17
    10800000, // Level 18
    12000000, // Level 19
    14400000, // Level 20
    16800000, // Level 21
    19200000, // Level 22
    21600000, // Level 23
    24000000, // Level 24
    26400000, // Level 25
];

function CSaliensScoreData(save) {
    this.bSave = save;
    if (!this.bSave)
        this.data = InitialData;
    else {
        for (let key in InitialData)
            if (this.get(key) === undefined)
                this.set(key, InitialData[key]);
    }
}

CSaliensScoreData.prototype.get = function get(key) {
    if (this.bSave)
        return WebStorage.GetLocal(key);
    else
        return this.data[key];
}

CSaliensScoreData.prototype.set = function get(key, value) {
    if (this.bSave)
        WebStorage.SetLocal(key, value);
    else
        this.data[key] = value;
}

gScorer = new CSaliensScoreData(false);

function CSaliensAPIAjaxState(api, data) {
    this._data = data;
    this._api = api;
    if (api)
        this._timeout = setTimeout(this._timeout.bind(this), 1);
}

CSaliensAPIAjaxState.prototype._param = function _param(key) {
    return this._data.data[key];
}
CSaliensAPIAjaxState.prototype.getResponseHeader = function getResponseHeader(name) {
    return this.headers[name];
}

CSaliensAPIAjaxState.prototype.success = function success(fn) {
    this._success = function _success(data) {
        this.headers = {
            "x-eresult": 1
        };
        return fn(data, null, this);
    }
    return this;
}
CSaliensAPIAjaxState.prototype.fail = function fail(fn) {
    this._fail = fn;
    return this;
}

CSaliensAPIAjaxState.prototype._error = function _error(reason) {
    console.log("FAILED!");
    console.log(this._data);
    console.log(reason);
    this._fail(this, reason, 404);
}

CSaliensAPIAjaxState.prototype._timeout = function timeout() {
    var url;
    try {
        var url = new URL(this._data.url);
    }
    catch (e) {
        return this._error(e.toString());
    }
    var endpoints = this._api.m_Endpoints[url.host];
    if (!endpoints) {
        return this._error("unknown host: " + url.host);
    }
    let endpoint = endpoints[url.pathname];
    if (!endpoint) {
        return this._error("unknown endpoint: " + url.pathname);
    }
    endpoint(this, url);
}

function CSaliensAPI() {
    this.m_GetPlanetsMap = {};
    this.m_GetPlanetMap = {};

    this.m_Endpoints = {
        "steamcommunity.com": {
            "/saliengame/gettoken": this.gettoken.bind(this)
        },
        "community.steam-api.com": {
            "/ITerritoryControlMinigameService/GetPlayerInfo/v0001/": this.GetPlayerInfo.bind(this),
            "/ITerritoryControlMinigameService/GetPlanets/v0001/": this.GetPlanets.bind(this),
            "/ITerritoryControlMinigameService/JoinPlanet/v0001/": this.JoinPlanet.bind(this),
            "/ITerritoryControlMinigameService/GetPlanet/v0001/": this.GetPlanet.bind(this)
        }
    }
}

CSaliensAPI.prototype.gettoken = function gettoken(data) {
    console.log("successfully got token!");
    data._success({
        "webapi_host": "https:\/\/community.steam-api.com\/",
        "webapi_host_secure": "https:\/\/community.steam-api.com\/",
        "token": "000000000000000000000000000000000",
        "steamid": "0",
        "persona_name": "non-steam user",
        "success": 1
    });
}

CSaliensAPI.prototype.GetPlayerInfo = function GetPlayerInfo(data) {
    var info = {}
    info.score = gScorer.get("score");
    info.level = gScorer.get("level");
    info.bosses_fought = gScorer.get("bosses_fought");
    info.planets_visited = gScorer.get("planets_visited");
    info.cheated = gScorer.get("cheated");

    info.next_level_score = ScoreTable[info.level];
    data._success({
        "response": info
    });
}

CSaliensAPI.prototype.GetPlanetsData = function GetPlanetsData(planet) {
    var d = {
        id: planet.id,
        state: {
        },
        giveaway_apps: planet.giveaway_apps,
        top_clans: planet.top_clans
    };

    ["name", "image_filename", "map_filename", "land_filename", "cloud_filename", "difficulty", "giveaway_id", "position", "total_joins", "current_players", "priority", "tag_ids"].forEach(function(key) {
        d.state[key] = planet.state[key];
    });

    var idx = this.m_GetPlanets.indexOf(planet);
    var done = gScorer.get("planets_done");

    if (idx < done) {
        d.state.captured = true;
        d.state.capture_progress = 1;
    } 
    else if (idx < done + 5) {
        d.state.captured = false;
        d.state.capture_progress = 0;
    }
    if (idx < done + 5) {
        d.state.active = true;
        d.state.activation_time = 0;
    }

    return d;
}

CSaliensAPI.prototype.GetPlanets = function GetPlanets(ajax) {
    var success = function success(d) {
        var done = gScorer.get("planets_done");
        if (ajax._param("active_only")) {
            d = d.slice(done, done + 5);
        }
        var planets = [];
        for (var i = 0; i < d.length; i++) {
            var planet = this.GetPlanetsData(d[i]);
            planets.push(planet);
        }
        ajax._success({
            "response": {
                "planets": planets
            }
        });
    }.bind(this);

    if (this.m_GetPlanets) {
        success(this.m_GetPlanets);
    }
    else {
        $J.real_ajax({
            url: "./api-responses/getplanets_" + (ajax._param("language") || "english") + ".json"
        }).success(function(planets) {
            this.m_GetPlanets = planets;
            this.m_GetPlanets.sort(function sort(a, b) {
                return a.state.activation_time - b.state.activation_time;
            });
            this.m_GetPlanets.forEach(function forEach(planet) {
                this.m_GetPlanetsMap[planet.id] = planet;
            }.bind(this));
            success(this.m_GetPlanets);
        }.bind(this));
    }
}

CSaliensAPI.prototype.JoinPlanet = function JoinPlanet(data) {
    this.GetPlanets(
        (
            new CSaliensAPIAjaxState(null, {
                data: {
                    active_only: "1",
                }
            })
        ).success(
            function _success(res) {
                var planets = res.response.planets;
                var to_join = data._param("id");
                var allowed = false;
                planets.forEach(function(p) {
                    if (p.id == to_join)
                        allowed = true;
                })
                if (allowed) {
                    data._success();
                }
                else {
                    data._fail();
                }
            }
        )
    );
}

CSaliensAPI.prototype.GetPlanetData = function GetPlanetData(id) {
    let planet = this.GetPlanetsData(this.m_Planets[id]);
}

CSaliensAPI.prototype.GetPlanet = function GetPlanet(ajax) {
    // allow hacks to do this even without GetPlanets
    this.GetPlanets(
        (
            new CSaliensAPIAjaxState(null, {
                data: {
                    active_only: "0",
                }
            })
        ).success(
            function _success(res) {
                var done = function done(planet) {
                    var res = this.GetPlanetsData(planet);
                    res.zones = []
                    planet.zones.forEach(function(zone){
                        res.zones.push({
                            "zone_position": zone.zone_position,
                            "leader": zone.leader,
                            "type": zone.type,
                            "gameid": zone.gameid,
                            "difficulty": zone.difficulty,
                            "captured": false,
                            "capture_progress": 0,
                            "top_clans": zone.top_clans
                        });
                    }.bind(this));
                    ajax._success({
                        response: {
                            game_version: 2,
                            planets: [
                                res
                            ]
                        }
                    });
                }.bind(this);

                if (this.m_GetPlanetMap[ajax._param("id")])
                    done(this.m_GetPlanetMap[ajax._param("id")]);
                else
                    $J.real_ajax({
                        url: "./api-responses/planet-" + ajax._param("id") + ".json"
                    }).success(function(data) {
                        this.m_GetPlanetMap[data.id] = data;
                        done(data);
                    }.bind(this));
            }.bind(this)
        )
    );
}


CSaliensAPI.prototype.ajax = function ajax(data) {
    return new CSaliensAPIAjaxState(this, data);
}

gAPI = new CSaliensAPI();
$J.real_ajax = $J.ajax;
$J.ajax = gAPI.ajax.bind(gAPI);