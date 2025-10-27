import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});
import mongoose from 'mongoose';
import Person from './person-model.js';

let uri = process.env.MONGODB_ATLAS;

if (!uri) {
    console.error('❌ MONGODB_ATLAS is undefined. Check your .env path or variable name.');
    process.exit(1);
}

// 문자열 이어붙이기 대신 URLSearchParams 로 안전 결합
// Node의 WHATWG URL은 mongodb+srv 스킴도 파싱 가능
const u = new URL(uri);

// 이미 있으면 덮어쓰지 않고 유지하고 싶다면 아래 set 대신 has 체크
if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');

uri = u.toString();

mongoose.set("strictQuery", false); // 설정해줘야 경고가 뜨지 않음

const app = express();
app.use(bodyParser.json()); // HTTP에서 body를 파싱하기 위한 설정
app.listen(3000, async () => {
   console.log("Server started");
   const mongodbUri = uri;

   mongoose
       .connect(mongodbUri, { useNewUrlParser: true })
       .then(console.log("Connected to MongoDB"));
});

// 모든 person 데이터 출력
app.get("/person", async (req, res) => {
    const person = await Person.find({});
    res.send(person);
});

// 특정 이메일로 person 찾기
app.get("/person/:email", async (req, res) => {
   const person = await Person.findOne({email: req.params.email});
   res.send(person);
});

// person 데이터 추가하기
app.post("/person", async (req, res) => {
    const person = new Person(req.body);
    await person.save();
    res.send(person);
})

// person 데이터 수정하기
app.put("/person/:email", async (req, res) => {
   const person = await Person.findOneAndUpdate(
       { email: req.params.email },
       { $set: req.body },
       { new: true }
   );
   console.log(person);
   res.send(person);
});

// person 데이터 삭제하기
app.delete("/person/:email", async (req, res) => {
   await Person.deleteMany({ email: req.params.email });
   res.send({ success: true });
});