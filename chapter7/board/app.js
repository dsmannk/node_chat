import express from 'express';
import { engine } from 'express-handlebars'
import path from 'path';
import { fileURLToPath } from 'url';
import mongodbConnection from './configs/mongodb-connection.js';
import helpers from './configs/handlebars-helpers.js';
import postService from './services/post-service.js'; // 서비스 파일 로딩

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
   res.render("write", { title: "테스트 게시판" });
});

// 글쓰기
app.post("/write", async (req, res) => {
   const post = req.body;
   // 글쓰기 후 결과 반환
   const result = await postService.writePost(collection, post);
   // 생성된 도큐먼트의 _id를 사용해 상세페이지로 이동
    res.redirect(`/detail/${result.insertedId}`);
});

app.get("/detail/:id", async (req, res) => {
   // 게시글 정보 가져오기
    const result = await postService.getDetailPost(collection, req.params.id);
    res.render("detail", {
       title: "테스트 게시판",
       post: result.value,
   })
});

let collection;
app.listen(3000, async () => {
    console.log("Server started");
    // mongodbConnection()의 결과는 mongoClient
    const mongoClient = await mongodbConnection();
    // mongoClient.db()로 디비 선택 collection()으로 컬렉션 선택 후 collection에 할당
    collection = mongoClient.db().collection("post");
    console.log("MongoDB connected");
});
