/*
*This newman.js implements an application that read and seperate
*the base postman collecitons into many collections based on the 
*thread count and starts the newman test parallely based on the thread count
*
*This newman.js written in an intention to reduce the execution time of the newman run
*less than 20 minutes
*
*@author svenkat1
*@version 1.0
*@Data 04/04/2017
*/

var newman = require('newman');
var fs = require('fs');
var path = require('path');

var baseCollectionData = null;
var fileCount = 1;
var totalFileCount;
var accessTokenCollection = [];
var refreshTokenCollection = [];
var refreshTokenValue;
var globalsEnv;

/*
This method validation has userDefined function to validate the input
function() isNumber -  is used to validate the thread count
function() isString - is used to validate the entity name
function() istype - is used to validate the testing type
@return boolean(true/false)
*/

var validation = {
    isNumber:function(num) {
        var pattern =/^[0-9]+$/;
        if(pattern.test(num)) {

        	if(0<num && num<=50) {
        		return true;
        	} else {
        		console.log("only 1 to 50 thread count allowed now");
        		return false;
        	}

        } else {
        	console.log("Enter a valid Concurrent run count \n");
            console.log("Example : node <file name>.js <entity name> <threadCount>");
        	return false;
        }
    },
    isString:function(str) {
    	if(str.toLowerCase().match(/^(assets|sensors|persons|vehicles|alltest)$/)) {
    		return true;
    	} else {
    		console.log("Enter a valid Entity type (assets/sensors/persons/vehicles/alltest)\n");
            console.log("Example : node <file name>.js <entity name> <threadCount>");
    		return false;
    	}
        
    },
    istype:function(str) {
        if(str.toLowerCase().match(/^(bat|reg)$/)) {
            return true;
        } else {
            console.log("Enter a valid Testing type\n");
            console.log("Example : node <file name>.js <testing type> <entity name> <thread count>");
            return false;
        }
    },

};

/*
This method Validate is used to validate the user input
@param1 user input in process.argv[]
@param2 callback function which calls baseCollectionFileRead function
@return nothing
*/

function validate(argv,callback) {

	if(validation.istype(argv[0]) && validation.isString(argv[1]) && validation.isNumber(argv[2])) {

        switch(argv[0]) {
            case "bat":
                var baseCollectionFilePath = "./postman_repository/batCollections.json";
                /*console.log("fileName",baseCollectionFilePath);*/
                callback(argv,baseCollectionFilePath);
                break;

            case "reg":
                var baseCollectionFilePath = "./postman_repository/regCollections.json";
                /*console.log("fileName",baseCollectionFilePath);*/
                callback(argv,baseCollectionFilePath);
                break;

            default:
                console.log("invalid testing type encountered");
                break;
        }
	}
};

/*
This method baseCollectionFileRead is used to read the base postman collections file
@param1 process.argv[]
@param2 collection file path
@return nothing
*/
function baseCollectionFileRead (param,baseCollectionFilePath) {
	
	var entityEnv;
	var entity = param[1];
	var threadCount = param[2];

    fs.readFile(baseCollectionFilePath,'utf8',function(err,jsonData) {
        
        if(err) { console.log("Error in reading Base collection file",err);}

        baseCollectionData = JSON.parse(jsonData);
        if(entity.match(/^(assets|persons|vehicles|sensors)$/)) {
            collectionDataValidation(entity,threadCount,collectionSeperation);
        } else {
            collectionDataValidation("assets",threadCount,collectionSeperation);
            collectionDataValidation("sensors",threadCount,collectionSeperation);
            collectionDataValidation("persons",threadCount,collectionSeperation);
            collectionDataValidation("vehicles",threadCount,collectionSeperation);
        }
        
    });
};

/* 
This method collectionDataValidation is used to validate the readed postman collection,
which stored in baseCollectionData
@param1 entity type
@param2 thread count
@param3 callback function which calls collectionSeperation function
*/
function collectionDataValidation(entity,threadCount,callback) {

    if(baseCollectionData !== null) {
        callback(entity,threadCount);
    } else {
        console.log("collectionData is empty or undefined");
    }
}

