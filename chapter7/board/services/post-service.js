import paginator from '../utils/paginator.js';
import { ObjectId } from 'mongodb';

// 패스워드는 노출 할 필요가 없으므로 결과값으로 가져오지 않음
const projectionOption = {
    projection: {
        // 프로젝션(투영) 결과값에서 일부만 가져올 때 사용
        password: 0,
        "comments.password": 0,
    },
};

async function getDetailPost(collection, id) {
    const hex = String(id).trim();
    console.log('▶ [getDetailPost] 요청 ID(raw)=', id, ', 정규화=', hex);

    if (!ObjectId.isValid(hex)) {
        console.warn('❌ [getDetailPost] Invalid ObjectId:', hex);
        return null;
    }

    const _id = new ObjectId(hex);

    // 2) v3/v4+ 모두 커버하는 옵션 + 디버그 로그
    const options = {
        ...projectionOption,
        returnDocument: 'after',  // v4+
        returnOriginal: false,    // v3
        upsert: false
    };

    const result = await collection.findOneAndUpdate(
        { _id },
        { $inc: { hits: 1 } },
        options
    );

    console.log('   [findOneAndUpdate] ok =', result?.ok,
        ' lastErrorObject =', result?.lastErrorObject);

    if (!result || !result.value) {
        // 3) 정말 매치가 없었는지 즉시 재확인
        const exists = await collection.findOne({ _id });
        console.log('   [recheck findOne]', exists ? { _id: exists._id, hits: exists.hits } : null);
        return null;
    }

    console.log('✅ [DB 조회 성공] →', {
        _id: result.value._id,
        title: result.value.title,
        writer: result.value.writer,
        hits: result.value.hits
    });
    return result.value;
}

// 글쓰기
async function writePost(collection, post) { // 글쓰기 함수
    // 생성일시와 조회수를 넣어줍니다.
    post.hits = 0;
    post.createdDt = new Date().toISOString();  // 날짜는 ISO 포맷으로 저장
    return await collection.insertOne(post);    // 몽고디비에 post를 저장 후 결과 반환
}

async function list(collection, page, search) {

    console.log('post-service/list');

    const perPage = 3;
    // title이 search와 부분일치하는지 확인
    const query = { title: new RegExp(search, "i") };
    // limit는 10개만 가져온다는 의미, skip은 설정된 개수만큼 건너뛴다(skip).
    // 생성일 역순으로 정렬
    const cursor = collection
        .find(query)
        .sort({
            createdDt: -1,
        })
        .skip((page - 1) * perPage)
        .limit(perPage);

    // 검색어에 걸리는 게시물의 총합
    // const totalCount = await collection.count(query);
    const totalCount = await collection.countDocuments(query);
    const posts = await cursor.toArray(); // 커서로 받아온 데이터를 리스트로 변경
    // 페이지네이터 생성
    const paginatorObj = paginator({ totalCount, page, perPage: perPage });
    return [posts, paginatorObj];
}

export default {
    list,
    writePost,
    getDetailPost,
}