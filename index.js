const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 5000;


const uri = process.env.MONGODB_URI

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
console.log(JWKS, "JWKS")

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next) => {
  console.log(`${req.method} | ${req.url}`)
  next();
};

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log(req.headers, "from verify token");
  const token = authorization?.split(' ')[1];
  // console.log(token)

  if (!token) {
    return res.status(401).json({ message: "Unauthorize" })
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    const { payload } = await jwtVerify(token, JWKS)
    req.user = payload;


    next();
  } catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({ message: "Unauthorize" })
  }


}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = client.db("studynookdb");
    const roomsCollection = db.collection("rooms");

    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/featured", async (req, res) => {
      const cursor = roomsCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/rooms/:roomId", logger, verifyToken, async (req, res) => {
      console.log(req.user, "request")
      const { roomId } = req.params;
      const query = { _id: new ObjectId(roomId) }
      const result = await roomsCollection.findOne(query);
      res.send(result)
      // console.log(roomId)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});