/*
This method writeFile is used to write the sepeareted collections into files
@param1 colleciton file name
@param2 seperated collection array
@return boolean(true/false)
*/
function writeFile(fileName,collections) {

    fs.writeFile(fileName, JSON.stringify(collections), 'utf-8', function(err) {
        if (err) { console.log("Error in creating file",err); return false;}
            
        return true;
    });

}

/*
This method runtimeCollectionFormation is used to form the separated postman collections in runtime
@param1 collectionArray
@return object(runtimeCollections)
*/
function runtimeCollectionFormation(dataArray) {

    var runtimeCollections = {

        "variables" : baseCollectionData.variables,
        "info" : {
            "name" : baseCollectionData.info.name,
            "_postman_id" : baseCollectionData.info._postman_id,
            "description" : baseCollectionData.info.description,
            "schema" : baseCollectionData.info.schema
        },
        "item" : dataArray
    }

    return runtimeCollections;
}

/*
This method collectionBuild is used to build the runtime postman collections
Then write the collection in respective files
@param1 thread count
@param2 entity name
@param3 collectionArray
@return nothing
*/
function collectionBuild(threadCount,entity,collectionArray) {

    if(collectionArray !== null && collectionArray.length > 0) {
        
        var runtimeFormedCollection = runtimeCollectionFormation(collectionArray);
        totalFileCount = fileCount;
        if(fileCount <= threadCount) {
            //console.log("length "+entity,collectionArray.length+" fileCount "+fileCount);
            var fileName = "./execution_files/"+entity+fileCount+".json";
            writeFile(fileName,runtimeFormedCollection);
            ++fileCount;
        } 
    } else {
        console.log("Collection Array is empty in collectionBuild");
    }  
}

/*
This method initFilesBuild is used to build the initial set of collections which 
wanted to run first before the actual collection starts
@param1 entity name
@param2 file count
@param3 initial collection array
@param4 final collection array
@param5 callback function
@return nothing
*/

function initFilesBuild(entity,fileCount,initCollectionArray,finalCollectionArray,callback) {

    if(initCollectionArray !== null && initCollectionArray.length > 0) {

        var runtimeFormedCollection = runtimeCollectionFormation(initCollectionArray);
        var fileName = "./execution_files/"+entity+"Init.json";
        var valid = writeFile(fileName,runtimeFormedCollection);
        if(valid != false) {

            //console.log(entity+' initFilesBuild Done!');
            callback(entity,fileCount,finalCollectionArray,newmanInit);
        }
    } else {
        console.log("initCollectionArray is empty in initFilesBuild");
    }
	
}

/*
This method finalFilesBuild is used to build the final set of collections which 
wanted to run at last after the actual collections get finished execution
@param1 entity name
@param2 file count
@param3 final collection array
@param4 callback function
@return nothing
*/
function finalFilesBuild(entity,fileCount,finalCollectionArray,callback) {

    if(finalCollectionArray !== null && finalCollectionArray.length > 0) {

        var runtimeFormedCollection = runtimeCollectionFormation(finalCollectionArray);
        var fileName = "./execution_files/"+entity+"Final.json";
        var valid = writeFile(fileName,runtimeFormedCollection);
        if(valid != false) {
           //console.log(entity+' finalFilesBuild Done!');
            callback(entity,fileCount); 
        }

    } else {
        console.log("finalCollectionArray is empty in finalFilesBuild");
    }
    
}

