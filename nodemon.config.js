export default {
  "watch": ["chapter7/board", "configs", "views", "services", "utils"],
  "ext": "js,handlebars,hbs,json",
  "ignore": ["node_modules", ".git"],
  "exec": "node chapter7/board/app.js",
  "delay": "200",
  "signal": "SIGTERM"
}