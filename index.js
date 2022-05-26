const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const app = express();
port = process.env.PORT || 5000;

// Middle ware
app.use(cors());
app.use(express.json());


const verifyToken = (req, res, next) => {
    const token = req.headers?.authorization?.split(' ')[1];
    // console.log(token);
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access', statusCode: 403 });
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qspqh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        await client.connect();
        const db = client.db('Portion_Tags');
        const productCollection = db.collection('products');
        const orderCollection = db.collection('orders');
        const reviewCollection = db.collection('reviews');
        const userCollection = db.collection('users');
        const paymentCollection = db.collection('payments');

        // Get all products
        app.get('/products', async (req, res) => {
            const products = await productCollection.find().toArray();
            res.send(products);
        });

        // Get a product by id
        app.get('/products/:id', async (req, res) => {
            const product = await productCollection.findOne({ _id: ObjectId(req.params.id) });
            res.send(product);
        });

        // Post order to database
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // Post a product to database
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        // get all orders
        app.get('/orders', async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        });

        // get single user orders
        app.get('/myorders', verifyToken, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            // console.log(decodedEmail === email);
            if (decodedEmail === email) {
                const orders = await orderCollection.find({ email: email }).toArray();
                res.send(orders);
            }
            else {
                res.status(403).send({ message: "Forbidden access", statusCode: 403 });
            }

        })

        // delete and order
        app.delete('/orders/:id', async (req, res) => {
            const result = await orderCollection.deleteOne({ _id: ObjectId(req.params.id) });
            res.send(result);
        });

        // Update order status
        app.put('/orders/:id', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.updateOne({ _id: ObjectId(req.params.id) }, { $set: { status: order.status } });
            res.send(result);
        });

        // Post client review
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // Delete a product
        app.delete('/product/:id', async (req, res) => {
            const result = await productCollection.deleteOne({ _id: ObjectId(req.params.id) });
            res.send(result);
        });

        // Put user to db
        app.put('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.updateOne({ email: user.email }, { $set: user }, { upsert: true });
            res.send(result);
        });

        // Is admin API
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            let isAdmin = false;
            if (user) {
                if (user.role === 'admin') {
                    isAdmin = true;
                }
                else {
                    isAdmin = false;
                }
            }
            res.json({ admin: isAdmin });
        })

        // update a user
        app.put('/user/:id', async (req, res) => {
            const userInfo = req.body;
            const result = await userCollection.updateOne({ _id: ObjectId(req.params.id) }, { $set: { userInfo } }, { upsert: true });
            res.send(result);
        });

        // Get user by email
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            res.send(user);
        });

        // Make admin
        app.put('/make-admin/:email', async (req, res) => {
            const email = req.body.email;
            const CurrentUserEmail = req.params.email;
            const user = await userCollection.findOne({ email: CurrentUserEmail });
            console.log(user);
            if (!user) {
                res.json('403 Forbidden')
            }
            else if (user.role === 'admin') {
                const filter = { email: email };
                const dbUser = await userCollection.findOne(filter);
                if (dbUser) {
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
                else {
                    res.json({ error: `We Couldn't find this ${email} user` });
                }
            }
            else {
                res.json({ error: "You are not authorize" });
            }

        });

        // jwt Login
        app.post('/login', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });
            res.send({ token });
        });

        // get all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        });

        // Get an order by id
        app.get('/order/:id', async (req, res) => {
            const order = await orderCollection.findOne({ _id: ObjectId(req.params.id) });
            res.send(order);
        });
        //  transaction 
        // update an order
        app.put('/order/:id', async (req, res) => {
            const order = req.body;
            console.log(order);
            const transactionId = order.transactionId;
            console.log(transactionId);
            const result = await orderCollection.updateOne({ _id: ObjectId(req.params.id) }, { $set: { transactionId, paid: true } });
            const paymentInfo = await paymentCollection.insertOne(order);;
            res.send(result);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const { amount } = req.body;
            if (!amount) {
                return;
            }
            // console.log(amount);
            const convertedAmount = parseInt(amount * 100);
            console.log(convertedAmount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: convertedAmount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })



    } catch (err) {

    }
    finally {
        // client.close();
    }
}

app.get('/', (req, res) => {
    res.send('Portion Tags Server Running');
})

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})