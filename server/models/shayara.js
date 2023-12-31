const { mongoose } = require("../db/mongoose");

const ShayaraSchema = new mongoose.Schema({
    shayaraName: {
        type: String,
        requires: true,
        trim: true,
    },
    shayaraOwner: {
        type: mongoose.Schema.Types.ObjectId,
        requires: true,
        ref: 'User'
    },
    shayaraLocationName: {
        type: String
    },
    startLocation: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
       }   ,
    
    startTime: {
        type: Date
    },
    endTime: {
        type: Date,
         default: function(){
            const endDate = new Date
             return endDate.setTime(this.eventStart.getTime() + 10*60*60*1000)
         }
    }

}, {
    timestamps: true
})



ShayaraSchema.index({startLocation: '2dsphere'})

const Shayara = mongoose.model('Shayara', ShayaraSchema)

module.exports = { Shayara }
