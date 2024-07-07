const express = require('express');
const app = express();

const { Datastore } = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const datastore2 = new Datastore();

const BOAT = "Boat";
const LOAD = "Load";

const router = express.Router();
const url = "https://cronkd-assignment4.wl.r.appspot.com";

const offset = 3;
const limit = 3;

app.use(bodyParser.json());

function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

/* ------------- Begin Lodging Model Functions ------------- */
function post_boat(name, type, length) {
    var key = datastore2.key(BOAT);
    const new_boat = { "name": name, "type": type, "length": length, "loads": [] };
    return datastore2.save({ "key": key, "data": new_boat }).then(() => { return key });
}

function post_load(vol, item, date) {
    var key = datastore2.key(LOAD);
    const new_load = { "volume": vol, "item": item, "creation_date": date, "carrier": null };
    return datastore2.save({ "key": key, "data": new_load }).then(() => { return key });
}

function get_boats() {
    const q = datastore2.createQuery(BOAT);
    return datastore2.runQuery(q).then((entities) => {
        return entities[0].map(fromDatastore);
    });
}

function get_loads() {
    const q = datastore2.createQuery(LOAD);
    return datastore2.runQuery(q).then((entities) => {
        return entities[0].map(fromDatastore);
    });
}

/**
 * This function is not in the code discussed in the video. It demonstrates how
 * to get a single entity from Datastore using an id.
 * Note that datastore.get returns an array where each element is a JSON object 
 * corresponding to an entity of the Type "Lodging." If there are no entities
 * in the result, then the 0th element is undefined.
 * @param {number} id Int ID value
 * @returns An array of length 1.
 *      If a lodging with the provided id exists, then the element in the array
 *           is that lodging
 *      If no lodging with the provided id exists, then the value of the 
 *          element is undefined
 */
function get_boat(id) {
    const key = datastore2.key([BOAT, parseInt(id, 10)]);
    return datastore2.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            return entity;
        } else {
            return entity.map(fromDatastore);
        }
    });
}

function get_load(id) {
    const key = datastore2.key([LOAD, parseInt(id, 10)]);
    return datastore2.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            return entity;
        } else {
            return entity.map(fromDatastore);
        }
    });
}

function put_boat(bid, lid, name, type, length, vol, item, date, boat_load) {
    const key = datastore2.key([BOAT, parseInt(bid, 10)]);
    const key2 = datastore2.key([LOAD, parseInt(lid, 10)]);
    boat_load.push({ "id": lid, "self": url+"/loads/"+lid });
    const boat = { "name": name, "type": type, "length": length, "loads": boat_load };
    const load = { "volume": vol, "item": item, "creation_date": date, "carrier": { "id": bid, "name": name, "self": url+"/boats/"+bid } }
    datastore2.save({ "key": key, "data": boat });
    return datastore2.save({ "key": key2, "data": load });
}

function remove_load(bid,lid, name, type, len, vol, item, date, boat_load, x) {
    const key = datastore2.key([BOAT, parseInt(bid, 10)]);
    const key2 = datastore2.key([LOAD, parseInt(lid, 10)]);
    for (let idx = 0; idx < boat_load.length; idx++) {
        if (boat_load[idx].id == lid) {
            boat_load.splice(idx,1);
            break;
        }
    }
    if (x == 1) {
        const boat = { "name": name, "type": type, "length": len, "loads": boat_load };
        const load = { "volume": vol, "item": item, "creation_date": date, "carrier": null };
        datastore2.save({ "key": key, "data": boat });
        return datastore2.save({ "key": key2, "data": load });
    }
    if (x == 2) {
        const boat = { "name": name, "type": type, "length": len, "loads": boat_load };
        return datastore2.save({ "key": key, "data": boat });
    }
    if (x == 3) {
        const load = { "volume": vol, "item": item, "creation_date": date, "carrier": null };
        return datastore2.save({ "key": key2, "data": load });
    }
}

