import {createServer} from './server.js';
const port=+process.env.PORT||3000,file=process.env.DATA_FILE||'data/db.json';
createServer({file}).listen(port,'127.0.0.1',()=>console.log(`WrenchPicker running at http://localhost:${port}`));
