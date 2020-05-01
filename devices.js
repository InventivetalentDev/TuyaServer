/// https://pastebin.com/raw/zqbeBf1e
module.exports = [
    {
        id: '08068640d8bfc0d32033',
        ip: '192.168.178.46',
        key: 'e456b92aef31fe56',
        name: 'LED strip',
        version: 3.3,
        colorConversion: "hsl4",
        modes:["colour","scene"],
        scenes: {
            "night":"000e0d00002e03e802cc00000000",
            "read":"010e0d000084000003e800000000",
            "working":"020e0d00001403e803e800000000",
            "leisure":"030e0d0000e80383031c00000000",
            "soft":"04464602007803e803e800000000464602007803e8000a00000000",
            "colorful":"05464601000003e803e800000000464601007803e803e80000000046460100f003e803e800000000464601003d03e803e80000000046460100ae03e803e800000000464601011303e803e800000000",
            "dazzling":"06464601000003e803e800000000464601007803e803e80000000046460100f003e803e800000000",
            "gorgeous":"07464602000003e803e800000000464602007803e803e80000000046460200f003e803e800000000464602003d03e803e80000000046460200ae03e803e800000000464602011303e803e800000000"
        },
        properties:{
            "toggle":"20",
            "mode":"21",
            "color":"24",
            "scene":"25",
            "????":"26"
        }
    },
    {
        id: '5556818250029156fef5',
        ip: '192.168.178.41',
        key: '3f8a7f3fc2cf0668',
        name: 'Bedroom Light',
        version: 3.3,
        colorConversion: "hex_brightness",
        modes:["colour","white","scene","scene_1","scene_2","scene_3","scene_4"],
        scenes: {
            "night":"bd76000168ffff",
            "read":"fffcf70168ffff",
            "meeting":"cf38000168ffff",
            "leisure":"3855b40168ffff"
        },
        properties: {
            "toggle":"1",
            "mode":"2",
            "white_brightness":"3",
            "white_temp":"4",
            "color":"5",
            "scene":"6"
        }
    }
];