/*
This method collectionSeperation is used to seperate the postman base collections
Seperation process is based on the thread count and entity name
@param1 entity name
@param2 threa count
@return nothing
*/
function collectionSeperation(entity,threadCount) {

	var entityCount;
	var commonCount;
	var lineCount;
	var primaryFilesCount = 0;
    var initCollectionArray = [];
    var finalCollectionArray =[];
    var collectionArray = [];


    baseCollectionData.item.forEach(function (collectionTemp) {

        if(collectionTemp.name === entity) {

            entityCount = collectionTemp.item.length;
            //console.log(entity+" count "+entityCount);

            collectionTemp.item.forEach(function(temp) {

            	if(temp.name.toLowerCase().match(/^(create sensor|create person|create vehicle|create asset|association post|event firing)$/)) {
            		++primaryFilesCount;
        		} else if(temp.name.toLowerCase().match(/^(association delete|sensor delete|delete entity)$/)) {
            		++primaryFilesCount;
        		}

            });
       	}
        if(collectionTemp.name === "common") {

            commonCount = collectionTemp.item.length;
            //console.log("commonCount",commonCount);

            collectionTemp.item.forEach(function(temp) {

            	if(temp.name.toLowerCase().match(/^(create sensor|create person|create vehicle|create asset|association post|event firing)$/)) {
            		++primaryFilesCount;
        		} else if(temp.name.toLowerCase().match(/^(association delete|sensor delete|delete entity)$/)) {
            		++primaryFilesCount;
        		}

            });
        }
    });

    //console.log(entity+" primaryFilesCount",primaryFilesCount);

    lineCount = Math.ceil(((entityCount+commonCount)-primaryFilesCount)/threadCount);
    //console.log(entity+" lineCount",lineCount);

    baseCollectionData.item.forEach(function (collectionTemp) {

        if(collectionTemp.name === "access token generation") {
            collectionTemp.item.forEach(function (temp) {
                accessTokenCollection.push(temp);
            });
        }

        if(collectionTemp.name === "refresh token generation") {
            collectionTemp.item.forEach(function (temp) {
                refreshTokenCollection.push(temp);
            });
        }

        if(collectionTemp.name === entity) {
            
            collectionTemp.item.forEach(function (temp) {

                if(temp.name.toLowerCase().match(/^(create sensor|create person|create vehicle|create asset|association post|event firing)$/)) {
                    initCollectionArray.push(temp);
                } else if(temp.name.toLowerCase().match(/^(association delete|sensor delete|delete entity)$/)) {
                    finalCollectionArray.push(temp);
                } else {

                    if(collectionArray.length < lineCount) {
                        collectionArray.push(temp);
                    } else {

                        collectionBuild(threadCount,entity,collectionArray);
                        collectionArray = [];
                        collectionArray.push(temp);
                    }
                }
            });   
        }

        if(collectionTemp.name === "common") {
           
           collectionTemp.item.forEach(function (temp) {

                if(temp.name.toLowerCase().match(/^(create sensor|create person|create vehicle|create asset|association post|event firing)$/)) {
                    initCollectionArray.push(temp);
                } else if(temp.name.toLowerCase().match(/^(association delete|sensor delete|delete entity)$/)) {
                    finalCollectionArray.push(temp);
                } else {

                    if(collectionArray.length < lineCount) {
                        collectionArray.push(temp);
                    } else {

                        collectionBuild(threadCount,entity,collectionArray);
                        collectionArray = [];
                        collectionArray.push(temp);
                    }
                }
            });
        }
    });
	collectionBuild(threadCount,entity,collectionArray);
    /*console.log("tokenGeneration ",accessTokenCollection.length),
    console.log("refreshTokenCollection ",refreshTokenCollection.length);
    console.log(entity+" final",finalCollectionArray.length);
    console.log(entity+" init",initCollectionArray.length);
    console.log(entity+" total fileCount ",totalFileCount);*/
    tokenFilesBuild(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,initFilesBuild);
    collectionArray = [];
    finalCollectionArray = [];
    initCollectionArray = [];
    accessTokenCollection = [];
    refreshTokenCollection = [];
    fileCount = 1;

}

/*
This funciton tokenFileBuild is used to build the token collections and write in repective files
@param1 entity name
@param2 total file count
@param3 init colleciton array
@param4 final colleciton array
@param5 callback function name initFilesBuild
@param5 callback function name finalFilesBuild
@return nothing
*/
function tokenFilesBuild(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,initFilesBuild) {

    var tokenFileName = "./execution_files/accessToken.json";
    var refreshTokenFileName = "./execution_files/refreshToken.json";

    var runtimeFormedTokenCollection = runtimeCollectionFormation(accessTokenCollection);
    var runtimeFormedRefreshTokenCollection = runtimeCollectionFormation(refreshTokenCollection);

    var tokenfileValid = writeFile(tokenFileName,runtimeFormedTokenCollection);
    var refreshTokenfileValid = writeFile(refreshTokenFileName,runtimeFormedRefreshTokenCollection);

    if(tokenfileValid != false && refreshTokenfileValid != false) {
        accessTokenGeneration(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,initFilesBuild);
    } else { 
        console.log("Error in token file building");
    }   
}

