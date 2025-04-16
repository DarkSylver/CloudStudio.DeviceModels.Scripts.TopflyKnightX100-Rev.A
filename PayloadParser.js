
const propertys = {
    deviceModel: "deviceModel",
    count: "count",
    timeStamp: "timeStamp",
    longitude: "longitude",
    latitude: "latitude",
    altitude: "altitude",
    angle: "angle",
    satellites: "satellites",
    speed: "speed",
    temp: "temp",
    temp2: "temp2",
    temp3: "temp3",
    temp4: "temp4"
}

const dicConfig = {
    "deviceModel": { init: 0, end: 1 },
    "count": { init: 1, end: 2, parse: hexToInt },


}



const itemConfig = {
    "timeStamp": { long: 8, parse: hexToDate },
    "priority": { long: 1 },
    "longitude": { long: 4, parse: hexToFloat },
    "latitude": { long: 4, parse: hexToFloat },
    "altitude": { long: 2, parse: hexToInt },
    "angle": { long: 2, parse: hexToInt },
    "satellites": { long: 1, parse: hexToInt },
    "speed": { long: 2, parse: hexToInt },
    "ioEventID": { long: 2, parse: hexToInt },
    "ioCount": { long: 2, parse: hexToInt },
    "elementsOneByte": { long: 2, parse: hexToInt },
    "allElemOneByte": { long: null },
    "elementsTwoBytes": { long: 2, parse: hexToInt },
    "allElementsTwoBytes": { long: null },
    "elements4Bytes": { long: 2, parse: hexToInt },
    "allElements4Bytes": { long: null },
    "elements8Bytes": { long: 2, parse: hexToInt },
    "allElements8Bytes": { long: null },
    "elementsXBytes": { long: 2, parse: hexToInt }
}

function ProcessUplinkResult(scriptResult, errors)
{
    this.ScriptResult = scriptResult;
    this.Errors = errors;
}

function ProcessUplinkErrors(dateTime, endpointID, endpointDescription, errorCode, message, field, value)
{
    this.DateTime = dateTime;
    this.EndpointID = endpointID;
    this.EndpointDescription = endpointDescription;
    this.ErrorCode = errorCode;
    this.Message = message;
    this.Field = field;
    this.Value = value;
}


function parseUplink(device, payload) {


    //Parse payload
    let errorx = [];

    payload = parsetoBytes(payload);
    let model = getPropertyValue(propertys.deviceModel, payload);
    let count = getPropertyValue(propertys.count, payload);

    env.log("model", "=>", model);
    env.log("count", " => ", count);
    //Device model validation if is diferent of 8E will return false
    if (model != "8E") {
        return JSON.stringify(new ProcessUplinkResult(false, errorx));
    }

    let allData = readDataItems(payload, count);
    let locationSensor = device.endpoints.byType(endpointType.locationTracker);
    let temperatureSensor = device.endpoints.byType(endpointType.temperatureSensor);
    for (const item of allData) {
       
        if (locationSensor != null && (item.latitude !=0 && item.longitude!=0)) {
            try {
               locationSensor.updateLocationTrackerStatus(item.latitude, item.longitude, item.altitude, 0, item.timeStamp);
            } catch (err) {
               errorx.push(new ProcessUplinkErrors(item.timeStamp, locationSensor.endpointID, locationSensor.description, 0, err.message, "latitude", item.latitude.toString()));
               errorx.push(new ProcessUplinkErrors(item.timeStamp, locationSensor.endpointID, locationSensor.description, 0, err.message, "longitud", item.longitude.toString()));
               errorx.push(new ProcessUplinkErrors(item.timeStamp, locationSensor.endpointID, locationSensor.description, 0, err.message, "altitude", item.altitude.toString()));
            }
          
        }

        let ioTemp = readIoData(4, item.allElements4Bytes);
        if(ioTemp[0] != null)
        {
            let temp = ioTemp[0];
            let temperature = hexToTemp(temp.value);
            if (temperatureSensor != null && temp && (temperature<250 && temperature>-250)) {
                try {
                    temperatureSensor.updateTemperatureSensorStatus(temperature, item.timeStamp);
                } catch (err) {
                    errorx.push(new ProcessUplinkErrors(item.timeStamp, temperatureSensor.endpointID, temperatureSensor.description, 0, err.message, "temperature", temperature.toString()));
                }   
            }
        }
    }

    return JSON.stringify(new ProcessUplinkResult(true,errorx));
    
}


