const express = require('express');
const cors = require('cors');
const port = 8081;
const app = new express();
YAML = require('yamljs');

nativeObject = YAML.load('database.yml',(database)=>{
    console.log("Loaded YAML", database);

    app.get("/user/:id",(req,res)=>{
        const id = req.params.id;
        const user = database.users.find(user=>user.id === id);
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
    });

    app.get("/cart/add/:owner/:itemID",(req,res)=>{
        const { owner, itemID } = req.params;
        const cart = database.carts.find(cart=>cart.owner === owner);
        if (!cart) {
            return res
                .status(500)
                .json({
                    error:"No cart found with the specified ID",
                    owner
                })

        }

        const item = database.items.find(item => item.id === itemID);
        if (!item) {
            return res
                .status(500)
                .json({
                    error:"No item found with the specified ID",
                    itemID
                })
        }

        // console.log("Cart?",cart);
        const existingItem = cart.items.find(cartItem=>cartItem.id === itemID);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({
                quantity:1,
                id:itemID
            })
        }
        res
            .status(200)
            .send(cart);
    });

    app.get("/items/:ids",(req,res)=>{
        const ids = req.params.ids.split(',');
        const items = ids.map(id=>database.items.find(item=>item.id===id));
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
        const items = ids.map(id=>database.items.find(item=>item.id===id));
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

