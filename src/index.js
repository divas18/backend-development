// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from './db/index.js';

dotenv.config({
    path: "./env"
})


connectDB();

/*
Approch 1 to connect to dataBase

import express from "express" 
const app = express()

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on("error", (error) => {
            console.log("error", error);
            throw error;
        });

        app.listen(process.listen.PORT, () => {
            console.log("App is Listening on ", process.env.PORT)
        })
    } catch(err) {
        console.error(err);
    }
})();

*/