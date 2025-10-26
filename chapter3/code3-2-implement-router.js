import http from "http";
import url from "url"; // url 모듈을 로딩
http
    .createServer((req, res) => {
        const path = url.parse(req.url, true).pathname; // 패스명 할당
        res.setHeader("Content-Type", "text/html; charset=utf-8");

        if(path === "/user") {
            res.end("[user] name: andy, age: 30"); // /user 결과값 설정
        } else if (path === "/feed") {
            res.end(`
            <ul>
                <li>picture1</li>
                <li>picture2</li>
                <li>picture3</li>
            </ul>
            `); // feed에 대한 결과값
        } else {
            res.statusCode = 404;
            res.end("404 page not found"); // 결과값으로 에러 메시지 설정
        }
    })
    .listen("3000", () => console.log("라우터를 만들어보자!!!"));