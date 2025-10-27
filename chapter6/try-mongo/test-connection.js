import dotenv from 'dotenv';
dotenv.config({path: '../../.env'});
import { MongoClient } from 'mongodb';

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

// MongoClient 생성
const client = new MongoClient(uri, { useNewUrlParser: true });

async function main() {
    try {
        // 커넥션을 생성하고 연결 시도
        await client.connect();
        console.log('MongoDB 접속 성공');

        // test 데이터베이스의 person 컬렉션 가져오기
        const collection = client.db('test').collection('person');

        // 문서 하나 추가
        await collection.insertOne({name: 'Andy', age: 30});
        console.log('문서 추가 완료');

        // 문서 찾기
        const documents = await collection.find({ name: 'Andy' }).toArray();
        console.log('찾은 문서:', documents);

        // 문서 갱신하기
        await collection.updateOne({ name: 'Andy' }, { $set: { age: 31 } });
        console.log('문서 업데이트');

        // 갱신된 문서 확인하기
        const updateDocuments = await collection.find({ name: 'Andy' }).toArray();
        console.log('갱신된 문서 : ', updateDocuments);

        // 문서 삭제하기
        //await collection.deleteOne({ name: 'Andy' });
        //console.log('문서 삭제');

        // 연결 끊기
        await client.close();
    } catch (err) {
        console.error(err);
        await client.close().catch(() => {});
        process.exit(1);
    }
}

main();

// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//
//     client.close();
// })

// async function run() { // async가 있으므로 비동기 처리 함수
//     await client.connect();
//     const adminDB = client.db("test").admin();  // admin DB 인스턴스
//     const listDatabases = await adminDB.listDatabases(); // 데이터베이스 정보 가져오기
//     console.log(listDatabases);
//     return "OK";
// }
//
// run().then(console.log).catch(console.error).finally(() => client.close());