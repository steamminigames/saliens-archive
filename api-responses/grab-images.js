let urls = [];
const https = require("https"),
      fs    = require("fs"),
      path  = require('path');

// https://stackoverflow.com/a/40686853
function mkdirp(targetDir, {isRelativeToScript = false} = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
        return curDir;
    }, initDir);
}
const re = new RegExp(`^(.*)\\${path.sep}[^\\${path.sep}]+$`);
const getwrite = function(url, p) {
    p = p.replace(/\//g, path.sep);
    mkdirp(p.match(re)[1])
    https.get(url, r => r.pipe(fs.createWriteStream(p)));
}

const getplanets = require("./getplanets_english.json");

let planets = {};
for (let planet of getplanets) {
    planets[planet.id] = require(`./planet-${planet.id}.json`);
}


getplanets.forEach(p => {
    let img = `https://steamcdn-a.akamaihd.net/steamcommunity/public/assets/saliengame/planets/${p.state.image_filename}`;
    if (urls.indexOf(img) === -1) {
        getwrite(img, `../assets/saliengame/planets/${p.state.image_filename}`);
        urls.push(img);
    }

    let map_img = `https://steamcdn-a.akamaihd.net/steamcommunity/public/assets/saliengame/maps/${p.state.map_filename}`;

    if (urls.indexOf(map_img) === -1) {
        getwrite(map_img, `../assets/saliengame/maps/${p.state.map_filename}`);
        urls.push(map_img);
    }

    planets[p.id].zones.forEach(zone => {
        zone.top_clans.forEach(clan => {
            let path = `images/avatars/${clan.avatar.substr(0, 2)}/${clan.avatar}.jpg`;
            let avatar = `https://steamcdn-a.akamaihd.net/steamcommunity/public/${path}`;
            if (urls.indexOf(avatar) === -1) {
                getwrite(avatar, `../${path}`);
                urls.push(avatar);
            }
        })
    })
})


