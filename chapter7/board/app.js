import express from 'express';
import { engine } from 'express-handlebars'
import path from 'path';
import { fileURLToPath } from 'url';
import mongodbConnection from './configs/mongodb-connection.js';
import helpers from './configs/handlebars-helpers.js';
import postService from './services/post-service.js';
import {ObjectId} from "mongodb"; // 서비스 파일 로딩

const app = express();

// req.body와 POST 요청을 해석하기 위한 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// __dirname 대체(ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.engine("handlebars", engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    //partialsDir: path.join(__dirname, 'views', 'partials'),
    helpers,

}));  // 템플릿 엔진으로 핸들바 등록
app.set("view engine", "handlebars");               // 웹페이지 로드 시 사용할 템플릿 엔진 설정
app.set("views", path.join(__dirname + "/views"));  // 뷰 디렉터리를 views로 설정

app.get("/", async (req, res) => {
    //res.render("home", { title: "안녕하세요", message: "만나서 반값습니다!" });
    const page = parseInt(req.query.page) || 1; // 현재 페이지 데이터
    const search = req.query.search || ""; // 검색어 데이터
    try {
        // postService.list에서 글 목록과 페이지네이터를 가져옴
        const [posts, paginator] = await postService.list(collection, page, search);

        // 리스트 페이지 랜더링
        res.render("home", { title: "테스트 게시판", search, paginator, posts});
    } catch(error) {
        console.log(error);
        res.render("home", { title: "테스트 게시판 "});
    }
});


// 쓰기 페이지 이동
app.get("/write", (req, res) => {
   res.render("write", { title: "테스트 게시판", mode: "create" });
});

// 수정 페이지로 이동 mode는 modify
app.get("/modify/:id", async (req, res) => {
    // getPostById() 함수로 게시글 데이터를 받아옴
    const post = await postService.getPostById(collection, req.params.id);
    console.log('post = ', post);
    res.render("write", { title: "테스트 게시판", mode: "modify", post });
});

// 게시글 수정
app.post("/modify", async (req, res) => {

    console.log('update!!!');

    const { id, title, writer, password, content } = req.body;

    const post = {
        title,
        writer,
        password,
        content,
        createdDt: new Date().toISOString(),
    };
    // 업데이트 결과
    const result = await postService.updatePost(collection, id, post);
    res.redirect(`/detail/${id}`);
});

// 글쓰기
app.post("/write", async (req, res) => {
   const post = req.body;
   // 글쓰기 후 결과 반환
   const result = await postService.writePost(collection, post);
   // 생성된 도큐먼트의 _id를 사용해 상세페이지로 이동
    res.redirect(`/detail/${result.insertedId}`);
});

app.delete("/delete", async (req, res) => {
    const { id, password } = req.body;
    console.log('id =', id, ', password =', password);

    // 0) 입력 검증
    if (!id || !password) {
        return res.status(400).json({ isSuccess: false, reason: 'MISSING_PARAMS' });
    }
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ isSuccess: false, reason: 'INVALID_ID' });
    }

    try {
        const _id = new ObjectId(id);
        // collection의 deleteOne을 사용해 게시글 하나를 삭제
        const result = await collection.deleteOne({ _id, password });

        console.log('deleteOne result =', result);

        // 삭제 결과가 잘못된 경우의 처리
        if (result.deletedCount !== 1) {
            console.log("삭제 실패");
            return res.json({ isSuccess: false, reason: 'NOT_DELETED' });
        }
        return res.json({ isSuccess: true });
    } catch (error) {
        // 에러가 난 경우의 처리
        console.error('[DELETE ERROR]', err);
        return res.json({ isSuccess: false, reason: 'SERVER_ERROR' });
    }
});

app.get("/detail/:id", async (req, res, next) => {
   // 게시글 정보 가져오기
    const id = req.params.id;
    console.log('\n🚀 [ROUTE] GET /post/' + id);

    try {
        // 1) 빠른 진단: 컬렉션에 진짜 있나?
        const tryObjectId = ObjectId.isValid(id) ? new ObjectId(id) : id;
        const raw = await collection.findOne({ _id: tryObjectId });
        console.log("[debug] direct findOne =", raw ? { _id: raw._id, title: raw.title } : null);

        // 2) 기존 서비스 사용
        const post = await postService.getDetailPost(collection, id);


        if (!post) {
            console.warn('❌ [ROUTE] 게시글 없음 (id=' + id + ')');
            return res.status(404).render('404', { title: '게시글을 찾을 수 없습니다.' });
        }
        console.log('✅ [ROUTE] 게시글 불러옴 →', {
            _id: post._id,
            title: post.title,
            writer: post.writer,
            hits: post.hits,
        });

        res.render('detail', {
            title: '게시글 상세보기',
            post,
        });
    } catch (err) {
        console.error('🔥 [ROUTE ERROR]', err);
        next(err);
    }

});

// 패스워드 체크
// id, password값을 가져옴
app.post("/check-password", async (req, res) => {
    const { id, password } = req.body;

    // postService의 getPostByIdAndPassword() 함수를 사용해 게시글 데이터 확인
    const post = await postService.getPostByIdAndPassword(collection, { id, password });

    // 데이터가 있으면 isExist true, 없으면 isExist false
    if (!post) {
        return res.status(404).json({ isExist: false });
    } else {
        return res.json({ isExist: true });
    }
});

let collection;
app.listen(3000, async () => {
    console.log("Server started");
    // mongodbConnection()의 결과는 mongoClient
    const mongoClient = await mongodbConnection();
    // mongoClient.db()로 디비 선택 collection()으로 컬렉션 선택 후 collection에 할당
    collection = mongoClient.db().collection("post");
    console.log("MongoDB connected");

    // 진단 로그
    const dbName = mongoClient.db().databaseName;
    console.log("[Mongo] databaseName =", dbName);
    console.log("[Mongo] namespace =", collection.namespace); // ex) mydb.posts
    const approxCount = await collection.estimatedDocumentCount();
    console.log("[Mongo] estimatedDocumentCount =", approxCount);
    console.log("MongoDB connected");
});
