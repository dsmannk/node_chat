import mongoose from "mongoose";
const { Schema } = mongoose;

const personSchema = new Schema({ // 스키마 객체 생성
    name: String,
    age: Number,
    email: { type: String, required: true },
});

export default mongoose.model('Person', personSchema);