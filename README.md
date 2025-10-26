# node_chat


### 파일 상태 확인
```
cd /Users/bh/NodeProjects/study/node_chat
ls -lh package.json        # 사이즈가 0B면 빈 파일
nl -ba package.json        # 내용 확인(비어있을 것)
```


### package.json 이 비어있는 경우
```
mv package.json package.json.bak  # 혹시 몰라 백업
npm init -y
# 테스트 서버 쓸 거면 스크립트/모듈 타입도 추가
npm pkg set type=module
npm pkg set scripts.dev="node server.js"
npm pkg set scripts.start="node server.js"
```


### JSON 유효성 검사
```
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK')"
# ok면 통과
```


### lockfile만 생성
```
npm install --package-lock-only
# 또는
npm i --package-lock-only
```

### 도커 빌드 재시도
```
docker builder prune -f        # (이전 캐시가 꼬였으면)
docker compose build --no-cache
docker compose up
```