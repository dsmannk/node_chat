// docker-entrypoint-initdb.d 에 있는 파일은 컨테이너 최초 기동시에 자동 실행.
const db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || "appdb");

// 샘플 컬렉션/데이터
db.samples ?? db.createCollection("samples");
db.samples.insertOne({ hello:"mongodb", at: new Date() });

// 앱 전용 권한 유저
if (!db.getUser("app_user")) {
    db.createUser({
        user: "app_user",
        pwd: "app_pass",
        roles: [{ role: "readWrite", db: db.getName() }],
    })
}