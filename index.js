const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const cors = require('cors');
port = process.env.PORT || 5000;

// Middle ware
app.use(cors());
app.use(express.json());



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

        // get single user order
        app.get('/myorders', async (req, res) => {
            const email = req.query.email;
            const orders = await orderCollection.find({ email: email }).toArray();
            res.send(orders);
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
            const result = await userCollection.insertOne(user);
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
            // console.log(isAdmin);
            res.json({ admin: isAdmin });
        })

    } catch (err) {
        // console.log(err);
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