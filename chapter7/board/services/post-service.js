import paginator from '../utils/paginator.js';
import { ObjectId } from 'mongodb';
// import bcrypt from "bcrypt";

// 패스워드는 노출 할 필요가 없으므로 결과값으로 가져오지 않음
const projectionOption = {
    projection: {
        // 프로젝션(투영) 결과값에서 일부만 가져올 때 사용
        password: 0,
        "comments.password": 0,
    },
};

async function getDetailPost(collection, id) {
    const _id = getObjectId(id);
    if (!_id) {
        return null;
    }

    // 2) v3/v4+ 모두 커버하는 옵션 + 디버그 로그
    const options = {
        ...projectionOption,
        returnDocument: 'after',  // v4+
        returnOriginal: false,    // v3
        //upsert: false
        includeResultMetadata: true,  // ← v6에서도 { value, ... }로 받기
    };

    const result = await collection.findOneAndUpdate(
        { _id },
        { $inc: { hits: 1 } },
        options
    );

    console.log('   [findOneAndUpdate] ok =', result?.ok,
        ' lastErrorObject =', result?.lastErrorObject);

    // if (!result || !result.value) {
    //     // 3) 정말 매치가 없었는지 즉시 재확인
    //     const exists = await collection.findOne({ _id });
    //     console.log('   [recheck findOne]', exists ? { _id: exists._id, hits: exists.hits } : null);
    //     return null;
    // }
    // v6 기본: result가 곧 문서, 과거형: result.value가 문서
    const doc = result && result.value !== undefined ? result.value : result;

    // console.log('✅ [DB 조회 성공] →', {
    //     _id: result.value._id,
    //     title: result.value.title,
    //     writer: result.value.writer,
    //     hits: result.value.hits
    // });

    if (!doc) {
        // 확인 로그(선택)
        const exists = await collection.findOne({ _id });
        console.log('   [recheck findOne]', exists ? { _id: exists._id, hits: exists.hits } : null);
        return null;
    }

    return doc;
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

async function getPostByIdAndPassword(collection, { id, password }) {
    const _id = getObjectId(id);
    if (!_id) {
        return null;
    }

    // findOne() 함수 사용
    return await collection.findOne({ _id: _id, password: password }, projectionOption);
}

// id로 데이터 불러오기
async function getPostById(collection, id) {
    const _id = getObjectId(id);
    if (!_id) {
        return null;
    }

    return await collection.findOne({ _id: _id }, projectionOption);
}

// 게시글 수정
async function updatePost(collection, id, post) {
    const toUpdatePost = {
        $set: {
            ...post,
        },
    };

    const _id = getObjectId(id);
    if (!_id) {
        return null;
    }

    return await collection.updateOne({ _id: _id }, toUpdatePost);
}

// 댓글 원자적 추가
async function appendComment(collection, id, { name, password, comment }) {
    const _id = getObjectId(id);
    if (!_id) {
        return null;
    }

    //const hash = await bcrypt.hash(password, 10);

    // 업데이트 파이프라인: 기존 comments 길이를 구해 idx 자동 부여
    // 장점
    // 1. 동시에 두 사용자가 댓글을 작성해도, $push나 $concatArrays는 원자적이기 때문에 데이터 충돌이 적습니다.
    // 2. 기존 문서를 불필요하게 다시 읽어서 덮어쓸 필요가 없습니다.
    // 3. “가져오기 → 수정 → 저장” 대신 “업데이트 한 방”으로 끝냅니다.
    // $push와의 차이
    //  - $push는 업데이트 파이프라인 안에서는 $size, $ifNull 같은 Aggregation 표현식을 바로 쓸 수 없으며
    //    $concatArrays 기반으로 직접 배열을 재구성하는 게 더 유연
    return await collection.updateOne(
        { _id },
        [
            {
                $set: {
                    comments: {
                        $concatArrays: [                        // 두 배열을 이어붙임 (concat)
                            { $ifNull: ["$comments", []] },     // 기존 comments 배열이 null이면 빈 배열([])로 대체
                            [
                                {                               // 새로 추가할 댓글 객체 하나를 배열로 감싸서 append
                                    idx: {
                                        $add: [                 // 기존 comments 배열의 길이에 1을 더해 idx 부여
                                            { $size: { $ifNull: ["$comments", []] } },
                                            1
                                        ]
                                    },
                                    name,                       // 요청에서 받은 name
                                    password,                   // 요청에서 받은 password
                                    comment,                    // 요청에서 받은 comment
                                    createdDt: new Date().toISOString(), // 댓글 생성 시각
                                }
                            ]
                        ]
                    }
                }
            }
        ]
    )
}

function getObjectId(id) {
    const hex = String(id).trim();
    console.log('▶ [getDetailPost] 요청 ID(raw)=', id, ', 정규화=', hex);

    if (!ObjectId.isValid(hex)) {
        console.warn('❌ [getDetailPost] Invalid ObjectId:', hex);
        return null;
    }

    return new ObjectId(hex);
}

export default {
    list,
    writePost,
    getDetailPost,
    getPostByIdAndPassword,
    getPostById,
    updatePost,
    appendComment,
}