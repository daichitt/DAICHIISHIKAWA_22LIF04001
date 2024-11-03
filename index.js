const express = require('express'); 
const app = express();
const PORT = process.env.PORT || 8000; // 8000 is the default port if PORT is not set

app.use(express.json());

app.listen(PORT, () => {
  console.log(`App is listening to port: ${PORT}`);
});