import  express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import performance from "./routes/performance.js";
const port = 5000;
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use("/api", performance);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
