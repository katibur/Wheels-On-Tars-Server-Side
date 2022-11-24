const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const { MongoClient, ServerApiVersion } = require('mongodb');

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
        })

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


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                name: booking.productName,
                price: booking.price,
                customer: booking.customerName,
                location: booking.location,
                email: booking.email,
                phone: booking.phone
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have booked ${booking.name}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

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