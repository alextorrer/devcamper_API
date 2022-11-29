const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');

//@desc         Get all bootcamps
//@route        GET /api/v1/bootcamps
//@access       Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
    let query;
    const reqQuery = { ...req.query };

    //Fields to exclude from query
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);

    //Convert query operators to mongo operators "($operator)"
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => '$'+match);

    //Finding resource
    query = Bootcamp.find(JSON.parse(queryStr)).populate('courses');

    //Select fields
    if(req.query.select){
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    //Sorting
    if(req.query.sort){
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    }else{
        query = query.sort('-createdAt');
    }

    //Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Bootcamp.countDocuments();

    query = query.skip(startIndex).limit(limit);

    //Execute query
    const bootcamps = await query;

    //Pagination result
    const pagination = {};

    if(endIndex < total){
        pagination.next = {
            page: page + 1,
            limit: limit
        }
    }

    if(startIndex > 0){
        pagination.prev = {
            page: page - 1,
            limit: limit
        }
    }

    res
        .status(200)
        .json({
            success: true,
            count: bootcamps.length,
            pagination: pagination,
            data: bootcamps
    });
});

//@desc         Get a single bootcamp
//@route        GET /api/v1/bootcamps/:id
//@access       Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if(!bootcamp){
        return next(new ErrorResponse("Bootcamp not found with id of "+req.params.id, 404));
    }

    res.status(200).json({
        success: true,
        data: bootcamp
    })
});

//@desc         Create a bootcamp
//@route        POST /api/v1/bootcamps
//@access       Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.create(req.body);

    res.status(201).json({
        sucess: true,
        data: bootcamp
    });
});

//@desc         Update a bootcamp
//@route        PUT /api/v1/bootcamps/:id
//@access       Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if(!bootcamp){
        return next(new ErrorResponse("Bootcamp not found with id of "+req.params.id, 404));
    }

    res.status(200).json({ 
        success: true,
        data: bootcamp
    });
});

//@desc         Delete a bootcamp
//@route        DELETE /api/v1/bootcamps/:id
//@access       Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);
    
    if(!bootcamp){
        return next(new ErrorResponse("Bootcamp not found with id of "+req.params.id, 404));
    }

    bootcamp.remove();

    res.status(200).json({ 
        success: true,
        data: {}
    });
});


//@desc         Get bootcamp within a radius
//@route        GET /api/v1/bootcamps/radius/:zipcode/:distance
//@access       Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
    const { zipcode, distance } = req.params;

    //Get long/lat from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const long = loc[0].longitude;

    //Calc radius using radians
    //Divide distance by radius of the earth
    //Earth Radius = 3,963 miles / 6,378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: {
            $geoWithin: {
                $centerSphere: [ [long, lat], radius ]
            }
        }
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });
});

//@desc         Upload photo for bootcamp
//@route        PUT /api/v1/bootcamps/:id/photo
//@access       Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);
    
    if(!bootcamp){
        return next(new ErrorResponse("Bootcamp not found with id of "+req.params.id, 404));
    }

    if(!req.files){
        return next(new ErrorResponse("Please upload a file", 400));
    }

    const file = req.files.file;

    //Make sure the image is a photo
    if(!file.mimetype.startsWith('image')){
        return next(new ErrorResponse("Please upload an image", 400));
    }

    //Check filesize
    if(!file.size > process.env.MAX_FILE_UPLOAD){
        return next(new ErrorResponse("Please upload an image smaller than "+process.env.MAX_FILE_UPLOAD, 400));
    }

    //Create unique filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    //Upload file to server and insert filename to database
    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
        if(err){
            console.error(err);
            return next(new ErrorResponse('Problem with file upload', 500));
        }

        await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name
        });
    });
});