function readDataItems(payload, count, init = 2) {
    let allData = [];
    for (let index = 0; index < count; index++) {
        env.log("\nITEM ", index + 1);
        env.log("Start At ", init, "\n");
        let newItem = {};
        let valAnt = 0;
        for (const key in itemConfig) {
            if (Object.hasOwnProperty.call(itemConfig, key)) {
                const element = itemConfig[key];
                let long = element.long;

                switch (key) {
                    case "allElemOneByte":
                        itemConfig[key].long = valAnt * (2 + 1);
                        long =  itemConfig[key].long;
                        env.log(key, " long=>", itemConfig[key].long);
                        break;
                    case "allElementsTwoBytes":
                        itemConfig[key].long = valAnt * (2 + 2);
                        long =  itemConfig[key].long;
                        env.log(key, " long=>", itemConfig[key].long);
                        break;
                    case "allElements4Bytes":
                        itemConfig[key].long = valAnt * (2 + 4);
                         long =  itemConfig[key].long;
                        env.log(key, " long=>", itemConfig[key].long);
                        break;

                    case "allElements8Bytes":
                        itemConfig[key].long = valAnt * (2 + 8);
                        long =  itemConfig[key].long;
                        env.log(key, " long=>", itemConfig[key].long);
                        break;
                    default:
                        break;
                }




                var valor = getItemPropertyValue(key, init, payload);
                env.log(key, "=>", valor);
                newItem[key] = valor;
                init += long;
            }
            valAnt = valor;
        }

        allData.push(newItem);
    }


    return allData;

}

function readIoData(bytesLen, hexData, idLen = 2) {
    let ini = 0;
    let all = [];
    bytesLen = bytesLen * 2;
    idLen = idLen * 2;
    while (ini < hexData.length) {
        let item = {
            id: hexData.substr(ini, idLen),
            value: hexData.substr(ini + idLen, bytesLen),
        }

        all.push(item);
        ini += idLen + bytesLen;
    }

    return all;
}

function parseBytesData(bytesLen, hexData, idLen = 2) {
    let init = 0;

}

function getConfiguration(property) {

    return dicConfig[property];

}

function getItemConfiguration(property) {

    return itemConfig[property];

}
function parsetoBytes(payload) {
    let bytes = payload.asBytes();
    return bytes;
}


function hexToString(hexa) {
    let resultLongitude = "";
    for (var i = 0; i < hexa.length; i++) {
        var hex = hexa[i].toString(16);
        if (hex.length == 1) {
            hex = "0" + hex;
        }
        resultLongitude += hex;
    }

    return resultLongitude.toUpperCase();
}

function propParser(value, callback) {
    return callback(value);
}

function getPropertyValue(property, payload, parseBool = true) {

    let config = getConfiguration(property);

    let valuex = payload.slice(config.init, config.end);

    let result = hexToString(valuex);

    if (config.parse && parseBool) {
        result = propParser(result, config.parse)
    }

    return result;

}

function getItemPropertyValue(property, init, payload, parseBool = true) {

    let config = getItemConfiguration(property);

    let valuex = payload.slice(init, init + config.long);

    let result = hexToString(valuex);

    if (config.parse && parseBool) {
        result = propParser(result, config.parse)
    }

    return result;

}

function hexToFloat(hexString) {
    return (parseInt(hexString, 16) | 0) / 1e7;
}
function hexToDate(hexa) {
    return new Date(parseInt(hexa, 16)).toJSON();
}
function hexToInt(hexString) {
    return parseInt(hexString, 16);
}

function hexToTemp(hexString) {
    return (parseInt(hexString, 16) | 0) / 10;
}


function buildDownlink(device, endpoint, command, payload) {
    // This function allows you to convert a command from the platform 
    // into a payload to be sent to the device.
    // Learn more at https://wiki.cloud.studio/page/200

    // The parameters in this function are:
    // - device: object representing the device to which the command will
    //   be sent. 
    // - endpoint: endpoint object representing the endpoint to which the 
    //   command will be sent. May be null if the command is to be sent to 
    //   the device, and not to an individual endpoint within the device.
    // - command: object containing the command that needs to be sent. More
    //   information at https://wiki.cloud.studio/page/1195.

    // This example is written assuming a device that contains a single endpoint, 
    // of type appliance, that can be turned on, off, and toggled. 
    // It is assumed that a single byte must be sent in the payload, 
    // which indicates the type of operation.

    /*
         payload.port = 25; 	 	 // This device receives commands on LoRaWAN port 25 
         payload.buildResult = downlinkBuildResult.ok; 
    
         switch (command.type) { 
               case commandType.onOff: 
                       switch (command.onOff.type) { 
                               case onOffCommandType.turnOn: 
                                       payload.setAsBytes([30]); 	 	 // Command ID 30 is "turn on" 
                                       break; 
                               case onOffCommandType.turnOff: 
                                       payload.setAsBytes([31]); 	 	 // Command ID 31 is "turn off" 
                                       break; 
                               case onOffCommandType.toggle: 
                                       payload.setAsBytes([32]); 	 	 // Command ID 32 is "toggle" 
                                       break; 
                               default: 
                                       payload.buildResult = downlinkBuildResult.unsupported; 
                                       break; 
                       } 
                       break; 
               default: 
                       payload.buildResult = downlinkBuildResult.unsupported; 
                       break; 
         }
    */

}