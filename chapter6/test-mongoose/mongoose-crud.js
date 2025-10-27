import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});
import mongoose from 'mongoose';
import Person from './person-model.js';

let uri = process.env.MONGODB_ATLAS_1;

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

mongoose.set("stricQuery", false); // 설정해줘야 경고가 뜨지 않음

const app = express();
app.use(bodyParser.json()); // HTTP에서 body를 파싱하기 위한 설정
app.listen(3000, async () => {
   console.log("Server started");
   const mongodbUri = uri;

   mongoose.connect(mongodbUri, { useNewUrlParser: true }).then(console.log("Connected to MongoDB"));
});