function delete_boat(bid,loads) {
    const key = datastore2.key([BOAT, parseInt(bid, 10)]);
    const temp_loads = loads;
    if (loads.length != 0){
        for (idx = 0; idx < loads.length; idx++){
            get_load(loads[idx].id)
            .then(load => {
                remove_load(bid,load[0].id,"temp","temp",0,load[0].volume,load[0].item,load[0].creation_date,temp_loads,3);
            });
        }
    }
    return datastore2.delete(key);
}

function delete_load(lid,carrier) {
    const key = datastore2.key([LOAD, parseInt(lid, 10)]);
    if (carrier != null){
        get_boat(carrier.id)
            .then(boat => {
                remove_load(boat[0].id,lid,boat[0].name,boat[0].type,boat[0].length,0,"temp","temp",boat[0].loads,2);
            });
    }
    return datastore2.delete(key);
}


/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/boats', function (req, res) {
    const boats = get_boats()
        .then((boats) => {
            let len = boats.length;
            const boat_arr = { "boats": [] };
            if (len > 3){
                for (let i = 0; i < 3; i++){
                    boat_arr.boats.push(boats[i])
                }
                boat_arr.page = 1;
                boat_arr.next = url + "/boats/page/2";
            }
            else {
                for (let i = 0; i < len; i++){
                    boat_arr.boats.push(boats[i])
                }
            }
            res.status(200).json(boat_arr);
        });
});

router.get('/boats/page/:num', function (req, res) {
    const boats = get_boats()
        .then((boats) => {
            let len = boats.length;
            const boat_arr = { "boats": [] };
            if (len > 3*req.params.num){
                for (let i = (3*(req.params.num - 1)); i < (req.params.num*3); i++){
                    boat_arr.boats.push(boats[i]);
                }
                boat_arr.page = req.params.num;
                boat_arr.next = url + "/boats/page/"+req.params.num+1;
            }
            else {
                for (let i = (3*(req.params.num - 1)); i < len; i++){
                    boat_arr.boats.push(boats[i]);
                    boat_arr.page = req.params.num;                    
                }
            }
            res.status(200).json(boat_arr);
        });
});

router.get('/loads', function (req, res) {
    const loads = get_loads()
        .then((loads) => {
            let len = loads.length;
            const load_arr = { "loads": [] };
            if (len > 3){
                for (let i = 0; i < 3; i++){
                    load_arr.loads.push(loads[i])
                }
                load_arr.page = 1;
                load_arr.next = url + "/loads/page/2";
            }
            else {
                for (let i = 0; i < len; i++){
                    load_arr.loads.push(loads[i])
                }
            }
            res.status(200).json(load_arr);
        });
});

router.get('/loads/page/:num', function (req, res) {
    const loads = get_loads()
        .then((loads) => {
            let len = loads.length;
            const load_arr = { "loads": [] };
            if (len > 3*req.params.num){
                for (let i = (3*(req.params.num - 1)); i < (req.params.num*3); i++){
                    load_arr.loads.push(loads[i]);
                }
                load_arr.page = req.params.num;
                load_arr.next = url + "/loads/page/"+req.params.num+1;
            }
            else {
                for (let i = (3*(req.params.num - 1)); i < len; i++){
                    load_arr.loads.push(loads[i]);
                    load_arr.page = req.params.num;                    
                }
            }
            res.status(200).json(load_arr);
        });
});


router.post('/boats', function (req, res) {
    if (JSON.stringify(req.body).includes("name") && JSON.stringify(req.body).includes("type") && JSON.stringify(req.body).includes("length")) {
        post_boat(req.body.name, req.body.type, req.body.length).then(key => { res.status(201).send(JSON.stringify({ id: key.id, name: req.body.name, type: req.body.type, length: req.body.length, loads: [], self: url + "/boats/"+ key.id })).redirect(url+"/boats/"+key.id)});        
    }
    else {
        const obj = {Error: "The request object is missing at least one of the required attributes"};
        var data = JSON.stringify(obj)
        res.status(400).send(data);
    }
});

