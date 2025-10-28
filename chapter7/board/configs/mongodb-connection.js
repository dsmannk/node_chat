import { MongoClient } from "mongodb";

function buildMongoUriFromParts() {
    const host = process.env.MONGO_HOST || 'mongodb';
    const port = process.env.MONGO_PORT || '27017';
    const db   = process.env.MONGO_DB_NAME || 'board';
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


const uri = buildMongoUriFromParts();

export default function(callback) {
    return MongoClient.connect(uri, callback);
}