/*
This function accessTokenGeneration is used to generate the access token for postman collection run
@param1 entity name
@param2 total seperated entity file count
@param3 init collection array
@param4 final colleciton array
@param5 callback function name finalFilesBuild
@param6 callback function (initFilesBuild)
@return nothing
*/
function accessTokenGeneration(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,callback) {

    var collectionFileName = "./execution_files/accessToken.json";
    var envFileName = "./postman_repository/tokenEnv.json";
    newman.run({
        collection: collectionFileName,
        environment : envFileName,
        reporters: ['json','html']
    }).on('start', function (err, args) { 
        console.log('Access token generation started');
    }).on('done', function (err, summary) {
        if (err || summary.error) {
            console.error('Access token generation process encountered an error.',err);
        }  else {
            
            console.log('Access token generation completed');

            var summaryArray = [];
            var accessTokenExpiryTime;
            if(summary !== null) {

                summary.environment.values.members.forEach(function(item) {

                    var obj = {};
                    if(item["key"] === "expiresIn") {
                        accessTokenExpiryTime = item["value"];
                    }

                    obj.type = item["type"];
                    obj.value = item["value"];
                    obj.key = item["key"];
                    summaryArray.push(obj);
                });
            }

            fs.readFile(envFileName,'utf8',function(err,envData) {
                if(err) {console.log("Error in reading file",err);}

                var tokenEnvironment = JSON.parse(envData);
                var runtimeFormedEnvironment = runtimeEnvironmentFormation(tokenEnvironment,summaryArray);

                if((accessTokenExpiryTime/3600) <= 0.5) {

                    console.log("Refresh token generation");
                    if(runtimeFormedEnvironment != null) {
                        refreshTokenGeneration(runtimeFormedEnvironment,entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,callback);    
                    }

                } else {
                    globalsEnv = runtimeGlobalFormation(runtimeFormedEnvironment,summaryArray);
                    /*console.log("globalsEnv",globalsEnv);
*/                    callback(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild);
                }
            });
        }
    });
}

/*
This method refeshTokenGeneration is used to generate the refresh token
This method invokes if access token generation exceeds the time limit
@param1 runtime formed environment
@param2 entity name
@param3 total entity file count
@param4 init colleciton array
@param5 final collection array
@param6 callback function name finalFilesBuild
@param7 callback function which calls initFilesBuild
@return nothing
*/

function refreshTokenGeneration(runtimeFormedEnvironment,entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild,callback) {

    var collectionFileName = './execution_files/refreshToken.json';

    newman.run({
        collection: collectionFileName,
        environment : runtimeFormedEnvironment,
        reporters: ['json','html']
    }).on('start', function (err, args) { 
        console.log('refresh token generation test starts');
    }).on('done', function (err, summary) {
        if (err || summary.error) {
            console.error('Refresh token generation encountered an error',err);
        }  else {
            console.log('Refresh token generation completed.');

            var summaryArray = [];
            var expiryValue;
            if(summary !== null) {

                summary.environment.values.members.forEach(function(item) {

                    var obj = {};

                    obj.type = item["type"];
                    obj.value = item["value"];
                    obj.key = item["key"];
                    summaryArray.push(obj);
                });
            }

            globalsEnv = runtimeGlobalFormation(runtimeFormedEnvironment,summaryArray);
            /*console.log("globalsEnv",globalsEnv);*/
            callback(entity,totalFileCount,initCollectionArray,finalCollectionArray,finalFilesBuild);
        }
    });
}

/*
This method runtimeGlobalFormation is used to form the runtime Global environment
@param1 default environment data
@param2 array formed in previous run summary
@return nothing
*/
function runtimeGlobalFormation(envJson,valueArray) {

    var runtimeGlobals = {

        "id" : envJson.id,
        "name" : envJson.name,
        "values" : valueArray,
        "timestamp" : envJson.timestamp,
        "_postman_variable_scope"  : "globals",
        "_postman_exported_at" : envJson._postman_exported_at,
        "_postman_exported_using" : envJson._postman_exported_using
    }

    return runtimeGlobals;
}

