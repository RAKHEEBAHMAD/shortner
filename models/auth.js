const mongoose = require('mongoose')

const model = new mongoose.Schema(
    {
        username: {
            type: String
        },
        email: {
            type: String
        },
        password: {
            type: String
        },
        userid:{
            type: Number
        }
    }
)

module.exports = mongoose.model('user', model)
