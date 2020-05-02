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

app.get("/device/:id/:dps?", (req, res) => {
    if (!devicesById.hasOwnProperty(req.params.id)) {
        res.status(404).json({err: "not found"});
        return;
    }
    let dev = devicesById[req.params.id];

    try {
        let device = deviceCache[req.params.id];
        if (!device) {
            device = new TuyAPI(dev);
        }

        device.on("error", (err) => {
            console.log(err);
            res.status(500).json({err: err})
        });

        let doStuff = async () => {
            try {
                await device.find();
                deviceCache[req.params.id] = device;
                await device.connect();

                let g = {};
                if (req.params.dps) {
                    if (dev.properties.hasOwnProperty(req.params.dps)) {
                        g.dps = dev.properties[req.params.dps];
                    } else {
                        g.dps = req.params.dps;
                    }
                } else {
                    g.schema = true;
                }
                let status = await device.get(g);
                console.log("got " + JSON.stringify(status));
                for (let s in status.dps) {
                    if (dev.reverseProperties.hasOwnProperty(s)) {
                        status.dps[dev.reverseProperties[s]] = status.dps[s];

                        if (dev.reverseProperties[s] === "color") {
                            let col = new TuyaColor();
                            col.colorMode = "colour"
                            col.parseColorString(dev.colorConversion, status.dps[s]);
                            status.dps["color_hex"] = col.getHex();
                            status.dps["color_hsl"] = col.getHSL();
                        }
                    }
                }
                if (req.params.dps) {
                    res.json({
                        name: dev.name,
                        dps: req.params.dps,
                        value: status || null
                    });
                } else {
                    status.name = dev.name;
                    res.json(status);
                }

                setTimeout(() => {
                    device.disconnect();
                    delete deviceCache[req.params.id];
                }, 5000);
            } catch (e) {
                console.log(e);
                res.status(500).json({err: e.message})
            }
        };
        doStuff();

    } catch (e) {
        console.log(e);
        res.status(500).json({err: e.message})
    }
});

app.put("/device/:id", (req, res) => {
    if (!devicesById.hasOwnProperty(req.params.id)) {
        res.status(404).json({err: "not found"});
        return;
    }
    let dev = devicesById[req.params.id];

    let device = deviceCache[req.params.id];
    if (!device) {
        device = new TuyAPI(dev);
    }

    device.on("error", (err) => {
        console.log(err);
        res.status(500).json({err: err})
    });

    let doStuff = async () => {
        try {
            await device.find();
            deviceCache[req.params.id] = device;
            await device.connect();

            let setMap = req.body;
            console.log("original set map: " + JSON.stringify(setMap))

            if (setMap["color"]) {
                let col = new TuyaColor();
                col.colorMode = "colour";
                if(typeof setMap["color"] ==="string") {
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


            // if(dev.properties.hasOwnProperty(req.params.dps)){
            for (let n in setMap) {
                if (dev.properties.hasOwnProperty(n)) {
                    setMap[dev.properties[n]] = setMap[n];
                    delete setMap[n];
                }
            }
            // }


            console.log("final set map: " + JSON.stringify(setMap));
            await device.set({
                multiple: true,
                data: setMap
            });
            // let status = await device.get({schema: true});
            // console.log("got " + JSON.stringify(status));
            res.json({success: true, set: setMap});

            setTimeout(() => {
                device.disconnect();
                delete deviceCache[req.params.id];
            }, 5000);
        } catch (e) {
            console.log(e);
            res.status(500).json({err: e.message})
        }
    };
    doStuff();

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
