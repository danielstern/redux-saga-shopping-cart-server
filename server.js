const express = require('express');
const cors = require('cors');
const port = 8081;
const app = new express();
YAML = require('yamljs');

nativeObject = YAML.load('database.yml',(result)=>{
    console.log("Loaded YAML", result);


    app.get("/user/:id",(req,res)=>{
        const id = req.params.id;
        const user = result.users.find(user=>user.id === id);
        if (!user) {
            return res
                .status(500)
                .json({
                    error:"No user with the specified ID",
                    id
                })
        } else {
            res
                .status(200)
                .json(user)
        }
    })

    app.get("/items/:ids",(req,res)=>{
        const ids = req.params.ids.split(',');
        const items = ids.map(id=>result.items.find(item=>item.id===id));
        if (items.includes(undefined)) {
            res
                .status(500)
                .json({error:"A specified ID had no matching item"});
        } else {
            res
                .status(200)
                .json(items.map(item=>({
                    id: item.id,
                    description:item.description,
                    name: item.name,
                    img: item.img
                })));
        }
    });

    app.get("/prices/:symbol/:ids",(req,res)=>{
        const ids = req.params.ids.split(',');
        const items = ids.map(id=>result.items.find(item=>item.id===id));
        const supportedSymbols = ["CAD","USD"];
        const symbol = req.params.symbol;
        if (!supportedSymbols.includes(symbol)) {
            return res
                .status(403)
                .json({
                    error:"The currency symbol provided is inaccurate, see list of supported currencies",
                    supportedSymbols
                })
        }


        if (items.includes(undefined)) {
            return res
                .status(500)
                .json({error:"A specified ID had no matching item"});
        } else {
            res
                .status(200)
                .json(items.map(item=>({
                    id: item.id,
                    symbol,
                    price:symbol === "USD" ? item.usd : item.cad
                })));
        }
    });

    app.listen(port,()=>{
        console.log(`Redux Saga Cart backend server is listening on ${port}`)
    });
});
app.use(cors());