/*
This method runtimeEnvironmentFormation is used to form the runtime environment
@param1 default environment data
@param2 array formed in previous run summary
@return nothing
*/
function runtimeEnvironmentFormation(envJson,valueArray) {

    var runtimeEnvironment = {

        "id" : envJson.id,
        "name" : envJson.name,
        "values" : valueArray,
        "timestamp" : envJson.timestamp,
        "_postman_variable_scope"  : envJson._postman_variable_scope,
        "_postman_exported_at" : envJson._postman_exported_at,
        "_postman_exported_using" : envJson._postman_exported_using
    }

    return runtimeEnvironment;
}

/*
This method newmanInit is used to run the newman to run the initial formed entity files
@param1 entity name
@param2 file count
@return nothing
*/
function newmanInit(entity,fileCount) {

    var collectionFileName = "./execution_files/"+entity+"Init.json";
    var envFileName = "./postman_repository/"+entity+"Env.json";
    /*console.log("globalsEnv",globalsEnv);*/

	newman.run({
        collection: collectionFileName,
        globals : globalsEnv,
        environment : envFileName,
        reporters: ['json','html']
    }).on('start', function (err, args) { 
        console.log(entity+' Init starts');
    }).on('done', function (err, summary) {
        if (err || summary.error) {
            console.error(entity+' init collection run encountered an error.');
        }   else {
                console.error(entity+' init collection run completed.');

                var summmaryArray = [];
                var runtimeFormedEnvironment;
                
                if(summary !== null) {

                    summary.environment.values.members.forEach(function(item) {

                        var obj = {};
                        obj.type = item["type"];
                        obj.value = item["value"];
                        obj.key = item["key"];
                        summmaryArray.push(obj);
                    });
                }

                fs.readFile(envFileName,'utf8',function(err,envData) {
        
                    if(err) { console.log("Error in reading file",err);}

                    var entityEnvironment = JSON.parse(envData);
                    runtimeFormedEnvironment = runtimeEnvironmentFormation(entityEnvironment,summmaryArray);
                    console.log(entity+" environment ",JSON.stringify(runtimeFormedEnvironment));

                    if(runtimeFormedEnvironment != null) {
                        newmanTest(entity,fileCount,runtimeFormedEnvironment);
                    }
                    
                });
        }
    });
}

/*
This method newmanTest is used to run the newman to run the whole test
@param1 entity name
@param2 file count
@param3 formed runtime environment
@return nothing
*/
function newmanTest(entity,fileCount,runtimeFormedEnvironment) {

    for(var i=1; i<=fileCount; i++) {

        var collectionFileName = require("./execution_files/"+entity+i+".json");
        newman.run({
            collection: collectionFileName,
            globals : globalsEnv,
            environment : runtimeFormedEnvironment,
            reporters: ['json','html']
        }).on('start', function (err, args) { 
            console.log(entity+' test starts');
        }).on('done', function (err, summary) {
            if (err || summary.error) {
                console.error(entity+' collection run encountered an error.');
            }  else {
                console.log(entity+" i "+i);
                console.log(entity+' collection run completed.');
            }
        });
    }
}

/*
This method directoryClear is used to clear the previous file in given directory
@param1 dir name
@return nothing
*/
function directoryClear(dir) {

    fs.readdir(dir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(dir, file), err => {
                if (err) throw err;
            });
        }
    });
}

/*
This is the first point where newman.js starts its execution
Get the user feed data in the command line and validate the user data
@param. node process feed
*/
if(process.argv.length != 5) {
	console.log("Enter valid .js file followed by Entity name, Testing type and Thread count to start the Automation \n");
    console.log("Example : node <file name>.js <entity name> <testing type> <threadCount>");
} else {

    var executionFilePath = './execution_files';
    var newmanFilePath = './newman';
    
    /*
    This if else condition checks respective directory is available or not
    if directory available then clear the previous execution file for new execution
    @param. directory name
    */
    if (!fs.existsSync(executionFilePath)){
        fs.mkdirSync(executionFilePath);
    } else {
        directoryClear(executionFilePath);
    }

    if(fs.existsSync(newmanFilePath)) {
        directoryClear(newmanFilePath);
    }

    var argv = [process.argv[2],process.argv[3],process.argv[4]];
    validate(argv,baseCollectionFileRead);
} 
