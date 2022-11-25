const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

//Load env file
dotenv.config({path: './config/config.env'});

//Connect to DB
connectDB();

//Route files
const bootcamps = require('./routes/bootcamps');

const app = express();

//Body parser
app.use(express.json());

//Dev logging middleware
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

//Mount routers
app.use('/api/v1/bootcamps', bootcamps);

app.use(errorHandler);

//Serve application
const PORT = process.env.PORT || 5001;
const server = app.listen(
    PORT, 
    console.log('Server running in: '+process.env.NODE_ENV)
);

//Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise)=>{
    console.log('Error: '+err.message.red);

    //Close server and kill process
    server.close(() => process.exit(1));
})