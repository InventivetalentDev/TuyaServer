const TuyAPI = require('tuyapi');
const TuyaColor = require("./tuya-color");
const fs = require("fs");
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json())

const port = 3201;

const config = require("./config");

const devices = require("./devices");
const devicesById = {};
devices.forEach(d => {
    d.reverseProperties = {};
    for (let p in d.properties) {
        d.reverseProperties[d.properties[p]] = p;
    }
    d.reverseScenes = {};
    for (let s in d.scenes) {
        d.reverseScenes[d.scenes[s]] = s;
    }
    devicesById[d.id] = d;
});

const deviceCache = {};

app.use((req, res, next) => {
    if (config.useToken) {
        let token = req.query.token || req.body.token || req.headers.token;
        if (!token || token.length < 1) {
            res.status(401).json({err: "Missing token"});
            return;
        }
        if (token !== config.token) {
            res.status(403).json({err: "Invalid token"});
            return;
        }
    }
    next();
});

app.use(express.static("public"));

app.get("/devices", (req, res) => {
    let devices = [];

    for (let d in devicesById) {
        let dev = devicesById[d];
        devices.push({
            name: dev.name,
            id: dev.id,
            properties: dev.properties || {},
            reverseProperties: dev.reverseProperties || {},
            modes: dev.modes || [],
            scenes: dev.scenes || {},
            reverseScenes: dev.reverseScenes || {}
        })
    }

    res.json(devices);
});


function initDevice(dev) {
    let device = deviceCache[dev.id];
    if (!device) {
        device = new TuyAPI(dev);

        setTimeout(() => {
            device.disconnect();
            delete deviceCache[dev.id];
        }, 10000);
    }
    return device;
}

function mapDpsNamesToIds(dev, setMap) {
    if (setMap["color"]) {
        let col = new TuyaColor();
        col.colorMode = "colour";
        if (typeof setMap["color"] === "string") {
            if (setMap["color"].startsWith("#")) {
                col.setColor(setMap["color"]);
            }
            if (setMap["color"].indexOf(",") !== -1) {
                let split = setMap["color"].split(",");
                col.setHSL(parseInt(split[0]), parseInt(split[1]), parseInt(split[2]));
            }
        }
        if (typeof setMap["color"] === "object") {
            col.setHSL(setMap["color"][0] || setMap["color"].h, setMap["color"][1] || setMap["color"].s, setMap["color"][2] || setMap["color"].l);
        }
        let str = col.getColorString(dev.colorConversion);
        console.log("Converted " + JSON.stringify(setMap["color"]) + " to " + str + " via " + dev.colorConversion);
        setMap["color"] = str;
    }

    for (let n in setMap) {
        if (dev.properties.hasOwnProperty(n)) {
            setMap[dev.properties[n]] = setMap[n];
            delete setMap[n];
        }
    }

    return setMap;
}

function mapDpsIdsToNames(dev, dps) {
    for (let s in dps) {
        if (dev.reverseProperties.hasOwnProperty(s)) {
            let reverseProp = dev.reverseProperties[s];
            dps[reverseProp] = dps[s];

            if (reverseProp === "color") {
                let col = new TuyaColor();
                col.colorMode = "colour"
                col.parseColorString(dev.colorConversion, dps[s]);
                dps["color_hex"] = col.getHex();
                dps["color_hsl"] = col.getHSL();
            }
        }
    }

    return dps;
}

function setDeviceData(dev, data) {
    return new Promise((resolve, reject) => {
            let device = initDevice(dev);

            device.on("error", (err) => {
                console.log(err);
                reject(err);
            });

            device.find().then(() => {
                deviceCache[dev.id] = device;
                device.connect().then(() => {

                    let setMap = data;
                    console.log("original set map: " + JSON.stringify(setMap))

                    setMap = mapDpsNamesToIds(dev, setMap);

                    console.log("final set map: " + JSON.stringify(setMap));
                    device.set({
                        multiple: true,
                        data: setMap
                    }).then(resp => {
                        console.log("SET response: " + JSON.stringify(resp));
                        resolve(resp);
                    });
                });
            });

        }
    )
}

function getDeviceData(dev) {
    return new Promise((resolve, reject) => {
            let device = initDevice(dev);

            device.on("error", (err) => {
                console.log(err);
                reject(err);
            });

            device.find().then(() => {
                deviceCache[dev.id] = device;
                device.connect().then(() => {
                    device.get({schema: true}).then(status => {
                        console.log("got " + JSON.stringify(status));

                        status.dps = mapDpsIdsToNames(dev, status.dps);

                        status.id = dev.id;
                        status.name = dev.name;
                        resolve(status);

                    });
                });
            });

        }
    )
}


app.get("/device/:id/:dps?", (req, res) => {
    if (!devicesById.hasOwnProperty(req.params.id)) {
        res.status(404).json({err: "not found"});
        return;
    }
    let dev = devicesById[req.params.id];

    getDeviceData(dev).then(data=>{
        data.success = true;
        data.modes = dev.modes;
        data.scenes = dev.scenes;
        res.json(data);
    }).catch(err=>{
        res.status(500).json({success:false,err: err})
    })
});


app.put("/device/:id", (req, res) => {
    if (!devicesById.hasOwnProperty(req.params.id)) {
        res.status(404).json({err: "not found"});
        return;
    }
    let dev = devicesById[req.params.id];

    setDeviceData(dev, req.body).then(resp => {
        res.json({success: true, response: resp})
    }).catch((err) => {
        res.status(500).json({success:false,err: err})
    })

});

app.listen(port, () => console.log(`Example app listening at http://localhost:${ port }`))

// const device = new TuyAPI(dev);
//
// let stateHasChanged = false;
//
// // Find device on network
// device.find().then(() => {
//     // Connect to device
//     device.connect();
// });
//
// // Add event listeners
// device.on('connected', () => {
//     console.log('Connected to device!');
// });
//
// device.on('disconnected', () => {
//     console.log('Disconnected from device.');
// });
//
// device.on('error', error => {
//     console.log('Error!', error);
// });
//
// device.on('data', data => {
//     console.log('Data from device:', data);
//
//     console.log(`Boolean status of default property: ${ data.dps['1'] }.`);
//
//     // Set default property to opposite
//     if (!stateHasChanged) {
//         // device.set({set: !(data.dps['1'])});
//         device.set({
//             multiple: true,
//             data: {
//                 '1': false,
//                 '2': 'colour',
//                 '3': 255,
//                 '4': 255
//             }
//         })
//
//         // Otherwise we'll be stuck in an endless
//         // loop of toggling the state.
//         stateHasChanged = true;
//     }
// });
//
// // Disconnect after 10 seconds
// setTimeout(() => {
//     device.disconnect();
// }, 100000);
