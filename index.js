const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.aqlapfl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const usersCollection = client.db('wot').collection('users');
        const categoriesCollections = client.db('wot').collection('categories');
        const productsCollections = client.db('wot').collection('products');
        const bookingsCollection = client.db('wot').collection('bookings');
        const paymentsCollection = client.db('wot').collection('payments');
        const advertisedCollection = client.db('wot').collection('advertisedItems');
        const wishlistCollections = client.db('wot').collection('wishlist');
        const reportedItemsCollection = client.db('wot').collection('reportedItems');


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        };

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.get('/users/admin/:id', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        // delete any user from AllUsers Route
        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });

        // verification for seller
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        });

        // verification for buyer
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        });


        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        });


        // for categories
        app.get('/categories', async (req, res) => {
            const query = {}
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { category_id: id }
            const result = await productsCollections.find(filter).toArray();
            res.send(result);
        });

        // seller's addProduct,myProducts
        app.post('/addProduct', async (req, res) => {
            const query = req.body;
            console.log(query);
            const result = await productsCollections.insertOne(query);
            res.send(result);
        });

        app.get('/myProducts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await productsCollections.find(query).toArray();
            res.send(bookings);
        });

        // delete products of seller
        app.delete('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productsCollections.deleteOne(filter);
            res.send(result);
        });

        // advertising for seller
        app.post('/advertisedItems', async (req, res) => {
            const advertised = req.body;
            const query = {
                _id: advertised._id,
            }
            console.log(query);
            const alreadyBooked = await advertisedCollection.find(query).toArray();
            if (alreadyBooked.length > 0) {
                const message = `You already have advertised ${advertised.name}`
                return res.send({ acknowledged: false, message })
            }
            const result = await advertisedCollection.insertOne(advertised);
            res.send(result);
        });

        // get all advertised items
        app.get('/advertisedItems', async (req, res) => {
            const query = {};
            const advertised = await advertisedCollection.find(query).toArray();
            res.send(advertised);
        });

        // delete advertised items
        app.delete('/advertisedItems/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: id }
            console.log(filter);
            const result = await advertisedCollection.deleteOne(filter);
            res.send(result);
        });

        // get all users
        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // for booking
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        });

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;

            const query = {
                productName: booking.productName,
                email: booking.email,
                customerName: booking.customerName
            }
            console.log(query);
            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length > 0) {
                const message = `You already have booked ${booking.productName}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        // wishlist post
        app.post('/wishlist', async (req, res) => {
            const wished = req.body;

            const query = {
                productName: wished.productName,
                email: wished.email,
                sellerName: wished.sellerName
            }
            console.log(query);
            const alreadyBooked = await wishlistCollections.find(query).toArray();

            if (alreadyBooked.length > 0) {
                const message = `You already have wished for ${wished.productName}`
                return res.send({ acknowledged: false, message })
            }

            const result = await wishlistCollections.insertOne(wished);
            res.send(result);
        });

        // wishlist get
        app.get('/wishlist', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await wishlistCollections.find(query).toArray();
            res.send(bookings);
        });

        // reported item post
        app.post('/reportedItems', async (req, res) => {
            const wished = req.body;

            const query = {
                productName: wished.productName,
                email: wished.email,
                sellerName: wished.sellerName
            }
            console.log(query);
            const alreadyBooked = await reportedItemsCollection.find(query).toArray();

            if (alreadyBooked.length > 0) {
                const message = `You already have reported ${wished.productName}`
                return res.send({ acknowledged: false, message })
            }

            const result = await reportedItemsCollection.insertOne(wished);
            res.send(result);
        });

        // reportedItems get
        app.get('/reportedItems', async (req, res) => {
            const query = {};
            const bookings = await reportedItemsCollection.find(query).toArray();
            res.send(bookings);
        });

        // reported items delete
        app.delete('/reportedItems/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await reportedItemsCollection.deleteOne(filter);
            res.send(result);
        });


        // for payment
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.log)

app.get('/', async (req, res) => {
    res.send('wheels on tars is running');
})

app.listen(port, () => {
    console.log(`wheels on tars running on port: ${port}`)
})