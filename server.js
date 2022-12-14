const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cookieParser = require('cookie-parser');
const fileupload = require('express-fileupload');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

//Load env file
dotenv.config({path: './config/config.env'});

//Connect to DB
connectDB();

//Route files
const bootcamps = require('./routes/bootcamps');
const courses = require('./routes/courses');
const auth = require('./routes/auth');

const app = express();

//Body parser
app.use(express.json());

//Cookie parser
app.use(cookieParser());

//Dev logging middleware
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

//File uploading
app.use(fileupload());

//Set static folder (accessible from browser)
app.use(express.static(path.join(__dirname, 'public')));

//Mount routers
app.use('/api/v1/bootcamps', bootcamps);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);

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