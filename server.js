var bodyParser = require("body-parser");
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
var mongoose = require('mongoose');

//Reference => https://mongoosejs.com/docs/guide.html

//Database connection
const mySecret = process.env['MONGO_URI'];
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

//create a person schema called userDataSchema
const { Schema } = mongoose;

  mongoose.set('useFindAndModify', false);

let userDataSchema = new Schema({
  username:{type: String, required: true},//user name (required)
  count: Number,
  log:[{
    description: String,
    duration: Number,
    date: String
  }],
});

//create a model called "userData" from the userDataSchema
let userData = mongoose.model("userData", userDataSchema);

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Create a new user =>POST /api/users
app.post("/api/users", (request, response) => {
  let responseObject = {};
  let username = request.body.username;//name="username"
  responseObject.username = username;
  let userid="";
  
  //create new user
  var newUser = new userData({username:username});
  //save new user
  newUser.save((err, data)=>{
    if(err) {
      console.log(err);
    } else {
    //do what you want to do after the operation completes.
    responseObject["_id"]=data.id;
    response.json(responseObject);
    }});
});

app.post("/api/users/:_id/exercises",(request,response)=>{
  
  let responseObject = {};
  let newCount = 1;

  let logDuration = parseInt(request.body.duration);
  let logDate = (request.body.date == ""||request.body.date == undefined)?
            new Date().toISOString().substring(0, 10): //return current date if date field is empty
  new Date(request.body.date).toISOString().substring(0, 10);
  let newObject = {description: request.body.description,//name="description"
                   duration:logDuration,//name="duration"
                   date: logDate//name="date"
                  };

userData.findById(request.params._id)
        .exec((err,dataFound)=>{    
            if(err) {
               console.log(err);
            } else {
               newCount = dataFound.log.length + 1;
            };
          userData.findByIdAndUpdate(
          request.params._id,//ID to find
          {$push:{log:newObject}, count: newCount},//object to update => push log array
          {new:true},//it will response with updated version
          (error, dataUpdated)=>{//callback function
            if(error) {
               console.log(error);
            } else {
              
              responseObject["username"]=dataUpdated.username;
              responseObject["description"]=newObject.description;
              responseObject["duration"]=newObject.duration;
              responseObject["date"]=new Date(newObject.date).toDateString();
              responseObject["_id"]=dataUpdated.id;
              
              response.json(responseObject);
            };
          }
  )
  })
});

app.get("/api/users",(req,res) =>{
  userData.find({})
          .select("username")//only get username & id(default)
          .exec((err,dataFound)=>{    
            if(err) {
               console.log(err);
            } else {
               res.json(dataFound);
            };
  })
})


app.get("/api/users/:_id/logs",(req,res) =>{
  userData.findById(req.params._id)
          .select({"username":1,
                   "count":1,
                   "_id":1,
                   "log":{
                     "description":1,
                     "duration":1,
                     "date":1
                   },
                  })
          .exec((err,dataFound)=>{    
            if(err) {
                console.log(err);
            } else {
                let responseObject = dataFound;
                
        
                
              
                  if(req.query.from || req.query.to){
        
                    let fromDate = new Date(0)
                    let toDate = new Date()
        
                    if(req.query.from){
                      fromDate = new Date(req.query.from)
                    }
        
                    if(req.query.to){
                      toDate = new Date(req.query.to)
                    }
        
                    fromDate = fromDate.getTime()
                    toDate = toDate.getTime()
        
                    responseObject.log = responseObject.log.filter((session) => {
                    let sessionDate = new Date(session.date).getTime()
          
                    return sessionDate >= fromDate && sessionDate <= toDate
              })
}
              //put limit after to & from !!!
              if(req.query.limit){
                  responseObject.log = responseObject.log.slice(0,req.query.limit);
                }
              
                responseObject.log.map(item =>{item.date = new Date(item.date).toDateString()});
                responseObject.count = responseObject.log.length;
                res.json(responseObject);
            };
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