router.post('/loads', function (req, res) {
    if (JSON.stringify(req.body).includes("volume") && JSON.stringify(req.body).includes("item") && JSON.stringify(req.body).includes("creation_date")) {
        post_load(req.body.volume, req.body.item, req.body.creation_date).then(key => { res.status(201).send(JSON.stringify({ id: key.id, volume: req.body.volume, item: req.body.item, creation_date: req.body.creation_date, carrier: null, self: url + "/loads/"+ key.id})).redirect(url+"/loads/"+key.id)});        
    }
    else {
        const obj = {Error: "The request object is missing at least one of the required attributes"};
        var data = JSON.stringify(obj)
        res.status(400).send(data);
    }
});

router.put('/boats/:bid/loads/:lid', function (req, res) {
    get_boat(req.params.bid)
    .then(boat => {
        get_load(req.params.lid)
        .then(load => {
            if (boat[0] === undefined || boat[0] === null || load[0] === undefined || load[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "The specified boat and/or load does not exist" }));
            } else if (load[0].carrier != null){
                res.status(403).send(JSON.stringify({ Error: "The load is already loaded on another boat" }));
            }
            else{                               
                put_boat(boat[0].id, load[0].id, boat[0].name, boat[0].type, boat[0].length, load[0].volume, load[0].item, load[0].creation_date, boat[0].loads)
                .then(res.status(204).end());
            }
        });
    });
});     

router.delete('/boats/:id', function (req, res) {
    get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No boat with this boat_id exists" }));
            } else {
                delete_boat(req.params.id,boat[0].loads).then(res.status(204).end())
            }
        });
});

router.delete('/loads/:id', function (req, res) {
    get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No load with this load_id exists" }));
            } else {
                delete_load(req.params.id,load[0].carrier).then(res.status(204).end())
            }
        });
});

router.delete('/boats/:bid/loads/:lid', function (req, res) {
    get_boat(req.params.bid)
    .then(boat => {
        get_load(req.params.lid)
        .then(load => {
            if (boat[0] === undefined || boat[0] === null || load[0] === undefined || load[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No boat with this boat_id is loaded with the load with this load_id" }));
            } else if (JSON.stringify(load[0].carrier).includes(req.params.bid)){
                remove_load(boat[0].id, load[0].id, boat[0].name, boat[0].type, boat[0].length, load[0].volume, load[0].item, load[0].creation_date, boat[0].loads,1)
                .then(res.status(204).end());
            }
            else{                             
                res.status(404).send(JSON.stringify({ Error: "No boat with this boat_id is loaded with the load with this load_id" }));
            }
        });
    });
});


router.get('/boats/:id', function (req, res) {
    get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No boat with this boat_id exists" }));
            } else {
                res.status(200).send(JSON.stringify({ id: boat[0].id, name: boat[0].name, type: boat[0].type, length: boat[0].length, loads: boat[0].loads, self: url + "/boats/"+boat[0].id}));
            }
        });
});

router.get('/boats/:id/loads', function (req, res) {
    get_boat(req.params.id)
        .then(boat => {
            if (boat[0] === undefined || boat[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No boat with this boat_id exists" }));
            } else {
                let arr = [];
                let new_load;
                for (i in boat[0].loads) {
                    get_load(i.id)
                    .then(load => {
                        new_load = { id: load[0].id, volume: load[0].volume, item: load[0].item, creation_date: load[0].creation_date, carrier: load[0].carrier, self: url + "/loads/"+load[0].id};
                        arr.push(new_load);                        
                    });
                }       
                const data = { "loads": arr };         
                res.status(200).send(JSON.stringify(data));
            }
        });
});

router.get('/loads/:id', function (req, res) {
    get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                res.status(404).send(JSON.stringify({ Error: "No load with this load_id exists" }));
            } else {
                res.status(200).send(JSON.stringify({ id: load[0].id, volume: load[0].volume, item: load[0].item, creation_date: load[0].creation_date, carrier: load[0].carrier, self: url + "/loads/"+load[0].id}));
            }
        });
});

/* ------------- End Controller Functions ------------- */

app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
