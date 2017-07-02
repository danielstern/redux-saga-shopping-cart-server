const express = require('express');
const cors = require('cors');
const port = 8081;
const app = new express();
YAML = require('yamljs');

const serverDelayConstant = 100;
// Simulate a small amount of delay to demonstrate app's async features
app.use((req,res,next)=>{
    const delay = (Math.random() * 15 + 5) * serverDelayConstant;
    setTimeout(next,delay);
});

app.use(express.static('public'));

nativeObject = YAML.load('database.yml',(database)=>{
	
	const makeCartAdjustmentRoute = (shouldAdd = true) => (req,res)=>{
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

	
        const existingItem = cart.items.find(cartItem=>cartItem.id === itemID);
        if (existingItem) {
			if (shouldAdd && parseInt(existingItem.quantity) >= parseInt(item.quantityAvailable)) {
				return res.status(503)
				.json({
					error:"An insufficient quantity of items remains.",
					itemID,
					quantityAvailable:item.quantityAvailable
				});
			}
            existingItem.quantity += (shouldAdd ? 1 : -1);
            if (existingItem.quantity === 0) {
                cart.items = cart.items.filter(item=>item.id !== itemID);
            }
        } else {
            if (shouldAdd) {
                cart.items.push({
                    quantity:1,
                    id:itemID
                })
            } else {
                return res.status(500)
                    .json({
                        error:"No item with the specified ID exists in the cart to be removed",
                        owner,
                        itemID
                    })
            }

        }
        res
            .status(200)
            .send(cart);
    }

    app.get("/cart/add/:owner/:itemID",makeCartAdjustmentRoute(true));
    app.get("/cart/remove/:owner/:itemID",makeCartAdjustmentRoute(false));
   
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
	
	app.use(["/cart/validate/:owner","/cart/:owner","/card/charge/:owner"],(req,res,next)=>{
		const { owner } = req.params;
		const cart = database.carts.find(cart=>cart.owner === owner);
		if (!cart){
			return res
				.status(404)
				.json({error:"No cart with the specified owner",owner});
		}
		else {
			req.cart = cart;
			next();
		}
	});
	
	app.get("/cart/validate/:owner",(req,res)=>{
		const { items } = req.cart;		
		let validated = true;
		let error = null;
		items.forEach(({id,quantity})=>{
			const item = database.items.find(item => item.id === id);
			if (item.quantityAvailable < quantity) {
				validated = false;
				error = "There is an insufficient quantity of " + id;
			}
		});;
		res
			.status(200)
			.json({validated,error});
		
	});
	
	
	app.get("/cart/:owner",(req,res)=>{
		const cart = req.cart;
		res
			.status(200)
			.json(cart);
		
	});
	
	app.use(["/card/validate/:owner","/card/charge/:owner"],(req,res, next)=>{
		const {owner} = req.params;
		const card = database.cards.find(card=>card.owner === owner);
		if (!card){
			res.status(500).send({error:`No card is available for user ${owner}`});
		}
		req.card = card;
		next();
	});
	
	app.get("/card/validate/:owner",(req,res)=>{
		const {card} = req;
		res
		.status(200)
		.json({validated:true});
	});
	
	app.get("/card/charge/:owner",(req,res)=>{
		const {card, cart} = req;
		const { owner } = req.params;
		const country = database.users.find(user=>user.id === owner).country;
		const total = cart.items.reduce((total,{quantity,id})=>{
			const item = database.items.find(item=>item.id === id);
			const symbol = country === "CAD" ? "cad" : "usd";
			const baseValue = item[symbol];
			total += baseValue * quantity;
			return total;
		},0);
		
		if (card.availableFunds <= total) {
			return res
				.status(402)
				.json({success:false});
		}
		
		card.availableFunds -= total;
		res
			.status(201)
			.send({success:true});	
			
		
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
				.json(items);
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

    app.get('/shipping/:items',(req,res)=>{
        const ids = req.params.items.split(',');
        let total = 0;
        ids.forEach(id=>{
            const item = database.items.find(item=>item.id === id);
            if (item.weight === 0) {
                total += 0;
            } else if (item.weight < 0.5) {
                total += 3.5;
            } else {
                total += 8.5;
            }
        });
        res
            .status(200)
            .json({
                total
            });
    });

    app.get('/tax/:symbol',(req,res)=>{
        const { symbol } = req.params;
        const taxRate = database.taxRates.find(rate=>rate.symbol === symbol);
        if (!taxRate) {
            return res
                .status(500)
                .json({
                    symbol,
                    error:"No tax rate info for symbol " + symbol
                });
        }

        res
            .status(200)
            .json({
                rate:taxRate.rate
            })

    });

    app.listen(port,()=>{
        console.log(`Redux Saga Cart backend server is listening on ${port}`)
    });
});
app.use(cors());

