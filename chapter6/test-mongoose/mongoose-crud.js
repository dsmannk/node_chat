import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Person from './person-model.js';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 안전한 dotenv 멀티-경로 로딩 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
];
let dotenvLoaded = false;
for (const p of candidateEnvPaths) {
    const r = dotenv.config({ path: p, override: false });
    if (!r.error && r.parsed && Object.keys(r.parsed).length > 0) {
        console.log(`[dotenv] loaded ${Object.keys(r.parsed).length} keys from: ${p}`);
        dotenvLoaded = true;
        break;
    }
}

if (!dotenvLoaded) {
    console.warn('[dotenv] no .env parsed from candidates; using process.env only.');
}

// --- Mongo URI 안전 조립기 ---
function buildMongoUriFromParts() {
    const host = process.env.MONGO_HOST || 'mongodb';
    const port = process.env.MONGO_PORT || '27017';
    const db   = process.env.MONGO_DB_NAME || 'test';
    const user = process.env.MONGO_USER || process.env.MONGO_INITDB_ROOT_USERNAME;
    const pass = process.env.MONGO_PASS || process.env.MONGO_INITDB_ROOT_PASSWORD;
    if (user && pass) {
        const encUser = encodeURIComponent(user);
        const encPass = encodeURIComponent(pass); // 예: test!234 → test%21234
        return `mongodb://${encUser}:${encPass}@${host}:${port}/${db}?authSource=admin`;
    }
    // --noauth 개발용
    return `mongodb://${host}:${port}/${db}`;
}

const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_ATLAS ||
    buildMongoUriFromParts();

// 2) 디버그 로그(민감정보 마스킹)
const masked = uri.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');
console.log('[DB] Using Mongo URI =', masked);

// 문자열 이어붙이기 대신 URLSearchParams 로 안전 결합
// Node의 WHATWG URL은 mongodb+srv 스킴도 파싱 가능
const u = new URL(uri);

// 이미 있으면 덮어쓰지 않고 유지하고 싶다면 아래 set 대신 has 체크
if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');

//uri = u.toString();
const PORT = process.env.PORT || 3000;

mongoose.set("strictQuery", false); // 설정해줘야 경고가 뜨지 않음

const app = express();
app.use(bodyParser.json()); // HTTP에서 body를 파싱하기 위한 설정
app.listen(PORT, async () => {
   console.log("Server started");
   // const mongodbUri = uri;

   // mongoose
   //     .connect(uri, { useNewUrlParser: true })
   //     .then(console.log("Connected to MongoDB"));
    try {
        await mongoose.connect(uri, {
            dbName: process.env.MONGO_INITDB_DATABASE || 'test',
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ DB connect failed:', err?.message || err);
        process.exit(1);
    }
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