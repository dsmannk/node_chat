// import express from 'express';
// import mongoose from 'mongoose';
//
// const app = express(); // express를 초기화 후 app에 할당
// const port = 3000;
//
// app.get("/", (req, res) => { // "/"으로 요청이 오는 경우 실행됨
//     res.set({ "Content-Type": "text/html; charset=utf-8" }); // 헤더값 설정
//     res.end("헬로 Express");
// })
//
// app.listen(port, () => { // 서버를 기동해 클라이언트 요청을 기다림
//     console.log(`START SERVER : use ${port}`);
// })
//
// const uri = process.env.MONGODB_URI;
// await mongoose.connect(uri);

import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// .env를 사용할 경우(옵션): 현재 파일 기준 두 단계 위 루트 .env
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // 없으면 무시됨

const app = express();

// 1) URI 조립 (컨테이너 환경변수 우선, 없으면 안전한 기본값)
let uri = process.env.MONGODB_URI
    || process.env.MONGODB_ATLAS
    || 'mongodb://root:example@mongodb:27017/appdb?authSource=admin';

// 2) 디버그 로그로 실제 값을 확인 (민감정보면 마스킹)
console.log('[DB] MONGODB_URI =', uri);

// 3) URL 쿼리 파라미터 보강(중복 없이)
const u = new URL(uri);
if (!u.searchParams.has('retryWrites')) u.searchParams.set('retryWrites', 'true');
if (!u.searchParams.has('w')) u.searchParams.set('w', 'majority');
uri = u.toString();

const PORT = process.env.PORT || 3000;

// DB 연결 후 서버 리슨
(async () => {
    try {
        await mongoose.connect(uri, {
            dbName: process.env.MONGO_DB_NAME || 'appdb',
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ MongoDB connected');

        app.get('/', (_req, res) => res.send('Hello from Express!'));
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[Express] listening on ${PORT}`);
        });
    } catch (err) {
        console.error('❌ DB connect failed:', err?.message || err);
        process.exit(1);
    }
})();

